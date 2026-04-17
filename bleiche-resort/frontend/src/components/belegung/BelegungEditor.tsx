import { useState } from 'react';
import { Save, FileDown, Printer, Plus, X } from 'lucide-react';
import { useBelegungStore, createGuestRow, createOpsEntry } from '../../store/belegungStore';
import { formatDateGerman, formatDateShort, formatFullDate, formatWeekday, todayISO } from '../../utils/helpers';
import { getRoomCategory } from '../../data/roomData';
import { exportBelegung } from '../../utils/excelExport';
import { generateId } from '../../utils/helpers';
import type { GuestRow, OpsEntry, DailyData, NewspaperRow, NewGuestRow, FreeRoomRow } from '../../types/belegung';

// ─── Helper: create empty bottom-section rows ────────────────────────────────
function createNewspaperRow(): NewspaperRow {
  return { id: generateId(), roomNr: '', newspaper: '', dateRange: '', remarks: '' };
}
function createNewGuestRow(): NewGuestRow {
  return {
    id: generateId(), roomNr: '', category: '', name: '', adults: 0, children: 0,
    group: '', arr: '', arrDate: '', depDate: '', price: '', tableNr: '', booking: '',
    fsAe: '', ortKfz: '', notes: '',
  };
}
function createFreeRoomRow(): FreeRoomRow {
  return { id: generateId(), roomNr: '', category: '', outOfOrder: '' };
}

// ─── Sub-component: Section Header (grey bar) ────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="bel-section mt-4 mb-1">{children}</div>;
}

