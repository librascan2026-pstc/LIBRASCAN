// src/Admin_Dashboard/Settings.jsx
// Schema: profiles.id = auth.users.id (no separate auth_id column)

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/AuthContext';

const G  = '#C9A84C';
const GP = '#F5E4A8';

// ─── Inline styles ─────────────────────────────────────────────────────────────
const STYLE = `
  .st-root { display: flex; flex-direction: column; gap: 0; height: 100%; }

  /* Tab bar */
  .st-tabs {
    display: flex; gap: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px; padding-bottom: 0;
  }
  .st-tab {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 16px; border: none; border-bottom: 2px solid transparent;
    background: none; cursor: pointer; font-family: var(--font-sans);
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--text-dim);
    transition: color 0.18s, border-color 0.18s;
    margin-bottom: -1px;
  }
  .st-tab:hover { color: var(--gold); }
  .st-tab.active { color: var(--gold); border-bottom-color: var(--gold); }

  /* Two-column layout */
  .st-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .st-cols { grid-template-columns: 1fr; } }

  /* Card */
  .st-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 22px;
    transition: border-color 0.2s;
  }
  .st-card:hover { border-color: rgba(201,168,76,0.22); }

  /* Card header */
  .st-card-head {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 18px; padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .st-card-icon {
    width: 32px; height: 32px; border-radius: 9px;
    background: rgba(139,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: var(--gold); flex-shrink: 0;
  }
  .st-card-title { font-family: var(--font-display); font-size: 13.5px; color: var(--text-primary); font-weight: 600; }
  .st-card-sub   { font-size: 11px; color: var(--text-dim); margin-top: 1px; }

  /* Form fields */
  .st-field { margin-bottom: 14px; }
  .st-label {
    display: block; margin-bottom: 5px;
    font-family: var(--font-sans); font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted);
  }
  .st-input {
    width: 100%; padding: 9px 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 8px; color: var(--text-primary);
    font-family: var(--font-sans); font-size: 12.5px;
    outline: none; box-sizing: border-box;
    transition: border-color 0.18s, background 0.18s;
  }
  .st-input:focus { border-color: rgba(201,168,76,0.6); background: rgba(201,168,76,0.04); }
  .st-input--error { border-color: rgba(239,154,154,0.7) !important; }
  .st-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .st-field-error { display: block; margin-top: 4px; font-size: 10.5px; color: #ef9a9a; font-style: italic; }

  /* Password wrap */
  .st-pw-wrap { position: relative; }
  .st-pw-wrap .st-input { padding-right: 38px; }
  .st-pw-toggle {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--text-dim); display: flex; align-items: center;
    padding: 0; opacity: 0.7; transition: opacity 0.15s;
  }
  .st-pw-toggle:hover { opacity: 1; }

  /* Row (two inputs side by side) */
  .st-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 600px) { .st-row { grid-template-columns: 1fr; } }

  /* Info row (label + value pairs) */
  .st-info-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 12.5px;
  }
  .st-info-row:last-child { border-bottom: none; }
  .st-info-key  { color: var(--text-dim); font-family: var(--font-sans); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .st-info-val  { color: var(--text-primary); text-align: right; max-width: 55%; word-break: break-all; }

  /* Hint box */
  .st-hint {
    background: rgba(201,168,76,0.07);
    border: 1px solid rgba(201,168,76,0.2);
    border-radius: 8px; padding: 9px 12px;
    font-size: 11px; color: rgba(201,168,76,0.75);
    line-height: 1.65; margin-bottom: 14px;
  }

  /* Primary button */
  .st-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 20px; border-radius: 9px; border: none;
    font-family: var(--font-sans); font-size: 11px; font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase;
    cursor: pointer; transition: all 0.18s; width: 100%; margin-top: 4px;
  }
  .st-btn--primary {
    background: linear-gradient(135deg, #8B0000, #6B0000);
    color: var(--gold-pale);
    box-shadow: 0 3px 14px rgba(139,0,0,0.3);
  }
  .st-btn--primary:hover:not(:disabled) { filter: brightness(1.12); box-shadow: 0 5px 20px rgba(139,0,0,0.45); }
  .st-btn--primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
  .st-btn--ghost {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .st-btn--ghost:hover:not(:disabled) { background: rgba(255,255,255,0.09); border-color: rgba(201,168,76,0.3); color: var(--gold); }
  .st-btn--ghost:disabled { opacity: 0.4; cursor: not-allowed; }
  .st-btn--danger {
    background: rgba(139,0,0,0.15);
    border: 1px solid rgba(239,154,154,0.25);
    color: #ef9a9a;
  }
  .st-btn--danger:hover:not(:disabled) { background: rgba(139,0,0,0.3); }
  .st-btn--danger:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Avatar */
  .st-avatar-wrap { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; }
  .st-avatar {
    width: 72px; height: 72px; border-radius: 50%;
    border: 2px solid rgba(201,168,76,0.35);
    overflow: hidden; position: relative; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(139,0,0,0.2);
    box-shadow: 0 0 0 4px rgba(201,168,76,0.08);
  }
  .st-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .st-avatar-initials { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--gold); }
  .st-avatar-cam {
    position: absolute; bottom: 0; right: 0;
    width: 24px; height: 24px; border-radius: 50%;
    background: linear-gradient(135deg, var(--maroon), #6B0000);
    border: 2px solid var(--bg-card);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--gold-pale); transition: opacity 0.2s;
  }
  .st-avatar-cam:hover { opacity: 0.85; }
  .st-avatar-btns { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }

  /* Role badge */
  .st-badge {
    display: inline-block; padding: 2px 10px; border-radius: 20px;
    font-size: 10.5px; font-family: var(--font-sans); font-weight: 700;
    letter-spacing: 0.05em; text-transform: uppercase;
  }

  /* MFA toggle row */
  .st-mfa-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    gap: 12px;
  }
  .st-toggle {
    position: relative; width: 42px; height: 24px; flex-shrink: 0;
    cursor: pointer;
  }
  .st-toggle input { opacity: 0; width: 0; height: 0; }
  .st-toggle-track {
    position: absolute; inset: 0; background: rgba(255,255,255,0.1);
    border-radius: 12px; transition: background 0.25s;
    border: 1px solid rgba(255,255,255,0.12);
  }
  .st-toggle input:checked ~ .st-toggle-track { background: rgba(139,0,0,0.7); border-color: rgba(201,168,76,0.3); }
  .st-toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--text-dim); transition: transform 0.25s, background 0.25s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  }
  .st-toggle input:checked ~ .st-toggle-track .st-toggle-thumb {
    transform: translateX(18px); background: var(--gold);
  }

  /* MFA code grid */
  .st-mfa-codes {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0;
  }
  .st-mfa-code {
    background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 7px; padding: 7px 12px; font-family: 'Courier New', monospace;
    font-size: 13px; color: var(--gold-pale); letter-spacing: 0.1em;
    text-align: center; user-select: all;
  }
  .st-mfa-code.used { opacity: 0.35; text-decoration: line-through; }

  /* QR placeholder */
  .st-qr {
    width: 130px; height: 130px; border-radius: 10px;
    border: 2px dashed rgba(201,168,76,0.3);
    background: rgba(0,0,0,0.25);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-dim); font-size: 11px; text-align: center;
    line-height: 1.5; flex-direction: column; gap: 8px; margin: 0 auto 14px;
  }

  /* Session item */
  .st-session {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .st-session:last-child { border-bottom: none; }
  .st-session-icon {
    width: 34px; height: 34px; border-radius: 9px;
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); flex-shrink: 0;
  }
  .st-session-curr {
    font-size: 9.5px; font-family: var(--font-sans); font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase;
    color: #81c784; margin-left: 4px;
  }

  /* Toast */
  .st-toast {
    position: fixed; bottom: 28px; right: 28px;
    background: rgba(20,20,20,0.95);
    border: 1px solid rgba(201,168,76,0.4);
    border-radius: 10px; padding: 11px 18px;
    font-size: 12.5px; color: var(--gold-pale);
    font-family: var(--font-sans);
    box-shadow: 0 8px 28px rgba(0,0,0,0.5);
    z-index: 9999; display: flex; align-items: center; gap: 9px;
    animation: st-slide-in 0.25s ease;
    max-width: 320px;
  }
  .st-toast--error { border-color: rgba(239,154,154,0.5); }
  @keyframes st-slide-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Danger zone */
  .st-danger-zone {
    border: 1px solid rgba(239,154,154,0.2);
    border-radius: 14px; padding: 20px 22px;
    background: rgba(139,0,0,0.05);
  }
  .st-danger-title {
    font-family: var(--font-sans); font-size: 10px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #ef9a9a; margin-bottom: 14px;
  }
  .st-signout-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 20px; border-radius: 9px;
    border: 1px solid rgba(239,154,154,0.3);
    background: rgba(139,0,0,0.12); color: #ef9a9a;
    font-family: var(--font-sans); font-size: 11px; font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase;
    cursor: pointer; transition: all 0.18s;
  }
  .st-signout-btn:hover { background: rgba(139,0,0,0.25); border-color: rgba(239,154,154,0.5); }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  student:         { label: 'Student',         bg: 'rgba(33,150,243,0.12)',  color: '#64b5f6' },
  library_manager: { label: 'Library Manager', bg: 'rgba(139,0,0,0.2)',     color: '#ef9a9a' },
  admin:           { label: 'Admin',           bg: 'rgba(201,168,76,0.15)', color: '#C9A84C' },
};

function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  return (
    <span className="st-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, isError }) {
  if (!message) return null;
  return (
    <div className={`st-toast${isError ? ' st-toast--error' : ''}`}>
      {isError
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef9a9a" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      }
      {message}
    </div>
  );
}

// ─── EyeToggle ─────────────────────────────────────────────────────────────────
function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" className="st-pw-toggle" onClick={onToggle} tabIndex={-1}>
      {show
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  );
}

// ─── PwField ───────────────────────────────────────────────────────────────────
function PwField({ label, id, value, onChange, error, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="st-field">
      <label className="st-label">{label}</label>
      <div className="st-pw-wrap">
        <input
          className={`st-input${error ? ' st-input--error' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="new-password"
        />
        <EyeToggle show={show} onToggle={() => setShow(s => !s)} />
      </div>
      {error && <span className="st-field-error">{error}</span>}
    </div>
  );
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="st-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <div className="st-toggle-track">
        <div className="st-toggle-thumb" />
      </div>
    </label>
  );
}

