import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, ChevronRight, Copy, Ban, CheckCircle2,
  Building2, X, Camera, School, Check,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';

/* ============================================================================
   LIBRASCAN — Campus Management Hub
   Fully redesigned to match screenshots 100%
============================================================================ */

const MAR      = '#7B0000';   // primary maroon (Dashboard --maroon)
const MAR_DEEP = '#5A0000';   // deep maroon (Dashboard --maroon-deep)
const MAR_MID  = '#8B0000';   // mid maroon  (Dashboard --maroon-mid)
const GOLD     = '#C9A84C';
const GOLD_PALE= '#F5E4A8';
const CREAM    = '#FDF8F0';   // Dashboard --cream
const PANEL    = '#F5ECD9';   // warm panel bg
const TEXT     = '#3A0000';
const SUBTEXT  = '#7A3030';
const BORDER   = 'rgba(123,0,0,0.18)';
const RED_ERR  = '#B71C1C';

/* ─── Global Styles ─────────────────────────────────────────────────────── */
const CSS = `
  .cmh {
    background: ${CREAM};
    min-height: 100%;
    font-family: var(--font-sans,'DM Sans','Josefin Sans',sans-serif);
    color: ${TEXT};
  }

  /* ── Page Header ────────────────────────────────────────────────────── */
  .cmh-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 16px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .cmh-page-title {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${TEXT};
  }

  /* ── Buttons ────────────────────────────────────────────────────────── */
  .cmh-btn-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 20px;
    border-radius: 999px;
    border: none;
    background: ${MAR};
    color: #fff;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.18s, transform 0.12s;
    box-shadow: 0 2px 8px rgba(123,0,0,0.30);
  }
  .cmh-btn-pill:hover { background: ${MAR_MID}; transform: translateY(-1px); }

  .cmh-btn-pill-sm {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 16px;
    border-radius: 999px;
    border: none;
    background: ${MAR};
    color: #fff;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.18s, transform 0.12s;
  }
  .cmh-btn-pill-sm:hover { background: ${MAR_MID}; }

  .cmh-icon-btn {
    width: 30px; height: 30px;
    border-radius: 6px;
    border: 1px solid ${BORDER};
    background: #fff;
    color: ${SUBTEXT};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.14s, color 0.14s;
  }
  .cmh-icon-btn:hover { background: ${PANEL}; color: ${MAR}; }
  .cmh-icon-btn.del:hover { background: rgba(183,28,28,0.08); color: ${RED_ERR}; }

  /* ── Carousel ───────────────────────────────────────────────────────── */
  .cmh-carousel-wrap {
    background: ${MAR};
    border-radius: 10px 10px 0 0;
    overflow: hidden;
    position: relative;
    margin-bottom: 0;
  }
  .cmh-carousel-track-outer { overflow: hidden; }
  .cmh-carousel-track {
    display: flex;
    width: max-content;
    will-change: transform;
  }
  .cmh-campus-card {
    flex-shrink: 0;
    width: 148px;
    border-right: 1px solid rgba(255,255,255,0.10);
    padding: 18px 10px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    user-select: none;
    position: relative;
    transition: background 0.18s;
  }
  .cmh-campus-card:hover { background: rgba(255,255,255,0.08); }
  .cmh-campus-card.sel {
    background: rgba(255,255,255,0.15);
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.55);
  }
  .cmh-campus-card.inactive { opacity: 0.45; }
  .cmh-campus-logo-wrap {
    width: 64px; height: 64px;
    border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,0.70);
    background: #fff;
    overflow: hidden;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .cmh-campus-logo-wrap img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
  }
  .cmh-campus-name {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
    color: #fff;
    line-height: 1.3;
  }
  .cmh-carousel-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.28);
    background: rgba(0,0,0,0.28);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    z-index: 5;
    transition: background 0.15s;
  }
  .cmh-carousel-arrow:hover { background: rgba(0,0,0,0.50); }
  .cmh-carousel-arrow.l { left: 6px; }
  .cmh-carousel-arrow.r { right: 6px; }

  /* ── Detail Panel ────────────────────────────────────────────────────── */
  .cmh-detail-panel {
    background: #fff;
    border: 1px solid ${BORDER};
    border-top: none;
    border-radius: 0 0 10px 10px;
    padding: 18px 22px;
    margin-bottom: 20px;
  }
  .cmh-detail-name {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${MAR};
    margin-bottom: 14px;
  }

  /* ── Content area below carousel ─────────────────────────────────────── */
  .cmh-body { padding-top: 4px; }

  .cmh-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    margin-top: 4px;
  }
  .cmh-section-name {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${TEXT};
  }

  /* ── Table ───────────────────────────────────────────────────────────── */
  .cmh-table-wrap {
    background: #fff;
    border: 1px solid ${BORDER};
    border-radius: 10px;
    overflow: hidden;
  }
  .cmh-table {
    width: 100%;
    border-collapse: collapse;
  }
  .cmh-table thead tr {
    background: ${PANEL};
  }
  .cmh-table thead th {
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${MAR};
    padding: 11px 16px;
    border-bottom: 1.5px solid rgba(123,0,0,0.15);
  }
  .cmh-table tbody td {
    padding: 12px 16px;
    font-size: 13px;
    color: ${TEXT};
    border-bottom: 1px solid rgba(123,0,0,0.07);
    vertical-align: middle;
  }
  .cmh-table tbody tr:last-child td { border-bottom: none; }
  .cmh-table tbody tr:hover td { background: rgba(123,0,0,0.025); }
  .cmh-table-empty {
    text-align: center;
    color: ${SUBTEXT};
    padding: 40px 20px;
    font-size: 13px;
  }
  .cmh-code-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    font-family: monospace;
    background: ${PANEL};
    color: ${MAR};
    border-radius: 4px;
    padding: 2px 8px;
  }
  .cmh-row-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  /* ── Empty state ─────────────────────────────────────────────────────── */
  .cmh-empty {
    background: #fff;
    border: 1px solid ${BORDER};
    border-top: none;
    border-radius: 0 0 10px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 50px 20px;
    text-align: center;
    color: ${SUBTEXT};
    margin-bottom: 20px;
  }
  .cmh-empty-icon {
    width: 46px; height: 46px;
    border-radius: 50%;
    border: 2px solid rgba(123,0,0,0.18);
    background: ${PANEL};
    display: flex; align-items: center; justify-content: center;
    color: ${MAR};
    margin-bottom: 12px;
  }
  .cmh-empty-title { font-size: 13.5px; font-weight: 800; color: ${TEXT}; margin-bottom: 5px; }
  .cmh-empty-sub   { font-size: 12px; max-width: 280px; line-height: 1.55; }

  /* ── Context Menu ────────────────────────────────────────────────────── */
  .cmh-ctx {
    position: fixed;
    min-width: 185px;
    background: #fff;
    border: 1px solid ${BORDER};
    border-radius: 10px;
    padding: 5px;
    z-index: 2000;
    box-shadow: 0 12px 32px rgba(60,0,0,0.22);
  }
  .cmh-ctx-item {
    display: flex; align-items: center; gap: 9px;
    width: 100%; padding: 9px 12px; border-radius: 7px;
    border: none; background: transparent; color: ${TEXT};
    font-family: inherit; font-size: 12.5px; font-weight: 600;
    cursor: pointer; text-align: left;
    transition: background 0.13s;
  }
  .cmh-ctx-item:hover { background: rgba(123,0,0,0.07); }
  .cmh-ctx-item.danger { color: ${RED_ERR}; }
  .cmh-ctx-item.danger:hover { background: rgba(183,28,28,0.09); }
  .cmh-ctx-sep { height: 1px; background: ${BORDER}; margin: 4px; }

  /* ── Modal ───────────────────────────────────────────────────────────── */
  .cmh-overlay {
    position: fixed; inset: 0;
    background: rgba(40,0,0,0.50);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
    padding: 16px;
  }
  .cmh-modal {
    background: ${CREAM};
    border-radius: 12px;
    width: 460px;
    max-width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(40,0,0,0.40);
  }
  .cmh-modal-wide { width: 560px; }
  .cmh-modal-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: ${MAR};
    flex-shrink: 0;
  }
  .cmh-modal-hdr-title {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #fff;
    flex: 1;
    text-align: center;
  }
  .cmh-modal-hdr-del {
    position: absolute;
    right: 16px;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.75);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.14s;
  }
  .cmh-modal-hdr-del:hover { color: #fff; }
  .cmh-modal-body {
    padding: 22px 24px 24px;
    overflow-y: auto;
    flex: 1;
  }

  /* Logo upload circle */
  .cmh-logo-circle-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 18px;
  }
  .cmh-logo-circle {
    position: relative;
    width: 120px; height: 120px;
    border-radius: 50%;
    border: 2.5px dashed rgba(123,0,0,0.45);
    background: ${PANEL};
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .cmh-logo-circle:hover { border-color: ${MAR}; }
  .cmh-logo-circle img {
    width: 100%; height: 100%;
    object-fit: cover;
    position: absolute; inset: 0;
    border-radius: 50%;
  }
  .cmh-logo-circle-text {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: ${SUBTEXT};
    text-align: center;
    line-height: 1.4;
  }
  .cmh-logo-cam-badge {
    position: absolute;
    bottom: 6px; right: 6px;
    width: 26px; height: 26px;
    border-radius: 50%;
    background: ${MAR};
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    z-index: 2;
    pointer-events: none;
  }
  .cmh-logo-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${SUBTEXT};
    margin-top: 8px;
  }

  /* Active toggle pill */
  .cmh-active-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    cursor: pointer;
    background: rgba(102,187,106,0.14);
    border: 1px solid rgba(102,187,106,0.35);
    margin: 0 auto 14px;
    width: fit-content;
  }
  .cmh-active-pill.off { background: rgba(239,83,80,0.10); border-color: rgba(239,83,80,0.30); }
  .cmh-active-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #66bb6a;
  }
  .cmh-active-dot.off { background: #ef5350; }
  .cmh-active-text {
    font-size: 12px; font-weight: 700;
    color: #388e3c;
  }
  .cmh-active-text.off { color: #c62828; }

  /* Form fields */
  .cmh-field { margin-bottom: 14px; }
  .cmh-field-row { display: flex; gap: 12px; }
  .cmh-field-row .cmh-field { flex: 1; min-width: 0; }
  .cmh-label {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 10px; font-weight: 800;
    letter-spacing: 0.07em; text-transform: uppercase;
    color: ${TEXT};
    margin-bottom: 6px;
  }
  .cmh-input {
    width: 100%; padding: 10px 13px;
    border-radius: 8px;
    border: 1.5px solid rgba(123,0,0,0.22);
    background: #fff;
    color: ${TEXT};
    font-family: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.14s;
  }
  .cmh-input:focus { border-color: ${MAR}; }
  .cmh-input::placeholder { color: rgba(58,0,0,0.30); }
  .cmh-err { color: ${RED_ERR}; font-size: 11px; margin-top: 4px; }
  .cmh-api-err {
    background: rgba(239,83,80,0.08);
    border: 1px solid rgba(183,28,28,0.22);
    border-radius: 8px;
    padding: 8px 12px;
    color: ${RED_ERR};
    font-size: 12px;
    margin-bottom: 14px;
  }

  /* Modal footer */
  .cmh-modal-footer {
    margin-top: 8px;
    padding-top: 14px;
  }
  .cmh-btn-submit {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: none;
    background: ${MAR};
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.18s;
  }
  .cmh-btn-submit:hover { background: ${MAR_MID}; }
  .cmh-btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

  /* Created text inside modal */
  .cmh-modal-created {
    font-size: 11px;
    color: ${SUBTEXT};
    margin-bottom: 14px;
    font-weight: 500;
  }

  /* Toast */
  .cmh-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    border-radius: 10px; padding: 12px 18px;
    display: flex; align-items: center; gap: 9px;
    font-size: 13px; color: ${TEXT};
    box-shadow: 0 8px 28px rgba(40,0,0,0.22);
    background: #fff;
    border: 1px solid ${BORDER};
  }

  @keyframes cmh-spin { to { transform: rotate(360deg); } }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .cmh-campus-card  { width: 110px; }
    .cmh-campus-logo-wrap { width: 52px; height: 52px; }
    .cmh-field-row { flex-direction: column; gap: 0; }
    .cmh-table thead th:nth-child(4),
    .cmh-table tbody td:nth-child(4) { display: none; }
    .cmh-modal-wide { width: 100%; }
  }
  @media (max-width: 480px) {
    .cmh-table thead th:nth-child(1),
    .cmh-table tbody td:nth-child(1) { display: none; }
    .cmh-page-title { font-size: 14px; }
  }
`;

