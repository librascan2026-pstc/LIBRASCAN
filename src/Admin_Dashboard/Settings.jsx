// src/Admin_Dashboard/Settings.jsx
// Schema: profiles.id = auth.users.id (no separate auth_id column)

import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/AuthContext';

const G = '#C9A84C';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, isError }) {
  if (!message) return null;
  return (
    <div className="lm-toast" style={isError ? { background: 'rgba(139,0,0,0.9)', borderColor: '#ef9a9a' } : {}}>
      {message}
    </div>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  student:         { label: 'Student',         bg: 'rgba(33,150,243,0.12)', color: '#64b5f6' },
  library_manager: { label: 'Library Manager', bg: 'rgba(139,0,0,0.2)',    color: '#ef9a9a' },
  admin:           { label: 'Admin',           bg: 'rgba(139,0,0,0.2)',    color: '#ef9a9a' },
};
function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  return (
    <span className="lm-role-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
}

const SignOutIcon = (s = 14) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─── Change Password Form ─────────────────────────────────────────────────────
function ChangePasswordForm({ onToast }) {
  const [form,   setForm]   = useState({ newPw: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [show,   setShow]   = useState({ newPw: false, confirm: false });

  const set        = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };
  const toggleShow = k      => setShow(s => ({ ...s, [k]: !s[k] }));

  const validate = () => {
    const errs = {};
    if (!form.newPw)                         errs.newPw   = 'New password is required.';
    else if (form.newPw.length < 8)          errs.newPw   = 'Min. 8 characters.';
    else if (!/[A-Z]/.test(form.newPw))      errs.newPw   = 'Include at least one uppercase letter.';
    else if (!/[0-9]/.test(form.newPw))      errs.newPw   = 'Include at least one number.';
    if (!form.confirm)                       errs.confirm = 'Please confirm your password.';
    else if (form.newPw !== form.confirm)    errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      // Updates the CURRENT signed-in user's password — no admin key needed
      const { error } = await supabase.auth.updateUser({ password: form.newPw });
      if (error) throw error;
      setForm({ newPw: '', confirm: '' });
      onToast('✓ Password updated successfully.', false);
    } catch (err) {
      onToast('⚠ ' + err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const PwField = ({ id, label, placeholder }) => (
    <div className="lm-form-group">
      <label className="lm-label">{label}</label>
      <div className="lm-pw-wrap">
        <input
          className={`lm-input${errors[id] ? ' lm-input--error' : ''}`}
          type={show[id] ? 'text' : 'password'}
          value={form[id]}
          onChange={e => set(id, e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: 38 }}
        />
        <button type="button" className="lm-pw-toggle" onClick={() => toggleShow(id)}>
          {show[id]
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
      {errors[id] && <span className="lm-field-error">{errors[id]}</span>}
    </div>
  );

  return (
    <div className="lm-panel" style={{ maxWidth: 540, marginBottom: 20 }}>
      <div className="lm-panel-title">Change Password</div>
      <PwField id="newPw"   label="New Password *"         placeholder="Min. 8 chars, 1 uppercase, 1 number" />
      <PwField id="confirm" label="Confirm New Password *" placeholder="Re-enter new password" />
      <div style={{
        background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 8, padding: '8px 12px', fontSize: 11,
        color: 'rgba(201,168,76,0.8)', marginBottom: 12, lineHeight: 1.65,
      }}>
        Must have: 8+ characters · 1 uppercase letter · 1 number
      </div>
      <button className="lm-btn lm-btn--primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Update Password'}
      </button>
    </div>
  );
}

// ─── Edit Profile Form ────────────────────────────────────────────────────────
function EditProfileForm({ profile, authUserId, onToast, onRefresh }) {
  const [form, setForm] = useState({
    first_name:  profile?.first_name  || '',
    last_name:   profile?.last_name   || '',
    middle_name: profile?.middle_name || '',
    username:    profile?.username    || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (!authUserId) {
      onToast('⚠ Could not find your profile. Please refresh and try again.', true);
      return;
    }

    setSaving(true);
    try {
      // profiles.id = auth.users.id, so we match on authUserId directly
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          first_name:  form.first_name.trim(),
          last_name:   form.last_name.trim(),
          middle_name: form.middle_name.trim(),
          username:    form.username.trim(),
          updated_at:  new Date().toISOString(),
        })
        .eq('id', authUserId);            // profiles.id === auth.users.id
      if (profileErr) throw profileErr;

      // Keep auth user_metadata in sync so the topbar name refreshes instantly
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
        },
      });
      if (metaErr) throw metaErr;

      onToast('✓ Profile updated successfully.', false);
      onRefresh?.();      // ask AuthContext to re-fetch the profile row
    } catch (err) {
      onToast('⚠ ' + err.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lm-panel" style={{ maxWidth: 540, marginBottom: 20 }}>
      <div className="lm-panel-title">Edit Profile</div>
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
      <div className="lm-form-group">
        <label className="lm-label">Middle Name (Optional)</label>
        <input className="lm-input"
          value={form.middle_name} onChange={e => set('middle_name', e.target.value)} placeholder="Middle name" />
      </div>
      <div className="lm-form-group">
        <label className="lm-label">Username</label>
        <input className="lm-input"
          value={form.username} onChange={e => set('username', e.target.value)} placeholder="e.g. librarian_psu" />
      </div>
      <button className="lm-btn lm-btn--primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

// ─── Avatar Upload ────────────────────────────────────────────────────────────
function AvatarUpload({ avatarUrl, initials, authUserId, onToast, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(avatarUrl || null);
  const inputRef = useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type & size
    if (!file.type.startsWith('image/')) {
      onToast('⚠ Please select an image file.', true); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onToast('⚠ Image must be under 2MB.', true); return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      // Upload to Supabase Storage bucket "avatars"
      const ext      = file.name.split('.').pop();
      const filePath = `${authUserId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-buster so browser reloads the image
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      // Save to profiles.avatar_url
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: finalUrl, updated_at: new Date().toISOString() })
        .eq('id', authUserId);
      if (dbErr) throw dbErr;

      setPreview(finalUrl);
      onToast('✓ Profile picture updated.', false);
      onRefresh?.();
    } catch (err) {
      onToast('⚠ ' + err.message, true);
      setPreview(avatarUrl || null); // revert preview on error
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!authUserId) return;
    setUploading(true);
    try {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', authUserId);
      if (dbErr) throw dbErr;

      setPreview(null);
      onToast('✓ Profile picture removed.', false);
      onRefresh?.();
    } catch (err) {
      onToast('⚠ ' + err.message, true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 22 }}>
      {/* Avatar circle */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '2px solid rgba(201,168,76,0.4)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(139,0,0,0.2)',
          boxShadow: '0 0 0 4px rgba(201,168,76,0.08)',
        }}>
          {preview
            ? <img src={preview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: G }}>{initials}</span>
          }
        </div>
        {/* Camera overlay button */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))',
            border: '2px solid var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            color: 'var(--gold-pale)', transition: 'opacity 0.2s',
            opacity: uploading ? 0.5 : 1,
          }}
          title="Change picture"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Labels & buttons */}
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
          {uploading ? 'Uploading…' : 'Profile Picture'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          JPG, PNG or WebP · Max 2MB
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="lm-btn lm-btn--ghost"
            style={{ fontSize: 11.5, padding: '5px 12px' }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload Photo'}
          </button>
          {preview && (
            <button
              className="lm-btn lm-btn--danger"
              style={{ fontSize: 11.5, padding: '5px 12px' }}
              onClick={handleRemove}
              disabled={uploading}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings export ─────────────────────────────────────────────────────
export default function Settings({ user, onSignOut }) {
  // AuthContext must provide: profile (the profiles row) and refreshProfile()
  const { profile, refreshProfile } = useAuth();
  const [toast,      setToast]      = useState('');
  const [toastError, setToastError] = useState(false);

  const showToast = (msg, isError = false) => {
    setToast(msg);
    setToastError(isError);
    setTimeout(() => setToast(''), 3500);
  };

  // Prefer live profile data, fall back to auth metadata
  const firstName  = profile?.first_name  || user?.user_metadata?.first_name  || '';
  const lastName   = profile?.last_name   || user?.user_metadata?.last_name   || '';
  const middleName = profile?.middle_name || '—';
  const fullName   = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'Library Manager';
  const email      = user?.email || '';
  const role       = profile?.role || user?.user_metadata?.role || 'library_manager';
  const username   = profile?.username || '—';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'LM';
  const avatarUrl  = profile?.avatar_url || null;

  // profiles.id = auth.users.id, so user.id is the key we update against
  const authUserId = user?.id;

  return (
    <div className="lm-module">
      <Toast message={toast} isError={toastError} />

      <div className="lm-module-header">
        <div>
          <h2 className="lm-module-title">Settings</h2>
          <p className="lm-module-subtitle">Manage your account profile and system preferences.</p>
        </div>
      </div>

      {/* ── Account Info Card ────────────────────────────────────────────────── */}
      <div className="lm-panel" style={{ marginBottom: 20, maxWidth: 540 }}>
        <div className="lm-panel-title">Account Information</div>

        {/* Avatar Upload */}
        <AvatarUpload
          avatarUrl={avatarUrl}
          initials={initials}
          authUserId={authUserId}
          onToast={showToast}
          onRefresh={refreshProfile}
        />

        <div style={{ display: 'grid', gap: 0 }}>
          {[
            { label: 'Full Name',     val: fullName },
            { label: 'Middle Name',   val: middleName },
            { label: 'Username',      val: username },
            { label: 'Email Address', val: email },
            { label: 'Role',          val: ROLE_CONFIG[role]?.label || role },
            { label: 'Last Login',    val: new Date().toLocaleString('en-PH') },
          ].map(({ label, val }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </span>
              <span style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit Profile ─────────────────────────────────────────────────────── */}
      <EditProfileForm
        profile={profile}
        authUserId={authUserId}
        onToast={showToast}
        onRefresh={refreshProfile}
      />

      {/* ── Change Password ──────────────────────────────────────────────────── */}
      <ChangePasswordForm onToast={showToast} />


    </div>
  );
}