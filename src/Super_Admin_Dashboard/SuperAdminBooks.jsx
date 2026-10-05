import { useState, useEffect, useMemo, cloneElement } from 'react';
import {
  BookOpen, Library, PackageCheck, PackageX, Search, ChevronLeft, ChevronRight,
  Building2, X, Hash, MapPin, User, Layers, Clock, Check, Ban,
  Barcode, Tag, Calendar, FileText, Landmark, Globe, Palette, BookMarked, ZoomIn,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';
import { notifyLibrariansOfRegistration } from './notifyLibrariansOfRegistration';

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

/* ── Abstract helpers (same parsing the Browse Catalog / Book Catalog views use) ── */
function parseAbstractData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { heading: '', paragraphs: [String(parsed)], keywords: [] };
    }
    return parsed;
  } catch {
    return { heading: '', paragraphs: [raw], keywords: [] };
  }
}

// OCR often splits a sentence across several fragments — glue them back together.
function mergeFragmentedParagraphs(paragraphs = [], subheadings = []) {
  const merged = [];
  let buffer = '';
  for (const para of paragraphs) {
    if (subheadings?.includes(para)) {
      if (buffer.trim()) { merged.push(buffer.trim()); buffer = ''; }
      merged.push(para);
      continue;
    }
    const trimmed = (para || '').trim();
    if (!trimmed) continue;
    buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    if (/[.!?:]/.test(buffer.trimEnd().slice(-1))) { merged.push(buffer.trim()); buffer = ''; }
  }
  if (buffer.trim()) merged.push(buffer.trim());
  return merged;
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
const CARD        = '#FDF8F0';
const CREAM       = '#FFF8EF';
const TEXT        = '#3B2A25';
const TEXT_MUTED  = '#8A7368';
const BORDER      = '#E8DDD4';
const SUCCESS     = '#22C55E';
const DANGER      = '#EF4444';
const BLUE        = '#3B82F6';
const ORANGE      = '#F97316';

const PAGE_SIZE = 10;

// Same genre list librarians pick from in Book Catalog — keeps the filter complete even before a genre has any books.
const GENRES = ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Education', 'Others'];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Playfair+Display:wght@500;600;700&display=swap');

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
  .sab-hero-sub { font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED}; max-width: 500px; font-weight: 500; text-align: left; }

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
    background: #FDF8F0; border: 1px solid rgba(139,0,0,0.22); border-radius: 16px;
    padding: 16px 18px 14px; overflow: hidden;
    text-align: center;
    box-shadow: 0 2px 8px rgba(80,0,0,0.08);
    transition: transform 0.18s cubic-bezier(.22,1,.36,1), box-shadow 0.18s, border-color 0.18s;
    animation: sab-rise 0.45s cubic-bezier(.22,1,.36,1) both;
  }
  .sab-stats-grid .sab-stat-card:nth-child(1) { animation-delay: 0.02s; }
  .sab-stats-grid .sab-stat-card:nth-child(2) { animation-delay: 0.06s; }
  .sab-stats-grid .sab-stat-card:nth-child(3) { animation-delay: 0.10s; }
  .sab-stats-grid .sab-stat-card:nth-child(4) { animation-delay: 0.14s; }
  .sab-stats-grid .sab-stat-card:nth-child(5) { animation-delay: 0.18s; }
  .sab-stat-card::before {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
    border-radius: 0 0 16px 16px; background: ${MAROON}; opacity: 1;
  }
  .sab-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 28px rgba(59,42,37,0.09);
    border-color: rgba(122,0,0,0.35);
  }
  .sab-stat-icon {
    position: absolute; top: 12px; right: 12px;
    display: none;
    color: ${MAROON};
    opacity: 0.18;
    pointer-events: none;
    transition: opacity 0.18s;
  }
  .sab-stat-card:hover .sab-stat-icon { opacity: 0.28; }
  .sab-stat-body { min-width: 0; position: relative; z-index: 1; }
  .sab-stat-label { font-size: 11px; font-weight: 800; color: ${TEXT}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .sab-stat-value { font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; color: ${TEXT}; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; margin-bottom: 5px; }
  .sab-stat-sub { font-size: 11.5px; color: ${TEXT_MUTED}; font-weight: 500; opacity: 1; }

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
  .sab-table-wrap { background: #FDF8F0; border: 1px solid ${BORDER}; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 10px rgba(59,42,37,0.04); }
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
  .sab-table tbody tr { transition: background 0.14s; cursor: pointer; }
  .sab-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  /* ── Unified table look: single row colour, maroon text, left aligned ── */
  .sab-table thead th, .sab-table tbody td { text-align: left !important; }
  .sab-table tbody tr td { background: #FDF8F0; color: ${MAROON}; }
  .sab-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  .sab-book-title, .sab-book-author, .sab-copies, .sab-copies span { color: ${MAROON} !important; }
  .sab-code-badge, .sab-genre-badge { color: ${MAROON} !important; }
  .sab-action-cell { justify-content: flex-start !important; }

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
  .sab-skel-stat { height: 96px; border-radius: 16px; }
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

  /* ---------- Book Details modal (matches the student's Browse Catalog popup) ---------- */
  .sab-modal.sab-bd {
    --bd-text: #3A0000; --bd-text2: #5A1010; --bd-muted: #7A3030; --bd-dim: rgba(90,16,16,0.55);
    max-width: 860px; max-height: calc(100vh - 80px);
    display: flex; flex-direction: column; overflow: hidden;
    background: #FDF8F0;
    box-shadow: 0 24px 64px rgba(40,0,0,0.50), 0 0 0 1px rgba(201,168,76,0.10);
  }
  .sab-bd-hdr {
    position: relative; flex-shrink: 0; display: flex; align-items: center; gap: 14px;
    padding: 16px 22px; background: linear-gradient(135deg, ${MAROON_DEEP}, ${MAROON_MID});
    border-bottom: 1px solid rgba(201,168,76,0.35);
  }
  .sab-bd-hdr-ico { display: flex; flex: none; color: #F5E4A8; }
  .sab-bd-hdr-text { flex: 1; min-width: 0; text-align: left; }
  .sab-bd-hdr-title { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600; line-height: 1.15; color: #FFF6DF; }
  .sab-bd-hdr-sub {
    display: flex; align-items: center; gap: 8px; margin-top: 4px;
    font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(245,228,168,0.70);
  }
  .sab-bd-hdr-sub::before { content: ''; flex: none; width: 16px; height: 1px; background: rgba(245,228,168,0.55); }
  .sab-bd-close {
    flex: none; width: 36px; height: 36px; border-radius: 50%;
    background: rgba(245,228,168,0.10); border: 1px solid rgba(245,228,168,0.18);
    color: rgba(245,228,168,0.80); display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.18s;
  }
  .sab-bd-close:hover { background: rgba(245,228,168,0.22); color: #F5E4A8; transform: scale(1.08); }

  .sab-bd-body {
    flex: 1; overflow-y: auto; padding: 16px; text-align: left;
    display: grid; grid-template-columns: minmax(200px, 31%) minmax(0, 1fr); gap: 14px; align-items: start;
    background: #FDF8F0;
  }
  .sab-bd-side, .sab-bd-main { border: 1px solid rgba(139,0,0,0.18); border-radius: 14px; background: rgba(255,255,255,0.55); }
  .sab-bd-side { position: sticky; top: 0; padding: 18px 14px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .sab-bd-cover { position: relative; flex-shrink: 0; width: 82%; aspect-ratio: 160 / 204; }
  .sab-bd-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; border-radius: 3px; filter: drop-shadow(0 6px 10px rgba(50,0,0,0.30)); }
  .sab-bd-cover-ph {
    position: absolute; inset: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, rgba(139,0,0,0.10), rgba(201,168,76,0.06));
    border: 1px solid rgba(139,0,0,0.15); color: var(--bd-dim);
  }
  .sab-bd-scan { width: 100%; }
  .sab-bd-scan-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--bd-dim); margin-bottom: 6px; text-align: left; }
  .sab-bd-scan-frame {
    position: relative; width: 100%; aspect-ratio: 160 / 204; border-radius: 8px; overflow: hidden;
    border: 1px solid rgba(139,0,0,0.18); background: #fff; cursor: zoom-in; padding: 0; display: block;
  }
  .sab-bd-scan-frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .sab-bd-scan-zoom {
    position: absolute; right: 6px; bottom: 6px; width: 26px; height: 26px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; color: #fff;
    background: rgba(90,0,0,0.72); opacity: 0; transition: opacity 0.16s;
  }
  .sab-bd-scan-frame:hover .sab-bd-scan-zoom, .sab-bd-scan-frame:focus-visible .sab-bd-scan-zoom { opacity: 1; }

  .sab-bd-main { padding: 20px 20px 22px; min-width: 0; }
  .sab-bd-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(22px, 2.6vw, 28px); font-weight: 700; line-height: 1.2; color: var(--bd-text); margin: 0 0 6px; }
  .sab-bd-by { font-size: 13.5px; color: var(--bd-text2); }
  .sab-bd-vol { font-size: 12.5px; color: var(--bd-muted); font-style: italic; margin-top: 2px; }
  .sab-bd-await {
    display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700; background: rgba(201,168,76,0.16); color: #8a6d1f; border: 1px solid rgba(201,168,76,0.35);
  }
  .sab-bd-facts {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-top: 16px; padding: 14px 16px;
    border: 1px solid rgba(139,0,0,0.16); border-radius: 12px; background: rgba(255,255,255,0.45);
  }
  .sab-bd-fact { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .sab-bd-fact-ico {
    flex: none; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    color: ${MAROON_DEEP}; background: rgba(255,255,255,0.70); border: 1px solid rgba(139,0,0,0.18); border-radius: 9px;
  }
  .sab-bd-fact-k { font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--bd-dim); }
  .sab-bd-fact-v { margin-top: 1px; font-size: 13px; color: var(--bd-text); overflow-wrap: anywhere; }
  .sab-bd-abs-hd {
    display: flex; align-items: center; gap: 10px; margin: 22px 0 12px;
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--bd-dim);
  }
  .sab-bd-abs-hd svg { flex: none; }
  .sab-bd-abs-hd::after { content: ''; flex: 1; height: 1px; background: rgba(139,0,0,0.16); }
  .sab-bd-abs-title { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; line-height: 1.25; color: var(--bd-text); margin: 0 0 10px; }
  .sab-bd-abs-sub { font-size: 12.5px; font-weight: 700; color: ${MAROON_MID}; letter-spacing: 0.06em; text-transform: uppercase; margin: 16px 0 8px; }
  .sab-bd-abs-p { margin: 0 0 12px; font-size: 13.5px; line-height: 1.75; color: var(--bd-text2); }
  .sab-bd-kw { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 6px; }
  .sab-bd-kw span {
    font-size: 11.5px; padding: 4px 13px; border-radius: 14px; font-style: italic; font-weight: 500;
    background: rgba(139,0,0,0.06); border: 1px solid rgba(139,0,0,0.16); color: ${MAROON_MID};
  }
  .sab-bd-added { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(139,0,0,0.08); font-size: 11px; color: var(--bd-dim); }

  .sab-scan-lightbox {
    position: fixed; inset: 0; z-index: 1100; background: rgba(15,0,0,0.82); backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center; padding: 28px; cursor: zoom-out;
    animation: sab-fade-in 0.18s ease;
  }
  .sab-scan-lightbox img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }

  @media (max-width: 720px) {
    .sab-bd-body { grid-template-columns: 1fr; }
    .sab-bd-side { position: static; }
    .sab-bd-cover { width: 58%; }
    .sab-bd-scan { max-width: 260px; }
    .sab-bd-facts { grid-template-columns: 1fr; }
    .sab-bd-hdr { padding: 14px 16px; }
    .sab-bd-hdr-title { font-size: 20px; }
  }

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

  /* ── Responsive banner: title + badge adapt to every screen width ── */
  .sab-hero { flex-wrap: nowrap; align-items: center; }
  .sab-hero-left { flex: 1 1 0; min-width: 0; }
  .sab-hero-title { font-size: clamp(18px, 1.2vw + 14px, 26px); line-height: 1.25; overflow-wrap: anywhere; }
  .sab-hero-sub { font-size: clamp(12.5px, 0.35vw + 11.5px, 15px); }
  @media (max-width: 560px) {
    .sab-hero { flex-wrap: wrap; gap: 14px; }
    .sab-hero-left { flex: 1 1 100%; }
  }
