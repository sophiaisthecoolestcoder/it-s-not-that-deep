import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { api } from '../../api/client';
import { useRouter } from '../../navigation/Router';
import { useToast } from '../../components/ui/Toast';
import { BleicheSelect } from '../../components/ui/NativeSelect';
import type { Salutation, OfferStatus } from '../../types/offer';
import {
  ROOM_CATEGORIES,
  ROOM_GROUPS,
  getAmenitiesForRoom,
} from '../../utils/rooms';
import {
  formatDateGerman,
  formatEuro,
  getGreeting,
  nightsBetween,
} from '../../utils/helpers';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

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

function childNightlyPrice(age: number, adultPrice: number): number {
  if (age <= 3) return 0;
  if (age <= 11) return 80;
  if (age <= 15) return 100;
  return adultPrice;
}

function LabelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={f.field}>
      <Text style={f.label}>{label}</Text>
      {children}
    </View>
  );
}

function Inp({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  [k: string]: any;
}) {
  return (
    <TextInput
      style={f.input}
      value={value}
      onChangeText={onChange}
      placeholderTextColor={colors.dark300}
      {...props}
    />
  );
}

interface Props {
  offerId?: number;
}

export default function OfferEditorScreen({ offerId }: Props) {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const isEditing = Boolean(offerId);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Client info
  const [salutation, setSalutation] = useState<Salutation>('Herr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street, setStreet] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');

  // Stay info
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [roomCategory, setRoomCategory] = useState(ROOM_CATEGORIES[0].id);
  const [customRoomCategory, setCustomRoomCategory] = useState('');
  const [adults, setAdults] = useState('2');
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [pricePerNight, setPricePerNight] = useState('');
  const [totalPrice, setTotalPrice] = useState('');

  // Offer meta
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeName, setEmployeeName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<OfferStatus>('draft');

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    api
      .listOffers()
      .then((offers) => {
        const o = offers.find((x) => x.id === offerId);
        if (!o) return;
        setSalutation(o.salutation);
        setFirstName(o.first_name);
        setLastName(o.last_name);
        setStreet(o.street);
        setZipCode(o.zip_code);
        setCity(o.city);
        setEmail(o.email);
        setArrivalDate(o.arrival_date ?? '');
        setDepartureDate(o.departure_date ?? '');
        setRoomCategory(o.room_category || ROOM_CATEGORIES[0].id);
        setCustomRoomCategory(o.custom_room_category || '');
        setAdults(String(o.adults));
        setChildrenAges(o.children_ages ?? []);
        setPricePerNight(o.price_per_night || '');
        setTotalPrice(o.total_price || '');
        setOfferDate(o.offer_date ?? new Date().toISOString().split('T')[0]);
        setEmployeeName(o.employee_name || '');
        setNotes(o.notes || '');
        setStatus(o.status);
      })
      .catch((e: Error) => addToast({ type: 'error', title: 'Fehler', message: e.message }))
      .finally(() => setLoading(false));
  }, [offerId, addToast]);

  // Derived
  const isCustomRoom = roomCategory === 'custom';
  const roomCat = ROOM_CATEGORIES.find((r) => r.id === roomCategory);
  const roomName = isCustomRoom ? customRoomCategory : (roomCat?.name ?? '');
  const amenities = getAmenitiesForRoom(roomName);
  const adultsNum = parseInt(adults) || 2;
  const nights = nightsBetween(arrivalDate, departureDate);
  const adultPriceNum = parseFloat(pricePerNight) || 0;
  const childrenCostPerNight = childrenAges.reduce(
    (sum, age) => sum + childNightlyPrice(age, adultPriceNum),
    0,
  );
  const calculatedTotal =
    pricePerNight && nights > 0 && adultsNum > 0
      ? ((adultPriceNum * adultsNum + childrenCostPerNight) * nights).toFixed(2)
      : '';
  const effectiveTotal = totalPrice || calculatedTotal;

  function buildPayload() {
    return {
      salutation,
      first_name: firstName,
      last_name: lastName,
      street,
      zip_code: zipCode,
      city,
      email,
      offer_date: offerDate || null,
      arrival_date: arrivalDate || null,
      departure_date: departureDate || null,
      room_category: roomCategory,
      custom_room_category: customRoomCategory,
      adults: adultsNum,
      children_ages: childrenAges,
      price_per_night: pricePerNight,
      total_price: totalPrice,
      employee_name: employeeName,
      notes,
      status,
    };
  }

  function handleSave() {
    setSaving(true);
    const payload = buildPayload();
    const req = isEditing
      ? api.updateOffer(offerId!, payload)
      : api.createOffer(payload);
    req
      .then(() => {
        addToast({ type: 'success', title: isEditing ? 'Aktualisiert' : 'Gespeichert' });
        if (!isEditing) navigate({ name: 'offers-list' });
      })
      .catch((e: Error) => addToast({ type: 'error', title: 'Fehler', message: e.message }))
      .finally(() => setSaving(false));
  }

  function handlePrint() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      (window as any).print();
    }
  }

  function guestText(): string {
    const aWord = adultsNum === 1 && salutation === 'Herr' ? 'Erwachsenen' : 'Erwachsene';
    let t = `für ${adultsNum} ${aWord}`;
    if (childrenAges.length > 0) {
      const parts = childrenAges.map(
        (a) => `1 Kind im Alter von ${a} ${a === 1 ? 'Jahr' : 'Jahren'}`,
      );
      t += ` und ${parts.join(' und ')}`;
    }
    return t;
  }

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity
          style={[s.btnPrimary, saving && s.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={s.btnPrimaryText}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={handlePrint}>
          <Text style={s.btnSecondaryText}>Drucken / PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnGhost}
          onPress={() => navigate({ name: 'offers-list' })}
        >
          <Text style={s.btnGhostText}>← Zurück</Text>
        </TouchableOpacity>
      </View>

      <View style={s.splitRow}>
        {/* ── LEFT: Form ─────────────────────────────────────────── */}
        <ScrollView style={s.formPane} showsVerticalScrollIndicator>
          <View style={s.formCard}>
            <Text style={s.formTitle}>
              {isEditing ? 'Angebot bearbeiten' : 'Neues Angebot'}
            </Text>

            {/* Kundendaten */}
            <Text style={s.sectionLabel}>Kundendaten</Text>
            <View style={s.sectionBody}>
              <LabelField label="Anrede">
                <BleicheSelect
                  value={salutation}
                  onChange={(v) => setSalutation(v as Salutation)}
                  options={SALUTATION_OPTIONS}
                  style={{ width: '100%' }}
                />
              </LabelField>
              <View style={f.row2}>
                <LabelField label="Vorname">
                  <Inp value={firstName} onChange={setFirstName} />
                </LabelField>
                <LabelField label="Nachname">
                  <Inp value={lastName} onChange={setLastName} />
                </LabelField>
              </View>
              <LabelField label="Straße">
                <Inp value={street} onChange={setStreet} />
              </LabelField>
              <View style={f.row2}>
                <LabelField label="PLZ">
                  <Inp value={zipCode} onChange={setZipCode} />
                </LabelField>
                <LabelField label="Ort">
                  <Inp value={city} onChange={setCity} />
                </LabelField>
              </View>
              <LabelField label="E-Mail">
                <Inp value={email} onChange={setEmail} keyboardType="email-address" />
              </LabelField>
            </View>

            {/* Aufenthalt */}
            <Text style={s.sectionLabel}>Aufenthalt</Text>
            <View style={s.sectionBody}>
              <LabelField label="Anreise">
                <Inp value={arrivalDate} onChange={setArrivalDate} placeholder="JJJJ-MM-TT" />
              </LabelField>
              <LabelField label="Abreise">
                <Inp value={departureDate} onChange={setDepartureDate} placeholder="JJJJ-MM-TT" />
              </LabelField>
              <LabelField label="Zimmer">
                <BleicheSelect
                  value={roomCategory}
                  onChange={setRoomCategory}
                  options={[]}
                  groups={ROOM_SELECT_GROUPS}
                  style={{ width: '100%' }}
                />
              </LabelField>
              {isCustomRoom && (
                <LabelField label="Eigene Zimmerkategorie">
                  <Inp
                    value={customRoomCategory}
                    onChange={setCustomRoomCategory}
                    placeholder="z.B. Penthouse Suite"
                  />
                </LabelField>
              )}
              <LabelField label="Erwachsene">
                <Inp
                  value={adults}
                  onChange={setAdults}
                  keyboardType="number-pad"
                />
              </LabelField>

              {/* Children */}
              <View style={f.field}>
                <Text style={f.label}>Kinder</Text>
                {childrenAges.length === 0 ? (
                  <Text style={s.noChildren}>Keine Kinder</Text>
                ) : (
                  childrenAges.map((age, i) => {
                    const price = childNightlyPrice(age, adultPriceNum);
                    return (
                      <View key={i} style={s.childRow}>
                        <Text style={s.childLabel}>Kind {i + 1}:</Text>
                        <TextInput
                          style={s.childInput}
                          value={String(age)}
                          onChangeText={(v) => {
                            const n = Math.max(0, Math.min(17, parseInt(v) || 0));
                            setChildrenAges((prev) =>
                              prev.map((a, j) => (j === i ? n : a)),
                            );
                          }}
                          keyboardType="number-pad"
                        />
                        <Text style={s.childUnit}>Jahre</Text>
                        <Text style={s.childPrice}>
                          {price === 0 ? 'kostenfrei' : `${price},00 €/N`}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setChildrenAges((prev) => prev.filter((_, j) => j !== i))
                          }
                        >
                          <Text style={s.removeChild}>×</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
                <TouchableOpacity
                  onPress={() => setChildrenAges((prev) => [...prev, 5])}
                >
                  <Text style={s.addChild}>+ Kind hinzufügen</Text>
                </TouchableOpacity>
              </View>

              <LabelField label="Preis pro Person/Nacht (€)">
                <Inp value={pricePerNight} onChange={setPricePerNight} keyboardType="decimal-pad" />
              </LabelField>
              <View style={f.field}>
                <Text style={f.label}>
                  Preis Gesamt
                  {!totalPrice && calculatedTotal
                    ? ` (auto: ${formatEuro(calculatedTotal)})`
                    : ''}
                </Text>
                <TextInput
                  style={f.input}
                  value={totalPrice}
                  onChangeText={(v) => setTotalPrice(v.replace(/[^0-9.,]/g, ''))}
                  placeholder={calculatedTotal || ''}
                  placeholderTextColor={colors.dark300}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Angebot-Meta */}
            <Text style={s.sectionLabel}>Angebot</Text>
            <View style={s.sectionBody}>
              <LabelField label="Datum des Angebots">
                <Inp value={offerDate} onChange={setOfferDate} placeholder="JJJJ-MM-TT" />
              </LabelField>
              <LabelField label="Name Mitarbeiter/in">
                <Inp value={employeeName} onChange={setEmployeeName} />
              </LabelField>
            </View>
          </View>
        </ScrollView>

        {/* ── RIGHT: Preview ─────────────────────────────────── */}
        <ScrollView
          style={s.previewPane}
          contentContainerStyle={s.previewContent}
          showsVerticalScrollIndicator
        >
          <View style={s.docPage}>
            {/* Address block */}
            <Text style={[s.docBold, { marginBottom: 1 }]}>
              {salutation} {firstName} {lastName}
            </Text>
            <Text style={[s.docBold, { marginBottom: 1 }]}>{street}</Text>
            <Text style={[s.docBold, { marginBottom: 8 }]}>
              {zipCode} {city}
            </Text>
            <Text style={{ ...s.docText, marginBottom: 8 }}>
              per E-Mail an {email}
            </Text>
            <Text style={{ ...s.docText, textAlign: 'right', marginBottom: 12 }}>
              Burg (Spreewald), {formatDateGerman(offerDate)}
            </Text>

            <Text style={[s.docTitle, { marginBottom: 8 }]}>Angebot</Text>
            <Text style={[s.docText, { marginBottom: 12 }]}>
              {getGreeting(salutation, lastName)},
            </Text>
            <Text style={[s.docText, { marginBottom: 8 }]}>
              herzlichen Dank für Ihre Anfrage und für Ihr Interesse an einem Aufenthalt in
              unserem Haus. Gerne übersenden wir Ihnen folgendes Angebot:
            </Text>

            <View style={s.docDivider} />

            {/* Details table */}
            <View style={{ marginBottom: 8 }}>
              <View style={s.docRow}>
                <Text style={s.docKey}>Anreise:</Text>
                <Text style={s.docVal}>{formatDateGerman(arrivalDate)}</Text>
              </View>
              <View style={[s.docRow, { marginBottom: 12 }]}>
                <Text style={s.docKey}>Abreise:</Text>
                <Text style={s.docVal}>{formatDateGerman(departureDate)}</Text>
              </View>
              <View style={s.docRow}>
                <Text style={s.docKey}>Zimmer:</Text>
                <Text style={s.docVal}>{roomName}</Text>
              </View>
              <View style={[s.docRow, { marginBottom: 12 }]}>
                <Text style={[s.docKey, { opacity: 0 }]}>Zimmer:</Text>
                <Text style={s.docVal}>{guestText()}</Text>
              </View>
              <View style={[s.docRow, { marginBottom: 12 }]}>
                <Text style={s.docKey}>Preis:</Text>
                <Text style={s.docVal}>
                  {pricePerNight
                    ? `${formatEuro(pricePerNight)} pro Person pro Nacht`
                    : '—'}
                </Text>
              </View>
            </View>

            {/* Leistungen */}
            <View style={s.docRow}>
              <Text style={s.docKey}>Leistungen:</Text>
              <Text style={[s.docVal, { textDecorationLine: 'underline' }]}>
                Das ist alles im Zimmerpreis enthalten:
              </Text>
            </View>
            {amenities.map((item, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.docText}>
                  {i === 0 ? 'Übernachtung in Ihrem ausgewählten Wohlfühlzimmer' : item}
                </Text>
              </View>
            ))}

            <Text style={[s.docText, { textDecorationLine: 'underline', marginTop: 8 }]}>
              Das alles ist in unserer Genusspauschale enthalten:
            </Text>
            {[
              'Frühstück ab 7:30 Uhr, wann immer sie ausgeschlafen haben',
              'Kulinarische Kleinigkeiten in unserem Bios für zwischendurch',
              'Unser exklusives Bleiche-Abendmenü',
            ].map((item, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.docText}>{item}</Text>
              </View>
            ))}

            <View style={[s.docDivider, { marginTop: 8 }]} />

            {/* Total */}
            <View style={[s.docRow, { marginVertical: 6 }]}>
              <Text style={[s.docKey, { width: 110, fontWeight: '700' }]}>
                Preis Gesamt:
              </Text>
              <Text style={[s.docVal, { fontWeight: '700' }]}>
                {effectiveTotal ? formatEuro(effectiveTotal) : '—'}
              </Text>
            </View>
            <Text style={s.docMicro}>
              (zzgl. je € 1,00 Fremdenverkehrsabgabe & je € 2,00 Kurbeitrag pro Nacht)
            </Text>

            <View style={s.docDivider} />

            {/* Info paragraphs */}
            {[
              'Unsere Zimmer und Suiten sowie unsere Landtherme stehen am Anreisetag ab 16.00 Uhr und am Abreisetag bis 12.00 Uhr zur Verfügung.',
              'Unsere SPA-Quelven stehen Ihnen gern für Ihre Reservierungswünsche für Anwendungen in der Landtherme zur Verfügung (Tel. +49 (0)35603-62519 sowie landtherme@bleiche.de).',
              'Unsere Stornierungsbedingungen finden Sie auf unserer Homepage www.bleiche.de unter der Rubrik "Impressum/AGB".',
              'Wir freuen uns, wenn Ihnen unser Angebot zusagt und wir Sie als Gäste in unserem Haus begrüßen dürfen.',
            ].map((p, i) => (
              <Text key={i} style={[s.docText, { marginBottom: 8 }]}>
                {p}
              </Text>
            ))}

            {/* Closing */}
            <View style={{ marginTop: 16 }}>
              <Text style={s.docText}>Mit freundlichen Grüßen</Text>
              <Text style={[s.docText, { fontWeight: '700', letterSpacing: 1, marginBottom: 12 }]}>
                BLEICHE RESORT & SPA
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.docText}>Familie Clausing</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.docText}>{employeeName}</Text>
                  <Text style={s.docText}>Reservierung</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  field: { marginBottom: 12 },
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark400,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    alignItems: 'center',
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
  splitRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 0,
    minHeight: 600,
  },
  formPane: {
    flex: 0,
    width: '45%',
    marginRight: 12,
  },
  formCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.brand700,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.dark400,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand200,
    paddingBottom: 4,
    marginBottom: 14,
    marginTop: 8,
  },
  sectionBody: {
    marginBottom: 8,
  },
  noChildren: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark300,
    marginBottom: 8,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  childLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark400,
    width: 52,
  },
  childInput: {
    borderWidth: 1,
    borderColor: colors.dark200,
    width: 48,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
  },
  childUnit: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark400,
  },
  childPrice: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark300,
    flex: 1,
    textAlign: 'right',
  },
  removeChild: {
    fontSize: 18,
    color: colors.dark300,
    paddingHorizontal: 4,
  },
  addChild: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.brand500,
    marginTop: 4,
  },
  // Preview pane
  previewPane: {
    flex: 1,
    backgroundColor: colors.dark50,
  },
  previewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  docPage: {
    backgroundColor: colors.white,
    padding: 48,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  docText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
    lineHeight: 20,
  },
  docBold: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark700,
  },
  docTitle: {
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark700,
  },
  docDivider: {
    height: 1,
    backgroundColor: colors.brand200,
    marginVertical: 10,
  },
  docRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  docKey: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark700,
    width: 90,
    flexShrink: 0,
  },
  docVal: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
    flex: 1,
  },
  docMicro: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    marginLeft: 110,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginLeft: 90,
    marginBottom: 2,
  },
  bullet: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
    width: 14,
  },
});
