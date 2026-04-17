import { create } from 'zustand';
import type { DailyData, GuestRow, OpsEntry, StaffMember, GuestStatus } from '../types/belegung';
import { loadDailyData, saveDailyData, loadAllDays, loadStaff, saveStaff, deleteDailyData } from '../utils/belegungStorage';
import { getRoomCategory } from '../data/roomData';
import { generateId, todayISO } from '../utils/helpers';

interface Toast { id: string; type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; }

function emptyHeader() {
  return { standDate: todayISO(), standTime: '', tkName: '', tkTimeRange: '', hskName: '', hskTimeRange: '', chefDerNacht: '', chefTimeRange: '' };
}
function emptyStats() {
  return { anrZi: '', anrPer: '', abrZi: '', abrPer: '', bleiberZi: '', bleiberPer: '', uenZi: '', uenPer: '', fruehAnreisen: '', spaetAbreisen: '', spaetAnreisen: '' };
}
function emptyWeekly() {
  return { mo: '', di: '', mi: '', do_: '', fr: '', sa: '', so: '' };
}

export function createEmptyDay(date: string): DailyData {
  const now = new Date().toISOString();
  return {
    id: generateId(), date, header: emptyHeader(), stats: emptyStats(), weeklyOccupancy: emptyWeekly(),
    arrivals: [], stayers: [],
    infoSection: '', fruehschicht: '', fruehExtern: '', fruehOps: [],
    spaetschicht: '', spaetAeExtern: '', spaetOps: [],
    kueche: '', kuecheFsExtern: '', kuecheAeExtern: '',
    kuecheLaktose: [], kuecheGluten: [], kuecheAllergien: [], kuecheUnvertraeglichkeiten: [], kuecheSonstiges: [],
    kuecheOps: [],
    veranstaltungenBankett: '',
    tischwuensche: '', tischwuenscheAeExtern: '', tischwuenscheOps: [],
    englischeMenuekarten: '', geburtstage: [], housekeeping: [], empfangChauffeure: [],
    ltExtern: '', eAuto: '', landtherme: [], landthermeLtExtern: '',
    newspapers: [], newGuests: [], freeRooms: [],
    createdAt: now, updatedAt: now,
  };
}

export function createGuestRow(roomNr: string = '', status: GuestStatus = 'Anr'): GuestRow {
  return {
    id: generateId(), roomNr, category: getRoomCategory(roomNr), name: '',
    adults: 0, children: 0, group: '', arr: '', arrDate: '', depDate: '',
    price: '', hp: '', booking: '', hns: '', fs: '', ae: '', ort: '', kfz: '',
    notes: '', visitCount: '', lastVisit: '', status,
  };
}

export function createOpsEntry(roomNr: string = ''): OpsEntry {
  return { id: generateId(), roomNr, name: '', status: '', info: '' };
}

/** Sort guest rows by room number (numeric) */
function sortByRoom(rows: GuestRow[]): GuestRow[] {
  return [...rows].sort((a, b) => {
    const na = parseInt(a.roomNr) || 0;
    const nb = parseInt(b.roomNr) || 0;
    return na - nb;
  });
}

/** Auto-fill name and status for OpsEntry based on guest data */
function autoFillOps(entry: OpsEntry, arrivals: GuestRow[], stayers: GuestRow[]): OpsEntry {
  if (!entry.roomNr) return entry;
  const guest = [...arrivals, ...stayers].find(g => g.roomNr === entry.roomNr);
  if (!guest) return entry;
  return {
    ...entry,
    name: entry.name || guest.name,
    status: entry.status || guest.status,
  };
}

interface BelegungState {
  currentDate: string;
  data: DailyData;
  allDays: string[];
  staff: StaffMember[];
  toasts: Toast[];
  sidebarCollapsed: boolean;

  // Actions
  loadDay: (date: string) => void;
  saveDay: () => void;
  deleteDay: (date: string) => void;
  setCurrentDate: (date: string) => void;
  updateData: (partial: Partial<DailyData>) => void;

  // Guest rows
  addArrival: () => void;
  updateArrival: (id: string, updates: Partial<GuestRow>) => void;
  removeArrival: (id: string) => void;
  addStayer: () => void;
  updateStayer: (id: string, updates: Partial<GuestRow>) => void;
  removeStayer: (id: string) => void;

