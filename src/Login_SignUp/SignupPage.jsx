// src/Login_SignUp/SignupPage.jsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthLayout from './AuthLayout';

const PSU_DOMAIN   = '@pampangastateu.edu.ph';
const FONT_BODY    = "'Crimson Pro', Georgia, serif";
const FONT_SANS    = "'Josefin Sans', sans-serif";

// ── Shared UI ─────────────────────────────────────────────────────────────────
function PrimaryButton({ loading, children, style = {} }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileTap={{ scale: 0.97 }}
      style={{
        width: '100%', padding: '9px 0', marginTop: 8,
        background: loading ? 'rgba(139,0,0,0.38)' : 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
        color: '#F5E4A8', border: 'none', borderRadius: 22,
        fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : '0 4px 14px rgba(139,0,0,0.35)',
        transition: 'all 0.2s', ...style,
      }}
    >
      {loading ? 'Please wait…' : children}
    </motion.button>
  );
}

function LinkBtn({ onClick, children, style = {} }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: 'none', border: 'none', color: '#8B0000',
      cursor: 'pointer', fontFamily: FONT_BODY,
      fontSize: 'inherit', fontWeight: 600, padding: 0,
      textDecoration: 'underline', ...style,
    }}>
      {children}
    </button>
  );
}

function ErrorBox({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        background: 'rgba(192,57,43,0.09)', border: '1px solid rgba(192,57,43,0.3)',
        borderRadius: 8, padding: '7px 12px', fontSize: 11.5,
        fontFamily: FONT_BODY, color: '#b03020', marginBottom: 8, lineHeight: 1.5,
      }}
    >
      {message}
    </motion.div>
  );
}

// ── Regexes ───────────────────────────────────────────────────────────────────
const NAME_REGEX        = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
const MIDDLE_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.\-]*$/;
const USERNAME_REGEX    = /^[A-Za-z0-9_\-]+$/;

// ── Per-field validators ──────────────────────────────────────────────────────
const validators = {
  firstName: (v) => {
    if (!v.trim())                  return 'First name is required.';
    if (/\d/.test(v))               return 'First name cannot contain numbers.';
    if (!NAME_REGEX.test(v.trim())) return 'Invalid characters in first name.';
    if (v.trim().length < 2)        return 'At least 2 characters required.';
    return '';
  },
  lastName: (v) => {
    if (!v.trim())                  return 'Last name is required.';
    if (/\d/.test(v))               return 'Last name cannot contain numbers.';
    if (!NAME_REGEX.test(v.trim())) return 'Invalid characters in last name.';
    if (v.trim().length < 2)        return 'At least 2 characters required.';
    return '';
  },
  middleName: (v) => {
    if (!v.trim()) return '';
    if (/\d/.test(v))               return 'No numbers allowed.';
    if (!MIDDLE_NAME_REGEX.test(v)) return 'Letters and dots only.';
    return '';
  },
  username: (v) => {
    if (!v.trim())                  return 'Username is required.';
    if (v.trim().length < 3)        return 'At least 3 characters required.';
    if (v.trim().length > 30)       return 'Max 30 characters.';
    if (!USERNAME_REGEX.test(v.trim())) return 'Letters, numbers, _ or - only.';
    return '';
  },
  email: (v) => {
    if (!v.trim())                  return 'Email is required.';
    if (!v.trim().toLowerCase().endsWith(PSU_DOMAIN)) return `Must be a ${PSU_DOMAIN} address.`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email.';
    return '';
  },
  password: (v) => {
    if (!v)              return 'Password is required.';
    if (v.length < 8)    return 'Minimum 8 characters.';
    if (!/[A-Z]/.test(v)) return 'Include at least one uppercase letter.';
    if (!/[a-z]/.test(v)) return 'Include at least one lowercase letter.';
    if (!/[0-9]/.test(v)) return 'Include at least one number.';
    return '';
  },
  confirm: (v, form) => {
    if (!v)              return 'Please confirm your password.';
    if (v !== form.password) return 'Passwords do not match.';
    return '';
  },
};

// ── Password strength ─────────────────────────────────────────────────────────
function pwStrength(pw) {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (pw.length >= 12)          s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  return Math.min(s, 4);
}
const STR_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STR_COLORS = ['', '#c0392b', '#e67e22', '#c9a84c', '#2e7d32'];

