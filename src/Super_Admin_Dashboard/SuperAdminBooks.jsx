import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Library, PackageCheck, PackageX, Search, ChevronLeft, ChevronRight,
  Building2, X, Hash, MapPin, User, Layers, Clock, Check, Ban,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';

/* ── Analog clock illustration (matches the "Nothing Pending" reference) ── */
function AnalogClockIcon({ size = 64 }) {
  const ticks = Array.from({ length: 12 }, (_, i) => (
    <line
      key={i}
      x1="32" y1="6" x2="32" y2="9.5"
      stroke="#D8CFC6" strokeWidth="1.4" strokeLinecap="round"
      transform={`rotate(${i * 30} 32 32)`}
    />
  ));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="27" fill="#FFFFFF" stroke="#C7BEB6" strokeWidth="2" />
      {ticks}
      <line x1="32" y1="32" x2="32" y2="20" stroke="#E5A0A0" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="32" y1="32" x2="24" y2="38" stroke="#E5A0A0" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="2" fill="#C98E8E" />
    </svg>
  );
}

/* ============================================================================
   LIBRASCAN — Super Admin · Books
   Read-only, cross-campus book catalog view. Shares the exact visual language
   of Super Admin Overview (cream/white surfaces, maroon + gold accents, same
   hero / stat-card / table treatments) so it reads as the same product.
   Editing/adding books stays campus-scoped inside each Librarian's own
   Book Catalog — this page is the Super Admin's system-wide window into it.
============================================================================ */

/* ── Design tokens (identical to Super Admin Overview) ──────────────────── */
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
const ORANGE      = '#F97316';

