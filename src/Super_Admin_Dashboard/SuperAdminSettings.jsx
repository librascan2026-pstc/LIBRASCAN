import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/AuthContext';

/* ============================================================================
   LIBRASCAN — Super Admin Settings
   Same layout/behavior as the Librarian/Admin Settings page (Profile + Security
   tabs, avatar upload, edit-profile form, change password, 2FA placeholder),
   restyled with self-contained tokens so it doesn't depend on Dashboard.css.
============================================================================ */

const MAROON        = '#7B0000';
const MAROON_DEEP    = '#5A0000';
const MAROON_MID     = '#8B0000';
const GOLD           = '#C9A84C';
const TEXT_PRIMARY   = '#3A0000';
const TEXT_SECONDARY = '#5A1010';
const TEXT_MUTED     = '#7A3030';
const TEXT_DIM       = 'rgba(90,16,16,0.55)';
const FONT_SANS      = "'DM Sans', 'Josefin Sans', sans-serif";
const FONT_DISPLAY   = "'Cinzel', 'Cormorant Garamond', serif";

const CSS = `
  .sas-wrap { max-width: 1100px; }

  .sas-tabs {
    display: flex;
    border-bottom: 1px solid rgba(139,0,0,0.18);
    margin-bottom: 28px;
    gap: 0;
  }
  .sas-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 22px;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    font-family: ${FONT_SANS};
    font-size: 13px;
    font-weight: 500;
    color: ${TEXT_MUTED};
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .sas-tab:hover { color: ${TEXT_SECONDARY}; }
  .sas-tab.on {
    font-weight: 700;
    color: ${MAROON};
    border-bottom-color: ${MAROON};
  }

  .sas-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 840px) { .sas-grid { grid-template-columns: 1fr; } }

  .sas-card {
    background: linear-gradient(160deg, #FDF6EC 0%, #FAF0E4 100%);
    border: 1px solid rgba(139,0,0,0.14);
    border-radius: 14px;
    padding: 24px 26px;
    box-shadow: 0 2px 8px rgba(80,0,0,0.07), 0 6px 24px rgba(80,0,0,0.05);
  }
  .sas-card-h {
    font-family: ${FONT_SANS};
    font-size: 15px;
    font-weight: 700;
    color: ${TEXT_PRIMARY};
    margin: 0 0 3px 0;
    text-align: center;
  }
  .sas-card-sub {
    font-size: 12px;
    color: ${TEXT_MUTED};
    line-height: 1.5;
    margin: 0 0 20px 0;
    text-align: center;
  }
  .sas-line { height: 1px; background: rgba(139,0,0,0.10); margin: 18px 0; }
  .sas-micro {
    font-family: ${FONT_SANS};
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(139,0,0,0.45);
    margin-bottom: 12px;
    text-align: center;
  }

  .sas-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-radius: 8px;
    margin-bottom: 4px;
    background: rgba(139,0,0,0.035);
    border: 1px solid rgba(139,0,0,0.07);
    gap: 12px;
  }
  .sas-row:last-child { margin-bottom: 0; }
  .sas-row-k { font-size: 11.5px; color: ${TEXT_MUTED}; flex-shrink: 0; font-weight: 500; }
  .sas-row-v { font-size: 12.5px; font-weight: 600; color: ${TEXT_PRIMARY}; text-align: right; word-break: break-all; }

  .sas-field { margin-bottom: 14px; }
  .sas-label {
    display: block;
    font-family: ${FONT_SANS};
    font-size: 12px;
    font-weight: 600;
    color: ${TEXT_SECONDARY};
    margin-bottom: 5px;
  }
  .sas-req { color: #C0392B; margin-left: 2px; }
  .sas-opt { font-weight: 400; color: ${TEXT_DIM}; font-size: 11px; margin-left: 4px; }
  .sas-input {
    width: 100%;
    padding: 9px 13px;
    border: 1.5px solid rgba(139,0,0,0.16);
    border-radius: 8px;
    background: rgba(255,248,240,0.80);
    color: ${TEXT_PRIMARY};
    font-family: ${FONT_SANS};
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sas-input:focus {
    border-color: rgba(123,0,0,0.50);
    box-shadow: 0 0 0 3px rgba(123,0,0,0.07);
    background: #fff8f2;
  }
  .sas-input::placeholder { color: rgba(90,16,16,0.30); }
  .sas-input.e { border-color: #C0392B !important; }
  .sas-input:disabled { background: rgba(139,0,0,0.05); color: ${TEXT_MUTED}; cursor: not-allowed; border-color: rgba(139,0,0,0.10); }
  .sas-err  { display: block; margin-top: 4px; font-size: 11px; color: #C0392B; }
  .sas-hint { display: block; margin-top: 4px; font-size: 11px; color: ${TEXT_DIM}; font-style: italic; }

  .sas-pw-wrap { position: relative; }
  .sas-pw-wrap .sas-input { padding-right: 40px; }
  .sas-eye {
    position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
    background: none; border: none; padding: 0;
    cursor: pointer; color: ${TEXT_MUTED};
    display: flex; align-items: center;
    opacity: 0.65; transition: opacity 0.14s, color 0.14s;
  }
  .sas-eye:hover { opacity: 1; color: ${MAROON}; }

  .sas-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 520px) { .sas-2 { grid-template-columns: 1fr; } }

  .sas-tip {
    background: rgba(201,168,76,0.08);
    border: 1px solid rgba(201,168,76,0.26);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    color: ${TEXT_SECONDARY};
    line-height: 1.65;
    margin-bottom: 16px;
  }

  .sas-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; padding: 9px 20px; border-radius: 8px; border: none;
    font-family: ${FONT_SANS}; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.16s; white-space: nowrap;
  }
  .sas-btn.p {
    background: linear-gradient(135deg, #7B0000 0%, #5A0000 100%);
    color: #F5E4A8;
    box-shadow: 0 2px 8px rgba(80,0,0,0.20);
  }
  .sas-btn.p:hover:not(:disabled) {
    background: linear-gradient(135deg, #8B0000 0%, #6B0000 100%);
    box-shadow: 0 4px 14px rgba(80,0,0,0.28);
    transform: translateY(-1px);
  }
  .sas-btn.p:disabled { opacity: 0.42; cursor: not-allowed; transform: none; }
  .sas-btn.o {
    background: transparent;
    border: 1.5px solid rgba(139,0,0,0.22);
    color: ${TEXT_SECONDARY};
  }
  .sas-btn.o:hover:not(:disabled) { border-color: rgba(139,0,0,0.48); color: ${MAROON}; background: rgba(139,0,0,0.04); }
  .sas-btn.o:disabled { opacity: 0.38; cursor: not-allowed; }
  .sas-btn.d {
    background: transparent;
    border: 1.5px solid rgba(192,57,43,0.28);
    color: #C0392B;
  }
  .sas-btn.d:hover:not(:disabled) { background: rgba(192,57,43,0.06); border-color: rgba(192,57,43,0.52); }
  .sas-btn.d:disabled { opacity: 0.38; cursor: not-allowed; }
  .sas-btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }

  .sas-av-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0 22px;
    border-bottom: 1px solid rgba(139,0,0,0.10);
    margin-bottom: 20px;
  }
  .sas-av-ring {
    width: 90px; height: 90px; border-radius: 50%;
    border: 3px solid rgba(201,168,76,0.55);
    overflow: hidden; position: relative; flex-shrink: 0;
    background: rgba(123,0,0,0.08);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 5px rgba(201,168,76,0.12), 0 4px 18px rgba(80,0,0,0.14);
  }
  .sas-av-ring img { width: 100%; height: 100%; object-fit: cover; }
  .sas-av-init {
    font-family: ${FONT_DISPLAY};
    font-size: 30px; font-weight: 700; color: ${MAROON};
  }
  .sas-av-cam {
    position: absolute; bottom: 2px; right: 2px;
    width: 24px; height: 24px; border-radius: 50%;
    background: ${MAROON}; border: 2px solid #FDF6EC;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #F5E4A8; transition: background 0.14s;
  }
  .sas-av-cam:hover:not(:disabled) { background: #8B0000; }
  .sas-av-cam:disabled { opacity: 0.5; cursor: not-allowed; }
  .sas-av-name { font-size: 16px; font-weight: 700; color: ${TEXT_PRIMARY}; margin-bottom: 3px; margin-top: 12px; text-align: center; }
  .sas-av-role { font-size: 12px; color: ${TEXT_MUTED}; text-align: center; margin-bottom: 14px; }

  .sas-badge {
    display: inline-block;
    padding: 2px 10px; border-radius: 20px;
    font-family: ${FONT_SANS}; font-size: 11px; font-weight: 700;
  }

  .sas-mfa-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 16px;
    background: rgba(139,0,0,0.04);
    border: 1px solid rgba(139,0,0,0.10);
    border-radius: 10px;
    margin-bottom: 18px;
  }
  .sas-mfa-label { font-size: 13px; font-weight: 700; color: ${TEXT_PRIMARY}; margin-bottom: 2px; }
  .sas-mfa-desc  { font-size: 11.5px; color: ${TEXT_MUTED}; line-height: 1.45; }
  .sas-mfa-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  .sas-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-family: ${FONT_SANS}; font-size: 11px; font-weight: 700;
  }
  .sas-pill.on  { background: rgba(46,125,50,0.10); color: #2E7D32; border: 1px solid rgba(46,125,50,0.22); }
  .sas-pill.off { background: rgba(139,0,0,0.08); color: #8B0000; border: 1px solid rgba(139,0,0,0.20); }
  .sas-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  .sas-toggle { position: relative; width: 44px; height: 24px; cursor: pointer; display: inline-block; }
  .sas-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
  .sas-track {
    position: absolute; inset: 0;
    border-radius: 12px;
    background: rgba(139,0,0,0.16);
    border: 1px solid rgba(139,0,0,0.20);
    transition: background 0.22s, border-color 0.22s;
  }
  .sas-toggle input:checked  ~ .sas-track { background: #2E7D32; border-color: #2E7D32; }
  .sas-toggle input:disabled ~ .sas-track { opacity: 0.35; cursor: not-allowed; }
  .sas-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.22);
    transition: transform 0.22s;
    pointer-events: none;
  }
  .sas-toggle input:checked ~ .sas-track .sas-thumb { transform: translateX(20px); }

  .sas-alert {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 14px; border-radius: 8px;
    font-size: 12.5px; line-height: 1.6;
    margin-bottom: 16px;
  }
  .sas-alert svg { flex-shrink: 0; margin-top: 1px; }
  .sas-alert.info    { background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.24); color: ${TEXT_SECONDARY}; }
  .sas-alert.success { background: rgba(46,125,50,0.07);  border: 1px solid rgba(46,125,50,0.20);  color: #1B5E20; }

  .sas-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 9px;
    font-family: ${FONT_SANS}; font-size: 13px; font-weight: 500;
    background: #1C1C1C; color: #F0F0F0;
    box-shadow: 0 6px 24px rgba(0,0,0,0.26);
    max-width: 340px;
    animation: sas-in 0.20s ease;
  }
  .sas-toast.ok  { border-left: 4px solid #2E7D32; }
  .sas-toast.err { border-left: 4px solid #C0392B; }
  @keyframes sas-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const ROLES = {
  student:         { label: 'Student',           bg: 'rgba(33,150,243,0.09)',  color: '#1565C0', border: 'rgba(33,150,243,0.22)' },
  library_manager: { label: 'Library Manager',   bg: 'rgba(123,0,0,0.09)',    color: '#7B0000', border: 'rgba(123,0,0,0.22)'   },
  admin:           { label: 'Administrator',     bg: 'rgba(201,168,76,0.11)', color: '#5C3A00', border: 'rgba(201,168,76,0.28)' },
  super_admin:     { label: 'Super Administrator', bg: 'rgba(201,168,76,0.16)', color: '#5C3A00', border: 'rgba(201,168,76,0.42)' },
};

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div className={`sas-toast ${ok ? 'ok' : 'err'}`}>
      {ok
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {msg}
    </div>
  );
}

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.student;
  return (
    <span className="sas-badge" style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
      {r.label}
    </span>
  );
}

function EyeBtn({ show, toggle }) {
  return (
    <button type="button" className="sas-eye" onClick={toggle} tabIndex={-1}>
      {show
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
      }
    </button>
  );
}

function PwField({ label, value, onChange, error, placeholder, autoComplete = 'new-password', disabled, required }) {
  const [show, setShow] = useState(false);
  return (
    <div className="sas-field">
      <label className="sas-label">
        {label}{required && <span className="sas-req">*</span>}
      </label>
      <div className="sas-pw-wrap">
        <input
          className={`sas-input${error ? ' e' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <EyeBtn show={show} toggle={() => setShow(s => !s)} />
      </div>
      {error && <span className="sas-err">{error}</span>}
    </div>
  );
}

