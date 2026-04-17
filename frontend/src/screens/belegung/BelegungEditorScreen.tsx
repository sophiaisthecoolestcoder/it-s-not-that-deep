import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { BleicheSelect } from '../../components/ui/NativeSelect';
import type {
  DailyData,
  GuestRow,
  OpsEntry,
  NewspaperRow,
  NewGuestRow,
  FreeRoomRow,
} from '../../types/belegung';
import { getRoomCategory } from '../../utils/rooms';
import { formatDateShort, formatWeekday, generateId, todayISO } from '../../utils/helpers';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

// ── Factories ──────────────────────────────────────────────────────────────

function emptyGuestRow(): GuestRow {
  return {
    id: generateId(), roomNr: '', category: '', name: '', adults: 0, children: 0,
    group: '', arr: '', arrDate: '', depDate: '', price: '', hp: '', booking: '',
    hns: '', fs: '', ae: '', ort: '', kfz: '', notes: '', visitCount: '', lastVisit: '',
    status: 'Bl',
  };
}

function emptyOpsEntry(): OpsEntry {
  return { id: generateId(), roomNr: '', name: '', status: '', info: '' };
}

function emptyNewspaper(): NewspaperRow {
  return { id: generateId(), roomNr: '', newspaper: '', dateRange: '', remarks: '' };
}

function emptyNewGuest(): NewGuestRow {
  return {
    id: generateId(), roomNr: '', category: '', name: '', adults: 0, children: 0,
    group: '', arr: '', arrDate: '', depDate: '', price: '', tableNr: '', booking: '',
    fsAe: '', ortKfz: '', notes: '',
  };
}

function emptyFreeRoom(): FreeRoomRow {
  return { id: generateId(), roomNr: '', category: '', outOfOrder: '' };
}

function emptyData(date: string): DailyData {
  const today = date || todayISO();
  return {
    date: today,
    header: { standDate: today, standTime: '', tkName: '', tkTimeRange: '', hskName: '', hskTimeRange: '', chefDerNacht: '', chefTimeRange: '' },
    stats: { anrZi: '', anrPer: '', abrZi: '', abrPer: '', bleiberZi: '', bleiberPer: '', uenZi: '', uenPer: '', fruehAnreisen: '', spaetAbreisen: '', spaetAnreisen: '' },
    weeklyOccupancy: { mo: '', di: '', mi: '', do_: '', fr: '', sa: '', so: '' },
    arrivals: [], stayers: [],
    infoSection: '', fruehschicht: '', fruehExtern: '', fruehOps: [],
    spaetschicht: '', spaetAeExtern: '', spaetOps: [],
    kueche: '', kuecheFsExtern: '', kuecheAeExtern: '',
    kuecheLaktose: [], kuecheGluten: [], kuecheAllergien: [], kuecheUnvertraeglichkeiten: [], kuecheSonstiges: [], kuecheOps: [],
    veranstaltungenBankett: '', tischwuensche: '', tischwuenscheAeExtern: '', tischwuenscheOps: [],
    englischeMenuekarten: '',
    geburtstage: [], housekeeping: [], empfangChauffeure: [],
    ltExtern: '', eAuto: '',
    landtherme: [], landthermeLtExtern: '',
    newspapers: [], newGuests: [], freeRooms: [],
  };
}

// ── Shared mini-input style ───────────────────────────────────────────────

const MI: any = {
  height: 22,
  borderBottomWidth: 1,
  borderBottomColor: colors.belSoftBorder,
  backgroundColor: 'transparent',
  paddingHorizontal: 3,
  paddingVertical: 1,
  fontFamily: fonts.sans,
  fontSize: 11,
  color: colors.textPrimary,
};

function MiniInput({
  value,
  onChange,
  width,
  placeholder,
  keyboardType,
  center,
}: {
  value: string;
  onChange: (v: string) => void;
  width?: number;
  placeholder?: string;
  keyboardType?: any;
  center?: boolean;
}) {
  return (
    <TextInput
      style={[MI, width ? { width } : { flex: 1 }, center && { textAlign: 'center' }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.dark300}
      keyboardType={keyboardType}
    />
  );
}

// ── SectionHeader (grey bar) ──────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <View style={t.sectionHeader}>
      <Text style={t.sectionHeaderText}>{children}</Text>
    </View>
  );
}

// ── Cell / Header cell wrappers ───────────────────────────────────────────

