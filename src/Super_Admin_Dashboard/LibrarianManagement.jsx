import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, Plus, Pencil, Trash2, Search, X, Eye, EyeOff, Mail, Lock, User,
  Building2, ChevronLeft, ChevronRight, AlertTriangle, Check, ShieldCheck,
  Briefcase, GraduationCap, Hash, Landmark, BookOpen, Camera,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';

/* ── Empty-state illustration: soft halo, floating disc, blush people, gold "add" badge ── */
function UsersEmptyIcon({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="ue-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F5E4A8" stopOpacity="0.55" />
          <stop offset="60%"  stopColor="#F8DCDC" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFF8EF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ue-disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FBF1E8" />
        </linearGradient>
        <linearGradient id="ue-pink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F4BDBD" />
          <stop offset="100%" stopColor="#DE8E8E" />
        </linearGradient>
        <linearGradient id="ue-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#EFE5DB" />
          <stop offset="100%" stopColor="#DDD0C4" />
        </linearGradient>
        <linearGradient id="ue-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#E6C45A" />
          <stop offset="100%" stopColor="#B8912B" />
        </linearGradient>
        <clipPath id="ue-clip"><circle cx="48" cy="48" r="33" /></clipPath>
        <filter id="ue-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#7A0000" floodOpacity="0.14" />
        </filter>
        <filter id="ue-badge-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#5C0000" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* soft glow + faint dashed orbit */}
      <circle cx="48" cy="48" r="47" fill="url(#ue-halo)" />
      <circle cx="48" cy="48" r="42" stroke="#E3D3C4" strokeWidth="1" strokeDasharray="1.5 5" strokeLinecap="round" />

      {/* floating disc */}
      <circle cx="48" cy="48" r="33" fill="url(#ue-disc)" stroke="#E8DDD4" strokeWidth="1.5" filter="url(#ue-shadow)" />

      {/* people (clipped to the disc) */}
      <g clipPath="url(#ue-clip)">
        <circle cx="27" cy="42" r="6.4" fill="url(#ue-sand)" />
        <path d="M11 92V74C11 63 18 56 27 56C36 56 43 63 43 74V92Z" fill="url(#ue-sand)" />
        <circle cx="69" cy="42" r="6.4" fill="url(#ue-sand)" />
        <path d="M53 92V74C53 63 60 56 69 56C78 56 85 63 85 74V92Z" fill="url(#ue-sand)" />

        <path d="M31 92V70C31 58 38 49.5 48 49.5C58 49.5 65 58 65 70V92Z" fill="url(#ue-pink)" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="48" cy="37" r="9" fill="url(#ue-pink)" stroke="#FFFFFF" strokeWidth="2.5" />
        <ellipse cx="44.8" cy="33.6" rx="2.6" ry="1.7" fill="#FFFFFF" opacity="0.45" transform="rotate(-30 44.8 33.6)" />
      </g>

      {/* gold add badge */}
      <g filter="url(#ue-badge-shadow)">
        <circle cx="71" cy="71" r="10" fill="url(#ue-gold)" stroke="#FFFFFF" strokeWidth="3" />
      </g>
      <path d="M71 66.2v9.6M66.2 71h9.6" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />

      {/* sparkles */}
      <path d="M18 22l1.6 4.4L24 28l-4.4 1.6L18 34l-1.6-4.4L12 28l4.4-1.6z" fill="#D4AF37" opacity="0.85" />
      <path d="M79 17l1.1 3L83 21l-2.9 1.1L79 25l-1.1-2.9L75 21l2.9-1z" fill="#E5A0A0" opacity="0.9" />
      <circle cx="12" cy="64" r="1.6" fill="#E5A0A0" opacity="0.7" />
      <circle cx="86" cy="45" r="1.3" fill="#D4AF37" opacity="0.7" />
    </svg>
  );
}

