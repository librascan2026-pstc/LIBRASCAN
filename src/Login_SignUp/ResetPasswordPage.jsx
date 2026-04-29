// src/Login_SignUp/ResetPasswordPage.jsx
//
// This page is shown when the user clicks the Supabase password-reset email link.
// The URL will contain a hash like: #access_token=...&type=recovery
// Supabase fires PASSWORD_RECOVERY event → we unlock the reset form.
// After successful reset: sign out the recovery session, go to login.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';

// ── Shared UI ─────────────────────────────────────────────────────────────────
function AuthButton({ loading, children, onClick, style = {} }) {
  return (
    <motion.button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading}
      whileTap={{ scale: 0.97 }}
      style={{
        width:'100%', padding:'10px', marginTop:8,
        background: loading ? 'rgba(139,0,0,0.5)' : '#8B0000',
        color:'#F5E4A8', border:'none', borderRadius:22,
        fontSize:13.5, fontWeight:700, cursor:loading?'not-allowed':'pointer',
        fontFamily:"'Crimson Text', Georgia, serif",
        letterSpacing:'0.06em', textTransform:'uppercase',
        ...style,
      }}
    >
      {loading ? 'Please wait…' : children}
    </motion.button>
  );
}

function LinkButton({ onClick, children, style = {} }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background:'none', border:'none', color:'#8B0000', cursor:'pointer', fontSize:'inherit', fontFamily:"'Crimson Text',serif", fontWeight:700, padding:0, textDecoration:'underline', ...style }}>
      {children}
    </button>
  );
}

function ErrorBanner({ message }) {
  return (
    <motion.div
      initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
      style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.35)', borderRadius:10, padding:'9px 14px', fontSize:12, color:'#c0392b', marginBottom:10, lineHeight:1.55 }}>
      {message}
    </motion.div>
  );
}

export default function ResetPasswordPage({ onGoLogin, onResetSuccess, onGoLanding }) {
  const handleExit = onGoLanding || (() => { window.location.href = '/'; });
  const [ready, setReady]     = useState(false);
  const [newPw, setNewPw]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [countdown, setCountdown]     = useState(5);

  // Listen for Supabase PASSWORD_RECOVERY event.
  // This fires when the user opens the reset link from their email.
  // We do NOT log the user in — we just unlock the reset form.
  useEffect(() => {
    // Check if we already have a recovery session from the URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      // Supabase will fire PASSWORD_RECOVERY via onAuthStateChange
      // but sometimes it fires before our listener is set up, so also
      // try to get the current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setReady(true);
        }
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
      // Also handle SIGNED_IN with recovery type (some Supabase versions)
      if (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery')) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // After success: countdown then sign out recovery session and go to login
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) {
      supabase.auth.signOut().then(() => {
        window.history.replaceState(null, '', window.location.pathname);
        onGoLogin?.();
      });
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, onGoLogin]);

  const validate = () => {
    const errs = {};
    if (!newPw)                  errs.newPw = 'New password is required.';
    else if (newPw.length < 8)   errs.newPw = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(newPw)) errs.newPw = 'Include at least one uppercase letter (A–Z).';
    else if (!/[a-z]/.test(newPw)) errs.newPw = 'Include at least one lowercase letter (a–z).';
    else if (!/[0-9]/.test(newPw)) errs.newPw = 'Include at least one number (0–9).';
    if (!confirm)                errs.confirm = 'Please confirm your new password.';
    else if (newPw !== confirm)   errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const { error: authErr } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (authErr) {
      setError(authErr.message);
    } else {
      setDone(true);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <AuthLayout title="Password Updated!" subtitle="Your password has been changed successfully" onExit={handleExit}>
        <motion.div
          initial={{ opacity:0, scale:0.9 }}
          animate={{ opacity:1, scale:1 }}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, textAlign:'center', padding:'20px 0' }}
        >
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(46,125,50,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p style={{ color:'#5a3010', fontSize:13.5, lineHeight:1.65, maxWidth:250, margin:0 }}>
            Your password has been updated successfully.
          </p>
          <div style={{ background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.4)', borderRadius:10, padding:'8px 16px', fontSize:12, color:'#5a3010' }}>
            Redirecting to login in <strong>{countdown}s</strong>…
          </div>
          <p style={{ fontSize:10.5, color:'#9a7545', fontStyle:'italic', maxWidth:240, margin:0 }}>
            Please sign in with your new password.
          </p>
          <AuthButton loading={false} onClick={async () => {
            await supabase.auth.signOut();
            window.history.replaceState(null, '', window.location.pathname);
            onGoLogin?.();
          }} style={{ maxWidth:220 }}>
            Go to Login Now
          </AuthButton>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Waiting for recovery token ─────────────────────────────────────────────
  if (!ready) {
    return (
      <AuthLayout title="Verifying Link…" subtitle="Please wait while we validate your reset link" onExit={handleExit}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'32px 0' }}>
          <div style={{ width:44, height:44, border:'3px solid rgba(139,0,0,0.18)', borderTopColor:'#8B0000', borderRadius:'50%', animation:'spin 0.85s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color:'#7a4e2d', fontSize:13, textAlign:'center', margin:0 }}>
            Validating your reset link…
          </p>
          <p style={{ color:'#9a7545', fontSize:11, fontStyle:'italic', textAlign:'center', maxWidth:240, margin:0 }}>
            If this takes too long, your link may have expired.
          </p>
          <LinkButton onClick={onGoLogin} style={{ fontSize:12 }}>
            ← Request a new reset link
          </LinkButton>
        </div>
      </AuthLayout>
    );
  }

  // ── Reset form ─────────────────────────────────────────────────────────────
  return (
    <AuthLayout title="Reset Password" subtitle="Enter and confirm your new password" onExit={handleExit}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column' }}>
        <AuthInput
          label="New Password"
          type="password"
          value={newPw}
          onChange={e => { setNewPw(e.target.value); setFieldErrors(fe => ({ ...fe, newPw:'' })); }}
          placeholder="Min. 8 chars, 1 uppercase, 1 number"
          error={fieldErrors.newPw}
          autoComplete="new-password"
          disabled={loading}
        />
        <AuthInput
          label="Confirm New Password"
          type="password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setFieldErrors(fe => ({ ...fe, confirm:'' })); }}
          placeholder="Re-enter new password"
          error={fieldErrors.confirm}
          autoComplete="new-password"
          disabled={loading}
        />

        <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.38)', borderRadius:10, padding:'8px 12px', fontSize:11, color:'#5a3010', marginBottom:12, lineHeight:1.7 }}>
          Password must have: at least 8 characters · 1 uppercase letter · 1 lowercase letter · 1 number
        </div>

        <AnimatePresence>
          {error && <ErrorBanner message={error} />}
        </AnimatePresence>

        <AuthButton loading={loading}>Update Password</AuthButton>

        <p style={{ textAlign:'center', marginTop:10, fontSize:11.5, color:'#7a4e2d' }}>
          <LinkButton onClick={onGoLogin} style={{ fontSize:11.5 }}>← Back to Login</LinkButton>
        </p>
      </form>
    </AuthLayout>
  );
}