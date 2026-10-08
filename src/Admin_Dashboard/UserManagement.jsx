import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/useAuth';

const G  = '#C9A84C';
const GP = '#F5E4A8';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Student / Employee numbers: digits only, at least 5 (same rule as signup).
const ID_NUMBER_REGEX = /^\d{5,}$/;
// Employees must use an official PSU email (exact domain match).
const PSU_DOMAIN = '@pampangastateu.edu.ph';
const PSU_EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@pampangastateu\.edu\.ph$/i;

// Which profiles column holds the ID number depends on the role.
const idColumnFor = (role) => (role === 'employee' ? 'employee_number' : 'student_number');

// Academic info is role-based: students get college/program/major, employees
// get a department. The fields that don't apply to the role are cleared.
function academicFields(f) {
  const isEmployee = f.role === 'employee';
  return {
    college_id:    isEmployee ? null : (f.college_id || null),
    program_id:    isEmployee ? null : (f.program_id || null),
    major_id:      isEmployee ? null : (f.major_id   || null),
    department_id: isEmployee ? (f.department_id || null) : null,
  };
}

function idFields(f) {
  const val = (f.id_number || '').trim();
  return val ? { [idColumnFor(f.role)]: val } : {};
}

// True when another profile already uses this Student/Employee Number.
async function checkIdNumberTaken(role, value) {
  const val = (value || '').trim();
  if (!val) return false;
  const { data, error } = await supabaseAdmin
    .from('profiles').select('id').eq(idColumnFor(role), val).maybeSingle();
  if (error) {
    console.error('[UserManagement] ID number uniqueness check failed:', error.message);
    return false;
  }
  return Boolean(data);
}

