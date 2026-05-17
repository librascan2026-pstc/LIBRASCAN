import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';

const C = {
  maroon:       '#8B0000',
  maroonDark:   '#6B0000',
  maroonBorder: 'rgba(139,0,0,0.22)',
  gold:         '#C9A84C',
  goldLight:    'rgba(201,168,76,0.14)',
  goldBorder:   'rgba(201,168,76,0.38)',
  cream:        'rgba(255,250,238,0.92)',
  inkDark:      '#3d1f00',
  inkMid:       '#5a3010',
  inkLight:     '#7a4020',
  inkFaint:     '#9a7545',
  green:        '#2e7d32',
  greenLight:   'rgba(46,125,50,0.11)',
  greenBorder:  'rgba(46,125,50,0.35)',
  red:          '#c0392b',
  redLight:     'rgba(192,57,43,0.09)',
  redBorder:    'rgba(192,57,43,0.3)',
  blue:         '#1a5276',
  blueLight:    'rgba(26,82,118,0.07)',
  blueBorder:   'rgba(26,82,118,0.24)',
  border:       'rgba(139,70,20,0.28)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY    = "'Crimson Pro', Georgia, serif";
const FONT_SANS    = "'Josefin Sans', sans-serif";
const FONT_MONO    = "'Courier New', monospace";

const PSU_DOMAIN = '@pampangastateu.edu.ph';

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
            borderRadius: '50%', animation: 'fpSpin 0.75s linear infinite',
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
          textDecoration: 'none',
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
    gold:  { bg: C.goldLight,  border: C.goldBorder,  text: C.inkMid, IconEl: InfoIcon  },
    green: { bg: C.greenLight, border: C.greenBorder, text: C.green,  IconEl: CheckIcon },
    red:   { bg: C.redLight,   border: C.redBorder,   text: C.red,    IconEl: WarnIcon  },
    blue:  { bg: C.blueLight,  border: C.blueBorder,  text: C.blue,   IconEl: InfoIcon  },
  };
  const c = cfg[color] || cfg.gold;
  const Icon = c.IconEl;
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

