import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login as apiLogin, logout as apiLogout, me, register as apiRegister } from './api';
import type { User } from './types';

/**
 * The signed-in user, shared app-wide. The session itself lives in React
 * Native's native cookie jar (fetch stores the `hire_token` cookie from
 * login/register and re-sends it), so this store only mirrors *who* is signed in
 * — it never holds the token. On mount it asks `/auth/me`; a 401 simply means
 * signed out. Sign-in/out refresh the saved-jobs cache so bookmarks reflect the
 * new identity immediately.
 */

type AuthContextValue = {
  user: User | null;
  loading: boolean; // the initial /me probe is in flight
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  // Probe the existing session once on launch (the cookie may have persisted).
  useEffect(() => {
    let alive = true;
    me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setUser(await apiLogin(email, password));
      qc.invalidateQueries({ queryKey: ['saved'] });
    },
    [qc],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setUser(await apiRegister(email, password));
      qc.invalidateQueries({ queryKey: ['saved'] });
    },
    [qc],
  );

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      // Clear locally even if the network call failed — the intent is to sign out.
      setUser(null);
      qc.removeQueries({ queryKey: ['saved'] });
    }
  }, [qc]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
