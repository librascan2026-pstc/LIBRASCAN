import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './useAuth';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthCaptcha from './AuthCaptcha';
import {
  checkMfaRequired, sendOtp, verifyOtp, forgetThisDevice,
  sendLoginConfirmation, getLoginConfirmationStatus, markMfaPending,
  onLoginConfirmationPing, recordSession, clearMfaPending,
} from '../utils/mfaClient';
import { recordUntrustedLoginAlert } from '../utils/securityAlerts';
import GoogleSignInButton from './GoogleSignInButton';
import GoogleProfileSetup from './GoogleProfileSetup';
import { checkGoogleAccount } from '../utils/googleAuthClient';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY    = "'Crimson Pro', Georgia, serif";
const FONT_SANS    = "'Josefin Sans', sans-serif";

const REMEMBER_KEY = 'lm_remember_email';
const AUTO_LOGIN_DELAY_MS = 2000; // short pause so the person can hit "Not you?"

// The password is NEVER kept in localStorage. It goes into the browser's own
// password manager (Chrome/Edge Credential Management API), which stores it
// encrypted and hands it back to this page on the next visit.
const canUseCredentialApi = () =>
  typeof window !== 'undefined' && !!window.PasswordCredential && !!navigator.credentials;

async function saveBrowserCredential(id, password) {
  try {
    if (!canUseCredentialApi()) return;
    await navigator.credentials.store(new window.PasswordCredential({ id, password, name: id }));
  } catch { /* browser declined or unavailable */ }
}

function BackToLoginBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
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
        cursor: 'pointer', color: '#8B0000',
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
  );
}

function PrimaryButton({ loading, children, onClick, disabled, style = {} }) {
  const off = loading || disabled;
  return (
    <motion.button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={off}
      whileTap={!off ? { scale: 0.97 } : {}}
      style={{
        width: '100%', padding: '11px 0', marginTop: 14,
        background: off
          ? 'rgba(139,0,0,0.35)'
          : 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
        color: '#F5E4A8', border: 'none', borderRadius: 22,
        fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: off ? 'not-allowed' : 'pointer',
        boxShadow: off ? 'none' : '0 4px 18px rgba(139,0,0,0.35)',
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {loading ? 'Signing in…' : children}
    </motion.button>
  );
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function LinkBtn({ onClick, children, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none', color: '#8B0000',
        cursor: 'pointer', fontFamily: FONT_BODY,
        fontSize: 'inherit', fontWeight: 600, padding: 0,
        textDecoration: 'underline', ...style,
      }}
    >
      {children}
    </button>
  );
}

// "x****b@domain.com" — same masking style as the "Check your emails" screen.
function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}****${local[local.length - 1]}@${domain}`;
}

// First name if we have it from signup metadata, else the email's local
// part, else a plain fallback — used for the small "Name · LibraScan" line.
function pendingDisplayName(user) {
  const meta = user?.user_metadata || {};
  const full = [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user?.email) return user.email.split('@')[0];
  return 'there';
}

function ErrorBox({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        background: 'rgba(192,57,43,0.09)',
        border: '1px solid rgba(192,57,43,0.3)',
        borderRadius: 10, padding: '9px 14px',
        fontSize: 12.5, fontFamily: FONT_BODY,
        color: '#b03020', marginBottom: 10, lineHeight: 1.55,
      }}
    >
      {message}
    </motion.div>
  );
}

// Six separate digit boxes driven by ONE real (invisible) input laid over
// them, so typing, backspace, paste and the browser's "one-time-code"
// autofill all still work exactly like a normal single input.
function OtpInput({ value, onChange, disabled, error }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const activeIdx = Math.min(value.length, 5);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <motion.div
      animate={error ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      style={{ position: 'relative' }}
    >
      <style>{'@keyframes lm-caret { 0%,100% { opacity: 1; } 50% { opacity: 0; } }'}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 7 }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const digit  = value[i] || '';
          const active = focused && !disabled && i === activeIdx;
          const border = error
            ? '#C0392B'
            : active ? '#8B0000'
            : digit  ? 'rgba(139,0,0,0.45)'
            : 'rgba(139,70,20,0.28)';
          return (
            <div
              key={i}
              style={{
                height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9, boxSizing: 'border-box',
                border: `1.25px solid ${border}`,
                background: disabled
                  ? 'rgba(230,215,190,0.5)'
                  : digit ? 'rgba(250,242,218,0.95)' : 'rgba(246,234,204,0.8)',
                boxShadow: active ? '0 0 0 2px rgba(139,0,0,0.10)' : '0 1px 2px rgba(90,40,0,0.06)',
                fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: '#5E1119',
                transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
              }}
            >
              {digit || (active && (
                <span style={{
                  width: 2, height: 18, background: '#8B0000', borderRadius: 1,
                  animation: 'lm-caret 1s steps(1) infinite',
                }} />
              ))}
            </div>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit verification code"
        maxLength={6}
        value={value}
        disabled={disabled}
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: disabled ? 'not-allowed' : 'text',
          fontSize: 16, // >=16px stops iOS zooming in on focus
          border: 'none', outline: 'none', background: 'transparent', caretColor: 'transparent',
        }}
      />
    </motion.div>
  );
}

// Small borderless "Resend" button with a live countdown. Disabled (and
// greyed) while the cooldown is running; underlined when it can be clicked.
function ResendPill({ seconds, onClick, idleLabel, outlined = false }) {
  const waiting = seconds > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={waiting}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        background: 'none', border: 'none', boxShadow: 'none',
        padding: '4px 2px',
        color: waiting ? '#a07a6c' : outlined ? '#5E1119' : '#8B0000',
        fontFamily: FONT_BODY, fontSize: outlined ? 11.5 : 12, fontWeight: 700,
        textDecoration: waiting ? 'none' : 'underline',
        cursor: waiting ? 'not-allowed' : 'pointer',
        transition: 'color 0.18s',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      {waiting ? `Resend in ${seconds}s` : idleLabel}
    </button>
  );
}

function RememberMe({ checked, onChange }) {
  const [hovered, setHovered] = useState(false);

  return (
    <label
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        cursor: 'pointer', userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${checked ? '#8B0000' : hovered ? 'rgba(139,0,0,0.55)' : 'rgba(139,70,20,0.40)'}`,
        background: checked ? '#8B0000' : 'rgba(255,252,242,0.85)',
        transition: 'all 0.16s',
        boxShadow: checked ? '0 1px 6px rgba(139,0,0,0.25)' : 'none',
      }}>
        {checked && (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#F5E4A8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
      </span>

      <span style={{
        fontFamily: FONT_BODY,
        fontSize: 12.5,
        color: hovered ? '#5a2800' : '#7a4020',
        transition: 'color 0.16s',
      }}>
        Remember me
      </span>
    </label>
  );
}

