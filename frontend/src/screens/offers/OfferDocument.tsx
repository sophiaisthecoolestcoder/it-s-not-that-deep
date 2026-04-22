import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BleicheSelect } from '../../components/ui/NativeSelect';
import { ROOM_CATEGORIES, ROOM_GROUPS, getAmenitiesForRoom } from '../../utils/rooms';
import { colors } from '../../theme/colors';
import { formatDateGerman, formatEuro, getGreeting } from '../../utils/helpers';
import type { Salutation } from '../../types/offer';

// ─── Shape of the editable state OfferEditorScreen passes down ──────────────

export type OfferDraft = {
  salutation: Salutation;
  firstName: string;
  lastName: string;
  street: string;
  zipCode: string;
  city: string;
  email: string;
  offerDate: string;
  arrivalDate: string;
  departureDate: string;
  roomCategory: string;
  customRoomCategory: string;
  adults: number;
  childrenAges: number[];
  pricePerNight: string;
  totalPrice: string;
  employeeName: string;
};

export type OfferDraftChange = Partial<OfferDraft>;

type Props = {
  mode: 'view' | 'edit';
  draft: OfferDraft;
  onChange: (patch: OfferDraftChange) => void;
};

// ─── Fonts / constants ──────────────────────────────────────────────────────

const DOC_FONT = Platform.select({
  web: '"Alegreya Sans", "Noto Sans", Arial, sans-serif',
  default: 'System',
});

const GENUSSPAUSCHALE = [
  'Frühstück ab 7:30 Uhr, wann immer sie ausgeschlafen haben',
  'Kulinarische Kleinigkeiten in unserem Bios für zwischendurch',
  'Unser exklusives Bleiche-Abendmenü',
];

const CLOSING_PARAGRAPHS = [
  'Unsere Zimmer und Suiten sowie unsere Landtherme stehen am Anreisetag ab 16.00 Uhr und am Abreisetag bis 12.00 Uhr zur Verfügung.',
  'Unsere SPA-Quellen stehen Ihnen gern für Ihre Reservierungswünsche für Anwendungen in der Landtherme zur Verfügung (Tel. +49 (0)35603-62519 sowie landtherme@bleiche.de).',
  'Unsere Stornierungsbedingungen finden Sie auf unserer Homepage www.bleiche.de unter der Rubrik "Impressum/AGB".',
  'Wir freuen uns, wenn Ihnen unser Angebot zusagt und wir Sie als Gäste in unserem Haus begrüßen dürfen.',
];

const SALUTATION_OPTIONS = [
  { value: 'Herr', label: 'Herr' },
  { value: 'Frau', label: 'Frau' },
  { value: 'Familie', label: 'Familie' },
];

const ROOM_SELECT_GROUPS = ROOM_GROUPS.map((g) => ({
  label: g,
  options: ROOM_CATEGORIES.filter((r) => r.group === g).map((r) => ({
    value: r.id,
    label: r.name,
  })),
}));

// ─── Derived helpers ────────────────────────────────────────────────────────

function roomNameFromDraft(d: OfferDraft): string {
  if (d.roomCategory === 'custom') return d.customRoomCategory || '';
  const cat = ROOM_CATEGORIES.find((r) => r.id === d.roomCategory);
  return cat?.name || '';
}

function childNightlyPrice(age: number, adultPrice: number): number {
  if (age <= 3) return 0;
  if (age <= 11) return 80;
  if (age <= 15) return 100;
  return adultPrice;
}

function nightsBetween(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0;
  const a = new Date(`${arrival}T00:00:00`);
  const d = new Date(`${departure}T00:00:00`);
  if (isNaN(a.getTime()) || isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((d.getTime() - a.getTime()) / 86400000));
}

export function guestLineFromDraft(d: OfferDraft): string {
  const adultWord = d.adults === 1 && d.salutation === 'Herr' ? 'Erwachsenen' : 'Erwachsene';
  let line = `für ${d.adults} ${adultWord}`;
  if (d.childrenAges.length > 0) {
    const parts = d.childrenAges.map(
      (age) => `1 Kind im Alter von ${age} ${age === 1 ? 'Jahr' : 'Jahren'}`,
    );
    line += ` und ${parts.join(' und ')}`;
  }
  return line;
}

