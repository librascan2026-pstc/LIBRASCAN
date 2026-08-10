import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Building2, GraduationCap, BookOpen, BookMarked, ClipboardList, Users,
  LayoutGrid, MapPin, Landmark, Search, ChevronLeft, ChevronRight,
  CalendarDays, ShieldCheck,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';

/* ============================================================================
   LIBRASCAN — Super Admin Overview
   Restyled to share the exact visual language of Campus Management Hub:
   cream/white surfaces, maroon + gold accents, the same hero, stat-card,
   carousel-card and table treatments — so every Super Admin page now reads
   as one consistent product.
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
const PURPLE      = '#9333EA';
const ORANGE      = '#F97316';

const STATS_CONFIG = [
  { key: 'totalCampuses',   label: 'Total Campuses',    sub: 'active campuses',     Icon: Building2,     tint: { bg: GOLD_PALE,                    fg: GOLD_DEEP } },
  { key: 'totalStudents',   label: 'Total Students',    sub: 'registered students', Icon: GraduationCap, tint: { bg: 'rgba(59,130,246,0.12)',      fg: BLUE } },
  { key: 'totalBooks',      label: 'Total Books',       sub: 'across all campuses', Icon: BookOpen,      tint: { bg: 'rgba(34,197,94,0.12)',       fg: '#178A4C' } },
  { key: 'totalBorrows',    label: 'Active Borrowings', sub: 'currently borrowed',  Icon: BookMarked,    tint: { bg: 'rgba(249,115,22,0.12)',      fg: ORANGE } },
  { key: 'totalAttend',     label: 'Attendance Logs',   sub: 'total log entries',   Icon: ClipboardList, tint: { bg: 'rgba(147,51,234,0.10)',      fg: PURPLE } },
  { key: 'totalLibrarians', label: 'Librarians',        sub: 'assigned librarians', Icon: Users,         tint: { bg: MAROON_SOFT,                  fg: MAROON } },
];

const LEDGER_COLUMNS = ['Campus', 'Code', 'Status', 'Librarians', 'Students', 'Books', 'Active Borrows'];

const PAGE_SIZE = 9;

/* ── Styles ───────────────────────────────────────────────────────────── */
const CSS = `
  .sao, .sao * { box-sizing: border-box; }
  .sao {
    font-family: var(--font-sans,'DM Sans','Josefin Sans',sans-serif);
    color: ${TEXT};
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Hero ---------- */
  .sao-hero {
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
  .sao-hero::before {
    content: '';
    position: absolute;
    top: -60%; right: -8%;
    width: 420px; height: 420px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%);
    pointer-events: none;
  }
  .sao-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(122,0,0,0.05) 1px, transparent 1px);
    background-size: 22px 22px;
    opacity: 0.6;
    pointer-events: none;
  }
  .sao-hero-left { position: relative; z-index: 1; max-width: 640px; }
  .sao-hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${MAROON_SOFT};
    border: 1px solid rgba(122,0,0,0.18);
    color: ${MAROON};
    font-size: 11px; font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase;
    padding: 6px 14px; border-radius: 999px; margin-bottom: 16px;
  }
  .sao-hero-title {
    font-size: 25px; font-weight: 800; letter-spacing: -0.01em;
    color: ${TEXT}; line-height: 1.25; margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .sao-hero-icon {
    width: 42px; height: 42px; border-radius: 14px;
    background: ${MAROON_SOFT};
    border: 1px solid rgba(122,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON}; flex-shrink: 0;
  }
  .sao-hero-sub { font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED}; max-width: 610px; font-weight: 500; text-align: left;}
  .sao-hero-right { position: relative; z-index: 1; display: flex; align-items: center; }
  .sao-date-chip {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 84px; height: 84px; border-radius: 18px;
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    border: 1.5px solid rgba(212,175,55,0.35);
    box-shadow: 0 10px 24px rgba(122,0,0,0.28);
    color: #fff; gap: 3px;
  }
  .sao-date-day  { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: ${GOLD}; text-transform: uppercase; }
  .sao-date-num  { font-size: 20px; font-weight: 800; line-height: 1; }
  .sao-date-year { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.65); }

  /* ---------- Stat cards ---------- */
  .sao-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }
  @keyframes sao-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .sao-stat-card {
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 16px;
    padding: 16px;
    display: flex; align-items: center; gap: 16px;
    transition: transform 0.16s cubic-bezier(.22,1,.36,1), box-shadow 0.16s, border-color 0.16s;
    animation: sao-rise 0.4s ease both;
  }
  .sao-stats-grid .sao-stat-card:nth-child(1) { animation-delay: 0.02s; }
  .sao-stats-grid .sao-stat-card:nth-child(2) { animation-delay: 0.05s; }
  .sao-stats-grid .sao-stat-card:nth-child(3) { animation-delay: 0.08s; }
  .sao-stats-grid .sao-stat-card:nth-child(4) { animation-delay: 0.11s; }
  .sao-stats-grid .sao-stat-card:nth-child(5) { animation-delay: 0.14s; }
  .sao-stats-grid .sao-stat-card:nth-child(6) { animation-delay: 0.17s; }
  .sao-stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(59,42,37,0.08); border-color: rgba(122,0,0,0.22); }
  .sao-stat-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .sao-stat-body { min-width: 0; }
  .sao-stat-value { font-size: 22px; font-weight: 800; color: ${TEXT}; line-height: 1.15; font-variant-numeric: tabular-nums; }
  .sao-stat-label { font-size: 11px; font-weight: 700; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
  .sao-stat-sub { font-size: 10.5px; color: rgba(138,115,104,0.7); margin-top: 1px; }

  /* ---------- Section titles ---------- */
  .sao-selector-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .sao-selector-title {
    font-size: 13px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    color: ${TEXT_MUTED};
    display: flex; align-items: center; gap: 8px;
  }
  .sao-selector-title svg { color: ${MAROON}; }
  .sao-selector-caption { font-size: 12px; color: ${TEXT_MUTED}; font-weight: 500; }

  /* ---------- Campus directory carousel (matches Campus Hub cards) ------- */
  .sao-carousel-section { margin-bottom: 28px; }
  .sao-carousel-wrap {
    display: flex; align-items: center; gap: 12px;
    padding: 6px 0 4px;
  }
  .sao-carousel-track-outer {
    flex: 1; min-width: 0; overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%);
            mask-image: linear-gradient(90deg, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%);
  }
  .sao-carousel-track { display: flex; gap: 16px; width: max-content; will-change: transform; }
  .sao-carousel-empty {
    border: 1.5px dashed rgba(122,0,0,0.28);
    border-radius: 18px;
    padding: 30px 20px;
    text-align: center;
    color: ${TEXT_MUTED};
    font-size: 13px; font-weight: 600;
    width: 100%;
  }

  .sao-campus-card {
    flex: 0 0 208px;
    background:
      radial-gradient(circle at 30% 0%, rgba(255,255,255,0.07) 0%, transparent 55%),
      linear-gradient(160deg, ${MAROON_MID} 0%, ${MAROON} 45%, ${MAROON_DEEP} 100%);
    border: 1.5px solid rgba(212,175,55,0.22);
    border-radius: 18px;
    padding: 18px 16px 16px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    transition: transform 0.18s cubic-bezier(.22,1,.36,1), box-shadow 0.18s, border-color 0.18s;
    box-shadow: 0 4px 14px rgba(40,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .sao-campus-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, transparent, ${GOLD}, transparent);
    opacity: 0.7;
  }
  .sao-campus-card::after {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 16px 16px;
    pointer-events: none;
  }
  .sao-campus-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 34px rgba(40,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08);
    border-color: rgba(212,175,55,0.5);
  }
  .sao-campus-logo {
    width: 52px; height: 52px; border-radius: 50%;
    border: 2px solid ${GOLD};
    background: ${CREAM};
    overflow: hidden; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 10px rgba(0,0,0,0.25), 0 0 0 3px rgba(212,175,55,0.15);
    position: relative; z-index: 1;
  }
  .sao-campus-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .sao-campus-name {
    font-size: 13.5px; font-weight: 800; color: #fff; line-height: 1.3;
    position: relative; z-index: 1;
    text-shadow: 0 1px 3px rgba(0,0,0,0.25);
  }
  .sao-campus-code {
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.6);
    letter-spacing: 0.05em; text-transform: uppercase;
    position: relative; z-index: 1;
  }
  .sao-campus-stats {
    display: flex; gap: 12px; margin-top: 4px;
    position: relative; z-index: 1;
    border-top: 1px dashed rgba(255,255,255,0.16);
    padding-top: 10px; width: 100%; justify-content: center;
  }
  .sao-campus-stat { display: flex; flex-direction: column; align-items: center; }
  .sao-campus-stat b { font-size: 15px; font-weight: 800; color: ${GOLD_DEEP}; line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,0.35); }
  .sao-campus-stat span { font-size: 8.5px; font-weight: 700; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.04em; }
  .sao-campus-foot {
    display: flex; align-items: center; gap: 6px;
    position: relative; z-index: 1;
  }
  .sao-status-dot { width: 7px; height: 7px; border-radius: 50%; background: ${SUCCESS}; box-shadow: 0 0 0 3px rgba(34,197,94,0.16); }
  .sao-status-dot.off { background: ${DANGER}; box-shadow: 0 0 0 3px rgba(239,68,68,0.16); }
  .sao-status-text { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7); }

  /* ---------- Toolbar ---------- */
  .sao-toolbar {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .sao-search { flex: 1 1 260px; min-width: 200px; position: relative; }
  .sao-search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: ${TEXT_MUTED}; pointer-events: none; }
  .sao-search input {
    width: 100%; padding: 11px 14px 11px 40px; border-radius: 999px;
    border: 1.5px solid ${BORDER}; background: ${CARD};
    font-family: inherit; font-size: 13px; color: ${TEXT}; outline: none;
    transition: border-color 0.16s, box-shadow 0.16s;
  }
  .sao-search input:focus { border-color: ${MAROON}; box-shadow: 0 0 0 4px ${MAROON_SOFT}; }
  .sao-search input::placeholder { color: rgba(58,42,37,0.35); }

  /* ---------- Table (matches Campus Hub) ---------- */
  .sao-table-wrap {
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(59,42,37,0.04);
  }
  .sao-table-scroll { overflow-x: auto; }
  .sao-table { width: 100%; border-collapse: collapse; min-width: 700px; }
  .sao-table thead th {
    text-align: left;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
    color: rgba(255,248,239,0.92);
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    padding: 15px 18px;
    white-space: nowrap;
  }
  .sao-table thead th:first-child { border-top-left-radius: 18px; }
  .sao-table thead th:last-child { border-top-right-radius: 18px; }
  .sao-table tbody td {
    padding: 14px 18px; font-size: 13px; color: ${TEXT};
    border-bottom: 1px solid ${BORDER}; vertical-align: middle;
  }
  .sao-table tbody tr:last-child td { border-bottom: none; }
  .sao-table tbody tr:nth-child(even) td { background: ${CREAM}; }
  .sao-table tbody tr { transition: background 0.14s; }
  .sao-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  .sao-table-empty { text-align: center; padding: 0; }

  .sao-name-cell { font-weight: 800; color: ${TEXT}; }
  .sao-code-badge {
    display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.02em;
    border-radius: 999px; padding: 4px 12px;
    background: ${GOLD_PALE}; color: ${GOLD_DEEP};
  }
  .sao-status-row { display: flex; align-items: center; gap: 6px; }
  .sao-status-label { font-size: 12px; font-weight: 700; }
  .sao-fig {
    display: inline-block; min-width: 30px; text-align: center;
    padding: 3px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums;
  }

  .sao-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; border-top: 1px solid ${BORDER}; background: ${CREAM};
  }
  .sao-pagination-info { font-size: 12px; color: ${TEXT_MUTED}; font-weight: 600; }
  .sao-pagination-btns { display: flex; gap: 6px; }
  .sao-page-btn {
    width: 30px; height: 30px; border-radius: 9px; border: 1px solid ${BORDER};
    background: ${CARD}; color: ${TEXT}; font-size: 12px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .sao-page-btn:hover:not(:disabled) { background: ${MAROON}; color: #fff; border-color: ${MAROON}; }
  .sao-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .sao-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 56px 24px; text-align: center;
  }
  .sao-empty-illus {
    width: 76px; height: 76px; border-radius: 22px;
    background: ${CREAM}; border: 1.5px dashed rgba(122,0,0,0.28);
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON}; margin-bottom: 16px;
  }
  .sao-empty-title { font-size: 14.5px; font-weight: 800; color: ${TEXT}; margin-bottom: 6px; }
  .sao-empty-sub { font-size: 12.5px; color: ${TEXT_MUTED}; max-width: 320px; line-height: 1.6; }

  /* ---------- Skeletons ---------- */
  @keyframes sao-shimmer-sweep { 100% { transform: translateX(100%); } }
  .sao-shimmer { position: relative; overflow: hidden; background: ${BORDER}; border-radius: 12px; }
  .sao-shimmer::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    transform: translateX(-100%);
    animation: sao-shimmer-sweep 1.4s infinite;
  }
  .sao-skel-hero { height: 148px; border-radius: 24px; margin-bottom: 24px; }
  .sao-skel-stat { height: 78px; border-radius: 16px; }
  .sao-skel-carousel { height: 190px; border-radius: 18px; margin-bottom: 28px; }
  .sao-skel-table { height: 260px; border-radius: 18px; }

  /* ============================================================
     RESPONSIVE — graduated for tablets down to the smallest phones
  ============================================================ */
  @media (max-width: 900px) {
    .sao-stats-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  }
  @media (max-width: 768px) {
    .sao-hero { padding: 26px 22px 22px; }
    .sao-hero-title { font-size: 22px; align-items: flex-start; }
    .sao-hero-icon { margin-top: 3px; }
    .sao-hero-right { width: 100%; justify-content: flex-start; }
    .sao-table thead th:nth-child(4), .sao-table tbody td:nth-child(4) { display: none; }
  }
  @media (max-width: 560px) {
    .sao-table thead th:nth-child(1), .sao-table tbody td:nth-child(1) { display: none; }
    .sao-hero { padding: 22px 18px 18px; border-radius: 20px; }
    .sao-hero-title { font-size: 19px; gap: 10px; }
    .sao-hero-icon { width: 34px; height: 34px; margin-top: 2px; }
    .sao-hero-sub { font-size: 13.5px; }
    .sao-stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 430px) {
    .sao-hero { padding: 20px 16px 16px; }
    .sao-hero-eyebrow { font-size: 10px; padding: 5px 12px; margin-bottom: 12px; }
    .sao-hero-title { font-size: 17px; line-height: 1.3; gap: 9px; }
    .sao-hero-icon { width: 30px; height: 30px; border-radius: 10px; }
    .sao-hero-icon svg { width: 15px; height: 15px; }
    .sao-hero-sub { font-size: 12.5px; line-height: 1.55; }
    .sao-date-chip { width: 62px; height: 62px; border-radius: 14px; gap: 2px; }
    .sao-date-num { font-size: 15px; }
    .sao-date-day, .sao-date-year { font-size: 7.5px; }
    .sao-campus-card { flex: 0 0 168px; padding: 15px 13px 13px; }
    .sao-search input { font-size: 12.5px; padding: 10px 12px 10px 36px; }
  }
  @media (max-width: 340px) {
    .sao-hero-title { font-size: 15.5px; }
    .sao-hero-icon { width: 27px; height: 27px; }
    .sao-hero-icon svg { width: 13px; height: 13px; }
    .sao-date-chip { width: 54px; height: 54px; }
    .sao-date-num { font-size: 13px; }
  }
`;

