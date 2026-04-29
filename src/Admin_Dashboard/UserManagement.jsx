// src/Admin_Dashboard/UserManagement.jsx
// Schema: profiles.id = auth.users.id (no separate auth_id column)

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
  edit:   (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
};

// ─── Role Badge ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  student:         { label: 'Student',         bg: 'rgba(33,150,243,0.12)',  color: '#64b5f6' },
  library_manager: { label: 'Library Manager', bg: 'rgba(139,0,0,0.2)',     color: '#ef9a9a' },
  admin:           { label: 'Administrator',   bg: 'rgba(201,168,76,0.15)', color: '#C9A84C' },
};

function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  return (
    <span className="lm-role-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, isError }) {
  if (!message) return null;
  return (
    <div className="lm-toast" style={isError ? { background: 'rgba(139,0,0,0.9)', borderColor: '#ef9a9a' } : {}}>
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
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))  errs.email    = 'Invalid email.';
      if (!form.password)                                        errs.password = 'Password is required.';
      else if (form.password.length < 8)                         errs.password = 'Min. 8 characters.';
    } else {
      if (form.password && form.password.length < 8)             errs.password = 'Min. 8 characters.';
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

  return (
    <div className="lm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal">
        <div className="lm-modal-header">
          <h2 className="lm-modal-title">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button className="lm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lm-modal-body">
          {apiErr && <div className="lm-error-banner">{apiErr}</div>}

          <div className="lm-form-row">
            <div className="lm-form-group">
              <label className="lm-label">First Name *</label>
              <input className={`lm-input${errors.first_name ? ' lm-input--error' : ''}`}
                value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
              {errors.first_name && <span className="lm-field-error">{errors.first_name}</span>}
            </div>
            <div className="lm-form-group">
              <label className="lm-label">Last Name *</label>
              <input className={`lm-input${errors.last_name ? ' lm-input--error' : ''}`}
                value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
              {errors.last_name && <span className="lm-field-error">{errors.last_name}</span>}
            </div>
          </div>

          {!isEdit && (
            <div className="lm-form-group">
              <label className="lm-label">Email Address *</label>
              <input className={`lm-input${errors.email ? ' lm-input--error' : ''}`}
                type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="e.g. 2023929321@pampangastateu.edu.ph" />
              {errors.email && <span className="lm-field-error">{errors.email}</span>}
            </div>
          )}

          <div className="lm-form-group">
            <label className="lm-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <div className="lm-pw-wrap">
              <input className={`lm-input${errors.password ? ' lm-input--error' : ''}`}
                type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 8 characters'}
                style={{ paddingRight: 38 }} />
              <button type="button" className="lm-pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? Icon.eyeOff(16) : Icon.eye(16)}
              </button>
            </div>
            {errors.password && <span className="lm-field-error">{errors.password}</span>}
          </div>

          <div className="lm-form-group">
            <label className="lm-label">Role *</label>
            <select className="lm-select" value={form.role} onChange={e => set('role', e.target.value)}
              style={{ width: '100%', borderRadius: 10 }}>
              <option value="student">Student</option>
              <option value="library_manager">Library Manager</option>
              <option value="admin">Administrator</option>
            </select>
            {(form.role === 'library_manager' || form.role === 'admin') && (
              <span className="lm-field-hint" style={{ color: G }}>
                ⚠ {form.role === 'admin' ? 'Administrator' : 'Library Manager'} accounts have full system access.
              </span>
            )}
          </div>
        </div>
        <div className="lm-modal-footer">
          <button className="lm-btn lm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="lm-btn lm-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ user, loading, onClose, onConfirm }) {
  return (
    <div className="lm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal lm-modal--sm">
        <div className="lm-modal-header">
          <h2 className="lm-modal-title" style={{ color: '#ef9a9a' }}>Delete User</h2>
          <button className="lm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lm-modal-body">
          <p style={{ color: 'rgba(245,228,168,0.8)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Are you sure you want to delete{' '}
            <strong style={{ color: GP }}>{user?.first_name} {user?.last_name}</strong>?<br />
            <span style={{ fontSize: 12, color: 'rgba(239,154,154,0.7)', fontStyle: 'italic' }}>
              This will permanently remove their account and cannot be undone.
            </span>
          </p>
        </div>
        <div className="lm-modal-footer">
          <button className="lm-btn lm-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="lm-btn lm-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UserManagement (default export) ─────────────────────────────────────────
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
    setToast(msg);
    setToastError(isError);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Load all profiles ──────────────────────────────────────────────────────
  // Uses supabaseAdmin (service-role key) so Row-Level Security does NOT block
  // the query — the anon client only returns rows the current user owns, which
  // means newly-created users would never appear for the admin.
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
      console.error('loadUsers:', err.message);
      showToast('⚠ Failed to load users: ' + err.message, true);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Save: create or edit ───────────────────────────────────────────────────
  const handleSave = async (formData) => {

    // ── EDIT existing user ─────────────────────────────────────────────────
    if (formData.id) {
      // Update the profiles row — uses supabaseAdmin to bypass RLS
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: formData.first_name.trim(),
          last_name:  formData.last_name.trim(),
          role:       formData.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', formData.id);           // profiles.id === auth.users.id
      if (profileErr) throw profileErr;

      // Update auth password if a new one was entered
      if (formData.password) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
          formData.id,
          { password: formData.password }
        );
        if (pwErr) throw pwErr;
      }

      showToast('✓ User updated successfully.');

    // ── CREATE new user ────────────────────────────────────────────────────
    } else {
      // supabaseAdmin uses the service-role key:
      //   • No confirmation email is sent (email_confirm: true)
      //   • The admin's own session is NOT affected
      const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
        email:         formData.email.trim(),
        password:      formData.password,
        email_confirm: true,
        user_metadata: {
          first_name: formData.first_name.trim(),
          last_name:  formData.last_name.trim(),
          role:       formData.role,
        },
      });
      if (adminErr) throw adminErr;

      const newUserId = adminData.user.id;  // profiles.id = auth.users.id

      // Upsert the profile row — uses supabaseAdmin to bypass RLS on insert
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id:         newUserId,
            first_name: formData.first_name.trim(),
            last_name:  formData.last_name.trim(),
            email:      formData.email.trim(),
            role:       formData.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      if (profileErr) throw profileErr;

      showToast('✓ User created successfully.');
    }

    await loadUsers();
    onStatsRefresh?.();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      // Delete profiles row first (avoids FK constraint errors) — uses supabaseAdmin to bypass RLS
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', deleteUser.id);
      if (profileErr) throw profileErr;

      // Delete the auth.users record
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(deleteUser.id);
      if (authErr) throw authErr;

      showToast('✓ User deleted.');
      setDeleteUser(null);
      await loadUsers();
      onStatsRefresh?.();
    } catch (err) {
      showToast('⚠ ' + err.message, true);
    } finally {
      setDeleting(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || [u.first_name, u.last_name, u.email].join(' ').toLowerCase().includes(q);
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="lm-module">
      <Toast message={toast} isError={toastError} />

      <div className="lm-module-header">
        <div>
          <h2 className="lm-module-title">User Management</h2>
          <p className="lm-module-subtitle">
            Manage all accounts. Students may self-register; only Library Managers can create manager accounts.
          </p>
        </div>
        <button className="lm-btn lm-btn--primary" onClick={() => { setModalUser(null); setShowModal(true); }}>
          {Icon.plus(14)} Add User
        </button>
      </div>

      <div className="lm-filters">
        <div className="lm-search-wrap">
          <span className="lm-search-icon">{Icon.search(14)}</span>
          <input className="lm-search" type="text" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="lm-select lm-select--sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="library_manager">Library Managers</option>
          <option value="admin">Administrators</option>
        </select>
        <span className="lm-count">{filtered.length} {filtered.length === 1 ? 'user' : 'users'}</span>
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
          {search && <div className="lm-empty-sub">Try a different search term</div>}
        </div>
      ) : (
        <div className="lm-table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'rgba(139,0,0,0.18)', borderBottom: '1px solid var(--border)' }}>
                {['Name','Email','Role','Joined','Actions'].map(h => (
                  <th key={h} style={{
                    padding: '13px 18px', textAlign: 'left',
                    fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-dim)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(201,168,76,0.06)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Name */}
                  <td style={{ padding: '0 18px', height: 60, verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))',
                        border: '1px solid rgba(201,168,76,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--gold-pale)',
                      }}>
                        {((u.first_name?.[0] || u.email?.[0] || '?') + (u.last_name?.[0] || '')).toUpperCase()}
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(u.first_name || u.last_name)
                          ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                          : <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No name set</span>}
                      </span>
                    </div>
                  </td>
                  {/* Email */}
                  <td style={{ padding: '0 18px', height: 60, verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: 12 }}>
                    {u.email}
                  </td>
                  {/* Role */}
                  <td style={{ padding: '0 18px', height: 60, verticalAlign: 'middle' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  {/* Joined */}
                  <td style={{ padding: '0 18px', height: 60, verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '0 18px', height: 60, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button className="lm-table-btn lm-table-btn--edit"
                        onClick={() => { setModalUser(u); setShowModal(true); }}>
                        {Icon.edit(13)} Edit
                      </button>
                      <button className="lm-table-btn lm-table-btn--delete"
                        onClick={() => setDeleteUser(u)}>
                        {Icon.trash(13)} Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <UserModal user={modalUser} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      {deleteUser && (
        <ConfirmDeleteModal user={deleteUser} loading={deleting}
          onClose={() => setDeleteUser(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}