export function calculateTotal(d: OfferDraft): string {
  const n = nightsBetween(d.arrivalDate, d.departureDate);
  const adultPrice = parseFloat(d.pricePerNight) || 0;
  if (!d.pricePerNight || n <= 0 || d.adults <= 0) return '';
  const kids = d.childrenAges.reduce((sum, age) => sum + childNightlyPrice(age, adultPrice), 0);
  const total = (adultPrice * d.adults + kids) * n;
  return total.toFixed(2);
}

// ─── Inline widgets ─────────────────────────────────────────────────────────

function InlineText({
  value,
  mode,
  onChange,
  placeholder,
  style,
  width,
  bold,
  align,
  multiline,
  keyboardType,
}: {
  value: string;
  mode: 'view' | 'edit';
  onChange: (v: string) => void;
  placeholder?: string;
  style?: any;
  width?: number | string;
  bold?: boolean;
  align?: 'left' | 'right' | 'center';
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'decimal-pad';
}) {
  const base = [styles.docText, bold && styles.docBold, align && { textAlign: align }, style];
  if (mode === 'view') {
    return (
      <Text style={base}>
        {value || (placeholder ? '' : '—')}
      </Text>
    );
  }
  return (
    <TextInput
      style={[...base, styles.inlineInput, width != null && ({ width } as any)]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.dark300}
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  );
}

function InlineNumber({
  value,
  mode,
  onChange,
  min = 0,
  max,
  width = 56,
}: {
  value: number;
  mode: 'view' | 'edit';
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  width?: number;
}) {
  if (mode === 'view') {
    return <Text style={styles.docText}>{String(value)}</Text>;
  }
  return (
    <TextInput
      style={[styles.docText, styles.inlineInput, { width } as any]}
      value={String(value)}
      onChangeText={(v) => {
        const raw = parseInt(v.replace(/[^0-9]/g, ''), 10);
        const safe = Number.isNaN(raw) ? min : Math.max(min, max != null ? Math.min(max, raw) : raw);
        onChange(safe);
      }}
      keyboardType="number-pad"
    />
  );
}

