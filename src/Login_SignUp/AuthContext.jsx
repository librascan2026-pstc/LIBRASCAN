import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, supabaseAdmin, isAdminEmail } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = still loading
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);      // row from profiles table
  const [loading, setLoading] = useState(true);

  const deriveRole = (sessionUser) => {
    if (!sessionUser) return null;
    if (isAdminEmail(sessionUser.email)) return 'library_manager';
    return sessionUser.user_metadata?.role || 'student';
  };

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, middle_name, username, email, role, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();
    setProfile(data || null);
    if (data?.role) setRole(data.role);
  }, []);

  useEffect(() => {
    const isRecoveryFlow =
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery');

    const timeout = setTimeout(() => {
      console.warn('[AuthContext] Supabase timed out. Check your .env.local');
      setUser(null);
      setRole(null);
      setLoading(false);
    }, 6000);

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(timeout);
        if (isRecoveryFlow) {
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }
        const u = session?.user ?? null;
        setUser(u);
        setRole(deriveRole(u));
        if (u) await fetchProfile(u.id);
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('[AuthContext] getSession error:', err);
        setUser(null);
        setRole(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') return;
      if (event === 'SIGNED_IN') return;
      if (event === 'USER_UPDATED') return;

      const u = session?.user ?? null;
      setUser(u);
      setRole(deriveRole(u));
      if (u) await fetchProfile(u.id);
      else setProfile(null);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const commitUser = async (sessionUser) => {
    setUser(sessionUser);
    setRole(deriveRole(sessionUser));
    await fetchProfile(sessionUser.id);
  };

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signOut, signIn, commitUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}