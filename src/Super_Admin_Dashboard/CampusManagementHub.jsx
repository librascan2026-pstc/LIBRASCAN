import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronLeft, Copy, Ban, CheckCircle2,
  Building2, X, Camera, Check, Search, SlidersHorizontal, GraduationCap,
  BookOpen, Users, MapPin, Eye, MoreVertical, AlertTriangle, ArrowUpDown,
  Landmark, School, Folder, Calendar, ShieldCheck,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';

/* ============================================================================
   LIBRASCAN — Campus Management Hub
   Premium SaaS redesign — same Supabase logic, CRUD paths & business rules,
   entirely new component structure, visual language, motion and UX.
============================================================================ */

/* ── Design tokens (LIBRASCAN brand) ─────────────────────────────────────── */
const MAROON       = '#7A0000';
const MAROON_DEEP  = '#5C0000';
const MAROON_MID   = '#8F1616';
const MAROON_SOFT  = 'rgba(122,0,0,0.08)';
const GOLD         = '#D4AF37';
const GOLD_DEEP    = '#B8912B';
const GOLD_PALE    = 'rgba(212,175,55,0.14)';
const BG           = '#F8F6F2';
const CARD         = '#FFFFFF';
const CREAM        = '#FFF8EF';
const TEXT         = '#3B2A25';
const TEXT_MUTED   = '#8A7368';
const SUCCESS      = '#22C55E';
const DANGER       = '#EF4444';
const BLUE         = '#3B82F6';
const BORDER       = '#E8DDD4';

const BADGE_PALETTE = [
  { bg: 'rgba(212,175,55,0.16)', fg: '#8A6D1B' },
  { bg: 'rgba(122,0,0,0.09)',    fg: MAROON },
  { bg: 'rgba(34,197,94,0.12)',  fg: '#178A4C' },
  { bg: 'rgba(59,130,246,0.12)', fg: '#1D5FAE' },
  { bg: 'rgba(147,51,234,0.10)', fg: '#7A2CC7' },
];
function badgeColorFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return BADGE_PALETTE[h % BADGE_PALETTE.length];
}

