import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken, onUnauthorized } from '../api/client';
import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onUnauthorized(() => {
      setToken(null);
      setUser(null);
    });
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then((u) => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
    return () => {
      onUnauthorized(null);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    setToken(res.access_token);
    const me = await api.me();
    setUser(me);
  };

  const logout = () => {
    api.logout().catch(() => {});
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
