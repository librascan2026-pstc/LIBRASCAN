import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthLayout from './AuthLayout';

const PSU_DOMAIN = '@pampangastateu.edu.ph';
// Exact-match check: one local part, then exactly @pampangastateu.edu.ph
// (rejects look-alikes such as name@pampangastateu.edu.ph.evil.com or a@b@...).
const PSU_EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@pampangastateu\.edu\.ph$/i;

// Base URL of the LibraScan API server (the one running app.js). Use the SAME
// value your src/utils/mfaClient.js already uses for its requests.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const FONT_BODY  = "'Crimson Pro', Georgia, serif";
const FONT_SANS  = "'Josefin Sans', sans-serif";

// Cream backgrounds for inputs (instead of near-white) so they blend with the parchment card.
const FIELD_BG          = '#F4E6C2';
const FIELD_BG_DISABLED = '#E9D7AE';

// Auto-generates the student's school email from their Student ID —
// the student never types this field manually, it just follows along
// as they type their Student ID.
const studentNumberToEmail = (studentId) => {
  const val = (studentId || '').trim();
  return val ? `${val}${PSU_DOMAIN}` : '';
};

// ─── Validators ───────────────────────────────────────────────────────────────
const NAME_REGEX        = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
const MIDDLE_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.\-]*$/;
const USERNAME_REGEX    = /^[A-Za-z0-9_\-]+$/;
const STUDENT_NO_REGEX  = /^\d{5,}$/;
const EMPLOYEE_NO_REGEX = /^\d{5,}$/;

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
    if (!v.trim())                      return 'Username is required.';
    if (v.trim().length < 3)            return 'At least 3 characters required.';
    if (v.trim().length > 30)           return 'Max 30 characters.';
    if (!USERNAME_REGEX.test(v.trim())) return 'Letters, numbers, _ or - only.';
    return '';
  },
  studentNumber: (v) => {
    if (!v.trim())                        return 'Student number is required.';
    if (!STUDENT_NO_REGEX.test(v.trim())) return 'Must be at least 5 digits (numbers only).';
    return '';
  },
  employeeNumber: (v) => {
    if (!v.trim())                         return 'Employee number is required.';
    if (!EMPLOYEE_NO_REGEX.test(v.trim())) return 'Must be at least 5 digits (numbers only).';
    return '';
  },
  department: (v) => (!v ? 'Please select your department.' : ''),
  campus:  (v) => (!v ? 'Please select your campus.'  : ''),
  college: (v) => (!v ? 'Please select your college.' : ''),
  program: (v) => (!v ? 'Please select your program.' : ''),
  email: (v) => {
    if (!v.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email.';
    if (!PSU_EMAIL_REGEX.test(v.trim())) return `Employees must use a ${PSU_DOMAIN} email address.`;
    return '';
  },
  password: (v) => {
    if (!v)               return 'Password is required.';
    if (v.length < 8)     return 'Minimum 8 characters.';
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

// ─── Password strength ────────────────────────────────────────────────────────
function pwStrength(pw) {
  let s = 0;
  if (pw.length >= 8)          s++;
  if (pw.length >= 12)         s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
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

// ─── Shared UI ────────────────────────────────────────────────────────────────
function PrimaryButton({ loading, children, style = {} }) {
  return (
    <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }} style={{
      width: '100%', padding: '9px 0', marginTop: 8,
      background: loading ? 'rgba(139,0,0,0.38)' : 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
      color: '#F5E4A8', border: 'none', borderRadius: 22,
      fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 4px 14px rgba(139,0,0,0.35)',
      transition: 'all 0.2s', ...style,
    }}>
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

// ─── Text / password field ────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, onBlur, placeholder, error, disabled, autoComplete }) {
  const [show,    setShow]    = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword  = type === 'password';
  const inputType   = isPassword ? (show ? 'text' : 'password') : type;
  const hasError    = Boolean(error);
  const borderColor = hasError ? 'rgba(176,48,32,0.8)' : focused ? '#8B0000' : 'rgba(139,70,20,0.28)';

  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: 8.5, fontWeight: 700, fontFamily: FONT_SANS, letterSpacing: '0.1em', textTransform: 'uppercase', color: hasError ? '#b03020' : '#5a2800' }}>
          {label}
        </span>
        <AnimatePresence>
          {hasError && (
            <motion.span key="err" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: 8.5, color: '#b03020', fontFamily: FONT_BODY, fontStyle: 'italic' }}>
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType} value={value} onChange={onChange} onBlur={onBlur}
          onFocus={() => setFocused(true)} placeholder={placeholder}
          disabled={disabled} autoComplete={autoComplete}
          style={{
            width: '100%', padding: isPassword ? '8px 34px 8px 14px' : '8px 14px',
            borderRadius: 18, border: `1.5px solid ${borderColor}`,
            background: disabled ? FIELD_BG_DISABLED : FIELD_BG,
            color: '#2d1000', fontSize: 12, fontFamily: FONT_BODY, outline: 'none',
            boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'text',
            transition: 'border-color 0.16s',
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#8B4513', display: 'flex', alignItems: 'center', padding: 0, opacity: 0.72,
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

// ─── Dropdown field ───────────────────────────────────────────────────────────
function SelectField({ label, value, onChange, onBlur, error, disabled, options, placeholder, isLoading, custom = true }) {
  const [focused, setFocused] = useState(false);
  // Custom dropdown state (only used when `custom` is true). The native
  // <select> popup is drawn by the browser, so it ignores the card's theme
  // and can spill outside it; the custom list opens right under the field.
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const isDisabled = disabled || isLoading;
  const selected = options.find(o => String(o.id) === String(value));

  const closeMenu = () => { setOpen(false); setFocused(false); onBlur?.(); };
  const pick = (o) => { onChange({ target: { value: String(o.id) } }); setOpen(false); };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) closeMenu(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }); // re-bound each render so closeMenu always sees the latest onBlur

  useEffect(() => {
    if (!open) return;
    setActive(options.findIndex(o => String(o.id) === String(value)));
    requestAnimationFrame(() => {
      menuRef.current?.scrollIntoView({ block: 'nearest' });
      menuRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && active >= 0) menuRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (e) => {
    if (isDisabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'Escape')         { e.preventDefault(); e.stopPropagation(); closeMenu(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(options[active]); }
    else if (e.key === 'Tab')       { closeMenu(); }
  };

  const hasError    = Boolean(error);
  const borderColor = hasError ? 'rgba(176,48,32,0.8)' : focused ? '#8B0000' : 'rgba(139,70,20,0.28)';

  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: 8.5, fontWeight: 700, fontFamily: FONT_SANS, letterSpacing: '0.1em', textTransform: 'uppercase', color: hasError ? '#b03020' : '#5a2800' }}>
          {label}
        </span>
        <AnimatePresence>
          {hasError && (
            <motion.span key="err" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: 8.5, color: '#b03020', fontFamily: FONT_BODY, fontStyle: 'italic' }}>
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {custom ? (
        <div ref={wrapRef} style={{ position: 'relative' }}>
          <button
            type="button" disabled={isDisabled}
            aria-haspopup="listbox" aria-expanded={open}
            onClick={() => { if (isDisabled) return; if (open) closeMenu(); else { setFocused(true); setOpen(true); } }}
            onFocus={() => setFocused(true)}
            onBlur={() => { if (!open) { setFocused(false); onBlur?.(); } }}
            onKeyDown={onKeyDown}
            style={{
              width: '100%', padding: '8px 34px 8px 14px', borderRadius: 18, textAlign: 'left',
              border: `1.5px solid ${open ? '#8B0000' : borderColor}`,
              background: isDisabled ? FIELD_BG_DISABLED : FIELD_BG,
              color: selected ? '#2d1000' : '#9a7040', fontSize: 12, fontFamily: FONT_BODY,
              outline: 'none', boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              cursor: isDisabled ? 'not-allowed' : 'pointer', transition: 'border-color 0.16s',
            }}
          >
            {selected ? selected.name : (isLoading ? 'Loading…' : (placeholder || 'Select…'))}
          </button>
          <div style={{ position: 'absolute', right: 11, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.15s', pointerEvents: 'none', color: '#8B4513', opacity: 0.65 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {open && (
            <div ref={menuRef} role="listbox" style={{
              position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 30,
              maxHeight: 190, overflowY: 'auto', padding: 4,
              background: '#F8EDCD', border: '1.5px solid rgba(139,0,0,0.25)', borderRadius: 14,
              boxShadow: '0 10px 24px rgba(60,20,0,0.25)',
            }}>
              {options.map((o, i) => {
                const isSel = String(o.id) === String(value);
                return (
                  <div key={o.id} role="option" aria-selected={isSel} data-selected={isSel ? 'true' : undefined}
                    onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                    style={{
                      padding: '7px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontFamily: FONT_BODY,
                      color: i === active ? '#F5E4A8' : (isSel ? '#8B0000' : '#2d1000'), fontWeight: isSel ? 700 : 500,
                      background: i === active ? '#8B0000' : (isSel ? 'rgba(139,0,0,0.14)' : 'transparent'),
                      transition: 'background 0.12s, color 0.12s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}>
                    <span>{o.name}</span>
                    {isSel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
      <div style={{ position: 'relative' }}>
        <select
          value={value} onChange={onChange} onBlur={onBlur}
          onFocus={() => setFocused(true)}
          disabled={disabled || isLoading}
          style={{
            width: '100%', padding: '8px 34px 8px 14px', borderRadius: 18,
            border: `1.5px solid ${borderColor}`,
            background: (disabled || isLoading) ? FIELD_BG_DISABLED : FIELD_BG,
            color: value ? '#2d1000' : '#9a7040', fontSize: 12, fontFamily: FONT_BODY,
            outline: 'none', boxSizing: 'border-box',
            cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.16s', appearance: 'none', WebkitAppearance: 'none',
          }}
        >
          <option value="" disabled>
            {isLoading ? 'Loading…' : (placeholder || 'Select…')}
          </option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#8B4513', opacity: 0.65 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      )}
    </div>
  );
}

// Cascade hint shown when a parent selection is needed
function CascadeHint({ label }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, fontFamily: FONT_SANS, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a2800', marginBottom: 3, textAlign: 'left' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 18, border: '1.5px solid rgba(139,70,20,0.15)', background: 'rgba(230,215,190,0.3)' }}>
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
          <path d="M5 0 L5 8 M2 5 L5 8 L8 5" stroke="rgba(139,70,20,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: 10, fontFamily: FONT_BODY, color: 'rgba(139,70,20,0.50)', fontStyle: 'italic' }}>
          Select above first
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const EMPTY = {
  firstName: '', lastName: '', middleName: '', username: '',
  studentNumber: '', employeeNumber: '', email: '', password: '', confirm: '',
};

// Student Number is the true unique identifier for an account — unlike
// names, which can legitimately repeat across different students, no two
// accounts should ever share the same Student Number. This checks the
// profiles table directly.
async function checkStudentNumberTaken(studentNumber) {
  const val = (studentNumber || '').trim();
  if (!val) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('student_number', val)
    .maybeSingle();
  if (error) {
    // Don't hard-block signup on a network/RLS hiccup here — the final
    // re-check right before account creation is the real guard.
    console.error('[SignupPage] student number uniqueness check failed:', error.message);
    return false;
  }
  return Boolean(data);
}

// Same idea as the Student Number check above, but for employees.
async function checkEmployeeNumberTaken(employeeNumber) {
  const val = (employeeNumber || '').trim();
  if (!val) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('employee_number', val)
    .maybeSingle();
  if (error) {
    console.error('[SignupPage] employee number uniqueness check failed:', error.message);
    return false;
  }
  return Boolean(data);
}

// Small segmented control: Student | Employee
function RoleToggle({ role, onChange, disabled }) {
  const opts = [{ id: 'student', label: 'Student' }, { id: 'employee', label: 'Employee' }];
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, fontFamily: FONT_SANS, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a2800', marginBottom: 3 }}>
        I am registering as
      </div>
      <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 20, border: '1.5px solid rgba(139,70,20,0.28)', background: FIELD_BG }}>
        {opts.map(o => {
          const active = role === o.id;
          return (
            <button key={o.id} type="button" disabled={disabled} onClick={() => onChange(o.id)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 16, border: 'none',
                background: active ? 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)' : 'transparent',
                color: active ? '#F5E4A8' : '#5a2800',
                fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
              }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SignupPage({ onGoLogin, onGoLanding }) {
  const [role,        setRole]    = useState('student'); // 'student' | 'employee'
  const [form,        setForm]    = useState(EMPTY);
  const [touched,     setTouched] = useState({});
  const [fieldErrors, setFE]      = useState({});
  const [loading,     setLoad]    = useState(false);
  const [error,       setError]   = useState('');
  const [success,     setOk]      = useState(false);
  const [resendIn,    setResendIn] = useState(0);   // seconds until "Resend" is allowed again
  const [resendMsg,   setResendMsg] = useState('');
  const [resending,   setResending] = useState(false);

  // ── Cascade state ──
  const [campuses,   setCampuses]   = useState([]);
  const [colleges,   setColleges]   = useState([]);
  const [programs,   setPrograms]   = useState([]);
  const [majors,     setMajors]     = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedCampus,  setSelectedCampus]  = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedMajor,   setSelectedMajor]   = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingMajors,   setLoadingMajors]   = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [hasMajors,       setHasMajors]       = useState(false);

  const [cascadeErrors, setCascadeErrors] = useState({ campus: '', college: '', program: '', department: '' });
  const [checkingStudentNumber, setCheckingStudentNumber] = useState(false);
  const [checkingEmployeeNumber, setCheckingEmployeeNumber] = useState(false);

  const handleExit = onGoLanding || (() => { window.location.href = '/'; });

  // Load campuses on mount (public — no auth needed)
  useEffect(() => {
    supabase
      .from('campuses')
      .select('id, campus_name')
      .eq('is_active', true)
      .order('campus_name')
      .then(({ data }) => setCampuses((data || []).map(c => ({ id: c.id, name: c.campus_name }))));
  }, []);

  // Campus → colleges
  useEffect(() => {
    setSelectedCollege(''); setSelectedProgram(''); setSelectedMajor('');
    setColleges([]); setPrograms([]); setMajors([]); setHasMajors(false);
    setCascadeErrors(e => ({ ...e, college: '', program: '' }));
    if (!selectedCampus) return;
    setLoadingColleges(true);
    supabase.from('colleges').select('id, college_name').eq('campus_id', selectedCampus).order('college_name')
      .then(({ data }) => { setColleges((data || []).map(c => ({ id: c.id, name: c.college_name }))); setLoadingColleges(false); });
  }, [selectedCampus]);

  // Campus → departments (employees only). Departments are a separate,
  // per-campus list (college departments + other offices like Clinic/Security).
  useEffect(() => {
    setSelectedDepartment('');
    setDepartments([]);
    setCascadeErrors(e => ({ ...e, department: '' }));
    if (role !== 'employee' || !selectedCampus) return;
    setLoadingDepartments(true);
    supabase.from('departments').select('id, department_name').eq('campus_id', selectedCampus)
      .order('category').order('department_name')
      .then(({ data }) => { setDepartments((data || []).map(d => ({ id: d.id, name: d.department_name }))); setLoadingDepartments(false); });
  }, [selectedCampus, role]);

  // College → programs
  useEffect(() => {
    setSelectedProgram(''); setSelectedMajor('');
    setPrograms([]); setMajors([]); setHasMajors(false);
    setCascadeErrors(e => ({ ...e, program: '' }));
    if (!selectedCollege) return;
    setLoadingPrograms(true);
    supabase.from('programs').select('id, program_name').eq('college_id', selectedCollege).order('program_name')
      .then(({ data }) => { setPrograms((data || []).map(p => ({ id: p.id, name: p.program_name }))); setLoadingPrograms(false); });
  }, [selectedCollege]);

  // Program → majors (optional)
  useEffect(() => {
    setSelectedMajor(''); setMajors([]); setHasMajors(false);
    if (!selectedProgram) return;
    setLoadingMajors(true);
    supabase.from('majors').select('id, major_name').eq('program_id', selectedProgram).order('major_name')
      .then(({ data }) => {
        const list = (data || []).map(m => ({ id: m.id, name: m.major_name }));
        setMajors(list); setHasMajors(list.length > 0); setLoadingMajors(false);
      });
  }, [selectedProgram]);

  // Switching role clears the ID number + email (they work differently per
  // role) so a Student ID never leaks into the Employee form or vice versa.
  const handleRoleChange = (next) => {
    if (next === role || loading) return;
    setRole(next);
    setForm(f => ({ ...f, studentNumber: '', employeeNumber: '', email: '' }));
    setFE(fe => ({ ...fe, studentNumber: '', employeeNumber: '', email: '' }));
    setTouched(t => ({ ...t, studentNumber: false, employeeNumber: false, email: false }));
    setCascadeErrors(er => ({ ...er, college: '', program: '', department: '' }));
    setError('');
  };

  // ── Field handlers ──
  const handleChange = (field) => (e) => {
    const val = e.target.value;

    if (field === 'studentNumber') {
      // Auto-generate the school email from the Student ID as it's typed —
      // the student never touches the email field themselves.
      const generatedEmail = studentNumberToEmail(val);
      setForm(f => ({ ...f, studentNumber: val, email: generatedEmail }));
      if (touched.studentNumber) {
        setFE(fe => ({ ...fe, studentNumber: validators.studentNumber(val) }));
      }
      if (touched.email) {
        setFE(fe => ({ ...fe, email: validators.email(generatedEmail) }));
      }
      return;
    }

    setForm(f => ({ ...f, [field]: val }));
    if (touched[field]) {
      const updatedForm = { ...form, [field]: val };
      const err = field === 'confirm' ? validators.confirm(val, updatedForm) : validators[field]?.(val) ?? '';
      setFE(fe => ({ ...fe, [field]: err }));
    }
    if (field === 'password' && touched.confirm) {
      setFE(fe => ({ ...fe, confirm: validators.confirm(form.confirm, { ...form, password: val }) }));
    }
  };

  const handleBlur = (field) => async () => {
    setTouched(t => ({ ...t, [field]: true }));
    const err = field === 'confirm' ? validators.confirm(form.confirm, form) : validators[field]?.(form[field]) ?? '';
    setFE(fe => ({ ...fe, [field]: err }));

    // Keep the auto-generated email's validation in sync too, since it's
    // derived from the Student Number rather than typed by the student.
    if (field === 'studentNumber') {
      setTouched(t => ({ ...t, email: true }));
      setFE(fe => ({ ...fe, email: validators.email(form.email) }));
    }

    // Live-check ID number uniqueness the moment the user leaves the field,
    // so they find out before they've filled out the rest of the form.
    if (field === 'studentNumber' && !err) {
      const value = form.studentNumber;
      setCheckingStudentNumber(true);
      const taken = await checkStudentNumberTaken(value);
      setCheckingStudentNumber(false);
      // Bail if the field changed while the check was in flight.
      if (taken && form.studentNumber === value) {
        setFE(fe => ({ ...fe, studentNumber: 'This Student Number is already registered.' }));
      }
    }

    // Same live uniqueness check for the Employee Number.
    if (field === 'employeeNumber' && !err) {
      const value = form.employeeNumber;
      setCheckingEmployeeNumber(true);
      const taken = await checkEmployeeNumberTaken(value);
      setCheckingEmployeeNumber(false);
      if (taken && form.employeeNumber === value) {
        setFE(fe => ({ ...fe, employeeNumber: 'This Employee Number is already registered.' }));
      }
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    // Validate text fields
    const allTouched = Object.fromEntries(Object.keys(EMPTY).map(k => [k, true]));
    setTouched(allTouched);
    const errs = {};
    // Only validate the ID field that belongs to the selected role.
    const skipField = role === 'student' ? 'employeeNumber' : 'studentNumber';
    Object.keys(EMPTY).forEach(field => {
      if (field === skipField) return;
      const err = field === 'confirm' ? validators.confirm(form.confirm, form) : validators[field]?.(form[field]) ?? '';
      if (err) errs[field] = err;
    });
    setFE(errs);

    // Validate cascade fields
    const cErrs = {
      campus:     validators.campus(selectedCampus),
      college:    role === 'student'  ? validators.college(selectedCollege)       : '',
      program:    role === 'student'  ? validators.program(selectedProgram)       : '',
      department: role === 'employee' ? validators.department(selectedDepartment) : '',
    };
    setCascadeErrors(cErrs);

    if (Object.keys(errs).length || cErrs.campus || cErrs.college || cErrs.program || cErrs.department) return;

    setLoad(true);

    // Final guard: re-check Student Number uniqueness right before creating
    // the account. Closes the race condition where two people submit around
    // the same time, or the earlier on-blur check was skipped.
    if (role === 'student') {
      const idTaken = await checkStudentNumberTaken(form.studentNumber);
      if (idTaken) {
        setLoad(false);
        setFE(fe => ({ ...fe, studentNumber: 'This Student Number is already registered.' }));
        setError('This Student Number is already registered to another account.');
        return;
      }
    } else {
      const idTaken = await checkEmployeeNumberTaken(form.employeeNumber);
      if (idTaken) {
        setLoad(false);
        setFE(fe => ({ ...fe, employeeNumber: 'This Employee Number is already registered.' }));
        setError('This Employee Number is already registered to another account.');
        return;
      }
    }

    // Create the account on the server. It creates the user as UNCONFIRMED,
    // saves the profile, and emails a confirmation link (see /api/auth/signup).
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName:     form.firstName.trim(),
          lastName:      form.lastName.trim(),
          middleName:    form.middleName.trim(),
          username:      form.username.trim(),
          role,
          studentNumber:  role === 'student'  ? form.studentNumber.trim()  : null,
          employeeNumber: role === 'employee' ? form.employeeNumber.trim() : null,
          email:         form.email.trim().toLowerCase(),
          password:      form.password,
          campusId:      selectedCampus,
          collegeId:     role === 'student'  ? selectedCollege : null,
          programId:     role === 'student'  ? selectedProgram : null,
          majorId:       role === 'student'  ? (selectedMajor || null) : null,
          departmentId:  role === 'employee' ? selectedDepartment : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoad(false);
        setError(json.error || 'Could not create your account. Please try again.');
        return;
      }
      if (json.emailSent === false) {
        setResendMsg('We created your account but could not send the email. Tap "Resend" below.');
      }
    } catch {
      setLoad(false);
      setError('Could not reach the server. Please check your connection and try again.');
      return;
    }

    setLoad(false);
    setResendIn(60);
    setOk(true);
  };

  // Countdown for the "Resend" button on the success screen.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleResend = async () => {
    if (resendIn > 0 || resending) return;
    setResending(true);
    setResendMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setResendMsg('A new confirmation email is on its way.'); setResendIn(60); }
      else setResendMsg(json.error || 'Could not resend the email.');
    } catch {
      setResendMsg('Could not reach the server. Please try again.');
    }
    setResending(false);
  };

  // ── Success screen ──
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
            1. Open the email from LibraScan<br />
            2. Tap <strong>Confirm my email</strong><br />
            3. Return here and log in<br />
            <span style={{ fontSize: 10.5, opacity: 0.8 }}>Can&apos;t find it? Check your spam folder. The link expires in 24 hours.</span>
          </div>
          <div style={{ fontSize: 11.5, fontFamily: FONT_BODY, color: '#4a1a00', textAlign: 'center' }}>
            Didn&apos;t get it?{' '}
            {resendIn > 0
              ? <span style={{ opacity: 0.7 }}>Resend in {resendIn}s</span>
              : <LinkBtn onClick={handleResend} style={{ fontSize: 11.5 }}>{resending ? 'Sending…' : 'Resend email'}</LinkBtn>}
            {resendMsg && <div style={{ marginTop: 4, fontStyle: 'italic', color: '#7a3820', maxWidth: 240 }}>{resendMsg}</div>}
          </div>
          <motion.button type="button" onClick={onGoLogin} whileTap={{ scale: 0.97 }}
            style={{ padding: '9px 32px', background: 'linear-gradient(135deg,#8B0000,#6B0000)', color: '#F5E4A8', border: 'none', borderRadius: 22, fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,0,0,0.35)', marginTop: 4 }}>
            Go to Login
          </motion.button>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Registration form ──
  return (
    <AuthLayout title="Create Account" subtitle={`${PSU_DOMAIN} addresses only`} onExit={handleExit}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Only the fields scroll. The Register button + login link live below the
            scroll area, so they never sit inside the scrollbar or cover any textfield. */}
        <style>{`
          .auth-pane { overflow: hidden !important; display: flex; flex-direction: column; padding-right: 0 !important; }
          .signup-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 0 0 6px 0; display: flex; flex-direction: column; scrollbar-width: none; -ms-overflow-style: none; }
          .signup-scroll > * { flex-shrink: 0; }
          .signup-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        <div className="signup-scroll">

        <RoleToggle role={role} onChange={handleRoleChange} disabled={loading} />

        <Field label="First Name" value={form.firstName} onChange={handleChange('firstName')} onBlur={handleBlur('firstName')} placeholder="Enter your first name" error={fieldErrors.firstName} disabled={loading} />
        <Field label="Last Name" value={form.lastName} onChange={handleChange('lastName')} onBlur={handleBlur('lastName')} placeholder="Enter your last name" error={fieldErrors.lastName} disabled={loading} />
        <Field label="Middle Name (Optional)" value={form.middleName} onChange={handleChange('middleName')} onBlur={handleBlur('middleName')} placeholder="Enter your middle name" error={fieldErrors.middleName} disabled={loading} />
        <Field label="Username" value={form.username} onChange={handleChange('username')} onBlur={handleBlur('username')} placeholder="Enter your username" error={fieldErrors.username} autoComplete="username" disabled={loading} />
        {role === 'student' ? (
          <>
            <Field label="Student Number" value={form.studentNumber} onChange={handleChange('studentNumber')} onBlur={handleBlur('studentNumber')} placeholder="e.g. 2023929321" error={fieldErrors.studentNumber} disabled={loading} />
            {checkingStudentNumber && (
              <div style={{ marginTop: -4, marginBottom: 7, fontSize: 9.5, fontFamily: FONT_BODY, color: '#8B4513', fontStyle: 'italic' }}>
                Checking availability…
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Employee Number" value={form.employeeNumber} onChange={handleChange('employeeNumber')} onBlur={handleBlur('employeeNumber')} placeholder="Enter your employee number (5+ digits)" error={fieldErrors.employeeNumber} disabled={loading} />
            {checkingEmployeeNumber && (
              <div style={{ marginTop: -4, marginBottom: 7, fontSize: 9.5, fontFamily: FONT_BODY, color: '#8B4513', fontStyle: 'italic' }}>
                Checking availability…
              </div>
            )}
          </>
        )}

        {/* ── Cascading academic info ── */}
        <div style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)', borderRadius: 10, padding: '10px 12px 6px', marginBottom: 8 }}>
          <div style={{ fontSize: 8, fontFamily: FONT_SANS, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(139,70,20,0.55)', marginBottom: 8 }}>
            {role === 'student' ? 'Academic Information' : 'Employment Information'}
          </div>

          {/* Campus */}
          <SelectField
            label="Campus"
            value={selectedCampus}
            onChange={e => { setSelectedCampus(e.target.value); setCascadeErrors(er => ({ ...er, campus: '' })); }}
            onBlur={() => setCascadeErrors(er => ({ ...er, campus: validators.campus(selectedCampus) }))}
            error={cascadeErrors.campus}
            disabled={loading}
            options={campuses}
            placeholder="Select your campus"
          />

          {role === 'student' ? (
          <>
          {/* College */}
          {selectedCampus ? (
            <SelectField
              label="College"
              value={selectedCollege}
              onChange={e => { setSelectedCollege(e.target.value); setCascadeErrors(er => ({ ...er, college: '' })); }}
              onBlur={() => setCascadeErrors(er => ({ ...er, college: validators.college(selectedCollege) }))}
              error={cascadeErrors.college}
              disabled={loading}
              isLoading={loadingColleges}
              options={colleges}
              placeholder={colleges.length === 0 && !loadingColleges ? 'No colleges available' : 'Select your college'}
            />
          ) : (
            <CascadeHint label="College" />
          )}

          {/* Program */}
          {selectedCollege ? (
            <SelectField
              label="Program / Course"
              value={selectedProgram}
              onChange={e => { setSelectedProgram(e.target.value); setCascadeErrors(er => ({ ...er, program: '' })); }}
              onBlur={() => setCascadeErrors(er => ({ ...er, program: validators.program(selectedProgram) }))}
              error={cascadeErrors.program}
              disabled={loading}
              isLoading={loadingPrograms}
              options={programs}
              placeholder={programs.length === 0 && !loadingPrograms ? 'No programs available' : 'Select your program'}
            />
          ) : (
            <CascadeHint label="Program / Course" />
          )}

          {/* Major (only when program has majors) */}
          <AnimatePresence>
            {selectedProgram && (hasMajors || loadingMajors) && (
              <motion.div key="major" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <SelectField
                  label="Major (Optional)"
                  value={selectedMajor}
                  onChange={e => setSelectedMajor(e.target.value)}
                  disabled={loading}
                  isLoading={loadingMajors}
                  options={majors}
                  placeholder="Select your major"
                />
              </motion.div>
            )}
          </AnimatePresence>
          </>
          ) : (
            /* Department (employees) */
            selectedCampus ? (
              <SelectField
                label="Department"
                value={selectedDepartment}
                onChange={e => { setSelectedDepartment(e.target.value); setCascadeErrors(er => ({ ...er, department: '' })); }}
                onBlur={() => setCascadeErrors(er => ({ ...er, department: validators.department(selectedDepartment) }))}
                error={cascadeErrors.department}
                disabled={loading}
                isLoading={loadingDepartments}
                options={departments}
                custom
                placeholder={departments.length === 0 && !loadingDepartments ? 'No departments available' : 'Select your department'}
              />
            ) : (
              <CascadeHint label="Department" />
            )
          )}
        </div>

        {role === 'student' ? (
          <Field label="Email Address (Auto-generated)" type="email" value={form.email} onChange={() => {}} placeholder="Enter your Student Number above" error={fieldErrors.email} autoComplete="email" disabled />
        ) : (
          <Field label="PSU Email Address" type="email" value={form.email} onChange={handleChange('email')} onBlur={handleBlur('email')} placeholder={`yourname${PSU_DOMAIN}`} error={fieldErrors.email} autoComplete="email" disabled={loading} />
        )}
        <Field label="Password" type="password" value={form.password} onChange={handleChange('password')} onBlur={handleBlur('password')} placeholder="Enter your password" error={fieldErrors.password} autoComplete="new-password" disabled={loading} />
        <StrengthBar password={form.password} />
        <Field label="Confirm Password" type="password" value={form.confirm} onChange={handleChange('confirm')} onBlur={handleBlur('confirm')} placeholder="Re-enter your password" error={fieldErrors.confirm} autoComplete="new-password" disabled={loading} />

        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 7, padding: '5px 10px', fontSize: 9.5, fontFamily: FONT_BODY, color: '#5a3010', marginBottom: 4, lineHeight: 1.55 }}>
          Password: 8+ chars · 1 uppercase · 1 lowercase · 1 number
        </div>

        </div>

        {/* Fixed footer: no background/border, outside the scroll area. */}
        <div style={{ flexShrink: 0, padding: '10px 0 2px 0' }}>
          <AnimatePresence>{error && <ErrorBox message={error} />}</AnimatePresence>

          <PrimaryButton loading={loading} style={{ marginTop: 0 }}>Register</PrimaryButton>

          <p style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 11.5, fontFamily: FONT_BODY, color: '#6a3c1c' }}>
            Already have an account?{' '}
            <LinkBtn onClick={onGoLogin} style={{ fontSize: 11.5 }}>Log in here</LinkBtn>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}