function Toggle({ id, checked, onChange, disabled }) {
  return (
    <label className="sas-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <div className="sas-track"><div className="sas-thumb" /></div>
    </label>
  );
}

function AvatarUpload({ avatarUrl, initials, displayName, roleLabel, uid, onToast, onRefresh }) {
  const [busy,    setBusy]    = useState(false);
  const [preview, setPreview] = useState(avatarUrl || null);
  const ref = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/'))  { onToast('Please select an image file (JPG, PNG, WebP).', false); return; }
    if (file.size > 2 * 1024 * 1024)     { onToast('Image must be under 2 MB.', false); return; }

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${uid}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', uid);
      if (dbErr) throw dbErr;
      setPreview(url);
      onToast('Profile photo updated.', true);
      onRefresh?.();
    } catch (err) {
      onToast(err.message, false);
      setPreview(avatarUrl || null);
    } finally { setBusy(false); e.target.value = ''; }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', uid);
      if (error) throw error;
      setPreview(null);
      onToast('Profile photo removed.', true);
      onRefresh?.();
    } catch (err) { onToast(err.message, false); }
    finally { setBusy(false); }
  };

  return (
    <div className="sas-av-wrap">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div className="sas-av-ring">
          {preview ? <img src={preview} alt="avatar" /> : <span className="sas-av-init">{initials}</span>}
        </div>
        <button className="sas-av-cam" onClick={() => ref.current?.click()} disabled={busy} title="Change photo">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      <div className="sas-av-name">{displayName}</div>
      <div className="sas-av-role">{roleLabel}</div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="sas-btn o" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : 'Upload Photo'}
        </button>
        {preview && (
          <button className="sas-btn d" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handleRemove} disabled={busy}>
            Remove
          </button>
        )}
      </div>

      <span className="sas-hint" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
        JPG, PNG or WebP · Max 2 MB
      </span>
    </div>
  );
}

