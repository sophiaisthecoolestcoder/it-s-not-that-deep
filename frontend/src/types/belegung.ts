// ─── Guest status ───────────────────────────────────────────────────────────
export type GuestStatus = 'Anr' | 'Abr' | 'Bl';

export interface GuestRow {
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
  hp: string;
  booking: string;
  hns: string;
  fs: string;
  ae: string;
  ort: string;
  kfz: string;
  notes: string;
  visitCount: string;
  lastVisit: string;
  status: GuestStatus;
}

export interface OpsEntry {
  id: string;
  roomNr: string;
  name: string;
  status: GuestStatus | '';
  info: string;
}

export interface NewspaperRow {
  id: string;
  roomNr: string;
  newspaper: string;
  dateRange: string;
  remarks: string;
}

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
  tableNr: string;
  booking: string;
  fsAe: string;
  ortKfz: string;
  notes: string;
}

export interface FreeRoomRow {
  id: string;
  roomNr: string;
  category: string;
  outOfOrder: string;
}

export interface WeeklyOccupancy {
  mo: string; di: string; mi: string; do_: string; fr: string; sa: string; so: string;
}

export interface StaffMember {
  id: number | string;
  name: string;
}

export interface HeaderData {
  standDate: string;
  standTime: string;
  tkName: string;
  tkTimeRange: string;
  hskName: string;
  hskTimeRange: string;
  chefDerNacht: string;
  chefTimeRange: string;
}

export interface DailyStats {
  anrZi: string; anrPer: string;
  abrZi: string; abrPer: string;
  bleiberZi: string; bleiberPer: string;
  uenZi: string; uenPer: string;
  fruehAnreisen: string;
  spaetAbreisen: string;
  spaetAnreisen: string;
}

export interface DailyData {
  date: string;
  header: HeaderData;
  stats: DailyStats;
  weeklyOccupancy: WeeklyOccupancy;

  arrivals: GuestRow[];
  stayers: GuestRow[];

  infoSection: string;
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

  newspapers: NewspaperRow[];
  newGuests: NewGuestRow[];
  freeRooms: FreeRoomRow[];
}