/* ============================================================================
   LIBRASCAN — User Management (Librarians, Employees, Students)
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

const PAGE_SIZE = 10;

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
  .lbm-hero-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    border-radius: 24px 24px 0 0;
    background: linear-gradient(90deg, ${MAROON_DEEP}, ${MAROON}, ${GOLD}, ${MAROON}, ${MAROON_DEEP});
    background-size: 200% 100%;
    animation: lbm-shimmer-bar 3s ease-in-out infinite;
    z-index: 2;
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
  .lbm-hero-sub { font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED}; max-width: 450px; font-weight: 500; text-align: left; }
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
    position: relative;
    background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 16px; padding: 16px 18px 14px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(59,42,37,0.04);
    transition: transform 0.18s cubic-bezier(.22,1,.36,1), box-shadow 0.18s, border-color 0.18s;
    overflow: hidden;
  }
  .lbm-stat-card::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
    border-radius: 0 0 16px 16px;
    background: ${MAROON};
    opacity: 0.65;
  }
  .lbm-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 28px rgba(59,42,37,0.09);
    border-color: rgba(122,0,0,0.35);
  }
  .lbm-stat-icon {
    position: absolute; top: 12px; right: 12px;
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON};
    opacity: 0.18;
    pointer-events: none;
    transition: opacity 0.18s;
  }
  .lbm-stat-card:hover .lbm-stat-icon { opacity: 0.28; }
  .lbm-stat-label { font-size: 10.5px; font-weight: 800; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; position: relative; z-index: 1; }
  .lbm-stat-value { font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; color: ${TEXT}; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; position: relative; z-index: 1; }

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
  .lbm-table { width: 100%; border-collapse: collapse; min-width: 820px; }
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
  .lbm-table tbody tr { transition: background 0.14s; }
  .lbm-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  /* ── Unified table look: single row colour, maroon text, left aligned ── */
  .lbm-table thead th, .lbm-table tbody td { text-align: left !important; }
  .lbm-table tbody tr td { background: ${CARD}; color: ${MAROON}; }
  .lbm-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  .lbm-name-text, .lbm-email-text, .lbm-date-text, .lbm-id-text { color: ${MAROON} !important; }
  .lbm-campus-badge:not(.warn) { color: ${MAROON} !important; background: ${MAROON_SOFT} !important; border: none !important; }
  .lbm-row-actions { justify-content: flex-start !important; }
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

  .lbm-emptybar {
    height: 4px;
    background: linear-gradient(90deg, ${MAROON_DEEP}, ${MAROON}, ${GOLD}, ${MAROON}, ${MAROON_DEEP});
    background-size: 200% 100%;
    animation: lbm-shimmer-bar 3s ease-in-out infinite;
  }
  .lbm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 92px 24px; text-align: center; }
  .lbm-empty-illus {
    width: 96px; height: 96px; display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  .lbm-empty-title {
    font-family: 'Cinzel', var(--font-sans, serif);
    font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: ${MAROON}; margin-bottom: 8px;
  }
  .lbm-empty-sub { font-size: 12.5px; color: ${TEXT_MUTED}; max-width: 340px; line-height: 1.6; }

  /* Table wrap with no card chrome — the empty state sits directly on the
     page background, matching Books > Pending Requests. */
  .lbm-table-wrap.bare { background: transparent; border: none; box-shadow: none; border-radius: 0; }

  /* ---------- Modal ---------- */
  .lbm-overlay {
    position: fixed; inset: 0; background: rgba(59,42,37,0.45);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
  }
  .lbm-modal {
    background: ${BG}; border-radius: 22px; width: 620px; max-width: 100%;
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
  .lbm-modal-hdr-text { text-align: left; min-width: 0; }
  .lbm-modal-hdr-title { text-align: left; font-size: 15px; font-weight: 800; color: #fff; }
  .lbm-modal-hdr-sub { text-align: left; font-size: 11.5px; color: rgba(255,255,255,0.65); font-weight: 500; }
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
  @keyframes lbm-shimmer-bar {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ---------- Role badge, filters, role picker ---------- */
  .lbm-id-text { font-size: 12.5px; font-variant-numeric: tabular-nums; }
  .lbm-filter-select {
    flex: 0 1 220px; min-width: 160px; padding: 11px 36px 11px 14px; border-radius: 999px;
    border: 1.5px solid ${BORDER}; background-color: ${CARD}; color: ${TEXT};
    font-family: inherit; font-size: 13px; font-weight: 600; outline: none; cursor: pointer; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A0000' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
    transition: border-color 0.16s, box-shadow 0.16s;
  }
  .lbm-filter-select:focus { border-color: ${MAROON}; box-shadow: 0 0 0 4px ${MAROON_SOFT}; }

  .lbm-avatar { overflow: hidden; }
  .lbm-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .lbm-photo {
    display: flex; align-items: center; gap: 16px; margin-bottom: 18px;
    padding: 14px 16px; border-radius: 14px; background: ${CARD}; border: 1.5px dashed ${BORDER};
  }
  .lbm-photo-circle {
    flex: 0 0 auto; width: 76px; height: 76px; border-radius: 50%; overflow: hidden;
    background: linear-gradient(135deg, ${MAROON_MID}, ${MAROON_DEEP}); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 800;
    border: 3px solid ${GOLD}; box-shadow: 0 4px 12px rgba(59,42,37,0.18);
  }
  .lbm-photo-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .lbm-photo-body { min-width: 0; text-align: left; }
  .lbm-photo-title { font-size: 13px; font-weight: 800; color: ${MAROON}; }
  .lbm-photo-title .opt { font-weight: 500; color: ${TEXT_MUTED}; font-size: 11.5px; margin-left: 2px; }
  .lbm-photo-hint { font-size: 11.5px; color: ${TEXT_MUTED}; margin: 2px 0 9px; }
  .lbm-photo-btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .lbm-photo-btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px;
    border: 1.5px solid ${BORDER}; background: ${CARD}; color: ${MAROON};
    font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer;
    transition: border-color 0.14s, background 0.14s;
  }
  .lbm-photo-btn:hover { border-color: ${MAROON}; background: ${MAROON_SOFT}; }
  .lbm-photo-btn.danger { color: ${DANGER}; }
  .lbm-photo-btn.danger:hover { border-color: ${DANGER}; background: rgba(239,68,68,0.08); }

  .lbm-tabs { display: flex; gap: 28px; border-bottom: 1.5px solid ${BORDER}; margin-bottom: 18px; overflow-x: auto; }
  .lbm-tab {
    display: flex; align-items: center; gap: 7px; flex: 0 0 auto;
    padding: 0 0 11px; margin-bottom: -1.5px; cursor: pointer;
    font-family: inherit; font-size: 13.5px; font-weight: 700;
    border: none; border-bottom: 2.5px solid transparent;
    background: transparent; color: ${TEXT_MUTED}; transition: all 0.16s;
  }
  .lbm-tab:hover { color: ${MAROON}; }
  .lbm-tab.active { border-bottom-color: ${MAROON}; color: ${MAROON}; }

  .lbm-section {
    display: flex; align-items: center; gap: 10px;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
    color: ${MAROON}; margin: 4px 0 12px;
  }
  .lbm-section::after { content: ''; flex: 1; height: 1px; background: ${BORDER}; }
  .lbm-section .opt { font-weight: 500; text-transform: none; letter-spacing: 0; color: ${TEXT_MUTED}; margin-left: -4px; }
  .lbm-role-picker { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .lbm-role-opt {
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    padding: 14px 8px; border-radius: 14px; border: 1.5px solid ${BORDER};
    background: ${CARD}; color: ${TEXT_MUTED}; font-family: inherit; font-size: 12.5px; font-weight: 800;
    cursor: pointer; transition: border-color 0.14s, background 0.14s, color 0.14s, box-shadow 0.14s;
  }
  .lbm-role-opt:hover:not(:disabled) { border-color: ${MAROON}; color: ${MAROON}; }
  .lbm-role-opt.active { border-color: ${MAROON}; background: ${MAROON_SOFT}; color: ${MAROON}; box-shadow: 0 0 0 3px ${MAROON_SOFT}; }
  .lbm-role-opt:disabled { cursor: not-allowed; opacity: 0.45; }
  .lbm-role-opt.active:disabled { opacity: 1; }

  .lbm-field select {
    padding-right: 36px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A0000' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
  }
  .lbm-field input:disabled, .lbm-field select:disabled {
    background-color: ${CREAM}; opacity: 0.7; cursor: not-allowed; border-style: dashed;
  }

  @media (max-width: 768px) {
    .lbm-hero { padding: 26px 22px 22px; }
    .lbm-hero-title { font-size: 22px; }
    .lbm-hero-right { width: 100%; }
    .lbm-hero-right .lbm-btn-primary { width: 100%; justify-content: center; }
    .lbm-table .c-email, .lbm-table .c-added { display: none; }
  }
  @media (max-width: 560px) {
    .lbm-table .c-idx, .lbm-table .c-id, .lbm-table .c-campus { display: none; }
    .lbm-role-picker { gap: 8px; }
    .lbm-filter-select { flex: 1 1 100%; }
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

/* ── Account rules (mirrors the Admin portal's User Management) ─────────── */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
// Student / Employee numbers: digits only, at least 5.
const ID_NUMBER_REGEX = /^\d{5,}$/;
const EMAIL_REGEX     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Employees must use an official PSU email (exact domain match).
const PSU_DOMAIN      = '@pampangastateu.edu.ph';
const PSU_EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@pampangastateu\.edu\.ph$/i;

const ROLE_ORDER = ['library_manager', 'employee', 'student'];
const ROLE_META = {
  library_manager: { label: 'Librarian', plural: 'Librarians', Icon: ShieldCheck,   bg: MAROON_SOFT,               border: 'rgba(122,0,0,0.25)' },
  employee:        { label: 'Employee',  plural: 'Employees',  Icon: Briefcase,     bg: GOLD_PALE,                 border: 'rgba(212,175,55,0.45)' },
  student:         { label: 'Student',   plural: 'Students',   Icon: GraduationCap, bg: 'rgba(59,130,246,0.10)',   border: 'rgba(59,130,246,0.28)' },
};

// Which profiles column holds the ID number depends on the role (librarians have none).
const idColumnFor = (role) => (role === 'employee' ? 'employee_number' : role === 'student' ? 'student_number' : null);
const idLabelFor  = (role) => (role === 'employee' ? 'Employee Number' : 'Student Number');

// Students get college/program/major, employees get a department,
// librarians get neither. Fields that don't apply to the role are cleared.
function academicFields(f) {
  const isEmp = f.role === 'employee';
  const isStu = f.role === 'student';
  return {
    college_id:    isStu ? (f.college_id || null) : null,
    program_id:    isStu ? (f.program_id || null) : null,
    major_id:      isStu ? (f.major_id   || null) : null,
    department_id: isEmp ? (f.department_id || null) : null,
  };
}
function idFields(f) {
  const col = idColumnFor(f.role);
  const val = (f.id_number || '').trim();
  return col && val ? { [col]: val } : {};
}

// True when another profile already uses this Student/Employee Number.
async function checkIdNumberTaken(role, value) {
  const col = idColumnFor(role);
  const val = (value || '').trim();
  if (!col || !val) return false;
  const { data, error } = await supabaseAdmin.from('profiles').select('id').eq(col, val).maybeSingle();
  if (error) {
    console.error('[UserManagement] ID number uniqueness check failed:', error.message);
    return false;
  }
  return Boolean(data);
}

// Profile photos live in the 'avatars' bucket at <user-id>/avatar.<ext>
// (same convention as Settings), mirrored into profiles.avatar_url.
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function validateAvatarFile(file) {
  if (!file.type.startsWith('image/')) return 'Please select an image file (JPG, PNG, WebP).';
  if (file.size > AVATAR_MAX_BYTES)    return 'Image must be under 2 MB.';
  return '';
}

async function uploadAvatar(uid, file) {
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${uid}/avatar.${ext}`;
  // Clear older copies first so a previous extension (e.g. .png) never lingers.
  await removeAvatarFiles(uid);
  const { error: upErr } = await supabaseAdmin.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  const { error: dbErr } = await supabaseAdmin.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', uid);
  if (dbErr) throw dbErr;
  return url;
}

async function removeAvatarFiles(uid) {
  try {
    const { data: files } = await supabaseAdmin.storage.from('avatars').list(uid, { limit: 20 });
    const names = (files || []).filter(f => f.id && /^avatar\./i.test(f.name)).map(f => `${uid}/${f.name}`);
    if (names.length) await supabaseAdmin.storage.from('avatars').remove(names);
  } catch { /* nothing to remove */ }
}

async function removeAvatar(uid) {
  await removeAvatarFiles(uid);
  const { error } = await supabaseAdmin.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', uid);
  if (error) throw error;
}

/** Round avatar: the user's photo when there is one, otherwise their initials. */
function Avatar({ url, name, initials, size = 36 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [url]);
  const showImg = url && !broken;
  return (
    <div
      className="lbm-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.33), background: showImg ? '#fff' : avatarFor(name).bg }}
    >
      {showImg
        ? <img src={url} alt="" onError={() => setBroken(true)} />
        : (initials || '?')}
    </div>
  );
}

function ConfirmDialog({ user, onConfirm, onCancel }) {
  const role = (ROLE_META[user.role]?.label || 'user').toLowerCase();
  return (
    <div className="lbm-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="lbm-confirm">
        <div className="lbm-confirm-icon"><AlertTriangle size={24} /></div>
        <div className="lbm-confirm-title">Delete {role}?</div>
        <div className="lbm-confirm-msg">
          This will permanently delete <strong>{user.first_name} {user.last_name}</strong>'s profile and auth account. This action can't be undone.
        </div>
        <div className="lbm-confirm-btns">
          <button className="lbm-btn-cancel" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="lbm-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, opt, error, children }) {
  return (
    <div className="lbm-field">
      <label>{label}{opt && <span className="opt">{opt}</span>}</label>
      {children}
      {error && <div className="lbm-err">{error}</div>}
    </div>
  );
}

function UserModal({ user, users, campuses, defaultRole = 'student', onClose, onSaved }) {
  const isEdit = Boolean(user?.id);
  const [form, setForm] = useState({
    role:          user?.role || defaultRole,
    first_name:    user?.first_name || '',
    last_name:     user?.last_name  || '',
    email:         user?.email      || '',
    password:      '',
    id_number:     user?.student_number || user?.employee_number || '',
    campus_id:     user?.campus_id    || '',
    college_id:    user?.college_id   || '',
    program_id:    user?.program_id   || '',
    major_id:      user?.major_id     || '',
    department_id: user?.department_id || '',
  });
  const [errs,   setErrs]   = useState({});
  const [saving, setSave]   = useState(false);
  const [apiErr, setApi]    = useState('');
  const [showPw, setShowPw] = useState(false);

  // Profile photo: a newly picked file is previewed locally and only uploaded on save.
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.avatar_url || null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoErr,     setPhotoErr]     = useState('');
  const fileRef = useRef(null);
  useEffect(() => () => { if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const handlePhotoPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateAvatarFile(file);
    if (problem) { setPhotoErr(problem); return; }
    setPhotoErr('');
    setPhotoFile(file);
    setPhotoRemoved(false);
    setPhotoPreview(URL.createObjectURL(file));
  };
  const handlePhotoClear = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
    setPhotoErr('');
  };

  const [colleges,    setColleges]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs,    setPrograms]    = useState([]);
  const [majors,      setMajors]      = useState([]);
  const [lookupsLoaded,   setLookupsLoaded]   = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const isLib = form.role === 'library_manager';
  const isEmp = form.role === 'employee';
  const isStu = form.role === 'student';

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); };

  // Colleges and departments belong to a campus, so they follow the chosen campus.
  useEffect(() => {
    let alive = true;
    if (!form.campus_id) { setColleges([]); setDepartments([]); setLookupsLoaded(true); return undefined; }
    setLookupsLoaded(false);
    Promise.all([
      supabaseAdmin.from('colleges').select('id, college_name').eq('campus_id', form.campus_id).order('college_name'),
      supabaseAdmin.from('departments').select('id, department_name').eq('campus_id', form.campus_id).order('category').order('department_name'),
    ]).then(([col, dep]) => {
      if (!alive) return;
      setColleges((col?.data || []).map(c => ({ id: c.id, name: c.college_name })));
      setDepartments((dep?.data || []).map(d => ({ id: d.id, name: d.department_name })));
      setLookupsLoaded(true);
    }).catch(() => { if (alive) setLookupsLoaded(true); });
    return () => { alive = false; };
  }, [form.campus_id]);

  useEffect(() => {
    let alive = true;
    if (!form.college_id) { setPrograms([]); setLoadingPrograms(false); return undefined; }
    setLoadingPrograms(true);
    supabaseAdmin.from('programs').select('id, program_name').eq('college_id', form.college_id).order('program_name')
      .then(({ data }) => { if (alive) { setPrograms((data || []).map(p => ({ id: p.id, name: p.program_name }))); setLoadingPrograms(false); } });
    return () => { alive = false; };
  }, [form.college_id]);

  useEffect(() => {
    let alive = true;
    if (!form.program_id) { setMajors([]); return undefined; }
    supabaseAdmin.from('majors').select('id, major_name').eq('program_id', form.program_id).order('major_name')
      .then(({ data }) => { if (alive) setMajors((data || []).map(m => ({ id: m.id, name: m.major_name }))); });
    return () => { alive = false; };
  }, [form.program_id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  // Each role needs different credentials, so switching role clears the
  // fields that no longer apply (and their errors).
  const handleRoleChange = (role) => {
    if (isEdit || role === form.role) return;
    setForm(f => ({ ...f, role, id_number: '', college_id: '', program_id: '', major_id: '', department_id: '' }));
    setErrs({});
    setApi('');
  };
  const handleCampusChange = (v) => {
    setForm(f => ({ ...f, campus_id: v, college_id: '', program_id: '', major_id: '', department_id: '' }));
    setErrs(e => ({ ...e, campus_id: '', college_id: '', program_id: '', department_id: '' }));
  };
  const handleCollegeChange = (v) => {
    setForm(f => ({ ...f, college_id: v, program_id: '', major_id: '' }));
    setErrs(e => ({ ...e, college_id: '', program_id: '' }));
  };
  const handleProgramChange = (v) => {
    setForm(f => ({ ...f, program_id: v, major_id: '' }));
    setErrs(e => ({ ...e, program_id: '' }));
  };

  const normEmail = (e) => (e || '').trim().toLowerCase();

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required.';
    if (!form.last_name.trim())  e.last_name  = 'Last name is required.';
    if (!form.campus_id)         e.campus_id  = 'Campus assignment is required.';

    if (!isEdit) {
      const email = form.email.trim();
      if (!email)                                   e.email = 'Email is required.';
      else if (!EMAIL_REGEX.test(email))            e.email = 'Invalid email format.';
      else if (isEmp && !PSU_EMAIL_REGEX.test(email)) e.email = `Employees must use a ${PSU_DOMAIN} email address.`;
      else if (users.some(u => normEmail(u.email) === normEmail(email))) e.email = 'This email is already registered.';

      if (!form.password)                e.password = 'Password is required.';
      else if (form.password.length < 8) e.password = 'Minimum 8 characters.';

      if (isEmp || isStu) {
        const col = idColumnFor(form.role);
        const val = form.id_number.trim();
        if (!val)                                   e.id_number = `${idLabelFor(form.role)} is required.`;
        else if (!ID_NUMBER_REGEX.test(val))        e.id_number = 'Must be at least 5 digits (numbers only).';
        else if (users.some(u => (u[col] || '') === val)) e.id_number = `This ${idLabelFor(form.role)} is already registered.`;
      }
    } else if (form.password && form.password.length < 8) {
      e.password = 'Minimum 8 characters.';
    }

    // Academic info: required when creating, or when an edit moves the user
    // to a different campus (their old college/department no longer applies).
    const campusChanged = isEdit && form.campus_id !== user.campus_id;
    if (!isEdit || campusChanged) {
      if (isEmp && !form.department_id) e.department_id = 'Please select a department.';
      if (isStu) {
        if (!form.college_id) e.college_id = 'Please select a college.';
        if (!form.program_id) e.program_id = 'Please select a program.';
      }
    }
    return e;
  };

  const handleSave = async () => {
    setApi('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector('.lbm-modal-body .err')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
      return;
    }
    setSave(true);

    try {
      if (isEdit) {
        const { error: profileErr } = await supabaseAdmin.from('profiles').update({
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          campus_id:  form.campus_id,
          ...(isLib ? {} : academicFields(form)),
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
        if (profileErr) throw profileErr;

        if (form.password) {
          const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: form.password });
          if (pwErr) throw pwErr;
        }
        let photoWarn = '';
        try {
          if (photoFile)         await uploadAvatar(user.id, photoFile);
          else if (photoRemoved) await removeAvatar(user.id);
        } catch (pe) { photoWarn = ` The photo could not be saved (${pe.message}).`; }
        onSaved(`${ROLE_META[form.role].label} updated.${photoWarn}`, Boolean(photoWarn));
        return;
      }

      if (!isLib && await checkIdNumberTaken(form.role, form.id_number)) {
        setErrs(er => ({ ...er, id_number: `This ${idLabelFor(form.role)} is already registered.` }));
        return;
      }

      const email = form.email.trim().toLowerCase();
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: form.password,
        // Librarians can log in immediately. Employees and students confirm
        // by email first, exactly like the Admin portal / Sign Up flow.
        email_confirm: isLib,
        user_metadata: { first_name: form.first_name.trim(), last_name: form.last_name.trim(), role: form.role },
      });
      if (authErr) throw authErr;

      const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id:         authData.user.id,
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        email,
        role:       form.role,
        campus_id:  form.campus_id,
        ...idFields(form),
        ...academicFields(form),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (profileErr) {
        // Never leave an orphaned login without a profiles row.
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
        throw profileErr;
      }

      // Photo is optional; a failed upload never undoes the account.
      let photoWarn = '';
      if (photoFile) {
        try { await uploadAvatar(authData.user.id, photoFile); }
        catch (pe) { photoWarn = ` The photo could not be saved (${pe.message}) — add it by editing the user.`; }
      }

      if (isLib) {
        onSaved(`Librarian created and can log in immediately.${photoWarn}`, Boolean(photoWarn));
      } else {
        let emailSent = false;
        try {
          const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          emailSent = res.ok;
        } catch { /* server unreachable — handled below */ }
        if (emailSent) onSaved(`${ROLE_META[form.role].label} created. A confirmation email was sent to ${email}.${photoWarn}`, Boolean(photoWarn));
        else onSaved(`${ROLE_META[form.role].label} created, but the confirmation email could not be sent. They can tap "Resend" on the login page.${photoWarn}`, true);
      }
    } catch (err) {
      setApi(err.message || 'An error occurred.');
    } finally {
      setSave(false);
    }
  };

  const meta = ROLE_META[form.role];
  const campusPh = campuses.length ? 'Select campus to assign…' : 'No active campuses';
  const deptPh = !form.campus_id ? 'Select a campus first' : !lookupsLoaded ? 'Loading departments…' : departments.length ? 'Select department' : 'No departments available';
  const collegePh = !form.campus_id ? 'Select a campus first' : !lookupsLoaded ? 'Loading colleges…' : colleges.length ? 'Select college' : 'No colleges available';
  const programPh = !form.college_id ? 'Select a college first' : loadingPrograms ? 'Loading programs…' : programs.length ? 'Select program / course' : 'No programs available';

  return (
    <div className="lbm-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="lbm-modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit user' : 'Add user'}>
        <div className="lbm-modal-hdr">
          <div className="lbm-modal-hdr-text">
            <div className="lbm-modal-hdr-title">{isEdit ? `Edit ${meta.label}` : 'Add New User'}</div>
            <div className="lbm-modal-hdr-sub">{isEdit ? 'Update profile and campus assignment' : 'Choose a role, then fill in that role’s credentials'}</div>
          </div>
          <button className="lbm-modal-hdr-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="lbm-modal-body">
          {apiErr && <div className="lbm-api-err"><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{apiErr}</div>}

          <div className="lbm-section">Account Type{isEdit && <span className="opt"> (locked)</span>}</div>
          <div className="lbm-role-picker" role="radiogroup" aria-label="Account type">
            {ROLE_ORDER.map(r => {
              const m = ROLE_META[r];
              return (
                <button
                  key={r} type="button" role="radio" aria-checked={form.role === r}
                  className={`lbm-role-opt${form.role === r ? ' active' : ''}`}
                  disabled={isEdit && form.role !== r}
                  onClick={() => handleRoleChange(r)}
                >
                  <m.Icon size={20} />
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="lbm-section">Personal Details</div>
          {isEdit && (
            <div className="lbm-photo">
              <div className="lbm-photo-circle">
                {photoPreview
                  ? <img src={photoPreview} alt="Profile preview" />
                  : <span>{((form.first_name[0] || '') + (form.last_name[0] || '')).toUpperCase() || <User size={26} />}</span>}
              </div>
              <div className="lbm-photo-body">
                <div className="lbm-photo-title">Profile Photo <span className="opt">(optional)</span></div>
                <div className="lbm-photo-hint">JPG, PNG or WebP, up to 2 MB.</div>
                <div className="lbm-photo-btns">
                  <button type="button" className="lbm-photo-btn" onClick={() => fileRef.current?.click()}>
                    <Camera size={13} /> {photoPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  {photoPreview && (
                    <button type="button" className="lbm-photo-btn danger" onClick={handlePhotoClear}>
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
                {photoErr && <div className="lbm-err">{photoErr}</div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoPick} />
            </div>
          )}
          <div className="lbm-field-row">
            <Field label="First Name" error={errs.first_name}>
              <div className="lbm-input-wrap">
                <input className={errs.first_name ? 'err' : ''} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
                <User size={15} className="lbm-field-icon" />
              </div>
            </Field>
            <Field label="Last Name" error={errs.last_name}>
              <div className="lbm-input-wrap">
                <input className={errs.last_name ? 'err' : ''} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
                <User size={15} className="lbm-field-icon" />
              </div>
            </Field>
          </div>

          <div className="lbm-section">Login Credentials</div>
          <Field label="Email Address" opt={isEdit ? '(locked)' : ''} error={errs.email}>
            <div className="lbm-input-wrap">
              <input
                className={errs.email ? 'err' : ''} type="email" value={form.email} disabled={isEdit}
                onChange={e => set('email', e.target.value)} autoComplete="off"
                placeholder={isEdit ? '—' : isEmp ? `yourname${PSU_DOMAIN}` : isLib ? `librarian${PSU_DOMAIN}` : `2023929321${PSU_DOMAIN}`}
              />
              <Mail size={15} className="lbm-field-icon" />
            </div>
          </Field>

          {(isEmp || isStu) && (
            <Field label={idLabelFor(form.role)} opt={isEdit ? '(locked)' : ''} error={errs.id_number}>
              <div className="lbm-input-wrap">
                <input
                  className={errs.id_number ? 'err' : ''} inputMode="numeric" value={form.id_number} disabled={isEdit}
                  onChange={e => set('id_number', e.target.value.replace(/\D/g, ''))}
                  placeholder={isEdit ? '—' : 'e.g. 2023929321'} autoComplete="off"
                />
                <Hash size={15} className="lbm-field-icon" />
              </div>
            </Field>
          )}

          <Field label={isEdit ? 'New Password' : 'Password'} opt={isEdit ? '(leave blank to keep current)' : ''} error={errs.password}>
            <div className="lbm-input-wrap">
              <input
                className={errs.password ? 'err' : ''}
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Minimum 8 characters'}
                autoComplete="new-password"
                style={{ paddingRight: 40 }}
              />
              <Lock size={15} className="lbm-field-icon" />
              <button type="button" className="lbm-pw-toggle" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <div className="lbm-section">{isLib ? 'Campus Assignment' : 'Campus & Academic Information'}</div>
          <Field label="Assigned Campus" error={errs.campus_id}>
            <div className="lbm-input-wrap">
              <select className={errs.campus_id ? 'err' : ''} value={form.campus_id} onChange={e => handleCampusChange(e.target.value)}>
                <option value="">{campusPh}</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.campus_name}</option>)}
              </select>
              <Building2 size={15} className="lbm-field-icon" />
            </div>
          </Field>

          {isEmp && (
            <Field label="Department" error={errs.department_id}>
              <div className="lbm-input-wrap">
                <select
                  className={errs.department_id ? 'err' : ''} value={form.department_id}
                  disabled={!form.campus_id || !lookupsLoaded || departments.length === 0}
                  onChange={e => set('department_id', e.target.value)}
                >
                  <option value="">{deptPh}</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Landmark size={15} className="lbm-field-icon" />
              </div>
            </Field>
          )}

          {isStu && (
            <>
              <div className="lbm-field-row">
                <Field label="College" error={errs.college_id}>
                  <div className="lbm-input-wrap">
                    <select
                      className={errs.college_id ? 'err' : ''} value={form.college_id}
                      disabled={!form.campus_id || !lookupsLoaded || colleges.length === 0}
                      onChange={e => handleCollegeChange(e.target.value)}
                    >
                      <option value="">{collegePh}</option>
                      {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <Landmark size={15} className="lbm-field-icon" />
                  </div>
                </Field>
                <Field label="Program / Course" error={errs.program_id}>
                  <div className="lbm-input-wrap">
                    <select
                      className={errs.program_id ? 'err' : ''} value={form.program_id}
                      disabled={!form.college_id || loadingPrograms || programs.length === 0}
                      onChange={e => handleProgramChange(e.target.value)}
                    >
                      <option value="">{programPh}</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <BookOpen size={15} className="lbm-field-icon" />
                  </div>
                </Field>
              </div>
              {form.program_id && majors.length > 0 && (
                <Field label="Major" opt="(optional)">
                  <div className="lbm-input-wrap">
                    <select value={form.major_id} onChange={e => set('major_id', e.target.value)}>
                      <option value="">Select major</option>
                      {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <GraduationCap size={15} className="lbm-field-icon" />
                  </div>
                </Field>
              )}
            </>
          )}

          <div className="lbm-note">
            {isEdit
              ? 'Role, email and ID number are locked. Changing the campus takes effect on their next login.'
              : isLib
                ? 'Librarian accounts manage one campus’s library. The email is pre-confirmed, so they can log in immediately.'
                : `${meta.label} accounts need an email confirmation. A confirmation link is sent to the address above before they can log in.`}
          </div>

          <div className="lbm-modal-footer">
            <button className="lbm-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="lbm-btn-submit" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? <><Check size={16} /> Save Changes</> : <><Plus size={16} /> Create {meta.label}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users,      setUsers]      = useState([]);
  const [campuses,   setCampuses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast,      setToast]      = useState({ msg: '', isErr: false });
  const [search,     setSearch]     = useState('');
  const [roleFilter,   setRoleFilter]   = useState('library_manager');
  const [campusFilter, setCampusFilter] = useState('all');
  const [page,       setPage]       = useState(1);

  const showToast = (msg, isErr = false) => { setToast({ msg, isErr }); setTimeout(() => setToast({ msg: '', isErr: false }), 4500); };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cData }, { data: uData, error: uErr }] = await Promise.all([
      supabaseAdmin.from('campuses').select('id, campus_name, is_active').order('campus_name'),
      supabaseAdmin.from('profiles')
        .select('id, first_name, last_name, email, role, campus_id, student_number, employee_number, avatar_url, college_id, program_id, major_id, department_id, created_at, updated_at')
        .in('role', ROLE_ORDER)
        .order('first_name')
        .range(0, 4999),
    ]);
    if (uErr) console.error('[UserManagement] load error:', uErr.message);
    setCampuses(cData || []);
    setUsers(uData || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (msg, isErr = false) => {
    setModal(null);
    setAvatarMap({});
    showToast(msg, isErr);
    load();
  };

  const confirmDelete = async () => {
    const u = confirmDel;
    setConfirmDel(null);
    try {
      const { error: profileErr } = await supabaseAdmin.from('profiles').delete().eq('id', u.id);
      if (profileErr) throw profileErr;
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (authErr) throw authErr;
      showToast(`${ROLE_META[u.role]?.label || 'User'} deleted.`);
      load();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const campusName = (id) => campuses.find(c => c.id === id)?.campus_name || null;
  const activeCampuses = useMemo(() => campuses.filter(c => c.is_active), [campuses]);

  const counts = useMemo(() => ({
    all:             users.length,
    library_manager: users.filter(u => u.role === 'library_manager').length,
    employee:        users.filter(u => u.role === 'employee').length,
    student:         users.filter(u => u.role === 'student').length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u =>
      u.role === roleFilter &&
      (campusFilter === 'all' || u.campus_id === campusFilter) &&
      (!q || [u.first_name, u.last_name, u.email, u.student_number, u.employee_number].filter(Boolean).join(' ').toLowerCase().includes(q))
    );
  }, [users, search, roleFilter, campusFilter]);

  useEffect(() => { setPage(1); }, [search, roleFilter, campusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Some accounts have a photo in the 'avatars' bucket but an empty
  // profiles.avatar_url. For the rows on screen only, rebuild the public URL
  // so those photos still show (display-only, nothing is written back).
  const [avatarMap, setAvatarMap] = useState({});
  useEffect(() => {
    let alive = true;
    const missing = paged.filter(u => !u.avatar_url && !(u.id in avatarMap));
    if (!missing.length) return undefined;
    (async () => {
      const found = {};
      await Promise.all(missing.map(async (u) => {
        found[u.id] = null;
        try {
          const { data: files } = await supabaseAdmin.storage.from('avatars').list(u.id, { limit: 5, sortBy: { column: 'updated_at', order: 'desc' } });
          const f = (files || []).find(x => x.id && /^avatar\./i.test(x.name));
          if (f) {
            const { data: pub } = supabaseAdmin.storage.from('avatars').getPublicUrl(`${u.id}/${f.name}`);
            if (pub?.publicUrl) found[u.id] = `${pub.publicUrl}?t=${new Date(f.updated_at || Date.now()).getTime()}`;
          }
        } catch { /* leave initials */ }
      }));
      if (alive) setAvatarMap(m => ({ ...m, ...found }));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged]);
  const filtersActive = Boolean(search) || campusFilter !== 'all';
  const showId = roleFilter !== 'library_manager';
  const roleMeta = ROLE_META[roleFilter];

  const STATS = [
    { label: 'Total Users', value: counts.all,             Icon: Users },
    { label: 'Librarians',  value: counts.library_manager, Icon: ShieldCheck },
    { label: 'Employees',   value: counts.employee,        Icon: Briefcase },
    { label: 'Students',    value: counts.student,         Icon: GraduationCap },
  ];

  return (
    <div className="lbm">
      <style>{CSS}</style>
      <Toast msg={toast.msg} isErr={toast.isErr} />

      {/* Hero */}
      <div className="lbm-hero">
        <div className="lbm-hero-bar" />
        <div className="lbm-hero-left">
          <div className="lbm-hero-title">
            User Management
          </div>
          <div className="lbm-hero-sub">
            Create and manage librarian, employee and student accounts, and assign every user to a campus in the LIBRASCAN network.
          </div>
        </div>
        <div className="lbm-hero-right">
          <button className="lbm-btn-primary" onClick={() => setModal('add')}>
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="lbm-stats-grid">
        {STATS.map(({ label, value, Icon }) => (
          <div key={label} className="lbm-stat-card">
            <div className="lbm-stat-icon"><Icon size={34} strokeWidth={1.6} /></div>
            <div><div className="lbm-stat-label">{label}</div><div className="lbm-stat-value">{loading ? '—' : value}</div></div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="lbm-toolbar">
        <div className="lbm-search">
          <Search size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${roleMeta.plural.toLowerCase()} by name, email${showId ? ' or ID number' : ''}...`} aria-label="Search users" />
        </div>
        <select className="lbm-filter-select" value={campusFilter} onChange={e => setCampusFilter(e.target.value)} aria-label="Filter by campus">
          <option value="all">All campuses</option>
          {campuses.map(c => <option key={c.id} value={c.id}>{c.campus_name}</option>)}
        </select>
      </div>

      <div className="lbm-tabs" role="tablist" aria-label="User type">
        {ROLE_ORDER.map(r => {
          const m = ROLE_META[r];
          return (
            <button
              key={r} role="tab" aria-selected={roleFilter === r}
              className={`lbm-tab${roleFilter === r ? ' active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              <m.Icon size={15} /> {m.plural}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className={`lbm-table-wrap${!loading && filtered.length === 0 ? ' bare' : ''}`}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: `3px solid ${BORDER}`, borderTopColor: MAROON, animation: 'lbm-spin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="lbm-empty">
            <div className="lbm-empty-illus"><UsersEmptyIcon size={96} /></div>
            <div className="lbm-empty-title">
              {filtersActive ? `No matching ${roleMeta.plural.toLowerCase()}` : `No ${roleMeta.plural.toLowerCase()} yet`}
            </div>
            <div className="lbm-empty-sub">
              {filtersActive
                ? 'Try a different search term or clear filters.'
                : `${roleMeta.plural} added by the Super Admin will appear here. Click "Add User" to create the first account.`}
            </div>
          </div>
        ) : (
          <>
            <div className="lbm-table-scroll">
              <table className="lbm-table">
                <thead>
                  <tr>
                    <th className="c-idx">#</th>
                    <th>{roleMeta.label}</th>
                    {showId && <th className="c-id">{idLabelFor(roleFilter)}</th>}
                    <th className="c-email">Email</th>
                    <th className="c-campus">Campus</th>
                    <th className="c-added">Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((u, i) => {
                    const initials = ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase();
                    const cName = campusName(u.campus_id);
                    return (
                      <tr key={u.id}>
                        <td className="c-idx" style={{ color: MAROON, fontSize: 12 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td>
                          <div className="lbm-name-cell">
                            <Avatar url={avatarMap[u.id] || u.avatar_url} name={(u.first_name || '') + (u.last_name || '')} initials={initials} />
                            <span className="lbm-name-text">{u.first_name} {u.last_name}</span>
                          </div>
                        </td>
                        {showId && <td className="c-id lbm-id-text">{u.student_number || u.employee_number || '—'}</td>}
                        <td className="c-email lbm-email-text">{u.email || '—'}</td>
                        <td className="c-campus">
                          {cName
                            ? <span className="lbm-campus-badge">{cName}</span>
                            : <span className="lbm-campus-badge warn"><AlertTriangle size={11} /> Unassigned</span>}
                        </td>
                        <td className="c-added lbm-date-text">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <div className="lbm-row-actions">
                            <button className="lbm-icon-btn edit" title="Edit" onClick={() => setModal(u)}><Pencil size={14} /></button>
                            <button className="lbm-icon-btn del" title="Delete" onClick={() => setConfirmDel(u)}><Trash2 size={14} /></button>
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
        <UserModal
          user={modal === 'add' ? null : modal}
          users={users}
          defaultRole={roleFilter}
          campuses={
            modal !== 'add' && modal.campus_id && !activeCampuses.some(c => c.id === modal.campus_id)
              ? [...activeCampuses, campuses.find(c => c.id === modal.campus_id)].filter(Boolean)
              : activeCampuses
          }
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          user={confirmDel}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}