function ProfileTab({ profile, user, uid, onToast, onRefresh }) {
  const firstName  = profile?.first_name  || user?.user_metadata?.first_name  || '';
  const lastName   = profile?.last_name   || user?.user_metadata?.last_name   || '';
  const middleName = profile?.middle_name || '';
  const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || user?.email?.split('@')[0] || 'Super Admin';
  const email      = user?.email || '';
  const role       = profile?.role || user?.user_metadata?.role || 'super_admin';
  const username   = profile?.username || '—';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'SA';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const [form,   setForm]   = useState({
    first_name:  firstName,
    last_name:   lastName,
    middle_name: middleName,
    username:    profile?.username || '',
    email:       email,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';
    if (form.email.trim() !== email) {
      if (!form.email.trim()) {
        errs.email = 'Email address is required.';
      } else if (!/^[^\s@]+@pampangastateu\.edu\.ph$/.test(form.email.trim())) {
        errs.email = 'Email must be a @pampangastateu.edu.ph address.';
      }
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!uid) { onToast('Profile not found. Please refresh.', false); return; }
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from('profiles').update({
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        middle_name: form.middle_name.trim(),
        username:    form.username.trim(),
        updated_at:  new Date().toISOString(),
      }).eq('id', uid);
      if (pErr) throw pErr;
      const metaUpdate = { first_name: form.first_name.trim(), last_name: form.last_name.trim() };
      if (form.email.trim() && form.email.trim() !== email) {
        const { error: mErr } = await supabase.auth.updateUser({ email: form.email.trim(), data: metaUpdate });
        if (mErr) throw mErr;
        onToast('Profile updated. Check your new email inbox to confirm the change.', true);
      } else {
        const { error: mErr } = await supabase.auth.updateUser({ data: metaUpdate });
        if (mErr) throw mErr;
        onToast('Profile updated successfully.', true);
      }
      onRefresh?.();
    } catch (err) { onToast(err.message, false); }
    finally { setSaving(false); }
  };

  return (
    <div className="sas-grid">
      <div className="sas-card">
        <p className="sas-card-h">Account Information</p>
        <p className="sas-card-sub">Your current profile at a glance.</p>

        <AvatarUpload
          avatarUrl={profile?.avatar_url || null}
          initials={initials}
          displayName={fullName}
          roleLabel={ROLES[role]?.label || 'Super Administrator'}
          uid={uid}
          onToast={onToast}
          onRefresh={onRefresh}
        />

        <div className="sas-line" style={{ margin: '4px 0 16px' }} />
        <div className="sas-micro">Profile Details</div>

        {[
          { k: 'Full Name',    v: fullName },
          { k: 'Username',     v: username },
          { k: 'Email',        v: email },
          { k: 'Role',         v: <RoleBadge role={role} /> },
          { k: 'Member Since', v: memberSince },
        ].map(({ k, v }) => (
          <div key={k} className="sas-row">
            <span className="sas-row-k">{k}</span>
            <span className="sas-row-v">{v}</span>
          </div>
        ))}
      </div>

      <div className="sas-card">
        <p className="sas-card-h">Edit Profile</p>
        <p className="sas-card-sub">Update your name, username, and email address.</p>

        <div className="sas-micro">Personal Information</div>

        <div className="sas-2">
          <div className="sas-field">
            <label className="sas-label">First Name<span className="sas-req">*</span></label>
            <input className={`sas-input${errors.first_name ? ' e' : ''}`}
              value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
            {errors.first_name && <span className="sas-err">{errors.first_name}</span>}
          </div>
          <div className="sas-field">
            <label className="sas-label">Last Name<span className="sas-req">*</span></label>
            <input className={`sas-input${errors.last_name ? ' e' : ''}`}
              value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
            {errors.last_name && <span className="sas-err">{errors.last_name}</span>}
          </div>
        </div>

        <div className="sas-field">
          <label className="sas-label">Middle Name<span className="sas-opt">(optional)</span></label>
          <input className="sas-input" value={form.middle_name}
            onChange={e => set('middle_name', e.target.value)} placeholder="Middle name" />
        </div>

        <div className="sas-line" style={{ margin: '6px 0 18px' }} />
        <div className="sas-micro">Account Details</div>

        <div className="sas-field">
          <label className="sas-label">Username</label>
          <input className="sas-input" value={form.username}
            onChange={e => set('username', e.target.value)} placeholder="e.g. superadmin_psu" />
        </div>

        <div className="sas-field">
          <label className="sas-label">
            Email Address
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', padding: '1px 7px', borderRadius: 20,
              background: 'rgba(201,168,76,0.12)', color: '#7B5500',
              border: '1px solid rgba(201,168,76,0.30)', verticalAlign: 'middle',
            }}>Super Admin</span>
          </label>
          <input
            className={`sas-input${errors.email ? ' e' : ''}`}
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="username@pampangastateu.edu.ph"
          />
          {errors.email
            ? <span className="sas-err">{errors.email}</span>
            : <span className="sas-hint">Only @pampangastateu.edu.ph addresses are allowed.</span>
          }
        </div>

        <div className="sas-line" style={{ margin: '6px 0 18px' }} />

        <div className="sas-btn-row">
          <button className="sas-btn p" style={{ paddingLeft: 24, paddingRight: 24 }} onClick={handleSave} disabled={saving}>
            {saving
              ? 'Saving…'
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ onToast, onSignOut }) {
  const [pw,     setPw]     = useState({ old: '', newPw: '', confirm: '' });
  const [pwErr,  setPwErr]  = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  const setF = (k, v) => { setPw(p => ({ ...p, [k]: v })); setPwErr(e => ({ ...e, [k]: '' })); };

  const handleChangePw = async () => {
    const errs = {};
    if (!pw.old)                           errs.old     = 'Current password is required.';
    if (!pw.newPw)                         errs.newPw   = 'New password is required.';
    else if (pw.newPw.length < 8)          errs.newPw   = 'Minimum 8 characters.';
    else if (!/[A-Z]/.test(pw.newPw))     errs.newPw   = 'Include at least one uppercase letter (A–Z).';
    else if (!/[0-9]/.test(pw.newPw))     errs.newPw   = 'Include at least one number (0–9).';
    if (!pw.confirm)                       errs.confirm = 'Please confirm your new password.';
    else if (pw.newPw !== pw.confirm)      errs.confirm = 'Passwords do not match.';
    if (pw.old && pw.newPw && pw.old === pw.newPw)
      errs.newPw = 'New password must differ from your current one.';
    if (Object.keys(errs).length) { setPwErr(errs); return; }

    setPwBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: reErr } = await supabase.auth.signInWithPassword({
        email: user.email, password: pw.old,
      });
      if (reErr) {
        setPwErr({ old: 'Incorrect current password. Please try again.' });
        return;
      }
      const { error: upErr } = await supabase.auth.updateUser({ password: pw.newPw });
      if (upErr) throw upErr;
      setPw({ old: '', newPw: '', confirm: '' });
      onToast('Password updated successfully.', true);
    } catch (err) { onToast(err.message, false); }
    finally { setPwBusy(false); }
  };

  return (
    <div className="sas-grid">
      <div className="sas-card">
        <p className="sas-card-h">Change Password</p>
        <p className="sas-card-sub">Confirm your current password before setting a new one.</p>

        <PwField
          label="Current Password" required
          value={pw.old} onChange={e => setF('old', e.target.value)}
          error={pwErr.old} placeholder="Enter your current password"
          autoComplete="current-password" disabled={pwBusy}
        />

        <div className="sas-line" />

        <PwField
          label="New Password" required
          value={pw.newPw} onChange={e => setF('newPw', e.target.value)}
          error={pwErr.newPw} placeholder="Min. 8 chars · 1 uppercase · 1 number"
          disabled={pwBusy}
        />
        <PwField
          label="Confirm New Password" required
          value={pw.confirm} onChange={e => setF('confirm', e.target.value)}
          error={pwErr.confirm} placeholder="Re-enter your new password"
          disabled={pwBusy}
        />

        <div className="sas-tip">
          Password requirements: at least 8 characters, one uppercase letter (A–Z), and one number (0–9).
        </div>

        <div className="sas-btn-row">
          <button className="sas-btn p" onClick={handleChangePw} disabled={pwBusy}>
            {pwBusy ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      <div>
        <div className="sas-card" style={{ marginBottom: 20 }}>
          <p className="sas-card-h">Two-Factor Authentication</p>
          <p className="sas-card-sub">Require a one-time code from your phone in addition to your password at every sign-in.</p>

          <div className="sas-mfa-bar">
            <div>
              <div className="sas-mfa-label">Authenticator App (TOTP)</div>
              <div className="sas-mfa-desc">Disabled — toggle to begin setup.</div>
            </div>
            <div className="sas-mfa-right">
              <span className="sas-pill off">
                <span className="sas-dot" />
                Disabled
              </span>
              <Toggle
                id="sas-mfa-toggle"
                checked={false}
                onChange={() => {}}
                disabled={true}
              />
            </div>
          </div>

          <div className="sas-alert info">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              Two-factor authentication is coming soon. This feature is currently unavailable.
            </span>
          </div>
        </div>

        <div className="sas-card">
          <p className="sas-card-h">Sign Out</p>
          <p className="sas-card-sub">End your current session on this device.</p>
          <div className="sas-btn-row" style={{ justifyContent: 'center' }}>
            <button className="sas-btn d" onClick={onSignOut}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminSettings({ user, onSignOut }) {
  const { profile, refreshProfile } = useAuth();
  const [tab,   setTab]   = useState('profile');
  const [tMsg,  setTMsg]  = useState('');
  const [tOk,   setTOk]   = useState(true);

  const toast = (msg, ok = true) => {
    setTMsg(msg); setTOk(ok);
    setTimeout(() => setTMsg(''), 3500);
  };

  const TABS = [
    { id: 'profile',  label: 'Profile',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { id: 'security', label: 'Security',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ];

  return (
    <div className="sas-wrap">
      <style>{CSS}</style>
      <Toast msg={tMsg} ok={tOk} />

      <div className="sas-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`sas-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile'  && <ProfileTab  profile={profile} user={user} uid={user?.id} onToast={toast} onRefresh={refreshProfile} />}
      {tab === 'security' && <SecurityTab onToast={toast} onSignOut={onSignOut} />}
    </div>
  );
}