const Icon = {
  eye:    (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  search: (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:   (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  users:  (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  shield: (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  student:(s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
};

const ROLE_CONFIG = {
  student:         { label: 'Student',         bg: 'rgba(33,150,243,0.12)',  color: '#64b5f6',  border: 'rgba(100,181,246,0.28)' },
  employee:        { label: 'Employee',        bg: 'rgba(38,166,154,0.12)',  color: '#26a69a',  border: 'rgba(38,166,154,0.28)' },
  library_manager: { label: 'Library Manager', bg: 'rgba(139,0,0,0.10)',     color: '#c0392b',  border: 'rgba(139,0,0,0.28)' },
  super_admin:     { label: 'Super Admin',     bg: 'rgba(90,0,90,0.10)',     color: '#9c27b0',  border: 'rgba(156,39,176,0.28)' },
};

function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 11px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      fontFamily: 'var(--font-sans)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {c.label}
    </span>
  );
}

function Toast({ message, isError }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: isError ? 'rgba(100,0,0,0.96)' : 'var(--maroon-deep)',
      border: `1px solid ${isError ? 'rgba(239,154,154,0.40)' : 'rgba(201,168,76,0.35)'}`,
      borderRadius: 12, padding: '13px 22px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-sans)', fontSize: 13, color: GP,
      boxShadow: '0 10px 32px rgba(40,0,0,0.44)',
      animation: 'lm-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      maxWidth: 340,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: isError ? '#ef9a9a' : '#81c784',
      }} />
      {message}
    </div>
  );
}

// Custom dropdown used for the Department field. The native <select> popup is
// drawn by the browser/OS, so it ignores the modal's styling and can cover the
// fields above it. This one opens right under the field, matches the theme,
// scrolls inside a fixed max-height, and supports keyboard navigation.
function DepartmentDropdown({ options, value, onChange, placeholder, disabled, hasError, triggerStyle }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find(o => String(o.id) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex(o => String(o.id) === String(value));
    setActive(idx);
    requestAnimationFrame(() => {
      menuRef.current?.scrollIntoView({ block: 'nearest' });
      menuRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = o => { onChange(String(o.id)); setOpen(false); };

  const onKeyDown = e => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(options[active]); }
  };

  useEffect(() => {
    if (open && active >= 0) menuRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" className="um-input" disabled={disabled}
        data-invalid={hasError ? 'true' : undefined}
        aria-haspopup="listbox" aria-expanded={open}
        onClick={() => !disabled && setOpen(o => !o)} onKeyDown={onKeyDown}
        style={{ ...triggerStyle, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {selected ? selected.name : placeholder}
      </button>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ position: 'absolute', right: 14, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          transition: 'transform 0.15s', pointerEvents: 'none', color: 'var(--text-dim)' }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {open && (
        <div ref={menuRef} role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20,
          maxHeight: 220, overflowY: 'auto', padding: 4,
          background: '#FFFBF5', border: '1.5px solid rgba(139,0,0,0.25)', borderRadius: 10,
          boxShadow: '0 12px 28px rgba(60,0,0,0.22)',
        }}>
          {options.map((o, i) => {
            const isSel = String(o.id) === String(value);
            return (
              <div key={o.id} role="option" aria-selected={isSel} data-selected={isSel ? 'true' : undefined}
                onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                style={{
                  padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 13.5,
                  fontFamily: 'var(--font-sans)',
                  color: isSel ? '#8B0000' : 'var(--text-primary)', fontWeight: isSel ? 700 : 500,
                  background: isSel ? 'rgba(139,0,0,0.10)' : (i === active ? 'rgba(139,0,0,0.06)' : 'transparent'),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                <span>{o.name}</span>
                {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserModal({ user, existingUsers = [], campusId = null, onClose, onSave }) {
  const isEdit = Boolean(user?.id);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    role:       user?.role       || 'student',
    password:   '',
    id_number:  user?.student_number || user?.employee_number || '',
    college_id: user?.college_id || '',
    program_id: user?.program_id || '',
    major_id:   user?.major_id   || '',
    department_id: user?.department_id || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [showPw, setShowPw] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  // ── Academic info lookups ──
  // Campus is automatic: it's always the signed-in librarian's own campus.
  const [campusName,  setCampusName]  = useState('');
  const [colleges,    setColleges]    = useState([]);
  const [programs,    setPrograms]    = useState([]);
  const [majors,      setMajors]      = useState([]);
  const [departments, setDepartments] = useState([]);
  const [lookupsLoaded,  setLookupsLoaded]  = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!campusId) { setCampusName(''); setColleges([]); setDepartments([]); setLookupsLoaded(true); return undefined; }
    setLookupsLoaded(false);
    Promise.all([
      supabaseAdmin.from('campuses').select('campus_name').eq('id', campusId).maybeSingle(),
      supabaseAdmin.from('colleges').select('id, college_name').eq('campus_id', campusId).order('college_name'),
      supabaseAdmin.from('departments').select('id, department_name').eq('campus_id', campusId).order('category').order('department_name'),
    ]).then(([camp, col, dep]) => {
      if (!alive) return;
      setCampusName(camp?.data?.campus_name || '');
      setColleges((col?.data || []).map(c => ({ id: c.id, name: c.college_name })));
      setDepartments((dep?.data || []).map(d => ({ id: d.id, name: d.department_name })));
      setLookupsLoaded(true);
    }).catch(() => { if (alive) setLookupsLoaded(true); });
    return () => { alive = false; };
  }, [campusId]);

  useEffect(() => {
    let alive = true;
    if (!form.college_id) { setPrograms([]); setLoadingPrograms(false); return undefined; }
    setLoadingPrograms(true);
    supabaseAdmin.from('programs').select('id, program_name').eq('college_id', form.college_id).order('program_name')
      .then(({ data }) => { if (alive) { setPrograms((data || []).map(p => ({ id: p.id, name: p.program_name }))); setLoadingPrograms(false); } });
    return () => { alive = false; };
  }, [form.college_id]);

  useEffect(() => {
    let alive = true;
    if (!form.program_id) { setMajors([]); return undefined; }
    supabaseAdmin.from('majors').select('id, major_name').eq('program_id', form.program_id).order('major_name')
      .then(({ data }) => { if (alive) setMajors((data || []).map(m => ({ id: m.id, name: m.major_name }))); });
    return () => { alive = false; };
  }, [form.program_id]);

  // Esc closes the dialog (unless a save is in flight).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  // Student and Employee need different academic fields, so changing the
  // role clears the ones that no longer apply.
  const handleRoleChange = (e) => {
    const role = e.target.value;
    setForm(f => ({ ...f, role, college_id: '', program_id: '', major_id: '', department_id: '' }));
    setErrors(er => ({ ...er, id_number: '', email: '', college_id: '', program_id: '', department_id: '' }));
  };

  // Uniqueness is decided by the ID number embedded in the email
  // (e.g. 2023313839@pampangastateu.edu.ph), never by name — two different
  // real students can share the exact same name, so name is not a valid
  // way to detect duplicate accounts.
  const normEmail = (e) => (e || '').trim().toLowerCase();

  const isDuplicateEmail = (email) => {
    const target = normEmail(email);
    if (!target) return false;
    return existingUsers.some(u => u.id !== user?.id && normEmail(u.email) === target);
  };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';

    if (!isEdit) {
      if (!form.email.trim())                                    errs.email    = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))  errs.email    = 'Invalid email format.';
      else if (form.role === 'employee' && !PSU_EMAIL_REGEX.test(form.email.trim()))
                                                                 errs.email    = `Employees must use a ${PSU_DOMAIN} email address.`;
      // Unique email / student ID check — email is only editable on create,
      // since it doubles as the account's login and ID number.
      else if (isDuplicateEmail(form.email))                     errs.email    = 'This ID number / email is already registered.';
      if (!form.password)                                        errs.password = 'Password is required.';
      else if (form.password.length < 8)                         errs.password = 'Minimum 8 characters.';
    } else {
      if (form.password && form.password.length < 8)             errs.password = 'Minimum 8 characters.';
    }
    if (!isEdit) {
      const idLabel = form.role === 'employee' ? 'Employee number' : 'Student number';
      const idCol   = idColumnFor(form.role);
      if (!form.id_number.trim())                       errs.id_number = `${idLabel} is required.`;
      else if (!ID_NUMBER_REGEX.test(form.id_number.trim())) errs.id_number = 'Must be at least 5 digits (numbers only).';
      else if (existingUsers.some(u => (u[idCol] || '') === form.id_number.trim()))
                                                        errs.id_number = `This ${idLabel} is already registered.`;

      if (form.role === 'employee') {
        if (!form.department_id) errs.department_id = 'Please select a department.';
      } else {
        if (!form.college_id) errs.college_id = 'Please select a college.';
        if (!form.program_id) errs.program_id = 'Please select a program.';
      }
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      setTimeout(() => document.querySelector('.um-modal-body [data-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
      return;
    }
    setSaving(true); setApiErr('');
    try {
      if (!isEdit && await checkIdNumberTaken(form.role, form.id_number)) {
        const idLabel = form.role === 'employee' ? 'Employee number' : 'Student number';
        setErrors(er => ({ ...er, id_number: `This ${idLabel} is already registered.` }));
        return;
      }
      await onSave({ ...form, id: user?.id });
      onClose();
    } catch (err) {
      setApiErr(err.message || 'An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const SectionTitle = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ width: 3, height: 15, borderRadius: 2, flexShrink: 0, background: `linear-gradient(180deg, ${G}, var(--maroon-mid))` }} />
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--maroon-mid)', whiteSpace: 'nowrap',
      }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'rgba(139,0,0,0.14)' }} />
    </div>
  );

  const inputStyle = (hasErr) => ({
    width: '100%', padding: '10px 13px',
    background: 'var(--cream-light)', color: 'var(--text-primary)',
    border: `1px solid ${hasErr ? 'rgba(192,86,78,0.75)' : 'rgba(139,0,0,0.22)'}`,
    borderRadius: 9, fontSize: 13.5, fontFamily: 'var(--font-sans)',
    outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s',
    boxSizing: 'border-box', textAlign: 'left',
  });

  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-sans)', textAlign: 'left',
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
  };

  const noteStyle = {
    fontWeight: 400, textTransform: 'none', letterSpacing: 0,
    marginLeft: 6, color: 'var(--text-dim)', fontSize: 10.5,
  };

  // Label + control + error/hint. Called as a plain function (not a
  // component) so inputs keep focus while typing.
  const field = (label, { required = false, error = '', hint = '', note = '', span2 = false } = {}, control) => (
    <div className={span2 ? 'um-span2' : undefined} style={{ textAlign: 'left', minWidth: 0 }}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: '#c0564e', marginLeft: 3 }}>*</span>}
        {note && <span style={noteStyle}>{note}</span>}
      </label>
      {control}
      {error
        ? <span role="alert" style={{ fontSize: 11.5, color: '#c0564e', fontFamily: 'var(--font-sans)', marginTop: 5, display: 'block', textAlign: 'left' }}>{error}</span>
        : hint
          ? <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', marginTop: 5, display: 'block', textAlign: 'left' }}>{hint}</span>
          : null}
    </div>
  );

  const chevron = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-dim)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const selectStyle = (hasErr, value, disabled) => ({
    ...inputStyle(hasErr), appearance: 'none', WebkitAppearance: 'none',
    paddingRight: 36, textOverflow: 'ellipsis',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: value ? 'var(--text-primary)' : 'var(--text-dim)',
    ...(disabled ? { opacity: 0.65, background: 'rgba(139,0,0,0.04)' } : {}),
  });

  const handleSelectChange = (key, v) => {
    if (key === 'college_id')      setForm(f => ({ ...f, college_id: v, program_id: '', major_id: '' }));
    else if (key === 'program_id') setForm(f => ({ ...f, program_id: v, major_id: '' }));
    else                           setForm(f => ({ ...f, [key]: v }));
    setErrors(er => ({ ...er, [key]: '' }));
  };

  const renderSelect = (label, key, options, placeholder, { optional = false, disabled = false, hint = '', custom = false } = {}) =>
    field(label, { required: !optional, error: errors[key], hint, note: optional ? '(optional)' : '', span2: true },
      custom ? (
        <DepartmentDropdown options={options} value={form[key]} placeholder={placeholder} disabled={disabled}
          hasError={!!errors[key]} onChange={v => handleSelectChange(key, v)}
          triggerStyle={selectStyle(errors[key], form[key], disabled)} />
      ) : (
      <div style={{ position: 'relative' }}>
        <select className="um-input" data-invalid={errors[key] ? 'true' : undefined}
          value={form[key]} disabled={disabled}
          onChange={e => handleSelectChange(key, e.target.value)}
          style={selectStyle(errors[key], form[key], disabled)}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {chevron}
      </div>)
    );

  const collegePlaceholder = !lookupsLoaded ? 'Loading colleges…' : (colleges.length === 0 ? 'No colleges available' : 'Select college');
  const programPlaceholder = !form.college_id ? 'Select a college first'
    : loadingPrograms ? 'Loading programs…'
    : (programs.length === 0 ? 'No programs available' : 'Select program / course');
  const deptPlaceholder = !lookupsLoaded ? 'Loading departments…' : (departments.length === 0 ? 'No departments available' : 'Select department');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,0,0,0.72)',
      backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, padding: 24,
      animation: 'lm-fade-in 0.2s ease',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        .um-input::placeholder { color: var(--text-dim); opacity: 0.85; }
        .um-input:focus { border-color: #8B0000 !important; box-shadow: 0 0 0 3px rgba(139,0,0,0.10); }
        .um-input[data-invalid="true"]:focus { border-color: #c0564e !important; box-shadow: 0 0 0 3px rgba(192,86,78,0.16); }
        .um-input:disabled { cursor: not-allowed; }
        .um-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 14px; }
        .um-span2 { grid-column: 1 / -1; }
        .um-modal-body::-webkit-scrollbar { width: 6px; }
        .um-modal-body::-webkit-scrollbar-thumb { background: rgba(139,0,0,0.25); border-radius: 10px; }
        @media (max-width: 560px) { .um-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit user account' : 'Add new user'} style={{
        background: 'var(--cream)', borderRadius: 16,
        border: '1px solid rgba(139,0,0,0.20)',
        boxShadow: '0 24px 64px rgba(40,0,0,0.50), 0 0 0 1px rgba(201,168,76,0.10)',
        width: '100%', maxWidth: 640,
        maxHeight: 'calc(100vh - 48px)',
        display: 'flex', flexDirection: 'column',
        animation: 'lm-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 26px',
          background: 'linear-gradient(135deg, var(--maroon-deep), var(--maroon-mid))',
          borderBottom: '1px solid rgba(201,168,76,0.20)',
          flexShrink: 0, position: 'relative',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.40),transparent)' }} />
          <div style={{ textAlign: 'left' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600,
              color: GP, letterSpacing: '0.05em', margin: 0,
            }}>
              {isEdit ? 'Edit User Account' : 'Add New User'}
            </h2>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'rgba(245,228,168,0.65)', marginTop: 3 }}>
              {isEdit ? 'Update this account’s details.' : 'Create a student or employee account for your campus.'}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
            color: 'rgba(245,228,168,0.70)', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.22)'; e.currentTarget.style.color = GP; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.10)'; e.currentTarget.style.color = 'rgba(245,228,168,0.70)'; }}
          >✕</button>
        </div>

        <form noValidate onSubmit={e => { e.preventDefault(); handleSave(); }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          <div className="um-modal-body" style={{ padding: '22px 26px', overflowY: 'auto', background: 'var(--cream-light)', flex: 1, minHeight: 0 }}>

            <SectionTitle>User Information</SectionTitle>
            <div className="um-grid">
              {field('First Name', { required: true, error: errors.first_name },
                <input className="um-input" data-invalid={errors.first_name ? 'true' : undefined} style={inputStyle(errors.first_name)}
                  value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" autoComplete="off" />)}

              {field('Last Name', { required: true, error: errors.last_name },
                <input className="um-input" data-invalid={errors.last_name ? 'true' : undefined} style={inputStyle(errors.last_name)}
                  value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" autoComplete="off" />)}

              {!isEdit && field('Email Address', { required: true, error: errors.email, span2: true },
                <input className="um-input" data-invalid={errors.email ? 'true' : undefined} style={inputStyle(errors.email)}
                  type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder={form.role === 'employee' ? `yourname${PSU_DOMAIN}` : 'e.g. 2023929321@pampangastateu.edu.ph'} autoComplete="off" />)}

              {field('Role', { required: true, note: isEdit ? '(locked)' : '' },
                <div style={{ position: 'relative' }}>
                  <select className="um-input" value={form.role} disabled={isEdit} onChange={handleRoleChange}
                    style={selectStyle(false, form.role, isEdit)}>
                    <option value="student">Student</option>
                    <option value="employee">Employee</option>
                  </select>
                  {chevron}
                </div>)}

              {field(form.role === 'employee' ? 'Employee Number' : 'Student Number',
                { required: !isEdit, error: errors.id_number, note: isEdit ? '(locked)' : '', hint: isEdit ? '' : '' },
                <input className="um-input" data-invalid={errors.id_number ? 'true' : undefined}
                  style={{ ...inputStyle(errors.id_number), ...(isEdit ? { opacity: 0.7, background: 'rgba(139,0,0,0.04)' } : {}) }}
                  inputMode="numeric" value={form.id_number} disabled={isEdit}
                  onChange={e => set('id_number', e.target.value.replace(/\D/g, ''))}
                  placeholder={isEdit ? '—' : 'e.g. 2023929321'} autoComplete="off" />)}

              {(form.role === 'library_manager' || form.role === 'admin') && (
                <div className="um-span2" style={{
                  padding: '8px 12px', borderRadius: 7,
                  background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.22)',
                  fontSize: 11.5, color: G, fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {form.role === 'admin' ? 'Administrator' : 'Library Manager'} accounts have full system access.
                </div>
              )}

              {field(isEdit ? 'New Password' : 'Password',
                { required: !isEdit, error: errors.password, span2: true, note: isEdit ? '(leave blank to keep current)' : '', hint: isEdit ? '' : 'Minimum 8 characters.' },
                <div style={{ position: 'relative' }}>
                  <input className="um-input" data-invalid={errors.password ? 'true' : undefined}
                    style={{ ...inputStyle(errors.password), paddingRight: 42 }}
                    type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder={isEdit ? 'Leave blank to keep current' : 'Create a password'} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-dim)', display: 'flex', padding: 4,
                  }}>
                    {showPw ? Icon.eyeOff(15) : Icon.eye(15)}
                  </button>
                </div>)}
            </div>

            <div style={{ height: 24 }} />

            <SectionTitle>Academic Information</SectionTitle>
            <div className="um-grid">
              {field('Campus', { span2: true, note: '(automatic)', hint: 'Users are added to your campus automatically.' },
                <div style={{ position: 'relative' }}>
                  <input className="um-input" readOnly disabled
                    style={{ ...inputStyle(false), paddingRight: 38, background: 'rgba(139,0,0,0.05)', borderStyle: 'dashed', color: 'var(--text-muted)' }}
                    value={campusName || (campusId ? 'Loading…' : 'No campus assigned')} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>)}

              {form.role === 'employee' ? (
                renderSelect('Department', 'department_id', departments, deptPlaceholder,
                  { disabled: !lookupsLoaded || departments.length === 0, custom: true })
              ) : (
                <>
                  {renderSelect('College', 'college_id', colleges, collegePlaceholder,
                    { disabled: !lookupsLoaded || colleges.length === 0 })}
                  {renderSelect('Program / Course', 'program_id', programs, programPlaceholder,
                    { disabled: !form.college_id || loadingPrograms || programs.length === 0 })}
                  {form.program_id && majors.length > 0 &&
                    renderSelect('Major', 'major_id', majors, 'Select major', { optional: true })}
                </>
              )}
            </div>
          </div>

          {apiErr && (
            <div role="alert" style={{
              flexShrink: 0, background: 'rgba(139,0,0,0.08)', borderTop: '1px solid rgba(139,0,0,0.24)',
              padding: '10px 26px', fontSize: 12.5, color: 'var(--maroon-light)', fontFamily: 'var(--font-sans)', textAlign: 'left',
            }}>{apiErr}</div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '14px 26px', flexShrink: 0,
            borderTop: '1px solid rgba(139,0,0,0.14)',
            background: 'rgba(139,0,0,0.04)',
          }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
              <span style={{ color: '#c0564e' }}>*</span> Required
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} disabled={saving} style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 13,
                border: '1px solid rgba(139,0,0,0.22)', background: 'transparent',
                color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
                transition: 'all 0.18s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Cancel</button>
              <button type="submit" disabled={saving} style={{
                padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(201,168,76,0.35)',
                background: saving ? 'rgba(139,0,0,0.5)' : 'linear-gradient(135deg,#8B0000,#5A0000)',
                color: GP, fontFamily: 'var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 3px 12px rgba(80,0,0,0.28)', transition: 'all 0.18s',
              }}>
                {saving
                  ? <><span style={{ width: 13, height: 13, border: `2px solid rgba(245,228,168,0.3)`, borderTopColor: GP, borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block' }}/> Saving…</>
                  : (isEdit ? 'Save Changes' : 'Create User')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ user, loading, onClose, onConfirm }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(10,0,0,0.78)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'lm-fade-in 0.2s ease',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 20, width: '100%', maxWidth: 380,
        border: '2px solid rgba(201,168,76,0.35)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        animation: 'lm-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #8B0000, #6B0000)',
          padding: '18px 24px', borderBottom: '2px solid rgba(201,168,76,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#F5E4A8', fontWeight: 700 }}>Delete User Account</div>
            <div style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.6)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>This action cannot be undone</div>
          </div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 18,
            background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.15)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a0000', fontFamily: 'var(--font-sans)' }}>
              {user?.first_name} {user?.last_name}
            </div>
            {user?.email && (
              <div style={{ fontSize: 12, color: '#6b4040', fontFamily: 'var(--font-sans)', marginTop: 2 }}>{user.email}</div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={onClose} disabled={loading} style={{
              padding: '12px', borderRadius: 10, border: '1.5px solid rgba(139,0,0,0.2)',
              background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: '#8B0000',
            }}>Cancel</button>
            <button onClick={onConfirm} disabled={loading} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(139,0,0,0.35)' : 'linear-gradient(135deg, #8B0000, #6B0000)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: '#F5E4A8',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(139,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              {loading
                ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block' }}/> Deleting…</>
                : 'Delete User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement({ onStatsRefresh }) {
  // Phase 9 — campus isolation
  const { profile } = useAuth();
  const campusId = profile?.campus_id ?? null;

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [modalUser,  setModalUser]  = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [toast,      setToast]      = useState('');
  const [toastError, setToastError] = useState(false);

  const showToast = (msg, isError = false) => {
    setToast(msg); setToastError(isError);
    setTimeout(() => setToast(''), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let _q = supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, student_number, employee_number, role, created_at, avatar_url, campus_id, college_id, program_id, major_id, department_id')
        .order('created_at', { ascending: false });
      // Phase 9: librarian only sees users from their campus
      if (campusId) _q = _q.eq('campus_id', campusId);
      const { data, error } = await _q;
      if (error) throw error;
      // Only Super Admin manages Library Manager accounts, so this panel
      // (used by Library Managers themselves) only ever shows students —
      // exclude both super_admin and library_manager from the list.
      const visible = (data || []).filter(u => u.role !== 'super_admin' && u.role !== 'library_manager');
      // Fallback: if a profile's avatar_url is empty but the photo is still in
      // the 'avatars' bucket (uploads live at <user-id>/avatar.<ext>), rebuild
      // its public URL so the picture shows again. Display-only — nothing is
      // written back to the database.
      const withAvatars = await Promise.all(visible.map(async (u) => {
        if (u.avatar_url) return u;
        try {
          const { data: files } = await supabaseAdmin.storage.from('avatars')
            .list(u.id, { limit: 5, sortBy: { column: 'updated_at', order: 'desc' } });
          const f = (files || []).find(x => x.id && /^avatar\./i.test(x.name));
          if (!f) return u;
          const { data: pub } = supabaseAdmin.storage.from('avatars').getPublicUrl(`${u.id}/${f.name}`);
          return { ...u, avatar_url: pub?.publicUrl ? `${pub.publicUrl}?t=${new Date(f.updated_at || Date.now()).getTime()}` : null };
        } catch { return u; }
      }));
      setUsers(withAvatars);
    } catch (err) {
      showToast('Failed to load users: ' + err.message, true);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [campusId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSave = async (formData) => {
    if (formData.id) {
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ first_name: formData.first_name.trim(), last_name: formData.last_name.trim(), role: formData.role, ...academicFields(formData), updated_at: new Date().toISOString() })
        .eq('id', formData.id);
      if (profileErr) throw profileErr;

      if (formData.password) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(formData.id, { password: formData.password });
        if (pwErr) throw pwErr;
      }
      showToast('User updated successfully.');
    } else {
      // The account is NOT created yet: the server keeps these details as a
      // pending signup and only creates the user (and profile) once they click
      // the confirmation link in their email.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          email: formData.email.trim(), password: formData.password,
          profile: {
            first_name: formData.first_name.trim(), last_name: formData.last_name.trim(),
            role: formData.role,
            ...idFields(formData), ...academicFields(formData),
            // Phase 9: stamp campus_id so the new user belongs to this librarian's campus
            ...(campusId ? { campus_id: campusId } : {}),
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not create the user.');
      if (json.emailSent) showToast(`Confirmation email sent to ${formData.email.trim()}. The account will be created once they confirm.`);
      else showToast('Saved, but the confirmation email could not be sent. The user can tap "Resend" on the login page.', true);
    }
    await loadUsers();
    onStatsRefresh?.();
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const { error: profileErr } = await supabaseAdmin.from('profiles').delete().eq('id', deleteUser.id);
      if (profileErr) throw profileErr;
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(deleteUser.id);
      if (authErr) throw authErr;
      showToast('User deleted successfully.');
      setDeleteUser(null);
      await loadUsers();
      onStatsRefresh?.();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || [u.first_name, u.last_name, u.email].join(' ').toLowerCase().includes(q);
  });

  return (
    <div className="lm-module">
      <Toast message={toast} isError={toastError} />

      <div className="um-toolbar" style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
        padding: '14px 16px', borderRadius: 10,
        background: 'linear-gradient(135deg,rgba(139,0,0,0.04),rgba(201,168,76,0.03))',
        border: '1px solid rgba(139,0,0,0.10)',
      }}>
        <div className="um-search-wrap" style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
            {Icon.search(14)}
          </span>
          <input
            type="text" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="lm-search"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <span style={{
          fontSize: 11.5, color: 'var(--text-dim)',
          fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          padding: '5px 12px', borderRadius: 6,
          background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.12)',
        }}>
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </span>
        <button onClick={loadUsers} title="Refresh" style={{
          padding: '9px 11px', borderRadius: 8, fontSize: 12,
          border: '1px solid rgba(139,0,0,0.20)', background: 'transparent',
          color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          transition: 'all 0.18s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.26"/></svg>
        </button>
        <button
          className="lm-btn lm-btn--primary"
          style={{ gap: 7 }}
          onClick={() => { setModalUser(null); setShowModal(true); }}
        >
          {Icon.plus(14)} Add User
        </button>
      </div>

      {loading ? (
        <div className="lm-loading">
          <div className="lm-spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading users…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="lm-empty">
          <div className="lm-empty-icon">👥</div>
          <div className="lm-empty-text">No users found</div>
          {search && <div className="lm-empty-sub">Try a different search term.</div>}
        </div>
      ) : (
        <div className="um-table-scroll" style={{
          borderRadius: 10, border: '1px solid rgba(139,0,0,0.13)',
          overflow: 'auto', overflowX: 'auto', boxShadow: '0 2px 12px rgba(30,0,0,0.07)',
          WebkitOverflowScrolling: 'touch',
        }}>
          <table className="um-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 620 }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #8B0000, #6B0000)',
                borderBottom: '2px solid rgba(201,168,76,0.35)',
              }}>
                {['Name', 'ID Number', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontFamily: 'var(--font-sans)', fontSize: 10.5,
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#F5E4A8', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => (
                <UserRow
                  key={u.id}
                  user={u}
                  idx={idx}
                  onEdit={() => { setModalUser(u); setShowModal(true); }}
                  onDelete={() => setDeleteUser(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <UserModal user={modalUser} existingUsers={users} campusId={campusId} onClose={() => { setShowModal(false); setModalUser(null); }} onSave={handleSave} />
      )}
      {deleteUser && (
        <ConfirmDeleteModal user={deleteUser} loading={deleting}
          onClose={() => setDeleteUser(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}

function UserRow({ user: u, idx, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const [badAvatar, setBadAvatar] = useState(null); // avatar URL that failed to load → show initials instead
  const initials = ((u.first_name?.[0] || u.email?.[0] || '?') + (u.last_name?.[0] || '')).toUpperCase();
  const displayName = (u.first_name || u.last_name)
    ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
    : null;

  return (
    <tr
      className="um-row"
      data-notif-target={`user:${u.id}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(139,0,0,0.04)' : (idx % 2 === 0 ? 'transparent' : 'rgba(139,0,0,0.015)'),
        borderBottom: '1px solid rgba(139,0,0,0.07)',
        transition: 'background 0.14s',
      }}
    >
      <td className="um-td um-td-name" data-label="Name" style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--maroon-mid), var(--maroon-deep))',
            border: '1.5px solid rgba(201,168,76,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: GP,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}>
            {u.avatar_url && badAvatar !== u.avatar_url
              ? <img src={u.avatar_url} alt={initials} onError={() => setBadAvatar(u.avatar_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : initials}
          </div>
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
          }}>
            {displayName || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontWeight: 400 }}>No name</span>}
          </span>
        </div>
      </td>
      <td className="um-td" data-label="ID Number" style={{ padding: '12px 14px', verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'left' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{u.student_number || u.employee_number || '—'}</span>
      </td>
      <td className="um-td" data-label="Email" style={{ padding: '12px 14px', verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'left' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{u.email || '—'}</span>
      </td>
      <td className="um-td" data-label="Role" style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'left' }}>
        <RoleBadge role={u.role} />
      </td>
      <td className="um-td" data-label="Joined" style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          {u.created_at
            ? new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </span>
      </td>
      <td className="um-td um-td-actions" data-label="Actions" style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'left' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <ActionBtn variant="edit" onClick={onEdit}>
            {Icon.edit(12)} Edit
          </ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>
            {Icon.trash(12)}
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ variant, onClick, children }) {
  const [hov, setHov] = useState(false);
  const styles = {
    edit:   { color: 'var(--maroon-mid)', bg: 'rgba(139,0,0,0.07)', border: 'rgba(139,0,0,0.20)', hover: 'rgba(139,0,0,0.14)' },
    delete: { color: '#c0564e', bg: 'rgba(192,86,78,0.07)', border: 'rgba(192,86,78,0.20)', hover: 'rgba(192,86,78,0.14)' },
  };
  const s = styles[variant];
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
        fontFamily: 'var(--font-sans)', cursor: 'pointer',
        border: `1px solid ${s.border}`,
        background: hov ? s.hover : s.bg, color: s.color,
        transition: 'background 0.15s, transform 0.12s',
        transform: hov ? 'translateY(-1px)' : 'none',
      }}
    >{children}</button>
  );
}