/* ── Global styles ────────────────────────────────────────────────────────
   8px spacing scale throughout. No Tailwind in this project, so we ship a
   scoped stylesheet the same way the rest of LIBRASCAN does.
─────────────────────────────────────────────────────────────────────────── */
const CSS = `
  .cmh, .cmh * { box-sizing: border-box; }
  .cmh {
    background: ${BG};
    min-height: 100%;
    font-family: var(--font-sans,'DM Sans','Josefin Sans',sans-serif);
    color: ${TEXT};
    -webkit-font-smoothing: antialiased;
  }
  .cmh :focus-visible {
    outline: 2.5px solid ${GOLD};
    outline-offset: 2px;
    border-radius: 6px;
  }

  /* ── Hero header ─────────────────────────────────────────────────────── */
  .cmh-hero {
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
  .cmh-hero-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    border-radius: 24px 24px 0 0;
    background: linear-gradient(90deg, ${MAROON_DEEP}, ${MAROON}, ${GOLD}, ${MAROON}, ${MAROON_DEEP});
    background-size: 200% 100%;
    animation: cmh-shimmer-bar 3s ease-in-out infinite;
    z-index: 2;
  }
  .cmh-hero::before {
    content: '';
    position: absolute;
    top: -60%; right: -8%;
    width: 420px; height: 420px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%);
    pointer-events: none;
  }
  .cmh-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(122,0,0,0.05) 1px, transparent 1px);
    background-size: 22px 22px;
    opacity: 0.6;
    pointer-events: none;
  }
  .cmh-hero-left { position: relative; z-index: 1; max-width: 640px; text-align: left; }
  .cmh-hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${MAROON_SOFT};
    border: 1px solid rgba(122,0,0,0.18);
    color: ${MAROON};
    font-size: 11px; font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase;
    padding: 6px 14px; border-radius: 999px; margin-bottom: 16px;
  }
  .cmh-hero-title {
    font-size: 28px; font-weight: 800; letter-spacing: -0.01em;
    color: ${TEXT}; line-height: 1.2; margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .cmh-hero-icon {
    width: 42px; height: 42px; border-radius: 14px;
    background: ${MAROON_SOFT};
    border: 1px solid rgba(122,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON}; flex-shrink: 0;
  }
  .cmh-hero-sub {
    font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED};
    max-width: 520px; font-weight: 500;
    text-align: left;
  }
  .cmh-hero-right { position: relative; z-index: 1; display: flex; align-items: center; }

  /* ── Buttons ─────────────────────────────────────────────────────────── */
  .cmh-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; border-radius: 999px; border: none;
    background: ${GOLD};
    color: ${MAROON_DEEP};
    font-family: inherit; font-size: 13.5px; font-weight: 800;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(212,175,55,0.35);
    transition: transform 0.16s cubic-bezier(.22,1,.36,1), box-shadow 0.16s, background 0.16s;
  }
  .cmh-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(212,175,55,0.45); background: #E0BC4C; }
  .cmh-btn-primary:active { transform: translateY(0); }

  .cmh-btn-maroon {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 20px; border-radius: 12px; border: none;
    background: ${MAROON};
    color: #fff;
    font-family: inherit; font-size: 13px; font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(122,0,0,0.24);
    transition: transform 0.15s cubic-bezier(.22,1,.36,1), background 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .cmh-btn-maroon:hover { background: ${MAROON_MID}; transform: translateY(-1px); box-shadow: 0 10px 22px rgba(122,0,0,0.30); }

  .cmh-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 16px; border-radius: 12px;
    border: 1.5px solid ${BORDER};
    background: ${CARD};
    color: ${TEXT};
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    cursor: pointer;
    transition: border-color 0.14s, background 0.14s, color 0.14s;
  }
  .cmh-btn-ghost:hover { border-color: ${MAROON}; color: ${MAROON}; background: ${MAROON_SOFT}; }

  .cmh-icon-btn {
    width: 32px; height: 32px; border-radius: 9px;
    border: 1px solid ${BORDER};
    background: ${CARD};
    color: ${TEXT_MUTED};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; position: relative;
    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.12s;
  }
  .cmh-icon-btn:hover { transform: translateY(-1px); }
  .cmh-icon-btn.edit:hover  { background: ${GOLD_PALE}; color: ${GOLD_DEEP}; border-color: rgba(212,175,55,0.45); }
  .cmh-icon-btn.dup:hover   { background: rgba(59,130,246,0.10); color: ${BLUE}; border-color: rgba(59,130,246,0.35); }
  .cmh-icon-btn.view:hover  { background: rgba(59,42,37,0.06); color: ${TEXT}; border-color: rgba(59,42,37,0.25); }
  .cmh-icon-btn.del:hover   { background: rgba(239,68,68,0.10); color: ${DANGER}; border-color: rgba(239,68,68,0.35); }

  .cmh-tooltip {
    position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%);
    background: ${TEXT}; color: #fff; font-size: 10.5px; font-weight: 600;
    padding: 4px 9px; border-radius: 6px; white-space: nowrap;
    opacity: 0; pointer-events: none; transition: opacity 0.14s;
    z-index: 40;
  }
  .cmh-icon-btn:hover .cmh-tooltip { opacity: 1; }

  /* ── Campus carousel (auto-scrolling, matches premium card styling) ───── */
  .cmh-selector-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .cmh-selector-title {
    font-size: 13px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    color: ${TEXT_MUTED};
    display: flex; align-items: center; gap: 8px;
  }
  .cmh-carousel-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0 18px;
  }
  .cmh-carousel-track-outer {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%);
            mask-image: linear-gradient(90deg, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%);
  }
  .cmh-carousel-track {
    display: flex;
    gap: 16px;
    width: max-content;
    will-change: transform;
  }
  .cmh-carousel-arrow {
    flex-shrink: 0;
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 1px solid ${BORDER};
    background: ${CARD};
    color: ${TEXT};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(59,42,37,0.14);
    z-index: 5;
    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
  }
  .cmh-carousel-arrow:hover { background: ${MAROON}; color: #fff; border-color: ${MAROON}; transform: scale(1.07); }
  .cmh-carousel-empty {
    border: 1.5px dashed rgba(122,0,0,0.28);
    border-radius: 18px;
    padding: 30px 20px;
    text-align: center;
    color: ${TEXT_MUTED};
    font-size: 13px;
    font-weight: 600;
  }

  .cmh-campus-card {
    scroll-snap-align: start;
    flex: 0 0 200px;
    height: 168px;
    background:
      radial-gradient(circle at 30% 0%, rgba(255,255,255,0.10) 0%, transparent 55%),
      radial-gradient(circle at 100% 100%, rgba(0,0,0,0.20) 0%, transparent 62%),
      linear-gradient(160deg, ${MAROON_MID} 0%, ${MAROON} 45%, ${MAROON_DEEP} 100%);
    border: 1.5px solid rgba(212,175,55,0.22);
    border-radius: 18px;
    padding: 24px 16px 18px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    transition: transform 0.18s cubic-bezier(.22,1,.36,1), box-shadow 0.18s, border-color 0.18s;
    box-shadow: 0 4px 14px rgba(40,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .cmh-campus-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(90deg, transparent, ${GOLD}, transparent),
      linear-gradient(${GOLD}, ${GOLD}),
      linear-gradient(${GOLD}, ${GOLD}),
      linear-gradient(${GOLD}, ${GOLD}),
      linear-gradient(${GOLD}, ${GOLD});
    background-repeat: no-repeat;
    background-size: 100% 3px, 18px 1.5px, 1.5px 18px, 18px 1.5px, 1.5px 18px;
    background-position:
      top left,
      10px 10px,
      10px 10px,
      right 10px bottom 10px,
      right 10px bottom 10px;
    opacity: 0.75;
  }
  .cmh-campus-card::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      radial-gradient(circle at 86% 122%, transparent 54px, rgba(212,175,55,0.16) 56px, rgba(212,175,55,0.16) 58px, transparent 60px),
      radial-gradient(circle at 86% 122%, transparent 74px, rgba(212,175,55,0.09) 76px, rgba(212,175,55,0.09) 77px, transparent 79px),
      linear-gradient(115deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 22%, transparent 42%),
      radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
    background-repeat: no-repeat, no-repeat, no-repeat, repeat;
    background-size: auto, auto, auto, 15px 15px;
  }
  .cmh-campus-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 34px rgba(40,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08);
    border-color: rgba(212,175,55,0.5);
  }
  .cmh-campus-card.sel {
    border-color: ${GOLD};
    box-shadow: 0 0 0 3px rgba(212,175,55,0.22), 0 18px 38px rgba(40,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.1);
    transform: translateY(-6px);
    background:
      radial-gradient(circle at 30% 0%, rgba(255,255,255,0.10) 0%, transparent 55%),
      linear-gradient(160deg, ${MAROON_MID} 0%, ${MAROON_DEEP} 100%);
  }
  .cmh-campus-card.sel::before { opacity: 1; height: 3px; }
  .cmh-campus-card.inactive { opacity: 0.55; }
  .cmh-campus-card-top { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 100%; position: relative; z-index: 1; }
  .cmh-campus-logo {
    width: 54px; height: 54px; border-radius: 50%;
    border: 2px solid ${GOLD};
    background: ${CREAM};
    overflow: hidden; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto;
    box-shadow: 0 3px 10px rgba(0,0,0,0.25), 0 0 0 3px rgba(212,175,55,0.15);
  }
  .cmh-campus-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cmh-main-badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: ${GOLD_PALE}; color: ${GOLD_DEEP};
    font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
    padding: 4px 8px; border-radius: 999px;
    border: 1px solid rgba(212,175,55,0.35);
  }
  .cmh-campus-name {
    font-size: 14px; font-weight: 800; color: #fff;
    line-height: 1.3;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative; z-index: 1;
    text-shadow: 0 1px 3px rgba(0,0,0,0.25);
  }
  .cmh-campus-code {
    font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.65);
    letter-spacing: 0.04em; font-family: 'SF Mono', ui-monospace, monospace;
    margin-bottom: 12px;
  }
  .cmh-campus-stats { display: flex; gap: 14px; margin-bottom: 10px; }
  .cmh-campus-stat { display: flex; flex-direction: column; }
  .cmh-campus-stat b { font-size: 15px; font-weight: 800; color: ${GOLD_PALE}; line-height: 1.2; }
  .cmh-campus-stat span { font-size: 9.5px; font-weight: 700; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.05em; }
  .cmh-campus-foot { display: flex; align-items: center; justify-content: space-between; }
  .cmh-status-dot-row { display: flex; align-items: center; gap: 6px; }
  .cmh-status-dot { width: 7px; height: 7px; border-radius: 50%; background: ${SUCCESS}; box-shadow: 0 0 0 3px rgba(34,197,94,0.16); }
  .cmh-status-dot.off { background: ${DANGER}; box-shadow: 0 0 0 3px rgba(239,68,68,0.16); }
  .cmh-status-text { font-size: 10.5px; font-weight: 700; color: ${TEXT_MUTED}; }
  .cmh-campus-more {
    width: 26px; height: 26px; border-radius: 8px; border: none; background: transparent;
    color: ${TEXT_MUTED}; display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background 0.14s, color 0.14s;
  }
  .cmh-campus-more:hover { background: ${MAROON_SOFT}; color: ${MAROON}; }

  /* ── Campus information panel ────────────────────────────────────────── */
  .cmh-info-panel {
    background: linear-gradient(135deg, ${CREAM} 0%, ${CARD} 100%);
    border: 1px solid ${BORDER};
    border-radius: 20px;
    padding: 24px;
    margin: 24px 0;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 16px;
  }
  .cmh-info-left { display: flex; align-items: center; gap: 16px; }
  .cmh-info-logo {
    width: 56px; height: 56px; border-radius: 16px;
    border: 1.5px solid ${BORDER}; background: #fff;
    display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
  }
  .cmh-info-logo img { width: 100%; height: 100%; object-fit: cover; }
  .cmh-info-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
  .cmh-info-name { font-size: 19px; font-weight: 800; color: ${TEXT}; }
  .cmh-info-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .cmh-info-meta-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: ${TEXT_MUTED}; }
  .cmh-info-meta-item svg { color: ${MAROON}; flex-shrink: 0; }
  .cmh-info-right { display: flex; align-items: center; gap: 8px; }

  /* ── Statistics ──────────────────────────────────────────────────────── */
  .cmh-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  .cmh-stat-card {
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 16px;
    padding: 16px;
    display: flex; align-items: center; gap: 16px;
    transition: transform 0.16s cubic-bezier(.22,1,.36,1), box-shadow 0.16s, border-color 0.16s;
  }
  .cmh-stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(59,42,37,0.08); border-color: rgba(122,0,0,0.22); }
  .cmh-stat-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .cmh-stat-value { font-size: 21px; font-weight: 800; color: ${TEXT}; line-height: 1.15; }
  .cmh-stat-label { font-size: 11px; font-weight: 700; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.04em; }

  /* ── Toolbar ─────────────────────────────────────────────────────────── */
  .cmh-toolbar {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .cmh-search {
    flex: 1 1 260px;
    min-width: 200px;
    position: relative;
  }
  .cmh-search svg {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: ${TEXT_MUTED}; pointer-events: none; transition: color 0.15s;
  }
  .cmh-search input {
    width: 100%;
    padding: 11px 14px 11px 40px;
    border-radius: 999px;
    border: 1.5px solid ${BORDER};
    background: ${CARD};
    font-family: inherit; font-size: 13px; color: ${TEXT};
    outline: none;
    transition: border-color 0.16s, box-shadow 0.16s;
  }
  .cmh-search input:focus { border-color: ${MAROON}; box-shadow: 0 0 0 4px ${MAROON_SOFT}; }
  .cmh-search input:focus ~ svg { color: ${MAROON}; }
  .cmh-search input::placeholder { color: rgba(58,42,37,0.35); }

  .cmh-select {
    display: flex; align-items: center; gap: 7px;
    padding: 10px 14px; border-radius: 999px;
    border: 1.5px solid ${BORDER}; background: ${CARD};
    font-family: inherit; font-size: 12.5px; font-weight: 700; color: ${TEXT};
    cursor: pointer; outline: none; appearance: none;
    transition: border-color 0.15s;
  }
  .cmh-select:focus, .cmh-select:hover { border-color: ${MAROON}; }

  /* ── Table ───────────────────────────────────────────────────────────── */
  .cmh-table-wrap {
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(59,42,37,0.04);
  }
  .cmh-table-scroll { overflow-x: auto; }
  .cmh-table { width: 100%; border-collapse: collapse; min-width: 640px; }
  .cmh-table thead th {
    position: sticky; top: 0; z-index: 2;
    text-align: left;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
    color: rgba(255,248,239,0.92);
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    padding: 15px 18px;
    box-shadow: 0 2px 8px rgba(40,0,0,0.18);
    white-space: nowrap;
  }
  .cmh-table thead th:first-child { border-top-left-radius: 18px; }
  .cmh-table thead th:last-child  { border-top-right-radius: 18px; text-align: right; }
  .cmh-table tbody td {
    padding: 14px 18px;
    font-size: 13px; color: ${TEXT};
    border-bottom: 1px solid ${BORDER};
    vertical-align: middle;
  }
  .cmh-table tbody tr:last-child td { border-bottom: none; }
  .cmh-table tbody tr:nth-child(even) td { background: ${CREAM}; }
  .cmh-table tbody tr { transition: background 0.14s; }
  .cmh-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  .cmh-table tbody td:last-child { text-align: right; }
  .cmh-table-empty { text-align: center; padding: 0; }

  .cmh-code-badge {
    display: inline-block;
    font-size: 11px; font-weight: 800; letter-spacing: 0.02em;
    border-radius: 999px;
    padding: 4px 12px;
  }
  .cmh-row-actions { display: flex; gap: 7px; justify-content: flex-end; }

  .cmh-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; border-top: 1px solid ${BORDER};
    background: ${CREAM};
  }
  .cmh-pagination-info { font-size: 12px; color: ${TEXT_MUTED}; font-weight: 600; }
  .cmh-pagination-btns { display: flex; gap: 6px; }
  .cmh-page-btn {
    width: 30px; height: 30px; border-radius: 9px; border: 1px solid ${BORDER};
    background: ${CARD}; color: ${TEXT}; font-size: 12px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .cmh-page-btn:hover:not(:disabled) { background: ${MAROON}; color: #fff; border-color: ${MAROON}; }
  .cmh-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Empty states ────────────────────────────────────────────────────── */
  .cmh-emptybar {
    height: 4px;
    background: linear-gradient(90deg, ${MAROON_DEEP}, ${MAROON}, ${GOLD}, ${MAROON}, ${MAROON_DEEP});
    background-size: 200% 100%;
    animation: cmh-shimmer-bar 3s ease-in-out infinite;
  }
  .cmh-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 64px 24px; text-align: center;
  }
  .cmh-empty-illus {
    width: 84px; height: 84px; border-radius: 24px;
    background: ${CREAM}; border: 1.5px dashed rgba(122,0,0,0.28);
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON}; margin-bottom: 18px;
  }
  .cmh-empty-title { font-size: 15px; font-weight: 800; color: ${TEXT}; margin-bottom: 6px; }
  .cmh-empty-sub { font-size: 12.5px; color: ${TEXT_MUTED}; max-width: 320px; line-height: 1.6; margin-bottom: 18px; }

  /* ── Skeletons ───────────────────────────────────────────────────────── */
  .cmh-shimmer {
    position: relative; overflow: hidden;
    background: ${BORDER}; border-radius: 10px;
  }
  .cmh-shimmer::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
    transform: translateX(-100%);
    animation: cmh-shimmer-sweep 1.4s infinite;
  }
  @keyframes cmh-shimmer-sweep { 100% { transform: translateX(100%); } }
  @keyframes cmh-spin { to { transform: rotate(360deg); } }
  @keyframes cmh-shimmer-bar {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ── Context menu ────────────────────────────────────────────────────── */
  .cmh-ctx {
    position: fixed; min-width: 195px;
    background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 14px;
    padding: 6px; z-index: 2000;
    box-shadow: 0 18px 40px rgba(59,42,37,0.22);
  }
  .cmh-ctx-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 10px 12px; border-radius: 9px;
    border: none; background: transparent; color: ${TEXT};
    font-family: inherit; font-size: 12.5px; font-weight: 600;
    cursor: pointer; text-align: left;
    transition: background 0.13s;
  }
  .cmh-ctx-item:hover { background: ${MAROON_SOFT}; }
  .cmh-ctx-item.danger { color: ${DANGER}; }
  .cmh-ctx-item.danger:hover { background: rgba(239,68,68,0.09); }
  .cmh-ctx-sep { height: 1px; background: ${BORDER}; margin: 5px; }

  /* ── Modal ───────────────────────────────────────────────────────────── */
  .cmh-overlay {
    position: fixed; inset: 0;
    background: rgba(59,42,37,0.45);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
  }
  .cmh-modal {
    background: ${BG};
    border-radius: 22px;
    width: 480px; max-width: 100%; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 30px 70px rgba(40,0,0,0.35);
  }
  .cmh-modal-wide { width: 600px; }
  .cmh-modal-hdr {
    display: flex; align-items: center; gap: 12px;
    padding: 20px 24px;
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    flex-shrink: 0; position: relative;
  }
  .cmh-modal-hdr-icon {
    width: 38px; height: 38px; border-radius: 12px;
    background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
    display: flex; align-items: center; justify-content: center; color: ${GOLD}; flex-shrink: 0;
  }
.cmh-modal-hdr-title {
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    text-align: left;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin: 0;
}
  .cmh-modal-hdr-sub { font-size: 11.5px; color: rgba(255,255,255,0.65); font-weight: 500; }
  .cmh-modal-hdr-close, .cmh-modal-hdr-del {
    margin-left: auto; background: rgba(255,255,255,0.10); border: none; color: #fff;
    width: 30px; height: 30px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background 0.14s;
  }
  .cmh-modal-hdr-close:hover, .cmh-modal-hdr-del:hover { background: rgba(255,255,255,0.22); }
  .cmh-modal-body { padding: 24px 26px 26px; overflow-y: auto; flex: 1; }

  .cmh-section-label {
    display: flex; align-items: center; gap: 7px;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: ${MAROON}; margin: 4px 0 12px;
  }
  .cmh-section-label:not(:first-child) { margin-top: 20px; }
  .cmh-section-label::after { content: ''; flex: 1; height: 1px; background: ${BORDER}; }

  .cmh-logo-circle-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 6px; }
  .cmh-logo-circle {
    position: relative; width: 108px; height: 108px; border-radius: 28px;
    border: 2px dashed rgba(122,0,0,0.35); background: ${CREAM};
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    cursor: pointer; overflow: hidden; transition: border-color 0.15s, background 0.15s;
  }
  .cmh-logo-circle:hover { border-color: ${MAROON}; background: ${MAROON_SOFT}; }
  .cmh-logo-circle img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
  .cmh-logo-circle-text { font-size: 10px; font-weight: 700; color: ${TEXT_MUTED}; text-align: center; line-height: 1.4; padding: 0 8px; }
  .cmh-logo-cam-badge {
    position: absolute; bottom: 6px; right: 6px; width: 26px; height: 26px; border-radius: 50%;
    background: ${MAROON}; display: flex; align-items: center; justify-content: center; color: #fff;
    pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
  .cmh-logo-label { font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: ${TEXT_MUTED}; margin-top: 8px; }

  .cmh-active-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 999px; cursor: pointer;
    background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.32);
    margin: 10px auto 0; width: fit-content; transition: background 0.15s;
  }
  .cmh-active-pill.off { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.30); }
  .cmh-active-dot { width: 8px; height: 8px; border-radius: 50%; background: ${SUCCESS}; }
  .cmh-active-dot.off { background: ${DANGER}; }
  .cmh-active-text { font-size: 11.5px; font-weight: 700; color: #178a4c; }
  .cmh-active-text.off { color: #b91c1c; }

  .cmh-field { margin-bottom: 16px; }
  .cmh-field-row { display: flex; gap: 12px; }
  .cmh-field-row .cmh-field { flex: 1; min-width: 0; }
  .cmh-float {
    position: relative;
  }
  .cmh-float label {
    display: block;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${TEXT_MUTED};
    margin-bottom: 7px;
  }
  .cmh-input-wrap { position: relative; }
  .cmh-float input {
    width: 100%; padding: 12px 14px 12px 40px;
    border-radius: 12px; border: 1.5px solid ${BORDER};
    background: ${CARD}; color: ${TEXT};
    font-family: inherit; font-size: 13.5px; font-weight: 600; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cmh-float input::placeholder { color: ${TEXT_MUTED}; opacity: 0.55; font-weight: 400; }
  .cmh-float input:focus { border-color: ${MAROON}; box-shadow: 0 0 0 4px ${MAROON_SOFT}; }
  .cmh-float input.err { border-color: ${DANGER}; }
  .cmh-float svg.field-icon {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    color: ${TEXT_MUTED}; pointer-events: none;
    transition: color 0.15s;
  }
  .cmh-float input:focus ~ svg.field-icon { color: ${MAROON}; }
  .cmh-err { color: ${DANGER}; font-size: 11px; margin-top: 5px; font-weight: 600; }
  .cmh-api-err {
    display: flex; align-items: flex-start; gap: 8px;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    border-radius: 10px; padding: 10px 13px; color: #b91c1c; font-size: 12px;
    margin-bottom: 14px; line-height: 1.5;
  }

  .cmh-modal-footer { margin-top: 10px; padding-top: 4px; display: flex; gap: 10px; }
  .cmh-btn-submit {
    flex: 1; padding: 13px; border-radius: 12px; border: none;
    background: ${MAROON}; color: #fff;
    font-family: inherit; font-size: 14px; font-weight: 800;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.16s, transform 0.12s;
    box-shadow: 0 8px 18px rgba(122,0,0,0.24);
  }
  .cmh-btn-submit:hover { background: ${MAROON_MID}; transform: translateY(-1px); }
  .cmh-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .cmh-btn-cancel {
    padding: 13px 20px; border-radius: 12px; border: 1.5px solid ${BORDER};
    background: ${CARD}; color: ${TEXT}; font-family: inherit; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: border-color 0.14s, background 0.14s;
  }
  .cmh-btn-cancel:hover { border-color: ${MAROON}; background: ${MAROON_SOFT}; }

  .cmh-modal-created {
    display: flex; align-items: center; gap: 6px;
    font-size: 11.5px; color: ${TEXT_MUTED}; margin-bottom: 16px; font-weight: 600;
  }

  .cmh-major-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
  .cmh-major-row input {
    flex: 1; padding: 10px 13px; border-radius: 10px; border: 1.5px solid ${BORDER};
    background: ${CARD}; font-family: inherit; font-size: 13px; color: ${TEXT}; outline: none;
    transition: border-color 0.14s;
  }
  .cmh-major-row input:focus { border-color: ${MAROON}; }
  .cmh-major-remove {
    width: 30px; height: 30px; border-radius: 8px; border: 1px solid ${BORDER};
    background: ${CARD}; color: ${TEXT_MUTED}; display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0; transition: background 0.14s, color 0.14s;
  }
  .cmh-major-remove:hover { background: rgba(239,68,68,0.10); color: ${DANGER}; }
  .cmh-majors-loading {
    font-size: 12.5px; color: ${TEXT_MUTED}; font-weight: 600;
    padding: 10px 2px;
  }

  /* ── Confirm dialog ──────────────────────────────────────────────────── */
  .cmh-confirm {
    background: ${BG}; border-radius: 20px; width: 380px; max-width: 100%;
    padding: 26px 26px 22px; box-shadow: 0 30px 70px rgba(40,0,0,0.35);
    text-align: center;
  }
  .cmh-confirm-icon {
    width: 54px; height: 54px; border-radius: 16px; margin: 0 auto 14px;
    background: rgba(239,68,68,0.10); color: ${DANGER};
    display: flex; align-items: center; justify-content: center;
  }
  .cmh-confirm-title { font-size: 15.5px; font-weight: 800; color: ${TEXT}; margin-bottom: 6px; }
  .cmh-confirm-sub { font-size: 12.5px; color: ${TEXT_MUTED}; line-height: 1.6; margin-bottom: 20px; }
  .cmh-confirm-btns { display: flex; gap: 10px; }
  .cmh-confirm-btns button { flex: 1; }
  .cmh-btn-danger {
    padding: 12px; border-radius: 12px; border: none; background: ${DANGER}; color: #fff;
    font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer;
    transition: background 0.15s, transform 0.12s;
  }
  .cmh-btn-danger:hover { background: #dc2626; transform: translateY(-1px); }

  /* ── Toast ───────────────────────────────────────────────────────────── */
  .cmh-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    border-radius: 14px; padding: 13px 20px;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 600; color: ${TEXT};
    box-shadow: 0 14px 34px rgba(40,0,0,0.22);
    background: ${CARD}; border: 1px solid ${BORDER};
    max-width: 380px;
  }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 1180px) {
    .cmh-stats-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 860px) {
    .cmh-hero { padding: 26px 22px 22px; }
    .cmh-hero-title { font-size: 22px; }
    .cmh-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .cmh-info-panel { padding: 18px; }
  }
  @media (max-width: 640px) {
    .cmh-hero-right { width: 100%; }
    .cmh-hero-right .cmh-btn-primary { width: 100%; justify-content: center; }
    .cmh-field-row { flex-direction: column; gap: 0; }
    .cmh-modal-wide { width: 100%; }
    .cmh-table thead th:nth-child(4), .cmh-table tbody td:nth-child(4) { display: none; }
    .cmh-campus-card { flex: 0 0 200px; }
  }
  @media (max-width: 480px) {
    .cmh-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .cmh-table thead th:nth-child(1), .cmh-table tbody td:nth-child(1) { display: none; }
    .cmh-hero-title { font-size: 19px; }
    .cmh-hero-icon { width: 34px; height: 34px; }
  }
`;

