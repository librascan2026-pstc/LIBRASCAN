import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../supabaseClient';

const G  = '#C9A84C';
const GP = '#F5E4A8';

const CSS = `
  .lbr-card { background: linear-gradient(135deg, rgba(26,3,5,0.88) 0%, rgba(18,2,4,0.94) 100%); border: 1px solid rgba(201,168,76,0.15); border-radius: 12px; overflow: hidden; }
  .lbr-table { width: 100%; border-collapse: collapse; }
  .lbr-table th { text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(201,168,76,0.45); padding: 10px 16px; border-bottom: 1px solid rgba(201,168,76,0.10); font-family: var(--font-sans); }
  .lbr-table td { padding: 12px 16px; font-size: 12px; font-family: var(--font-sans); color: rgba(245,228,168,0.80); border-bottom: 1px solid rgba(201,168,76,0.06); vertical-align: middle; }
  .lbr-table tr:last-child td { border-bottom: none; }
  .lbr-table tr:hover td { background: rgba(201,168,76,0.03); }
  .lbr-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(201,168,76,0.22); background: rgba(255,252,242,0.05); color: #F5E4A8; font-family: var(--font-sans); font-size: 12px; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
  .lbr-input:focus { border-color: rgba(201,168,76,0.55); }
  .lbr-input::placeholder { color: rgba(245,228,168,0.25); }
  .lbr-select { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(201,168,76,0.22); background: rgba(18,2,4,0.9); color: #F5E4A8; font-family: var(--font-sans); font-size: 12px; outline: none; box-sizing: border-box; cursor: pointer; appearance: none; }
  .lbr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; border: none; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; transition: all 0.15s; }
  .lbr-btn-primary { background: linear-gradient(135deg, #8B0000, #6B0000); color: #F5E4A8; box-shadow: 0 3px 10px rgba(139,0,0,0.35); }
  .lbr-btn-primary:hover { background: linear-gradient(135deg, #a00000, #7B0000); }
  .lbr-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .lbr-btn-ghost { background: transparent; color: rgba(245,228,168,0.6); border: 1px solid rgba(201,168,76,0.20); }
  .lbr-btn-ghost:hover { background: rgba(201,168,76,0.08); color: #F5E4A8; }
  .lbr-btn-warn { background: transparent; color: rgba(255,160,0,0.80); border: 1px solid rgba(255,160,0,0.25); padding: 5px 10px; font-size: 10px; }
  .lbr-btn-warn:hover { background: rgba(255,160,0,0.10); }
  .lbr-btn-danger { background: transparent; color: rgba(239,83,80,0.75); border: 1px solid rgba(239,83,80,0.25); padding: 5px 10px; font-size: 10px; }
  .lbr-btn-danger:hover { background: rgba(239,83,80,0.10); color: #ef5350; }
  .lbr-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(3px); }
  .lbr-modal { background: linear-gradient(160deg, #1a0305 0%, #120204 100%); border: 1px solid rgba(201,168,76,0.22); border-radius: 14px; padding: 28px; width: 460px; max-width: calc(100vw - 32px); max-height: calc(100vh - 60px); overflow-y: auto; }
  .lbr-modal-title { font-size: 14px; font-weight: 700; color: #F5E4A8; font-family: var(--font-sans); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid rgba(201,168,76,0.12); }
  .lbr-field { margin-bottom: 14px; }
  .lbr-label { display: block; font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(201,168,76,0.65); margin-bottom: 5px; font-family: var(--font-sans); }
  .lbr-err { color: #ef9a9a; font-size: 10px; margin-top: 3px; font-family: var(--font-sans); }
  .lbr-pw-wrap { position: relative; }
  .lbr-pw-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(245,228,168,0.45); display: flex; align-items: center; padding: 0; }
  .lbr-toast { position: fixed; bottom: 28px; right: 28px; z-index: 9999; border-radius: 10px; padding: 12px 20px; display: flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 12px; color: #F5E4A8; box-shadow: 0 8px 28px rgba(0,0,0,0.5); animation: toastIn 0.3s ease; }
  @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function Toast({ msg, isErr }) {
  if (!msg) return null;
  return (
    <div className="lbr-toast" style={{ background: isErr ? 'rgba(100,0,0,0.96)' : 'rgba(26,3,5,0.96)', border: `1px solid ${isErr ? 'rgba(239,83,80,0.35)' : 'rgba(201,168,76,0.30)'}` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isErr ? '#ef5350' : '#66bb6a', flexShrink: 0 }} />
      {msg}
    </div>
  );
}

function LibrarianModal({ librarian, campuses, onClose, onSaved }) {
  const isEdit = Boolean(librarian?.id);
  const [form, setForm] = useState({
    first_name: librarian?.first_name || '',
    last_name:  librarian?.last_name  || '',
    email:      librarian?.email      || '',
    campus_id:  librarian?.campus_id  || '',
    password:   '',
  });
  const [errs,   setErrs]   = useState({});
  const [saving, setSave]   = useState(false);
  const [apiErr, setApi]    = useState('');
  const [showPw, setShowPw] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required.';
    if (!form.last_name.trim())  e.last_name  = 'Last name is required.';
    if (!form.campus_id)         e.campus_id  = 'Campus assignment is required.';
    if (!isEdit) {
      if (!form.email.trim())                                   e.email    = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email    = 'Invalid email format.';
      if (!form.password)                                       e.password = 'Password is required.';
      else if (form.password.length < 8)                        e.password = 'Minimum 8 characters.';
    } else {
      if (form.password && form.password.length < 8)            e.password = 'Minimum 8 characters.';
    }
    return e;
  };

  const handleSave = async () => {
    setApi('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    setSave(true);

    try {
      if (isEdit) {
        // Update profile (campus, name)
        const { error: profileErr } = await supabaseAdmin.from('profiles').update({
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          campus_id:  form.campus_id,
          updated_at: new Date().toISOString(),
        }).eq('id', librarian.id);
        if (profileErr) throw profileErr;

        // Update password if provided
        if (form.password) {
          const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(librarian.id, { password: form.password });
          if (pwErr) throw pwErr;
        }
      } else {
        // Create auth user first (email_confirm: true so they can log in immediately)
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email:         form.email.trim().toLowerCase(),
          password:      form.password,
          email_confirm: true,
          user_metadata: {
            first_name: form.first_name.trim(),
            last_name:  form.last_name.trim(),
            role:       'library_manager',
          },
        });
        if (authErr) throw authErr;

        // Insert profile with role = library_manager and campus assignment
        const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
          id:         authData.user.id,
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          email:      form.email.trim().toLowerCase(),
          role:       'library_manager',
          campus_id:  form.campus_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (profileErr) throw profileErr;
      }

      onSaved(isEdit ? 'Librarian updated.' : 'Librarian created and can log in immediately.');
    } catch (err) {
      setApi(err.message || 'An error occurred.');
    } finally {
      setSave(false);
    }
  };

  return (
    <div className="lbr-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lbr-modal">
        <div className="lbr-modal-title">{isEdit ? 'Edit Librarian' : 'Create Librarian Account'}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="lbr-field" style={{ marginBottom: 0 }}>
            <label className="lbr-label">First Name</label>
            <input className="lbr-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
            {errs.first_name && <div className="lbr-err">{errs.first_name}</div>}
          </div>
          <div className="lbr-field" style={{ marginBottom: 0 }}>
            <label className="lbr-label">Last Name</label>
            <input className="lbr-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
            {errs.last_name && <div className="lbr-err">{errs.last_name}</div>}
          </div>
        </div>

        {!isEdit && (
          <div className="lbr-field">
            <label className="lbr-label">Email Address</label>
            <input className="lbr-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="librarian@pampangastateu.edu.ph" />
            {errs.email && <div className="lbr-err">{errs.email}</div>}
          </div>
        )}

        <div className="lbr-field">
          <label className="lbr-label">Assigned Campus</label>
          <select className="lbr-select" value={form.campus_id} onChange={e => set('campus_id', e.target.value)}>
            <option value="">Select campus to assign…</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.campus_name}</option>)}
          </select>
          {errs.campus_id && <div className="lbr-err">{errs.campus_id}</div>}
        </div>

        <div className="lbr-field">
          <label className="lbr-label">
            {isEdit ? 'New Password' : 'Password'}
            {isEdit && <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, color: 'rgba(201,168,76,0.4)', fontSize: 9 }}>(leave blank to keep current)</span>}
          </label>
          <div className="lbr-pw-wrap">
            <input
              className="lbr-input"
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Minimum 8 characters'}
              style={{ paddingRight: 36 }}
            />
            <button type="button" className="lbr-pw-toggle" onClick={() => setShowPw(s => !s)}>
              {showPw
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              }
            </button>
          </div>
          {errs.password && <div className="lbr-err">{errs.password}</div>}
        </div>

        {/* Info note */}
        <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.20)', borderRadius: 8, padding: '9px 12px', fontSize: 11, color: 'rgba(201,168,76,0.70)', fontFamily: 'var(--font-sans)', marginBottom: 14, lineHeight: 1.5 }}>
          {isEdit
            ? 'Changing the campus assignment takes effect on their next login.'
            : 'The librarian account is created with email pre-confirmed. They can log in immediately.'}
        </div>

        {apiErr && <div style={{ background: 'rgba(239,83,80,0.10)', border: '1px solid rgba(239,83,80,0.25)', borderRadius: 7, padding: '8px 12px', fontSize: 11, color: '#ef9a9a', marginBottom: 14, fontFamily: 'var(--font-sans)' }}>{apiErr}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="lbr-btn lbr-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="lbr-btn lbr-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Librarian'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LibrarianManagement() {
  const [librarians, setLibrarians] = useState([]);
  const [campuses,   setCampuses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState({ msg: '', isErr: false });
  const [search,     setSearch]     = useState('');

  const showToast = (msg, isErr = false) => { setToast({ msg, isErr }); setTimeout(() => setToast({ msg: '', isErr: false }), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cData }, { data: lData }] = await Promise.all([
      supabaseAdmin.from('campuses').select('id, campus_name').eq('is_active', true).order('campus_name'),
      supabaseAdmin.from('profiles').select('id, first_name, last_name, email, campus_id, created_at, updated_at').eq('role', 'library_manager').order('first_name'),
    ]);
    setCampuses(cData || []);
    setLibrarians(lData || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (msg) => {
    setModal(null);
    showToast(msg);
    load();
  };

  const deleteLibrarian = async (lib) => {
    if (!window.confirm(`Remove librarian account for ${lib.first_name} ${lib.last_name}?\nThis will delete their profile and auth account.`)) return;
    try {
      await supabaseAdmin.from('profiles').delete().eq('id', lib.id);
      await supabaseAdmin.auth.admin.deleteUser(lib.id);
      showToast('Librarian account removed.');
      load();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const campusName = (id) => campuses.find(c => c.id === id)?.campus_name || (
    <span style={{ color: '#ef9a9a', fontSize: 10 }}>⚠ No campus assigned</span>
  );

  const filtered = librarians.filter(l => {
    const q = search.toLowerCase();
    return !q || [l.first_name, l.last_name, l.email].join(' ').toLowerCase().includes(q);
  });

  return (
    <>
      <style>{CSS}</style>
      <Toast msg={toast.msg} isErr={toast.isErr} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: 'var(--font-sans)', marginBottom: 3 }}>Management</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F5E4A8', fontFamily: 'var(--font-sans)' }}>Librarian Management</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,228,168,0.35)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search librarians…"
              style={{ paddingLeft: 32, paddingRight: 12, height: 35, background: 'rgba(255,252,242,0.05)', border: '1px solid rgba(201,168,76,0.22)', borderRadius: 8, fontSize: 12, color: '#F5E4A8', fontFamily: 'var(--font-sans)', outline: 'none', width: 200, boxSizing: 'border-box' }}
            />
          </div>
          <button className="lbr-btn lbr-btn-primary" onClick={() => setModal('add')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Librarian
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Librarians', value: librarians.length, color: G },
          { label: 'With Campus',      value: librarians.filter(l => l.campus_id).length, color: '#66bb6a' },
          { label: 'No Campus',        value: librarians.filter(l => !l.campus_id).length, color: '#ef9a9a' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(26,3,5,0.7)', border: '1px solid rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--font-sans)' }}>{loading ? '—' : value}</span>
            <span style={{ fontSize: 10.5, color: 'rgba(245,228,168,0.45)', fontFamily: 'var(--font-sans)' }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="lbr-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid rgba(201,168,76,0.2)`, borderTopColor: G, animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : (
          <table className="lbr-table">
            <thead><tr><th>#</th><th>Librarian</th><th>Email</th><th>Assigned Campus</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'rgba(245,228,168,0.3)' }}>
                  {search ? 'No librarians match your search.' : 'No librarians yet. Click "Add Librarian" to create one.'}
                </td></tr>
              ) : filtered.map((l, i) => {
                const initials = ((l.first_name?.[0] || '') + (l.last_name?.[0] || '')).toUpperCase();
                return (
                  <tr key={l.id}>
                    <td style={{ color: 'rgba(245,228,168,0.35)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8B0000, #6B0000)', border: '1.5px solid rgba(201,168,76,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: GP, flexShrink: 0 }}>
                          {initials || '?'}
                        </div>
                        <span style={{ color: '#F5E4A8', fontWeight: 600, fontSize: 12 }}>{l.first_name} {l.last_name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: 'rgba(245,228,168,0.55)' }}>{l.email || '—'}</td>
                    <td>
                      {l.campus_id
                        ? <span style={{ fontSize: 11, color: '#66bb6a', background: 'rgba(102,187,106,0.10)', border: '1px solid rgba(102,187,106,0.25)', padding: '3px 10px', borderRadius: 12, fontFamily: 'var(--font-sans)' }}>{campusName(l.campus_id)}</span>
                        : <span style={{ fontSize: 11, color: '#ef9a9a', background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.20)', padding: '3px 10px', borderRadius: 12, fontFamily: 'var(--font-sans)' }}>⚠ Unassigned</span>
                      }
                    </td>
                    <td style={{ fontSize: 11, color: 'rgba(245,228,168,0.40)' }}>
                      {l.created_at ? new Date(l.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="lbr-btn lbr-btn-ghost" style={{ padding: '5px 10px', fontSize: 10 }} onClick={() => setModal(l)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                        <button className="lbr-btn lbr-btn-danger" onClick={() => deleteLibrarian(l)}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <LibrarianModal
          librarian={modal === 'add' ? null : modal}
          campuses={campuses}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}