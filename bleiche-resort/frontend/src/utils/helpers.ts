import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export function generateId(): string {
  return crypto.randomUUID();
}

/** Format a date as "15. Oktober 2025" */
export function formatDateGerman(isoDate: string): string {
  if (!isoDate) return '';
  try {
    return format(parseISO(isoDate), "d'. 'MMMM yyyy", { locale: de });
  } catch {
    return isoDate;
  }
}

/** Format a date as "15.10.2025" */
export function formatDateShort(isoDate: string): string {
  if (!isoDate) return '';
  try {
    return format(parseISO(isoDate), 'dd.MM.yyyy', { locale: de });
  } catch {
    return isoDate;
  }
}

/** Format currency in EUR */
export function formatEuro(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}

/** Get greeting based on salutation */
export function getGreeting(salutation: string, lastName: string): string {
  switch (salutation) {
    case 'Herr': return `Sehr geehrter Herr ${lastName}`;
    case 'Frau': return `Sehr geehrte Frau ${lastName}`;
    case 'Familie': return `Sehr geehrte Familie ${lastName}`;
    default: return `Sehr geehrte Damen und Herren`;
  }
}

export function formatWeekday(isoDate: string): string {
  if (!isoDate) return '';
  try { return format(parseISO(isoDate), 'EEEE', { locale: de }); } catch { return ''; }
}

export function formatFullDate(isoDate: string): string {
  if (!isoDate) return '';
  try { return format(parseISO(isoDate), "EEEE, dd. MMMM yyyy", { locale: de }); } catch { return isoDate; }
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function getOfferNumber(id: string, createdAt: string): string {
  const date = createdAt ? formatDateShort(createdAt).replace(/\./g, '') : '';
  return `ANG-${date}-${id.slice(0, 4).toUpperCase()}`;
}
