import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Pencil, Trash2, Search, X, Eye, EyeOff, Mail, Lock, User,
  Building2, ChevronLeft, ChevronRight, AlertTriangle, Check, ShieldCheck,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';

/* ============================================================================
   LIBRASCAN — Librarian Management
   Restyled to share the exact visual language of Campus Management Hub:
   cream/white surfaces, maroon + gold accents, the same hero, stat-card,
   toolbar, table and modal treatments.
============================================================================ */

/* ── Design tokens (identical to Campus Management Hub) ─────────────────── */
const MAROON      = '#7A0000';
const MAROON_DEEP = '#5C0000';
const MAROON_MID  = '#8F1616';
const MAROON_SOFT = 'rgba(122,0,0,0.08)';
const GOLD        = '#D4AF37';
const GOLD_DEEP   = '#B8912B';
const GOLD_PALE   = 'rgba(212,175,55,0.14)';
const BG          = '#F8F6F2';
const CARD        = '#FFFFFF';
const CREAM       = '#FFF8EF';
const TEXT        = '#3B2A25';
const TEXT_MUTED  = '#8A7368';
const BORDER      = '#E8DDD4';
const SUCCESS     = '#22C55E';
const DANGER      = '#EF4444';
const BLUE        = '#3B82F6';

const PAGE_SIZE = 8;

