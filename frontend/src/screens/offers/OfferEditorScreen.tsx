import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../api/client';
import { useRouter } from '../../navigation/Router';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n/I18nContext';
import { BleicheSelect } from '../../components/ui/NativeSelect';
import type { Offer, OfferInput, OfferStatus } from '../../types/offer';
import { STATUS_BG, STATUS_FG } from '../../types/offer';
import { offerStatusLabel } from '../../utils/offerStatus';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { downloadTextFile } from '../../utils/downloads';
import { generateOfferDocx } from '../../utils/docxExport';

import OfferDocument, { OfferDraft, OfferDraftChange } from './OfferDocument';
import { injectOfferPrintStyles } from './offerPrintStyles';

// ── Defaults ────────────────────────────────────────────────────────────────

const ROOM_CATEGORIES_ID_FALLBACK = 'kleines-dz';

function emptyDraft(): OfferDraft {
  return {
    salutation: 'Herr',
    firstName: '',
    lastName: '',
    street: '',
    zipCode: '',
    city: '',
    email: '',
    offerDate: new Date().toISOString().split('T')[0],
    arrivalDate: '',
    departureDate: '',
    roomCategory: ROOM_CATEGORIES_ID_FALLBACK,
    customRoomCategory: '',
    adults: 2,
    childrenAges: [],
    pricePerNight: '',
    totalPrice: '',
    employeeName: '',
  };
}

function offerToDraft(o: Offer): OfferDraft {
  return {
    salutation: o.salutation,
    firstName: o.first_name,
    lastName: o.last_name,
    street: o.street,
    zipCode: o.zip_code,
    city: o.city,
    email: o.email,
    offerDate: o.offer_date ?? new Date().toISOString().split('T')[0],
    arrivalDate: o.arrival_date ?? '',
    departureDate: o.departure_date ?? '',
    roomCategory: o.room_category || ROOM_CATEGORIES_ID_FALLBACK,
    customRoomCategory: o.custom_room_category || '',
    adults: o.adults,
    childrenAges: o.children_ages ?? [],
    pricePerNight: o.price_per_night || '',
    totalPrice: o.total_price || '',
    employeeName: o.employee_name || '',
  };
}

function draftToPayload(d: OfferDraft, status: OfferStatus, notes: string): OfferInput {
  return {
    salutation: d.salutation,
    first_name: d.firstName,
    last_name: d.lastName,
    street: d.street,
    zip_code: d.zipCode,
    city: d.city,
    email: d.email,
    offer_date: d.offerDate || null,
    arrival_date: d.arrivalDate || null,
    departure_date: d.departureDate || null,
    room_category: d.roomCategory,
    custom_room_category: d.customRoomCategory,
    adults: d.adults,
    children_ages: d.childrenAges,
    price_per_night: d.pricePerNight,
    total_price: d.totalPrice,
    employee_name: d.employeeName,
    notes,
    status,
  };
}

const STATUS_VALUES: OfferStatus[] = ['draft', 'sent', 'accepted', 'declined'];

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  offerId?: number;
  mode?: 'view' | 'edit';
}

// Inject print stylesheet once per page load (web only).
let printStylesInjected = false;

