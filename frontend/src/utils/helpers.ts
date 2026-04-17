// Minimal, dependency-free German date / currency helpers (replaces date-fns).

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const WEEKDAYS_DE = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag',
];

function parseIso(s: string): Date | null {
  if (!s) return null;
  // Accept YYYY-MM-DD or full ISO
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(d.getTime()) ? null : d;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateGerman(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseIso(iso);
  if (!d) return iso;
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseIso(iso);
  if (!d) return iso;
  const day = `${d.getDate()}`.padStart(2, '0');
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${day}.${m}.${d.getFullYear()}`;
}

export function formatWeekday(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseIso(iso);
  if (!d) return '';
  return WEEKDAYS_DE[d.getDay()];
}

export function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseIso(iso);
  if (!d) return iso ?? '';
  return `${WEEKDAYS_DE[d.getDay()]}, ${`${d.getDate()}`.padStart(2, '0')}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatEuro(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(num)) return '—';
  // 1.234,50 EUR
  const parts = num.toFixed(2).split('.');
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${int},${parts[1]} €`;
}

export function getGreeting(salutation: string, lastName: string): string {
  switch (salutation) {
    case 'Herr': return `Sehr geehrter Herr ${lastName}`;
    case 'Frau': return `Sehr geehrte Frau ${lastName}`;
    case 'Familie': return `Sehr geehrte Familie ${lastName}`;
    default: return 'Sehr geehrte Damen und Herren';
  }
}

export function getOfferNumber(id: number | string, createdAt: string): string {
  const digits = (createdAt || '').slice(0, 10).replace(/-/g, '');
  // legacy format used DDMMYYYY — reconstruct from YYYYMMDD
  const ddmmyyyy = digits.length === 8 ? `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}` : digits;
  const suffix = String(id).padStart(4, '0').slice(-4).toUpperCase();
  return `ANG-${ddmmyyyy}-${suffix}`;
}

let _idCounter = 0;
export function generateId(): string {
  _idCounter += 1;
  return `${Date.now().toString(36)}-${_idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nightsBetween(arrival: string | null | undefined, departure: string | null | undefined): number {
  if (!arrival || !departure) return 0;
  const a = parseIso(arrival);
  const d = parseIso(departure);
  if (!a || !d) return 0;
  return Math.max(0, Math.round((d.getTime() - a.getTime()) / 86400000));
}
