import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// URL-synced router. On web, the current screen is derived from (and pushed
// into) `window.history`, so every view has a shareable URL and the browser
// Back/Forward buttons behave naturally. On native (no `window`) we fall back
// to an in-memory history stack.

export type AppScreen =
  | { name: 'login' }
  | { name: 'home' }
  | { name: 'offers-list' }
  // `mode` defaults to 'view' when offerId is set, 'edit' when creating fresh.
  | { name: 'offer-editor'; offerId?: number; mode?: 'view' | 'edit' }
  | { name: 'guest-profile'; guestId: number }
  | { name: 'employees-list' }
  | { name: 'employee-profile'; employeeId: number; mode?: 'view' | 'edit' }
  | { name: 'belegung-editor'; date?: string }
  | { name: 'days-list' }
  | { name: 'staff-manager' }
  | { name: 'chat'; conversationId?: number }
  | { name: 'conversations-list' }
  | { name: 'cashier' }
  | { name: 'invoices-list' }
  | { name: 'invoice-detail'; invoiceId: number };

interface RouterContextValue {
  screen: AppScreen;
  navigate: (screen: AppScreen) => void;
  replace: (screen: AppScreen) => void;
  canGoBack: boolean;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextValue>({
  screen: { name: 'login' },
  navigate: () => {},
  replace: () => {},
  canGoBack: false,
  goBack: () => {},
});

const MAX_HISTORY = 50;

// ── Screen ↔ path serialization ─────────────────────────────────────────────

export function screenToPath(s: AppScreen): string {
  switch (s.name) {
    case 'login':
      return '/login';
    case 'home':
      return '/';
    case 'offers-list':
      return '/offers';
    case 'offer-editor':
      if (s.offerId == null) return '/offers/new';
      return s.mode === 'edit'
        ? `/offers/${s.offerId}/edit`
        : `/offers/${s.offerId}`;
    case 'guest-profile':
      return `/guests/${s.guestId}`;
    case 'employees-list':
      return '/employees';
    case 'employee-profile':
      return s.mode === 'edit'
        ? `/employees/${s.employeeId}/edit`
        : `/employees/${s.employeeId}`;
    case 'belegung-editor':
      return s.date ? `/belegung/${s.date}` : '/belegung';
    case 'days-list':
      return '/days';
    case 'staff-manager':
      return '/staff';
    case 'chat':
      return s.conversationId ? `/chat/${s.conversationId}` : '/chat';
    case 'conversations-list':
      return '/conversations';
    case 'cashier':
      return '/cashier';
    case 'invoices-list':
      return '/invoices';
    case 'invoice-detail':
      return `/invoices/${s.invoiceId}`;
  }
}

export function pathToScreen(path: string): AppScreen {
  // Strip query/hash, normalise leading slash.
  const clean = path.split(/[?#]/)[0];
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };

  const [head, a, b] = parts;

  switch (head) {
    case 'login':
      return { name: 'login' };
    case 'offers': {
      if (!a) return { name: 'offers-list' };
      if (a === 'new') return { name: 'offer-editor' };
      const id = Number(a);
      if (Number.isNaN(id)) return { name: 'offers-list' };
      if (b === 'edit') return { name: 'offer-editor', offerId: id, mode: 'edit' };
      return { name: 'offer-editor', offerId: id, mode: 'view' };
    }
    case 'guests': {
      const id = Number(a);
      if (!a || Number.isNaN(id)) return { name: 'home' };
      return { name: 'guest-profile', guestId: id };
    }
    case 'staff': {
      // Legacy: /staff[/id] resolved to employee-profile; now split so
      // /staff is the belegung dropdown and /employees[/:id] is the HR view.
      if (!a) return { name: 'staff-manager' };
      const id = Number(a);
      if (Number.isNaN(id)) return { name: 'staff-manager' };
      return { name: 'employee-profile', employeeId: id, mode: 'view' };
    }
    case 'employees': {
      if (!a) return { name: 'employees-list' };
      const id = Number(a);
      if (Number.isNaN(id)) return { name: 'employees-list' };
      if (b === 'edit') return { name: 'employee-profile', employeeId: id, mode: 'edit' };
      return { name: 'employee-profile', employeeId: id, mode: 'view' };
    }
    case 'belegung':
      return { name: 'belegung-editor', date: a };
    case 'days':
      return { name: 'days-list' };
    case 'chat': {
      if (!a) return { name: 'chat' };
      const id = Number(a);
      return Number.isNaN(id) ? { name: 'chat' } : { name: 'chat', conversationId: id };
    }
    case 'conversations':
      return { name: 'conversations-list' };
    case 'cashier':
      return { name: 'cashier' };
    case 'invoices': {
      if (!a) return { name: 'invoices-list' };
      const id = Number(a);
      if (Number.isNaN(id)) return { name: 'invoices-list' };
      return { name: 'invoice-detail', invoiceId: id };
    }
    default:
      return { name: 'home' };
  }
}

// ── Provider ────────────────────────────────────────────────────────────────

function currentBrowserPath(): string {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') return '/';
  return window.location.pathname || '/';
}

function pushBrowserPath(path: string) {
  if (typeof window === 'undefined' || !window.history) return;
  if (window.location.pathname === path) return;
  window.history.pushState({ bleiche: true }, '', path);
}

function replaceBrowserPath(path: string) {
  if (typeof window === 'undefined' || !window.history) return;
  window.history.replaceState({ bleiche: true }, '', path);
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  // Seed from the URL on web so `https://host/offers/42/edit` lands there directly.
  const [history, setHistory] = useState<AppScreen[]>(() => [pathToScreen(currentBrowserPath())]);

  const screen = history[history.length - 1];

  const navigate = useCallback((next: AppScreen) => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      // If the same logical screen (and path) is navigated to, collapse it.
      if (screenToPath(last) === screenToPath(next)) return prev;
      const pushed = [...prev, next];
      return pushed.length > MAX_HISTORY ? pushed.slice(pushed.length - MAX_HISTORY) : pushed;
    });
    pushBrowserPath(screenToPath(next));
  }, []);

  const replace = useCallback((next: AppScreen) => {
    setHistory((prev) => {
      const base = prev.slice(0, -1);
      return [...base, next];
    });
    replaceBrowserPath(screenToPath(next));
  }, []);

  const canGoBack = history.length > 1;

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
      // popstate will resync the in-memory history.
      return;
    }
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // Browser back/forward: reconcile the in-memory stack with the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const nextScreen = pathToScreen(currentBrowserPath());
      setHistory((prev) => {
        if (prev.length > 1 && screenToPath(prev[prev.length - 2]) === screenToPath(nextScreen)) {
          // Pure "back" — pop one off.
          return prev.slice(0, -1);
        }
        // Any other popstate (forward, jump) — replace the top.
        const base = prev.slice(0, -1);
        return [...base, nextScreen];
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <RouterContext.Provider value={{ screen, navigate, replace, canGoBack, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