`;

const ACCENTS = {
  maroon: { grad: `linear-gradient(90deg, ${MAROON}, ${MAROON_DEEP})`, soft: MAROON_SOFT, fg: MAROON,   border: 'rgba(122,0,0,0.22)',   glow: 'rgba(122,0,0,0.14)' },
  blue:   { grad: 'linear-gradient(90deg, #3B82F6, #2563EB)',          soft: 'rgba(59,130,246,0.12)', fg: BLUE,      border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.14)' },
  green:  { grad: 'linear-gradient(90deg, #22C55E, #16A34A)',          soft: 'rgba(34,197,94,0.12)',  fg: '#178A4C', border: 'rgba(34,197,94,0.25)',  glow: 'rgba(34,197,94,0.14)' },
  orange: { grad: 'linear-gradient(90deg, #F97316, #EA580C)',          soft: 'rgba(249,115,22,0.12)', fg: ORANGE,    border: 'rgba(249,115,22,0.25)', glow: 'rgba(249,115,22,0.14)' },
  gold:   { grad: `linear-gradient(90deg, ${GOLD}, ${GOLD_DEEP})`,     soft: GOLD_PALE,               fg: GOLD_DEEP, border: 'rgba(212,175,55,0.30)', glow: 'rgba(212,175,55,0.16)' },
};

function StatCard({ accent, icon, value, label, sub }) {
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
      <div className="sab-stat-icon">{cloneElement(icon, { size: 34, strokeWidth: 1.6 })}</div>
      <div className="sab-stat-body">
        <div className="sab-stat-label">{label}</div>
        <div className="sab-stat-value">{value}</div>
        <div className="sab-stat-sub">{sub}</div>
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
  const [scanZoom, setScanZoom] = useState(null); // abstract-scan lightbox (image url)
  const closeView = () => { setViewBook(null); setScanZoom(null); };

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
    // Canonical genres first (in the librarians' order), then any legacy/custom genre found in the data.
    const extra = Array.from(new Set(approvedBooks.map(b => b.genre).filter(g => g && !GENRES.includes(g)))).sort();
    return [...GENRES, ...extra];
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
      const hay = [b.title, b.authors, b.isbn, b.call_number, b.campus?.campus_name].filter(Boolean).join(' ').toLowerCase();
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
    // "Pending Requests" always reflects the system-wide total of book
    // registration requests awaiting Super Admin review, regardless of
    // which campus is currently selected in the filter.
    const pendingCount = pendingBooks.length;
    return {
      titles: scopedBooks.length,
      totalCopies,
      availableCopies,
      borrowedCopies,
      pendingCount,
    };
  }, [scopedBooks, pendingBooks]);

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
      // Fire-and-forget: notify every Librarian on this campus. Runs only
      // once the update above has actually succeeded, so a failed/retried
      // confirm never produces a duplicate notification.
      notifyLibrariansOfRegistration({
        campusId:  book.campus_id,
        bookId:    book.id,
        bookTitle: book.title,
        decision:  'approved',
      });
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
      // Capture title/campus BEFORE clearing rejectTarget below — the books
      // row is already gone at this point, so this call is the only place
      // left that still has the title available.
      notifyLibrariansOfRegistration({
        campusId:  rejectTarget.campus_id,
        bookId:    rejectTarget.id,
        bookTitle: rejectTarget.title,
        decision:  'rejected',
      });
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
              Every Campus, One Catalog
            </div>
            <div className="sab-hero-sub">
              {selectedCampusName
                ? `Showing holdings for ${selectedCampusName} only switch back to "All Campuses" for the system wide view.`
                : 'A system wide view of every book title held across all campus libraries is searchable, filterable, and always up to date.'}
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
          />
          <StatCard
            accent="orange"
            icon={<PackageX size={20} />}
            value={stats.borrowedCopies}
            label="Borrowed Copies"
            sub="currently out"
          />
          <StatCard
            accent="gold"
            icon={<Clock size={20} />}
            value={stats.pendingCount}
            label="Pending Requests"
            sub="awaiting approval"
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
                        {['Book', 'Campus', 'ISBN', 'Call No.', 'Genre', 'Copies', 'Submitted', 'Action'].map(h => <th key={h}>{h}</th>)}
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
                          <td><span style={{ fontSize: 12, fontFamily: 'monospace', color: MAROON }}>{b.isbn || '—'}</span></td>
                          <td><span style={{ fontSize: 12, fontFamily: 'monospace', color: MAROON }}>{b.call_number || '—'}</span></td>
                          <td>{b.genre ? <span className="sab-genre-badge">{b.genre}</span> : '—'}</td>
                          <td>
                            <span className="sab-copies">{b.copies}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: MAROON }}>
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
                        {['Book', 'Campus', 'ISBN', 'Call No.', 'Genre', 'Copies', 'Status'].map(h => <th key={h}>{h}</th>)}
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
                          <td><span style={{ fontSize: 12, fontFamily: 'monospace', color: MAROON }}>{b.isbn || '—'}</span></td>
                          <td><span style={{ fontSize: 12, fontFamily: 'monospace', color: MAROON }}>{b.call_number || '—'}</span></td>
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

      {viewBook && (() => {
        const b = viewBook;
        const abs = parseAbstractData(b.abstract_text);
        const absParas = abs ? mergeFragmentedParagraphs(abs.paragraphs || [], abs.subheadings || []) : [];
        const absKeywords = abs?.keywords || [];
        const hasAbstractText = absParas.length > 0;
        const availCount = parseInt(b.available_copies) || 0;
        const facts = [
          ['Campus',               Building2, b.campus?.campus_name || 'Unassigned'],
          ['ISBN',                 Barcode,   b.isbn],
          ['Call Number',          Tag,       b.call_number],
          ['Publisher',            Landmark,  b.publisher],
          ['Place of Publication', Globe,     b.place_of_publication],
          ['Year Published',       Calendar,  b.year],
          ['Volume Number',        Layers,    b.volume_number],
          ['Edition',              FileText,  b.edition],
          ['Total Pages',          FileText,  b.pages],
          ['Shelf Location',       MapPin,    b.shelf_location],
          ['Genre',                BookMarked, b.genre],
          ['Copies',               BookOpen,  `${availCount} available / ${b.copies} total`],
          ['Color',                Palette,   b.color],
        ].filter(([, , v]) => v !== undefined && v !== null && String(v).trim() !== '');

        return (
          <div className="sab-modal-overlay" onClick={e => e.target === e.currentTarget && closeView()}>
            <div className="sab-modal sab-bd">
              <div className="sab-bd-hdr">
                <span className="sab-bd-hdr-ico"><BookOpen size={30} strokeWidth={1.7} /></span>
                <div className="sab-bd-hdr-text">
                  <div className="sab-bd-hdr-title">Book Details</div>
                  <div className="sab-bd-hdr-sub">{b.genre || 'Library Catalog'}</div>
                </div>
                <button className="sab-bd-close" onClick={closeView} aria-label="Close"><X size={16} /></button>
              </div>

              <div className="sab-bd-body">
                <aside className="sab-bd-side">
                  <div className="sab-bd-cover">
                    {b.cover_image_url
                      ? <img src={b.cover_image_url} alt={`${b.title} cover`} />
                      : <div className="sab-bd-cover-ph"><BookOpen size={34} strokeWidth={1.5} /></div>}
                  </div>

                  {b.abstract_image_url && (
                    <div className="sab-bd-scan">
                      <div className="sab-bd-scan-label">Original Scan</div>
                      <button
                        type="button"
                        className="sab-bd-scan-frame"
                        onClick={() => setScanZoom(b.abstract_image_url)}
                        aria-label="Enlarge original abstract scan"
                      >
                        <img src={b.abstract_image_url} alt="Original abstract scan" />
                        <span className="sab-bd-scan-zoom"><ZoomIn size={14} /></span>
                      </button>
                    </div>
                  )}
                </aside>

                <section className="sab-bd-main">
                  <h2 className="sab-bd-title">{b.title}</h2>
                  <div className="sab-bd-by">by {b.authors || b.author || 'Unknown author'}</div>
                  {b.volume_title && <div className="sab-bd-vol">{b.volume_title}</div>}
                  {b.registration_status === 'pending' && (
                    <span className="sab-bd-await"><Clock size={11} /> Awaiting Confirmation</span>
                  )}

                  <div className="sab-bd-facts">
                    {facts.map(([label, Icon, value]) => (
                      <div key={label} className="sab-bd-fact">
                        <span className="sab-bd-fact-ico"><Icon size={16} strokeWidth={1.8} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div className="sab-bd-fact-k">{label}</div>
                          <div className="sab-bd-fact-v">{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {hasAbstractText && (
                    <>
                      <div className="sab-bd-abs-hd"><BookOpen size={16} /><span>Abstract</span></div>
                      {abs.heading && <div className="sab-bd-abs-title">{abs.heading}</div>}
                      {absParas.map((para, i) => (
                        abs.subheadings?.includes(para)
                          ? <div key={i} className="sab-bd-abs-sub">{para}</div>
                          : <p key={i} className="sab-bd-abs-p">{para}</p>
                      ))}
                      {absKeywords.length > 0 && (
                        <div className="sab-bd-kw">{absKeywords.map((kw, i) => <span key={i}>{kw}</span>)}</div>
                      )}
                    </>
                  )}

                  {b.created_at && (
                    <div className="sab-bd-added">
                      Added on {new Date(b.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {scanZoom && (
              <div className="sab-scan-lightbox" onClick={e => { e.stopPropagation(); setScanZoom(null); }}>
                <img src={scanZoom} alt="Original abstract scan (enlarged)" />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}