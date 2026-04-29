// src/Login_SignUp/ForgotPasswordPage.jsx
//
// FIX: Step 2 → Step 3 was failing because verifyOtp was using type:'email'
// but Supabase OTP sent via signInWithOtp uses type:'email' by default for
// magic-link flows. When "Enable Email OTP" is on in Supabase dashboard,
// the token type must be 'email'. However, the session commit was being
// blocked by AuthContext (it swallows SIGNED_IN). We now explicitly call
// supabase.auth.setSession() after verifyOtp so Step 3 can call updateUser.
//
// Also added: responsive font/spacing tweaks consistent with updated AuthLayout.

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';

const PSU_DOMAIN = '@pampangastateu.edu.ph';

function AuthButton({ loading, children, onClick, style = {} }) {
  return (
    <motion.button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading}
      whileTap={{ scale: 0.97 }}
      style={{
        width: '100%', padding: '10px', marginTop: 8,
        background: loading ? 'rgba(139,0,0,0.5)' : '#8B0000',
        color: '#F5E4A8', border: 'none', borderRadius: 22,
        fontSize: 'clamp(11px, 2vw, 13.5px)', fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: "'Crimson Text', Georgia, serif",
        letterSpacing: '0.06em', textTransform: 'uppercase',
        ...style,
      }}
    >
      {loading ? 'Please wait…' : children}
    </motion.button>
  );
}

function LinkButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#8B0000', cursor: 'pointer', fontSize: 'inherit', fontFamily: "'Crimson Text',serif", fontWeight: 700, padding: 0, textDecoration: 'underline' }}>
      {children}
    </button>
  );
}

function AlertBox({ color = 'gold', children }) {
  const configs = {
    gold:  { bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.4)',  icon: 'ℹ️', text: '#5a3010' },
    green: { bg: 'rgba(46,125,50,0.12)',   border: 'rgba(46,125,50,0.35)', icon: '✓',  text: '#2e7d32' },
    red:   { bg: 'rgba(192,57,43,0.1)',    border: 'rgba(192,57,43,0.35)', icon: '⚠',  text: '#c0392b' },
    blue:  { bg: 'rgba(33,150,243,0.08)', border: 'rgba(33,150,243,0.3)', icon: 'ℹ',  text: '#1565c0' },
  };
  const c = configs[color] || configs.gold;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 'clamp(10px, 2vw, 12px)', color: c.text, marginBottom: 12, lineHeight: 1.65, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, fontSize: 13 }}>{c.icon}</span>
      <span>{children}</span>
    </div>
  );
}