// ─── Sub-component: Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    Anr: 'bg-green-100 text-green-700',
    Abr: 'bg-red-100 text-red-700',
    Bl: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-block px-1 py-0 text-[9px] font-bold rounded ${colors[status] ?? 'bg-dark-100 text-dark-500'}`}>
      {status}
    </span>
  );
}

// ─── Sub-component: Guest Table (Arrivals / Stayers) ─────────────────────────
interface GuestTableProps {
  rows: GuestRow[];
  staff: { id: string; name: string }[];
  onUpdate: (id: string, updates: Partial<GuestRow>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

const ARR_OPTIONS = ['Rack25', 'Rack26', 'Rack26N', 'booking', 'FLAU26N', 'RackFR26N', 'KE26N', 'BFG26.1 4=3'];

function GuestTable({ rows, staff, onUpdate, onRemove, onAdd }: GuestTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="bel-header whitespace-nowrap">#</th>
            <th className="bel-header whitespace-nowrap">Kat</th>
            <th className="bel-header whitespace-nowrap">Name</th>
            <th className="bel-header whitespace-nowrap">E</th>
            <th className="bel-header whitespace-nowrap">K</th>
            <th className="bel-header whitespace-nowrap">Gruppe</th>
            <th className="bel-header whitespace-nowrap">Arr</th>
            <th className="bel-header whitespace-nowrap">Anr</th>
            <th className="bel-header whitespace-nowrap">Abr</th>
            <th className="bel-header whitespace-nowrap">Preis</th>
            <th className="bel-header whitespace-nowrap">HP</th>
            <th className="bel-header whitespace-nowrap border-l-2 border-r-2 border-[#000]">Booking</th>
            <th className="bel-header whitespace-nowrap">Ort/KFZ</th>
            <th className="bel-header whitespace-nowrap">Notizen/Besuche</th>
            <th className="bel-header whitespace-nowrap"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td className="bel-cell"><input className="input-mini w-12" value={row.roomNr} onChange={e => onUpdate(row.id, { roomNr: e.target.value })} /></td>
              <td className="bel-cell text-[10px] text-dark-400 whitespace-nowrap">{row.category}</td>
              <td className="bel-cell"><input className="input-mini w-32" value={row.name} onChange={e => onUpdate(row.id, { name: e.target.value })} /></td>
              <td className="bel-cell"><input type="number" className="input-mini w-8 text-center" value={row.adults || ''} onChange={e => onUpdate(row.id, { adults: parseInt(e.target.value) || 0 })} /></td>
              <td className="bel-cell"><input type="number" className="input-mini w-8 text-center" value={row.children || ''} onChange={e => onUpdate(row.id, { children: parseInt(e.target.value) || 0 })} /></td>
              <td className="bel-cell"><input className="input-mini w-16" value={row.group} onChange={e => onUpdate(row.id, { group: e.target.value })} /></td>
              <td className="bel-cell">
                <select className="input-mini w-24" value={ARR_OPTIONS.includes(row.arr) || row.arr === '' ? row.arr : '__custom__'} onChange={e => {
                  if (e.target.value === '__custom__') onUpdate(row.id, { arr: '' });
                  else onUpdate(row.id, { arr: e.target.value });
                }}>
                  <option value="">—</option>
                  {ARR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  <option value="__custom__">Eigene...</option>
                </select>
                {!ARR_OPTIONS.includes(row.arr) && row.arr !== '' && (
                  <input className="input-mini w-24 mt-0.5" value={row.arr} onChange={e => onUpdate(row.id, { arr: e.target.value })} placeholder="Eingabe" />
                )}
              </td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.arrDate} onChange={e => onUpdate(row.id, { arrDate: e.target.value })} placeholder="dd.MM" /></td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.depDate} onChange={e => onUpdate(row.id, { depDate: e.target.value })} placeholder="dd.MM" /></td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.price} onChange={e => onUpdate(row.id, { price: e.target.value })} /></td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.hp} onChange={e => onUpdate(row.id, { hp: e.target.value })} /></td>
              <td className="bel-cell border-l-2 border-r-2 border-[#000]">
                <input className="input-mini w-16" value={row.booking} onChange={e => onUpdate(row.id, { booking: e.target.value })} placeholder="Booking" />
                <input className="input-mini w-16 mt-0.5" value={row.hns} onChange={e => onUpdate(row.id, { hns: e.target.value })} placeholder="HNS" />
                <div className="flex gap-0.5 mt-0.5">
                  <input className="input-mini w-[30px] text-center" value={row.fs} onChange={e => onUpdate(row.id, { fs: e.target.value })} placeholder="€50" />
                  <span className="text-[9px] text-dark-400 self-center">FS</span>
                  <input className="input-mini w-[30px] text-center" value={row.ae} onChange={e => onUpdate(row.id, { ae: e.target.value })} placeholder="€130" />
                  <span className="text-[9px] text-dark-400 self-center">AE</span>
                </div>
              </td>
              <td className="bel-cell">
                <input className="input-mini w-20" value={row.ort} onChange={e => onUpdate(row.id, { ort: e.target.value })} placeholder="Ort" />
                <input className="input-mini w-20 mt-0.5" value={row.kfz} onChange={e => onUpdate(row.id, { kfz: e.target.value })} placeholder="KFZ" />
              </td>
              <td className="bel-cell"><input className="input-mini w-32" value={row.notes} onChange={e => onUpdate(row.id, { notes: e.target.value })} /></td>
              <td className="bel-cell">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-0.5">
                    <input type="number" min="0" className="input-mini w-8 text-center" value={row.visitCount} onChange={e => onUpdate(row.id, { visitCount: e.target.value })} placeholder="#" />
                    <span className="text-[9px] text-dark-400">x</span>
                  </div>
                  <input className="input-mini w-12 text-center" value={row.lastVisit} onChange={e => onUpdate(row.id, { lastVisit: e.target.value })} placeholder="MM/YY" />
                </div>
                <button onClick={() => onRemove(row.id)} className="text-red-400 hover:text-red-600 mt-0.5 block mx-auto"><X size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onAdd} className="btn-ghost text-[11px] mt-1"><Plus size={12} /> Zeile hinzufügen</button>
    </div>
  );
}

// ─── Sub-component: Ops Section ──────────────────────────────────────────────
interface OpsSectionProps {
  sectionKey: keyof DailyData;
  entries: OpsEntry[];
}

function OpsSection({ sectionKey, entries }: OpsSectionProps) {
  const { addOpsEntry, updateOpsEntry, removeOpsEntry } = useBelegungStore();
  return (
    <div className="ml-2 mb-1">
      {entries.length > 0 && (
        <table className="w-full border-collapse text-[11px] mb-1">
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id}>
                <td className="bel-cell w-6 text-center text-[10px] text-dark-400">{idx + 1}</td>
                <td className="bel-cell w-14">
                  <input className="input-mini w-full" placeholder="#" value={entry.roomNr}
                    onChange={e => updateOpsEntry(sectionKey, entry.id, { roomNr: e.target.value })} />
                </td>
                <td className="bel-cell w-32">
                  <input className="input-mini w-full" placeholder="Name" value={entry.name}
                    onChange={e => updateOpsEntry(sectionKey, entry.id, { name: e.target.value })} />
                </td>
                <td className="bel-cell w-10 text-center"><StatusBadge status={entry.status} /></td>
                <td className="bel-cell">
                  <input className="input-mini w-full" placeholder="Info" value={entry.info}
                    onChange={e => updateOpsEntry(sectionKey, entry.id, { info: e.target.value })} />
                </td>
                <td className="bel-cell w-6 text-center">
                  <button onClick={() => removeOpsEntry(sectionKey, entry.id)} className="text-red-400 hover:text-red-600"><X size={11} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={() => addOpsEntry(sectionKey)} className="btn-ghost text-[10px]"><Plus size={10} /> Eintrag</button>
    </div>
  );
}

// ─── Sub-component: New Guest Table ──────────────────────────────────────────
const NEW_GUEST_HEADERS = ['#', 'Kat', 'Name', 'E', 'K', 'Gruppe', 'Arr', 'Anr', 'Abr', 'Preis', 'Ti-#', 'Booking', 'Ort/KFZ', 'Notizen/Besuche', ''];

interface NewGuestTableProps {
  rows: NewGuestRow[];
  staff: { id: string; name: string }[];
  onChange: (rows: NewGuestRow[]) => void;
}

function NewGuestTable({ rows, staff, onChange }: NewGuestTableProps) {
  const update = (id: string, field: keyof NewGuestRow, value: string | number) => {
    onChange(rows.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'roomNr') updated.category = getRoomCategory(value as string);
      return updated;
    }));
  };
  const remove = (id: string) => onChange(rows.filter(r => r.id !== id));
  const add = () => onChange([...rows, createNewGuestRow()]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>{NEW_GUEST_HEADERS.map((h, i) => <th key={i} className="bel-header whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td className="bel-cell"><input className="input-mini w-12" value={row.roomNr} onChange={e => update(row.id, 'roomNr', e.target.value)} /></td>
              <td className="bel-cell text-[10px] text-dark-400">{row.category}</td>
              <td className="bel-cell"><input className="input-mini w-32" value={row.name} onChange={e => update(row.id, 'name', e.target.value)} /></td>
              <td className="bel-cell"><input type="number" className="input-mini w-8 text-center" value={row.adults || ''} onChange={e => update(row.id, 'adults', parseInt(e.target.value) || 0)} /></td>
              <td className="bel-cell"><input type="number" className="input-mini w-8 text-center" value={row.children || ''} onChange={e => update(row.id, 'children', parseInt(e.target.value) || 0)} /></td>
              <td className="bel-cell"><input className="input-mini w-16" value={row.group} onChange={e => update(row.id, 'group', e.target.value)} /></td>
              <td className="bel-cell">
                <select className="input-mini w-20" value={row.arr} onChange={e => update(row.id, 'arr', e.target.value)}>
                  <option value="">—</option>
                  {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.arrDate} onChange={e => update(row.id, 'arrDate', e.target.value)} placeholder="dd.MM" /></td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.depDate} onChange={e => update(row.id, 'depDate', e.target.value)} placeholder="dd.MM" /></td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.price} onChange={e => update(row.id, 'price', e.target.value)} /></td>
              <td className="bel-cell"><input className="input-mini w-14" value={row.tableNr} onChange={e => update(row.id, 'tableNr', e.target.value)} /></td>
              <td className="bel-cell">
                <input className="input-mini w-16" value={row.booking} onChange={e => update(row.id, 'booking', e.target.value)} placeholder="Booking" />
                <input className="input-mini w-16 mt-0.5" value={row.fsAe} onChange={e => update(row.id, 'fsAe', e.target.value)} placeholder="FS AE" />
              </td>
              <td className="bel-cell"><input className="input-mini w-20" value={row.ortKfz} onChange={e => update(row.id, 'ortKfz', e.target.value)} /></td>
              <td className="bel-cell"><input className="input-mini w-32" value={row.notes} onChange={e => update(row.id, 'notes', e.target.value)} /></td>
              <td className="bel-cell text-center"><button onClick={() => remove(row.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={add} className="btn-ghost text-[11px] mt-1"><Plus size={12} /> Zeile hinzufügen</button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function BelegungEditor() {
  const {
    currentDate, data, staff,
    setCurrentDate, saveDay, updateData,
    addArrival, updateArrival, removeArrival,
    addStayer, updateStayer, removeStayer,
    addOpsEntry, updateOpsEntry, removeOpsEntry,
    addToast,
  } = useBelegungStore();

  // ── Toolbar handlers ───────────────────────────────────────────────────────
  const handleSave = () => {
    saveDay();
    addToast({ type: 'success', title: 'Gespeichert', message: 'Belegungsliste wurde gespeichert.' });
  };

  const handleExport = async () => {
    try {
      await exportBelegung(data);
      addToast({ type: 'success', title: 'Excel exportiert' });
    } catch (e) {
      addToast({ type: 'error', title: 'Export fehlgeschlagen', message: String(e) });
    }
  };

  const handlePrint = () => window.print();

  // ── Shorthand updaters for header / stats / weekly ─────────────────────────
  const setHeader = (field: string, value: string) =>
    updateData({ header: { ...data.header, [field]: value } });

  const setStat = (field: string, value: string) =>
    updateData({ stats: { ...data.stats, [field]: value } });

  const setWeekly = (field: string, value: string) =>
    updateData({ weeklyOccupancy: { ...data.weeklyOccupancy, [field]: value } });

  // ── Bottom-section updaters ────────────────────────────────────────────────
  const setNewspapers = (rows: NewspaperRow[]) => updateData({ newspapers: rows });
  const setNewGuests = (rows: NewGuestRow[]) => updateData({ newGuests: rows });
  const setFreeRooms = (rows: FreeRoomRow[]) => updateData({ freeRooms: rows });

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          className="input w-44"
          value={currentDate}
          onChange={e => setCurrentDate(e.target.value)}
        />
        <button className="btn-primary" onClick={handleSave}><Save size={14} /> Speichern</button>
        <button className="btn-secondary" onClick={handleExport}><FileDown size={14} /> Als Excel exportieren</button>
        <button className="btn-secondary" onClick={handlePrint}><Printer size={14} /> Drucken</button>
      </div>

      {/* ── Sheet ───────────────────────────────────────────────────────────── */}
      <div className="print-area card p-4 text-[11px] space-y-0 overflow-x-auto border border-[#c0c0c0]">

        {/* A. Header Section ──────────────────────────────────────────────── */}
        <div className="border-b border-[#c0c0c0] bg-[#f5f5f5] p-2">
          <div className="grid grid-cols-4 gap-x-4 gap-y-1">
            {/* Col 1 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="font-bold whitespace-nowrap">Stand:</span>
                <input type="date" className="input-mini flex-1" value={data.header.standDate} onChange={e => setHeader('standDate', e.target.value)} />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold whitespace-nowrap">Uhrzeit:</span>
                <input type="time" className="input-mini flex-1" value={data.header.standTime} onChange={e => setHeader('standTime', e.target.value)} />
              </div>
            </div>
            {/* Col 2 — spacer */}
            <div />
            {/* Col 3 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="font-bold">TK:</span>
                <input className="input-mini flex-1" value={data.header.tkName} onChange={e => setHeader('tkName', e.target.value)} placeholder="Name" />
                <input className="input-mini w-20" value={data.header.tkTimeRange} onChange={e => setHeader('tkTimeRange', e.target.value)} placeholder="Zeit" />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">HSK:</span>
                <input className="input-mini flex-1" value={data.header.hskName} onChange={e => setHeader('hskName', e.target.value)} placeholder="Name" />
                <input className="input-mini w-20" value={data.header.hskTimeRange} onChange={e => setHeader('hskTimeRange', e.target.value)} placeholder="Zeit" />
              </div>
            </div>
            {/* Col 4 */}
            <div className="space-y-1">
              <span className="font-bold">Chef der Nacht</span>
              <div className="flex items-center gap-1">
                <input className="input-mini flex-1" value={data.header.chefDerNacht} onChange={e => setHeader('chefDerNacht', e.target.value)} placeholder="Name" />
                <input className="input-mini w-20" value={data.header.chefTimeRange} onChange={e => setHeader('chefTimeRange', e.target.value)} placeholder="Zeit" />
              </div>
            </div>
          </div>
        </div>

        {/* B. Day Title ───────────────────────────────────────────────────── */}
        <div className="bel-section text-center text-sm tracking-wider">
          Tagesinformation f&uuml;r {formatWeekday(currentDate)}, {formatDateShort(currentDate)}
        </div>

        {/* C. Stats Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 border-b border-[#c0c0c0]">
          {([
            ['Anr. Zi/Per', 'anrZi', 'anrPer'],
            ['Abr. Zi/Per', 'abrZi', 'abrPer'],
            ['Bleiber Zi/Per', 'bleiberZi', 'bleiberPer'],
            ['ÜN Zi/Per', 'uenZi', 'uenPer'],
          ] as const).map(([label, f1, f2]) => (
            <div key={label} className="flex flex-col items-center border-r border-[#d4d4d4] py-1.5">
              <span className="font-bold text-[10px] text-dark-500">{label}</span>
              <div className="flex gap-0.5 mt-0.5">
                <input className="input-mini w-10 text-center" value={(data.stats as any)[f1]} onChange={e => setStat(f1, e.target.value)} />
                <input className="input-mini w-10 text-center" value={(data.stats as any)[f2]} onChange={e => setStat(f2, e.target.value)} />
              </div>
            </div>
          ))}
          {([
            ['Frühanreisen', 'fruehAnreisen'],
            ['Spätabreisen', 'spaetAbreisen'],
            ['Spätanreisen', 'spaetAnreisen'],
          ] as const).map(([label, field]) => (
            <div key={label} className="flex flex-col items-center border-r border-[#d4d4d4] py-1.5 last:border-r-0">
              <span className="font-bold text-[10px] text-dark-500">{label}</span>
              <input className="input-mini w-10 text-center mt-0.5" value={(data.stats as any)[field]} onChange={e => setStat(field, e.target.value)} />
            </div>
          ))}
        </div>

        {/* D. Weekly Occupancy Row ────────────────────────────────────────── */}
        <div className="grid grid-cols-[auto_1fr] items-center border-b border-[#c0c0c0] py-1.5 px-2">
          <div className="font-bold italic text-[10px] leading-tight border-r border-[#d4d4d4] pr-3 mr-1" style={{ fontSize: '10px' }}>
            Wöchentliche<br />Belegung-Gäste
          </div>
          <div className="flex flex-1">
            {(['mo', 'di', 'mi', 'do_', 'fr', 'sa', 'so'] as const).map(day => (
              <div key={day} className="flex-1 flex flex-col items-center border-r border-[#d4d4d4]">
                <span className="italic text-[9px] font-bold text-dark-500">{day === 'do_' ? 'Do' : day.charAt(0).toUpperCase() + day.slice(1)}</span>
                <input
                  className="input-mini w-10 text-center"
                  value={data.weeklyOccupancy[day]}
                  onChange={e => setWeekly(day, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* E. Arrivals Header ─────────────────────────────────────────────── */}
        <div className="mt-2">
          <SectionHeader>Anreisen ({data.arrivals.length} Zimmer)</SectionHeader>
        </div>

        {/* F. Arrivals Guest Table ────────────────────────────────────────── */}
        <div className="px-1 pb-2">
          <GuestTable
            rows={data.arrivals}
            staff={staff}
            onUpdate={updateArrival}
            onRemove={removeArrival}
            onAdd={addArrival}
          />
        </div>

        {/* G. Stayers Header ──────────────────────────────────────────────── */}
        <SectionHeader>Bleiber ({data.stayers.length} Zimmer)</SectionHeader>

        {/* H. Stayers Guest Table ─────────────────────────────────────────── */}
        <div className="px-1 pb-2">
          <GuestTable
            rows={data.stayers}
            staff={staff}
            onUpdate={updateStayer}
            onRemove={removeStayer}
            onAdd={addStayer}
          />
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* I. Operations Sections                                            */}
        {/* ────────────────────────────────────────────────────────────────── */}

        {/* Frühschicht */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Frühschicht:</div>
          <div className="flex items-center gap-1 ml-2 mb-1">
            <span className="font-bold italic text-[10px]">extern</span>
            <input className="input-mini flex-1" value={data.fruehExtern} onChange={e => updateData({ fruehExtern: e.target.value })} />
          </div>
          <OpsSection sectionKey="fruehOps" entries={data.fruehOps} />
        </div>

        {/* Spätschicht */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Spätschicht:</div>
          <div className="flex items-center gap-1 ml-2 mb-1">
            <span className="font-bold italic text-[10px]">AE extern:</span>
            <input className="input-mini flex-1" value={data.spaetAeExtern} onChange={e => updateData({ spaetAeExtern: e.target.value })} />
          </div>
          <OpsSection sectionKey="spaetOps" entries={data.spaetOps} />
        </div>

        {/* Küche */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Küche:</div>
          <div className="flex items-center gap-1 ml-2 mb-1">
            <span className="font-bold italic text-[10px]">FS extern:</span>
            <input className="input-mini flex-1" value={data.kuecheFsExtern} onChange={e => updateData({ kuecheFsExtern: e.target.value })} />
          </div>
          <div className="flex items-center gap-1 ml-2 mb-1">
            <span className="font-bold italic text-[10px]">AE extern:</span>
            <input className="input-mini flex-1" value={data.kuecheAeExtern} onChange={e => updateData({ kuecheAeExtern: e.target.value })} />
          </div>
          {/* Dietary categories — 5 columns like Excel */}
          <div className="grid grid-cols-5 ml-2 mb-1">
            <div className="font-bold text-[10px] pr-1">Laktose:</div>
            <div className="font-bold text-[10px] pr-1">Gluten:</div>
            <div className="font-bold text-[10px] pr-1">Allergien:</div>
            <div className="font-bold text-[10px] pr-1">Unverträglichkeiten:</div>
            <div className="font-bold text-[10px]">Sonstiges:</div>
          </div>
          <div className="grid grid-cols-5 ml-2 mb-1">
            {(['kuecheLaktose', 'kuecheGluten', 'kuecheAllergien', 'kuecheUnvertraeglichkeiten', 'kuecheSonstiges'] as const).map(key => (
              <div key={key} className="pr-1">
                {(data[key] as OpsEntry[]).map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-0.5 mb-0.5">
                    <input className="input-mini flex-1 border-0 border-b border-[#d4d4d4]" placeholder={`# Name Info`} value={`${entry.roomNr} ${entry.name} ${entry.info}`.trim()}
                      onChange={e => {
                        const parts = e.target.value.split(' ');
                        updateOpsEntry(key, entry.id, { roomNr: parts[0] || '', name: parts[1] || '', info: parts.slice(2).join(' ') });
                      }} />
                    <button onClick={() => removeOpsEntry(key, entry.id)} className="text-red-400 hover:text-red-600 shrink-0"><X size={10} /></button>
                  </div>
                ))}
                <button onClick={() => addOpsEntry(key)} className="text-[9px] text-dark-400 hover:text-brand-400"><Plus size={9} className="inline" /> Zeile</button>
              </div>
            ))}
          </div>
          <OpsSection sectionKey="kuecheOps" entries={data.kuecheOps} />
        </div>

        {/* Veranstaltungen/Bankett */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Veranstaltungen/Bankett:</div>
          <div className="ml-2">
            <input className="input-mini w-full" value={data.veranstaltungenBankett} onChange={e => updateData({ veranstaltungenBankett: e.target.value })} />
          </div>
        </div>

        {/* Tischwünsche */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Tischwünsche:</div>
          <div className="flex items-center gap-1 ml-2 mb-1">
            <span className="font-bold italic text-[10px]">AE extern:</span>
            <input className="input-mini flex-1" value={data.tischwuenscheAeExtern} onChange={e => updateData({ tischwuenscheAeExtern: e.target.value })} />
          </div>
          <OpsSection sectionKey="tischwuenscheOps" entries={data.tischwuenscheOps} />
        </div>

        {/* Englische Menükarten */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Englische Menükarten:</div>
          <div className="ml-2">
            <input className="input-mini w-full" value={data.englischeMenuekarten} onChange={e => updateData({ englischeMenuekarten: e.target.value })} />
          </div>
        </div>

        {/* Geburtstag / besondere Anlässe */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Geburtstag/besondere Anlässe:</div>
          <OpsSection sectionKey="geburtstage" entries={data.geburtstage} />
        </div>

        {/* Housekeeping */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Housekeeping:</div>
          <p className="font-bold italic text-[10px] ml-2 mb-1">Liebe Hausdamen, bei Abreisezimmern immer auf WLAN-Cubes achten und an die Rezi bringen! Danke!</p>
          <OpsSection sectionKey="housekeeping" entries={data.housekeeping} />
        </div>

        {/* Empfang/Chauffeure */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Empfang/Chauffeure:</div>
          <OpsSection sectionKey="empfangChauffeure" entries={data.empfangChauffeure} />
          <div className="flex items-center gap-1 ml-2 mb-1">
            <span className="font-bold italic text-[10px]">LT extern:</span>
            <input className="input-mini flex-1" value={data.ltExtern} onChange={e => updateData({ ltExtern: e.target.value })} />
          </div>
        </div>

        {/* E-Auto */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">E-Auto:</div>
          <div className="ml-2">
            <input className="input-mini w-full" value={data.eAuto} onChange={e => updateData({ eAuto: e.target.value })} />
          </div>
        </div>

        {/* Landtherme */}
        <div className="border-b border-[#d4d4d4] py-2 px-2">
          <div className="font-bold italic underline text-xs mb-1">Landtherme:</div>
          <OpsSection sectionKey="landtherme" entries={data.landtherme} />
          <div className="flex items-center gap-1 ml-2 mb-1">
            <span className="font-bold italic text-[10px]">LT EXTERN:</span>
            <input className="input-mini flex-1" value={data.landthermeLtExtern} onChange={e => updateData({ landthermeLtExtern: e.target.value })} />
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* J. Bottom Sections                                                */}
        {/* ────────────────────────────────────────────────────────────────── */}

        {/* Newspaper Section */}
        <div className="mt-2">
          <SectionHeader>Zeitungen</SectionHeader>
        </div>
        <div className="overflow-x-auto px-1 pb-2">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                {['Zimmer-Nr.', 'Zeitung', 'WANN? von --- bis ---', 'Bemerkungen', ''].map((h, i) => (
                  <th key={i} className="bel-header whitespace-nowrap text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.newspapers.map(row => (
                <tr key={row.id}>
                  <td className="bel-cell"><input className="input-mini w-14" value={row.roomNr} onChange={e => setNewspapers(data.newspapers.map(r => r.id === row.id ? { ...r, roomNr: e.target.value } : r))} /></td>
                  <td className="bel-cell"><input className="input-mini w-28" value={row.newspaper} onChange={e => setNewspapers(data.newspapers.map(r => r.id === row.id ? { ...r, newspaper: e.target.value } : r))} /></td>
                  <td className="bel-cell"><input className="input-mini w-40" value={row.dateRange} onChange={e => setNewspapers(data.newspapers.map(r => r.id === row.id ? { ...r, dateRange: e.target.value } : r))} /></td>
                  <td className="bel-cell"><input className="input-mini flex-1 w-full" value={row.remarks} onChange={e => setNewspapers(data.newspapers.map(r => r.id === row.id ? { ...r, remarks: e.target.value } : r))} /></td>
                  <td className="bel-cell text-center">
                    <button onClick={() => setNewspapers(data.newspapers.filter(r => r.id !== row.id))} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setNewspapers([...data.newspapers, createNewspaperRow()])} className="btn-ghost text-[11px] mt-1"><Plus size={12} /> Zeile hinzufügen</button>
        </div>

        {/* Neue Gäste */}
        <SectionHeader>Neue Gäste</SectionHeader>
        <div className="px-1 pb-2">
          <NewGuestTable rows={data.newGuests} staff={staff} onChange={setNewGuests} />
        </div>

        {/* Freie Zimmer */}
        <SectionHeader>Freie Zimmer</SectionHeader>
        <div className="overflow-x-auto px-1 pb-2">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="bel-header whitespace-nowrap">Zimmer-Nr.</th>
                <th className="bel-header whitespace-nowrap">Kat</th>
                <th className="bel-header whitespace-nowrap" style={{ borderRight: 'none' }}></th>
                <th className="bel-header whitespace-nowrap border-l-2 border-l-[#000]" colSpan={2}>out of order</th>
              </tr>
            </thead>
            <tbody>
              {data.freeRooms.map(row => (
                <tr key={row.id}>
                  <td className="bel-cell">
                    <input className="input-mini w-14" value={row.roomNr} onChange={e => {
                      const roomNr = e.target.value;
                      setFreeRooms(data.freeRooms.map(r => r.id === row.id ? { ...r, roomNr, category: getRoomCategory(roomNr) } : r));
                    }} />
                  </td>
                  <td className="bel-cell text-[10px] text-dark-400">{row.category}</td>
                  <td className="bel-cell" style={{ borderRight: 'none' }}></td>
                  <td className="bel-cell border-l-2 border-l-[#000]"><input className="input-mini w-full" value={row.outOfOrder} onChange={e => setFreeRooms(data.freeRooms.map(r => r.id === row.id ? { ...r, outOfOrder: e.target.value } : r))} /></td>
                  <td className="bel-cell text-center">
                    <button onClick={() => setFreeRooms(data.freeRooms.filter(r => r.id !== row.id))} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setFreeRooms([...data.freeRooms, createFreeRoomRow()])} className="btn-ghost text-[11px] mt-1"><Plus size={12} /> Zeile hinzufügen</button>
        </div>

      </div>{/* end .print-area */}
    </div>
  );
}
