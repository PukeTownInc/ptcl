import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<AuthResult>;
  signInAnonymously: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialResolved = false;

    const resolveInitial = (sess: Session | null) => {
      if (initialResolved) return;
      initialResolved = true;
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    };

    // If returning from an OAuth redirect, the URL contains a hash fragment
    // with the auth tokens (e.g. #access_token=...). Supabase processes these
    // asynchronously and fires SIGNED_IN once resolved. We must hold loading
    // open until that happens so the login screen never flashes.
    const hasOAuthInUrl = typeof window !== 'undefined' &&
      (window.location.hash.includes('access_token') ||
       window.location.search.includes('code='));

    // Clean the URL after OAuth redirect so tokens don't linger in history
    if (hasOAuthInUrl) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'INITIAL_SESSION') {
        // If we came back from OAuth, ignore the first INITIAL_SESSION
        // (it fires with null before the tokens are processed) and wait
        // for SIGNED_IN. Otherwise, this is a normal page load — resolve now.
        if (!hasOAuthInUrl) {
          resolveInitial(sess);
        }
      } else if (event === 'SIGNED_IN') {
        resolveInitial(sess);
        // Also update state in case we already resolved initial (e.g. post-OAuth)
        setSession(sess);
        setUser(sess?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // The Supabase client manages the refreshed token internally.
        // Do NOT call setSession/setUser here — new object references
        // trigger a full app re-render every ~15-20s (the token refresh
        // interval), which appears as an infinite self-refresh loop.
      }
    });

    // Safety net: if onAuthStateChange doesn't fire within 3.5 seconds,
    // fall back to getSession so the app doesn't hang forever.
    const fallback = setTimeout(async () => {
      if (!initialResolved) {
        const { data } = await supabase.auth.getSession();
        resolveInitial(data.session);
      }
    }, 3500);

    return () => {
      clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmailPassword = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const signUpWithEmailPassword = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const signInAnonymously = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        if (error.message.includes('not enabled') || error.message.includes('anonymous')) {
          return { success: false, error: 'Anonymous sign-in is not enabled. Use email/password instead.' };
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmailPassword,
        signUpWithEmailPassword,
        signInAnonymously,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