export default function OfferEditorScreen({ offerId, mode: modeProp }: Props) {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const { t, locale } = useI18n();

  // Any offer without an id must be in edit mode; otherwise default to view.
  const mode: 'view' | 'edit' = offerId == null ? 'edit' : modeProp ?? 'view';
  const isEditing = Boolean(offerId);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<OfferDraft>(emptyDraft);
  const [status, setStatus] = useState<OfferStatus>('draft');
  const [notes, setNotes] = useState('');

  // Inject print CSS once (web only; no-op elsewhere).
  useEffect(() => {
    if (printStylesInjected) return;
    printStylesInjected = true;
    injectOfferPrintStyles();
  }, []);

  // Load or reset when offerId changes.
  useEffect(() => {
    if (offerId == null) {
      setDraft(emptyDraft());
      setStatus('draft');
      setNotes('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getOffer(offerId)
      .then((o) => {
        if (cancelled) return;
        setDraft(offerToDraft(o));
        setStatus(o.status);
        setNotes(o.notes || '');
      })
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offerId, addToast, t]);

  const handleChange = (patch: OfferDraftChange) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = draftToPayload(draft, status, notes);
      if (offerId != null) {
        const updated = await api.updateOffer(offerId, payload);
        addToast({ type: 'success', title: t('offer.updated'), message: `#${updated.id}` });
        navigate({ name: 'offer-editor', offerId: updated.id, mode: 'view' });
      } else {
        const created = await api.createOffer(payload);
        addToast({ type: 'success', title: t('offer.saved'), message: `#${created.id}` });
        navigate({ name: 'offer-editor', offerId: created.id, mode: 'view' });
      }
    } catch (e: any) {
      addToast({ type: 'error', title: t('common.error'), message: e?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    const proceed = () => {
      if (offerId == null) {
        navigate({ name: 'offers-list' });
      } else {
        navigate({ name: 'offer-editor', offerId, mode: 'view' });
      }
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t('offer.discardConfirmBody'))) proceed();
      return;
    }
    Alert.alert(t('offer.discardConfirmTitle'), t('offer.discardConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('offer.discard'), style: 'destructive', onPress: proceed },
    ]);
  };

  const handleEnterEdit = () => {
    if (offerId == null) return;
    navigate({ name: 'offer-editor', offerId, mode: 'edit' });
  };

  const handleExit = () => {
    if (mode === 'edit' && offerId != null) {
      navigate({ name: 'offer-editor', offerId, mode: 'view' });
    } else {
      navigate({ name: 'offers-list' });
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportHtml = async () => {
    if (offerId == null) {
      addToast({ type: 'warning', title: t('common.error'), message: 'Save the offer first.' });
      return;
    }
    try {
      const html = await api.exportOfferHtml(offerId, locale);
      downloadTextFile(`offer-${offerId}.html`, html, 'text/html;charset=utf-8');
      addToast({ type: 'success', title: t('common.download'), message: `#${offerId}` });
    } catch (e: any) {
      addToast({ type: 'error', title: t('common.error'), message: e?.message || 'Export failed' });
    }
  };

  const handleExportWord = async () => {
    if (Platform.OS !== 'web') {
      addToast({ type: 'error', title: t('common.error'), message: 'Word export is only available on web' });
      return;
    }
    if (offerId == null) {
      addToast({ type: 'warning', title: t('common.error'), message: 'Save the offer first.' });
      return;
    }
    try {
      const fresh = await api.getOffer(offerId);
      await generateOfferDocx(fresh);
      addToast({ type: 'success', title: t('common.download'), message: `#${offerId}.docx` });
    } catch (e: any) {
      addToast({ type: 'error', title: t('common.error'), message: e?.message || 'Word export failed' });
    }
  };

  const pageTitle = useMemo(() => {
    if (mode === 'edit' && offerId != null) return t('offer.edit');
    if (mode === 'edit') return t('offer.new');
    return t('offers.viewTitle');
  }, [mode, offerId, t]);

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Toolbar (hidden in print) */}
      <WebPrintHidden>
        <View style={s.toolbar}>
          <View style={s.toolbarLeft}>
            <Text style={s.pageTitle}>{pageTitle}</Text>
            <StatusBadge status={status} mode={mode} onChange={setStatus} t={t} />
          </View>
          <View style={s.toolbarRight}>
            {mode === 'view' ? (
              <TouchableOpacity style={s.btnPrimary} onPress={handleEnterEdit}>
                <Text style={s.btnPrimaryText}>{t('offer.editAction')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[s.btnPrimary, saving && s.btnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={s.btnPrimaryText}>
                    {saving ? `${t('common.save')}...` : t('common.save')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnGhost} onPress={handleDiscard}>
                  <Text style={s.btnGhostText}>{t('offer.discard')}</Text>
                </TouchableOpacity>
              </>
            )}
            {offerId != null && (
              <>
                <TouchableOpacity style={s.btnSecondary} onPress={handleExportHtml}>
                  <Text style={s.btnSecondaryText}>{t('offer.export')}</Text>
                </TouchableOpacity>
                {Platform.OS === 'web' && (
                  <TouchableOpacity style={s.btnSecondary} onPress={handleExportWord}>
                    <Text style={s.btnSecondaryText}>{t('offer.exportWord')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.btnSecondary} onPress={handlePrint}>
                  <Text style={s.btnSecondaryText}>{t('offer.printPdf')}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={s.btnGhost} onPress={handleExit}>
              <Text style={s.btnGhostText}>← {t('common.back')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </WebPrintHidden>

      {/* Scrollable document area */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator
      >
        <OfferDocument mode={mode} draft={draft} onChange={handleChange} />

        {/* Internal notes — below the paper, never in the printed output */}
        <WebPrintHidden>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Interne Notizen</Text>
            {mode === 'edit' ? (
              <TextInput
                style={s.metaInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Nicht Teil des gedruckten Angebots."
                placeholderTextColor={colors.dark300}
                multiline
              />
            ) : (
              <Text style={s.metaValue}>{notes || '—'}</Text>
            )}
          </View>
        </WebPrintHidden>
      </ScrollView>
    </View>
  );
}

// ── Small helpers ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
  mode,
  onChange,
  t,
}: {
  status: OfferStatus;
  mode: 'view' | 'edit';
  onChange: (s: OfferStatus) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}) {
  if (mode === 'view') {
    return (
      <View style={[s.statusBadge, { backgroundColor: STATUS_BG[status] }]}>
        <Text style={[s.statusText, { color: STATUS_FG[status] }]}>
          {offerStatusLabel(status, t)}
        </Text>
      </View>
    );
  }
  const options = STATUS_VALUES.map((v) => ({ value: v, label: offerStatusLabel(v, t) }));
  return (
    <View style={s.statusSelectWrap}>
      <BleicheSelect
        value={status}
        onChange={(v) => onChange(v as OfferStatus)}
        options={options}
        style={{ width: 140 }}
      />
    </View>
  );
}

/**
 * Wrapper that adds `data-offer-chrome="true"` on web so the print stylesheet
 * can hide everything except the actual document paper. No-op on native.
 */
function WebPrintHidden({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <View {...({ dataSet: { offerChrome: 'true' } } as any)}>{children}</View>;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.brand700,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statusSelectWrap: {
    // no extra styling; BleicheSelect owns it
  },
  btnPrimary: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  btnPrimaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#fff',
  },
  btnDisabled: { opacity: 0.6 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.dark300,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  btnSecondaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
  },
  btnGhost: { paddingHorizontal: 8, paddingVertical: 9 },
  btnGhostText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark400,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingVertical: 4,
    paddingBottom: 40,
  },
  metaBlock: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 820,
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    gap: 8,
  },
  metaLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.dark400,
  },
  metaValue: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
  },
  metaInput: {
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 10,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
