import type { Offer } from '../types';

const KEYS = {
  offers: 'bleiche_offers',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

export function loadOffers(): Offer[] {
  return safeGet<Offer[]>(KEYS.offers, []);
}

export function saveOffers(offers: Offer[]): void {
  safeSet(KEYS.offers, offers);
}
