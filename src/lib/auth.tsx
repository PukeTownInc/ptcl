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
  
  // 🔄 Redirect to login when signed out
  useEffect(() => {
    if (!loading && !user) {
      // Reload/redirect to login — replace path to avoid history issues
      window.location.replace(window.location.origin);
    }
  }, [user, loading]);

  useEffect(() => {
    let initialResolved = false;
    const resolveInitial = (sess: Session | null) => {
      if (initialResolved) return;
      initialResolved = true;
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    };
    const hasOAuthInUrl = typeof window !== 'undefined' &&
      (window.location.hash.includes('access_token') ||
       window.location.search.includes('code='));
    if (hasOAuthInUrl) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'INITIAL_SESSION') {
        if (!hasOAuthInUrl) {
          resolveInitial(sess);
        }
      } else if (event === 'SIGNED_IN') {
        resolveInitial(sess);
        setSession(sess);
        setUser(sess?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Do NOT update state here — prevents infinite re-renders
      }
    });
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
  // ✅ Sign out — clears Supabase + local state
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Proceed even if session already expired
    }
    setSession(null);
    setUser(null);
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