/* ─── Small presentational helpers ───────────────────────────────────────── */

function CodeBadge({ code }) {
  const c = badgeColorFor(code || '');
  return (
    <span className="cmh-code-badge" style={{ background: c.bg, color: c.fg }}>
      {code}
    </span>
  );
}

function IconBtn({ className, title, onClick, children }) {
  return (
    <button className={`cmh-icon-btn ${className}`} onClick={onClick} aria-label={title}>
      {children}
      <span className="cmh-tooltip">{title}</span>
    </button>
  );
}

function StatCard({ icon, value, label, tint, delay = 0 }) {
  return (
    <motion.div
      className="cmh-stat-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="cmh-stat-icon" style={{ background: tint.bg, color: tint.fg }}>
        {icon}
      </div>
      <div>
        <div className="cmh-stat-value">{value}</div>
        <div className="cmh-stat-label">{label}</div>
      </div>
    </motion.div>
  );
}

function Skeleton({ w, h, style }) {
  return <div className="cmh-shimmer" style={{ width: w, height: h, ...style }} />;
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading campus data">
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, overflow: 'hidden' }}>
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} w={232} h={168} style={{ borderRadius: 18, flexShrink: 0 }} />
        ))}
      </div>
      <Skeleton w="100%" h={92} style={{ borderRadius: 20, marginBottom: 24 }} />
      <div className="cmh-stats-grid">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} h={76} style={{ borderRadius: 16 }} />
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Skeleton w="100%" h={280} style={{ borderRadius: 18 }} />
      </div>
    </div>
  );
}