const AVATAR_PALETTE = [
  { bg: 'linear-gradient(135deg,#8F1616,#5C0000)' },
  { bg: 'linear-gradient(135deg,#B8912B,#7A5F1B)' },
  { bg: 'linear-gradient(135deg,#3B82F6,#1D5FAE)' },
  { bg: 'linear-gradient(135deg,#178A4C,#0F5C33)' },
  { bg: 'linear-gradient(135deg,#9333EA,#6B21A8)' },
];
function avatarFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/* ── Styles ───────────────────────────────────────────────────────────── */
const CSS = `
  .lbm, .lbm * { box-sizing: border-box; }
  .lbm {
    font-family: var(--font-sans,'DM Sans','Josefin Sans',sans-serif);
    color: ${TEXT};
    -webkit-font-smoothing: antialiased;
  }
  .lbm :focus-visible { outline: 2.5px solid ${GOLD}; outline-offset: 2px; border-radius: 6px; }

  /* ---------- Hero ---------- */
  .lbm-hero {
    position: relative;
    background: linear-gradient(135deg, ${CREAM} 0%, ${CARD} 100%);
    border: 1.5px solid ${BORDER};
    border-radius: 24px;
    padding: 32px 32px 28px;
    margin-bottom: 24px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    box-shadow: 0 10px 30px rgba(59,42,37,0.08);
  }
  .lbm-hero::before {
    content: '';
    position: absolute; top: -60%; right: -8%;
    width: 420px; height: 420px; border-radius: 50%;
    background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%);
    pointer-events: none;
  }
  .lbm-hero::after {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(rgba(122,0,0,0.05) 1px, transparent 1px);
    background-size: 22px 22px;
    opacity: 0.6;
    pointer-events: none;
  }
  .lbm-hero-left { position: relative; z-index: 1; max-width: 640px; }
  .lbm-hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${MAROON_SOFT};
    border: 1px solid rgba(122,0,0,0.18);
    color: ${MAROON};
    font-size: 11px; font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase;
    padding: 6px 14px; border-radius: 999px; margin-bottom: 16px;
  }
  .lbm-hero-title {
    font-size: 28px; font-weight: 800; letter-spacing: -0.01em;
    color: ${TEXT}; line-height: 1.2; margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .lbm-hero-icon {
    width: 42px; height: 42px; border-radius: 14px;
    background: ${MAROON_SOFT};
    border: 1px solid rgba(122,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON}; flex-shrink: 0;
  }
  .lbm-hero-sub { font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED}; max-width: 560px; font-weight: 500; text-align: left; }
  .lbm-hero-right { position: relative; z-index: 1; display: flex; align-items: center; }

  /* ---------- Buttons ---------- */
  .lbm-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; border-radius: 999px; border: none;
    background: ${GOLD}; color: ${MAROON_DEEP};
    font-family: inherit; font-size: 13.5px; font-weight: 800;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(212,175,55,0.35);
    transition: transform 0.16s cubic-bezier(.22,1,.36,1), box-shadow 0.16s, background 0.16s;
    white-space: nowrap;
  }
  .lbm-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(212,175,55,0.45); background: #E0BC4C; }
  .lbm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .lbm-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 15px; border-radius: 10px;
    border: 1.5px solid ${BORDER}; background: ${CARD}; color: ${TEXT};
    font-family: inherit; font-size: 12px; font-weight: 700;
    cursor: pointer;
    transition: border-color 0.14s, background 0.14s, color 0.14s;
  }
  .lbm-btn-ghost:hover { border-color: ${MAROON}; color: ${MAROON}; background: ${MAROON_SOFT}; }

  .lbm-icon-btn {
    width: 32px; height: 32px; border-radius: 9px;
    border: 1px solid ${BORDER}; background: ${CARD}; color: ${TEXT_MUTED};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.12s;
  }
  .lbm-icon-btn:hover { transform: translateY(-1px); }
  .lbm-icon-btn.edit:hover { background: ${GOLD_PALE}; color: ${GOLD_DEEP}; border-color: rgba(212,175,55,0.45); }
  .lbm-icon-btn.del:hover  { background: rgba(239,68,68,0.10); color: ${DANGER}; border-color: rgba(239,68,68,0.35); }

  /* ---------- Stat cards ---------- */
  .lbm-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .lbm-stat-card {
    background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 16px; padding: 16px;
    display: flex; align-items: center; gap: 16px;
    transition: transform 0.16s cubic-bezier(.22,1,.36,1), box-shadow 0.16s, border-color 0.16s;
  }
  .lbm-stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(59,42,37,0.08); border-color: rgba(122,0,0,0.22); }
  .lbm-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lbm-stat-value { font-size: 22px; font-weight: 800; color: ${TEXT}; line-height: 1.15; font-variant-numeric: tabular-nums; }
  .lbm-stat-label { font-size: 11px; font-weight: 700; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }

  /* ---------- Toolbar ---------- */
  .lbm-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .lbm-search { flex: 1 1 260px; min-width: 200px; position: relative; }
  .lbm-search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: ${TEXT_MUTED}; pointer-events: none; }
  .lbm-search input {
    width: 100%; padding: 11px 14px 11px 40px; border-radius: 999px;
    border: 1.5px solid ${BORDER}; background: ${CARD};
    font-family: inherit; font-size: 13px; color: ${TEXT}; outline: none;
    transition: border-color 0.16s, box-shadow 0.16s;
  }
  .lbm-search input:focus { border-color: ${MAROON}; box-shadow: 0 0 0 4px ${MAROON_SOFT}; }
  .lbm-search input::placeholder { color: rgba(58,42,37,0.35); }

  /* ---------- Table ---------- */
  .lbm-table-wrap { background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 10px rgba(59,42,37,0.04); }
  .lbm-table-scroll { overflow-x: auto; }
  .lbm-table { width: 100%; border-collapse: collapse; min-width: 700px; }
  .lbm-table thead th {
    text-align: left; font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
    color: rgba(255,248,239,0.92);
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    padding: 15px 18px; white-space: nowrap;
  }
  .lbm-table thead th:first-child { border-top-left-radius: 18px; }
  .lbm-table thead th:last-child { border-top-right-radius: 18px; text-align: right; }
  .lbm-table tbody td { padding: 13px 18px; font-size: 13px; color: ${TEXT}; border-bottom: 1px solid ${BORDER}; vertical-align: middle; }
  .lbm-table tbody tr:last-child td { border-bottom: none; }
  .lbm-table tbody tr:nth-child(even) td { background: ${CREAM}; }
  .lbm-table tbody tr { transition: background 0.14s; }
  .lbm-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  .lbm-table tbody td:last-child { text-align: right; }
  .lbm-row-actions { display: flex; gap: 7px; justify-content: flex-end; }

  .lbm-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
    border: 1.5px solid rgba(212,175,55,0.4);
    box-shadow: 0 2px 8px rgba(40,0,0,0.18);
  }
  .lbm-name-cell { display: flex; align-items: center; gap: 10px; }
  .lbm-name-text { font-weight: 700; color: ${TEXT}; }
  .lbm-email-text { color: ${TEXT_MUTED}; font-size: 12.5px; }

  .lbm-campus-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px;
    background: rgba(34,197,94,0.12); color: #178A4C; border: 1px solid rgba(34,197,94,0.28);
  }
  .lbm-campus-badge.warn {
    background: rgba(239,68,68,0.08); color: #B91C1C; border: 1px solid rgba(239,68,68,0.24);
  }
  .lbm-date-text { color: ${TEXT_MUTED}; font-size: 12px; }

  .lbm-pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-top: 1px solid ${BORDER}; background: ${CREAM}; }
  .lbm-pagination-info { font-size: 12px; color: ${TEXT_MUTED}; font-weight: 600; }
  .lbm-pagination-btns { display: flex; gap: 6px; }
  .lbm-page-btn {
    width: 30px; height: 30px; border-radius: 9px; border: 1px solid ${BORDER};
    background: ${CARD}; color: ${TEXT}; font-size: 12px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .lbm-page-btn:hover:not(:disabled) { background: ${MAROON}; color: #fff; border-color: ${MAROON}; }
  .lbm-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .lbm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px 24px; text-align: center; }
  .lbm-empty-illus {
    width: 76px; height: 76px; border-radius: 22px;
    background: ${CREAM}; border: 1.5px dashed rgba(122,0,0,0.28);
    display: flex; align-items: center; justify-content: center; color: ${MAROON}; margin-bottom: 16px;
  }
  .lbm-empty-title { font-size: 14.5px; font-weight: 800; color: ${TEXT}; margin-bottom: 6px; }
  .lbm-empty-sub { font-size: 12.5px; color: ${TEXT_MUTED}; max-width: 320px; line-height: 1.6; margin-bottom: 4px; }

  /* ---------- Modal ---------- */
  .lbm-overlay {
    position: fixed; inset: 0; background: rgba(59,42,37,0.45);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
  }
  .lbm-modal {
    background: ${BG}; border-radius: 22px; width: 480px; max-width: 100%;
    max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 30px 70px rgba(40,0,0,0.35);
  }
  .lbm-modal-hdr {
    display: flex; align-items: center; gap: 12px; padding: 20px 24px;
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    flex-shrink: 0; position: relative;
  }
  .lbm-modal-hdr-icon {
    width: 38px; height: 38px; border-radius: 12px;
    background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
    display: flex; align-items: center; justify-content: center; color: ${GOLD}; flex-shrink: 0;
  }
  .lbm-modal-hdr-title { font-size: 15px; font-weight: 800; color: #fff; }
  .lbm-modal-hdr-sub { font-size: 11.5px; color: rgba(255,255,255,0.65); font-weight: 500; }
  .lbm-modal-hdr-close {
    margin-left: auto; background: rgba(255,255,255,0.10); border: none; color: #fff;
    width: 30px; height: 30px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background 0.14s;
  }
  .lbm-modal-hdr-close:hover { background: rgba(255,255,255,0.22); }
  .lbm-modal-body { padding: 24px 26px 26px; overflow-y: auto; flex: 1; }

  .lbm-field { margin-bottom: 16px; }
  .lbm-field-row { display: flex; gap: 12px; }
  .lbm-field-row .lbm-field { flex: 1; min-width: 0; }
  .lbm-field label {
    display: block; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    color: ${TEXT_MUTED}; margin-bottom: 7px;
  }
  .lbm-field label .opt { font-weight: 400; text-transform: none; letter-spacing: 0; color: rgba(138,115,104,0.7); margin-left: 4px; }
  .lbm-input-wrap { position: relative; }
  .lbm-field input, .lbm-field select {
    width: 100%; padding: 12px 14px 12px 40px; border-radius: 12px; border: 1.5px solid ${BORDER};
    background: ${CARD}; color: ${TEXT}; font-family: inherit; font-size: 13.5px; font-weight: 600; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; appearance: none;
  }
  .lbm-field select { cursor: pointer; }
  .lbm-field input::placeholder { color: ${TEXT_MUTED}; opacity: 0.55; font-weight: 400; }
  .lbm-field input:focus, .lbm-field select:focus { border-color: ${MAROON}; box-shadow: 0 0 0 4px ${MAROON_SOFT}; }
  .lbm-field input.err, .lbm-field select.err { border-color: ${DANGER}; }
  .lbm-field-icon {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    color: ${TEXT_MUTED}; pointer-events: none; transition: color 0.15s;
  }
  .lbm-field input:focus ~ svg, .lbm-field select:focus ~ svg { color: ${MAROON}; }
  .lbm-pw-toggle {
    position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: ${TEXT_MUTED};
    display: flex; align-items: center; padding: 0;
  }
  .lbm-err { color: ${DANGER}; font-size: 11px; margin-top: 5px; font-weight: 600; }
  .lbm-api-err {
    display: flex; align-items: flex-start; gap: 8px;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    border-radius: 10px; padding: 10px 13px; color: #b91c1c; font-size: 12px; margin-bottom: 14px; line-height: 1.5;
  }
  .lbm-note {
    display: flex; align-items: flex-start; gap: 8px;
    background: ${GOLD_PALE}; border: 1px solid rgba(212,175,55,0.35);
    border-radius: 10px; padding: 10px 13px; color: ${GOLD_DEEP}; font-size: 11.5px;
    margin-bottom: 16px; line-height: 1.55; font-weight: 600;
  }
  .lbm-modal-footer { margin-top: 4px; display: flex; gap: 10px; }
  .lbm-btn-submit {
    flex: 1; padding: 13px; border-radius: 12px; border: none;
    background: ${MAROON}; color: #fff; font-family: inherit; font-size: 14px; font-weight: 800;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.16s, transform 0.12s;
    box-shadow: 0 8px 18px rgba(122,0,0,0.24);
  }
  .lbm-btn-submit:hover { background: ${MAROON_MID}; transform: translateY(-1px); }
  .lbm-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .lbm-btn-cancel {
    padding: 13px 20px; border-radius: 12px; border: 1.5px solid ${BORDER};
    background: ${CARD}; color: ${TEXT}; font-family: inherit; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: border-color 0.14s, background 0.14s;
  }
  .lbm-btn-cancel:hover { border-color: ${MAROON}; background: ${MAROON_SOFT}; }

  /* ---------- Confirm dialog ---------- */
  .lbm-confirm {
    background: ${BG}; border-radius: 20px; width: 380px; max-width: 100%;
    padding: 26px 26px 22px; box-shadow: 0 30px 70px rgba(40,0,0,0.35); text-align: center;
  }
  .lbm-confirm-icon {
    width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 16px;
    background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.25);
    display: flex; align-items: center; justify-content: center; color: ${DANGER};
  }
  .lbm-confirm-title { font-size: 15.5px; font-weight: 800; color: ${TEXT}; margin-bottom: 8px; }
  .lbm-confirm-msg { font-size: 12.5px; color: ${TEXT_MUTED}; line-height: 1.6; margin-bottom: 22px; }
  .lbm-confirm-btns { display: flex; gap: 10px; }
  .lbm-btn-danger {
    flex: 1; padding: 12px; border-radius: 12px; border: none;
    background: ${DANGER}; color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 800;
    cursor: pointer; transition: background 0.15s, transform 0.12s;
  }
  .lbm-btn-danger:hover { background: #dc2626; transform: translateY(-1px); }

  /* ---------- Toast ---------- */
  .lbm-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    display: flex; align-items: center; gap: 9px;
    background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 13px 20px;
    font-family: inherit; font-size: 12.5px; font-weight: 700; color: ${TEXT};
    box-shadow: 0 14px 36px rgba(40,0,0,0.22);
    animation: lbm-toast-in 0.3s ease;
  }
  @keyframes lbm-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .lbm-toast-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  @keyframes lbm-spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .lbm-hero { padding: 26px 22px 22px; }
    .lbm-hero-title { font-size: 22px; }
    .lbm-hero-right { width: 100%; }
    .lbm-hero-right .lbm-btn-primary { width: 100%; justify-content: center; }
    .lbm-table thead th:nth-child(3), .lbm-table tbody td:nth-child(3) { display: none; }
  }
  @media (max-width: 560px) {
    .lbm-table thead th:nth-child(1), .lbm-table tbody td:nth-child(1) { display: none; }
    .lbm-field-row { flex-direction: column; gap: 0; }
  }
`;