// ─── Avatar Upload ─────────────────────────────────────────────────────────────
function AvatarUpload({ avatarUrl, initials, authUserId, onToast, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(avatarUrl || null);
  const inputRef = useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { onToast('Please select an image file.', true); return; }
    if (file.size > 2 * 1024 * 1024)    { onToast('Image must be under 2MB.', true); return; }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ext      = file.name.split('.').pop();
      const filePath = `${authUserId}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: finalUrl, updated_at: new Date().toISOString() }).eq('id', authUserId);
      if (dbErr) throw dbErr;
      setPreview(finalUrl);
      onToast('Profile picture updated.', false);
      onRefresh?.();
    } catch (err) {
      onToast(err.message, true);
      setPreview(avatarUrl || null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!authUserId) return;
    setUploading(true);
    try {
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', authUserId);
      if (dbErr) throw dbErr;
      setPreview(null);
      onToast('Profile picture removed.', false);
      onRefresh?.();
    } catch (err) {
      onToast(err.message, true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="st-avatar-wrap">
      <div style={{ position: 'relative' }}>
        <div className="st-avatar">
          {preview
            ? <img src={preview} alt="avatar" />
            : <span className="st-avatar-initials">{initials}</span>
          }
        </div>
        <button
          className="st-avatar-cam"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Change picture"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 3 }}>
          {uploading ? 'Uploading…' : 'Profile Photo'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>
          JPG, PNG or WebP · Max 2MB
        </div>
        <div className="st-avatar-btns">
          <button className="st-btn st-btn--ghost" style={{ width: 'auto', padding: '6px 14px', fontSize: 10.5 }}
            onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Photo'}
          </button>
          {preview && (
            <button className="st-btn st-btn--danger" style={{ width: 'auto', padding: '6px 14px', fontSize: 10.5 }}
              onClick={handleRemove} disabled={uploading}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ profile, user, authUserId, onToast, onRefresh }) {
  const firstName  = profile?.first_name  || user?.user_metadata?.first_name  || '';
  const lastName   = profile?.last_name   || user?.user_metadata?.last_name   || '';
  const middleName = profile?.middle_name || '—';
  const fullName   = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'Library Manager';
  const email      = user?.email || '';
  const role       = profile?.role || user?.user_metadata?.role || 'library_manager';
  const username   = profile?.username || '—';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'LM';
  const avatarUrl  = profile?.avatar_url || null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const [form,   setForm]   = useState({ first_name: firstName, last_name: lastName, middle_name: profile?.middle_name || '', username: profile?.username || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!authUserId) { onToast('Could not find your profile. Please refresh.', true); return; }
    setSaving(true);
    try {
      const { error: profileErr } = await supabase.from('profiles').update({
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        middle_name: form.middle_name.trim(),
        username:    form.username.trim(),
        updated_at:  new Date().toISOString(),
      }).eq('id', authUserId);
      if (profileErr) throw profileErr;
      const { error: metaErr } = await supabase.auth.updateUser({ data: { first_name: form.first_name.trim(), last_name: form.last_name.trim() } });
      if (metaErr) throw metaErr;
      onToast('Profile updated successfully.', false);
      onRefresh?.();
    } catch (err) {
      onToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="st-cols">
      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Account Info */}
        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div>
              <div className="st-card-title">Account Information</div>
              <div className="st-card-sub">Your current profile summary</div>
            </div>
          </div>

          <AvatarUpload avatarUrl={avatarUrl} initials={initials} authUserId={authUserId} onToast={onToast} onRefresh={onRefresh} />

          {[
            { label: 'Full Name',     val: fullName },
            { label: 'Username',      val: username },
            { label: 'Email',         val: email },
            { label: 'Role',          val: <RoleBadge role={role} /> },
            { label: 'Member Since',  val: memberSince },
          ].map(({ label, val }) => (
            <div key={label} className="st-info-row">
              <span className="st-info-key">{label}</span>
              <span className="st-info-val">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right column */}
      <div className="st-card">
        <div className="st-card-head">
          <div className="st-card-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div>
            <div className="st-card-title">Edit Profile</div>
            <div className="st-card-sub">Update your personal information</div>
          </div>
        </div>

        <div className="st-row">
          <div className="st-field">
            <label className="st-label">First Name *</label>
            <input className={`st-input${errors.first_name ? ' st-input--error' : ''}`}
              value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
            {errors.first_name && <span className="st-field-error">{errors.first_name}</span>}
          </div>
          <div className="st-field">
            <label className="st-label">Last Name *</label>
            <input className={`st-input${errors.last_name ? ' st-input--error' : ''}`}
              value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
            {errors.last_name && <span className="st-field-error">{errors.last_name}</span>}
          </div>
        </div>

        <div className="st-field">
          <label className="st-label">Middle Name (Optional)</label>
          <input className="st-input"
            value={form.middle_name} onChange={e => set('middle_name', e.target.value)} placeholder="Middle name" />
        </div>

        <div className="st-field">
          <label className="st-label">Username</label>
          <input className="st-input"
            value={form.username} onChange={e => set('username', e.target.value)} placeholder="e.g. librarian_psu" />
        </div>

        <div className="st-field">
          <label className="st-label">Email Address</label>
          <input className="st-input" value={email} disabled />
          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4, display: 'block', fontStyle: 'italic' }}>
            Email cannot be changed here. Contact an admin.
          </span>
        </div>

        <button className="st-btn st-btn--primary" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab({ onToast }) {
  // ── Change Password ──
  const [pw, setPw]       = useState({ old: '', newPw: '', confirm: '' });
  const [pwErr, setPwErr] = useState({});
  const [pwShow, setPwShow] = useState({ old: false, newPw: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  const setPwField   = (k, v) => { setPw(f => ({ ...f, [k]: v })); setPwErr(e => ({ ...e, [k]: '' })); };
  const togglePwShow = (k) => setPwShow(s => ({ ...s, [k]: !s[k] }));

  const handleChangePassword = async () => {
    const errs = {};
    if (!pw.old)                          errs.old     = 'Current password is required.';
    if (!pw.newPw)                        errs.newPw   = 'New password is required.';
    else if (pw.newPw.length < 8)         errs.newPw   = 'Min. 8 characters.';
    else if (!/[A-Z]/.test(pw.newPw))    errs.newPw   = 'Include at least one uppercase letter.';
    else if (!/[0-9]/.test(pw.newPw))    errs.newPw   = 'Include at least one number.';
    if (!pw.confirm)                      errs.confirm = 'Please confirm your new password.';
    else if (pw.newPw !== pw.confirm)     errs.confirm = 'Passwords do not match.';
    if (pw.old && pw.newPw && pw.old === pw.newPw) errs.newPw = 'New password must differ from current.';

    if (Object.keys(errs).length) { setPwErr(errs); return; }
    setPwSaving(true);
    try {
      // Re-authenticate first by signing in with old password
      const { data: { user } } = await supabase.auth.getUser();
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pw.old,
      });
      if (reAuthErr) {
        setPwErr({ old: 'Current password is incorrect.' });
        setPwSaving(false);
        return;
      }
      // Now update to new password
      const { error } = await supabase.auth.updateUser({ password: pw.newPw });
      if (error) throw error;
      setPw({ old: '', newPw: '', confirm: '' });
      onToast('Password updated successfully.', false);
    } catch (err) {
      onToast(err.message, true);
    } finally {
      setPwSaving(false);
    }
  };

  // ── MFA state ──
  const [mfaEnabled,  setMfaEnabled]  = useState(false);
  const [mfaStep,     setMfaStep]     = useState('idle'); // idle | setup | verify | active
  const [mfaCode,     setMfaCode]     = useState('');
  const [mfaError,    setMfaError]    = useState('');
  const [mfaLoading,  setMfaLoading]  = useState(false);
  const [mfaUri,      setMfaUri]      = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [backupCodes,  setBackupCodes] = useState([]);

  // Check existing MFA on mount
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find(f => f.status === 'verified');
      if (totp) { setMfaEnabled(true); setMfaFactorId(totp.id); setMfaStep('active'); }
    }).catch(() => {});
  }, []);

  const handleEnableMFA = async () => {
    setMfaLoading(true); setMfaError('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'LIBRASCAN', friendlyName: 'Authenticator' });
      if (error) throw error;
      setMfaFactorId(data.id);
      setMfaUri(data.totp.uri);
      // Generate mock backup codes (real implementation would get these from server)
      setBackupCodes(Array.from({ length: 8 }, () =>
        Math.random().toString(36).slice(2, 7).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()
      ));
      setMfaStep('setup');
    } catch (err) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (mfaCode.length < 6) { setMfaError('Enter the 6-digit code from your authenticator app.'); return; }
    setMfaLoading(true); setMfaError('');
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challengeData.id, code: mfaCode });
      if (verifyErr) throw verifyErr;
      setMfaEnabled(true);
      setMfaStep('active');
      setMfaCode('');
    } catch (err) {
      setMfaError(err.message || 'Invalid code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!window.confirm('Disable two-factor authentication? This will make your account less secure.')) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) throw error;
      setMfaEnabled(false); setMfaStep('idle'); setMfaFactorId(''); setMfaUri(''); setMfaCode('');
      onToast('Two-factor authentication disabled.', false);
    } catch (err) {
      onToast(err.message, true);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCancelMFA = async () => {
    // Unenroll the pending factor
    if (mfaFactorId) {
      try { await supabase.auth.mfa.unenroll({ factorId: mfaFactorId }); } catch {}
    }
    setMfaStep('idle'); setMfaCode(''); setMfaError(''); setMfaUri(''); setMfaFactorId('');
  };

  return (
    <div className="st-cols">
      {/* Left — Change Password */}
      <div className="st-card">
        <div className="st-card-head">
          <div className="st-card-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <div className="st-card-title">Change Password</div>
            <div className="st-card-sub">Update your account password</div>
          </div>
        </div>

        {/* Old password */}
        <div className="st-field">
          <label className="st-label">Current Password *</label>
          <div className="st-pw-wrap">
            <input
              className={`st-input${pwErr.old ? ' st-input--error' : ''}`}
              type={pwShow.old ? 'text' : 'password'}
              value={pw.old}
              onChange={e => setPwField('old', e.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
            <EyeToggle show={pwShow.old} onToggle={() => togglePwShow('old')} />
          </div>
          {pwErr.old && <span className="st-field-error">{pwErr.old}</span>}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 14px' }} />

        <PwField label="New Password *" id="newPw" value={pw.newPw}
          onChange={e => setPwField('newPw', e.target.value)} error={pwErr.newPw}
          placeholder="Min. 8 chars, 1 uppercase, 1 number" />
        <PwField label="Confirm New Password *" id="confirm" value={pw.confirm}
          onChange={e => setPwField('confirm', e.target.value)} error={pwErr.confirm}
          placeholder="Re-enter new password" />

        <div className="st-hint">
          Must have: 8+ characters · 1 uppercase letter · 1 number
        </div>

        <button className="st-btn st-btn--primary" onClick={handleChangePassword} disabled={pwSaving}>
          {pwSaving ? 'Updating…' : 'Update Password'}
        </button>
      </div>

      {/* Right — MFA */}
      <div className="st-card">
        <div className="st-card-head">
          <div className="st-card-icon" style={{ background: mfaEnabled ? 'rgba(129,199,132,0.15)' : 'rgba(139,0,0,0.18)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={mfaEnabled ? '#81c784' : 'currentColor'} strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className="st-card-title">Two-Factor Authentication</div>
            <div className="st-card-sub">Add an extra layer of security</div>
          </div>
          {mfaStep === 'active' && (
            <span className="st-badge" style={{ background: 'rgba(129,199,132,0.15)', color: '#81c784', border: '1px solid rgba(129,199,132,0.25)', fontSize: 9.5 }}>
              Active
            </span>
          )}
        </div>

        {/* ── IDLE: not set up ── */}
        {mfaStep === 'idle' && (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 16 }}>
              Two-factor authentication (2FA) adds a one-time code from your authenticator app every time you sign in, protecting your account even if your password is compromised.
            </div>
            {[
              { icon: '🔐', text: 'Works with Google Authenticator, Authy, or any TOTP app' },
              { icon: '📲', text: 'One-time codes refresh every 30 seconds' },
              { icon: '🔑', text: 'Backup codes provided in case you lose your device' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
            {mfaError && <div style={{ fontSize: 11.5, color: '#ef9a9a', marginBottom: 10 }}>{mfaError}</div>}
            <button className="st-btn st-btn--primary" onClick={handleEnableMFA} disabled={mfaLoading} style={{ marginTop: 6 }}>
              {mfaLoading
                ? 'Setting up…'
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Enable 2FA</>
              }
            </button>
          </>
        )}

        {/* ── SETUP: scan QR ── */}
        {mfaStep === 'setup' && (
          <>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--gold)' }}>Step 1</strong> — Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.).
            </div>

            {/* QR code — real URI is in mfaUri; displayed via a QR library or placeholder */}
            <div className="st-qr">
              {mfaUri ? (
                // If you have a QR library: <QRCode value={mfaUri} size={110} />
                // Fallback: show the raw URI copyable
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="4" height="4"/></svg>
                  <span style={{ fontSize: 9.5, padding: '0 8px' }}>QR Code<br/>Copy URI below</span>
                </>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="4" height="4"/></svg>
              )}
            </div>

            {mfaUri && (
              <div style={{ marginBottom: 14 }}>
                <div className="st-label" style={{ marginBottom: 5 }}>Or copy this URI manually</div>
                <div style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '7px 10px', fontSize: 9.5, color: 'var(--text-dim)',
                  wordBreak: 'break-all', lineHeight: 1.5, userSelect: 'all',
                }}>
                  {mfaUri}
                </div>
              </div>
            )}

            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--gold)' }}>Step 2</strong> — Enter the 6-digit code from your app to confirm setup.
            </div>
            <div className="st-field">
              <label className="st-label">Verification Code</label>
              <input
                className="st-input"
                value={mfaCode}
                onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError(''); }}
                placeholder="000000"
                maxLength={6}
                style={{ letterSpacing: '0.3em', fontSize: 16, textAlign: 'center' }}
              />
              {mfaError && <span className="st-field-error">{mfaError}</span>}
            </div>

            {backupCodes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div className="st-label" style={{ marginBottom: 7 }}>Backup Codes — save these somewhere safe</div>
                <div className="st-mfa-codes">
                  {backupCodes.map((c, i) => <div key={i} className="st-mfa-code">{c}</div>)}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  Each backup code can be used once if you lose access to your authenticator.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="st-btn st-btn--primary" onClick={handleVerifyMFA} disabled={mfaLoading || mfaCode.length < 6}>
                {mfaLoading ? 'Verifying…' : 'Confirm & Enable'}
              </button>
              <button className="st-btn st-btn--ghost" onClick={handleCancelMFA} disabled={mfaLoading} style={{ width: 'auto', padding: '9px 18px' }}>
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ── ACTIVE ── */}
        {mfaStep === 'active' && (
          <>
            <div style={{
              background: 'rgba(129,199,132,0.08)', border: '1px solid rgba(129,199,132,0.2)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 16,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#81c784" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
              <div style={{ fontSize: 12, color: '#81c784', lineHeight: 1.6 }}>
                Two-factor authentication is <strong>active</strong>. Your account is protected with TOTP codes.
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 16 }}>
              Each sign-in will require a 6-digit code from your authenticator app in addition to your password.
            </div>

            {[
              { label: 'Method',        val: 'Time-based OTP (TOTP)' },
              { label: 'App',           val: 'Google Authenticator / Authy' },
              { label: 'Code Interval', val: '30 seconds' },
            ].map(({ label, val }) => (
              <div key={label} className="st-info-row">
                <span className="st-info-key">{label}</span>
                <span className="st-info-val">{val}</span>
              </div>
            ))}

            <div style={{ height: 14 }} />
            <button className="st-btn st-btn--danger" onClick={handleDisableMFA} disabled={mfaLoading}>
              {mfaLoading ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sessions Tab ──────────────────────────────────────────────────────────────
function SessionsTab({ onSignOut }) {
  const SESSIONS = [
    { device: 'This Device',          browser: 'Chrome on Windows',  location: 'Pampanga, PH', time: 'Now',       current: true },
    { device: 'Mobile',               browser: 'Safari on iPhone',   location: 'Pampanga, PH', time: '2 hrs ago', current: false },
    { device: 'Shared Library PC',    browser: 'Firefox on Windows', location: 'Pampanga, PH', time: 'Yesterday', current: false },
  ];

  const DeviceIcon = ({ browser }) => {
    const isMobile = browser.toLowerCase().includes('iphone') || browser.toLowerCase().includes('android');
    return isMobile
      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="st-card" style={{ marginBottom: 18 }}>
        <div className="st-card-head">
          <div className="st-card-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <div className="st-card-title">Active Sessions</div>
            <div className="st-card-sub">Devices currently signed in to your account</div>
          </div>
        </div>

        {SESSIONS.map((s, i) => (
          <div key={i} className="st-session">
            <div className="st-session-icon"><DeviceIcon browser={s.browser} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>
                {s.device}
                {s.current && <span className="st-session-curr">● Current</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{s.browser} · {s.location}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right', flexShrink: 0 }}>
              {s.time}
              {!s.current && (
                <div style={{ marginTop: 4 }}>
                  <button style={{
                    background: 'none', border: 'none', fontSize: 10.5,
                    color: '#ef9a9a', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)',
                  }}>Revoke</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="st-danger-zone">
        <div className="st-danger-title">⚠ Danger Zone</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 3 }}>Sign Out Everywhere</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              This will immediately end all active sessions, including this one.
            </div>
          </div>
          <button className="st-signout-btn" onClick={onSignOut}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out All
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings ─────────────────────────────────────────────────────────────
export default function Settings({ user, onSignOut }) {
  const { profile, refreshProfile } = useAuth();
  const [activeTab,  setActiveTab]  = useState('profile');
  const [toast,      setToast]      = useState('');
  const [toastError, setToastError] = useState(false);

  const showToast = (msg, isError = false) => {
    setToast(msg);
    setToastError(isError);
    setTimeout(() => setToast(''), 3500);
  };

  const authUserId = user?.id;

  const TABS = [
    {
      id: 'profile', label: 'Profile',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    },
    {
      id: 'security', label: 'Security',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    },
    {
      id: 'sessions', label: 'Sessions',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    },
  ];

  return (
    <div className="lm-module">
      <style>{STYLE}</style>
      <Toast message={toast} isError={toastError} />

      {/* Header */}
      <div className="lm-module-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="lm-module-title">Settings</h2>
          <p className="lm-module-subtitle">Manage your account profile, security, and sessions.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="st-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`st-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile'  && <ProfileTab  profile={profile} user={user} authUserId={authUserId} onToast={showToast} onRefresh={refreshProfile} />}
      {activeTab === 'security' && <SecurityTab onToast={showToast} />}
      {activeTab === 'sessions' && <SessionsTab onSignOut={onSignOut} />}
    </div>
  );
}