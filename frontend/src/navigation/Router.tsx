import React, { createContext, useContext, useState } from 'react';

export type AppScreen =
  | { name: 'login' }
  | { name: 'home' }
  | { name: 'offers-list' }
  | { name: 'offer-editor'; offerId?: number }
  | { name: 'guest-profile'; guestId: number }
  | { name: 'employee-profile'; employeeId: number }
  | { name: 'belegung-editor'; date?: string }
  | { name: 'days-list' }
  | { name: 'staff-manager' }
  | { name: 'chat'; conversationId?: number }
  | { name: 'conversations-list' };

interface RouterContextValue {
  screen: AppScreen;
  navigate: (screen: AppScreen) => void;
  canGoBack: boolean;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextValue>({
  screen: { name: 'login' },
  navigate: () => {},
  canGoBack: false,
  goBack: () => {},
});

const MAX_HISTORY = 50;

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<AppScreen[]>([{ name: 'login' }]);

  const screen = history[history.length - 1];

  const navigate = (next: AppScreen) => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      const base = last.name === next.name ? prev.slice(0, -1) : prev;
      const pushed = [...base, next];
      return pushed.length > MAX_HISTORY ? pushed.slice(pushed.length - MAX_HISTORY) : pushed;
    });
  };

  const canGoBack = history.length > 1;

  const goBack = () => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  return (
    <RouterContext.Provider value={{ screen, navigate, canGoBack, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