  // Ops entries
  addOpsEntry: (section: keyof DailyData) => void;
  updateOpsEntry: (section: keyof DailyData, id: string, updates: Partial<OpsEntry>) => void;
  removeOpsEntry: (section: keyof DailyData, id: string) => void;

  // Staff
  addStaffMember: (name: string) => void;
  removeStaffMember: (id: string) => void;
  loadStaffFromStorage: () => void;

  // UI
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
}

export const useBelegungStore = create<BelegungState>((set, get) => ({
  currentDate: todayISO(),
  data: createEmptyDay(todayISO()),
  allDays: [],
  staff: [],
  toasts: [],
  sidebarCollapsed: false,

  loadDay: (date) => {
    const saved = loadDailyData(date);
    set({
      currentDate: date,
      data: saved ?? createEmptyDay(date),
      allDays: loadAllDays(),
    });
  },

  saveDay: () => {
    const data = { ...get().data, updatedAt: new Date().toISOString() };
    saveDailyData(data);
    set({ data, allDays: loadAllDays() });
  },

  deleteDay: (date) => {
    deleteDailyData(date);
    const days = loadAllDays();
    set({ allDays: days });
    if (get().currentDate === date) {
      set({ data: createEmptyDay(date) });
    }
  },

  setCurrentDate: (date) => {
    get().loadDay(date);
  },

  updateData: (partial) => {
    set(s => ({ data: { ...s.data, ...partial } }));
  },

  // ── Guest rows ──────────────────────────────────────────────────

  addArrival: () => {
    set(s => ({
      data: { ...s.data, arrivals: sortByRoom([...s.data.arrivals, createGuestRow('', 'Anr')]) },
    }));
  },

  updateArrival: (id, updates) => {
    set(s => {
      const arrivals = s.data.arrivals.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        if (updates.roomNr !== undefined) updated.category = getRoomCategory(updates.roomNr);
        return updated;
      });
      return { data: { ...s.data, arrivals: sortByRoom(arrivals) } };
    });
  },

  removeArrival: (id) => {
    set(s => ({ data: { ...s.data, arrivals: s.data.arrivals.filter(r => r.id !== id) } }));
  },

  addStayer: () => {
    set(s => ({
      data: { ...s.data, stayers: sortByRoom([...s.data.stayers, createGuestRow('', 'Bl')]) },
    }));
  },

  updateStayer: (id, updates) => {
    set(s => {
      const stayers = s.data.stayers.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        if (updates.roomNr !== undefined) updated.category = getRoomCategory(updates.roomNr);
        return updated;
      });
      return { data: { ...s.data, stayers: sortByRoom(stayers) } };
    });
  },

  removeStayer: (id) => {
    set(s => ({ data: { ...s.data, stayers: s.data.stayers.filter(r => r.id !== id) } }));
  },

  // ── Ops entries ─────────────────────────────────────────────────

  addOpsEntry: (section) => {
    set(s => {
      const arr = (s.data[section] as OpsEntry[]) ?? [];
      return { data: { ...s.data, [section]: [...arr, createOpsEntry()] } };
    });
  },

  updateOpsEntry: (section, id, updates) => {
    set(s => {
      const arr = ((s.data[section] as OpsEntry[]) ?? []).map(e => {
        if (e.id !== id) return e;
        let updated = { ...e, ...updates };
        if (updates.roomNr !== undefined) {
          updated = autoFillOps(updated, s.data.arrivals, s.data.stayers);
        }
        return updated;
      });
      return { data: { ...s.data, [section]: arr } };
    });
  },

  removeOpsEntry: (section, id) => {
    set(s => {
      const arr = ((s.data[section] as OpsEntry[]) ?? []).filter(e => e.id !== id);
      return { data: { ...s.data, [section]: arr } };
    });
  },

  // ── Staff ───────────────────────────────────────────────────────

  addStaffMember: (name) => {
    const staff = [...get().staff, { id: generateId(), name }];
    saveStaff(staff);
    set({ staff });
  },

  removeStaffMember: (id) => {
    const staff = get().staff.filter(s => s.id !== id);
    saveStaff(staff);
    set({ staff });
  },

  loadStaffFromStorage: () => {
    set({ staff: loadStaff(), allDays: loadAllDays() });
  },

  // ── UI ──────────────────────────────────────────────────────────

  addToast: (toast) => {
    const id = generateId();
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
