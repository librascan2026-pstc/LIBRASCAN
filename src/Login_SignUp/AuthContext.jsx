import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { AuthContext } from './useAuth';
import { isMfaPending, clearMfaPending } from '../utils/mfaClient';



export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); 
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);      
  const [loading, setLoading] = useState(true);

  const [roleResolving, setRoleResolving] = useState(false);
 
  const committedUserRef = useRef(null);

  const profileRef = useRef(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { profileRef.current = null; setProfile(null); setRole(null); setRoleResolving(false); return; }
    setRoleResolving(true);
    const load = async () => {
      try {
        return await supabaseAdmin
          .from('profiles')
          .select(
            'id, first_name, last_name, middle_name, username, email, role, ' +
            'avatar_url, campus_id, college_id, program_id, major_id, ' +
            'student_number,  created_at, updated_at'
          )
          .eq('id', userId)
          .single();
      } catch (err) {
        return { data: null, error: err };
      }
    };
    let { data, error } = await load();

    if (!data && error) {
      await new Promise((r) => setTimeout(r, 700));
      ({ data, error } = await load());
    }

    if (!data && profileRef.current?.id === userId) {
      setRoleResolving(false);
      return;
    }
    profileRef.current = data || null;
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


    const getSessionWithRetry = async () => {
      let res = await supabase.auth.getSession();
      for (let i = 0; i < 2 && !res?.data?.session && res?.error?.name === 'AuthRetryableFetchError'; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await supabase.auth.getSession();
      }
      return res;
    };

    getSessionWithRetry()
      .then(async ({ data: { session } }) => {
        clearTimeout(timeout);
        if (isRecoveryFlow) {
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }
        const u = session?.user ?? null;

        if (u && isMfaPending(u.id)) {
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }
        committedUserRef.current = u ? u.id : null;
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

      if (u && isMfaPending(u.id) && committedUserRef.current !== u.id) {
        setUser(null);
        setProfile(null);
        setRole(null);
        return;
      }
      committedUserRef.current = u ? u.id : null;
      setUser(u);
      if (u) await fetchProfile(u.id); // resolves the real role from DB
      else { setProfile(null); setRole(null); }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);


  const signOut = async ({ skipServerCall = false } = {}) => {
    const uid = user?.id;
    try {
      if (skipServerCall) {
        try {
          const key = supabase.auth.storageKey;
          if (key) localStorage.removeItem(key);
        } catch { /* storage unavailable */ }
      } else {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
          console.warn('[AuthContext] signOut warning (non-fatal):', error.message);
        }
      }
    } catch (err) {
      console.warn('[AuthContext] signOut threw (non-fatal):', err);
    } finally {
      if (uid) clearMfaPending(uid);
      committedUserRef.current = null;
      profileRef.current = null;
      setUser(null);
      setRole(null);
      setProfile(null);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };


  const signInWithGoogleIdToken = async (credential, nonce) => {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
      nonce,
    });
    return { data, error };
  };

  const commitUser = async (sessionUser) => {
   
    clearMfaPending(sessionUser.id);
    committedUserRef.current = sessionUser.id;
    setUser(sessionUser);
    await fetchProfile(sessionUser.id); 
  };

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
  }, [fetchProfile]);


  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let channel = null;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      let sessionId = null;
      try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        sessionId = JSON.parse(json).session_id || null;
      } catch { /* couldn't read it — fall through, still listen below */ }

      if (cancelled) return;

      channel = supabase
        .channel(`force-logout-${user.id}`)
        .on('broadcast', { event: 'force-logout' }, ({ payload }) => {
          if (!payload?.sessionId || payload.sessionId === sessionId) {
         
            signOut({ skipServerCall: true });
          }
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, roleResolving, signOut, signIn, signInWithGoogleIdToken, commitUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}