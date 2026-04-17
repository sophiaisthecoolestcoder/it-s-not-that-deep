import React, { createContext, useContext, useState } from 'react';

export type AppScreen =
  | { name: 'login' }
  | { name: 'home' }
  | { name: 'offers-list' }
  | { name: 'offer-editor'; offerId?: number }
  | { name: 'belegung-editor'; date?: string }
  | { name: 'days-list' }
  | { name: 'staff-manager' }
  | { name: 'chat' };

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

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<AppScreen[]>([{ name: 'login' }]);

  const screen = history[history.length - 1];

  const navigate = (next: AppScreen) => {
    setHistory((prev) => {
      // Replace if same screen, push otherwise
      const last = prev[prev.length - 1];
      if (last.name === next.name) return [...prev.slice(0, -1), next];
      return [...prev, next];
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