/* ─── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ msg, isErr }) {
  return (
    <motion.div
      className="cmh-toast"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      style={{ borderColor: isErr ? 'rgba(239,83,80,0.35)' : BORDER }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isErr ? '#ef5350' : '#66bb6a', flexShrink: 0 }} />
      {msg}
    </motion.div>
  );
}

/* ─── Empty State (no campus selected) ─────────────────────────────────── */
function EmptyState() {
  return (
    <div className="cmh-empty">
      <div className="cmh-empty-icon">
        <Check size={22} />
      </div>
      <div className="cmh-empty-title">All Caught Up!</div>
      <div className="cmh-empty-sub">Select campus first, to see all details.</div>
    </div>
  );
}

/* ─── Context Menu ───────────────────────────────────────────────────────── */
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const esc   = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  /* keep inside viewport */
  const safeX = Math.min(x, window.innerWidth  - 210);
  const safeY = Math.min(y, window.innerHeight - 200);

  return (
    <motion.div
      ref={ref}
      className="cmh-ctx"
      style={{ top: safeY, left: safeX }}
      initial={{ opacity: 0, scale: 0.90 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.90 }}
      transition={{ duration: 0.12 }}
    >
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="cmh-ctx-sep" />
        ) : (
          <button
            key={i}
            className={`cmh-ctx-item${it.danger ? ' danger' : ''}`}
            onClick={() => { it.onClick(); onClose(); }}
          >
            {it.icon}{it.label}
          </button>
        )
      )}
    </motion.div>
  );
}