const PAGE_SIZE = 10;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap');

  .sab, .sab * { box-sizing: border-box; }
  .sab {
    font-family: var(--font-sans,'DM Sans','Josefin Sans',sans-serif);
    color: ${TEXT};
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Hero ---------- */
  .sab-hero {
    position: relative;
    background: linear-gradient(135deg, ${CREAM} 0%, ${CARD} 100%);
    border: 1.5px solid ${BORDER};
    border-radius: 24px;
    padding: 32px 32px 28px;
    margin-bottom: 24px;
    overflow: hidden;
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px; flex-wrap: wrap;
    box-shadow: 0 10px 30px rgba(59,42,37,0.08);
  }
  .sab-hero-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    border-radius: 24px 24px 0 0;
    background: linear-gradient(90deg, ${MAROON_DEEP}, ${MAROON}, ${GOLD}, ${MAROON}, ${MAROON_DEEP});
    background-size: 200% 100%;
    animation: sab-shimmer-bar 3s ease-in-out infinite;
    z-index: 2;
  }
  .sab-hero::before {
    content: ''; position: absolute; top: -60%; right: -8%;
    width: 420px; height: 420px; border-radius: 50%;
    background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%);
    pointer-events: none;
  }
  .sab-hero::after {
    content: ''; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(122,0,0,0.05) 1px, transparent 1px);
    background-size: 22px 22px; opacity: 0.6; pointer-events: none;
  }
  .sab-hero-left { position: relative; z-index: 1; max-width: 640px; }
  .sab-hero-title {
    font-size: 25px; font-weight: 800; letter-spacing: -0.01em;
    color: ${TEXT}; line-height: 1.2; margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .sab-hero-icon {
    width: 42px; height: 42px; border-radius: 14px;
    background: ${MAROON_SOFT}; border: 1px solid rgba(122,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON}; flex-shrink: 0;
  }
  .sab-hero-sub { font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED}; max-width: 500px; font-weight: 500; text-align: left; }
  .sab-hero-right { position: relative; z-index: 1; }
  .sab-hero-badge {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 84px; height: 84px; border-radius: 18px; gap: 2px;
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    border: 1.5px solid rgba(212,175,55,0.35);
    box-shadow: 0 10px 24px rgba(122,0,0,0.28); color: #fff;
  }
  .sab-hero-badge b { font-size: 22px; font-weight: 800; line-height: 1; }
  .sab-hero-badge span { font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; color: ${GOLD}; text-transform: uppercase; text-align: center; }

  /* ---------- Stat cards ---------- */
  .sab-stats-grid {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 16px; margin-bottom: 24px;
  }
  @keyframes sab-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes sab-shimmer-bar {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .sab-stat-card {
    position: relative;
    background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 16px;
    padding: 16px 18px 16px 16px; overflow: hidden;
    display: flex; align-items: center; gap: 14px; text-align: left;
    transition: transform 0.18s cubic-bezier(.22,1,.36,1), box-shadow 0.18s, border-color 0.18s;
    animation: sab-rise 0.45s cubic-bezier(.22,1,.36,1) both;
  }
  .sab-stats-grid .sab-stat-card:nth-child(1) { animation-delay: 0.02s; }
  .sab-stats-grid .sab-stat-card:nth-child(2) { animation-delay: 0.06s; }
  .sab-stats-grid .sab-stat-card:nth-child(3) { animation-delay: 0.10s; }
  .sab-stats-grid .sab-stat-card:nth-child(4) { animation-delay: 0.14s; }
  .sab-stats-grid .sab-stat-card:nth-child(5) { animation-delay: 0.18s; }
  .sab-stat-card::before {
    content: ''; position: absolute; top: 10px; bottom: 10px; left: 0; width: 3px;
    border-radius: 0 3px 3px 0; background: var(--accent-grad); opacity: 0.9;
  }
  .sab-stat-card::after {
    content: ''; position: absolute; top: -35%; right: -20%;
    width: 100px; height: 100px; border-radius: 50%;
    background: var(--accent-glow); opacity: 0.5; pointer-events: none;
  }
  .sab-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 28px rgba(59,42,37,0.09);
    border-color: var(--accent-border);
  }
  .sab-stat-icon {
    width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--accent-soft); color: var(--accent-fg);
    box-shadow: inset 0 0 0 1px var(--accent-border);
    position: relative; z-index: 1;
  }
  .sab-stat-body { min-width: 0; position: relative; z-index: 1; flex: 1; }
  .sab-stat-value { font-size: 23px; font-weight: 800; color: ${TEXT}; line-height: 1.1; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .sab-stat-label { font-size: 10.5px; font-weight: 800; color: ${TEXT}; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  .sab-stat-sub { font-size: 10.5px; color: ${TEXT_MUTED}; margin-top: 2px; font-weight: 500; }
  .sab-stat-bar-track {
    position: relative; z-index: 1; height: 4px; border-radius: 999px;
    background: ${CREAM}; overflow: hidden; margin-top: 6px;
  }
  .sab-stat-bar-fill { height: 100%; border-radius: 999px; background: var(--accent-grad); transition: width 0.4s ease; }

  /* ---------- Section head ---------- */
  .sab-selector-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .sab-selector-title {
    font-size: 13px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    color: ${TEXT_MUTED}; display: flex; align-items: center; gap: 8px;
  }
  .sab-selector-title svg { color: ${MAROON}; }
  .sab-selector-caption { font-size: 12px; color: ${TEXT_MUTED}; font-weight: 500; }

  /* ---------- Per-campus chip strip ---------- */
  .sab-campus-strip {
    display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 14px; margin-bottom: 6px;
    scrollbar-width: thin; scrollbar-color: ${GOLD} transparent;
  }
  .sab-campus-strip::-webkit-scrollbar { height: 6px; }
  .sab-campus-strip::-webkit-scrollbar-track { background: transparent; }
  .sab-campus-strip::-webkit-scrollbar-thumb {
    background: linear-gradient(90deg, ${GOLD}, ${GOLD_DEEP});
    border-radius: 999px;
  }
  .sab-campus-strip::-webkit-scrollbar-thumb:hover { background: ${GOLD_DEEP}; }
  .sab-campus-chip {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
    padding: 9px 14px; border-radius: 999px; cursor: pointer;
    background: ${CARD}; border: 1.5px solid ${BORDER}; color: ${TEXT};
    font-size: 12px; font-weight: 700; white-space: nowrap;
    transition: all 0.15s;
  }
  .sab-campus-chip:hover { border-color: rgba(122,0,0,0.35); }
  .sab-campus-chip.active {
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    border-color: ${MAROON}; color: #fff;
    box-shadow: 0 6px 16px rgba(122,0,0,0.25);
  }
  .sab-campus-chip .cnt {
    font-size: 10.5px; font-weight: 800; padding: 1px 7px; border-radius: 999px;
    background: ${GOLD_PALE}; color: ${GOLD_DEEP};
  }
  .sab-campus-chip.active .cnt { background: rgba(255,255,255,0.18); color: #fff; }

  /* ---------- Toolbar ---------- */
  .sab-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .sab-search { flex: 1 1 260px; min-width: 200px; position: relative; }
  .sab-search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: ${TEXT_MUTED}; pointer-events: none; }
  .sab-search input {
    width: 100%; padding: 11px 14px 11px 40px; border-radius: 999px;
    border: 1.5px solid ${BORDER}; background: ${CARD};
    font-family: inherit; font-size: 13px; color: ${TEXT}; outline: none;
    transition: border-color 0.16s, box-shadow 0.16s;
  }
  .sab-search input:focus { border-color: ${MAROON}; box-shadow: 0 0 0 4px ${MAROON_SOFT}; }
  .sab-search input::placeholder { color: rgba(58,42,37,0.35); }
  .sab-select {
    padding: 10px 14px; border-radius: 999px; border: 1.5px solid ${BORDER};
    background: ${CARD}; font-family: inherit; font-size: 12.5px; font-weight: 600;
    color: ${TEXT}; outline: none; cursor: pointer;
  }
  .sab-select:focus { border-color: ${MAROON}; }

  /* ---------- Table ---------- */
  .sab-table-wrap { background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 10px rgba(59,42,37,0.04); }
  .sab-table-scroll { overflow-x: auto; }
  .sab-table { width: 100%; border-collapse: collapse; min-width: 780px; }
  .sab-table thead th {
    text-align: left; font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
    color: rgba(255,248,239,0.92);
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    padding: 15px 18px; white-space: nowrap;
  }
  .sab-table thead th:first-child { border-top-left-radius: 18px; }
  .sab-table thead th:last-child { border-top-right-radius: 18px; }
  .sab-table tbody td { padding: 12px 18px; font-size: 13px; color: ${TEXT}; border-bottom: 1px solid ${BORDER}; vertical-align: middle; }
  .sab-table tbody tr:last-child td { border-bottom: none; }
  .sab-table tbody tr:nth-child(even) td { background: ${CREAM}; }
  .sab-table tbody tr { transition: background 0.14s; cursor: pointer; }
  .sab-table tbody tr:hover td { background: ${MAROON_SOFT}; }

  .sab-book-cell { display: flex; align-items: center; gap: 10px; max-width: 260px; }
  .sab-book-cover {
    width: 30px; height: 38px; border-radius: 4px; flex-shrink: 0; object-fit: cover;
    border: 1px solid ${BORDER};
  }
  .sab-book-cover-fallback {
    width: 30px; height: 38px; border-radius: 4px; flex-shrink: 0;
    background: linear-gradient(135deg, ${MAROON_SOFT}, ${GOLD_PALE});
    display: flex; align-items: center; justify-content: center; color: ${MAROON};
  }
  .sab-book-title { font-weight: 800; color: ${TEXT}; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sab-book-author { font-size: 11px; color: ${TEXT_MUTED}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .sab-code-badge {
    display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.02em;
    border-radius: 999px; padding: 4px 12px; background: ${GOLD_PALE}; color: ${GOLD_DEEP}; white-space: nowrap;
  }
  .sab-genre-badge {
    display: inline-block; font-size: 10.5px; font-weight: 700; border-radius: 999px;
    padding: 3px 10px; background: rgba(59,130,246,0.10); color: ${BLUE}; white-space: nowrap;
  }
  .sab-copies { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .sab-copies span { font-size: 11px; font-weight: 500; color: ${TEXT_MUTED}; }
  .sab-status-row { display: flex; align-items: center; gap: 6px; }
  .sab-status-dot { width: 7px; height: 7px; border-radius: 50%; background: ${SUCCESS}; box-shadow: 0 0 0 3px rgba(34,197,94,0.16); flex-shrink: 0; }
  .sab-status-dot.off { background: ${DANGER}; box-shadow: 0 0 0 3px rgba(239,68,68,0.16); }
  .sab-status-label { font-size: 12px; font-weight: 700; }

  .sab-pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-top: 1px solid ${BORDER}; background: ${CREAM}; }
  .sab-pagination-info { font-size: 12px; color: ${TEXT_MUTED}; font-weight: 600; }
  .sab-pagination-btns { display: flex; gap: 6px; }
  .sab-page-btn {
    width: 30px; height: 30px; border-radius: 9px; border: 1px solid ${BORDER};
    background: ${CARD}; color: ${TEXT}; font-size: 12px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .sab-page-btn:hover:not(:disabled) { background: ${MAROON}; color: #fff; border-color: ${MAROON}; }
  .sab-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .sab-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 92px 24px; text-align: center; }
  .sab-empty-illus {
    width: 72px; height: 72px; border-radius: 50%; background: ${CARD};
    border: 1.5px solid ${BORDER}; display: flex; align-items: center; justify-content: center;
    color: rgba(122,0,0,0.28); margin-bottom: 20px;
  }
  .sab-empty-illus.plain { background: transparent; border: none; }
  .sab-empty-title {
    font-family: 'Cinzel', var(--font-sans, serif);
    font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: ${MAROON}; margin-bottom: 8px;
  }
  .sab-empty-sub { font-size: 12.5px; color: ${TEXT_MUTED}; max-width: 340px; line-height: 1.6; }

  /* Table wrap variant with no card chrome — used behind the empty states so
     they sit directly on the page background, matching the reference. */
  .sab-table-wrap.bare { background: transparent; border: none; box-shadow: none; border-radius: 0; }

  /* ---------- Skeletons ---------- */
  @keyframes sab-shimmer-sweep { 100% { transform: translateX(100%); } }
  .sab-shimmer { position: relative; overflow: hidden; background: ${BORDER}; border-radius: 12px; }
  .sab-shimmer::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    transform: translateX(-100%); animation: sab-shimmer-sweep 1.4s infinite;
  }
  .sab-skel-hero { height: 148px; border-radius: 24px; margin-bottom: 24px; }
  .sab-skel-stat { height: 82px; border-radius: 16px; }
  .sab-skel-table { height: 320px; border-radius: 18px; }

  /* ---------- View modal ---------- */
  .sab-modal-overlay {
    position: fixed; inset: 0; background: rgba(20,0,0,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: flex-start; justify-content: center; z-index: 1000;
    padding: 40px 16px; overflow-y: auto;
  }
  .sab-modal {
    background: ${CARD}; border-radius: 18px; border: 1px solid rgba(139,0,0,0.20);
    box-shadow: 0 20px 60px rgba(30,0,0,0.38); width: 100%; max-width: 560px;
    animation: sab-fade-in 0.22s ease;
  }
  @keyframes sab-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .sab-modal-head {
    display: flex; align-items: flex-start; gap: 16px; padding: 22px 24px;
    background: linear-gradient(135deg, ${MAROON_DEEP}, ${MAROON_MID});
    border-radius: 18px 18px 0 0; position: relative;
  }
  .sab-modal-close {
    position: absolute; top: 16px; right: 16px; width: 30px; height: 30px; border-radius: 50%;
    background: rgba(245,228,168,0.10); border: 1px solid rgba(245,228,168,0.18);
    color: rgba(245,228,168,0.80); display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.18s;
  }
  .sab-modal-close:hover { background: rgba(245,228,168,0.22); color: #F5E4A8; }
  .sab-modal-cover { width: 60px; height: 78px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0; }
  .sab-modal-cover-fallback {
    width: 60px; height: 78px; border-radius: 6px; flex-shrink: 0;
    background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; color: #F5E4A8;
  }
  .sab-modal-title { font-size: 16.5px; font-weight: 800; color: #fff; line-height: 1.3; padding-right: 30px; }
  .sab-modal-author { font-size: 12.5px; color: rgba(245,228,168,0.75); margin-top: 4px; }
  .sab-modal-body { padding: 20px 24px 24px; }
  .sab-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
  .sab-modal-field { display: flex; flex-direction: column; gap: 4px; }
  .sab-modal-field-label { font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: ${TEXT_MUTED}; display: flex; align-items: center; gap: 5px; }
  .sab-modal-field-label svg { color: ${MAROON}; }
  .sab-modal-field-value { font-size: 13px; font-weight: 600; color: ${TEXT}; }

  /* ---------- Tabs (Book / Pending Requests) ---------- */
  .sab-tabs { display: flex; flex: 1; gap: 28px; border-bottom: 1.5px solid ${BORDER}; }
  .sab-tab {
    display: flex; align-items: center; gap: 7px;
    padding: 0 0 11px; margin-bottom: -1.5px; cursor: pointer;
    font-family: inherit; font-size: 13.5px; font-weight: 700;
    border: none; border-bottom: 2.5px solid transparent;
    background: transparent; color: ${TEXT_MUTED};
    transition: all 0.16s;
  }
  .sab-tab:hover { color: ${MAROON}; }
  .sab-tab.active {
    border-bottom-color: ${MAROON}; color: ${MAROON};
  }
  .sab-tab-count {
    min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800;
    background: rgba(122,0,0,0.12); color: ${MAROON};
  }
  .sab-tab.active .sab-tab-count { background: rgba(122,0,0,0.12); color: ${MAROON}; }

  /* ---------- Confirm / Reject actions ---------- */
  .sab-action-cell { display: flex; gap: 8px; }
  .sab-confirm-btn, .sab-reject-btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 8px;
    font-size: 11.5px; font-weight: 800; cursor: pointer; font-family: inherit;
    transition: all 0.15s; white-space: nowrap;
  }
  .sab-confirm-btn { background: rgba(34,197,94,0.10); color: #178A4C; border: 1px solid rgba(34,197,94,0.28); }
  .sab-confirm-btn:hover:not(:disabled) { background: rgba(34,197,94,0.20); }
  .sab-reject-btn { background: rgba(239,68,68,0.08); color: ${DANGER}; border: 1px solid rgba(239,68,68,0.25); }
  .sab-reject-btn:hover:not(:disabled) { background: rgba(239,68,68,0.16); }
  .sab-confirm-btn:disabled, .sab-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sab-pending-dot { background: ${GOLD_DEEP}; box-shadow: 0 0 0 3px rgba(212,175,55,0.18); }

  .sab-action-banner {
    display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
    padding: 11px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 700;
  }
  .sab-action-banner.success { background: rgba(34,197,94,0.10); color: #178A4C; border: 1px solid rgba(34,197,94,0.25); }
  .sab-action-banner.error   { background: rgba(239,68,68,0.08); color: ${DANGER}; border: 1px solid rgba(239,68,68,0.22); }

  /* ---------- Reject confirmation modal ---------- */
  .sab-confirm-modal-body { padding: 22px 24px 24px; }
  .sab-confirm-modal-warn {
    padding: 12px 14px; border-radius: 10px; margin-bottom: 16px;
    background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.18);
    font-size: 12.5px; color: #7a2020; line-height: 1.6;
  }
  .sab-confirm-modal-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sab-confirm-modal-cancel {
    padding: 12px; border-radius: 10px; border: 1.5px solid rgba(122,0,0,0.20);
    background: transparent; cursor: pointer;
    font-family: inherit; font-size: 13.5px; font-weight: 700; color: ${MAROON};
  }
  .sab-confirm-modal-danger {
    padding: 12px; border-radius: 10px; border: none; cursor: pointer;
    background: linear-gradient(135deg, ${DANGER}, #B91C1C);
    font-family: inherit; font-size: 13.5px; font-weight: 800; color: #fff;
    box-shadow: 0 4px 14px rgba(239,68,68,0.3);
  }
  .sab-confirm-modal-danger:disabled { opacity: 0.7; cursor: not-allowed; }

  /* ---------- Responsive ---------- */
  @media (max-width: 1100px) { .sab-stats-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px) {
    .sab-hero { padding: 26px 22px 22px; }
    .sab-hero-title { font-size: 22px; }
    .sab-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .sab-table thead th:nth-child(4), .sab-table tbody td:nth-child(4) { display: none; }
  }
  @media (max-width: 560px) {
    .sab-table thead th:nth-child(3), .sab-table tbody td:nth-child(3) { display: none; }
    .sab-hero-title { font-size: 19px; }
    .sab-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .sab-stat-card { padding: 14px 14px 12px; }
    .sab-stat-value { font-size: 21px; }
    .sab-modal-grid { grid-template-columns: 1fr; }
  }
`;

const ACCENTS = {
  maroon: { grad: `linear-gradient(90deg, ${MAROON}, ${MAROON_DEEP})`, soft: MAROON_SOFT, fg: MAROON,   border: 'rgba(122,0,0,0.22)',   glow: 'rgba(122,0,0,0.14)' },
  blue:   { grad: 'linear-gradient(90deg, #3B82F6, #2563EB)',          soft: 'rgba(59,130,246,0.12)', fg: BLUE,      border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.14)' },
  green:  { grad: 'linear-gradient(90deg, #22C55E, #16A34A)',          soft: 'rgba(34,197,94,0.12)',  fg: '#178A4C', border: 'rgba(34,197,94,0.25)',  glow: 'rgba(34,197,94,0.14)' },
  orange: { grad: 'linear-gradient(90deg, #F97316, #EA580C)',          soft: 'rgba(249,115,22,0.12)', fg: ORANGE,    border: 'rgba(249,115,22,0.25)', glow: 'rgba(249,115,22,0.14)' },
  gold:   { grad: `linear-gradient(90deg, ${GOLD}, ${GOLD_DEEP})`,     soft: GOLD_PALE,               fg: GOLD_DEEP, border: 'rgba(212,175,55,0.30)', glow: 'rgba(212,175,55,0.16)' },
};

function StatCard({ accent, icon, value, label, sub, ratio }) {
  const a = ACCENTS[accent] || ACCENTS.maroon;
  return (
    <div
      className="sab-stat-card"
      style={{
        '--accent-grad':   a.grad,
        '--accent-soft':   a.soft,
        '--accent-fg':     a.fg,
        '--accent-border': a.border,
        '--accent-glow':   a.glow,
      }}
    >
      <div className="sab-stat-icon">{icon}</div>
      <div className="sab-stat-body">
        <div className="sab-stat-value">{value}</div>
        <div className="sab-stat-label">{label}</div>
        <div className="sab-stat-sub">{sub}</div>
        {typeof ratio === 'number' && (
          <div className="sab-stat-bar-track">
            <div className="sab-stat-bar-fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="sab-stats-grid">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="sab-shimmer sab-skel-stat" />)}
    </div>
  );
}

export default function SuperAdminBooks() {
  const [loading, setLoading]   = useState(true);
  const [books, setBooks]       = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [search, setSearch]     = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [genreFilter, setGenreFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]         = useState(1);
  const [viewBook, setViewBook] = useState(null);

  // 'book' = registered, live catalog · 'pending' = new titles submitted by
  // librarians awaiting Super Admin confirmation (book registration).
  const [activeTab, setActiveTab]     = useState('book');
  const [busyId, setBusyId]           = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionMsg, setActionMsg]     = useState(null); // { type, text }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [campusRes, booksRes, copiesRes] = await Promise.all([
          supabaseAdmin.from('campuses').select('id, campus_name, campus_code, is_active'),
          supabaseAdmin.from('books').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('book_copies').select('book_id, status'),
        ]);

        const allCampuses = campusRes.data || [];
        const allBooks    = booksRes.data || [];
        const allCopies   = copiesRes.data || [];

        const copyMap = {};
        allCopies.forEach(c => {
          if (!copyMap[c.book_id]) copyMap[c.book_id] = { total: 0, available: 0 };
          copyMap[c.book_id].total += 1;
          if (c.status === 'Available') copyMap[c.book_id].available += 1;
        });

        const campusMap = {};
        allCampuses.forEach(c => { campusMap[c.id] = c; });

        const merged = allBooks.map(b => {
          const counts = copyMap[b.id];
          const total     = counts ? counts.total : (parseInt(b.copies) || 0);
          const available = counts ? counts.available : (b.status === 'Available' ? total : 0);
          return {
            ...b,
            copies: total,
            available_copies: available,
            status: available > 0 ? 'Available' : (total > 0 ? 'Borrowed' : (b.status || 'Available')),
            campus: campusMap[b.campus_id] || null,
          };
        });

        setBooks(merged);
        setCampuses(allCampuses);
      } catch (err) {
        console.error('[SuperAdminBooks] load error:', err.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Legacy rows without the column (pre-migration) are treated as already
  // registered, so nothing already in the catalog gets hidden by this change.
  const approvedBooks = useMemo(
    () => books.filter(b => b.registration_status !== 'pending'),
    [books]
  );
  const pendingBooks = useMemo(
    () => books.filter(b => b.registration_status === 'pending'),
    [books]
  );

  const genres = useMemo(() => {
    const set = new Set(approvedBooks.map(b => b.genre).filter(Boolean));
    return Array.from(set).sort();
  }, [approvedBooks]);

  const baseBooks = activeTab === 'pending' ? pendingBooks : approvedBooks;

  const campusCounts = useMemo(() => {
    const map = {};
    baseBooks.forEach(b => { map[b.campus_id] = (map[b.campus_id] || 0) + 1; });
    return map;
  }, [baseBooks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseBooks.filter(b => {
      if (campusFilter !== 'all' && b.campus_id !== campusFilter) return false;
      if (genreFilter !== 'all' && b.genre !== genreFilter) return false;
      if (activeTab === 'book' && statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [b.title, b.authors, b.isbn, b.campus?.campus_name].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [baseBooks, search, campusFilter, genreFilter, statusFilter, activeTab]);

  useEffect(() => { setPage(1); }, [search, campusFilter, genreFilter, statusFilter, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const scopedBooks = useMemo(() => {
    return campusFilter === 'all' ? approvedBooks : approvedBooks.filter(b => b.campus_id === campusFilter);
  }, [approvedBooks, campusFilter]);

  const stats = useMemo(() => {
    const totalCopies     = scopedBooks.reduce((s, b) => s + (parseInt(b.copies) || 0), 0);
    const availableCopies = scopedBooks.reduce((s, b) => s + (parseInt(b.available_copies) || 0), 0);
    const borrowedCopies  = Math.max(0, totalCopies - availableCopies);
    // "Campuses" always reflects the system total (registered campuses),
    // regardless of which campus is currently selected in the filter.
    const campusesWithBooks = campuses.length;
    return {
      titles: scopedBooks.length,
      totalCopies,
      availableCopies,
      borrowedCopies,
      campusesWithBooks,
    };
  }, [scopedBooks, campuses]);

  const selectedCampusName = useMemo(() => {
    if (campusFilter === 'all') return null;
    return campuses.find(c => c.id === campusFilter)?.campus_name || null;
  }, [campusFilter, campuses]);

  const flashMsg = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3200);
  };

  // Confirming registers the book into the live, campus-facing catalog.
  const handleConfirm = async (book) => {
    setBusyId(book.id);
    try {
      const { error } = await supabaseAdmin
        .from('books')
        .update({ registration_status: 'approved' })
        .eq('id', book.id);
      if (error) throw error;
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, registration_status: 'approved' } : b));
      flashMsg('success', `"${book.title}" is now registered and live in the catalog.`);
    } catch (err) {
      flashMsg('error', 'Could not confirm this book: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  // Rejecting a submission that was never truly registered removes it —
  // along with any copies/QR codes already generated for it — rather than
  // leaving a half-registered record behind.
  const handleReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const { data: copies } = await supabaseAdmin
        .from('book_copies').select('copy_id').eq('book_id', rejectTarget.id);
      const copyIds = (copies || []).map(c => c.copy_id);
      if (copyIds.length > 0) {
        await supabaseAdmin.from('borrow_requests').delete().in('copy_id', copyIds);
        await supabaseAdmin.from('book_copies').delete().in('copy_id', copyIds);
      }
      const { error } = await supabaseAdmin.from('books').delete().eq('id', rejectTarget.id);
      if (error) throw error;
      setBooks(prev => prev.filter(b => b.id !== rejectTarget.id));
      flashMsg('success', `"${rejectTarget.title}" was rejected and removed.`);
      setRejectTarget(null);
    } catch (err) {
      flashMsg('error', 'Could not reject this book: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="sab">
      <style>{CSS}</style>

      {/* Hero */}
      {loading ? (
        <div className="sab-shimmer sab-skel-hero" />
      ) : (
        <div className="sab-hero">
          <div className="sab-hero-bar" />
          <div className="sab-hero-left">
            <div className="sab-hero-title">
              <span className="sab-hero-icon"><BookOpen size={22} /></span>
              Every Campus, One Catalog
            </div>
            <div className="sab-hero-sub">
              {selectedCampusName
                ? `Showing holdings for ${selectedCampusName} only switch back to "All Campuses" for the system wide view.`
                : 'A system wide view of every book title held across all campus libraries is searchable, filterable, and always up to date.'}
            </div>
          </div>
          <div className="sab-hero-right">
            <div className="sab-hero-badge">
              <b>{stats.titles}</b>
              <span>Titles</span>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="sab-stats-grid">
          <StatCard
            accent="maroon"
            icon={<Library size={20} />}
            value={stats.titles}
            label="Book Titles"
            sub="across all campuses"
          />
          <StatCard
            accent="blue"
            icon={<Layers size={20} />}
            value={stats.totalCopies}
            label="Total Copies"
            sub="physical + tracked units"
          />
          <StatCard
            accent="green"
            icon={<PackageCheck size={20} />}
            value={stats.availableCopies}
            label="Available Copies"
            sub="ready to borrow"
            ratio={stats.totalCopies ? stats.availableCopies / stats.totalCopies : 0}
          />
          <StatCard
            accent="orange"
            icon={<PackageX size={20} />}
            value={stats.borrowedCopies}
            label="Borrowed Copies"
            sub="currently out"
            ratio={stats.totalCopies ? stats.borrowedCopies / stats.totalCopies : 0}
          />
          <StatCard
            accent="gold"
            icon={<Building2 size={20} />}
            value={stats.campusesWithBooks}
            label="Campuses"
            sub="registered in the system"
          />
        </div>
      )}

      {/* Campus chip strip */}
      {!loading && campuses.length > 0 && (
        <>
          <div className="sab-selector-head">
            <div className="sab-selector-title"><MapPin size={14} />Browse by Campus</div>
            <div className="sab-selector-caption">Tap a campus to filter the catalog below.</div>
          </div>
          <div className="sab-campus-strip">
            <div
              className={`sab-campus-chip${campusFilter === 'all' ? ' active' : ''}`}
              onClick={() => setCampusFilter('all')}
            >
              All Campuses <span className="cnt">{baseBooks.length}</span>
            </div>
            {campuses.map(c => (
              <div
                key={c.id}
                className={`sab-campus-chip${campusFilter === c.id ? ' active' : ''}`}
                onClick={() => setCampusFilter(c.id)}
              >
                {c.campus_name} <span className="cnt">{campusCounts[c.id] || 0}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {actionMsg && (
        <div className={`sab-action-banner ${actionMsg.type}`}>
          {actionMsg.type === 'success' ? <Check size={15} /> : <Ban size={15} />}
          {actionMsg.text}
        </div>
      )}

      {loading ? (
        <div className="sab-shimmer sab-skel-table" />
      ) : (
        <>
          <div className="sab-toolbar">
            <div className="sab-search">
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, author, ISBN, or campus..."
                aria-label="Search books"
              />
            </div>
            <select className="sab-select" value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
              <option value="all">All Genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {activeTab === 'book' && (
              <select className="sab-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="Available">Available</option>
                <option value="Borrowed">Borrowed</option>
              </select>
            )}
          </div>

          {/* Catalog table */}
          <div className="sab-selector-head" style={{ marginTop: 8 }}>
            <div className="sab-tabs">
              <button
                className={`sab-tab${activeTab === 'book' ? ' active' : ''}`}
                onClick={() => setActiveTab('book')}
              >
                <BookOpen size={14} /> Book
              </button>
              <button
                className={`sab-tab${activeTab === 'pending' ? ' active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <Clock size={14} /> Pending Requests
                {pendingBooks.length > 0 && <span className="sab-tab-count">{pendingBooks.length}</span>}
              </button>
            </div>
          </div>

          <div className={`sab-table-wrap${filtered.length === 0 ? ' bare' : ''}`}>
            {filtered.length === 0 ? (
              <div className="sab-empty">
                <div className={`sab-empty-illus${activeTab === 'pending' ? ' plain' : ''}`}>
                  {activeTab === 'pending' ? <AnalogClockIcon size={64} /> : <BookOpen size={30} strokeWidth={1.8} />}
                </div>
                <div className="sab-empty-title">
                  {activeTab === 'pending'
                    ? (pendingBooks.length ? 'No matching requests' : 'Nothing pending')
                    : (baseBooks.length ? 'No matching books' : 'No books found')}
                </div>
                <div className="sab-empty-sub">
                  {activeTab === 'pending'
                    ? (pendingBooks.length
                        ? 'Try a different search term or clear filters.'
                        : 'New book registrations submitted by librarians will appear here for confirmation.')
                    : (baseBooks.length
                        ? 'Try a different search term or clear filters.'
                        : 'Once librarians add books to their campus catalogs, they will appear here.')}
                </div>
              </div>
            ) : activeTab === 'pending' ? (
              <>
                <div className="sab-table-scroll">
                  <table className="sab-table">
                    <thead>
                      <tr>
                        {['Book', 'Campus', 'ISBN', 'Genre', 'Copies', 'Submitted', 'Action'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(b => (
                        <tr key={b.id} onClick={() => setViewBook(b)}>
                          <td>
                            <div className="sab-book-cell">
                              {b.cover_image_url ? (
                                <img className="sab-book-cover" src={b.cover_image_url} alt="" />
                              ) : (
                                <div className="sab-book-cover-fallback"><BookOpen size={13} /></div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div className="sab-book-title">{b.title}</div>
                                <div className="sab-book-author">{b.authors || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="sab-code-badge">{b.campus?.campus_name || 'Unassigned'}</span></td>
                          <td><span style={{ fontSize: 12, fontFamily: 'monospace', color: TEXT_MUTED }}>{b.isbn || '—'}</span></td>
                          <td>{b.genre ? <span className="sab-genre-badge">{b.genre}</span> : '—'}</td>
                          <td>
                            <span className="sab-copies">{b.copies}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                              {b.created_at ? new Date(b.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            </span>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <div className="sab-action-cell">
                              <button
                                className="sab-confirm-btn"
                                disabled={busyId === b.id}
                                onClick={() => handleConfirm(b)}
                              >
                                <Check size={13} /> {busyId === b.id ? 'Working…' : 'Confirm'}
                              </button>
                              <button
                                className="sab-reject-btn"
                                disabled={busyId === b.id}
                                onClick={() => setRejectTarget(b)}
                              >
                                <Ban size={13} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="sab-pagination">
                    <div className="sab-pagination-info">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </div>
                    <div className="sab-pagination-btns">
                      <button className="sab-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                        <ChevronLeft size={14} />
                      </button>
                      <button className="sab-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="sab-table-scroll">
                  <table className="sab-table">
                    <thead>
                      <tr>
                        {['Book', 'Campus', 'ISBN', 'Genre', 'Copies', 'Status'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(b => (
                        <tr key={b.id} onClick={() => setViewBook(b)}>
                          <td>
                            <div className="sab-book-cell">
                              {b.cover_image_url ? (
                                <img className="sab-book-cover" src={b.cover_image_url} alt="" />
                              ) : (
                                <div className="sab-book-cover-fallback"><BookOpen size={13} /></div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div className="sab-book-title">{b.title}</div>
                                <div className="sab-book-author">{b.authors || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="sab-code-badge">{b.campus?.campus_name || 'Unassigned'}</span></td>
                          <td><span style={{ fontSize: 12, fontFamily: 'monospace', color: TEXT_MUTED }}>{b.isbn || '—'}</span></td>
                          <td>{b.genre ? <span className="sab-genre-badge">{b.genre}</span> : '—'}</td>
                          <td>
                            <span className="sab-copies">
                              {b.available_copies}<span>/{b.copies}</span>
                            </span>
                          </td>
                          <td>
                            <div className="sab-status-row">
                              <span className={`sab-status-dot${b.status === 'Available' ? '' : ' off'}`} />
                              <span className="sab-status-label" style={{ color: b.status === 'Available' ? '#178A4C' : DANGER }}>
                                {b.status}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="sab-pagination">
                    <div className="sab-pagination-info">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </div>
                    <div className="sab-pagination-btns">
                      <button className="sab-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                        <ChevronLeft size={14} />
                      </button>
                      <button className="sab-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {rejectTarget && (
        <div className="sab-modal-overlay" onClick={e => e.target === e.currentTarget && !busyId && setRejectTarget(null)}>
          <div className="sab-modal" style={{ maxWidth: 420 }}>
            <div className="sab-modal-head" style={{ justifyContent: 'center', textAlign: 'center' }}>
              <div>
                <div className="sab-modal-title" style={{ paddingRight: 0 }}>Reject Book Registration</div>
                <div className="sab-modal-author">This cannot be undone.</div>
              </div>
            </div>
            <div className="sab-confirm-modal-body">
              <div className="sab-confirm-modal-warn">
                Rejecting <strong>{rejectTarget.title}</strong> will permanently delete this submission,
                including any copies and QR codes already generated for it. The librarian will need to
                submit it again if it should be added later.
              </div>
              <div className="sab-confirm-modal-btns">
                <button
                  className="sab-confirm-modal-cancel"
                  disabled={busyId === rejectTarget.id}
                  onClick={() => setRejectTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="sab-confirm-modal-danger"
                  disabled={busyId === rejectTarget.id}
                  onClick={handleReject}
                >
                  {busyId === rejectTarget.id ? 'Rejecting…' : 'Reject & Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewBook && (
        <div className="sab-modal-overlay" onClick={e => e.target === e.currentTarget && setViewBook(null)}>
          <div className="sab-modal">
            <div className="sab-modal-head">
              <button className="sab-modal-close" onClick={() => setViewBook(null)}><X size={15} /></button>
              {viewBook.cover_image_url ? (
                <img className="sab-modal-cover" src={viewBook.cover_image_url} alt="" />
              ) : (
                <div className="sab-modal-cover-fallback"><BookOpen size={22} /></div>
              )}
              <div>
                <div className="sab-modal-title">{viewBook.title}</div>
                <div className="sab-modal-author">{viewBook.authors || 'Unknown author'}</div>
                {viewBook.registration_status === 'pending' && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: 'rgba(212,175,55,0.20)', color: '#F5E4A8',
                    border: '1px solid rgba(245,228,168,0.35)',
                  }}>
                    <Clock size={11} /> Awaiting Confirmation
                  </div>
                )}
              </div>
            </div>
            <div className="sab-modal-body">
              <div className="sab-modal-grid">
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label"><Building2 size={12} />Campus</div>
                  <div className="sab-modal-field-value">{viewBook.campus?.campus_name || 'Unassigned'}</div>
                </div>
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label"><Hash size={12} />ISBN</div>
                  <div className="sab-modal-field-value">{viewBook.isbn || '—'}</div>
                </div>
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label"><User size={12} />Publisher</div>
                  <div className="sab-modal-field-value">{viewBook.publisher || '—'}</div>
                </div>
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label"><MapPin size={12} />Shelf Location</div>
                  <div className="sab-modal-field-value">{viewBook.shelf_location || '—'}</div>
                </div>
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label"><Layers size={12} />Genre</div>
                  <div className="sab-modal-field-value">{viewBook.genre || '—'}</div>
                </div>
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label"><BookOpen size={12} />Copies</div>
                  <div className="sab-modal-field-value">{viewBook.available_copies} available / {viewBook.copies} total</div>
                </div>
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label">Year</div>
                  <div className="sab-modal-field-value">{viewBook.year || '—'}</div>
                </div>
                <div className="sab-modal-field">
                  <div className="sab-modal-field-label">Status</div>
                  <div className="sab-modal-field-value" style={{ color: viewBook.status === 'Available' ? '#178A4C' : DANGER }}>
                    {viewBook.status}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}