function EmptyState({ hasCampuses, onAddCampus, onAddCourse, type = 'campus' }) {
  if (type === 'courses') {
    return (
      <div className="cmh-empty">
        <div className="cmh-empty-illus"><BookOpen size={34} strokeWidth={1.6} /></div>
        <div className="cmh-empty-title">No programs found</div>
        <div className="cmh-empty-sub">This campus doesn't have any colleges or programs yet. Add the first one to get started.</div>
        <button className="cmh-btn-maroon" onClick={onAddCourse}>
          <Plus size={15} /> Add Course
        </button>
      </div>
    );
  }
  return (
    <div className="cmh-empty">
      <div className="cmh-empty-illus"><Check size={30} strokeWidth={1.8} /></div>
      <div className="cmh-empty-title">{hasCampuses ? 'Select a campus' : 'No campuses yet'}</div>
      <div className="cmh-empty-sub">
        {hasCampuses
          ? 'Choose a campus above to view its colleges, programs and statistics.'
          : 'Create your first campus to start organizing colleges and programs.'}
      </div>
      {!hasCampuses && (
        <button className="cmh-btn-maroon" onClick={onAddCampus}>
          <Plus size={15} /> Add Campus
        </button>
      )}
    </div>
  );
}

/* ─── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ msg, isErr }) {
  return (
    <motion.div
      className="cmh-toast"
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      style={{ borderColor: isErr ? 'rgba(239,68,68,0.35)' : BORDER }}
    >
      {isErr
        ? <AlertTriangle size={16} color={DANGER} style={{ flexShrink: 0 }} />
        : <CheckCircle2 size={16} color={SUCCESS} style={{ flexShrink: 0 }} />}
      {msg}
    </motion.div>
  );
}

/* ─── Confirm dialog ──────────────────────────────────────────────────────
   Replaces window.confirm with an on-brand modal. Same guard logic as before:
   nothing runs unless the person explicitly confirms.
─────────────────────────────────────────────────────────────────────────── */
function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div className="cmh-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <motion.div
        className="cmh-confirm"
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        transition={{ duration: 0.18 }}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="cmh-confirm-icon"><AlertTriangle size={24} /></div>
        <div className="cmh-confirm-title">{title}</div>
        <div className="cmh-confirm-sub">{message}</div>
        <div className="cmh-confirm-btns">
          <button className="cmh-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="cmh-btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Context menu ────────────────────────────────────────────────────────── */
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

  const safeX = Math.min(x, window.innerWidth  - 215);
  const safeY = Math.min(y, window.innerHeight - 210);

  return (
    <motion.div
      ref={ref}
      className="cmh-ctx"
      style={{ top: safeY, left: safeX }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
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

/* ─── Logo upload helpers (unchanged logic) ─────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function resolveLogoUrl(file, pathPrefix) {
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
  return fileToBase64(file);
}

/* ─── Labeled input (static label above field — no placeholder overlap) ─── */
function FloatField({ icon, label, value, onChange, error, placeholder, maxLength, uppercase }) {
  return (
    <div className="cmh-float">
      <label>{label}</label>
      <div className="cmh-input-wrap">
        <input
          className={error ? 'err' : ''}
          value={value}
          onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
        />
        <span className="field-icon">{icon}</span>
      </div>
      {error && <div className="cmh-err">{error}</div>}
    </div>
  );
}

/* ─── Campus Modal (Add / Edit) — same save/validate logic as before ────── */
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
    if (isEdit) {
      ({ error: err } = await supabaseAdmin.from('campuses').update(payloadWithLogo).eq('id', campus.id));
    } else {
      ({ error: err } = await supabaseAdmin.from('campuses').insert({ ...payloadWithLogo, is_active: true }));
    }

    if (err && err.message?.toLowerCase().includes('logo_url')) {
      if (isEdit) {
        ({ error: err } = await supabaseAdmin.from('campuses').update(basePayload).eq('id', campus.id));
      } else {
        ({ error: err } = await supabaseAdmin.from('campuses').insert({ ...basePayload, is_active: true }));
      }
      if (!err) {
        setSave(false);
        setApi('Saved, but the campus logo was not stored — add a "logo_url" text column to your campuses table in Supabase.');
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
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
        role="dialog" aria-modal="true"
      >
        <div className="cmh-modal-hdr">
          <div className="cmh-modal-hdr-icon"><Landmark size={18} /></div>
          <div>
            <div className="cmh-modal-hdr-title">{isEdit ? 'Edit Campus' : 'Add New Campus'}</div>
            <div className="cmh-modal-hdr-sub">{isEdit ? campus.campus_name : 'Create a campus workspace'}</div>
          </div>
          {isEdit && (
            <button className="cmh-modal-hdr-del" title="Delete campus" onClick={() => onDelete?.(campus)}>
              <Trash2 size={15} />
            </button>
          )}
          <button className="cmh-modal-hdr-close" style={{ marginLeft: isEdit ? 8 : 'auto' }} onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="cmh-modal-body">
          {isEdit && (
            <div className="cmh-modal-created">
              <Calendar size={13} />
              Created {campus.created_at
                ? new Date(campus.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                : '—'}
            </div>
          )}

          <div className="cmh-logo-circle-wrap">
            <label className="cmh-logo-circle">
              {logoPreview
                ? <img src={logoPreview} alt="Campus logo" />
                : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="1.8">
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

            {isEdit && (
              <div className={`cmh-active-pill${isActive ? '' : ' off'}`} onClick={() => setActive(a => !a)}>
                <span className={`cmh-active-dot${isActive ? '' : ' off'}`} />
                <span className={`cmh-active-text${isActive ? '' : ' off'}`}>{isActive ? 'Active' : 'Inactive'}</span>
              </div>
            )}
          </div>

          <div className="cmh-section-label"><Building2 size={12} />Campus Details</div>

          <div className="cmh-field">
            <FloatField
              icon={<Landmark size={16} />}
              label="Campus Name"
              value={form.campus_name}
              onChange={v => set('campus_name', v)}
              error={errs.campus_name}
              placeholder="e.g. Sto. Tomas"
            />
          </div>

          <div className="cmh-field">
            <FloatField
              icon={<MapPin size={16} />}
              label="Campus Code"
              value={form.campus_code}
              onChange={v => set('campus_code', v)}
              error={errs.campus_code}
              placeholder="e.g. PSTC"
              maxLength={6}
              uppercase
            />
          </div>

          {apiErr && <div className="cmh-api-err"><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{apiErr}</div>}

          <div className="cmh-modal-footer">
            <button className="cmh-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="cmh-btn-submit" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : (<><Plus size={15} />{isEdit ? 'Save Changes' : 'Add Campus'}</>)}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Course Modal (Add / Edit) — same save/validate logic as before ────── */
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
  // Each draft: { id: existing major's id or null for a new/unsaved one, name }
  const [majorDrafts, setMajorDrafts] = useState(isEdit ? [] : [{ id: null, name: '' }, { id: null, name: '' }]);
  const [majorsLoading, setMajorsLoading] = useState(isEdit);
  const [removedMajorIds, setRemovedMajorIds] = useState([]);
  const [errs, setErrs]   = useState({});
  const [saving, setSave] = useState(false);
  const [apiErr, setApi]  = useState('');

  // Load this program's existing majors so they can be viewed/edited/removed.
  useEffect(() => {
    if (!isEdit || !program?.id) return;
    let cancelled = false;
    (async () => {
      setMajorsLoading(true);
      const { data } = await supabaseAdmin
        .from('majors')
        .select('id, major_name')
        .eq('program_id', program.id)
        .order('major_name');
      if (cancelled) return;
      const existing = (data || []).map(m => ({ id: m.id, name: m.major_name }));
      setMajorDrafts(existing.length ? existing : [{ id: null, name: '' }]);
      setMajorsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isEdit, program?.id]);

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

    const majors = majorDrafts.map(m => ({ id: m.id, name: m.name.trim() })).filter(m => m.name);

    // New majors (no id yet) → insert
    const toInsert = majors.filter(m => !m.id).map(m => ({ program_id: newProgId, major_name: m.name }));
    if (toInsert.length && newProgId) {
      await supabaseAdmin.from('majors').insert(toInsert);
    }
    // Existing majors → update name if it changed
    const toUpdate = majors.filter(m => m.id);
    for (const m of toUpdate) {
      await supabaseAdmin.from('majors').update({ major_name: m.name }).eq('id', m.id);
    }
    // Majors removed from the list while editing → delete
    if (removedMajorIds.length) {
      await supabaseAdmin.from('majors').delete().in('id', removedMajorIds);
    }

    setSave(false);
    onSaved();
  };

  return (
    <div className="cmh-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="cmh-modal cmh-modal-wide"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
        role="dialog" aria-modal="true"
      >
        <div className="cmh-modal-hdr">
          <div className="cmh-modal-hdr-icon"><BookOpen size={18} /></div>
          <div>
            <div className="cmh-modal-hdr-title">{isEdit ? 'Edit Course' : 'Add New Course'}</div>
            <div className="cmh-modal-hdr-sub">College &amp; program details</div>
          </div>
          <button className="cmh-modal-hdr-close" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="cmh-modal-body">
          <div className="cmh-section-label"><School size={12} />College</div>
          <div className="cmh-field-row">
            <div className="cmh-field">
              <FloatField
                icon={<School size={16} />}
                label="College Name"
                value={form.college_name}
                onChange={v => set('college_name', v)}
                error={errs.college_name}
                placeholder="e.g. College of Computing Studies"
              />
            </div>
            <div className="cmh-field" style={{ maxWidth: 150 }}>
              <FloatField
                icon={<MapPin size={16} />}
                label="College Code"
                value={form.college_code}
                onChange={v => set('college_code', v)}
                error={errs.college_code}
                placeholder="e.g. CCS"
                maxLength={8}
                uppercase
              />
            </div>
          </div>

          <div className="cmh-section-label"><GraduationCap size={12} />Program</div>
          <div className="cmh-field-row">
            <div className="cmh-field">
              <FloatField
                icon={<BookOpen size={16} />}
                label="Course Name"
                value={form.program_name}
                onChange={v => set('program_name', v)}
                error={errs.program_name}
                placeholder="e.g. Bachelor of Science in Information Technology"
              />
            </div>
            <div className="cmh-field" style={{ maxWidth: 150 }}>
              <FloatField
                icon={<MapPin size={16} />}
                label="Course Code"
                value={form.program_code}
                onChange={v => set('program_code', v)}
                error={errs.program_code}
                placeholder="e.g. BSIT"
                maxLength={12}
                uppercase
              />
            </div>
          </div>

          <div className="cmh-field">
            <div className="cmh-section-label" style={{ marginTop: 20 }}>
              <Folder size={12} />Majors (Optional)
            </div>
            {majorsLoading ? (
              <div className="cmh-majors-loading">Loading majors…</div>
            ) : (
              <>
                {majorDrafts.map((m, i) => (
                  <div className="cmh-major-row" key={m.id ?? `new-${i}`}>
                    <input
                      value={m.name}
                      onChange={e => setMajorDrafts(d => d.map((v, j) => j === i ? { ...v, name: e.target.value } : v))}
                      placeholder={`Major ${i + 1} name`}
                    />
                    {majorDrafts.length > 1 && (
                      <button
                        className="cmh-major-remove"
                        type="button"
                        title="Remove"
                        onClick={() => {
                          if (m.id) setRemovedMajorIds(ids => [...ids, m.id]);
                          setMajorDrafts(d => d.filter((_, j) => j !== i));
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="cmh-btn-ghost"
                  type="button"
                  onClick={() => setMajorDrafts(d => [...d, { id: null, name: '' }])}
                  style={{ marginTop: 4 }}
                >
                  <Plus size={13} /> Add Major
                </button>
              </>
            )}
          </div>

          {apiErr && <div className="cmh-api-err" style={{ marginTop: 16 }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{apiErr}</div>}

          <div className="cmh-modal-footer">
            <button className="cmh-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="cmh-btn-submit" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : (<><Plus size={15} />{isEdit ? 'Save Changes' : 'Add Course'}</>)}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Course View Modal (read-only) ──────────────────────────────────────── */
function CourseViewModal({ row, onClose }) {
  const { college, program } = row;
  return (
    <div className="cmh-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="cmh-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
      >
        <div className="cmh-modal-hdr">
          <div className="cmh-modal-hdr-icon"><Eye size={18} /></div>
          <div>
            <div className="cmh-modal-hdr-title">Program Details</div>
            <div className="cmh-modal-hdr-sub">Read-only overview</div>
          </div>
          <button className="cmh-modal-hdr-close" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="cmh-modal-body">
          <div className="cmh-section-label"><School size={12} />College</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{college.college_name}</span>
            <CodeBadge code={college.college_code} />
          </div>

          <div className="cmh-section-label"><GraduationCap size={12} />Program</div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{program.program_name}</div>
            <CodeBadge code={program.program_code} />
          </div>

          <div className="cmh-modal-created" style={{ marginTop: 16 }}>
            <Calendar size={13} />
            Added {program.created_at
              ? new Date(program.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
              : '—'}
          </div>

          <div className="cmh-modal-footer" style={{ marginTop: 6 }}>
            <button className="cmh-btn-submit" onClick={onClose}>Close</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Campus Card ─────────────────────────────────────────────────────────── */
function CampusCard({ campus, selected, isMain, collegeCount, programCount, onSelect, onMore }) {
  return (
    <motion.div
      className={['cmh-campus-card', selected ? 'sel' : '', !campus.is_active ? 'inactive' : ''].join(' ')}
      onClick={() => onSelect(campus)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(campus)}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`Select ${campus.campus_name} campus`}
      layout
    >
      <div className="cmh-campus-card-top">
        <div className="cmh-campus-logo">
          {campus.logo_url
            ? <img src={campus.logo_url} alt="" onError={ev => { ev.currentTarget.style.display = 'none'; }} />
            : <Building2 size={22} color={MAROON} />}
        </div>
      </div>

      <div className="cmh-campus-name">{campus.campus_name}</div>
    </motion.div>
  );
}

/* ─── Campus Carousel ─────────────────────────────────────────────────────
   Continuously auto-scrolling strip (the original "running" carousel),
   rebuilt on the new premium card design. The list is tripled so the
   marquee can loop seamlessly; hovering — or focusing a card via keyboard —
   pauses it, and the side arrows nudge it with a smooth easing transition.
─────────────────────────────────────────────────────────────────────────── */
function CampusCarousel({ campuses, colleges, programs, selectedId, onSelect, onMore }) {
  const trackRef  = useRef(null);
  const offsetRef = useRef(0);
  const rafRef    = useRef(null);
  const pausedRef = useRef(false);

  const loopList = campuses.length ? [...campuses, ...campuses, ...campuses] : [];

  /* Auto-scroll: continuous, ~30px/sec, pauses on hover/focus/nudge */
  useEffect(() => {
    if (!campuses.length) return undefined;
    offsetRef.current = 0;
    if (trackRef.current) trackRef.current.style.transform = 'translateX(0px)';

    const speed = 0.5; // px per frame
    const step = () => {
      const el = trackRef.current;
      if (el && !pausedRef.current) {
        offsetRef.current -= speed;
        const third = el.scrollWidth / 3;
        if (third > 0 && Math.abs(offsetRef.current) >= third) offsetRef.current = 0;
        el.style.transform = `translateX(${offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [campuses.length]);

  const nudge = (dir) => {
    pausedRef.current = true;
    offsetRef.current += dir * 260;
    const el = trackRef.current;
    if (el) {
      el.style.transition = 'transform 0.6s cubic-bezier(0.22,1,0.36,1)';
      el.style.transform  = `translateX(${offsetRef.current}px)`;
    }
    window.setTimeout(() => {
      if (trackRef.current) trackRef.current.style.transition = '';
      pausedRef.current = false;
    }, 620);
  };

  const countsFor = (campusId) => {
    const collegeIds = colleges.filter(c => c.campus_id === campusId).map(c => c.id);
    const collegeSet = new Set(collegeIds);
    const programCount = programs.filter(p => collegeSet.has(p.college_id)).length;
    return { collegeCount: collegeIds.length, programCount };
  };

  const mainId = campuses[0]?.id;

  return (
    <div>
      <div className="cmh-selector-head">
        <div className="cmh-selector-title"><MapPin size={14} />Campuses ({campuses.length})</div>
      </div>

      {!campuses.length ? (
        <div className="cmh-carousel-empty">No campuses yet. Click "Add Campus" above to get started.</div>
      ) : (
        <div
          className="cmh-carousel-wrap"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onFocus={() => { pausedRef.current = true; }}
          onBlur={() => { pausedRef.current = false; }}
        >
          <button className="cmh-carousel-arrow l" onClick={() => nudge(1)} aria-label="Scroll left">
            <ChevronLeft size={16} />
          </button>

          <div className="cmh-carousel-track-outer">
            <div className="cmh-carousel-track" ref={trackRef}>
              {loopList.map((c, idx) => {
                const { collegeCount, programCount } = countsFor(c.id);
                return (
                  <CampusCard
                    key={`${c.id}-${idx}`}
                    campus={c}
                    selected={selectedId === c.id}
                    isMain={c.id === mainId}
                    collegeCount={collegeCount}
                    programCount={programCount}
                    onSelect={onSelect}
                    onMore={onMore}
                  />
                );
              })}
            </div>
          </div>

          <button className="cmh-carousel-arrow r" onClick={() => nudge(-1)} aria-label="Scroll right">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 8;

export default function CampusManagementHub() {
  const [campuses, setCampuses] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [majors, setMajors]     = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [selectedId, setSelectedId] = useState(() => {
    try { return localStorage.getItem('librascan_selected_campus') || null; } catch { return null; }
  });
  const [modal,   setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm }
  const [ctxMenu, setCtxMenu] = useState(null);
  const [toast,   setToast]   = useState({ msg: '', isErr: false });
  const [viewRow, setViewRow] = useState(null);

  const [search, setSearch]   = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [sortBy, setSortBy]   = useState('newest');
  const [page, setPage]       = useState(1);

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast({ msg: '', isErr: false }), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: caData }, { data: coData }, { data: pData }, { data: maData }, { data: stData }] = await Promise.all([
      supabaseAdmin.from('campuses').select('*').order('campus_name'),
      supabaseAdmin.from('colleges').select('*').order('college_name'),
      supabaseAdmin.from('programs').select('*').order('program_name'),
      supabaseAdmin.from('majors').select('id, program_id'),
      supabaseAdmin.from('profiles').select('id, campus_id').eq('role', 'student'),
    ]);
    setCampuses(caData || []);
    setColleges(coData || []);
    setPrograms(pData  || []);
    setMajors(maData   || []);
    setStudents(stData || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    try {
      if (selectedId) localStorage.setItem('librascan_selected_campus', selectedId);
    } catch { /* storage unavailable — ignore */ }
  }, [selectedId]);

  /* If the remembered campus no longer exists, clear the selection */
  useEffect(() => {
    if (!loading && selectedId && campuses.length && !campuses.some(c => c.id === selectedId)) {
      setSelectedId(null);
    }
  }, [loading, campuses, selectedId]);

  const selectedCampus = useMemo(
    () => campuses.find(c => c.id === selectedId) || null,
    [campuses, selectedId]
  );

  const campusColleges = useMemo(() => {
    if (!selectedCampus) return [];
    return colleges.filter(c => c.campus_id === selectedCampus.id);
  }, [colleges, selectedCampus]);

  const allCourseRows = useMemo(() => {
    if (!selectedCampus) return [];
    const campusCollegeIds = new Set(campusColleges.map(c => c.id));
    return programs
      .filter(p => campusCollegeIds.has(p.college_id))
      .map(p => ({ program: p, college: colleges.find(c => c.id === p.college_id) }))
      .filter(r => r.college);
  }, [colleges, programs, selectedCampus, campusColleges]);

  const majorCount = useMemo(() => {
    if (!selectedCampus) return 0;
    const campusProgramIds = new Set(allCourseRows.map(r => r.program.id));
    return majors.filter(m => campusProgramIds.has(m.program_id)).length;
  }, [majors, allCourseRows, selectedCampus]);

  const studentCount = useMemo(() => {
    if (!selectedCampus) return 0;
    return students.filter(s => s.campus_id === selectedCampus.id).length;
  }, [students, selectedCampus]);

  const filteredCourseRows = useMemo(() => {
    let rows = allCourseRows;
    if (collegeFilter !== 'all') rows = rows.filter(r => r.college.id === collegeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        r.program.program_name.toLowerCase().includes(q) ||
        r.program.program_code.toLowerCase().includes(q) ||
        r.college.college_name.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'az') return a.program.program_name.localeCompare(b.program.program_name);
      if (sortBy === 'za') return b.program.program_name.localeCompare(a.program.program_name);
      const at = a.program.created_at ? new Date(a.program.created_at).getTime() : 0;
      const bt = b.program.created_at ? new Date(b.program.created_at).getTime() : 0;
      return sortBy === 'oldest' ? at - bt : bt - at;
    });
    return rows;
  }, [allCourseRows, collegeFilter, search, sortBy]);

  useEffect(() => { setPage(1); }, [search, collegeFilter, sortBy, selectedId]);

  const totalPages = Math.max(1, Math.ceil(filteredCourseRows.length / PAGE_SIZE));
  const pagedRows = filteredCourseRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const closeModal = () => setModal(null);
  const handleSaved = (msg) => { closeModal(); showToast(msg); load(); };

  /* ── Campus actions (unchanged Supabase logic) ─────────────────────────── */
  const toggleActive = async (campus) => {
    const { error } = await supabaseAdmin
      .from('campuses')
      .update({ is_active: !campus.is_active })
      .eq('id', campus.id);
    if (error) return showToast(error.message, true);
    showToast(`${campus.campus_name} ${!campus.is_active ? 'activated' : 'deactivated'}.`);
    load();
  };

  const deleteCampus = (campus) => {
    setConfirm({
      title: `Delete "${campus.campus_name}"?`,
      message: 'All colleges, programs and majors under this campus will also be removed. This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabaseAdmin.from('campuses').delete().eq('id', campus.id);
        if (error) return showToast(error.message, true);
        if (selectedId === campus.id) setSelectedId(null);
        showToast(`${campus.campus_name} deleted.`);
        closeModal();
        load();
      },
    });
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

  /* ── Course actions (unchanged Supabase logic) ─────────────────────────── */
  const deleteCourse = (row) => {
    setConfirm({
      title: `Delete "${row.program.program_name}"?`,
      message: 'This program and its majors will be permanently removed.',
      onConfirm: async () => {
        setConfirm(null);
        const { error: pErr } = await supabaseAdmin.from('programs').delete().eq('id', row.program.id);
        if (pErr) return showToast(pErr.message, true);
        const { count } = await supabaseAdmin
          .from('programs')
          .select('id', { count: 'exact', head: true })
          .eq('college_id', row.college.id);
        if (!count) await supabaseAdmin.from('colleges').delete().eq('id', row.college.id);
        showToast('Course deleted.');
        load();
      },
    });
  };

  const duplicateCourse = async (row) => {
    const base = row.program.program_code || 'PRG';
    const { error } = await supabaseAdmin.from('programs').insert({
      college_id: row.college.id,
      program_name: `${row.program.program_name} (Copy)`,
      program_code: `${base}2`.slice(0, 12),
    });
    if (error) return showToast(error.message, true);
    showToast('Course duplicated.');
    load();
  };

  const contextItems = (campus) => [
    { icon: <Pencil size={13} />, label: 'Edit Campus', onClick: () => setModal({ type: 'campus', data: campus }) },
    { icon: <Copy size={13} />, label: 'Duplicate Campus', onClick: () => duplicateCampus(campus) },
    {
      icon: campus.is_active ? <Ban size={13} /> : <CheckCircle2 size={13} />,
      label: campus.is_active ? 'Disable Campus' : 'Enable Campus',
      onClick: () => toggleActive(campus),
    },
    { sep: true },
    { icon: <Trash2 size={13} />, label: 'Delete Campus', danger: true, onClick: () => deleteCampus(campus) },
  ];

  return (
    <div className="cmh">
      <style>{CSS}</style>

      {/* Hero header */}
      <div className="cmh-hero">
        {selectedCampus && <div className="cmh-hero-bar" />}
        <div className="cmh-hero-left">
          <div className="cmh-hero-title">
            <span className="cmh-hero-icon"><Landmark size={22} /></span>
            Campus Management
          </div>
          <div className="cmh-hero-sub">
            Manage all Pampanga State University campuses, colleges, degree programs and majors from one centralized workspace.
          </div>
        </div>
        <div className="cmh-hero-right">
          <button className="cmh-btn-primary" onClick={() => setModal({ type: 'campus', data: null })}>
            <Plus size={16} /> Add Campus
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Campus carousel (auto-scrolling) */}
          <CampusCarousel
            campuses={campuses}
            colleges={colleges}
            programs={programs}
            selectedId={selectedId}
            onSelect={c => setSelectedId(c.id)}
            onMore={(e, c) => setCtxMenu({ x: e.clientX, y: e.clientY, campus: c })}
          />

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

          {!selectedCampus ? (
            <div className="cmh-table-wrap">
              <div className="cmh-emptybar" />
              <EmptyState hasCampuses={campuses.length > 0} onAddCampus={() => setModal({ type: 'campus', data: null })} />
            </div>
          ) : (
            <>
              {/* Campus information panel */}
              <motion.div
                className="cmh-info-panel"
                key={selectedCampus.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="cmh-info-left">
                  <div className="cmh-info-logo">
                    {selectedCampus.logo_url
                      ? <img src={selectedCampus.logo_url} alt="" />
                      : <Building2 size={26} color={MAROON} />}
                  </div>
                  <div>
                    <div className="cmh-info-name-row">
                      <span className="cmh-info-name">{selectedCampus.campus_name}</span>
                      {selectedCampus.id === campuses[1]?.id && <span className="cmh-main-badge">Main Campus</span>}
                    </div>
                    <div className="cmh-info-meta">
                      <span className="cmh-info-meta-item"><Calendar size={13} />
                        Created {selectedCampus.created_at
                          ? new Date(selectedCampus.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short' })
                          : '—'}
                      </span>
                      <span className="cmh-info-meta-item"><School size={13} />{campusColleges.length} Colleges</span>
                      <span className="cmh-info-meta-item"><GraduationCap size={13} />{allCourseRows.length} Programs</span>
                      <span className="cmh-info-meta-item">
                        <span className={`cmh-status-dot${selectedCampus.is_active ? '' : ' off'}`} />
                        {selectedCampus.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="cmh-info-right">
                  <button className="cmh-btn-ghost" onClick={() => setModal({ type: 'campus', data: selectedCampus })}>
                    <Pencil size={13} /> Edit Campus
                  </button>
                </div>
              </motion.div>

              {/* Statistics */}
              <div className="cmh-stats-grid">
                <StatCard
                  icon={<School size={19} />}
                  value={campusColleges.length}
                  label="Total Colleges"
                  tint={{ bg: 'rgba(122,0,0,0.08)', fg: MAROON }}
                  delay={0}
                />
                <StatCard
                  icon={<GraduationCap size={19} />}
                  value={allCourseRows.length}
                  label="Total Programs / Courses"
                  tint={{ bg: 'rgba(212,175,55,0.16)', fg: GOLD_DEEP }}
                  delay={0.03}
                />
                <StatCard
                  icon={<Folder size={19} />}
                  value={majorCount}
                  label="Total Majors"
                  tint={{ bg: 'rgba(59,130,246,0.12)', fg: BLUE }}
                  delay={0.06}
                />
                <StatCard
                  icon={<Users size={19} />}
                  value={studentCount}
                  label="Students"
                  tint={{ bg: 'rgba(147,51,234,0.10)', fg: '#7A2CC7' }}
                  delay={0.09}
                />
              </div>

              {/* Toolbar: search + filters + add course */}
              <div className="cmh-toolbar">
                <div className="cmh-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search colleges or programs..."
                    aria-label="Search colleges or programs"
                  />
                </div>

                <select
                  className="cmh-select"
                  value={collegeFilter}
                  onChange={e => setCollegeFilter(e.target.value)}
                  aria-label="Filter by college"
                >
                  <option value="all">All Colleges</option>
                  {campusColleges.map(c => (
                    <option key={c.id} value={c.id}>{c.college_name}</option>
                  ))}
                </select>

                <select
                  className="cmh-select"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  aria-label="Sort programs"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>

                <button
                  className="cmh-btn-maroon"
                  onClick={() => setModal({ type: 'course', data: null, campusId: selectedCampus.id })}
                  style={{ marginLeft: 'auto' }}
                >
                  <Plus size={15} /> Add Course
                </button>
              </div>

              {/* Course table */}
              <div className="cmh-table-wrap">
                {filteredCourseRows.length === 0 ? (
                  <EmptyState
                    type="courses"
                    onAddCourse={() => setModal({ type: 'course', data: null, campusId: selectedCampus.id })}
                  />
                ) : (
                  <>
                    <div className="cmh-table-scroll">
                      <table className="cmh-table">
                        <thead>
                          <tr>
                            <th>College</th>
                            <th>Program</th>
                            <th>Program Code</th>
                            <th>Created</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedRows.map(row => (
                            <tr key={row.program.id}>
                              <td>{row.college.college_name}</td>
                              <td style={{ fontWeight: 700 }}>{row.program.program_name}</td>
                              <td><CodeBadge code={row.program.program_code} /></td>
                              <td>
                                {row.program.created_at
                                  ? new Date(row.program.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                                  : '—'}
                              </td>
                              <td>
                                <div className="cmh-status-dot-row">
                                  <span className="cmh-status-dot" />
                                  <span className="cmh-status-text">Active</span>
                                </div>
                              </td>
                              <td>
                                <div className="cmh-row-actions">

                                  <IconBtn className="edit" title="Edit" onClick={() => setModal({ type: 'course', data: row, campusId: selectedCampus.id })}>
                                    <Pencil size={14} />
                                  </IconBtn>

                                  <IconBtn className="del" title="Delete" onClick={() => deleteCourse(row)}>
                                    <Trash2 size={14} />
                                  </IconBtn>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="cmh-pagination">
                        <div className="cmh-pagination-info">
                          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCourseRows.length)} of {filteredCourseRows.length}
                        </div>
                        <div className="cmh-pagination-btns">
                          <button className="cmh-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                            <ChevronLeft size={14} />
                          </button>
                          <button className="cmh-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">
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
        </>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast.msg && <Toast msg={toast.msg} isErr={toast.isErr} />}
      </AnimatePresence>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            title={confirm.title}
            message={confirm.message}
            onConfirm={confirm.onConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}
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
        {viewRow && <CourseViewModal row={viewRow} onClose={() => setViewRow(null)} />}
      </AnimatePresence>
    </div>
  );
}