function Toast({ msg, isErr }) {
  if (!msg) return null;
  return (
    <div className="lbm-toast">
      <span className="lbm-toast-dot" style={{ background: isErr ? DANGER : SUCCESS }} />
      {msg}
    </div>
  );
}

function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="lbm-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="lbm-confirm">
        <div className="lbm-confirm-icon"><AlertTriangle size={24} /></div>
        <div className="lbm-confirm-title">Remove librarian?</div>
        <div className="lbm-confirm-msg">
          This will permanently delete <strong>{name}</strong>'s profile and auth account. This action can't be undone.
        </div>
        <div className="lbm-confirm-btns">
          <button className="lbm-btn-cancel" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="lbm-btn-danger" onClick={onConfirm}>Remove</button>
        </div>
      </div>
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
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))  e.email    = 'Invalid email format.';
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
        const { error: profileErr } = await supabaseAdmin.from('profiles').update({
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          campus_id:  form.campus_id,
          updated_at: new Date().toISOString(),
        }).eq('id', librarian.id);
        if (profileErr) throw profileErr;

        if (form.password) {
          const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(librarian.id, { password: form.password });
          if (pwErr) throw pwErr;
        }
      } else {
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
    <div className="lbm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lbm-modal">
        <div className="lbm-modal-hdr">
          <div className="lbm-modal-hdr-icon"><Users size={18} /></div>
          <div>
            <div className="lbm-modal-hdr-title">{isEdit ? 'Edit Librarian' : 'Create Librarian Account'}</div>
            <div className="lbm-modal-hdr-sub">{isEdit ? 'Update profile and campus assignment' : 'Adds a new staff account with immediate access'}</div>
          </div>
          <button className="lbm-modal-hdr-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="lbm-modal-body">
          {apiErr && <div className="lbm-api-err"><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{apiErr}</div>}

          <div className="lbm-field-row">
            <div className="lbm-field">
              <label>First Name</label>
              <div className="lbm-input-wrap">
                <input className={errs.first_name ? 'err' : ''} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
                <User size={15} className="lbm-field-icon" />
              </div>
              {errs.first_name && <div className="lbm-err">{errs.first_name}</div>}
            </div>
            <div className="lbm-field">
              <label>Last Name</label>
              <div className="lbm-input-wrap">
                <input className={errs.last_name ? 'err' : ''} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
                <User size={15} className="lbm-field-icon" />
              </div>
              {errs.last_name && <div className="lbm-err">{errs.last_name}</div>}
            </div>
          </div>

          {!isEdit && (
            <div className="lbm-field">
              <label>Email Address</label>
              <div className="lbm-input-wrap">
                <input className={errs.email ? 'err' : ''} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="librarian@pampangastateu.edu.ph" />
                <Mail size={15} className="lbm-field-icon" />
              </div>
              {errs.email && <div className="lbm-err">{errs.email}</div>}
            </div>
          )}

          <div className="lbm-field">
            <label>Assigned Campus</label>
            <div className="lbm-input-wrap">
              <select className={errs.campus_id ? 'err' : ''} value={form.campus_id} onChange={e => set('campus_id', e.target.value)}>
                <option value="">Select campus to assign…</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.campus_name}</option>)}
              </select>
              <Building2 size={15} className="lbm-field-icon" />
            </div>
            {errs.campus_id && <div className="lbm-err">{errs.campus_id}</div>}
          </div>

          <div className="lbm-field">
            <label>
              {isEdit ? 'New Password' : 'Password'}
              {isEdit && <span className="opt">(leave blank to keep current)</span>}
            </label>
            <div className="lbm-input-wrap">
              <input
                className={errs.password ? 'err' : ''}
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Minimum 8 characters'}
                style={{ paddingRight: 40 }}
              />
              <Lock size={15} className="lbm-field-icon" />
              <button type="button" className="lbm-pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errs.password && <div className="lbm-err">{errs.password}</div>}
          </div>

          <div className="lbm-note">
            {isEdit
              ? 'Changing the campus assignment takes effect on their next login.'
              : 'The librarian account is created with email pre-confirmed. They can log in immediately.'}
          </div>

          <div className="lbm-modal-footer">
            <button className="lbm-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="lbm-btn-submit" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? <><Check size={16} /> Save Changes</> : <><Plus size={16} /> Create Librarian</>}
            </button>
          </div>
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
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast,      setToast]      = useState({ msg: '', isErr: false });
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);

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

  const confirmDelete = async () => {
    const lib = confirmDel;
    setConfirmDel(null);
    try {
      await supabaseAdmin.from('profiles').delete().eq('id', lib.id);
      await supabaseAdmin.auth.admin.deleteUser(lib.id);
      showToast('Librarian account removed.');
      load();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const campusName = (id) => campuses.find(c => c.id === id)?.campus_name || null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return librarians.filter(l => !q || [l.first_name, l.last_name, l.email].join(' ').toLowerCase().includes(q));
  }, [librarians, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const withCampus = librarians.filter(l => l.campus_id).length;
  const noCampus   = librarians.length - withCampus;

  return (
    <div className="lbm">
      <style>{CSS}</style>
      <Toast msg={toast.msg} isErr={toast.isErr} />

      {/* Hero */}
      <div className="lbm-hero">
        <div className="lbm-hero-left">
          <div className="lbm-hero-title">
            <span className="lbm-hero-icon"><Users size={22} /></span>
            Librarian Management
          </div>
          <div className="lbm-hero-sub">
            Create staff accounts, assign campuses, and manage access for every librarian in the LIBRASCAN network.
          </div>
        </div>
        <div className="lbm-hero-right">
          <button className="lbm-btn-primary" onClick={() => setModal('add')}>
            <Plus size={16} /> Add Librarian
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="lbm-stats-grid">
        <div className="lbm-stat-card">
          <div className="lbm-stat-icon" style={{ background: GOLD_PALE }}><Users size={19} color={GOLD_DEEP} /></div>
          <div><div className="lbm-stat-value">{loading ? '—' : librarians.length}</div><div className="lbm-stat-label">Total Librarians</div></div>
        </div>
        <div className="lbm-stat-card">
          <div className="lbm-stat-icon" style={{ background: 'rgba(34,197,94,0.12)' }}><Building2 size={19} color="#178A4C" /></div>
          <div><div className="lbm-stat-value">{loading ? '—' : withCampus}</div><div className="lbm-stat-label">With Campus</div></div>
        </div>
        <div className="lbm-stat-card">
          <div className="lbm-stat-icon" style={{ background: 'rgba(239,68,68,0.10)' }}><AlertTriangle size={19} color={DANGER} /></div>
          <div><div className="lbm-stat-value">{loading ? '—' : noCampus}</div><div className="lbm-stat-label">No Campus</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="lbm-toolbar">
        <div className="lbm-search">
          <Search size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search librarians by name or email..." aria-label="Search librarians" />
        </div>
      </div>

      {/* Table */}
      <div className="lbm-table-wrap">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: `3px solid ${BORDER}`, borderTopColor: MAROON, animation: 'lbm-spin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="lbm-empty">
            <div className="lbm-empty-illus"><Users size={30} strokeWidth={1.8} /></div>
            <div className="lbm-empty-title">{search ? 'No matching librarians' : 'No librarians yet'}</div>
            <div className="lbm-empty-sub">
              {search ? 'Try a different search term.' : 'Click "Add Librarian" to create the first staff account.'}
            </div>
          </div>
        ) : (
          <>
            <div className="lbm-table-scroll">
              <table className="lbm-table">
                <thead>
                  <tr><th>#</th><th>Librarian</th><th>Email</th><th>Assigned Campus</th><th>Added</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {paged.map((l, i) => {
                    const initials = ((l.first_name?.[0] || '') + (l.last_name?.[0] || '')).toUpperCase();
                    const cName = campusName(l.campus_id);
                    return (
                      <tr key={l.id}>
                        <td style={{ color: TEXT_MUTED, fontSize: 12 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td>
                          <div className="lbm-name-cell">
                            <div className="lbm-avatar" style={{ background: avatarFor(l.first_name + l.last_name).bg }}>{initials || '?'}</div>
                            <span className="lbm-name-text">{l.first_name} {l.last_name}</span>
                          </div>
                        </td>
                        <td className="lbm-email-text">{l.email || '—'}</td>
                        <td>
                          {cName
                            ? <span className="lbm-campus-badge">{cName}</span>
                            : <span className="lbm-campus-badge warn"><AlertTriangle size={11} /> Unassigned</span>}
                        </td>
                        <td className="lbm-date-text">
                          {l.created_at ? new Date(l.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <div className="lbm-row-actions">
                            <button className="lbm-icon-btn edit" title="Edit" onClick={() => setModal(l)}><Pencil size={14} /></button>
                            <button className="lbm-icon-btn del" title="Remove" onClick={() => setConfirmDel(l)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="lbm-pagination">
                <div className="lbm-pagination-info">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </div>
                <div className="lbm-pagination-btns">
                  <button className="lbm-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={14} /></button>
                  <button className="lbm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
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

      {confirmDel && (
        <ConfirmDialog
          name={`${confirmDel.first_name} ${confirmDel.last_name}`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}