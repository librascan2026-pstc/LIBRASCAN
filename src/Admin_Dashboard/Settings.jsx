import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/AuthContext';

const CSS = `
  
  .s-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    margin-bottom: 28px;
    gap: 0;
  }
  .s-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 22px;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .s-tab:hover { color: var(--text-secondary); }
  .s-tab.on {
    font-weight: 700;
    color: var(--maroon);
    border-bottom-color: var(--maroon);
  }

  
  .s-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 840px) { .s-grid { grid-template-columns: 1fr; } }

  
  .s-card {
    background: linear-gradient(160deg, #FDF6EC 0%, #FAF0E4 100%);
    border: 1px solid rgba(139,0,0,0.14);
    border-radius: 14px;
    padding: 24px 26px;
    box-shadow: 0 2px 8px rgba(80,0,0,0.07), 0 6px 24px rgba(80,0,0,0.05);
  }
  .s-card-h {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 3px 0;
    text-align: center;
  }
  .s-card-sub {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0 0 20px 0;
    text-align: center;
  }
  .s-line { height: 1px; background: rgba(139,0,0,0.10); margin: 18px 0; }
  .s-micro {
    font-family: var(--font-sans);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(139,0,0,0.45);
    margin-bottom: 12px;
    text-align: center;
  }

  
  .s-row {
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
  .s-row:last-child { margin-bottom: 0; }
  .s-row-k { font-size: 11.5px; color: var(--text-muted); flex-shrink: 0; font-weight: 500; }
  .s-row-v { font-size: 12.5px; font-weight: 600; color: var(--text-primary); text-align: right; word-break: break-all; }

  
  .s-field { margin-bottom: 14px; }
  .s-label {
    display: block;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 5px;
  }
  .s-req { color: #C0392B; margin-left: 2px; }
  .s-opt { font-weight: 400; color: var(--text-dim); font-size: 11px; margin-left: 4px; }
  .s-input {
    width: 100%;
    padding: 9px 13px;
    border: 1.5px solid rgba(139,0,0,0.16);
    border-radius: 8px;
    background: rgba(255,248,240,0.80);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .s-input:focus {
    border-color: rgba(123,0,0,0.50);
    box-shadow: 0 0 0 3px rgba(123,0,0,0.07);
    background: #fff8f2;
  }
  .s-input::placeholder { color: rgba(90,16,16,0.30); }
  .s-input.e { border-color: #C0392B !important; }
  .s-input:disabled { background: rgba(139,0,0,0.05); color: var(--text-muted); cursor: not-allowed; border-color: rgba(139,0,0,0.10); }
  .s-err  { display: block; margin-top: 4px; font-size: 11px; color: #C0392B; }
  .s-hint { display: block; margin-top: 4px; font-size: 11px; color: var(--text-dim); font-style: italic; }

  
  .s-pw-wrap { position: relative; }
  .s-pw-wrap .s-input { padding-right: 40px; }
  .s-eye {
    position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
    background: none; border: none; padding: 0;
    cursor: pointer; color: var(--text-muted);
    display: flex; align-items: center;
    opacity: 0.65; transition: opacity 0.14s, color 0.14s;
  }
  .s-eye:hover { opacity: 1; color: var(--maroon); }

  
  .s-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 520px) { .s-2 { grid-template-columns: 1fr; } }

  
  .s-tip {
    background: rgba(201,168,76,0.08);
    border: 1px solid rgba(201,168,76,0.26);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.65;
    margin-bottom: 16px;
  }

  
  .s-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; padding: 9px 20px; border-radius: 8px; border: none;
    font-family: var(--font-sans); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.16s; white-space: nowrap;
  }
  .s-btn.p {
    background: linear-gradient(135deg, #7B0000 0%, #5A0000 100%);
    color: #F5E4A8;
    box-shadow: 0 2px 8px rgba(80,0,0,0.20);
  }
  .s-btn.p:hover:not(:disabled) {
    background: linear-gradient(135deg, #8B0000 0%, #6B0000 100%);
    box-shadow: 0 4px 14px rgba(80,0,0,0.28);
    transform: translateY(-1px);
  }
  .s-btn.p:disabled { opacity: 0.42; cursor: not-allowed; transform: none; }
  .s-btn.o {
    background: transparent;
    border: 1.5px solid rgba(139,0,0,0.22);
    color: var(--text-secondary);
  }
  .s-btn.o:hover:not(:disabled) { border-color: rgba(139,0,0,0.48); color: var(--maroon); background: rgba(139,0,0,0.04); }
  .s-btn.o:disabled { opacity: 0.38; cursor: not-allowed; }
  .s-btn.d {
    background: transparent;
    border: 1.5px solid rgba(192,57,43,0.28);
    color: #C0392B;
  }
  .s-btn.d:hover:not(:disabled) { background: rgba(192,57,43,0.06); border-color: rgba(192,57,43,0.52); }
  .s-btn.d:disabled { opacity: 0.38; cursor: not-allowed; }
  .s-btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }

  
  .s-av-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0 22px;
    border-bottom: 1px solid rgba(139,0,0,0.10);
    margin-bottom: 20px;
  }
  .s-av-ring {
    width: 90px; height: 90px; border-radius: 50%;
    border: 3px solid rgba(201,168,76,0.55);
    overflow: hidden; position: relative; flex-shrink: 0;
    background: rgba(123,0,0,0.08);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 5px rgba(201,168,76,0.12), 0 4px 18px rgba(80,0,0,0.14);
  }
  .s-av-ring img { width: 100%; height: 100%; object-fit: cover; }
  .s-av-init {
    font-family: var(--font-display);
    font-size: 30px; font-weight: 700; color: var(--maroon);
  }
  .s-av-cam {
    position: absolute; bottom: 2px; right: 2px;
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--maroon); border: 2px solid #FDF6EC;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #F5E4A8; transition: background 0.14s;
  }
  .s-av-cam:hover:not(:disabled) { background: #8B0000; }
  .s-av-cam:disabled { opacity: 0.5; cursor: not-allowed; }
  .s-av-name { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; text-align: center; }
  .s-av-role { font-size: 12px; color: var(--text-muted); text-align: center; margin-bottom: 0; }

  
  .s-badge {
    display: inline-block;
    padding: 2px 10px; border-radius: 20px;
    font-family: var(--font-sans); font-size: 11px; font-weight: 700;
  }

  
  .s-mfa-bar {
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
  .s-mfa-label { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
  .s-mfa-desc  { font-size: 11.5px; color: var(--text-muted); line-height: 1.45; }
  .s-mfa-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  
  .s-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-family: var(--font-sans); font-size: 11px; font-weight: 700;
  }
  .s-pill.on  { background: rgba(46,125,50,0.10); color: #2E7D32; border: 1px solid rgba(46,125,50,0.22); }
  .s-pill.off { background: rgba(139,0,0,0.08); color: #8B0000; border: 1px solid rgba(139,0,0,0.20); }
  .s-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  
  .s-toggle { position: relative; width: 44px; height: 24px; cursor: pointer; display: inline-block; }
  .s-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
  .s-track {
    position: absolute; inset: 0;
    border-radius: 12px;
    background: rgba(139,0,0,0.16);
    border: 1px solid rgba(139,0,0,0.20);
    transition: background 0.22s, border-color 0.22s;
  }
  .s-toggle input:checked  ~ .s-track { background: #2E7D32; border-color: #2E7D32; }
  .s-toggle input:disabled ~ .s-track { opacity: 0.35; cursor: not-allowed; }
  .s-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.22);
    transition: transform 0.22s;
    pointer-events: none;
  }
  .s-toggle input:checked ~ .s-track .s-thumb { transform: translateX(20px); }

  
  .s-step {
    background: rgba(201,168,76,0.05);
    border: 1px solid rgba(201,168,76,0.18);
    border-radius: 9px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .s-step-head {
    display: flex; align-items: center; gap: 9px;
    font-family: var(--font-sans); font-size: 12.5px;
    font-weight: 700; color: var(--text-primary);
    margin-bottom: 8px;
  }
  .s-step-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--maroon); color: #F5E4A8;
    font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .s-step-body {
    font-size: 12px; color: var(--text-muted);
    line-height: 1.65; padding-left: 31px;
  }

  
  .s-qr {
    width: 148px; height: 148px;
    border-radius: 10px;
    border: 2px dashed rgba(139,0,0,0.20);
    background: #FAFAFA;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px; margin: 12px auto 14px;
    color: var(--text-dim); font-size: 11px;
    text-align: center; line-height: 1.5;
  }

  
  .s-otp {
    width: 100%;
    padding: 11px;
    margin-top: 10px;
    border: 2px solid rgba(139,0,0,0.18);
    border-radius: 8px;
    background: rgba(255,248,240,0.80);
    color: var(--text-primary);
    font-family: 'Courier New', monospace;
    font-size: 22px; font-weight: 700;
    letter-spacing: 0.28em; text-align: center;
    outline: none; box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .s-otp:focus { border-color: rgba(123,0,0,0.48); box-shadow: 0 0 0 3px rgba(123,0,0,0.08); }
  .s-otp.e { border-color: #C0392B; }

  
  .s-codes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 10px 0; }
  .s-code {
    background: rgba(255,248,240,0.90);
    border: 1px solid rgba(139,0,0,0.12);
    border-radius: 6px;
    padding: 7px 10px;
    font-family: 'Courier New', monospace;
    font-size: 12.5px; color: var(--text-secondary);
    text-align: center; letter-spacing: 0.06em;
    user-select: all;
  }

  
  .s-alert {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 14px; border-radius: 8px;
    font-size: 12.5px; line-height: 1.6;
    margin-bottom: 16px;
  }
  .s-alert svg { flex-shrink: 0; margin-top: 1px; }
  .s-alert.info    { background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.24); color: var(--text-secondary); }
  .s-alert.success { background: rgba(46,125,50,0.07);  border: 1px solid rgba(46,125,50,0.20);  color: #1B5E20; }

  
  .s-session {
    display: flex; align-items: center; gap: 13px;
    padding: 11px 0;
    border-bottom: 1px solid rgba(139,0,0,0.07);
  }
  .s-session:last-child { border-bottom: none; }
  .s-ses-ico {
    width: 36px; height: 36px; border-radius: 8px;
    background: rgba(139,0,0,0.05);
    border: 1px solid rgba(139,0,0,0.10);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); flex-shrink: 0;
  }
  .s-ses-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .s-ses-meta { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
  .s-cur {
    display: inline-block; padding: 1px 8px; border-radius: 20px; margin-left: 7px;
    font-size: 10.5px; font-weight: 700; vertical-align: middle;
    background: rgba(46,125,50,0.09); color: #2E7D32;
    border: 1px solid rgba(46,125,50,0.20);
  }
  .s-revoke {
    background: none; border: none; padding: 0; margin-top: 4px; display: block;
    font-size: 11.5px; color: #C0392B; cursor: pointer;
    font-family: var(--font-sans); transition: opacity 0.14s;
  }
  .s-revoke:hover { opacity: 0.68; }

  

  
  .s-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 9px;
    font-family: var(--font-sans); font-size: 13px; font-weight: 500;
    background: #1C1C1C; color: #F0F0F0;
    box-shadow: 0 6px 24px rgba(0,0,0,0.26);
    max-width: 340px;
    animation: s-in 0.20s ease;
  }
  .s-toast.ok  { border-left: 4px solid #2E7D32; }
  .s-toast.err { border-left: 4px solid #C0392B; }
  @keyframes s-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const ROLES = {
  student:         { label: 'Student',         bg: 'rgba(33,150,243,0.09)',  color: '#1565C0', border: 'rgba(33,150,243,0.22)' },
  library_manager: { label: 'Library Manager', bg: 'rgba(123,0,0,0.09)',    color: '#7B0000', border: 'rgba(123,0,0,0.22)'   },
  admin:           { label: 'Administrator',   bg: 'rgba(201,168,76,0.11)', color: '#5C3A00', border: 'rgba(201,168,76,0.28)' },
};

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div className={`s-toast ${ok ? 'ok' : 'err'}`}>
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
    <span className="s-badge" style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
      {r.label}
    </span>
  );
}

function EyeBtn({ show, toggle }) {
  return (
    <button type="button" className="s-eye" onClick={toggle} tabIndex={-1}>
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
    <div className="s-field">
      <label className="s-label">
        {label}{required && <span className="s-req">*</span>}
      </label>
      <div className="s-pw-wrap">
        <input
          className={`s-input${error ? ' e' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <EyeBtn show={show} toggle={() => setShow(s => !s)} />
      </div>
      {error && <span className="s-err">{error}</span>}
    </div>
  );
}

