import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';


const C = {
  maroon:     '#8B0000',
  maroonDark: '#6B0000',
  gold:       '#C9A84C',
  goldLight:  'rgba(201,168,76,0.14)',
  goldBorder: 'rgba(201,168,76,0.38)',
  cream:      'rgba(255,250,238,0.92)',
  inkDark:    '#3d1f00',
  inkMid:     '#5a3010',
  inkLight:   '#7a4020',
  inkFaint:   '#9a7545',
  green:      '#2e7d32',
  greenLight: 'rgba(46,125,50,0.11)',
  greenBorder:'rgba(46,125,50,0.35)',
  red:        '#c0392b',
  redLight:   'rgba(192,57,43,0.09)',
  redBorder:  'rgba(192,57,43,0.3)',
  border:     'rgba(139,70,20,0.28)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY    = "'Crimson Pro', Georgia, serif";
const FONT_SANS    = "'Josefin Sans', sans-serif";


function PrimaryButton({ loading, children, onClick, disabled, style = {} }) {
  const off = loading || disabled;
  return (
    <motion.button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={off}
      whileTap={!off ? { scale: 0.97 } : {}}
      whileHover={!off ? { boxShadow: '0 6px 22px rgba(139,0,0,0.42)' } : {}}
      style={{
        width: '100%', padding: '11px 0', marginTop: 14,
        background: off
          ? 'rgba(139,0,0,0.32)'
          : `linear-gradient(135deg, ${C.maroon} 0%, ${C.maroonDark} 100%)`,
        color: '#F5E4A8', border: 'none', borderRadius: 22,
        fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: off ? 'not-allowed' : 'pointer',
        boxShadow: off ? 'none' : '0 4px 18px rgba(139,0,0,0.28)',
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 12, height: 12,
            border: '2px solid rgba(245,228,168,0.35)', borderTopColor: '#F5E4A8',
            borderRadius: '50%', animation: 'rpSpin 0.75s linear infinite',
          }} />
          Please wait…
        </span>
      ) : children}
    </motion.button>
  );
}

function LinkBtn({ onClick, children, style = {} }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: 'none', border: 'none', color: C.maroon, cursor: 'pointer',
      fontFamily: FONT_BODY, fontSize: 'inherit', fontWeight: 700,
      padding: 0, textDecoration: 'underline', ...style,
    }}>
      {children}
    </button>
  );
}

function BackToLoginBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ textAlign: 'center', marginTop: 14 }}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: hov ? 'rgba(139,0,0,0.07)' : 'transparent',
          border: `1.5px solid ${hov ? 'rgba(139,0,0,0.30)' : 'rgba(139,0,0,0.16)'}`,
          borderRadius: 20, padding: '7px 18px',
          cursor: 'pointer', color: C.maroon,
          fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600,
          transition: 'all 0.18s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Login
      </button>
    </div>
  );
}

function AlertBox({ color = 'gold', children }) {
  const cfg = {
    gold:  { bg: C.goldLight,  border: C.goldBorder,  text: C.inkMid },
    green: { bg: C.greenLight, border: C.greenBorder, text: C.green  },
    red:   { bg: C.redLight,   border: C.redBorder,   text: C.red    },
  };
  const c = cfg[color] || cfg.gold;
  const Icon = color === 'green' ? CheckIcon : color === 'red' ? WarnIcon : InfoIcon;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 10, padding: '10px 13px',
        fontSize: 12.5, fontFamily: FONT_BODY, color: c.text,
        marginBottom: 14, lineHeight: 1.65,
        display: 'flex', gap: 9, alignItems: 'flex-start',
      }}
    >
      <Icon size={14} color={c.text} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </motion.div>
  );
}