/* ── Campus directory carousel (auto-scroll, display only) ──────────────── */
function CampusCarousel({ campuses }) {
  const trackRef  = useRef(null);
  const offsetRef = useRef(0);
  const rafRef    = useRef(null);
  const pausedRef = useRef(false);

  const loopList = campuses.length ? [...campuses, ...campuses, ...campuses] : [];

  useEffect(() => {
    if (!campuses.length) return;
    const speed = 0.4;
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

  if (!campuses.length) {
    return (
      <div className="sao-carousel-wrap">
        <div className="sao-carousel-empty">No campuses recorded yet — add the first branch in Campus Management.</div>
      </div>
    );
  }

  return (
    <div
      className="sao-carousel-wrap"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="sao-carousel-track-outer">
        <div className="sao-carousel-track" ref={trackRef}>
          {loopList.map((c, idx) => (
            <div className="sao-campus-card" key={`${c.id}-${idx}`}>
              <div className="sao-campus-logo">
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.campus_name}
                    onError={ev => { ev.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <Building2 size={22} color={MAROON} />
                )}
              </div>
              <div className="sao-campus-name">{c.campus_name}</div>
              {c.campus_code && <div className="sao-campus-code">{c.campus_code}</div>}
              <div className="sao-campus-stats">
                <div className="sao-campus-stat"><b>{c.librarians ?? 0}</b><span>Staff</span></div>
                <div className="sao-campus-stat"><b>{c.students ?? 0}</b><span>Students</span></div>
                <div className="sao-campus-stat"><b>{c.books ?? 0}</b><span>Books</span></div>
              </div>
              <div className="sao-campus-foot">
                <span className={`sao-status-dot${c.is_active ? '' : ' off'}`} />
                <span className="sao-status-text">{c.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="sao-stats-grid">
      {STATS_CONFIG.map((_, i) => <div key={i} className="sao-shimmer sao-skel-stat" />)}
    </div>
  );
}

export default function SuperAdminOverview() {
  const [stats,    setStats]    = useState(null);
  const [campuses, setCampuses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [campusRes, profilesRes, booksRes, borrowRes, attendRes, libRes] = await Promise.all([
          supabaseAdmin.from('campuses').select('id, campus_name, campus_code, is_active, logo_url'),
          supabaseAdmin.from('profiles').select('id, campus_id, role'),
          supabaseAdmin.from('books').select('id, campus_id'),
          supabaseAdmin.from('borrowings').select('id, campus_id, status'),
          supabaseAdmin.from('attendance_logs').select('id, campus_id'),
          supabaseAdmin.from('profiles').select('id, campus_id').eq('role', 'library_manager'),
        ]);

        const allCampuses = campusRes.data || [];
        const allProfiles = profilesRes.data || [];
        const allBooks    = booksRes.data || [];
        const allBorrows  = borrowRes.data || [];
        const allAttend   = attendRes.data || [];
        const allLibs     = libRes.data || [];

        const students      = allProfiles.filter(p => p.role === 'student');
        const activeBorrows = allBorrows.filter(b => b.status === 'approved' || b.status === 'borrowed');

        setStats({
          totalCampuses:   allCampuses.length,
          totalStudents:   students.length,
          totalBooks:      allBooks.length,
          totalBorrows:    activeBorrows.length,
          totalAttend:     allAttend.length,
          totalLibrarians: allLibs.length,
        });

        const breakdown = allCampuses.map(c => ({
          ...c,
          students:   students.filter(p => p.campus_id === c.id).length,
          books:      allBooks.filter(b => b.campus_id === c.id).length,
          borrows:    activeBorrows.filter(b => b.campus_id === c.id).length,
          librarians: allLibs.filter(l => l.campus_id === c.id).length,
        }));
        setCampuses(breakdown);
      } catch (e) {
        console.error('[SuperAdminOverview] load error:', e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const todayParts = useMemo(() => {
    const d = new Date();
    return {
      day:  d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      num:  d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
      year: d.getFullYear(),
    };
  }, []);

  const filteredCampuses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campuses;
    return campuses.filter(c =>
      [c.campus_name, c.campus_code].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [campuses, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCampuses.length / PAGE_SIZE));
  const pagedCampuses = filteredCampuses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="sao">
      <style>{CSS}</style>

      {/* Hero */}
      {loading ? (
        <div className="sao-shimmer sao-skel-hero" />
      ) : (
        <div className="sao-hero">
          <div className="sao-hero-left">
            <div className="sao-hero-title">
              <span className="sao-hero-icon"><ShieldCheck size={22} /></span>
              Empowering Knowledge Across Every Campus
            </div>
            <div className="sao-hero-sub">
            Bringing every campus library together through centralized management,
            real-time monitoring, and intelligent insights.
            </div>
          </div>
          <div className="sao-hero-right">
            <div className="sao-date-chip">
              <CalendarDays size={13} color={GOLD} />
              <span className="sao-date-day">{todayParts.day}</span>
              <span className="sao-date-num">{todayParts.num}</span>
              <span className="sao-date-year">{todayParts.year}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="sao-stats-grid">
          {STATS_CONFIG.map(({ key, label, sub, Icon, tint }) => (
            <div key={key} className="sao-stat-card">
              <div className="sao-stat-icon" style={{ background: tint.bg }}>
                <Icon size={19} color={tint.fg} strokeWidth={2} />
              </div>
              <div className="sao-stat-body">
                <div className="sao-stat-value">{stats?.[key] ?? 0}</div>
                <div className="sao-stat-label">{label}</div>
                <div className="sao-stat-sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campus directory */}
      <div className="sao-carousel-section">
        <div className="sao-selector-head">
          <div className="sao-selector-title"><MapPin size={14} />Campus Directory ({campuses.length})</div>
          <div className="sao-selector-caption">Every branch in the system, front to back.</div>
        </div>
        {loading ? <div className="sao-shimmer sao-skel-carousel" /> : <CampusCarousel campuses={campuses} />}
      </div>

      {/* Circulation ledger */}
      <div className="sao-selector-head">
        <div className="sao-selector-title"><Landmark size={14} />Circulation Ledger</div>
        <div className="sao-selector-caption">Per-campus staffing and holdings, recorded branch by branch.</div>
      </div>

      {loading ? (
        <div className="sao-shimmer sao-skel-table" />
      ) : (
        <>
          <div className="sao-toolbar">
            <div className="sao-search">
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search campuses by name or code..."
                aria-label="Search campuses"
              />
            </div>
          </div>

          <div className="sao-table-wrap">
            {filteredCampuses.length === 0 ? (
              <div className="sao-empty">
                <div className="sao-empty-illus"><Building2 size={30} strokeWidth={1.8} /></div>
                <div className="sao-empty-title">{campuses.length ? 'No matching campuses' : 'No campuses found'}</div>
                <div className="sao-empty-sub">
                  {campuses.length
                    ? 'Try a different search term.'
                    : 'Add your first campus in Campus Management to see it here.'}
                </div>
              </div>
            ) : (
              <>
                <div className="sao-table-scroll">
                  <table className="sao-table">
                    <thead>
                      <tr>{LEDGER_COLUMNS.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {pagedCampuses.map(c => (
                        <tr key={c.id}>
                          <td className="sao-name-cell">{c.campus_name}</td>
                          <td><span className="sao-code-badge">{c.campus_code}</span></td>
                          <td>
                            <div className="sao-status-row">
                              <span className={`sao-status-dot${c.is_active ? '' : ' off'}`} style={{ boxShadow: 'none' }} />
                              <span className="sao-status-label" style={{ color: c.is_active ? '#178A4C' : '#B91C1C' }}>
                                {c.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td><span className="sao-fig" style={{ background: MAROON_SOFT, color: MAROON }}>{c.librarians}</span></td>
                          <td><span className="sao-fig" style={{ background: 'rgba(59,130,246,0.12)', color: BLUE }}>{c.students}</span></td>
                          <td><span className="sao-fig" style={{ background: 'rgba(34,197,94,0.12)', color: '#178A4C' }}>{c.books}</span></td>
                          <td><span className="sao-fig" style={{ background: 'rgba(249,115,22,0.12)', color: ORANGE }}>{c.borrows}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="sao-pagination">
                    <div className="sao-pagination-info">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCampuses.length)} of {filteredCampuses.length}
                    </div>
                    <div className="sao-pagination-btns">
                      <button className="sao-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                        <ChevronLeft size={14} />
                      </button>
                      <button className="sao-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">
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
    </div>
  );
}