function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Enter Email' },
    { n: 2, label: 'Enter Code' },
    { n: 3, label: 'New Password' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 18 }}>
      {steps.map(({ n, label }, i) => {
        const done   = current > n;
        const active = current === n;
        const circleBg     = done ? '#2e7d32' : active ? '#8B0000' : 'transparent';
        const circleBorder = done ? '#2e7d32' : active ? '#8B0000' : 'rgba(139,70,20,0.3)';
        const textColor    = done ? '#2e7d32' : active ? '#8B0000' : '#9a7545';
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 64 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: circleBg, border: `2.5px solid ${circleBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done || active ? '#fff' : '#9a7545',
                fontSize: 13, fontWeight: 700, transition: 'all 0.3s',
              }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : n}
              </div>
              <div style={{ fontSize: 9, color: textColor, marginTop: 4, fontWeight: active ? 700 : 400, textAlign: 'center', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                {label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                height: 2, width: 28, marginTop: 15, flexShrink: 0,
                background: current > n ? '#2e7d32' : 'rgba(139,70,20,0.2)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── STEP 1: Enter Email ───────────────────────────────────────────────────────
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
      options: {
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (error) {
      if (
        error.message.toLowerCase().includes('rate limit') ||
        error.message.toLowerCase().includes('too many') ||
        error.message.toLowerCase().includes('not found') ||
        error.message.toLowerCase().includes('no user') ||
        error.message.toLowerCase().includes('invalid') ||
        error.message.toLowerCase().includes('not registered')
      ) {
        // Proceed silently (don't reveal if email exists)
        onNext(email.trim().toLowerCase());
        return;
      }
      setApiError(error.message);
      return;
    }

    onNext(email.trim().toLowerCase());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <StepIndicator current={1} />

      <AlertBox color="gold">
        Enter your PSU email and we'll send you a <strong>6-digit verification code</strong> to reset your password.
      </AlertBox>

      <AuthInput
        label="PSU Email Address"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setFieldErr(''); }}
        placeholder={`e.g. 2023929321${PSU_DOMAIN}`}
        error={fieldErr}
        autoComplete="email"
        disabled={loading}
      />

      {apiError && <AlertBox color="red">{apiError}</AlertBox>}

      <AuthButton loading={loading}>Send Verification Code</AuthButton>

      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#7a4e2d' }}>
        Remember your password? <LinkButton onClick={onGoLogin}>Login here</LinkButton>
      </p>
    </form>
  );
}

// ── STEP 2: Enter 6-digit OTP Code ───────────────────────────────────────────
function Step2({ email, onNext, onGoLogin }) {
  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [resent,    setResent]    = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (code.length < 6) { setError('Please enter the full 6-digit code.'); return; }
    setLoading(true);

    // ── KEY FIX ──────────────────────────────────────────────────────────────
    // verifyOtp with type:'email' establishes the recovery session.
    // We capture the session from the response and manually set it so that
    // Step 3's updateUser call has an active auth session, even though
    // AuthContext blocks the SIGNED_IN event for captcha reasons.
    // ─────────────────────────────────────────────────────────────────────────
    const { data, error: otpErr } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (otpErr) {
      setLoading(false);
      setError('Invalid or expired code. Please try again or request a new one.');
      setCode('');
      return;
    }

    // If verifyOtp returns a session, explicitly set it so the client is authenticated
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
      email,
      options: { shouldCreateUser: false },
    });
    setResending(false);
    if (!error) {
      setResent(true);
      setCode('');
    } else if (
      error.message.toLowerCase().includes('rate limit') ||
      error.message.toLowerCase().includes('too many')
    ) {
      setError('Too many requests — please wait a few minutes before requesting a new code.');
    } else {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <StepIndicator current={2} />

      <AlertBox color="gold">
        A <strong>6-digit code</strong> was sent to <strong>{email}</strong>. Check your inbox and spam folder.
      </AlertBox>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#5a3010', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Verification Code
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={handleChange}
          placeholder="000000"
          maxLength={6}
          style={{
            width: '100%', padding: '12px 16px', boxSizing: 'border-box',
            borderRadius: 10, border: `1.5px solid ${error ? 'rgba(192,57,43,0.8)' : 'rgba(139,70,20,0.3)'}`,
            background: 'rgba(255,250,238,0.9)', color: '#3d1f00',
            fontSize: 'clamp(20px, 5vw, 28px)', letterSpacing: '0.5em', fontFamily: 'monospace',
            outline: 'none', textAlign: 'center', transition: 'border-color 0.2s',
          }}
        />
        {error && (
          <p style={{ margin: '4px 0 0 4px', fontSize: 10, color: '#c0392b', fontStyle: 'italic' }}>{error}</p>
        )}
      </div>

      <AlertBox color="blue">
        <div>
          <strong>Code expires in 60 minutes.</strong><br />
          Didn't receive it? Check spam or{' '}
          <button type="button" onClick={handleResend} disabled={resending}
            style={{ background: 'none', border: 'none', color: '#1565c0', cursor: resending ? 'not-allowed' : 'pointer', fontWeight: 700, padding: 0, fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }}>
            {resending ? 'sending…' : 'request a new code.'}
          </button>
        </div>
      </AlertBox>

      {resent && <AlertBox color="green">A new code has been sent! Check your inbox.</AlertBox>}

      <AuthButton loading={loading}>Verify Code</AuthButton>

      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#7a4e2d' }}>
        <LinkButton onClick={onGoLogin}>← Back to Login</LinkButton>
      </p>
    </form>
  );
}

// ── STEP 3: Set New Password ──────────────────────────────────────────────────
function Step3({ onGoLogin }) {
  const [newPw,       setNewPw]       = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [countdown,   setCountdown]   = useState(5);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError,    setApiError]    = useState('');

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

    // ── KEY FIX ──────────────────────────────────────────────────────────────
    // updateUser requires an active session. We check the session first.
    // If somehow the session was lost, we show a helpful error.
    // ─────────────────────────────────────────────────────────────────────────
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setLoading(false);
      setApiError('Your session expired. Please go back and request a new code.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (error) {
      setApiError(error.message);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '16px 0' }}>
        <StepIndicator current={4} />
        <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(46,125,50,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: '#5a3010', fontSize: 'clamp(12px, 2vw, 13.5px)', lineHeight: 1.65, margin: 0 }}>
          <strong>Password reset successfully!</strong><br />
          You can now log in with your new password.
        </p>
        <div style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, padding: '8px 20px', fontSize: 13, color: '#5a3010' }}>
          Redirecting to login in <strong>{countdown}s</strong>…
        </div>
        <AuthButton loading={false} onClick={async () => {
          await supabase.auth.signOut();
          window.history.replaceState(null, '', window.location.pathname);
          onGoLogin?.();
        }} style={{ maxWidth: 220 }}>
          Go to Login Now
        </AuthButton>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <StepIndicator current={3} />

      <AlertBox color="green">
        <strong>Code verified!</strong> Now create your new password.
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

      <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 10, padding: '7px 11px', fontSize: 10.5, color: '#5a3010', marginBottom: 10, lineHeight: 1.7 }}>
        Password must have: at least 8 characters · 1 uppercase · 1 lowercase · 1 number
      </div>

      {apiError && <AlertBox color="red">{apiError}</AlertBox>}

      <AuthButton loading={loading}>Reset Password</AuthButton>

      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11.5, color: '#7a4e2d' }}>
        <LinkButton onClick={onGoLogin}>← Back to Login</LinkButton>
      </p>
    </form>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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
    2: `Enter the 6-digit code sent to your email`,
    3: 'Create your new password',
  };

  return (
    <AuthLayout title={titles[step]} subtitle={subtitles[step]} onExit={handleExit}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && (
            <Step1
              onNext={e => { setEmail(e); setStep(2); }}
              onGoLogin={onGoLogin}
            />
          )}
          {step === 2 && (
            <Step2
              email={email}
              onNext={() => setStep(3)}
              onGoLogin={onGoLogin}
            />
          )}
          {step === 3 && (
            <Step3 onGoLogin={onGoLogin} />
          )}
        </motion.div>
      </AnimatePresence>
    </AuthLayout>
  );
}