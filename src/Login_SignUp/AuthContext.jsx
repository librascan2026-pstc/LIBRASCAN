import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { AuthContext } from './useAuth';
import { isMfaPending, clearMfaPending } from '../utils/mfaClient';

// useAuth() itself now lives in ./useAuth.js — this file exports the
// AuthProvider component ONLY, which keeps it a valid React Fast Refresh
// boundary (see the comment in useAuth.js for why that matters).

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = still loading
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);      // row from profiles table
  const [loading, setLoading] = useState(true);
  // True while we have a logged-in user but haven't confirmed their role from
  // the DB yet. Consumers (App routing) must treat this like `loading` and
  // NOT render a role-based dashboard until this is false — otherwise stale
  // Supabase Auth user_metadata (e.g. leftover "admin") causes a flash of the
  // wrong dashboard before the real profiles.role value arrives.
  const [roleResolving, setRoleResolving] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); setRole(null); setRoleResolving(false); return; }
    setRoleResolving(true);
    const { data } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, first_name, last_name, middle_name, username, email, role, ' +
        'avatar_url, campus_id, college_id, program_id, major_id, ' +
        'student_number,  created_at, updated_at'
      )
      .eq('id', userId)
      .single();
    setProfile(data || null);

    setRole(data?.role || null);
    setRoleResolving(false);
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
        // A Supabase session can exist here (signInWithPassword already
        // resolved it) while the account is still mid-2FA — e.g. this is a
        // second tab in the same browser, such as the one opened by tapping
        // "Yes, it's me" / "No, secure my account" in the confirmation
        // email. Never treat that as signed in; only the tab that actually
        // finishes 2FA (via commitUser -> clearMfaPending) may.
        if (u && isMfaPending(u.id)) {
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }
        setUser(u);
        if (u) await fetchProfile(u.id); 
        else setRole(null);
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
      // Same guard as the initial getSession() check above — a token
      // refresh or storage event firing in a not-yet-2FA'd tab must not
      // suddenly promote it to signed in either.
      if (u && isMfaPending(u.id)) {
        setUser(null);
        setProfile(null);
        setRole(null);
        return;
      }
      setUser(u);
      if (u) await fetchProfile(u.id); // resolves the real role from DB
      else { setProfile(null); setRole(null); }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    const uid = user?.id;
    try {

      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.warn('[AuthContext] signOut warning (non-fatal):', error.message);
      }
    } catch (err) {
      console.warn('[AuthContext] signOut threw (non-fatal):', err);
    } finally {
      if (uid) clearMfaPending(uid);
      setUser(null);
      setRole(null);
      setProfile(null);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const commitUser = async (sessionUser) => {
    // This is the one place a login is actually considered finished — no
    // 2FA required, OTP verified, or the "Yes, it's me" email confirmed.
    // Clearing the marker here (rather than in LoginPage) means every path
    // that ends in commitUser is covered automatically.
    clearMfaPending(sessionUser.id);
    setUser(sessionUser);
    await fetchProfile(sessionUser.id); 
  };

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, roleResolving, signOut, signIn, commitUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}