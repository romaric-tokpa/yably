import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { ProfileRole } from '@/types/database';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Vrai tant que le rôle profil n’est pas chargé (session présente). */
  profileLoading: boolean;
  profileRole: ProfileRole | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Si GoTrue ne répond pas, le client ne purge pas toujours le stockage : on force pour débloquer l’UI. */
function purgeSupabaseAuthFromBrowserStorage(): void {
  if (typeof window === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key !== null && key.startsWith('sb-') && key.includes('auth-token')) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) {
    window.localStorage.removeItem(key);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileRole, setProfileRole] = useState<ProfileRole | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (uid === undefined) {
      setProfileRole(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error !== null) {
          setProfileRole(null);
        } else {
          setProfileRole(data?.role ?? null);
        }
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error === null) {
      return { error: null };
    }
    const status =
      'status' in error && typeof (error as { status?: number }).status === 'number'
        ? String((error as { status: number }).status)
        : '';
    const code = 'code' in error && typeof (error as { code?: string }).code === 'string'
      ? (error as { code: string }).code
      : '';
    const msg = [error.message, code && `code=${code}`, status && `http=${status}`]
      .filter(Boolean)
      .join(' — ');
    return { error: new Error(msg) };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error !== null) {
      void (await supabase.auth.signOut({ scope: 'local' }));
      purgeSupabaseAuthFromBrowserStorage();
    }
    setSession(null);
    setProfileRole(null);
  }, []);

  const value = useMemo(
    (): AuthContextValue => ({
      user: session?.user ?? null,
      session,
      loading,
      profileLoading,
      profileRole,
      isAdmin: profileRole === 'admin',
      signIn,
      signOut,
    }),
    [session, loading, profileLoading, profileRole, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth dans AuthProvider');
  return ctx;
}
