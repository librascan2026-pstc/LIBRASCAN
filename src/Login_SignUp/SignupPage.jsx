import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthLayout from './AuthLayout';

const PSU_DOMAIN = '@pampangastateu.edu.ph';
const FONT_BODY  = "'Crimson Pro', Georgia, serif";
const FONT_SANS  = "'Josefin Sans', sans-serif";

// ─── Validators ───────────────────────────────────────────────────────────────
const NAME_REGEX        = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
const MIDDLE_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.\-]*$/;
const USERNAME_REGEX    = /^[A-Za-z0-9_\-]+$/;
const STUDENT_NO_REGEX  = /^\d{4}-\d{5,7}$/;

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
    if (!STUDENT_NO_REGEX.test(v.trim())) return 'Format must be YYYY-NNNNNNN (e.g. 2023-9293210).';
    return '';
  },
  campus:  (v) => (!v ? 'Please select your campus.'  : ''),
  college: (v) => (!v ? 'Please select your college.' : ''),
  program: (v) => (!v ? 'Please select your program.' : ''),
  email: (v) => {
    if (!v.trim()) return 'Email is required.';
    if (!v.trim().toLowerCase().endsWith(PSU_DOMAIN)) return `Must be a ${PSU_DOMAIN} address.`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email.';
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
            width: '100%', padding: isPassword ? '7px 32px 7px 12px' : '7px 12px',
            borderRadius: 18, border: `1.5px solid ${borderColor}`,
            background: disabled ? 'rgba(230,215,190,0.5)' : 'rgba(255,252,242,0.92)',
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
function SelectField({ label, value, onChange, onBlur, error, disabled, options, placeholder, isLoading }) {
  const [focused, setFocused] = useState(false);
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
        <select
          value={value} onChange={onChange} onBlur={onBlur}
          onFocus={() => setFocused(true)}
          disabled={disabled || isLoading}
          style={{
            width: '100%', padding: '7px 32px 7px 12px', borderRadius: 18,
            border: `1.5px solid ${borderColor}`,
            background: (disabled || isLoading) ? 'rgba(230,215,190,0.5)' : 'rgba(255,252,242,0.92)',
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
    </div>
  );
}

// Cascade hint shown when a parent selection is needed
function CascadeHint({ label }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, fontFamily: FONT_SANS, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a2800', marginBottom: 3 }}>
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
  studentNumber: '', email: '', password: '', confirm: '',
};

export default function SignupPage({ onGoLogin, onGoLanding }) {
  const [form,        setForm]    = useState(EMPTY);
  const [touched,     setTouched] = useState({});
  const [fieldErrors, setFE]      = useState({});
  const [loading,     setLoad]    = useState(false);
  const [error,       setError]   = useState('');
  const [success,     setOk]      = useState(false);

  // ── Cascade state ──
  const [campuses,   setCampuses]   = useState([]);
  const [colleges,   setColleges]   = useState([]);
  const [programs,   setPrograms]   = useState([]);
  const [majors,     setMajors]     = useState([]);

  const [selectedCampus,  setSelectedCampus]  = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedMajor,   setSelectedMajor]   = useState('');

  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingMajors,   setLoadingMajors]   = useState(false);
  const [hasMajors,       setHasMajors]       = useState(false);

  const [cascadeErrors, setCascadeErrors] = useState({ campus: '', college: '', program: '' });

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

  // ── Field handlers ──
  const handleChange = (field) => (e) => {
    const val = e.target.value;
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

  const handleBlur = (field) => () => {
    setTouched(t => ({ ...t, [field]: true }));
    const err = field === 'confirm' ? validators.confirm(form.confirm, form) : validators[field]?.(form[field]) ?? '';
    setFE(fe => ({ ...fe, [field]: err }));
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    // Validate text fields
    const allTouched = Object.fromEntries(Object.keys(EMPTY).map(k => [k, true]));
    setTouched(allTouched);
    const errs = {};
    Object.keys(EMPTY).forEach(field => {
      const err = field === 'confirm' ? validators.confirm(form.confirm, form) : validators[field]?.(form[field]) ?? '';
      if (err) errs[field] = err;
    });
    setFE(errs);

    // Validate cascade fields
    const cErrs = {
      campus:  validators.campus(selectedCampus),
      college: validators.college(selectedCollege),
      program: validators.program(selectedProgram),
    };
    setCascadeErrors(cErrs);

    if (Object.keys(errs).length || cErrs.campus || cErrs.college || cErrs.program) return;

    setLoad(true);

    // 1. Create auth user
    const { data: sd, error: authErr } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          first_name:     form.firstName.trim(),
          last_name:      form.lastName.trim(),
          middle_name:    form.middleName.trim(),
          username:       form.username.trim(),
          student_number: form.studentNumber.trim(),
          role:           'student',
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

    // 2. Upsert profile with all FK ids + legacy program text
    if (sd?.user) {
      const programName = programs.find(p => p.id === selectedProgram)?.name || '';
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id:             sd.user.id,
        first_name:     form.firstName.trim(),
        last_name:      form.lastName.trim(),
        middle_name:    form.middleName.trim(),
        username:       form.username.trim(),
        email:          form.email.trim().toLowerCase(),
        student_number: form.studentNumber.trim(),
        campus_id:      selectedCampus,
        college_id:     selectedCollege,
        program_id:     selectedProgram,
        major_id:       selectedMajor || null,
        program_legacy: programName,
        role:           'student',
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'id' });

      if (profileErr) console.error('[SignupPage] profiles upsert error:', profileErr.message);
    }

    setLoad(false);
    setOk(true);
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
            1. Open the email from PSU Library<br />
            2. Click the confirmation link<br />
            3. Return here and log in
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

        <Field label="First Name" value={form.firstName} onChange={handleChange('firstName')} onBlur={handleBlur('firstName')} placeholder="Enter your first name" error={fieldErrors.firstName} disabled={loading} />
        <Field label="Last Name" value={form.lastName} onChange={handleChange('lastName')} onBlur={handleBlur('lastName')} placeholder="Enter your last name" error={fieldErrors.lastName} disabled={loading} />
        <Field label="Middle Name (Optional)" value={form.middleName} onChange={handleChange('middleName')} onBlur={handleBlur('middleName')} placeholder="Enter your middle name" error={fieldErrors.middleName} disabled={loading} />
        <Field label="Username" value={form.username} onChange={handleChange('username')} onBlur={handleBlur('username')} placeholder="Enter your username" error={fieldErrors.username} autoComplete="username" disabled={loading} />
        <Field label="Student Number" value={form.studentNumber} onChange={handleChange('studentNumber')} onBlur={handleBlur('studentNumber')} placeholder="e.g. 2023-9293210" error={fieldErrors.studentNumber} disabled={loading} />

        {/* ── Cascading academic info ── */}
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 10, padding: '10px 12px 6px', marginBottom: 8 }}>
          <div style={{ fontSize: 8, fontFamily: FONT_SANS, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(139,70,20,0.55)', marginBottom: 8 }}>
            Academic Information
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
        </div>

        <Field label="Email Address" type="email" value={form.email} onChange={handleChange('email')} onBlur={handleBlur('email')} placeholder={`e.g. 2023929321${PSU_DOMAIN}`} error={fieldErrors.email} autoComplete="email" disabled={loading} />
        <Field label="Password" type="password" value={form.password} onChange={handleChange('password')} onBlur={handleBlur('password')} placeholder="Enter your password" error={fieldErrors.password} autoComplete="new-password" disabled={loading} />
        <StrengthBar password={form.password} />
        <Field label="Confirm Password" type="password" value={form.confirm} onChange={handleChange('confirm')} onBlur={handleBlur('confirm')} placeholder="Re-enter your password" error={fieldErrors.confirm} autoComplete="new-password" disabled={loading} />

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