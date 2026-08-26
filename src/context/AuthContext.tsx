import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authFetch, clearToken, getToken, setToken } from '../lib/api';

export interface SubscriptionStatus {
  plan: string;
  status: string;
  trial_ends_at: string;
  current_period_end: string | null;
  access_active: boolean;
  price_idr: number;
}

interface AuthContextValue {
  user: { id: string; email: string; name: string } | null;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await authFetch('/api/subscription/status');
      if (res.ok) {
        setSubscription(await res.json());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await authFetch('/api/subscription/status');
        if (!res.ok) throw new Error();
        // Token valid; fetch user info is derived from token claims server-side,
        // so we re-derive minimal info from the status endpoint.
        setSubscription(await res.json());
        const me = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (me.ok) setUser((await me.json()).user);
        else clearToken();
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal.');
      setToken(data.token);
      setUser(data.user);
      await refreshSubscription();
    },
    [refreshSubscription]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registrasi gagal.');
      setToken(data.token);
      setUser(data.user);
      await refreshSubscription();
    },
    [refreshSubscription]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setSubscription(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, subscription, loading, login, register, logout, refreshSubscription }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