function InlineSelect({
  mode,
  value,
  onChange,
  options,
  groups,
  renderView,
  widthView,
  widthEdit,
}: {
  mode: 'view' | 'edit';
  value: string;
  onChange: (v: string) => void;
  options?: { value: string; label: string }[];
  groups?: { label: string; options: { value: string; label: string }[] }[];
  renderView: string;
  widthView?: number | string;
  widthEdit?: number | string;
}) {
  if (mode === 'view') {
    return <Text style={[styles.docText, widthView != null && ({ width: widthView } as any)]}>{renderView || '—'}</Text>;
  }
  return (
    <View style={[styles.inlineSelectWrap, widthEdit != null && ({ width: widthEdit } as any)]}>
      <BleicheSelect
        value={value}
        onChange={onChange}
        options={options ?? []}
        groups={groups}
        style={{ width: '100%' }}
      />
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OfferDocument({ mode, draft, onChange }: Props) {
  const roomName = roomNameFromDraft(draft);
  const amenities = getAmenitiesForRoom(roomName);
  const calcTotal = calculateTotal(draft);
  const effectiveTotal = draft.totalPrice || calcTotal;
  const isCustomRoom = draft.roomCategory === 'custom';

  const Paper: React.ComponentType<any> =
    Platform.OS === 'web' ? ((View as unknown) as any) : View;
  const paperWebProps =
    Platform.OS === 'web'
      ? ({
          // Class used by the print stylesheet injected in OfferEditorScreen.
          // React-Native-Web forwards dataSet → data-* attributes; that lets CSS target us.
          dataSet: { offerDocument: 'true' },
        } as any)
      : {};

  return (
    <Paper {...paperWebProps} style={styles.page}>
      {/* Logo */}
      <View style={styles.logoBox}>
        {Platform.OS === 'web' ? (
          <Image
            source={{ uri: '/bleiche-logo-text.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.docBold, { fontSize: 22, letterSpacing: 2 }]}>BLEICHE RESORT & SPA</Text>
        )}
      </View>

      {/* Address block */}
      <View style={styles.addressBlock}>
        <View style={styles.line}>
          <InlineSelect
            mode={mode}
            value={draft.salutation}
            onChange={(v) => onChange({ salutation: v as Salutation })}
            options={SALUTATION_OPTIONS}
            renderView={draft.salutation}
            widthEdit={110}
          />
          <Text style={styles.docBold}> </Text>
          <InlineText
            value={draft.firstName}
            mode={mode}
            onChange={(v) => onChange({ firstName: v })}
            placeholder="Vorname"
            bold
            width={140}
          />
          <Text style={styles.docBold}> </Text>
          <InlineText
            value={draft.lastName}
            mode={mode}
            onChange={(v) => onChange({ lastName: v })}
            placeholder="Nachname"
            bold
            width={160}
          />
        </View>
        <InlineText
          value={draft.street}
          mode={mode}
          onChange={(v) => onChange({ street: v })}
          placeholder="Straße"
          bold
          width={320}
        />
        <View style={styles.line}>
          <InlineText
            value={draft.zipCode}
            mode={mode}
            onChange={(v) => onChange({ zipCode: v })}
            placeholder="PLZ"
            bold
            width={70}
          />
          <Text style={styles.docBold}> </Text>
          <InlineText
            value={draft.city}
            mode={mode}
            onChange={(v) => onChange({ city: v })}
            placeholder="Ort"
            bold
            width={240}
          />
        </View>
      </View>

      {/* per E-Mail an */}
      {(mode === 'edit' || draft.email) && (
        <View style={[styles.line, styles.emailLine]}>
          <Text style={styles.docText}>per E-Mail an </Text>
          <InlineText
            value={draft.email}
            mode={mode}
            onChange={(v) => onChange({ email: v })}
            placeholder="E-Mail"
            keyboardType="email-address"
            width={280}
          />
        </View>
      )}

      {/* Right-aligned date */}
      <View style={styles.dateLine}>
        <Text style={styles.docText}>Burg (Spreewald), </Text>
        {mode === 'view' ? (
          <Text style={styles.docText}>{formatDateGerman(draft.offerDate) || '—'}</Text>
        ) : (
          <TextInput
            style={[styles.docText, styles.inlineInput, { width: 140 } as any]}
            value={draft.offerDate}
            onChangeText={(v) => onChange({ offerDate: v })}
            placeholder="JJJJ-MM-TT"
            placeholderTextColor={colors.dark300}
          />
        )}
      </View>

      {/* Title */}
      <Text style={styles.docTitle}>Angebot</Text>

      {/* Greeting */}
      <Text style={[styles.docText, styles.paragraph]}>
        {getGreeting(draft.salutation, draft.lastName || '…')},
      </Text>
      <Text style={[styles.docText, styles.paragraph]}>
        herzlichen Dank für Ihre Anfrage und für Ihr Interesse an einem Aufenthalt in unserem Haus.
        Gerne übersenden wir Ihnen folgendes Angebot:
      </Text>

      <View style={styles.divider} />

      {/* Stay details */}
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>Anreise:</Text>
        <View style={styles.detailVal}>
          {mode === 'view' ? (
            <Text style={styles.docText}>{formatDateGerman(draft.arrivalDate) || '—'}</Text>
          ) : (
            <TextInput
              style={[styles.docText, styles.inlineInput, { width: 160 } as any]}
              value={draft.arrivalDate}
              onChangeText={(v) => onChange({ arrivalDate: v })}
              placeholder="JJJJ-MM-TT"
              placeholderTextColor={colors.dark300}
            />
          )}
        </View>
      </View>
      <View style={[styles.detailRow, { marginBottom: 14 }]}>
        <Text style={styles.detailKey}>Abreise:</Text>
        <View style={styles.detailVal}>
          {mode === 'view' ? (
            <Text style={styles.docText}>{formatDateGerman(draft.departureDate) || '—'}</Text>
          ) : (
            <TextInput
              style={[styles.docText, styles.inlineInput, { width: 160 } as any]}
              value={draft.departureDate}
              onChangeText={(v) => onChange({ departureDate: v })}
              placeholder="JJJJ-MM-TT"
              placeholderTextColor={colors.dark300}
            />
          )}
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>Zimmer:</Text>
        <View style={styles.detailVal}>
          <InlineSelect
            mode={mode}
            value={draft.roomCategory}
            onChange={(v) => onChange({ roomCategory: v })}
            groups={ROOM_SELECT_GROUPS}
            renderView={roomName}
            widthEdit="100%"
          />
          {isCustomRoom && mode === 'edit' && (
            <View style={{ marginTop: 6 }}>
              <TextInput
                style={[styles.docText, styles.inlineInput, { width: '100%' } as any]}
                value={draft.customRoomCategory}
                onChangeText={(v) => onChange({ customRoomCategory: v })}
                placeholder="Eigene Zimmerkategorie"
                placeholderTextColor={colors.dark300}
              />
            </View>
          )}
        </View>
      </View>
      <View style={[styles.detailRow, { marginBottom: 14 }]}>
        <Text style={styles.detailKey}> </Text>
        <View style={styles.detailVal}>
          {mode === 'view' ? (
            <Text style={styles.docText}>{guestLineFromDraft(draft)}</Text>
          ) : (
            <View>
              <View style={styles.line}>
                <Text style={styles.docText}>für </Text>
                <InlineNumber
                  value={draft.adults}
                  mode={mode}
                  onChange={(n) => onChange({ adults: n })}
                  min={1}
                  max={20}
                  width={56}
                />
                <Text style={styles.docText}>
                  {draft.adults === 1 && draft.salutation === 'Herr' ? ' Erwachsenen' : ' Erwachsene'}
                </Text>
              </View>
              <ChildrenEditor
                ages={draft.childrenAges}
                onChange={(next) => onChange({ childrenAges: next })}
              />
            </View>
          )}
        </View>
      </View>

      <View style={[styles.detailRow, { marginBottom: 14 }]}>
        <Text style={styles.detailKey}>Preis:</Text>
        <View style={[styles.detailVal, styles.line]}>
          {mode === 'view' ? (
            <Text style={styles.docText}>
              {draft.pricePerNight ? `${formatEuro(draft.pricePerNight)} pro Person pro Nacht` : '—'}
            </Text>
          ) : (
            <>
              <TextInput
                style={[styles.docText, styles.inlineInput, { width: 110 } as any]}
                value={draft.pricePerNight}
                onChangeText={(v) => onChange({ pricePerNight: v.replace(/[^0-9.,]/g, '') })}
                placeholder="0,00"
                placeholderTextColor={colors.dark300}
                keyboardType="decimal-pad"
              />
              <Text style={styles.docText}> € pro Person pro Nacht</Text>
            </>
          )}
        </View>
      </View>

      {/* Leistungen */}
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>Leistungen:</Text>
        <Text style={[styles.docText, styles.underline]}>Das ist alles im Zimmerpreis enthalten:</Text>
      </View>
      <View style={styles.bulletList}>
        {amenities.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.docText}>
              {i === 0 ? 'Übernachtung in Ihrem ausgewählten Wohlfühlzimmer' : item}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.bulletList, { marginTop: 6 }]}>
        <Text style={[styles.docText, styles.underline]}>
          Das alles ist in unserer Genusspauschale enthalten:
        </Text>
        {GENUSSPAUSCHALE.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.docText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* Total */}
      <View style={[styles.detailRow, { marginBottom: 4 }]}>
        <Text style={[styles.detailKey, styles.docBold]}>Preis Gesamt:</Text>
        <View style={[styles.detailVal, styles.line]}>
          {mode === 'view' ? (
            <Text style={[styles.docText, styles.docBold]}>
              {effectiveTotal ? formatEuro(effectiveTotal) : '—'}
            </Text>
          ) : (
            <>
              <TextInput
                style={[styles.docText, styles.docBold, styles.inlineInput, { width: 140 } as any]}
                value={draft.totalPrice}
                onChangeText={(v) => onChange({ totalPrice: v.replace(/[^0-9.,]/g, '') })}
                placeholder={calcTotal || '0,00'}
                placeholderTextColor={colors.dark300}
                keyboardType="decimal-pad"
              />
              {!draft.totalPrice && calcTotal ? (
                <Text style={styles.autoNote}> (auto: {formatEuro(calcTotal)})</Text>
              ) : null}
            </>
          )}
        </View>
      </View>
      <Text style={[styles.docText, styles.microText]}>
        (zzgl. je € 1,00 Fremdenverkehrsabgabe & je € 2,00 Kurbeitrag pro Nacht)
      </Text>

      <View style={styles.divider} />

      {/* Closing paragraphs */}
      {CLOSING_PARAGRAPHS.map((p, i) => (
        <Text key={i} style={[styles.docText, styles.paragraph]}>{p}</Text>
      ))}

      {/* Signature */}
      <View style={styles.signature}>
        <Text style={styles.docText}>Mit freundlichen Grüßen</Text>
        <Text style={[styles.docBold, styles.brandName]}>BLEICHE RESORT & SPA</Text>
        <View style={styles.signatureRow}>
          <Text style={styles.docText}>Familie Clausing</Text>
          <View style={styles.signatureRight}>
            <InlineText
              value={draft.employeeName}
              mode={mode}
              onChange={(v) => onChange({ employeeName: v })}
              placeholder="Mitarbeiter/in"
              align="right"
              width={220}
            />
            <Text style={[styles.docText, { textAlign: 'right' }]}>Reservierung</Text>
          </View>
        </View>
      </View>
    </Paper>
  );
}

// ─── Children editor ────────────────────────────────────────────────────────

function ChildrenEditor({
  ages,
  onChange,
}: {
  ages: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <View style={{ marginTop: 6 }}>
      {ages.length === 0 ? (
        <Text style={[styles.docText, { color: colors.dark400 }]}>Keine Kinder</Text>
      ) : (
        ages.map((age, i) => (
          <View key={i} style={styles.childRow}>
            <Text style={styles.docText}>Kind {i + 1}: </Text>
            <TextInput
              style={[styles.docText, styles.inlineInput, { width: 48, textAlign: 'center' } as any]}
              value={String(age)}
              onChangeText={(v) => {
                const n = Math.max(0, Math.min(17, parseInt(v, 10) || 0));
                onChange(ages.map((a, j) => (j === i ? n : a)));
              }}
              keyboardType="number-pad"
            />
            <Text style={styles.docText}> Jahre</Text>
            <TouchableOpacity
              onPress={() => onChange(ages.filter((_, j) => j !== i))}
              accessibilityLabel="Kind entfernen"
            >
              <Text style={styles.removeChild}>  ×</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
      <TouchableOpacity onPress={() => onChange([...ages, 5])} accessibilityLabel="Kind hinzufügen">
        <Text style={styles.addChild}>+ Kind hinzufügen</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const PAGE_WIDTH = 820; // Approximates A4 @ screen scale
const PAGE_PADDING = 56;

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    width: PAGE_WIDTH,
    maxWidth: '100%',
    backgroundColor: colors.white,
    padding: PAGE_PADDING,
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' } as any,
      default: {},
    }),
  },
  docText: {
    fontFamily: DOC_FONT,
    fontSize: 14,
    lineHeight: 22,
    color: colors.dark700,
  },
  docBold: {
    fontFamily: DOC_FONT,
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark700,
  },
  docTitle: {
    fontFamily: DOC_FONT,
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark700,
    marginTop: 8,
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  microText: {
    fontSize: 11,
    color: colors.dark400,
    marginLeft: 110,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.brand200,
    marginVertical: 14,
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 220,
    height: 80,
  },
  addressBlock: {
    marginBottom: 10,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  emailLine: {
    marginBottom: 8,
  },
  dateLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-start',
  },
  detailKey: {
    fontFamily: DOC_FONT,
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark700,
    width: 110,
    flexShrink: 0,
    paddingTop: 2,
  },
  detailVal: {
    flex: 1,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  bulletList: {
    marginLeft: 110,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bullet: {
    fontFamily: DOC_FONT,
    fontSize: 14,
    color: colors.dark700,
    width: 14,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  removeChild: {
    fontSize: 18,
    color: colors.dark300,
  },
  addChild: {
    fontFamily: DOC_FONT,
    fontSize: 12,
    color: colors.brand500,
    marginTop: 4,
  },
  signature: {
    marginTop: 20,
  },
  brandName: {
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureRight: {
    alignItems: 'flex-end',
  },
  autoNote: {
    fontFamily: DOC_FONT,
    fontSize: 12,
    color: colors.dark400,
    marginLeft: 8,
  },
  // Edit-mode affordance: subtle tint + underline that disappears in print.
  inlineInput: {
    backgroundColor: 'rgba(194, 169, 140, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: colors.brand300,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  inlineSelectWrap: {
    // Select renders its own frame; just cap the width.
  },
});