/* ─── Logo Upload helper ─────────────────────────────────────────────────── */
/* Convert file → base64 data URL (stored directly in DB — no bucket needed) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);   // "data:image/png;base64,..."
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/* Try Supabase storage first; fall back to base64 stored in DB */
async function resolveLogoUrl(file, pathPrefix) {
  /* 1. Attempt Supabase storage */
  try {
    const ext  = file.name.split('.').pop();
    const path = `${pathPrefix}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('logo_url').upload(path, file, { upsert: true });
    if (!upErr) {
      const { data } = supabaseAdmin.storage.from('logo_url').getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (_) { /* storage bucket missing — fall through */ }

  /* 2. Fallback: base64 in DB (always works) */
  return fileToBase64(file);
}

/* ─── Campus Modal (Add / Edit) ─────────────────────────────────────────── */
function CampusModal({ campus, onClose, onSaved, onDelete }) {
  const isEdit = Boolean(campus?.id);
  const [form, setForm]     = useState({
    campus_name: campus?.campus_name || '',
    campus_code: campus?.campus_code || '',
  });
  const [isActive, setActive] = useState(campus?.is_active ?? true);
  const [logoFile, setLogoFile]     = useState(null);
  const [logoPreview, setPreview]   = useState(campus?.logo_url || null);
  const [errs, setErrs]   = useState({});
  const [saving, setSave] = useState(false);
  const [apiErr, setApi]  = useState('');

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrs(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.campus_name.trim()) e.campus_name = 'Campus name is required.';
    if (!form.campus_code.trim()) e.campus_code = 'Campus code is required.';
    else if (!/^[A-Z0-9]{2,6}$/.test(form.campus_code.trim()))
      e.campus_code = 'Code: 2-6 uppercase letters/numbers.';
    return e;
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    setApi('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    setSave(true);

    let logo_url = campus?.logo_url || null;
    if (logoFile) {
      const up = await resolveLogoUrl(logoFile, form.campus_code.trim().toUpperCase() || 'campus');
      if (up) logo_url = up;
    }

    const basePayload = {
      campus_name: form.campus_name.trim(),
      campus_code: form.campus_code.trim().toUpperCase(),
      is_active:   isActive,
    };
    const payloadWithLogo = { ...basePayload, ...(logo_url ? { logo_url } : {}) };

    let err;
    /* Try saving WITH logo_url first */
    if (isEdit) {
      ({ error: err } = await supabaseAdmin.from('campuses').update(payloadWithLogo).eq('id', campus.id));
    } else {
      ({ error: err } = await supabaseAdmin.from('campuses').insert({ ...payloadWithLogo, is_active: true }));
    }

    /* If the campuses table doesn't have a logo_url column, retry without it */
    if (err && err.message?.toLowerCase().includes('logo_url')) {
      if (isEdit) {
        ({ error: err } = await supabaseAdmin.from('campuses').update(basePayload).eq('id', campus.id));
      } else {
        ({ error: err } = await supabaseAdmin.from('campuses').insert({ ...basePayload, is_active: true }));
      }
      if (!err) {
        setSave(false);
        /* Warn that logo was not saved because column is missing */
        setApi('⚠️ Saved, but campus logo was not stored — please add a "logo_url" TEXT column to your campuses table in Supabase.');
        setTimeout(() => onSaved(), 2800);
        return;
      }
    }

    setSave(false);
    if (err) { setApi(err.message); return; }
    onSaved();
  };

  return (
    <div className="cmh-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="cmh-modal"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.20 }}
      >
        {/* Header */}
        <div className="cmh-modal-hdr" style={{ position: 'relative' }}>
          <div className="cmh-modal-hdr-title">
            {isEdit ? `Edit ${campus.campus_name}` : 'Add New Campus'}
          </div>
          {isEdit && (
            <button
              className="cmh-modal-hdr-del"
              title="Delete campus"
              onClick={() => onDelete?.(campus)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="cmh-modal-body">
          {isEdit && (
            <div className="cmh-modal-created">
              Created : {campus.created_at
                ? new Date(campus.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                : '—'}
            </div>
          )}

          {/* Logo upload circle */}
          <div className="cmh-logo-circle-wrap">
            <label className="cmh-logo-circle" style={{ cursor: 'pointer' }}>
              {logoPreview
                ? <img src={logoPreview} alt="logo" />
                : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={SUBTEXT} strokeWidth="1.8">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span className="cmh-logo-circle-text">Click to upload</span>
                  </>
                )}
              <div className="cmh-logo-cam-badge"><Camera size={13} /></div>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            </label>
            <span className="cmh-logo-label">Campus Logo</span>

            {/* Active toggle (edit only) */}
            {isEdit && (
              <div
                className={`cmh-active-pill${isActive ? '' : ' off'}`}
                onClick={() => setActive(a => !a)}
                style={{ marginTop: 8 }}
              >
                <span className={`cmh-active-dot${isActive ? '' : ' off'}`} />
                <span className={`cmh-active-text${isActive ? '' : ' off'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="cmh-field">
            <div className="cmh-label">Campus Name :</div>
            <input
              className="cmh-input"
              value={form.campus_name}
              onChange={e => set('campus_name', e.target.value)}
              placeholder="e.g STO. STOMAS"
            />
            {errs.campus_name && <div className="cmh-err">{errs.campus_name}</div>}
          </div>

          <div className="cmh-field">
            <div className="cmh-label">Campus Code :</div>
            <input
              className="cmh-input"
              value={form.campus_code}
              onChange={e => set('campus_code', e.target.value.toUpperCase())}
              placeholder="e.g PSTC"
              maxLength={6}
            />
            {errs.campus_code && <div className="cmh-err">{errs.campus_code}</div>}
          </div>

          {apiErr && <div className="cmh-api-err">{apiErr}</div>}

          <div className="cmh-modal-footer">
            <button className="cmh-btn-submit" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : (
                <>
                  <Plus size={15} />
                  {isEdit ? 'Save Changes' : 'Add Campus'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Course Modal (Add / Edit) ─────────────────────────────────────────── */
function CourseModal({ campusId, row, onClose, onSaved }) {
  const isEdit  = Boolean(row);
  const college = row?.college;
  const program = row?.program;

  const [form, setForm] = useState({
    college_name: college?.college_name || '',
    college_code: college?.college_code || '',
    program_name: program?.program_name || '',
    program_code: program?.program_code || '',
  });
  const [majorDrafts, setMajorDrafts] = useState(['', '']);
  const [errs, setErrs]   = useState({});
  const [saving, setSave] = useState(false);
  const [apiErr, setApi]  = useState('');

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrs(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.college_name.trim()) e.college_name = 'Required';
    if (!form.college_code.trim()) e.college_code = 'Required';
    else if (!/^[A-Z0-9]{2,8}$/.test(form.college_code.trim()))
      e.college_code = '2-8 uppercase';
    if (!form.program_name.trim()) e.program_name = 'Required';
    if (!form.program_code.trim()) e.program_code = 'Required';
    else if (!/^[A-Z0-9\s]{2,12}$/.test(form.program_code.trim()))
      e.program_code = '2-12 chars';
    return e;
  };

  const handleSave = async () => {
    setApi('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    setSave(true);

    let collegeId = college?.id;
    const colPayload = {
      campus_id:    campusId,
      college_name: form.college_name.trim(),
      college_code: form.college_code.trim().toUpperCase(),
    };

    if (isEdit) {
      const { error: cErr } = await supabaseAdmin
        .from('colleges').update(colPayload).eq('id', collegeId);
      if (cErr) { setSave(false); setApi(cErr.message); return; }
    } else {
      const { data, error: cErr } = await supabaseAdmin
        .from('colleges').insert(colPayload).select('id').single();
      if (cErr) { setSave(false); setApi(cErr.message); return; }
      collegeId = data?.id;
    }

    const progPayload = {
      college_id:   collegeId,
      program_name: form.program_name.trim(),
      program_code: form.program_code.trim().toUpperCase(),
    };
    let err, newProgId = program?.id;
    if (isEdit) {
      ({ error: err } = await supabaseAdmin
        .from('programs').update(progPayload).eq('id', program.id));
    } else {
      const { data, error: insErr } = await supabaseAdmin
        .from('programs').insert(progPayload).select('id').single();
      err = insErr;
      newProgId = data?.id;
    }
    if (err) { setSave(false); setApi(err.message); return; }

    const majors = majorDrafts.map(m => m.trim()).filter(Boolean);
    if (!isEdit && majors.length && newProgId) {
      await supabaseAdmin.from('majors')
        .insert(majors.map(major_name => ({ program_id: newProgId, major_name })));
    }
    setSave(false);
    onSaved();
  };

  return (
    <div className="cmh-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="cmh-modal cmh-modal-wide"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.20 }}
      >
        {/* Header */}
        <div className="cmh-modal-hdr" style={{ position: 'relative' }}>
          <div className="cmh-modal-hdr-title">
            {isEdit ? 'Edit Course' : 'Add New Course'}
          </div>
        </div>

        {/* Body */}
        <div className="cmh-modal-body">
          {/* Row 1: College Name + College Code */}
          <div className="cmh-field-row">
            <div className="cmh-field">
              <div className="cmh-label">College Name :</div>
              <input
                className="cmh-input"
                value={form.college_name}
                onChange={e => set('college_name', e.target.value)}
                placeholder="e.g College of Computing Studies"
              />
              {errs.college_name && <div className="cmh-err">{errs.college_name}</div>}
            </div>
            <div className="cmh-field" style={{ maxWidth: 130 }}>
              <div className="cmh-label">College Code :</div>
              <input
                className="cmh-input"
                value={form.college_code}
                onChange={e => set('college_code', e.target.value.toUpperCase())}
                placeholder="e.g CCS"
                maxLength={8}
              />
              {errs.college_code && <div className="cmh-err">{errs.college_code}</div>}
            </div>
          </div>

          {/* Row 2: Course Name + Course Code */}
          <div className="cmh-field-row">
            <div className="cmh-field">
              <div className="cmh-label">Course Name</div>
              <input
                className="cmh-input"
                value={form.program_name}
                onChange={e => set('program_name', e.target.value)}
                placeholder="e.g Bachelor of Science in Information Technology"
              />
              {errs.program_name && <div className="cmh-err">{errs.program_name}</div>}
            </div>
            <div className="cmh-field" style={{ maxWidth: 130 }}>
              <div className="cmh-label">Course Code :</div>
              <input
                className="cmh-input"
                value={form.program_code}
                onChange={e => set('program_code', e.target.value.toUpperCase())}
                placeholder="e.g BSIT"
                maxLength={12}
              />
              {errs.program_code && <div className="cmh-err">{errs.program_code}</div>}
            </div>
          </div>

          {/* Major Name section */}
          {!isEdit && (
            <div className="cmh-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="cmh-label" style={{ marginBottom: 0 }}>Major Name (Optional) :</div>
                <button
                  className="cmh-btn-pill-sm"
                  onClick={() => setMajorDrafts(d => [...d, ''])}
                  style={{ fontSize: 11, padding: '5px 12px' }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>•</span> Add Major
                </button>
              </div>
              {majorDrafts.map((m, i) => (
                <input
                  key={i}
                  className="cmh-input"
                  style={{ marginBottom: 8 }}
                  value={m}
                  onChange={e => setMajorDrafts(d => d.map((v, j) => j === i ? e.target.value : v))}
                  placeholder=""
                />
              ))}
            </div>
          )}

          {apiErr && <div className="cmh-api-err">{apiErr}</div>}

          <div className="cmh-modal-footer">
            <button className="cmh-btn-submit" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : (
                <>
                  <Plus size={15} />
                  {isEdit ? 'Save Changes' : 'Add Course'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Campus Carousel ────────────────────────────────────────────────────── */
function CampusCarousel({ campuses, selectedId, onSelect, onContextMenu }) {
  const trackRef  = useRef(null);
  const offsetRef = useRef(0);
  const rafRef    = useRef(null);
  const pausedRef = useRef(false);
  const [, forceRender] = useState(0);

  /* Smooth CSS-transition nudge state */
  const [nudging, setNudging] = useState(false);

  const loopList = campuses.length ? [...campuses, ...campuses, ...campuses] : [];

  /* Auto-scroll: ~1px / frame ≈ 60px/sec */
  useEffect(() => {
    if (!campuses.length) return;
    const speed = 0.5; /* reduced for smoothness */
    const step = () => {
      if (!pausedRef.current && trackRef.current) {
        offsetRef.current -= speed;
        const third = trackRef.current.scrollWidth / 3;
        if (Math.abs(offsetRef.current) >= third) offsetRef.current = 0;
        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [campuses.length]);

  const nudge = (dir) => {
    pausedRef.current = true;
    offsetRef.current += dir * 180;
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 0.6s cubic-bezier(0.25,0.8,0.25,1)';
      trackRef.current.style.transform  = `translateX(${offsetRef.current}px)`;
    }
    setTimeout(() => {
      if (trackRef.current) trackRef.current.style.transition = '';
      pausedRef.current = false;
    }, 650);
  };

  if (!campuses.length) {
    return (
      <div className="cmh-carousel-wrap" style={{ padding: '24px 20px' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
          No campuses yet. Click "+ Add Campus" to get started.
        </div>
      </div>
    );
  }

  return (
    <div
      className="cmh-carousel-wrap"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <button className="cmh-carousel-arrow l" onClick={() => nudge(1)}>
        <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button className="cmh-carousel-arrow r" onClick={() => nudge(-1)}>
        <ChevronRight size={15} />
      </button>

      <div className="cmh-carousel-track-outer">
        <div className="cmh-carousel-track" ref={trackRef}>
          {loopList.map((c, idx) => (
            <div
              key={`${c.id}-${idx}`}
              className={[
                'cmh-campus-card',
                selectedId === c.id ? 'sel' : '',
                !c.is_active       ? 'inactive' : '',
              ].join(' ')}
              onClick={() => onSelect(c)}
              onContextMenu={e => { e.preventDefault(); onContextMenu(e, c); }}
            >
              <div className="cmh-campus-logo-wrap">
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.campus_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }}
                    onError={ev => {
                      ev.currentTarget.style.display = 'none';
                      const fb = ev.currentTarget.nextElementSibling;
                      if (fb) fb.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{
                  display: c.logo_url ? 'none' : 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: '100%',
                }}>
                  <Building2 size={28} color={MAR} />
                </div>
              </div>
              <div className="cmh-campus-name">{c.campus_name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function CampusManagementHub() {
  const [campuses, setCampuses] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [modal,   setModal]   = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [toast,   setToast]   = useState({ msg: '', isErr: false });

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast({ msg: '', isErr: false }), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: caData }, { data: coData }, { data: pData }] = await Promise.all([
      supabaseAdmin.from('campuses').select('*').order('campus_name'),
      supabaseAdmin.from('colleges').select('*').order('college_name'),
      supabaseAdmin.from('programs').select('*').order('program_name'),
    ]);
    setCampuses(caData || []);
    setColleges(coData || []);
    setPrograms(pData  || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedCampus = useMemo(
    () => campuses.find(c => c.id === selectedId) || null,
    [campuses, selectedId]
  );

  const courseRows = useMemo(() => {
    if (!selectedCampus) return [];
    const campusCollegeIds = new Set(
      colleges.filter(c => c.campus_id === selectedCampus.id).map(c => c.id)
    );
    return programs
      .filter(p => campusCollegeIds.has(p.college_id))
      .map(p => ({ program: p, college: colleges.find(c => c.id === p.college_id) }))
      .filter(r => r.college);
  }, [colleges, programs, selectedCampus]);

  const closeModal = () => setModal(null);
  const handleSaved = (msg) => { closeModal(); showToast(msg); load(); };

  /* Campus actions */
  const toggleActive = async (campus) => {
    const { error } = await supabaseAdmin
      .from('campuses')
      .update({ is_active: !campus.is_active })
      .eq('id', campus.id);
    if (error) return showToast(error.message, true);
    showToast(`${campus.campus_name} ${!campus.is_active ? 'activated' : 'deactivated'}.`);
    load();
  };

  const deleteCampus = async (campus) => {
    if (!window.confirm(`Delete "${campus.campus_name}"? All related data will also be removed.`)) return;
    const { error } = await supabaseAdmin.from('campuses').delete().eq('id', campus.id);
    if (error) return showToast(error.message, true);
    if (selectedId === campus.id) setSelectedId(null);
    showToast(`${campus.campus_name} deleted.`);
    closeModal();
    load();
  };

  const duplicateCampus = async (campus) => {
    const base = campus.campus_code || 'CMP';
    const payload = {
      campus_name: `${campus.campus_name} (Copy)`,
      campus_code: `${base}2`.slice(0, 6),
      is_active: false,
      ...(campus.logo_url ? { logo_url: campus.logo_url } : {}),
    };
    const { error } = await supabaseAdmin.from('campuses').insert(payload);
    if (error) return showToast(error.message, true);
    showToast('Campus duplicated.');
    load();
  };

  /* Course delete */
  const deleteCourse = async (row) => {
    if (!window.confirm(`Delete "${row.program.program_name}"?`)) return;
    const { error: pErr } = await supabaseAdmin.from('programs').delete().eq('id', row.program.id);
    if (pErr) return showToast(pErr.message, true);
    /* remove college if empty */
    const { count } = await supabaseAdmin
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .eq('college_id', row.college.id);
    if (!count) await supabaseAdmin.from('colleges').delete().eq('id', row.college.id);
    showToast('Course deleted.');
    load();
  };

  const contextItems = (campus) => [
    {
      icon: <Pencil size={13} />,
      label: 'Edit Campus',
      onClick: () => setModal({ type: 'campus', data: campus }),
    },
    {
      icon: <Copy size={13} />,
      label: 'Duplicate Campus',
      onClick: () => duplicateCampus(campus),
    },
    {
      icon: campus.is_active ? <Ban size={13} /> : <CheckCircle2 size={13} />,
      label: campus.is_active ? 'Disable Campus' : 'Enable Campus',
      onClick: () => toggleActive(campus),
    },
    { sep: true },
    {
      icon: <Trash2 size={13} />,
      label: 'Delete Campus',
      danger: true,
      onClick: () => deleteCampus(campus),
    },
  ];

  return (
    <div className="cmh">
      <style>{CSS}</style>

      {/* Page header */}
      <div className="cmh-page-header">
        <div className="cmh-page-title">Pampanga State University Campuses</div>
        <button
          className="cmh-btn-pill"
          onClick={() => setModal({ type: 'campus', data: null })}
        >
          <Plus size={14} /> Add Campus
        </button>
      </div>

      {/* Carousel */}
      <CampusCarousel
        campuses={campuses}
        selectedId={selectedId}
        onSelect={c => setSelectedId(c.id)}
        onContextMenu={(e, c) => setCtxMenu({ x: e.clientX, y: e.clientY, campus: c })}
      />

      {/* Context menu (right-click) */}
      <AnimatePresence>
        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={contextItems(ctxMenu.campus)}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Below carousel: empty or details + table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${BORDER}`, borderTopColor: MAR,
            animation: 'cmh-spin 0.8s linear infinite',
            display: 'inline-block',
          }} />
        </div>
      ) : !selectedCampus ? (
        <EmptyState />
      ) : (
        <>
          {/* Detail strip (campus name + Add Course button) */}
          <div className="cmh-detail-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div className="cmh-detail-name">{selectedCampus.campus_name}</div>
              <button
                className="cmh-btn-pill"
                onClick={() => setModal({ type: 'course', data: null, campusId: selectedCampus.id })}
              >
                <Plus size={13} /> Add Course
              </button>
            </div>
          </div>

          {/* Courses table */}
          <div className="cmh-table-wrap">
            <table className="cmh-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th>Course/Program</th>
                  <th>Program Code</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courseRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="cmh-table-empty">
                      No courses yet. Click "+ Add Course" to get started.
                    </td>
                  </tr>
                ) : courseRows.map(row => (
                  <tr key={row.program.id}>
                    <td>{row.college.college_name}</td>
                    <td style={{ fontWeight: 600 }}>{row.program.program_name}</td>
                    <td>
                      <span className="cmh-code-badge">{row.program.program_code}</span>
                    </td>
                    <td>
                      {row.program.created_at
                        ? new Date(row.program.created_at).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td>
                      <div className="cmh-row-actions">
                        <button
                          className="cmh-icon-btn"
                          title="Edit"
                          onClick={() => setModal({ type: 'course', data: row, campusId: selectedCampus.id })}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="cmh-icon-btn del"
                          title="Delete"
                          onClick={() => deleteCourse(row)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast.msg && <Toast msg={toast.msg} isErr={toast.isErr} />}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'campus' && (
          <CampusModal
            campus={modal.data}
            onClose={closeModal}
            onSaved={() => handleSaved(modal.data ? 'Campus saved.' : 'Campus added.')}
            onDelete={deleteCampus}
          />
        )}
        {modal?.type === 'course' && (
          <CourseModal
            campusId={modal.campusId}
            row={modal.data}
            onClose={closeModal}
            onSaved={() => handleSaved(modal.data ? 'Course saved.' : 'Course added.')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}