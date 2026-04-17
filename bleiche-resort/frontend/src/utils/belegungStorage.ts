import type { DailyData, StaffMember } from '../types/belegung';

const KEYS = {
  dailyData: 'bleiche_belegung_daily',
  staff: 'bleiche_belegung_staff',
  allDays: 'bleiche_belegung_days',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function safeSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error(`Failed to save ${key}:`, e); }
}

export function loadDailyData(date: string): DailyData | null {
  const all = safeGet<Record<string, DailyData>>(KEYS.dailyData, {});
  return all[date] ?? null;
}

export function saveDailyData(data: DailyData): void {
  const all = safeGet<Record<string, DailyData>>(KEYS.dailyData, {});
  all[data.date] = data;
  safeSet(KEYS.dailyData, all);
  const days = safeGet<string[]>(KEYS.allDays, []);
  if (!days.includes(data.date)) {
    days.push(data.date);
    days.sort();
    safeSet(KEYS.allDays, days);
  }
}

export function loadAllDays(): string[] {
  return safeGet<string[]>(KEYS.allDays, []);
}

export function loadStaff(): StaffMember[] {
  return safeGet<StaffMember[]>(KEYS.staff, []);
}

export function saveStaff(staff: StaffMember[]): void {
  safeSet(KEYS.staff, staff);
}

export function deleteDailyData(date: string): void {
  const all = safeGet<Record<string, DailyData>>(KEYS.dailyData, {});
  delete all[date];
  safeSet(KEYS.dailyData, all);
  const days = safeGet<string[]>(KEYS.allDays, []).filter(d => d !== date);
  safeSet(KEYS.allDays, days);
}
