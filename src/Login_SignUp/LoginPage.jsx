import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './useAuth';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthCaptcha from './AuthCaptcha';
import {
  checkMfaRequired, sendOtp, verifyOtp, forgetThisDevice,
  sendLoginConfirmation, getLoginConfirmationStatus, markMfaPending,
  onLoginConfirmationPing, recordSession,
} from '../utils/mfaClient';

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

function OtpInput({ value, onChange, disabled, error }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="······"
      style={{
        width: '100%', boxSizing: 'border-box', textAlign: 'center',
        padding: '13px 0', fontSize: 26, letterSpacing: '0.5em',
        fontFamily: FONT_SANS, fontWeight: 700, color: '#5a2800',
        background: 'rgba(255,252,242,0.9)',
        border: `1.5px solid ${error ? '#C0392B' : 'rgba(139,70,20,0.30)'}`,
        borderRadius: 12, outline: 'none',
      }}
    />
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
  const { signIn, commitUser, signOut } = useAuth();

  const [screen,      setScreen]      = useState('login');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [rememberMe,  setRememberMe]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
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

    await startEmailConfirmation();
  };

  // auto = true when triggered by the remember-me auto sign-in. It skips the
  // captcha (a human already chose to be remembered on this device) but still
  // goes through the 2FA check, which the trusted-device token satisfies.
  const doLogin = async (rawEmail, pw, { auto = false } = {}) => {
    setError('');
    const emailNorm = rawEmail.trim().toLowerCase();

    setLoading(true);
    const { data, error: authErr } = await signIn(emailNorm, pw);
    setLoading(false);

    if (authErr) {
      if (auto) {
        setAutoUser(null);
        setPassword('');
        setError('Your saved password no longer works. Please sign in again.');
      } else {
        setError(
          authErr.message === 'Invalid login credentials'
            ? 'Incorrect email or password. Please try again.'
            : authErr.message
        );
      }
      return;
    }

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

  const title    = screen === 'captcha' ? 'Verification'
                 : screen === 'otp'     ? 'Check Your Email'
                 : screen === 'confirm' ? (
                     confirmStatus === 'denied'  ? 'Sign-In Blocked'
                   : confirmStatus === 'expired' ? 'Link Expired'
                   : 'Check Your Email'
                   )
                 : 'Welcome Back';
  const subtitle = screen === 'captcha' ? 'Complete the security check to proceed'
                 : screen === 'otp'     ? 'Enter the 6-digit code we just sent you'
                 : screen === 'confirm' ? (
                     confirmStatus === 'denied'  ? 'We stopped that sign-in'
                   : confirmStatus === 'expired' ? 'Request a new link below'
                   : 'Confirm it\u2019s you from your inbox'
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
            </AnimatePresence>

            <PrimaryButton loading={loading}>Sign In</PrimaryButton>

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
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.38)',
              borderRadius: 10, padding: '10px 13px',
              fontSize: 12.5, fontFamily: FONT_BODY, color: '#5a3010',
              marginBottom: 14, lineHeight: 1.6,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#8B4513" strokeWidth="2"
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                Enter the <strong style={{ color: '#8B0000' }}>6 characters</strong> shown in the image to complete sign in.
                {captchaOk && (
                  <span style={{ color: '#2e7d32', fontWeight: 600, marginLeft: 6 }}>
                    ✓ Press Enter or click Submit.
                  </span>
                )}
              </div>
            </div>

            <AuthCaptcha
              onVerify={ok => setCaptchaOk(ok)}
              onReset={() => setCaptchaOk(false)}
            />

            <PrimaryButton
              onClick={handleCaptchaSubmit}
              disabled={!captchaOk || mfaChecking}
              style={{ marginTop: 14 }}
            >
              {mfaChecking ? 'Checking…' : 'Submit'}
            </PrimaryButton>

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <BackToLoginBtn onClick={() => { setScreen('login'); setCaptchaOk(false); }} />
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
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.38)',
              borderRadius: 10, padding: '10px 13px',
              fontSize: 12.5, fontFamily: FONT_BODY, color: '#5a3010',
              marginBottom: 14, lineHeight: 1.6,
            }}>
              This account has two-factor authentication on. We emailed a 6-digit
              code to <strong>{pendingUser?.email}</strong> — it expires in 5 minutes.
              {otpResent && (
                <span style={{ color: '#2e7d32', fontWeight: 600, display: 'block', marginTop: 4 }}>
                  ✓ A new code was sent.
                </span>
              )}
            </div>

            <OtpInput value={otpValue} onChange={setOtpValue} disabled={otpBusy} error={!!otpError} />

            <AnimatePresence>
              {otpError && <div style={{ marginTop: 10 }}><ErrorBox message={otpError} /></div>}
            </AnimatePresence>

            <p style={{
              margin: '14px 0 0', fontSize: 12.5, lineHeight: 1.5,
              fontFamily: FONT_BODY, color: '#7a4020',
            }}>
              {rememberMe
                ? 'Remember me is on — this device won\u2019t ask for a code again for 30 days.'
                : 'Want to skip this step on this device? Go back and tick \u201CRemember me\u201D.'}
            </p>

            <PrimaryButton
              onClick={handleOtpSubmit}
              disabled={otpValue.length !== 6}
              loading={otpBusy}
              style={{ marginTop: 14 }}
            >
              Verify &amp; Sign In
            </PrimaryButton>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 16,
            }}>
              <BackToLoginBtn onClick={() => {
                setScreen('login'); setCaptchaOk(false); setOtpValue(''); setOtpError('');
              }} />
              <LinkBtn onClick={handleResendOtp} style={{ fontSize: 12, opacity: resendIn > 0 ? 0.5 : 1 }}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </LinkBtn>
            </div>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <LinkBtn onClick={startEmailConfirmation} style={{ fontSize: 12 }}>
                Or confirm by email instead
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
              <>
                <div style={{
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.38)',
                  borderRadius: 10, padding: '10px 13px',
                  fontSize: 12.5, fontFamily: FONT_BODY, color: '#5a3010',
                  marginBottom: 14, lineHeight: 1.6,
                }}>
                  This account has two-factor authentication on. We emailed a
                  confirmation to <strong>{pendingUser?.email}</strong> — open it
                  and tap <strong>"Yes, it's me"</strong> to continue, or{' '}
                  <strong>"No, secure my account"</strong> to block it. The link
                  expires in 10 minutes.
                  {confirmResent && (
                    <span style={{ color: '#2e7d32', fontWeight: 600, display: 'block', marginTop: 4 }}>
                      ✓ A new confirmation email was sent.
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', margin: '18px 0' }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2.5px solid rgba(139,0,0,0.20)', borderTopColor: '#8B0000',
                    animation: 'lm-spin 0.8s linear infinite',
                  }} />
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: '#7a4020' }}>
                    Waiting for confirmation…
                  </span>
                </div>
                <style>{'@keyframes lm-spin { to { transform: rotate(360deg); } }'}</style>

                <AnimatePresence>
                  {confirmError && <div style={{ marginTop: 4 }}><ErrorBox message={confirmError} /></div>}
                </AnimatePresence>

                <p style={{
                  margin: '10px 0 0', fontSize: 12.5, lineHeight: 1.5,
                  fontFamily: FONT_BODY, color: '#7a4020',
                }}>
                  {rememberMe
                    ? 'Remember me is on — once confirmed, this device won\u2019t be asked again for 30 days.'
                    : 'Want to skip this step here in future? Go back and tick \u201CRemember me\u201D.'}
                </p>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 16, flexWrap: 'wrap', gap: 8,
                }}>
                  <BackToLoginBtn onClick={() => {
                    clearInterval(confirmPollRef.current);
                    setScreen('login'); setCaptchaOk(false); setConfirmError('');
                  }} />
                  <LinkBtn onClick={handleResendConfirmation} style={{ fontSize: 12, opacity: confirmResendIn > 0 ? 0.5 : 1 }}>
                    {confirmResendIn > 0 ? `Resend in ${confirmResendIn}s` : 'Resend email'}
                  </LinkBtn>
                </div>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <LinkBtn onClick={switchToOtp} style={{ fontSize: 12 }}>
                    Try another way — get a code instead
                  </LinkBtn>
                </div>
              </>
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

      </AnimatePresence>
    </AuthLayout>
  );
}