// ─── Guest status ───────────────────────────────────────────────────────────
export type GuestStatus = 'Anr' | 'Abr' | 'Bl';

// ─── A single guest row in the main table ───────────────────────────────────
export interface GuestRow {
  id: string;
  roomNr: string;          // #  — room number
  category: string;        // Kat — auto-filled from room number
  name: string;            // Name
  adults: number;          // E (Erwachsene)
  children: number;        // K (Kinder)
  group: string;           // Gruppe
  arr: string;             // Arr — arrival employee name (from selectable list)
  arrDate: string;         // Anr — arrival date (dd.MM)
  depDate: string;         // Abr — departure date (dd.MM)
  price: string;           // Preis — number, but may contain extra text
  hp: string;              // HP — time ("18 Uhr")
  booking: string;         // Booking
  hns: string;             // HNS
  fs: string;              // FS (€50)
  ae: string;              // AE (€130)
  ort: string;             // Ort (city)
  kfz: string;             // KFZ (license plate)
  notes: string;           // Notizen/Besuche
  visitCount: string;      // how often guest has been (e.g. "3")
  lastVisit: string;       // last visit date (e.g. "07/24")
  status: GuestStatus;     // Anr / Abr / Bl — derived or manual
}

// ─── Room entry in operations sections ──────────────────────────────────────
export interface OpsEntry {
  id: string;
  roomNr: string;
  name: string;            // auto-generated from guest data
  status: GuestStatus | '';
  info: string;            // free text
}

// ─── Newspaper subscription row ─────────────────────────────────────────────
export interface NewspaperRow {
  id: string;
  roomNr: string;
  newspaper: string;
  dateRange: string;       // "von --- bis ---"
  remarks: string;
}

// ─── New guest row (same as GuestRow but with Ti-# instead of HP) ───────────
export interface NewGuestRow {
  id: string;
  roomNr: string;
  category: string;
  name: string;
  adults: number;
  children: number;
  group: string;
  arr: string;
  arrDate: string;
  depDate: string;
  price: string;
  tableNr: string;         // Ti-# instead of HP
  booking: string;
  fsAe: string;
  ortKfz: string;
  notes: string;
}

// ─── Free room row ──────────────────────────────────────────────────────────
export interface FreeRoomRow {
  id: string;
  roomNr: string;
  category: string;
  outOfOrder: string;
}

// ─── Weekly occupancy ───────────────────────────────────────────────────────
export interface WeeklyOccupancy {
  mo: string; di: string; mi: string; do_: string; fr: string; sa: string; so: string;
}

// ─── Staff / selectable employee names ──────────────────────────────────────
export interface StaffMember {
  id: string;
  name: string;
}

// ─── Header data ────────────────────────────────────────────────────────────
export interface HeaderData {
  standDate: string;       // last update date
  standTime: string;       // last update time
  tkName: string;          // TK name
  tkTimeRange: string;     // TK time range
  hskName: string;         // HSK name
  hskTimeRange: string;    // HSK time range
  chefDerNacht: string;    // Chef der Nacht name
  chefTimeRange: string;   // time range
}

// ─── Stats row ──────────────────────────────────────────────────────────────
export interface DailyStats {
  anrZi: string; anrPer: string;
  abrZi: string; abrPer: string;
  bleiberZi: string; bleiberPer: string;
  uenZi: string; uenPer: string;
  fruehAnreisen: string;
  spaetAbreisen: string;
  spaetAnreisen: string;
}

// ─── Full daily data ────────────────────────────────────────────────────────
export interface DailyData {
  id: string;
  date: string;            // ISO date
  header: HeaderData;
  stats: DailyStats;
  weeklyOccupancy: WeeklyOccupancy;

  arrivals: GuestRow[];    // Anreisen
  stayers: GuestRow[];     // Bleiber

  // Operations sections
  infoSection: string;            // grey background info area
  fruehschicht: string;
  fruehExtern: string;
  fruehOps: OpsEntry[];
  spaetschicht: string;
  spaetAeExtern: string;
  spaetOps: OpsEntry[];
  kueche: string;
  kuecheFsExtern: string;
  kuecheAeExtern: string;
  kuecheLaktose: OpsEntry[];
  kuecheGluten: OpsEntry[];
  kuecheAllergien: OpsEntry[];
  kuecheUnvertraeglichkeiten: OpsEntry[];
  kuecheSonstiges: OpsEntry[];
  kuecheOps: OpsEntry[];
  veranstaltungenBankett: string;
  tischwuensche: string;
  tischwuenscheAeExtern: string;
  tischwuenscheOps: OpsEntry[];
  englischeMenuekarten: string;
  geburtstage: OpsEntry[];
  housekeeping: OpsEntry[];
  empfangChauffeure: OpsEntry[];
  ltExtern: string;
  eAuto: string;
  landtherme: OpsEntry[];
  landthermeLtExtern: string;

  // Bottom sections
  newspapers: NewspaperRow[];
  newGuests: NewGuestRow[];
  freeRooms: FreeRoomRow[];

  // Meta
  createdAt: string;
  updatedAt: string;
}
