// src/Admin_Dashboard/UserManagement.jsx

import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';

const G  = '#C9A84C';
const GP = '#F5E4A8';

// ─── Icons ────────────────────────────────────────────────────────────────────
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

// ─── Role Config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  student:         { label: 'Student',         bg: 'rgba(33,150,243,0.12)',  color: '#64b5f6',  border: 'rgba(100,181,246,0.28)' },
  library_manager: { label: 'Library Manager', bg: 'rgba(239,154,154,0.12)', color: '#ef9a9a',  border: 'rgba(239,154,154,0.28)' },
  admin:           { label: 'Administrator',   bg: 'rgba(201,168,76,0.14)',  color: '#C9A84C',  border: 'rgba(201,168,76,0.30)' },
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

// ─── Toast ────────────────────────────────────────────────────────────────────
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

// ─── User Modal (Add / Edit) ──────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }) {
  const isEdit = Boolean(user?.id);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    role:       user?.role       || 'student',
    password:   '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [showPw, setShowPw] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';
    if (!isEdit) {
      if (!form.email.trim())                                    errs.email    = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))  errs.email    = 'Invalid email format.';
      if (!form.password)                                        errs.password = 'Password is required.';
      else if (form.password.length < 8)                         errs.password = 'Minimum 8 characters.';
    } else {
      if (form.password && form.password.length < 8)             errs.password = 'Minimum 8 characters.';
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      await onSave({ ...form, id: user?.id });
      onClose();
    } catch (err) {
      setApiErr(err.message || 'An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Section divider
  const SectionTitle = ({ children }) => (
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 10.5, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--maroon-mid)',
      borderBottom: '1px solid rgba(139,0,0,0.13)',
      paddingBottom: 8, marginBottom: 14, marginTop: 4,
    }}>{children}</div>
  );

  const inputStyle = (hasErr) => ({
    width: '100%', padding: '9px 12px',
    background: 'var(--cream-light)', color: 'var(--text-primary)',
    border: `1px solid ${hasErr ? 'rgba(239,154,154,0.6)' : 'rgba(139,0,0,0.22)'}`,
    borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-sans)',
    outline: 'none', transition: 'border-color 0.18s',
    boxSizing: 'border-box',
  });

  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-sans)',
    fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 5,
  };

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
      <div style={{
        background: 'var(--cream)', borderRadius: 16,
        border: '1px solid rgba(139,0,0,0.20)',
        boxShadow: '0 24px 64px rgba(40,0,0,0.50), 0 0 0 1px rgba(201,168,76,0.10)',
        width: '100%', maxWidth: 520,
        display: 'flex', flexDirection: 'column',
        animation: 'lm-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'linear-gradient(135deg, var(--maroon-deep), var(--maroon-mid))',
          borderBottom: '1px solid rgba(201,168,76,0.20)',
          flexShrink: 0, position: 'relative',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.40),transparent)' }} />
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
            color: GP, letterSpacing: '0.05em',
          }}>
            {isEdit ? 'Edit User Account' : 'Add New User'}
          </h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
            color: 'rgba(245,228,168,0.70)', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.22)'; e.currentTarget.style.color = GP; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.10)'; e.currentTarget.style.color = 'rgba(245,228,168,0.70)'; }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', background: 'var(--cream-light)' }}>
          {apiErr && (
            <div style={{
              background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.24)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 12.5, color: 'var(--maroon-light)', fontFamily: 'var(--font-sans)',
            }}>{apiErr}</div>
          )}

          <SectionTitle>Personal Information</SectionTitle>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>First Name <span style={{ color: '#c0564e' }}>*</span></label>
              <input style={inputStyle(errors.first_name)} value={form.first_name}
                onChange={e => set('first_name', e.target.value)} placeholder="First name" />
              {errors.first_name && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)', marginTop: 3, display: 'block' }}>{errors.first_name}</span>}
            </div>
            <div>
              <label style={labelStyle}>Last Name <span style={{ color: '#c0564e' }}>*</span></label>
              <input style={inputStyle(errors.last_name)} value={form.last_name}
                onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
              {errors.last_name && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)', marginTop: 3, display: 'block' }}>{errors.last_name}</span>}
            </div>
          </div>

          {!isEdit && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email Address <span style={{ color: '#c0564e' }}>*</span></label>
              <input style={inputStyle(errors.email)} type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="e.g. 2023929321@pampangastateu.edu.ph" />
              {errors.email && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)', marginTop: 3, display: 'block' }}>{errors.email}</span>}
            </div>
          )}

          <SectionTitle>Security & Role</SectionTitle>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              {isEdit ? 'New Password' : 'Password'} {!isEdit && <span style={{ color: '#c0564e' }}>*</span>}
              {isEdit && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4, color: 'var(--text-dim)', fontSize: 10 }}>(leave blank to keep current)</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inputStyle(errors.password), paddingRight: 40 }}
                type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Minimum 8 characters'} />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', display: 'flex', padding: 4,
              }}>
                {showPw ? Icon.eyeOff(15) : Icon.eye(15)}
              </button>
            </div>
            {errors.password && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)', marginTop: 3, display: 'block' }}>{errors.password}</span>}
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>Role <span style={{ color: '#c0564e' }}>*</span></label>
            <select value={form.role} onChange={e => set('role', e.target.value)} style={{
              ...inputStyle(false), appearance: 'none', cursor: 'pointer',
            }}>
              <option value="student">Student</option>
              <option value="library_manager">Library Manager</option>
              <option value="admin">Administrator</option>
            </select>
            {(form.role === 'library_manager' || form.role === 'admin') && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 7,
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
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '16px 24px',
          borderTop: '1px solid rgba(139,0,0,0.14)',
          background: 'rgba(139,0,0,0.04)',
        }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13,
            border: '1px solid rgba(139,0,0,0.22)', background: 'transparent',
            color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
            transition: 'all 0.18s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
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
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ user, loading, onClose, onConfirm }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,0,0,0.72)',
      backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, animation: 'lm-fade-in 0.2s ease',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 14, padding: '28px 28px 22px',
        border: '1px solid rgba(192,86,78,0.22)', maxWidth: 400, width: '100%',
        boxShadow: '0 24px 60px rgba(40,0,0,0.50)',
        animation: 'lm-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: '0 auto 18px',
          background: 'rgba(192,86,78,0.10)', border: '1px solid rgba(192,86,78,0.24)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0564e',
        }}>
          {Icon.trash(22)}
        </div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--maroon-deep)',
          marginBottom: 10, letterSpacing: '0.03em',
        }}>Delete User Account</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.65, margin: 0 }}>
          Are you sure you want to permanently delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {user?.first_name} {user?.last_name}
          </strong>?
          <br />
          <span style={{ fontSize: 12, color: '#c0564e', fontStyle: 'italic', display: 'block', marginTop: 4 }}>
            This action cannot be undone.
          </span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
          <button onClick={onClose} disabled={loading} style={{
            padding: '9px 22px', borderRadius: 8, fontSize: 13,
            border: '1px solid rgba(139,0,0,0.20)', background: 'transparent',
            color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
            transition: 'all 0.18s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(192,86,78,0.35)',
            background: loading ? 'rgba(192,86,78,0.5)' : 'linear-gradient(135deg,#c0564e,#922)',
            color: '#fff', fontFamily: 'var(--font-sans)', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {loading
              ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block' }}/> Deleting…</>
              : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UserManagement ───────────────────────────────────────────────────────────
export default function UserManagement({ onStatsRefresh }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
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
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      showToast('Failed to load users: ' + err.message, true);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSave = async (formData) => {
    if (formData.id) {
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ first_name: formData.first_name.trim(), last_name: formData.last_name.trim(), role: formData.role, updated_at: new Date().toISOString() })
        .eq('id', formData.id);
      if (profileErr) throw profileErr;

      if (formData.password) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(formData.id, { password: formData.password });
        if (pwErr) throw pwErr;
      }
      showToast('User updated successfully.');
    } else {
      const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email.trim(), password: formData.password,
        email_confirm: true,
        user_metadata: { first_name: formData.first_name.trim(), last_name: formData.last_name.trim(), role: formData.role },
      });
      if (adminErr) throw adminErr;

      const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id: adminData.user.id,
        first_name: formData.first_name.trim(), last_name: formData.last_name.trim(),
        email: formData.email.trim(), role: formData.role,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (profileErr) throw profileErr;
      showToast('User created successfully.');
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
    const matchSearch = !q || [u.first_name, u.last_name, u.email].join(' ').toLowerCase().includes(q);
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Role counts for summary chips
  const counts = {
    total:   users.length,
    student: users.filter(u => u.role === 'student').length,
    manager: users.filter(u => u.role === 'library_manager').length,
    admin:   users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="lm-module">
      <Toast message={toast} isError={toastError} />

      {/* ── Header Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          className="lm-btn lm-btn--primary"
          style={{ gap: 7 }}
          onClick={() => { setModalUser(null); setShowModal(true); }}
        >
          {Icon.plus(14)} Add User
        </button>
      </div>

      {/* ── Summary chips ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Users',      value: counts.total,   icon: Icon.users(15),   color: G },
          { label: 'Students',         value: counts.student, icon: Icon.student(15), color: '#64b5f6' },
          { label: 'Library Managers', value: counts.manager, icon: Icon.shield(15),  color: '#ef9a9a' },
          { label: 'Administrators',   value: counts.admin,   icon: Icon.shield(15),  color: G },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{
            padding: '8px 16px', borderRadius: 8,
            background: 'linear-gradient(135deg,rgba(139,0,0,0.06),rgba(201,168,76,0.04))',
            border: '1px solid rgba(139,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ color }}>{icon}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--maroon-mid)', fontFamily: 'var(--font-display)' }}>
              {loading ? '—' : value}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
        padding: '14px 16px', borderRadius: 10,
        background: 'linear-gradient(135deg,rgba(139,0,0,0.04),rgba(201,168,76,0.03))',
        border: '1px solid rgba(139,0,0,0.10)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
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
        {/* Role filter */}
        <select className="lm-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="library_manager">Library Managers</option>
          <option value="admin">Administrators</option>
        </select>
        <span style={{
          marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-dim)',
          fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          padding: '5px 12px', borderRadius: 6,
          background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.12)',
        }}>
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      {/* ── Table ── */}
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
        <div style={{
          borderRadius: 10, border: '1px solid rgba(139,0,0,0.13)',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(30,0,0,0.07)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg,rgba(139,0,0,0.10),rgba(201,168,76,0.06))',
                borderBottom: '1.5px solid rgba(139,0,0,0.15)',
              }}>
                {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontFamily: 'var(--font-sans)', fontSize: 10.5,
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--text-dim)', whiteSpace: 'nowrap',
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
        <UserModal user={modalUser} onClose={() => { setShowModal(false); setModalUser(null); }} onSave={handleSave} />
      )}
      {deleteUser && (
        <ConfirmDeleteModal user={deleteUser} loading={deleting}
          onClose={() => setDeleteUser(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function UserRow({ user: u, idx, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const initials = ((u.first_name?.[0] || u.email?.[0] || '?') + (u.last_name?.[0] || '')).toUpperCase();
  const displayName = (u.first_name || u.last_name)
    ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
    : null;

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(139,0,0,0.04)' : (idx % 2 === 0 ? 'transparent' : 'rgba(139,0,0,0.015)'),
        borderBottom: '1px solid rgba(139,0,0,0.07)',
        transition: 'background 0.14s',
      }}
    >
      {/* Name */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--maroon-mid), var(--maroon-deep))',
            border: '1.5px solid rgba(201,168,76,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: GP,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}>
            {initials}
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
      {/* Email */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{u.email || '—'}</span>
      </td>
      {/* Role */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <RoleBadge role={u.role} />
      </td>
      {/* Joined */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          {u.created_at
            ? new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </span>
      </td>
      {/* Actions */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
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