export default function LoginPage({ onGoSignup, onGoForgot, onLoginSuccess, onGoLanding }) {
  const { signIn, signInWithGoogleIdToken, commitUser, signOut } = useAuth();

  const [screen,        setScreen]        = useState('login');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [rememberMe,    setRememberMe]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSetup,   setGoogleSetup]   = useState(null); // first-time Google profile completion
  const [error,       setError]       = useState('');
  const [unverified,  setUnverified]  = useState(null);   // email awaiting confirmation
  const [resendNote,  setResendNote]  = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingUser, setPendingUser] = useState(null);
  const [captchaOk,   setCaptchaOk]  = useState(false);

  // --- Email OTP (2FA) state — now the "try another way" fallback ---
  const [mfaChecking, setMfaChecking] = useState(false);
  const [otpValue,    setOtpValue]    = useState('');
  const [otpError,    setOtpError]    = useState('');
  const [otpBusy,     setOtpBusy]     = useState(false);
  const [otpResent,   setOtpResent]   = useState(false);
  const [resendIn,    setResendIn]    = useState(45);
  const resendTimer = useRef(null);

  // --- Email "Yes, it's me" / "No, secure my account" (2FA) state — the
  // default prompt for an untrusted device ---
  const [confirmRequestId, setConfirmRequestId] = useState(null);
  const [confirmStatus,    setConfirmStatus]    = useState('pending'); // pending|denied|expired
  const [confirmError,     setConfirmError]     = useState('');
  const [confirmResent,    setConfirmResent]    = useState(false);
  const [confirmResendIn,  setConfirmResendIn]  = useState(45);
  const confirmPollRef     = useRef(null);
  const confirmResendTimer = useRef(null);

  // --- Remember-me auto sign-in state ---
  const [autoUser, setAutoUser] = useState(null); // email being auto-signed-in, or null
  const autoTimer    = useRef(null);
  const autoLoginRef = useRef(null); // always points at the latest doLogin

  const startResendCooldown = () => {
    setResendIn(45);
    clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendIn(s => {
        if (s <= 1) { clearInterval(resendTimer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };
  useEffect(() => () => clearInterval(resendTimer.current), []);

  const startConfirmResendCooldown = () => {
    setConfirmResendIn(45);
    clearInterval(confirmResendTimer.current);
    confirmResendTimer.current = setInterval(() => {
      setConfirmResendIn(s => {
        if (s <= 1) { clearInterval(confirmResendTimer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };
  useEffect(() => () => {
    clearInterval(confirmResendTimer.current);
    clearInterval(confirmPollRef.current);
  }, []);

  const handleExit = onGoLanding || (() => { window.location.href = '/'; });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // Remember me → offer to sign straight back in using the credential the
  // browser saved. Silent: no popup, and does nothing if none is stored (or
  // the browser has more than one saved account for this site).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let remembered = null;
      try { remembered = localStorage.getItem(REMEMBER_KEY); } catch {}
      if (!remembered || !canUseCredentialApi()) return;
      try {
        const cred = await navigator.credentials.get({ password: true, mediation: 'silent' });
        if (cancelled || !cred || cred.type !== 'password') return;
        setEmail(cred.id);
        setPassword(cred.password);
        setRememberMe(true);
        setAutoUser(cred.id);
        autoTimer.current = setTimeout(() => {
          autoLoginRef.current?.(cred.id, cred.password, { auto: true });
        }, AUTO_LOGIN_DELAY_MS);
      } catch { /* no saved credential — fall back to the normal form */ }
    })();
    return () => { cancelled = true; clearTimeout(autoTimer.current); };
  }, []);

  const cancelAutoLogin = () => {
    clearTimeout(autoTimer.current);
    try { localStorage.removeItem(REMEMBER_KEY); } catch {}
    setAutoUser(null);
    setEmail('');
    setPassword('');
    setRememberMe(false);
  };

  const validate = () => {
    const e = {};
    if (!email.trim())
      e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'Enter a valid email address.';
    if (!password)
      e.password = 'Password is required.';
    else if (password.length < 6)
      e.password = 'Password must be at least 6 characters.';
    return e;
  };

  // deviceId, when the login just went through OTP/email confirmation and
  // "remember this device" was checked, is the mfa_trusted_devices row that
  // was just created for this browser — recordSession() links this login's
  // "View Logins" entry to it so Logout there can drop both at once.
  const finishLogin = async (user = pendingUser, deviceId = null) => {
    await commitUser(user);
    recordSession(deviceId).catch(err => console.warn('[Login] recordSession failed:', err));
    onLoginSuccess?.(user);
  };

  // The default 2FA prompt on an untrusted device: email a "Yes, it's me" /
  // "No, secure my account" link pair and start polling for the answer.
  const startEmailConfirmation = async () => {
    setConfirmStatus('pending');
    setConfirmError('');
    setConfirmResent(false);
    setScreen('confirm');
    try {
      const { requestId } = await sendLoginConfirmation(rememberMe);
      setConfirmRequestId(requestId);
      startConfirmResendCooldown();
    } catch (err) {
      setConfirmError(err.message);
    }
  };

  // "Try another way" — the 6-digit code, kept as a fallback for anyone who
  // can't get to the confirmation email quickly (or whose mail is slow).
  const switchToOtp = async () => {
    clearInterval(confirmPollRef.current);
    setOtpValue('');
    setOtpError('');
    setOtpResent(false);
    setScreen('otp');
    try {
      await sendOtp('login');
      startResendCooldown();
    } catch (err) {
      setOtpError(err.message);
    }
  };

  // Everything that happens once the password step (and captcha, if shown)
  // is done: decide whether 2FA is needed, otherwise finish sign-in.
  const continueAfterCaptcha = async (user) => {
    setMfaChecking(true);
    let mfaRequired = false;
    let trustedDeviceId = null;
    try {
      const check = await checkMfaRequired(user.id);
      mfaRequired = check.required;
      trustedDeviceId = check.deviceId;
    } catch {
      // If the 2FA service is unreachable, don't lock people out of the
      // dashboard entirely — let them in and they can re-enable/verify
      // 2FA from Settings once the service is back.
      mfaRequired = false;
    }
    setMfaChecking(false);

    if (!mfaRequired) {
      await finishLogin(user, trustedDeviceId);
      return;
    }

    // 2FA is ON for this account and this device isn't trusted (that's the
    // only way we get here) — leave a security alert for the account owner.
    // Fire-and-forget: it can never delay or break the sign-in flow.
    recordUntrustedLoginAlert(user.id);

    await startEmailConfirmation();
  };

  // auto = true when triggered by the remember-me auto sign-in. It skips the
  // captcha (a human already chose to be remembered on this device) but still
  // goes through the 2FA check, which the trusted-device token satisfies.
  // True when this email + password belong to a signup whose confirmation
  // link hasn't been opened yet — i.e. the account doesn't exist in the
  // system until it's confirmed (see /api/auth/pending-status).
  const checkPendingAccount = async (emailNorm, pw) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/pending-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNorm, password: pw }),
      });
      const j = await res.json().catch(() => ({}));
      return res.ok && j.pending === true;
    } catch { return false; }
  };

  const doLogin = async (rawEmail, pw, { auto = false } = {}) => {
    setError('');
    const emailNorm = rawEmail.trim().toLowerCase();

    setLoading(true);
    const { data, error: authErr } = await signIn(emailNorm, pw);
    setLoading(false);

    if (authErr) {
      if (/not confirmed/i.test(authErr.message)) setUnverified(emailNorm);
      let pendingAcct = false;
      if (!auto && authErr.message === 'Invalid login credentials') {
        pendingAcct = await checkPendingAccount(emailNorm, pw);
        if (pendingAcct) setUnverified(emailNorm);
      }
      if (auto) {
        setAutoUser(null);
        setPassword('');
        setError('Your saved password no longer works. Please sign in again.');
      } else {
        setError(
          pendingAcct
            ? 'Your account isn\u2019t active yet \u2014 it hasn\u2019t been created until you confirm your email. Open the LibraScan confirmation link we sent to your inbox (check spam too), then log in.'
            : authErr.message === 'Invalid login credentials'
            ? 'Incorrect email or password. Please try again.'
            : /not confirmed/i.test(authErr.message)
              ? 'Please confirm your email first. Check your inbox (and spam folder) for the LibraScan confirmation link.'
              : authErr.message
        );
      }
      return;
    }

    // Hard gate: never let an account past this point until its email is
    // confirmed — even if Supabase's "Confirm email" setting were switched off.
    if (!data?.user?.email_confirmed_at) {
      await signOut();
      setUnverified(emailNorm);
      setAutoUser(null);
      setError('Please confirm your email first. Check your inbox (and spam folder) for the LibraScan confirmation link.');
      return;
    }
    setUnverified(null);

    // "Remember me" is the single switch for: saved email, browser-saved
    // password, and skipping the emailed code on this device.
    const remember = auto || rememberMe;
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, emailNorm);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        forgetThisDevice(data.user.id);
      }
    } catch {}
    if (remember && !auto) saveBrowserCredential(emailNorm, pw);

    setPendingUser(data.user);
    // signInWithPassword() above already wrote a real, persisted Supabase
    // session to localStorage — shared by every tab in this browser. Mark it
    // pending right away so a second tab (e.g. the "Yes, it's me" email link
    // opened from a mail tab in this same browser) can't treat that session
    // as signed in before 2FA is actually resolved. AuthContext.commitUser()
    // clears this once the login genuinely finishes.
    markMfaPending(data.user.id);

    if (auto) {
      setLoading(true);
      await continueAfterCaptcha(data.user);
      setLoading(false);
      return;
    }
    setCaptchaOk(false);
    setScreen('captcha');
  };
  autoLoginRef.current = doLogin;

  const resendVerification = async () => {
    if (!unverified) return;
    setResendNote('Sending…');
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverified }),
      });
      const j = await res.json().catch(() => ({}));
      setResendNote(res.ok ? 'A new confirmation email is on its way.' : (j.error || 'Could not resend the email.'));
    } catch {
      setResendNote('Could not reach the server. Please try again.');
    }
  };

  // Google sign-in. The browser only gets a session from Supabase; the SERVER
  // (/api/auth/google/status) then re-verifies the token, enforces the
  // @pampangastateu.edu.ph domain and tells us whether this is an existing
  // account (-> straight to its role-based portal) or a first login
  // (-> profile completion form). Until that check passes the session is held
  // "pending" so AuthContext never treats this tab as signed in.
  const abortGoogle = async (userId, message) => {
    if (userId) clearMfaPending(userId);
    await signOut();
    setGoogleSetup(null);
    setScreen('login');
    setError(message);
  };

  const handleGoogleCredential = async (credential, nonce) => {
    setError('');
    setGoogleLoading(true);
    const { data, error: idErr } = await signInWithGoogleIdToken(credential, nonce);
    if (idErr || !data?.user || !data?.session) {
      setGoogleLoading(false);
      setError(
        /database error|not allowed|domain/i.test(idErr?.message || '')
          ? 'Only @pampangastateu.edu.ph Google accounts can sign in.'
          : (idErr?.message || 'Google sign-in failed. Please try again.')
      );
      return;
    }

    const gUser = data.user;
    const accessToken = data.session.access_token;
    markMfaPending(gUser.id);

    try {
      const result = await checkGoogleAccount(accessToken);
      if (result.status === 'existing') {
        await finishLogin(gUser);              // role comes from profiles.role
      } else {
        setGoogleSetup({ user: gUser, accessToken, accountType: result.accountType, prefill: result.prefill });
        setScreen('google-profile');
      }
    } catch (err) {
      await abortGoogle(gUser.id, err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (ev) => {
    ev?.preventDefault();
    clearTimeout(autoTimer.current);
    setAutoUser(null);
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    await doLogin(email, password);
  };

  const handleCaptchaSubmit = async () => {
    if (!captchaOk || !pendingUser) return;
    await continueAfterCaptcha(pendingUser);
  };

  const handleOtpSubmit = async () => {
    if (otpValue.length !== 6 || otpBusy) return;
    setOtpBusy(true);
    setOtpError('');
    try {
      const result = await verifyOtp({ userId: pendingUser.id, code: otpValue, purpose: 'login', trustDevice: rememberMe });
      await finishLogin(pendingUser, result.deviceId);
    } catch (err) {
      setOtpError(err.message);
      setOtpValue('');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0) return;
    setOtpError('');
    try {
      await sendOtp('login');
      setOtpResent(true);
      startResendCooldown();
    } catch (err) {
      setOtpError(err.message);
    }
  };

  const handleResendConfirmation = async () => {
    if (confirmResendIn > 0) return;
    setConfirmError('');
    try {
      const { requestId } = await sendLoginConfirmation(rememberMe);
      setConfirmRequestId(requestId);
      setConfirmStatus('pending');
      setConfirmResent(true);
      startConfirmResendCooldown();
    } catch (err) {
      setConfirmError(err.message);
    }
  };

  // Polls for the Yes/No answer while the confirm screen is up. Checks
  // immediately, then every 3s, until confirmed/denied/expired.
  useEffect(() => {
    if (screen !== 'confirm' || !confirmRequestId || !pendingUser) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await getLoginConfirmationStatus(pendingUser.id, confirmRequestId);
        if (cancelled) return;
        if (res.status === 'confirmed') {
          clearInterval(confirmPollRef.current);
          await finishLogin(pendingUser, res.deviceId);
        } else if (res.status === 'denied') {
          clearInterval(confirmPollRef.current);
          setConfirmStatus('denied');
          // The login never actually completed — kill the password-verified
          // session on THIS device too, rather than leaving it dangling.
          try { await signOut(); } catch {}
        } else if (res.status === 'expired') {
          clearInterval(confirmPollRef.current);
          setConfirmStatus('expired');
        }
        // 'pending' → keep polling
      } catch {
        // Transient network hiccup — keep polling rather than surfacing an
        // error on every 3-second tick.
      }
    };

    poll();
    confirmPollRef.current = setInterval(poll, 3000);

    // This tab is, by definition, the one the person just switched away
    // from to go tap "Yes, it's me" / "No, secure my account" in their
    // inbox — browsers throttle setInterval heavily while a tab is
    // backgrounded, so the 3-second poll above can stall for a long time
    // even after the server already has the answer. Two extra, un-throttled
    // triggers so it doesn't just sit there looking stuck:
    //  1) the /confirm-login tab pings this one the moment it gets an
    //     answer, via a storage event (delivered immediately, not on a timer);
    //  2) re-check the instant this tab regains focus/visibility, which
    //     covers it even if the ping above is missed for any reason.
    const unsubscribePing = onLoginConfirmationPing(() => poll());
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(confirmPollRef.current);
      unsubscribePing();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [screen, confirmRequestId, pendingUser]);

  useEffect(() => {
    if (screen !== 'captcha') return;
    const handler = (e) => {
      if (e.key === 'Enter' && captchaOk) handleCaptchaSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, captchaOk, pendingUser]);

  useEffect(() => {
    if (screen !== 'otp') return;
    const handler = (e) => {
      if (e.key === 'Enter' && otpValue.length === 6) handleOtpSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, otpValue, otpBusy]);

  const title    = screen === 'google-profile' ? 'Complete Your Profile'
                 : screen === 'captcha' ? '' // rendered left-aligned inside the pane below
                 : screen === 'otp'     ? '' // rendered left-aligned inside the pane below
                 : screen === 'confirm' ? (
                     confirmStatus === 'denied'  ? 'Sign-In Blocked'
                   : confirmStatus === 'expired' ? 'Link Expired'
                   // pending: rendered left-aligned inside the pane itself
                   // below instead of AuthLayout's centered heading — kept
                   // empty here so AuthLayout doesn't also print a centered
                   // one above it.
                   : ''
                   )
                 : 'Welcome Back';
  const subtitle = screen === 'google-profile' ? 'One-time setup for your Google account'
                 : screen === 'captcha' ? '' // same — description lives inside the pane
                 : screen === 'otp'     ? '' // same — description lives inside the pane
                 : screen === 'confirm' ? (
                     confirmStatus === 'denied'  ? 'We stopped that sign-in'
                   : confirmStatus === 'expired' ? 'Request a new link below'
                   : '' // pending: same reasoning as title above
                   )
                 : 'Sign in to your library account';

  return (
    <AuthLayout title={title} subtitle={subtitle} onExit={handleExit}>
      <AnimatePresence mode="wait">

        {screen === 'login' && (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {autoUser && (
              <div style={{
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.38)',
                borderRadius: 10, padding: '10px 13px',
                fontSize: 12.5, fontFamily: FONT_BODY, color: '#5a3010',
                marginBottom: 14, lineHeight: 1.6,
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 10,
              }}>
                <span>Signing you in as <strong>{autoUser}</strong>…</span>
                <LinkBtn onClick={cancelAutoLogin} style={{ fontSize: 12 }}>Not you?</LinkBtn>
              </div>
            )}

            <AuthInput
              label="Email Address"
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setFieldErrors(fe => ({ ...fe, email: '' }));
              }}
              placeholder="e.g. 2023929321@pampangastateu.edu.ph"
              error={fieldErrors.email}
              autoComplete="email"
              disabled={loading}
            />

            <AuthInput
              label="Password"
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setFieldErrors(fe => ({ ...fe, password: '' }));
              }}
              placeholder="Enter your password"
              error={fieldErrors.password}
              autoComplete="current-password"
              disabled={loading}
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 2,
              marginBottom: 16,
            }}>
              <RememberMe
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <LinkBtn onClick={onGoForgot} style={{ fontSize: 12 }}>
                Forgot Password?
              </LinkBtn>
            </div>

            <AnimatePresence>
              {error && <ErrorBox message={error} />}
              {unverified && (
                <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12 }}>
                  <LinkBtn onClick={resendVerification} style={{ fontSize: 12 }}>Resend confirmation email</LinkBtn>
                  {resendNote && <div style={{ marginTop: 3, fontStyle: 'italic', color: '#7a3820' }}>{resendNote}</div>}
                </div>
              )}
            </AnimatePresence>

            <PrimaryButton loading={loading}>Sign In</PrimaryButton>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '16px 0',
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(139,0,0,0.14)' }} />
              <span style={{
                fontSize: 11.5, fontFamily: FONT_BODY, color: '#9a7a5a',
                letterSpacing: 0.4, textTransform: 'uppercase',
              }}>
                or
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(139,0,0,0.14)' }} />
            </div>

            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onError={setError}
              disabled={googleLoading}
              loading={googleLoading}
            />

            <p style={{
              textAlign: 'center', marginTop: 16,
              fontSize: 13, fontFamily: FONT_BODY, color: '#6a3c1c',
            }}>
              Don't have an account?{' '}
              <LinkBtn onClick={onGoSignup} style={{ fontSize: 13 }}>
                Register here
              </LinkBtn>
            </p>
          </motion.form>
        )}

        {screen === 'captcha' && (
          <motion.div
            key="captcha"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}
          >
            <h2 style={{
              margin: '0 0 2px', fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(16px, 3vw, 22px)',
              fontWeight: 700, color: '#4a1200', textAlign: 'center',
              letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              Verification
            </h2>

            <p style={{
              margin: '0 0 14px', fontFamily: FONT_BODY,
              fontSize: 'clamp(10px, 2vw, 12px)', lineHeight: 1.6,
              color: '#7a3820', fontStyle: 'italic', textAlign: 'center',
            }}>
              Enter the <strong style={{ color: '#8B0000' }}>6 characters</strong> shown
              in the image to complete sign in.
            </p>

            <AuthCaptcha
              onVerify={ok => setCaptchaOk(ok)}
              onReset={() => setCaptchaOk(false)}
            />



            <PrimaryButton
              onClick={handleCaptchaSubmit}
              disabled={!captchaOk || mfaChecking}
              style={{ marginTop: 14, padding: '10px 0' }}
            >
              {mfaChecking ? 'Checking…' : 'Submit'}
            </PrimaryButton>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <LinkBtn
                onClick={() => { setScreen('login'); setCaptchaOk(false); }}
                style={{ fontFamily: FONT_SANS, fontSize: 11.5, textDecoration: 'none', fontWeight: 700, color: '#5E1119' }}
              >
                Back to Login
              </LinkBtn>
            </div>
          </motion.div>
        )}

        {screen === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}
          >
            <h2 style={{
              margin: '0 0 8px', fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(22px, 3vw, 27px)', lineHeight: 1.15,
              fontWeight: 700, color: '#5E1119', textAlign: 'center',
            }}>
              Check Your Email
            </h2>

            <p style={{
              margin: '0 0 14px', fontFamily: FONT_BODY, fontSize: 12.5,
              lineHeight: 1.55, color: '#5a4326',
            }}>
              We&rsquo;ve sent a 6-digit verification code to your email address.
              Please enter the code below to continue.
            </p>

            {/* Where the code went */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(248,238,212,0.8)',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 16,
              boxShadow: '0 3px 12px rgba(139,70,20,0.10)',
            }}>
              <span style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(139,0,0,0.11)', color: '#7A1A24',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </span>

              <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(139,70,20,0.22)', flexShrink: 0 }} />

              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 8.5, fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a7250',
                }}>
                  Email sent
                </div>
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 700,
                  color: '#5E1119', wordBreak: 'break-all', margin: '1px 0 2px',
                }}>
                  {pendingUser?.email}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: FONT_BODY, fontSize: 11, color: '#8a7250',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                  </svg>
                  Expires in 5 minutes
                </div>
              </div>
            </div>

            <label style={{
              display: 'block', marginBottom: 7,
              fontFamily: FONT_SANS, fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: otpError ? '#b03020' : '#5E1119',
            }}>
              Verification code
            </label>

            <OtpInput value={otpValue} onChange={setOtpValue} disabled={otpBusy} error={!!otpError} />

            <AnimatePresence>
              {otpError && <div style={{ marginTop: 10 }}><ErrorBox message={otpError} /></div>}
            </AnimatePresence>

            <PrimaryButton
              onClick={handleOtpSubmit}
              disabled={otpValue.length !== 6}
              loading={otpBusy}
              style={{ marginTop: 14, color: '#fff', padding: '10px 0' }}
            >
              Verify &amp; Sign In
            </PrimaryButton>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginTop: 12, fontFamily: FONT_BODY, fontSize: 12, color: '#6b5236',
            }}>
              <span>Didn&rsquo;t get the code?</span>
              <ResendPill seconds={resendIn} onClick={handleResendOtp} idleLabel="Resend code" outlined />
            </div>

            {otpResent && (
              <div style={{
                color: '#2e7d32', fontWeight: 600, fontFamily: FONT_BODY, fontSize: 12.5,
                textAlign: 'center', marginTop: 8,
              }}>
                ✓ A new code was sent.
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 10px',
              fontFamily: FONT_SANS, fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a7250',
            }}>
              <span style={{ flex: 1, height: 1, background: 'rgba(139,70,20,0.22)' }} />
              or
              <span style={{ flex: 1, height: 1, background: 'rgba(139,70,20,0.22)' }} />
            </div>

            <button
              type="button"
              onClick={startEmailConfirmation}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                width: '100%', padding: '9px 0',
                background: 'rgba(245,232,200,0.8)',
                border: '1.25px solid rgba(122,26,36,0.4)', borderRadius: 22,
                color: '#5E1119', cursor: 'pointer',
                fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700,
                boxShadow: '0 1px 4px rgba(90,40,0,0.08)',
                transition: 'background 0.18s, border-color 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(122,26,36,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,232,200,0.8)'; e.currentTarget.style.borderColor = 'rgba(122,26,36,0.4)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              Confirm by email instead
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <LinkBtn
                onClick={() => {
                  setScreen('login'); setCaptchaOk(false); setOtpValue(''); setOtpError('');
                }}
                style={{ fontSize: 12, textDecoration: 'none', fontWeight: 600, color: '#5E1119' }}
              >
                Back to Login
              </LinkBtn>
            </div>
          </motion.div>
        )}

        {screen === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {confirmStatus === 'pending' && (
              <div style={{ textAlign: 'left' }}>
                <p style={{
                  margin: '0 0 4px', fontSize: 11, fontWeight: 700,
                  fontFamily: FONT_SANS, letterSpacing: '0.04em',
                  color: '#8B0000', textAlign: 'left',
                }}>
                  {pendingDisplayName(pendingUser)} &middot; LibraScan
                </p>

                <h2 style={{
                  margin: '0 0 8px', fontFamily: FONT_DISPLAY, fontSize: 24,
                  fontWeight: 700, color: '#4a1200', textAlign: 'left',
                }}>
                  Check your emails
                </h2>

                <p style={{
                  margin: '0 0 10px', fontSize: 12.5, fontFamily: FONT_BODY,
                  color: '#5a4326', textAlign: 'left', lineHeight: 1.7,
                }}>
                  We sent a confirmation to your email{' '}
                  <strong style={{ color: '#8B0000', wordBreak: 'break-all' }}>
                    {maskEmail(pendingUser?.email)}
                  </strong>
                </p>

                <p style={{
                  margin: '0 0 10px', fontSize: 13, lineHeight: 1.6,
                  fontFamily: FONT_BODY, color: '#5a4326', textAlign: 'left',
                }}>
                  Check your emails there and approve the login to continue
                </p>

                <img
                  src="/confirmation.png"
                  alt="Illustration of confirming a sign-in from an email"
                  style={{
                    width: '100%', height: 'auto', display: 'block',
                    borderRadius: 14, marginBottom: 14,
                    border: '1.5px solid rgba(201,168,76,0.55)',
                    boxShadow: '0 4px 14px rgba(90,40,0,0.12)',
                  }}
                />

                {/* Status card: spinner + title + note on the left, resend on the right */}
                <div style={{
                  border: '1.25px solid rgba(139,0,0,0.2)',
                  background: 'rgba(248,238,212,0.8)',
                  borderRadius: 12, padding: '8px 12px',
                  boxShadow: '0 2px 8px rgba(139,70,20,0.07)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0 }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2.5px solid rgba(139,0,0,0.20)', borderTopColor: '#8B0000',
                        animation: 'lm-spin 0.8s linear infinite', flexShrink: 0, marginTop: 1,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: '#5a2800', lineHeight: 1.3 }}>
                          Waiting for approval&hellip;
                        </div>
                        <div style={{
                          marginTop: 1, fontSize: 11.5, lineHeight: 1.35, textAlign: 'left',
                          fontFamily: FONT_BODY, color: '#8a7250',
                        }}>
                          It may take a few minutes to get the notification.
                          {confirmResent && (
                            <span style={{ color: '#2e7d32', fontWeight: 600, display: 'block', marginTop: 2 }}>
                              ✓ A new confirmation email was sent.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 18, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <ResendPill
                        seconds={confirmResendIn}
                        onClick={handleResendConfirmation}
                        idleLabel="Resend email"
                      />
                    </div>
                  </div>
                  <style>{'@keyframes lm-spin { to { transform: rotate(360deg); } }'}</style>
                </div>

                <AnimatePresence>
                  {confirmError && <div style={{ marginTop: 10 }}><ErrorBox message={confirmError} /></div>}
                </AnimatePresence>

                <PrimaryButton onClick={switchToOtp} style={{ marginTop: 14 }}>
                  Try another way
                </PrimaryButton>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <LinkBtn
                    onClick={() => {
                      clearInterval(confirmPollRef.current);
                      setScreen('login'); setCaptchaOk(false); setConfirmError('');
                    }}
                    style={{ fontSize: 12.5, textDecoration: 'none', fontWeight: 700 }}
                  >
                    Back to login
                  </LinkBtn>
                </div>
              </div>
            )}

            {confirmStatus === 'denied' && (
              <>
                <div style={{
                  background: 'rgba(192,57,43,0.09)',
                  border: '1px solid rgba(192,57,43,0.3)',
                  borderRadius: 10, padding: '12px 14px',
                  fontSize: 13, fontFamily: FONT_BODY, color: '#b03020',
                  marginBottom: 14, lineHeight: 1.6,
                }}>
                  You told us that wasn't you — this sign-in has been blocked
                  and we removed every device we'd previously trusted on this
                  account.
                </div>
                <p style={{
                  fontFamily: FONT_BODY, fontSize: 13, color: '#5a4326',
                  lineHeight: 1.65, margin: '0 0 6px', fontWeight: 700,
                }}>
                  For your safety, please change your password now.
                </p>
                <PrimaryButton
                  onClick={() => { setScreen('login'); onGoForgot?.(); }}
                  style={{ marginTop: 14 }}
                >
                  Change My Password
                </PrimaryButton>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <BackToLoginBtn onClick={() => {
                    setScreen('login'); setCaptchaOk(false); setPassword(''); setConfirmStatus('pending');
                  }} />
                </div>
              </>
            )}

            {confirmStatus === 'expired' && (
              <>
                <div style={{
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.38)',
                  borderRadius: 10, padding: '10px 13px',
                  fontSize: 12.5, fontFamily: FONT_BODY, color: '#5a3010',
                  marginBottom: 14, lineHeight: 1.6,
                }}>
                  That confirmation link expired before it was used.
                </div>
                <PrimaryButton onClick={startEmailConfirmation} style={{ marginTop: 4 }}>
                  Send a New Confirmation Email
                </PrimaryButton>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <LinkBtn onClick={switchToOtp} style={{ fontSize: 12 }}>
                    Or get a code instead
                  </LinkBtn>
                </div>
              </>
            )}
          </motion.div>
        )}

        {screen === 'google-profile' && googleSetup && (
          <GoogleProfileSetup
            key="google-profile"
            accessToken={googleSetup.accessToken}
            accountType={googleSetup.accountType}
            prefill={googleSetup.prefill}
            onComplete={() => finishLogin(googleSetup.user)}
            onCancel={() => abortGoogle(googleSetup.user.id, '')}
          />
        )}

      </AnimatePresence>
    </AuthLayout>
  );
}