function Toggle({ id, checked, onChange, disabled }) {
  return (
    <label className="s-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <div className="s-track"><div className="s-thumb" /></div>
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
    <div className="s-av-wrap">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div className="s-av-ring">
          {preview ? <img src={preview} alt="avatar" /> : <span className="s-av-init">{initials}</span>}
        </div>
        <button className="s-av-cam" onClick={() => ref.current?.click()} disabled={busy} title="Change photo">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      <div className="s-av-name" style={{ marginTop: 12, fontSize: 16 }}>{displayName}</div>
      <div className="s-av-role" style={{ marginBottom: 14 }}>{roleLabel}</div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="s-btn o" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : 'Upload Photo'}
        </button>
        {preview && (
          <button className="s-btn d" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handleRemove} disabled={busy}>
            Remove
          </button>
        )}
      </div>

      <span className="s-hint" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
        JPG, PNG or WebP · Max 2 MB
      </span>
    </div>
  );
}

function ProfileTab({ profile, user, uid, onToast, onRefresh }) {
  const firstName  = profile?.first_name  || user?.user_metadata?.first_name  || '';
  const lastName   = profile?.last_name   || user?.user_metadata?.last_name   || '';
  const middleName = profile?.middle_name || '';
  const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || user?.email?.split('@')[0] || 'Library Manager';
  const email      = user?.email || '';
  const role       = profile?.role || user?.user_metadata?.role || 'library_manager';
  const username   = profile?.username || '—';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'LM';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const [form,   setForm]   = useState({
    first_name:  firstName,
    last_name:   lastName,
    middle_name: middleName,
    username:    profile?.username    || '',
    email:       email,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isAdmin = role === 'admin';

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';
    if (isAdmin && form.email.trim() !== email) {
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
      if (isAdmin && form.email.trim() && form.email.trim() !== email) {
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
    <div className="s-grid">
      <div className="s-card">
        <p className="s-card-h" style={{ fontSize: 15, marginBottom: 3 }}>Account Information</p>
        <p className="s-card-sub" style={{ marginBottom: 20 }}>Your current profile at a glance.</p>

        <AvatarUpload
          avatarUrl={profile?.avatar_url || null}
          initials={initials}
          displayName={fullName}
          roleLabel={ROLES[role]?.label || 'Library Manager'}
          uid={uid}
          onToast={onToast}
          onRefresh={onRefresh}
        />

        <div className="s-line" style={{ margin: '4px 0 16px' }} />
        <div className="s-micro" style={{ marginBottom: 14 }}>Profile Details</div>

        {[
          { k: 'Full Name',    v: fullName },
          { k: 'Username',     v: username },
          { k: 'Email',        v: email },
          { k: 'Role',         v: <RoleBadge role={role} /> },
          { k: 'Member Since', v: memberSince },
        ].map(({ k, v }) => (
          <div key={k} className="s-row">
            <span className="s-row-k">{k}</span>
            <span className="s-row-v">{v}</span>
          </div>
        ))}
      </div>

      <div className="s-card">
        <p className="s-card-h" style={{ fontSize: 15, marginBottom: 3 }}>Edit Profile</p>
        <p className="s-card-sub" style={{ marginBottom: 20 }}>
          {isAdmin
            ? 'Update your name, username, and email address.'
            : 'Update your name and username. To change your email, contact an administrator.'}
        </p>

        <div className="s-micro" style={{ marginBottom: 14 }}>Personal Information</div>

        <div className="s-2">
          <div className="s-field">
            <label className="s-label">First Name<span className="s-req">*</span></label>
            <input className={`s-input${errors.first_name ? ' e' : ''}`}
              value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
            {errors.first_name && <span className="s-err">{errors.first_name}</span>}
          </div>
          <div className="s-field">
            <label className="s-label">Last Name<span className="s-req">*</span></label>
            <input className={`s-input${errors.last_name ? ' e' : ''}`}
              value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
            {errors.last_name && <span className="s-err">{errors.last_name}</span>}
          </div>
        </div>

        <div className="s-field">
          <label className="s-label">Middle Name<span className="s-opt">(optional)</span></label>
          <input className="s-input" value={form.middle_name}
            onChange={e => set('middle_name', e.target.value)} placeholder="Middle name" />
        </div>

        <div className="s-line" style={{ margin: '6px 0 18px' }} />
        <div className="s-micro" style={{ marginBottom: 14 }}>Account Details</div>

        <div className="s-field">
          <label className="s-label">Username</label>
          <input className="s-input" value={form.username}
            onChange={e => set('username', e.target.value)} placeholder="e.g. librarian_psu" />
        </div>

        <div className="s-field">
          <label className="s-label">
            Email Address
            {isAdmin && (
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', padding: '1px 7px', borderRadius: 20,
                background: 'rgba(201,168,76,0.12)', color: '#7B5500',
                border: '1px solid rgba(201,168,76,0.30)', verticalAlign: 'middle',
              }}>Admin</span>
            )}
          </label>
          <input
            className={`s-input${errors.email ? ' e' : ''}`}
            value={form.email}
            onChange={e => isAdmin && set('email', e.target.value)}
            disabled={!isAdmin}
            placeholder="username@pampangastateu.edu.ph"
          />
          {errors.email
            ? <span className="s-err">{errors.email}</span>
            : isAdmin
              ? <span className="s-hint">Only @pampangastateu.edu.ph addresses are allowed.</span>
              : <span className="s-hint">Email cannot be changed here. Contact an administrator.</span>
          }
        </div>

        <div className="s-line" style={{ margin: '6px 0 18px' }} />

        <div className="s-btn-row">
          <button className="s-btn p" style={{ paddingLeft: 24, paddingRight: 24 }} onClick={handleSave} disabled={saving}>
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

function SecurityTab({ onToast }) {

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
    <div className="s-grid">

      <div className="s-card">
        <p className="s-card-h">Change Password</p>
        <p className="s-card-sub">Confirm your current password before setting a new one.</p>

        <PwField
          label="Current Password" required
          value={pw.old} onChange={e => setF('old', e.target.value)}
          error={pwErr.old} placeholder="Enter your current password"
          autoComplete="current-password" disabled={pwBusy}
        />

        <div className="s-line" />

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

        <div className="s-tip">
          Password requirements: at least 8 characters, one uppercase letter (A–Z), and one number (0–9).
        </div>

        <div className="s-btn-row">
          <button className="s-btn p" onClick={handleChangePw} disabled={pwBusy}>
            {pwBusy ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      <div className="s-card">
        <p className="s-card-h">Two-Factor Authentication</p>
        <p className="s-card-sub">Require a one-time code from your phone in addition to your password at every sign-in.</p>

        <div className="s-mfa-bar">
          <div>
            <div className="s-mfa-label">Authenticator App (TOTP)</div>
            <div className="s-mfa-desc">Disabled — toggle to begin setup.</div>
          </div>
          <div className="s-mfa-right">
            <span className="s-pill off">
              <span className="s-dot" />
              Disabled
            </span>
            <Toggle
              id="mfa-toggle"
              checked={false}
              onChange={() => {}}
              disabled={true}
            />
          </div>
        </div>

        <div className="s-alert info">
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
    </div>
  );
}
function SessionsTab({ onSignOut }) {
  const SESSIONS = [
    { device: 'This Device',        browser: 'Chrome on Windows 11',  location: 'Pampanga, PH', time: 'Active now',  current: true  },
    { device: 'Mobile Phone',       browser: 'Safari on iPhone',      location: 'Pampanga, PH', time: '2 hours ago', current: false },
    { device: 'Library Computer 3', browser: 'Firefox on Windows 10', location: 'Pampanga, PH', time: 'Yesterday',   current: false },
  ];

  const DesktopIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
  const MobileIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );

  return (
    <div style={{ maxWidth: 660 }}>
      <div className="s-card" style={{ marginBottom: 20 }}>
        <p className="s-card-h">Active Sessions</p>
        <p className="s-card-sub">Devices currently signed in to your account.</p>

        {SESSIONS.map((s, i) => (
          <div key={i} className="s-session">
            <div className="s-ses-ico">
              {/iphone|android|mobile/i.test(s.browser) ? <MobileIcon /> : <DesktopIcon />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="s-ses-name">
                {s.device}
                {s.current && <span className="s-cur">Current</span>}
              </div>
              <div className="s-ses-meta">{s.browser} · {s.location}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.time}</div>
              {!s.current && <button className="s-revoke">Revoke</button>}
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}

function rs(n) {
  return Math.random().toString(36).slice(2, 2 + n).toUpperCase().padEnd(n, '0');
}

export default function Settings({ user, onSignOut }) {
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
    <div className="lm-module">
      <style>{CSS}</style>
      <Toast msg={tMsg} ok={tOk} />



      <div className="s-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`s-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile'  && <ProfileTab  profile={profile} user={user} uid={user?.id} onToast={toast} onRefresh={refreshProfile} />}
      {tab === 'security' && <SecurityTab onToast={toast} />}
    </div>
  );
}