function StrengthBar({ password }) {
  if (!password) return null;
  const score = pwStrength(password);
  return (
    <div style={{ marginTop: 2, marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 4,
            background: i <= score ? STR_COLORS[score] : 'rgba(139,70,20,0.12)',
            transition: 'background 0.25s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 8.5, fontFamily: FONT_SANS, color: STR_COLORS[score], fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {STR_LABELS[score]}
      </div>
    </div>
  );
}

// ── Compact field component with inline label error ───────────────────────────
function Field({ label, type = 'text', value, onChange, onBlur, placeholder, error, disabled, autoComplete }) {
  const [show,    setShow]    = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;
  const hasError   = Boolean(error);
  const borderColor = hasError ? 'rgba(176,48,32,0.8)' : focused ? '#8B0000' : 'rgba(139,70,20,0.28)';

  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 3,
      }}>
        <span style={{
          fontSize: 8.5, fontWeight: 700, fontFamily: FONT_SANS,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: hasError ? '#b03020' : '#5a2800',
        }}>
          {label}
        </span>
        <AnimatePresence>
          {hasError && (
            <motion.span
              key="err"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 9, fontFamily: FONT_BODY, color: '#b03020', fontStyle: 'italic' }}
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: isPassword ? '6px 32px 6px 11px' : '6px 11px',
            borderRadius: 18,
            border: `1.5px solid ${borderColor}`,
            background: hasError
              ? 'rgba(176,48,32,0.04)'
              : disabled ? 'rgba(230,215,190,0.5)' : 'rgba(255,252,242,0.92)',
            color: '#2d1000', fontSize: 11.5,
            fontFamily: FONT_BODY, outline: 'none',
            transition: 'border-color 0.16s, background 0.16s',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1} style={{
            position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: hasError ? '#b03020' : '#8B4513', padding: 0, opacity: 0.7,
            display: 'flex', alignItems: 'center',
          }}>
            {show
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const EMPTY = { firstName: '', lastName: '', middleName: '', username: '', email: '', password: '', confirm: '' };

export default function SignupPage({ onGoLogin, onGoLanding }) {
  const [form,        setForm]    = useState(EMPTY);
  const [touched,     setTouched] = useState({});
  const [fieldErrors, setFE]      = useState({});
  const [loading,     setLoad]    = useState(false);
  const [error,       setError]   = useState('');
  const [success,     setOk]      = useState(false);

  const handleExit = onGoLanding || (() => { window.location.href = '/'; });

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, [field]: val }));
    if (touched[field]) {
      const updatedForm = { ...form, [field]: val };
      const err = field === 'confirm'
        ? validators.confirm(val, updatedForm)
        : validators[field]?.(val) ?? '';
      setFE(fe => ({ ...fe, [field]: err }));
    }
    // Keep confirm in sync when password changes
    if (field === 'password' && touched.confirm) {
      const err = validators.confirm(form.confirm, { ...form, password: val });
      setFE(fe => ({ ...fe, confirm: err }));
    }
  };

  const handleBlur = (field) => () => {
    setTouched(t => ({ ...t, [field]: true }));
    const err = field === 'confirm'
      ? validators.confirm(form.confirm, form)
      : validators[field]?.(form[field]) ?? '';
    setFE(fe => ({ ...fe, [field]: err }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    const allTouched = Object.fromEntries(Object.keys(EMPTY).map(k => [k, true]));
    setTouched(allTouched);
    const errs = {};
    Object.keys(EMPTY).forEach(field => {
      const err = field === 'confirm'
        ? validators.confirm(form.confirm, form)
        : validators[field]?.(form[field]) ?? '';
      if (err) errs[field] = err;
    });
    setFE(errs);
    if (Object.keys(errs).length) return;
    setLoad(true);

    const { data: sd, error: authErr } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(), last_name: form.lastName.trim(),
          middle_name: form.middleName.trim(), username: form.username.trim(), role: 'student',
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (authErr) {
      setLoad(false);
      setError(authErr.message.toLowerCase().includes('already registered')
        ? 'This email is already registered. Please log in instead.'
        : authErr.message);
      return;
    }
    if (sd?.user) {
      await supabase.from('profiles').upsert({
        id: sd.user.id,
        first_name: form.firstName.trim(), last_name: form.lastName.trim(),
        middle_name: form.middleName.trim(), username: form.username.trim(),
        email: form.email.trim().toLowerCase(), role: 'student',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    setLoad(false);
    setOk(true);
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout title="Almost There!" subtitle="Check your inbox to confirm your account" onExit={handleExit}>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(139,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B0000" strokeWidth="2">
              <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9"/>
              <path d="m2 6 10 7 10-7"/><path d="m16 19 2 2 4-4"/>
            </svg>
          </div>
          <p style={{ color: '#4a1a00', fontSize: 13, fontFamily: FONT_BODY, lineHeight: 1.6, maxWidth: 240, margin: 0 }}>
            Confirmation link sent to <strong>{form.email}</strong>.
          </p>
          <div style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.38)', borderRadius: 8, padding: '9px 14px', fontSize: 11.5, fontFamily: FONT_BODY, color: '#4a1a00', lineHeight: 1.65, maxWidth: 240, textAlign: 'left' }}>
            <strong>Next steps:</strong><br />
            1. Open the email from PSU Library<br />
            2. Click the confirmation link<br />
            3. Return here and log in
          </div>
          <motion.button
            type="button"
            onClick={onGoLogin}
            whileTap={{ scale: 0.97 }}
            style={{ padding: '9px 32px', background: 'linear-gradient(135deg,#8B0000,#6B0000)', color: '#F5E4A8', border: 'none', borderRadius: 22, fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,0,0,0.35)', marginTop: 4 }}
          >
            Go to Login
          </motion.button>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <AuthLayout title="Create Account" subtitle={`${PSU_DOMAIN} addresses only`} onExit={handleExit}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

        {/* First Name */}
        <Field label="First Name" value={form.firstName} onChange={handleChange('firstName')} onBlur={handleBlur('firstName')} placeholder="Enter your first name" error={fieldErrors.firstName} disabled={loading} />

        {/* Last Name */}
        <Field label="Last Name" value={form.lastName} onChange={handleChange('lastName')} onBlur={handleBlur('lastName')} placeholder="Enter your last name" error={fieldErrors.lastName} disabled={loading} />

        {/* Middle Name */}
        <Field label="Middle Name (Optional)" value={form.middleName} onChange={handleChange('middleName')} onBlur={handleBlur('middleName')} placeholder="Enter your middle name" error={fieldErrors.middleName} disabled={loading} />

        {/* Username */}
        <Field label="Username" value={form.username} onChange={handleChange('username')} onBlur={handleBlur('username')} placeholder="Enter your username" error={fieldErrors.username} autoComplete="username" disabled={loading} />

        {/* Email */}
        <Field label="Email Address" type="email" value={form.email} onChange={handleChange('email')} onBlur={handleBlur('email')} placeholder={`e.g 2023929321${PSU_DOMAIN}`} error={fieldErrors.email} autoComplete="email" disabled={loading} />

        {/* Password */}
        <Field label="Password" type="password" value={form.password} onChange={handleChange('password')} onBlur={handleBlur('password')} placeholder="Enter your password" error={fieldErrors.password} autoComplete="new-password" disabled={loading} />
        <StrengthBar password={form.password} />

        {/* Confirm Password */}
        <Field label="Confirm Password" type="password" value={form.confirm} onChange={handleChange('confirm')} onBlur={handleBlur('confirm')} placeholder="Enter your password" error={fieldErrors.confirm} autoComplete="new-password" disabled={loading} />

        {/* Password hint */}
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 7, padding: '5px 10px', fontSize: 9.5, fontFamily: FONT_BODY, color: '#5a3010', marginBottom: 4, lineHeight: 1.55 }}>
          Password: 8+ chars · 1 uppercase · 1 lowercase · 1 number
        </div>

        <AnimatePresence>{error && <ErrorBox message={error} />}</AnimatePresence>

        <PrimaryButton loading={loading}>Register</PrimaryButton>

        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11.5, fontFamily: FONT_BODY, color: '#6a3c1c' }}>
          Already have an account?{' '}
          <LinkBtn onClick={onGoLogin} style={{ fontSize: 11.5 }}>Log in here</LinkBtn>
        </p>
      </form>
    </AuthLayout>
  );
}