function Th({ width, children }: { width: number; children?: React.ReactNode }) {
  return (
    <View style={[t.th, { width }]}>
      <Text style={t.thText}>{children}</Text>
    </View>
  );
}

function Td({ width, children, flex }: { width?: number; children?: React.ReactNode; flex?: number }) {
  return (
    <View style={[t.td, flex ? { flex } : { width: width ?? 60 }]}>
      {children}
    </View>
  );
}

// ── Guest Table (Arrivals / Stayers) ────────────────────────────────────

const ARR_OPTIONS = [
  { value: '', label: '—' },
  ...['Rack25', 'Rack26', 'Rack26N', 'booking', 'FLAU26N', 'RackFR26N', 'KE26N', 'BFG26.1 4=3'].map(
    (v) => ({ value: v, label: v }),
  ),
  { value: '__custom__', label: 'Eigene...' },
];

interface GuestTableProps {
  rows: GuestRow[];
  onUpdate: (id: string, updates: Partial<GuestRow>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

function GuestTable({ rows, onUpdate, onRemove, onAdd }: GuestTableProps) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Header */}
          <View style={t.tr}>
            <Th width={52}>#</Th>
            <Th width={44}>Kat</Th>
            <Th width={110}>Name</Th>
            <Th width={32}>E</Th>
            <Th width={32}>K</Th>
            <Th width={60}>Gruppe</Th>
            <Th width={90}>Arr</Th>
            <Th width={56}>Anr</Th>
            <Th width={56}>Abr</Th>
            <Th width={56}>Preis</Th>
            <Th width={50}>HP</Th>
            <Th width={110}>Booking</Th>
            <Th width={80}>Ort/KFZ</Th>
            <Th width={110}>Notizen</Th>
            <Th width={60}>Besuche</Th>
            <Th width={28}></Th>
          </View>
          {/* Rows */}
          {rows.map((row) => (
            <View key={row.id} style={t.tr}>
              <Td width={52}>
                <MiniInput width={46} value={row.roomNr} onChange={(v) => onUpdate(row.id, { roomNr: v })} />
              </Td>
              <Td width={44}>
                <Text style={t.catText}>{row.category}</Text>
              </Td>
              <Td width={110}>
                <MiniInput width={104} value={row.name} onChange={(v) => onUpdate(row.id, { name: v })} />
              </Td>
              <Td width={32}>
                <MiniInput width={28} value={row.adults ? String(row.adults) : ''} onChange={(v) => onUpdate(row.id, { adults: parseInt(v) || 0 })} keyboardType="number-pad" center />
              </Td>
              <Td width={32}>
                <MiniInput width={28} value={row.children ? String(row.children) : ''} onChange={(v) => onUpdate(row.id, { children: parseInt(v) || 0 })} keyboardType="number-pad" center />
              </Td>
              <Td width={60}>
                <MiniInput width={56} value={row.group} onChange={(v) => onUpdate(row.id, { group: v })} />
              </Td>
              <Td width={90}>
                <BleicheSelect
                  value={ARR_OPTIONS.find((o) => o.value === row.arr) ? row.arr : (row.arr ? '__custom__' : '')}
                  onChange={(v) => {
                    if (v === '__custom__') onUpdate(row.id, { arr: '' });
                    else onUpdate(row.id, { arr: v });
                  }}
                  options={ARR_OPTIONS}
                  mini
                  style={{ width: 84 }}
                />
                {!ARR_OPTIONS.find((o) => o.value === row.arr) && row.arr !== '' && (
                  <MiniInput width={84} value={row.arr} onChange={(v) => onUpdate(row.id, { arr: v })} />
                )}
              </Td>
              <Td width={56}>
                <MiniInput width={50} value={row.arrDate} onChange={(v) => onUpdate(row.id, { arrDate: v })} placeholder="dd.MM" />
              </Td>
              <Td width={56}>
                <MiniInput width={50} value={row.depDate} onChange={(v) => onUpdate(row.id, { depDate: v })} placeholder="dd.MM" />
              </Td>
              <Td width={56}>
                <MiniInput width={50} value={row.price} onChange={(v) => onUpdate(row.id, { price: v })} />
              </Td>
              <Td width={50}>
                <MiniInput width={44} value={row.hp} onChange={(v) => onUpdate(row.id, { hp: v })} />
              </Td>
              <Td width={110}>
                <MiniInput width={104} value={row.booking} onChange={(v) => onUpdate(row.id, { booking: v })} placeholder="Booking" />
                <MiniInput width={104} value={row.hns} onChange={(v) => onUpdate(row.id, { hns: v })} placeholder="HNS" />
                <View style={{ flexDirection: 'row', gap: 2, marginTop: 1 }}>
                  <MiniInput width={34} value={row.fs} onChange={(v) => onUpdate(row.id, { fs: v })} placeholder="FS" center />
                  <MiniInput width={34} value={row.ae} onChange={(v) => onUpdate(row.id, { ae: v })} placeholder="AE" center />
                </View>
              </Td>
              <Td width={80}>
                <MiniInput width={74} value={row.ort} onChange={(v) => onUpdate(row.id, { ort: v })} placeholder="Ort" />
                <MiniInput width={74} value={row.kfz} onChange={(v) => onUpdate(row.id, { kfz: v })} placeholder="KFZ" />
              </Td>
              <Td width={110}>
                <MiniInput width={104} value={row.notes} onChange={(v) => onUpdate(row.id, { notes: v })} />
              </Td>
              <Td width={60}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <MiniInput width={26} value={row.visitCount} onChange={(v) => onUpdate(row.id, { visitCount: v })} center />
                  <Text style={t.catText}>x</Text>
                </View>
                <MiniInput width={44} value={row.lastVisit} onChange={(v) => onUpdate(row.id, { lastVisit: v })} placeholder="MM/YY" center />
              </Td>
              <Td width={28}>
                <TouchableOpacity onPress={() => onRemove(row.id)}>
                  <Text style={t.removeBtn}>×</Text>
                </TouchableOpacity>
              </Td>
            </View>
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity onPress={onAdd} style={t.addRowBtn}>
        <Text style={t.addRowText}>+ Zeile hinzufügen</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── OpsSection ───────────────────────────────────────────────────────────

type OpsKey = keyof DailyData;

interface OpsSectionProps {
  entries: OpsEntry[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<OpsEntry>) => void;
  onRemove: (id: string) => void;
}

function OpsSection({ entries, onAdd, onUpdate, onRemove }: OpsSectionProps) {
  return (
    <View style={{ marginLeft: 8, marginBottom: 4 }}>
      {entries.length > 0 && (
        <View>
          {entries.map((e, idx) => (
            <View key={e.id} style={[t.tr, { marginBottom: 1 }]}>
              <Td width={24}><Text style={t.catText}>{idx + 1}</Text></Td>
              <Td width={56}><MiniInput value={e.roomNr} onChange={(v) => onUpdate(e.id, { roomNr: v })} placeholder="#" /></Td>
              <Td width={110}><MiniInput value={e.name} onChange={(v) => onUpdate(e.id, { name: v })} placeholder="Name" /></Td>
              <Td flex={1}><MiniInput value={e.info} onChange={(v) => onUpdate(e.id, { info: v })} placeholder="Info" /></Td>
              <Td width={24}>
                <TouchableOpacity onPress={() => onRemove(e.id)}>
                  <Text style={t.removeBtn}>×</Text>
                </TouchableOpacity>
              </Td>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity onPress={onAdd} style={t.addRowBtn}>
        <Text style={t.addRowText}>+ Eintrag</Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  initialDate?: string;
}

export default function BelegungEditorScreen({ initialDate }: Props) {
  const { addToast } = useToast();
  const [currentDate, setCurrentDate] = useState(initialDate || todayISO());
  const [data, setData] = useState<DailyData>(emptyData(currentDate));
  const [staff, setStaff] = useState<{ id: number | string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load day data + staff on mount / date change
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDay(currentDate).then((res) => setData(res.data)).catch(() => setData(emptyData(currentDate))),
      api.listStaff().then(setStaff).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [currentDate]);

  // ── State updaters ──────────────────────────────────────────────────────

  const updateData = useCallback((updates: Partial<DailyData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const setHeader = (field: string, value: string) =>
    updateData({ header: { ...data.header, [field]: value } });

  const setStat = (field: string, value: string) =>
    updateData({ stats: { ...data.stats, [field]: value } });

  const setWeekly = (field: string, value: string) =>
    updateData({ weeklyOccupancy: { ...data.weeklyOccupancy, [field]: value } });

  // Guest rows
  const addArrival = () => updateData({ arrivals: [...data.arrivals, emptyGuestRow()] });
  const updateArrival = (id: string, u: Partial<GuestRow>) =>
    updateData({ arrivals: data.arrivals.map((r) => (r.id === id ? { ...r, ...u, category: u.roomNr !== undefined ? getRoomCategory(u.roomNr) : r.category } : r)) });
  const removeArrival = (id: string) => updateData({ arrivals: data.arrivals.filter((r) => r.id !== id) });

  const addStayer = () => updateData({ stayers: [...data.stayers, emptyGuestRow()] });
  const updateStayer = (id: string, u: Partial<GuestRow>) =>
    updateData({ stayers: data.stayers.map((r) => (r.id === id ? { ...r, ...u, category: u.roomNr !== undefined ? getRoomCategory(u.roomNr) : r.category } : r)) });
  const removeStayer = (id: string) => updateData({ stayers: data.stayers.filter((r) => r.id !== id) });

  // Ops entries
  function addOps(key: OpsKey) {
    setData((prev) => ({ ...prev, [key]: [...(prev[key] as OpsEntry[]), emptyOpsEntry()] }));
  }
  function updateOps(key: OpsKey, id: string, u: Partial<OpsEntry>) {
    setData((prev) => ({ ...prev, [key]: (prev[key] as OpsEntry[]).map((e) => (e.id === id ? { ...e, ...u } : e)) }));
  }
  function removeOps(key: OpsKey, id: string) {
    setData((prev) => ({ ...prev, [key]: (prev[key] as OpsEntry[]).filter((e) => e.id !== id) }));
  }

  // Save
  function handleSave() {
    setSaving(true);
    api.upsertDay(currentDate, data)
      .then(() => addToast({ type: 'success', title: 'Gespeichert', message: 'Belegungsliste gespeichert.' }))
      .catch((e: Error) => addToast({ type: 'error', title: 'Fehler', message: e.message }))
      .finally(() => setSaving(false));
  }

  function handlePrint() {
    if (typeof window !== 'undefined') (window as any).print();
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <TextInput
          style={s.dateInput}
          value={currentDate}
          onChangeText={setCurrentDate}
          placeholder="JJJJ-MM-TT"
          placeholderTextColor={colors.dark300}
        />
        <TouchableOpacity style={[s.btnPrimary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={s.btnPrimaryText}>{saving ? 'Speichern...' : 'Speichern'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={handlePrint}>
          <Text style={s.btnSecondaryText}>Drucken</Text>
        </TouchableOpacity>
      </View>

      {/* Sheet */}
      <ScrollView style={s.sheet} contentContainerStyle={s.sheetContent}>

        {/* A. Header */}
        <View style={[s.headerSection, { borderBottomWidth: 1, borderBottomColor: colors.belBorder }]}>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            {/* Col 1: Stand */}
            <View style={{ gap: 4 }}>
              <View style={s.headerRow}>
                <Text style={s.headerLabel}>Stand:</Text>
                <MiniInput width={100} value={data.header.standDate} onChange={(v) => setHeader('standDate', v)} />
              </View>
              <View style={s.headerRow}>
                <Text style={s.headerLabel}>Uhrzeit:</Text>
                <MiniInput width={80} value={data.header.standTime} onChange={(v) => setHeader('standTime', v)} />
              </View>
            </View>
            {/* Col 2: TK / HSK */}
            <View style={{ gap: 4 }}>
              <View style={s.headerRow}>
                <Text style={s.headerLabel}>TK:</Text>
                <MiniInput width={120} value={data.header.tkName} onChange={(v) => setHeader('tkName', v)} placeholder="Name" />
                <MiniInput width={70} value={data.header.tkTimeRange} onChange={(v) => setHeader('tkTimeRange', v)} placeholder="Zeit" />
              </View>
              <View style={s.headerRow}>
                <Text style={s.headerLabel}>HSK:</Text>
                <MiniInput width={120} value={data.header.hskName} onChange={(v) => setHeader('hskName', v)} placeholder="Name" />
                <MiniInput width={70} value={data.header.hskTimeRange} onChange={(v) => setHeader('hskTimeRange', v)} placeholder="Zeit" />
              </View>
            </View>
            {/* Col 3: Chef */}
            <View style={{ gap: 4 }}>
              <Text style={[s.headerLabel, { fontWeight: '700' }]}>Chef der Nacht</Text>
              <View style={s.headerRow}>
                <MiniInput width={120} value={data.header.chefDerNacht} onChange={(v) => setHeader('chefDerNacht', v)} placeholder="Name" />
                <MiniInput width={70} value={data.header.chefTimeRange} onChange={(v) => setHeader('chefTimeRange', v)} placeholder="Zeit" />
              </View>
            </View>
          </View>
        </View>

        {/* B. Day Title */}
        <View style={t.sectionHeader}>
          <Text style={[t.sectionHeaderText, { textAlign: 'center' }]}>
            Tagesinformation für {formatWeekday(currentDate)}, {formatDateShort(currentDate)}
          </Text>
        </View>

        {/* C. Stats Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.belBorder }}>
          <View style={{ flexDirection: 'row' }}>
            {([
              ['Anr. Zi/Per', 'anrZi', 'anrPer'],
              ['Abr. Zi/Per', 'abrZi', 'abrPer'],
              ['Bleiber Zi/Per', 'bleiberZi', 'bleiberPer'],
              ['ÜN Zi/Per', 'uenZi', 'uenPer'],
            ] as const).map(([label, f1, f2]) => (
              <View key={label} style={s.statCell}>
                <Text style={s.statLabel}>{label}</Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <MiniInput width={40} value={(data.stats as any)[f1]} onChange={(v) => setStat(f1, v)} center />
                  <MiniInput width={40} value={(data.stats as any)[f2]} onChange={(v) => setStat(f2, v)} center />
                </View>
              </View>
            ))}
            {([
              ['Frühanreisen', 'fruehAnreisen'],
              ['Spätabreisen', 'spaetAbreisen'],
              ['Spätanreisen', 'spaetAnreisen'],
            ] as const).map(([label, field]) => (
              <View key={label} style={s.statCell}>
                <Text style={s.statLabel}>{label}</Text>
                <MiniInput width={40} value={(data.stats as any)[field]} onChange={(v) => setStat(field, v)} center />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* D. Weekly Occupancy */}
        <View style={[s.weeklyRow, { borderBottomWidth: 1, borderBottomColor: colors.belBorder }]}>
          <Text style={s.weeklyLabel}>Wöchentliche{'\n'}Belegung-Gäste</Text>
          <View style={s.weeklyGrid}>
            {(['mo', 'di', 'mi', 'do_', 'fr', 'sa', 'so'] as const).map((day) => (
              <View key={day} style={s.weeklyCell}>
                <Text style={s.weekdayAbbr}>{day === 'do_' ? 'Do' : day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                <MiniInput width={40} value={data.weeklyOccupancy[day]} onChange={(v) => setWeekly(day, v)} center />
              </View>
            ))}
          </View>
        </View>

        {/* E. Arrivals */}
        <SectionHeader>Anreisen ({data.arrivals.length} Zimmer)</SectionHeader>
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <GuestTable rows={data.arrivals} onUpdate={updateArrival} onRemove={removeArrival} onAdd={addArrival} />
        </View>

        {/* F. Stayers */}
        <SectionHeader>Bleiber ({data.stayers.length} Zimmer)</SectionHeader>
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <GuestTable rows={data.stayers} onUpdate={updateStayer} onRemove={removeStayer} onAdd={addStayer} />
        </View>

        {/* G. Frühschicht */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Frühschicht:</Text>
          <View style={s.opsExternRow}>
            <Text style={s.opsExternLabel}>extern</Text>
            <MiniInput value={data.fruehExtern} onChange={(v) => updateData({ fruehExtern: v })} />
          </View>
          <OpsSection entries={data.fruehOps} onAdd={() => addOps('fruehOps')} onUpdate={(id, u) => updateOps('fruehOps', id, u)} onRemove={(id) => removeOps('fruehOps', id)} />
        </View>

        {/* H. Spätschicht */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Spätschicht:</Text>
          <View style={s.opsExternRow}>
            <Text style={s.opsExternLabel}>AE extern:</Text>
            <MiniInput value={data.spaetAeExtern} onChange={(v) => updateData({ spaetAeExtern: v })} />
          </View>
          <OpsSection entries={data.spaetOps} onAdd={() => addOps('spaetOps')} onUpdate={(id, u) => updateOps('spaetOps', id, u)} onRemove={(id) => removeOps('spaetOps', id)} />
        </View>

        {/* I. Küche */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Küche:</Text>
          <View style={s.opsExternRow}>
            <Text style={s.opsExternLabel}>FS extern:</Text>
            <MiniInput value={data.kuecheFsExtern} onChange={(v) => updateData({ kuecheFsExtern: v })} />
          </View>
          <View style={s.opsExternRow}>
            <Text style={s.opsExternLabel}>AE extern:</Text>
            <MiniInput value={data.kuecheAeExtern} onChange={(v) => updateData({ kuecheAeExtern: v })} />
          </View>
          {/* Dietary grid */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['kuecheLaktose', 'kuecheGluten', 'kuecheAllergien', 'kuecheUnvertraeglichkeiten', 'kuecheSonstiges'] as const).map((key) => {
                const labels: Record<string, string> = { kuecheLaktose: 'Laktose', kuecheGluten: 'Gluten', kuecheAllergien: 'Allergien', kuecheUnvertraeglichkeiten: 'Unverträglichk.', kuecheSonstiges: 'Sonstiges' };
                return (
                  <View key={key} style={{ width: 140 }}>
                    <Text style={s.dietLabel}>{labels[key]}</Text>
                    {(data[key] as OpsEntry[]).map((e) => (
                      <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 1 }}>
                        <MiniInput value={`${e.roomNr} ${e.name} ${e.info}`.trim()}
                          onChange={(v) => {
                            const parts = v.split(' ');
                            updateOps(key, e.id, { roomNr: parts[0] || '', name: parts[1] || '', info: parts.slice(2).join(' ') });
                          }}
                        />
                        <TouchableOpacity onPress={() => removeOps(key, e.id)}>
                          <Text style={t.removeBtn}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => addOps(key)}>
                      <Text style={t.addRowText}>+ Zeile</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <OpsSection entries={data.kuecheOps} onAdd={() => addOps('kuecheOps')} onUpdate={(id, u) => updateOps('kuecheOps', id, u)} onRemove={(id) => removeOps('kuecheOps', id)} />
        </View>

        {/* J. Veranstaltungen */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Veranstaltungen/Bankett:</Text>
          <View style={{ marginLeft: 8 }}>
            <MiniInput value={data.veranstaltungenBankett} onChange={(v) => updateData({ veranstaltungenBankett: v })} />
          </View>
        </View>

        {/* K. Tischwünsche */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Tischwünsche:</Text>
          <View style={s.opsExternRow}>
            <Text style={s.opsExternLabel}>AE extern:</Text>
            <MiniInput value={data.tischwuenscheAeExtern} onChange={(v) => updateData({ tischwuenscheAeExtern: v })} />
          </View>
          <OpsSection entries={data.tischwuenscheOps} onAdd={() => addOps('tischwuenscheOps')} onUpdate={(id, u) => updateOps('tischwuenscheOps', id, u)} onRemove={(id) => removeOps('tischwuenscheOps', id)} />
        </View>

        {/* L. Englische Menükarten */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Englische Menükarten:</Text>
          <View style={{ marginLeft: 8 }}>
            <MiniInput value={data.englischeMenuekarten} onChange={(v) => updateData({ englischeMenuekarten: v })} />
          </View>
        </View>

        {/* M. Geburtstage */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Geburtstag/besondere Anlässe:</Text>
          <OpsSection entries={data.geburtstage} onAdd={() => addOps('geburtstage')} onUpdate={(id, u) => updateOps('geburtstage', id, u)} onRemove={(id) => removeOps('geburtstage', id)} />
        </View>

        {/* N. Housekeeping */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Housekeeping:</Text>
          <Text style={[s.opsExternLabel, { marginLeft: 8, marginBottom: 4, fontStyle: 'italic' }]}>
            Liebe Hausdamen, bei Abreisezimmern immer auf WLAN-Cubes achten und an die Rezi bringen! Danke!
          </Text>
          <OpsSection entries={data.housekeeping} onAdd={() => addOps('housekeeping')} onUpdate={(id, u) => updateOps('housekeeping', id, u)} onRemove={(id) => removeOps('housekeeping', id)} />
        </View>

        {/* O. Empfang/Chauffeure */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Empfang/Chauffeure:</Text>
          <OpsSection entries={data.empfangChauffeure} onAdd={() => addOps('empfangChauffeure')} onUpdate={(id, u) => updateOps('empfangChauffeure', id, u)} onRemove={(id) => removeOps('empfangChauffeure', id)} />
          <View style={s.opsExternRow}>
            <Text style={s.opsExternLabel}>LT extern:</Text>
            <MiniInput value={data.ltExtern} onChange={(v) => updateData({ ltExtern: v })} />
          </View>
        </View>

        {/* P. E-Auto */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>E-Auto:</Text>
          <View style={{ marginLeft: 8 }}>
            <MiniInput value={data.eAuto} onChange={(v) => updateData({ eAuto: v })} />
          </View>
        </View>

        {/* Q. Landtherme */}
        <View style={s.opsSection}>
          <Text style={s.opsTitle}>Landtherme:</Text>
          <OpsSection entries={data.landtherme} onAdd={() => addOps('landtherme')} onUpdate={(id, u) => updateOps('landtherme', id, u)} onRemove={(id) => removeOps('landtherme', id)} />
          <View style={s.opsExternRow}>
            <Text style={s.opsExternLabel}>LT EXTERN:</Text>
            <MiniInput value={data.landthermeLtExtern} onChange={(v) => updateData({ landthermeLtExtern: v })} />
          </View>
        </View>

        {/* ── Bottom Sections ─────────────────────────────────────────────── */}

        {/* Zeitungen */}
        <SectionHeader>Zeitungen</SectionHeader>
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={t.tr}>
                <Th width={70}>Zimmer-Nr.</Th>
                <Th width={110}>Zeitung</Th>
                <Th width={160}>WANN? von — bis —</Th>
                <Th width={200}>Bemerkungen</Th>
                <Th width={28}></Th>
              </View>
              {data.newspapers.map((row) => (
                <View key={row.id} style={t.tr}>
                  <Td width={70}><MiniInput value={row.roomNr} onChange={(v) => updateData({ newspapers: data.newspapers.map((r) => r.id === row.id ? { ...r, roomNr: v } : r) })} /></Td>
                  <Td width={110}><MiniInput value={row.newspaper} onChange={(v) => updateData({ newspapers: data.newspapers.map((r) => r.id === row.id ? { ...r, newspaper: v } : r) })} /></Td>
                  <Td width={160}><MiniInput value={row.dateRange} onChange={(v) => updateData({ newspapers: data.newspapers.map((r) => r.id === row.id ? { ...r, dateRange: v } : r) })} /></Td>
                  <Td width={200}><MiniInput value={row.remarks} onChange={(v) => updateData({ newspapers: data.newspapers.map((r) => r.id === row.id ? { ...r, remarks: v } : r) })} /></Td>
                  <Td width={28}>
                    <TouchableOpacity onPress={() => updateData({ newspapers: data.newspapers.filter((r) => r.id !== row.id) })}>
                      <Text style={t.removeBtn}>×</Text>
                    </TouchableOpacity>
                  </Td>
                </View>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={() => updateData({ newspapers: [...data.newspapers, emptyNewspaper()] })} style={t.addRowBtn}>
            <Text style={t.addRowText}>+ Zeile hinzufügen</Text>
          </TouchableOpacity>
        </View>

        {/* Neue Gäste */}
        <SectionHeader>Neue Gäste</SectionHeader>
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={t.tr}>
                {['#', 'Kat', 'Name', 'E', 'K', 'Gruppe', 'Arr', 'Anr', 'Abr', 'Preis', 'Ti-#', 'Booking', 'Ort/KFZ', 'Notizen', ''].map((h, i) => (
                  <Th key={i} width={i === 2 ? 110 : i === 12 ? 80 : i === 13 ? 110 : i === 14 ? 28 : 56}>{h}</Th>
                ))}
              </View>
              {data.newGuests.map((row) => {
                const setNG = (u: Partial<NewGuestRow>) => {
                  const updated = { ...row, ...u };
                  if (u.roomNr !== undefined) updated.category = getRoomCategory(u.roomNr);
                  updateData({ newGuests: data.newGuests.map((r) => r.id === row.id ? updated : r) });
                };
                return (
                  <View key={row.id} style={t.tr}>
                    <Td width={56}><MiniInput value={row.roomNr} onChange={(v) => setNG({ roomNr: v })} /></Td>
                    <Td width={56}><Text style={t.catText}>{row.category}</Text></Td>
                    <Td width={110}><MiniInput value={row.name} onChange={(v) => setNG({ name: v })} /></Td>
                    <Td width={56}><MiniInput value={row.adults ? String(row.adults) : ''} onChange={(v) => setNG({ adults: parseInt(v) || 0 })} center /></Td>
                    <Td width={56}><MiniInput value={row.children ? String(row.children) : ''} onChange={(v) => setNG({ children: parseInt(v) || 0 })} center /></Td>
                    <Td width={56}><MiniInput value={row.group} onChange={(v) => setNG({ group: v })} /></Td>
                    <Td width={56}><MiniInput value={row.arr} onChange={(v) => setNG({ arr: v })} /></Td>
                    <Td width={56}><MiniInput value={row.arrDate} onChange={(v) => setNG({ arrDate: v })} placeholder="dd.MM" /></Td>
                    <Td width={56}><MiniInput value={row.depDate} onChange={(v) => setNG({ depDate: v })} placeholder="dd.MM" /></Td>
                    <Td width={56}><MiniInput value={row.price} onChange={(v) => setNG({ price: v })} /></Td>
                    <Td width={56}><MiniInput value={row.tableNr} onChange={(v) => setNG({ tableNr: v })} /></Td>
                    <Td width={56}><MiniInput value={row.booking} onChange={(v) => setNG({ booking: v })} /><MiniInput value={row.fsAe} onChange={(v) => setNG({ fsAe: v })} /></Td>
                    <Td width={80}><MiniInput value={row.ortKfz} onChange={(v) => setNG({ ortKfz: v })} /></Td>
                    <Td width={110}><MiniInput value={row.notes} onChange={(v) => setNG({ notes: v })} /></Td>
                    <Td width={28}>
                      <TouchableOpacity onPress={() => updateData({ newGuests: data.newGuests.filter((r) => r.id !== row.id) })}>
                        <Text style={t.removeBtn}>×</Text>
                      </TouchableOpacity>
                    </Td>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={() => updateData({ newGuests: [...data.newGuests, emptyNewGuest()] })} style={t.addRowBtn}>
            <Text style={t.addRowText}>+ Zeile hinzufügen</Text>
          </TouchableOpacity>
        </View>

        {/* Freie Zimmer */}
        <SectionHeader>Freie Zimmer</SectionHeader>
        <View style={{ paddingHorizontal: 4, paddingBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={t.tr}>
                <Th width={80}>Zimmer-Nr.</Th>
                <Th width={60}>Kat</Th>
                <Th width={200}>out of order</Th>
                <Th width={28}></Th>
              </View>
              {data.freeRooms.map((row) => (
                <View key={row.id} style={t.tr}>
                  <Td width={80}>
                    <MiniInput value={row.roomNr} onChange={(v) => {
                      updateData({ freeRooms: data.freeRooms.map((r) => r.id === row.id ? { ...r, roomNr: v, category: getRoomCategory(v) } : r) });
                    }} />
                  </Td>
                  <Td width={60}><Text style={t.catText}>{row.category}</Text></Td>
                  <Td width={200}><MiniInput value={row.outOfOrder} onChange={(v) => updateData({ freeRooms: data.freeRooms.map((r) => r.id === row.id ? { ...r, outOfOrder: v } : r) })} /></Td>
                  <Td width={28}>
                    <TouchableOpacity onPress={() => updateData({ freeRooms: data.freeRooms.filter((r) => r.id !== row.id) })}>
                      <Text style={t.removeBtn}>×</Text>
                    </TouchableOpacity>
                  </Td>
                </View>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={() => updateData({ freeRooms: [...data.freeRooms, emptyFreeRoom()] })} style={t.addRowBtn}>
            <Text style={t.addRowText}>+ Zeile hinzufügen</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Table styles ─────────────────────────────────────────────────────────

const t = StyleSheet.create({
  sectionHeader: {
    backgroundColor: colors.belSection,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionHeaderText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark700,
  },
  tr: {
    flexDirection: 'row',
  },
  th: {
    backgroundColor: colors.belHeader,
    borderWidth: 0.5,
    borderColor: colors.belBorder,
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark600,
  },
  td: {
    borderWidth: 0.5,
    borderColor: colors.belSoftBorder,
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
    minHeight: 26,
  },
  catText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.dark400,
  },
  removeBtn: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  addRowBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  addRowText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.brand500,
  },
});

// ── Screen styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    width: 150,
  },
  btnPrimary: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnPrimaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#fff',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.dark300,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnSecondaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
  },
  sheet: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.belBorder,
    backgroundColor: colors.white,
  },
  sheetContent: {
    paddingBottom: 40,
  },
  headerSection: {
    backgroundColor: colors.dark50,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark600,
    minWidth: 52,
  },
  statCell: {
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.belSoftBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 90,
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark500,
    marginBottom: 3,
    textAlign: 'center',
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  weeklyLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.dark600,
    marginRight: 12,
    width: 80,
  },
  weeklyGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  weeklyCell: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.belSoftBorder,
  },
  weekdayAbbr: {
    fontFamily: fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.dark500,
    marginBottom: 2,
  },
  opsSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.belSoftBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  opsTitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    color: colors.dark700,
    marginBottom: 4,
  },
  opsExternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
    marginBottom: 4,
  },
  opsExternLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.dark600,
    minWidth: 64,
  },
  dietLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark600,
    marginBottom: 3,
  },
});
