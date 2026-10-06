import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AuthInput from './AuthInput';
import { completeGoogleProfile } from '../utils/googleAuthClient';

const FONT_BODY = "'Crimson Pro', Georgia, serif";
const FONT_SANS = "'Josefin Sans', sans-serif";
const STUDENT_NO_REGEX  = /^\d{10,}$/;
const EMPLOYEE_NO_REGEX = /^\d{5,}$/;

// ── compact dropdown, same look as SignupPage's SelectField ──────────────────
function Select({ label, value, onChange, options, placeholder, loading, disabled, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => String(o.id) === String(value));
  const off = disabled || loading;

  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);

  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, fontFamily: FONT_SANS, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: error ? '#b03020' : '#5a2800' }}>{label}</span>
        {error && <span style={{ fontSize: 10, color: '#b03020', fontFamily: FONT_BODY, fontStyle: 'italic' }}>{error}</span>}
      </div>
      <div ref={ref} style={{ position: 'relative' }}>
        <button type="button" disabled={off} aria-haspopup="listbox" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            width: '100%', padding: '8px 34px 8px 13px', borderRadius: 20, textAlign: 'left',
            border: `1.5px solid ${error ? 'rgba(176,48,32,0.75)' : open ? '#8B0000' : 'rgba(139,70,20,0.28)'}`,
            background: off ? '#E9D7AE' : '#F4E6C2', color: selected ? '#2d1000' : '#9a7040',
            fontSize: 12.5, fontFamily: FONT_BODY, boxSizing: 'border-box', outline: 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: off ? 'not-allowed' : 'pointer',
          }}>
          {selected ? selected.name : loading ? 'Loading…' : placeholder}
        </button>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="2.5"
          style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: 'transform .15s', pointerEvents: 'none', opacity: 0.65 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {open && (
          <div role="listbox" style={{
            position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 30, maxHeight: 180,
            overflowY: 'auto', padding: 4, background: '#F8EDCD', borderRadius: 14,
            border: '1.5px solid rgba(139,0,0,0.25)', boxShadow: '0 10px 24px rgba(60,20,0,0.25)',
          }}>
            {options.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: '#9a7040', fontFamily: FONT_BODY }}>No options available</div>}
            {options.map((o) => (
              <div key={o.id} role="option" aria-selected={String(o.id) === String(value)}
                onClick={() => { onChange(String(o.id)); setOpen(false); }}
                style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12.5, fontFamily: FONT_BODY, cursor: 'pointer',
                  color: '#2d1000', background: String(o.id) === String(value) ? 'rgba(139,0,0,0.12)' : 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = String(o.id) === String(value) ? 'rgba(139,0,0,0.12)' : 'transparent'; }}>
                {o.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const pick = (rows, nameKey) => (rows || []).map((r) => ({ id: r.id, name: r[nameKey] }));

export default function GoogleProfileSetup({ accessToken, accountType, prefill, onComplete, onCancel }) {
  const isStudent = accountType === 'student';
  const emailLocal = (prefill.email || '').split('@')[0];

  const [firstName, setFirstName] = useState(prefill.firstName || '');
  const [lastName,  setLastName]  = useState(prefill.lastName  || '');
  const [idNumber,  setIdNumber]  = useState(isStudent ? emailLocal : '');
  const [campus,  setCampus]  = useState('');
  const [college, setCollege] = useState('');
  const [program, setProgram] = useState('');
  const [major,   setMajor]   = useState('');
  const [dept,    setDept]    = useState('');

  const [campuses, setCampuses] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [majors,   setMajors]   = useState([]);
  const [depts,    setDepts]    = useState([]);
  const [busyList, setBusyList] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = (key, promise, set, nameKey) => {
    setBusyList((b) => ({ ...b, [key]: true }));
    promise.then(({ data }) => { set(pick(data, nameKey)); setBusyList((b) => ({ ...b, [key]: false })); });
  };

  useEffect(() => {
    load('campus', supabase.from('campuses').select('id, campus_name').eq('is_active', true).order('campus_name'), setCampuses, 'campus_name');
  }, []);

  useEffect(() => {
    setCollege(''); setProgram(''); setMajor(''); setDept('');
    setColleges([]); setPrograms([]); setMajors([]); setDepts([]);
    if (!campus) return;
    if (isStudent) load('college', supabase.from('colleges').select('id, college_name').eq('campus_id', campus).order('college_name'), setColleges, 'college_name');
    else load('dept', supabase.from('departments').select('id, department_name').eq('campus_id', campus).order('category').order('department_name'), setDepts, 'department_name');
  }, [campus, isStudent]);

  useEffect(() => {
    setProgram(''); setMajor(''); setPrograms([]); setMajors([]);
    if (!college) return;
    load('program', supabase.from('programs').select('id, program_name').eq('college_id', college).order('program_name'), setPrograms, 'program_name');
  }, [college]);

  useEffect(() => {
    setMajor(''); setMajors([]);
    if (!program) return;
    load('major', supabase.from('majors').select('id, major_name').eq('program_id', program).order('major_name'), setMajors, 'major_name');
  }, [program]);

  const validate = () => {
    const e = {};
    if (!prefill.firstName && firstName.trim().length < 2) e.firstName = 'Required.';
    if (!prefill.lastName  && lastName.trim().length  < 2) e.lastName  = 'Required.';
    if (isStudent ? !STUDENT_NO_REGEX.test(idNumber.trim()) : !EMPLOYEE_NO_REGEX.test(idNumber.trim())) {
      e.idNumber = isStudent ? 'At least 10 digits (numbers only).' : 'At least 5 digits (numbers only).';
    } else if (isStudent && idNumber.trim() !== emailLocal) e.idNumber = 'Must match your PSU email.';
    if (!campus) e.campus = 'Select your campus.';
    if (isStudent) {
      if (!college) e.college = 'Select your college.';
      if (!program) e.program = 'Select your course.';
      if (majors.length > 0 && !major) e.major = 'Select your major.';
    } else if (!dept) e.dept = 'Select your department.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      // NOTE: no `role` is sent — the server derives it and ignores any client value.
      await completeGoogleProfile(accessToken, {
        firstName: firstName.trim(), lastName: lastName.trim(), campusId: campus,
        ...(isStudent
          ? { studentNumber: idNumber.trim(), collegeId: college, programId: program, majorId: major || null }
          : { employeeNumber: idNumber.trim(), departmentId: dept }),
      });
      await onComplete();
    } catch (err) {
      setFormError(err.message);
      if (err.code === 'ID_TAKEN') setErrors((x) => ({ ...x, idNumber: 'Already registered.' }));
      setSaving(false);
    }
  };

  const label = (t) => (
    <p style={{ margin: '4px 0 8px', fontSize: 10, fontWeight: 700, fontFamily: FONT_SANS, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: '#8B0000' }}>{t}</p>
  );

  return (
    <motion.form onSubmit={submit} noValidate
      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column' }}>

      <div style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.38)', borderRadius: 10,
        padding: '8px 12px', fontSize: 12, fontFamily: FONT_BODY, color: '#5a3010', marginBottom: 10, lineHeight: 1.5 }}>
        Signed in with <b>{prefill.email}</b>. Finish your {isStudent ? 'student' : 'employee'} profile to continue.
      </div>

      {(!prefill.firstName || !prefill.lastName) && (
        <>
          {!prefill.firstName && <AuthInput label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} disabled={saving} />}
          {!prefill.lastName  && <AuthInput label="Last Name"  value={lastName}  onChange={(e) => setLastName(e.target.value)}  error={errors.lastName}  disabled={saving} />}
        </>
      )}

      <AuthInput
        label={isStudent ? 'Student Number' : 'Employee Number'}
        value={idNumber} onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
        placeholder={isStudent ? 'e.g. 2023929321' : 'Enter your employee number (5+ digits)'}
        error={errors.idNumber} disabled={saving || isStudent} autoComplete="off"
      />

      {label(isStudent ? 'Academic Information' : 'Employment Information')}
      <Select label="Campus" value={campus} onChange={setCampus} options={campuses} loading={busyList.campus}
        placeholder="Select your campus" disabled={saving} error={errors.campus} />

      {isStudent ? (
        <>
          <Select label="College" value={college} onChange={setCollege} options={colleges} loading={busyList.college}
            placeholder={campus ? 'Select your college' : 'Select a campus first'} disabled={saving || !campus} error={errors.college} />
          <Select label="Course" value={program} onChange={setProgram} options={programs} loading={busyList.program}
            placeholder={college ? 'Select your course' : 'Select a college first'} disabled={saving || !college} error={errors.program} />
          {majors.length > 0 && (
            <Select label="Major" value={major} onChange={setMajor} options={majors} loading={busyList.major}
              placeholder="Select your major" disabled={saving} error={errors.major} />
          )}
        </>
      ) : (
        <Select label="Department" value={dept} onChange={setDept} options={depts} loading={busyList.dept}
          placeholder={campus ? 'Select your department' : 'Select a campus first'} disabled={saving || !campus} error={errors.dept} />
      )}

      {formError && (
        <div style={{ background: 'rgba(192,57,43,0.09)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8,
          padding: '7px 12px', fontSize: 11.5, fontFamily: FONT_BODY, color: '#b03020', margin: '2px 0 4px' }}>{formError}</div>
      )}

      <motion.button type="submit" disabled={saving} whileTap={!saving ? { scale: 0.97 } : {}}
        style={{ width: '100%', padding: '11px 0', marginTop: 10, border: 'none', borderRadius: 22, color: '#F5E4A8',
          background: saving ? 'rgba(139,0,0,0.35)' : 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
          fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 18px rgba(139,0,0,0.35)' }}>
        {saving ? 'Saving…' : 'Save & Continue'}
      </motion.button>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button type="button" onClick={onCancel} disabled={saving}
          style={{ background: 'none', border: 'none', color: '#8B0000', cursor: 'pointer', fontFamily: FONT_BODY,
            fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>
          Cancel and use a different account
        </button>
      </div>
    </motion.form>
  );
}