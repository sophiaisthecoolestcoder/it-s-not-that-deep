// Tiny storage wrapper: uses window.localStorage on web, in-memory fallback elsewhere.
// Sync API so callers don't have to thread Promises everywhere.

const memory = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export const storage = {
  get(key: string): string | null {
    if (hasLocalStorage()) return window.localStorage.getItem(key);
    return memory.get(key) ?? null;
  },
  set(key: string, value: string): void {
    if (hasLocalStorage()) {
      window.localStorage.setItem(key, value);
    } else {
      memory.set(key, value);
    }
  },
  remove(key: string): void {
    if (hasLocalStorage()) {
      window.localStorage.removeItem(key);
    } else {
      memory.delete(key);
    }
  },
};

export function jsonGet<T>(key: string, fallback: T): T {
  const raw = storage.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function jsonSet<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}
