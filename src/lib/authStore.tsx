import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  exchangeOAuth,
  login as apiLogin,
  logout as apiLogout,
  me,
  oauthProviders,
  oauthStartUrl,
  register as apiRegister,
} from './api';
import { codeFromCallbackUrl } from './oauth';
import type { User } from './types';

/** The custom scheme the backend redirects to at the end of the mobile OAuth
 *  flow; `openAuthSessionAsync` resolves once the browser hits it. */
const OAUTH_CALLBACK = 'freehiremobile://auth-callback';

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
  /** Social sign-in. Resolves `true` once signed in, `false` if the user
   *  cancelled (a quiet no-op); throws on a provider error or a failed code
   *  exchange (the caller shows the message). */
  signInWithProvider: (provider: string) => Promise<boolean>;
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

  const signInWithProvider = useCallback(
    async (provider: string) => {
      // Opens the provider flow; resolves with the redirect URL once the browser
      // reaches our custom scheme (or with cancel/dismiss if the user backs out).
      const result = await WebBrowser.openAuthSessionAsync(oauthStartUrl(provider), OAUTH_CALLBACK);
      if (result.type !== 'success') return false; // user cancelled — quiet no-op

      const { code, error } = codeFromCallbackUrl(result.url);
      if (error) throw new Error('oauth');
      if (!code) return false; // no code and no error — nothing to do

      // The exchange POST is ours, so its Set-Cookie lands in the app's jar.
      setUser(await exchangeOAuth(code));
      qc.invalidateQueries({ queryKey: ['saved'] });
      return true;
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
    () => ({ user, loading, signIn, signUp, signInWithProvider, signOut }),
    [user, loading, signIn, signUp, signInWithProvider, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/** The configured OAuth providers, for rendering sign-in buttons. Cached and
 *  non-blocking: on failure it yields `[]` so the buttons simply don't show and
 *  the email/password form is never gated on it. */
export function useOAuthProviders(): string[] {
  const { data } = useQuery({
    queryKey: ['oauth', 'providers'],
    queryFn: oauthProviders,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return data ?? [];
}