function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Enter Email'  },
    { n: 2, label: 'Enter Code'   },
    { n: 3, label: 'New Password' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 18 }}>
      {steps.map(({ n, label }, i) => {
        const done   = current > n;
        const active = current === n;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <motion.div
              animate={{ opacity: done || active ? 1 : 0.5 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 82 }}
            >
              <motion.div
                animate={{
                  background: done ? C.green : active ? C.maroon : 'transparent',
                  borderColor: done ? C.green : active ? C.maroon : C.border,
                  scale: active ? 1.07 : 1,
                  boxShadow: active ? `0 2px 14px rgba(139,0,0,0.22)` : '0 0 0 rgba(0,0,0,0)',
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: `2px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: (done || active) ? '#fff' : C.inkFaint,
                  fontSize: 13, fontWeight: 700, fontFamily: FONT_SANS,
                }}
              >
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  : n
                }
              </motion.div>
              <div style={{
                fontSize: 9, marginTop: 5, fontFamily: FONT_SANS,
                fontWeight: active ? 700 : 400, textAlign: 'center',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: done ? C.green : active ? C.maroon : C.inkFaint,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </div>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                animate={{ background: current > n ? C.green : 'rgba(139,70,20,0.18)' }}
                transition={{ duration: 0.4 }}
                style={{ height: 2, width: 18, marginTop: 16, flexShrink: 0, borderRadius: 2 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(139,70,20,0.13)' }} />
      <svg width="9" height="9" viewBox="0 0 10 10">
        <polygon points="5,1 9,5 5,9 1,5" fill="none" stroke={C.gold} strokeWidth="1.2" />
      </svg>
      <div style={{ flex: 1, height: 1, background: 'rgba(139,70,20,0.13)' }} />
    </div>
  );
}

function Step1({ onNext, onGoLogin }) {
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [fieldErr, setFieldErr] = useState('');
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setApiError('');
    if (!email.trim()) { setFieldErr('Email address is required.'); return; }
    if (!email.trim().toLowerCase().endsWith(PSU_DOMAIN)) {
      setFieldErr(`Must be a ${PSU_DOMAIN} address.`); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErr('Enter a valid email address.'); return;
    }
    setFieldErr('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many') ||
          msg.includes('not found')  || msg.includes('no user') ||
          msg.includes('invalid')    || msg.includes('not registered')) {
        onNext(email.trim().toLowerCase()); return;
      }
      setApiError(error.message); return;
    }
    onNext(email.trim().toLowerCase());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <StepIndicator current={1} />
      <Divider />

      <AlertBox color="gold">
        Enter your PSU email and we'll send you a{' '}
        <strong style={{ color: C.maroon }}>6-digit verification code</strong>{' '}
        to reset your password.
      </AlertBox>

      <AuthInput
        label="Email Address"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setFieldErr(''); }}
        placeholder={`e.g. 2023929321${PSU_DOMAIN}`}
        error={fieldErr}
        autoComplete="email"
        disabled={loading}
      />

      <AnimatePresence>
        {apiError && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertBox color="red">{apiError}</AlertBox>
          </motion.div>
        )}
      </AnimatePresence>

      <PrimaryButton loading={loading}>Send Verification Code</PrimaryButton>

      <BackToLoginBtn onClick={onGoLogin} />
    </form>
  );
}

function Step2({ email, onNext, onGoLogin }) {
  const [digits,    setDigits]    = useState(Array(6).fill(''));
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [resent,    setResent]    = useState(false);
  const [resending, setResending] = useState(false);
  const refs = useRef([]);

  const code = digits.join('');

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const handleChange = (i, val) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError('');
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft'  && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError('');
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (code.length < 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);

    const { data, error: otpErr } = await supabase.auth.verifyOtp({
      email, token: code, type: 'email',
    });

    if (otpErr) {
      setLoading(false);
      setError('Invalid or expired code. Please try again or request a new one.');
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
      return;
    }

    if (data?.session) {
      await supabase.auth.setSession({
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }
    setLoading(false);
    onNext();
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { shouldCreateUser: false },
    });
    setResending(false);
    if (!error) {
      setResent(true);
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    } else if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('too many')) {
      setError('Too many requests — please wait a few minutes before requesting a new code.');
    } else {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <StepIndicator current={2} />
      <Divider />

      <div style={{
        background: C.goldLight, border: `1px solid ${C.goldBorder}`,
        borderRadius: 10, padding: '10px 14px',
        marginBottom: 14, fontFamily: FONT_BODY,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(201,168,76,0.20)', border: `1.5px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.inkMid} strokeWidth="2" strokeLinecap="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div style={{ fontSize: 12.5, color: C.inkMid, lineHeight: 1.7 }}>
          A <strong style={{ color: C.maroon }}>6-digit code</strong> was sent to{' '}
          <strong style={{ color: C.inkDark }}>{email}</strong>.{' '}
          Check your inbox and spam folder.
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, fontFamily: FONT_SANS,
          color: C.inkMid, marginBottom: 10,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Verification Code
        </div>

        <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }}>
          {digits.map((d, i) => (
            <motion.input
              key={i}
              ref={el => refs.current[i] = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              whileFocus={{ scale: 1.06, boxShadow: `0 0 0 3px rgba(139,0,0,0.12)` }}
              style={{
                width: 42, height: 52, textAlign: 'center',
                fontSize: 22, fontFamily: FONT_MONO, fontWeight: 700,
                color: C.inkDark,
                border: `2px solid ${error ? C.redBorder : d ? C.maroon : C.border}`,
                borderRadius: 10,
                background: d ? 'rgba(139,0,0,0.04)' : C.cream,
                outline: 'none', cursor: 'text',
                transition: 'border-color 0.18s, background 0.18s',
                boxShadow: d ? `0 2px 8px rgba(139,0,0,0.10)` : 'none',
              }}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              key="err"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                margin: '7px 0 0', fontSize: 11, color: C.red,
                fontStyle: 'italic', textAlign: 'center', fontFamily: FONT_BODY,
              }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div style={{
        background: C.blueLight, border: `1px solid ${C.blueBorder}`,
        borderRadius: 10, padding: '10px 14px',
        fontSize: 12, fontFamily: FONT_BODY, color: C.blue,
        marginBottom: 12, lineHeight: 1.7,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(26,82,118,0.10)', border: `1.5px solid ${C.blueBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}>
          <InfoIcon size={13} color={C.blue} />
        </div>
        <div>
          <strong>Code expires in 60 minutes.</strong>{' '}
          Didn't receive it? Check spam or{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{
              background: 'none', border: 'none', color: C.blue,
              cursor: resending ? 'not-allowed' : 'pointer',
              fontWeight: 700, padding: 0, fontSize: 'inherit',
              fontFamily: 'inherit', textDecoration: 'underline',
            }}
          >
            {resending ? 'sending…' : 'request a new code.'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {resent && (
          <motion.div key="resent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertBox color="green">A new code has been sent! Check your inbox.</AlertBox>
          </motion.div>
        )}
      </AnimatePresence>

      <PrimaryButton loading={loading} disabled={code.length < 6}>Verify Code</PrimaryButton>

      <BackToLoginBtn onClick={onGoLogin} />
    </form>
  );
}

function Step3({ onGoLogin }) {
  const [newPw,       setNewPw]       = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [countdown,   setCountdown]   = useState(5);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError,    setApiError]    = useState('');

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
    if (!confirm)                  errs.confirm = 'Please confirm your password.';
    else if (newPw !== confirm)    errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setApiError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setLoading(false);
      setApiError('Your session expired. Please go back and request a new code.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (error) setApiError(error.message);
    else       setDone(true);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '10px 0' }}
      >
        <StepIndicator current={4} />
        <Divider />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
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
            Password reset successfully!
          </p>
          <p style={{ color: C.inkFaint, fontSize: 12, fontFamily: FONT_BODY, fontStyle: 'italic', margin: 0 }}>
            You can now log in with your new password.
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
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <StepIndicator current={3} />
      <Divider />

      <AlertBox color="green">
        <strong>Code verified!</strong> Now create your new secure password.
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
        fontSize: 11.5, color: C.inkMid, marginBottom: 12, lineHeight: 1.75,
        fontFamily: FONT_BODY,
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
        {apiError && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertBox color="red">{apiError}</AlertBox>
          </motion.div>
        )}
      </AnimatePresence>

      <PrimaryButton loading={loading}>Reset Password</PrimaryButton>

      <BackToLoginBtn onClick={onGoLogin} />
    </form>
  );
}

export default function ForgotPasswordPage({ onGoLogin, onGoLanding }) {
  const [step,  setStep]  = useState(1);
  const [email, setEmail] = useState('');

  const handleExit = onGoLanding || (() => { window.location.href = '/'; });

  const titles = {
    1: 'Forgot Password?',
    2: 'Enter Your Code',
    3: 'Reset Password',
  };
  const subtitles = {
    1: "Enter your email — we'll send a 6-digit code",
    2: 'Enter the 6-digit code sent to your email',
    3: 'Create your new password',
  };

  return (
    <>
      <style>{`@keyframes fpSpin { to { transform: rotate(360deg); } }`}</style>
      <AuthLayout title={titles[step]} subtitle={subtitles[step]} onExit={handleExit}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -22 }}
            transition={{ duration: 0.24, ease: [0.32, 0, 0.18, 1] }}
          >
            {step === 1 && <Step1 onNext={e => { setEmail(e); setStep(2); }} onGoLogin={onGoLogin} />}
            {step === 2 && <Step2 email={email} onNext={() => setStep(3)} onGoLogin={onGoLogin} />}
            {step === 3 && <Step3 onGoLogin={onGoLogin} />}
          </motion.div>
        </AnimatePresence>
      </AuthLayout>
    </>
  );
}