function InfoIcon({ size = 14, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function CheckIcon({ size = 14, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={style}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function WarnIcon({ size = 14, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(139,70,20,0.13)' }} />
      <svg width="9" height="9" viewBox="0 0 10 10">
        <polygon points="5,1 9,5 5,9 1,5" fill="none" stroke={C.gold} strokeWidth="1.2" />
      </svg>
      <div style={{ flex: 1, height: 1, background: 'rgba(139,70,20,0.13)' }} />
    </div>
  );
}


export default function ResetPasswordPage({ onGoLogin, onResetSuccess, onGoLanding }) {
  const handleExit = onGoLanding || (() => { window.location.href = '/'; });

  const [ready,       setReady]       = useState(false);
  const [newPw,       setNewPw]       = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [countdown,   setCountdown]   = useState(5);

  const calcStrength = useCallback(() => {
    let s = 0;
    if (newPw.length >= 8)          s++;
    if (/[A-Z]/.test(newPw))        s++;
    if (/[a-z]/.test(newPw))        s++;
    if (/[0-9]/.test(newPw))        s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  }, [newPw]);

  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColor = ['', C.red, '#e67e22', '#d4ac0d', '#27ae60', C.green];
  const s = calcStrength();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setReady(true);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
      if (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery')) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    if (!newPw)                    errs.newPw  = 'New password is required.';
    else if (newPw.length < 8)     errs.newPw  = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(newPw)) errs.newPw  = 'Include at least one uppercase letter (A–Z).';
    else if (!/[a-z]/.test(newPw)) errs.newPw  = 'Include at least one lowercase letter (a–z).';
    else if (!/[0-9]/.test(newPw)) errs.newPw  = 'Include at least one number (0–9).';
    if (!confirm)                  errs.confirm = 'Please confirm your new password.';
    else if (newPw !== confirm)    errs.confirm = 'Passwords do not match.';
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
    if (authErr) setError(authErr.message);
    else         setDone(true);
  };

  
  if (done) {
    return (
      <>
        <style>{`@keyframes rpSpin { to { transform: rotate(360deg); } }`}</style>
        <AuthLayout title="Password Updated!" subtitle="Your password has been changed successfully" onExit={handleExit}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '10px 0' }}
          >
            <Divider />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
              style={{
                width: 66, height: 66, borderRadius: '50%',
                background: C.greenLight, border: `2px solid ${C.greenBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            <div>
              <p style={{ color: C.inkMid, fontSize: 15, fontFamily: FONT_BODY, fontWeight: 600, margin: '0 0 4px' }}>
                Your password has been updated!
              </p>
              <p style={{ color: C.inkFaint, fontSize: 12, fontFamily: FONT_BODY, fontStyle: 'italic', margin: 0 }}>
                Please sign in with your new password.
              </p>
            </div>

            <div style={{
              background: C.goldLight, border: `1px solid ${C.goldBorder}`,
              borderRadius: 10, padding: '9px 24px',
              fontSize: 12.5, fontFamily: FONT_BODY, color: C.inkMid,
            }}>
              Redirecting to login in <strong style={{ color: C.maroon }}>{countdown}s</strong>…
            </div>

            <PrimaryButton loading={false} onClick={async () => {
              await supabase.auth.signOut();
              window.history.replaceState(null, '', window.location.pathname);
              onGoLogin?.();
            }} style={{ maxWidth: 220, marginTop: 4 }}>
              Go to Login Now
            </PrimaryButton>
          </motion.div>
        </AuthLayout>
      </>
    );
  }


  if (!ready) {
    return (
      <>
        <style>{`@keyframes rpSpin { to { transform: rotate(360deg); } }`}</style>
        <AuthLayout title="Verifying Link…" subtitle="Please wait while we validate your reset link" onExit={handleExit}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '28px 0' }}>
            <div style={{
              width: 48, height: 48,
              border: `3px solid rgba(139,0,0,0.15)`,
              borderTopColor: C.maroon,
              borderRadius: '50%',
              animation: 'rpSpin 0.85s linear infinite',
            }} />

            <div style={{ textAlign: 'center' }}>
              <p style={{ color: C.inkMid, fontSize: 13.5, fontFamily: FONT_BODY, margin: '0 0 6px' }}>
                Validating your reset link…
              </p>
              <p style={{ color: C.inkFaint, fontSize: 11.5, fontFamily: FONT_BODY, fontStyle: 'italic', margin: 0, maxWidth: 240 }}>
                If this takes too long, your link may have expired.
              </p>
            </div>

            <div style={{
              background: C.goldLight, border: `1px solid ${C.goldBorder}`,
              borderRadius: 10, padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontFamily: FONT_BODY, color: C.inkMid,
            }}>
              <InfoIcon size={13} color={C.inkFaint} />
              Link expires after one use.
            </div>

            <p style={{ fontSize: 12, fontFamily: FONT_BODY, color: C.inkLight, margin: 0 }}>
              <LinkBtn onClick={onGoLogin} style={{ fontSize: 12 }}>
                ← Request a new reset link
              </LinkBtn>
            </p>
          </div>
        </AuthLayout>
      </>
    );
  }

 
  return (
    <>
      <style>{`@keyframes rpSpin { to { transform: rotate(360deg); } }`}</style>
      <AuthLayout title="Reset Password" subtitle="Enter and confirm your new password" onExit={handleExit}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <Divider />

          <AlertBox color="gold">
            Choose a strong new password for your account. You'll use it to sign in from now on.
          </AlertBox>

          <AuthInput
            label="New Password"
            type="password"
            value={newPw}
            onChange={e => { setNewPw(e.target.value); setFieldErrors(fe => ({ ...fe, newPw: '' })); }}
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            error={fieldErrors.newPw}
            autoComplete="new-password"
            disabled={loading}
          />

      
          {newPw.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: -5, marginBottom: 10 }}
            >
              <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                {[1,2,3,4,5].map(i => (
                  <motion.div
                    key={i}
                    animate={{ background: i <= s ? strengthColor[s] : 'rgba(139,70,20,0.14)' }}
                    transition={{ duration: 0.28 }}
                    style={{ flex: 1, height: 3, borderRadius: 2 }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 10, color: strengthColor[s], fontFamily: FONT_SANS, fontWeight: 600, letterSpacing: '0.04em' }}>
                {strengthLabel[s]}
              </div>
            </motion.div>
          )}

          <AuthInput
            label="Confirm New Password"
            type="password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setFieldErrors(fe => ({ ...fe, confirm: '' })); }}
            placeholder="Re-enter new password"
            error={fieldErrors.confirm}
            autoComplete="new-password"
            disabled={loading}
          />

         
          <div style={{
            background: C.goldLight, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10, padding: '10px 13px',
            fontSize: 11.5, color: C.inkMid, marginBottom: 12,
            lineHeight: 1.75, fontFamily: FONT_BODY,
          }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7, color: C.inkMid, textAlign: 'center' }}>
              Requirements
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px 18px' }}>
              {[
                [newPw.length >= 8,   '8+ characters'],
                [/[A-Z]/.test(newPw), '1 uppercase'  ],
                [/[a-z]/.test(newPw), '1 lowercase'  ],
                [/[0-9]/.test(newPw), '1 number'     ],
              ].map(([met, label]) => (
                <motion.span
                  key={label}
                  animate={{ color: met ? C.green : C.inkFaint }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11 }}
                >
                  {met
                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
                  }
                  {label}
                </motion.span>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AlertBox color="red">{error}</AlertBox>
              </motion.div>
            )}
          </AnimatePresence>

          <PrimaryButton loading={loading}>Update Password</PrimaryButton>

          <BackToLoginBtn onClick={onGoLogin} />
        </form>
      </AuthLayout>
    </>
  );
}