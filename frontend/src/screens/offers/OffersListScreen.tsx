import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../../api/client';
import { useRouter } from '../../navigation/Router';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n/I18nContext';
import { BleicheSelect } from '../../components/ui/NativeSelect';
import type { Offer, OfferStatus } from '../../types/offer';
import { STATUS_LABELS, STATUS_BG, STATUS_FG } from '../../types/offer';
import { formatDateGerman, formatEuro, getOfferNumber } from '../../utils/helpers';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const STATUS_OPTIONS = (['draft', 'sent', 'accepted', 'declined'] as OfferStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

export default function OffersListScreen() {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .listOffers()
      .then(setOffers)
      .catch((e: Error) => addToast({ type: 'error', title: 'Fehler', message: e.message }))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = offers.filter((o) => {
    const name = `${o.first_name} ${o.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  function handleDelete(o: Offer) {
    const name = `${o.first_name} ${o.last_name}`;
    Alert.alert(
      t('offers.deleteConfirmTitle'),
      t('offers.deleteConfirmBody', { name }),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            api
              .deleteOffer(o.id)
              .then(() => {
                addToast({ type: 'success', title: t('offers.deleted'), message: name });
                setOffers((prev) => prev.filter((x) => x.id !== o.id));
              })
              .catch((e: Error) => addToast({ type: 'error', title: 'Fehler', message: e.message }));
          },
        },
      ],
    );
  }

  function handleDuplicate(o: Offer) {
    api
      .duplicateOffer(o.id)
      .then((copy) => {
        setOffers((prev) => [copy, ...prev]);
        addToast({ type: 'success', title: 'Dupliziert', message: `Kopie für ${o.first_name} ${o.last_name}` });
      })
      .catch((e: Error) => addToast({ type: 'error', title: 'Fehler', message: e.message }));
  }

  function handleStatusChange(id: number, status: OfferStatus) {
    api
      .updateOffer(id, { status })
      .then((updated) => {
        setOffers((prev) => prev.map((x) => (x.id === id ? updated : x)));
        addToast({ type: 'info', title: 'Status geändert', message: STATUS_LABELS[status] });
      })
      .catch((e: Error) => addToast({ type: 'error', title: 'Fehler', message: e.message }));
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.topBar}>
        <View>
          <Text style={s.pageTitle}>{t('offers.title')}</Text>
          <Text style={s.subtitle}>{offers.length} Angebot{offers.length !== 1 ? 'e' : ''}</Text>
        </View>
        <TouchableOpacity
          style={s.btnPrimary}
          onPress={() => navigate({ name: 'offer-editor' })}
        >
          <Text style={s.btnPrimaryText}>+ {t('offers.new')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder={t('offers.search')}
          placeholderTextColor={colors.dark300}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.brand600} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>
            {search ? t('offers.noneFound') : t('offers.none')}
          </Text>
          {!search && (
            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => navigate({ name: 'offer-editor' })}
            >
              <Text style={s.btnSecondaryText}>{t('offers.createFirst')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={s.table}>
            {/* Table header */}
            <View style={[s.tr, s.theadRow]}>
              {['Nr.', 'Kunde', 'Zimmer', 'Anreise', 'Gesamtpreis', 'Status', 'Aktionen'].map(
                (h) => (
                  <View key={h} style={[s.th, h === 'Aktionen' && s.thActions]}>
                    <Text style={s.thText}>{h}</Text>
                  </View>
                ),
              )}
            </View>
            {/* Rows */}
            {filtered.map((offer) => {
              const name = `${offer.first_name} ${offer.last_name}`;
              return (
                <View key={offer.id} style={s.tr}>
                  <View style={s.td}>
                    <Text style={s.monoText}>{getOfferNumber(offer.id, offer.created_at)}</Text>
                  </View>
                  <View style={s.tdName}>
                    <Text style={s.nameText}>{name}</Text>
                  </View>
                  <View style={s.td}>
                    <Text style={s.cellText}>{offer.room_category || '—'}</Text>
                  </View>
                  <View style={s.td}>
                    <Text style={s.cellText}>{formatDateGerman(offer.arrival_date)}</Text>
                  </View>
                  <View style={s.td}>
                    <Text style={s.cellText}>{formatEuro(offer.total_price)}</Text>
                  </View>
                  <View style={s.tdStatus}>
                    <View
                      style={[
                        s.badge,
                        { backgroundColor: STATUS_BG[offer.status] },
                      ]}
                    >
                      <Text style={[s.badgeText, { color: STATUS_FG[offer.status] }]}>
                        {STATUS_LABELS[offer.status]}
                      </Text>
                    </View>
                  </View>
                  <View style={[s.td, s.tdActions]}>
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => navigate({ name: 'offer-editor', offerId: offer.id })}
                    >
                      <Text style={s.actionBtnText}>{t('common.open')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => handleDuplicate(offer)}
                    >
                      <Text style={s.actionBtnText}>{t('offers.duplicate')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, s.actionBtnDanger]}
                      onPress={() => handleDelete(offer)}
                    >
                      <Text style={[s.actionBtnText, s.actionBtnDangerText]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                    <BleicheSelect
                      value={offer.status}
                      onChange={(v) => handleStatusChange(offer.id, v as OfferStatus)}
                      options={STATUS_OPTIONS}
                      style={{ width: 100 }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const COL_W = { nr: 130, name: 160, room: 170, date: 120, price: 110, status: 110, actions: 320 };

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.brand700,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark400,
    marginTop: 2,
  },
  btnPrimary: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.brand600,
  },
  btnPrimaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#fff',
  },
  searchWrap: {
    marginBottom: 20,
    maxWidth: 400,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  loader: { marginTop: 40 },
  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 48,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark400,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.dark300,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnSecondaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
    letterSpacing: 0.6,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.dark200,
    backgroundColor: colors.white,
  },
  theadRow: {
    backgroundColor: colors.tableHeaderBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
  },
  th: {
    width: COL_W.nr,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  thActions: { width: COL_W.actions },
  thText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.dark500,
  },
  td: {
    width: COL_W.nr,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tdName: {
    width: COL_W.name,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tdStatus: {
    width: COL_W.status,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tdActions: {
    width: COL_W.actions,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monoText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dark500,
  },
  nameText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cellText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionBtnText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark500,
  },
  actionBtnDanger: {
    borderColor: '#fca5a5',
  },
  actionBtnDangerText: {
    color: '#b91c1c',
  },
});
