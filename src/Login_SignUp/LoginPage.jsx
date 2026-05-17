import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthCaptcha from './AuthCaptcha';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY    = "'Crimson Pro', Georgia, serif";
const FONT_SANS    = "'Josefin Sans', sans-serif";

const REMEMBER_KEY = 'lm_remember_email';

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
  const { signIn, commitUser } = useAuth();

  const [screen,      setScreen]      = useState('login');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [rememberMe,  setRememberMe]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingUser, setPendingUser] = useState(null);
  const [captchaOk,   setCaptchaOk]  = useState(false);

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

  const handleSubmit = async (ev) => {
    ev?.preventDefault();
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    const { data, error: authErr } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (authErr) {
      setError(
        authErr.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : authErr.message
      );
    } else {
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {}

      setPendingUser(data.user);
      setCaptchaOk(false);
      setScreen('captcha');
    }
  };

  const handleCaptchaSubmit = async () => {
    if (!captchaOk || !pendingUser) return;
    await commitUser(pendingUser);
    onLoginSuccess?.(pendingUser);
  };

  useEffect(() => {
    if (screen !== 'captcha') return;
    const handler = (e) => {
      if (e.key === 'Enter' && captchaOk) handleCaptchaSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, captchaOk, pendingUser]);

  const title    = screen === 'captcha' ? 'Verification'                          : 'Welcome Back';
  const subtitle = screen === 'captcha' ? 'Complete the security check to proceed' : 'Sign in to your library account';

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
              disabled={!captchaOk}
              style={{ marginTop: 14 }}
            >
              Submit
            </PrimaryButton>

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <BackToLoginBtn onClick={() => { setScreen('login'); setCaptchaOk(false); }} />
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </AuthLayout>
  );
}