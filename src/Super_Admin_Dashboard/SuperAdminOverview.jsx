import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Building2, GraduationCap, BookOpen, BookMarked,
  ClipboardList, Users, LayoutGrid, CalendarDays,
} from 'lucide-react';
import { supabaseAdmin } from '../supabaseClient';

/* ============================================================================
   LIBRASCAN — Super Admin Overview
   ----------------------------------------------------------------------------
   Design concept: "the front desk, the drawer, the ledger."
   Three textures pulled from a real library, each doing a different job —

     1. STAT CARDS   → the front-desk display board: dark, numeric, glanceable.
     2. CAMPUS ROLL   → the card-catalog drawer: a physical row of branch seals.
     3. THE LEDGER    → the paper record book: light, ruled, serif, precise.

   Palette stays true to the PSU maroon/gold identity but is tuned for
   contrast and restraint. Type pairs a serif (Fraunces) for headings/figures
   that should feel "recorded," DM Sans for interface copy, and DM Mono for
   codes, timestamps and tabular data — the way a real ledger mixes hand
   lettering with ruled numeral columns.
============================================================================ */

const INK          = '#241009';
const MAROON       = '#7B0000';
const MAROON_DEEP  = '#4A0000';
const GOLD         = '#C9A84C';
const GOLD_DEEP    = '#8C6B22';
const PAPER        = '#F7EFDC';

const STATS_CONFIG = [
  { key: 'totalCampuses',   label: 'Total Campuses',    sub: 'active campuses',     Icon: Building2,     accent: '#D9B65C', iconBg: 'rgba(217,182,92,0.16)' },
  { key: 'totalStudents',   label: 'Total Students',    sub: 'registered students', Icon: GraduationCap, accent: '#77AEDA', iconBg: 'rgba(119,174,218,0.16)' },
  { key: 'totalBooks',      label: 'Total Books',       sub: 'across all campuses', Icon: BookOpen,      accent: '#72C296', iconBg: 'rgba(114,194,150,0.16)' },
  { key: 'totalBorrows',    label: 'Active Borrowings', sub: 'currently borrowed',  Icon: BookMarked,    accent: '#DD9566', iconBg: 'rgba(221,149,102,0.16)' },
  { key: 'totalAttend',     label: 'Attendance Logs',   sub: 'total log entries',   Icon: ClipboardList, accent: '#B096D6', iconBg: 'rgba(176,150,214,0.16)' },
  { key: 'totalLibrarians', label: 'Librarians',        sub: 'assigned librarians', Icon: Users,         accent: '#56B7A9', iconBg: 'rgba(86,183,169,0.16)' },
];

const LEDGER_COLUMNS = [
  { key: 'campus',     label: 'Campus' },
  { key: 'code',       label: 'Code' },
  { key: 'status',     label: 'Status' },
  { key: 'librarians', label: 'Librarians' },
  { key: 'students',   label: 'Students' },
  { key: 'books',      label: 'Books' },
  { key: 'borrows',    label: 'Active Borrows' },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Mono:wght@400;500&display=swap');

  .sao {
    --font-serif: 'Fraunces', ui-serif, Georgia, serif;
    --font-mono: 'DM Mono', ui-monospace, monospace;
    font-family: var(--font-sans, 'DM Sans', 'Josefin Sans', sans-serif);
    max-width: 1440px;
    margin: 0 auto;
  }

  /* ---------- Header ---------- */
  .sao-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .sao-eyebrow {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${MAROON};
    opacity: 0.75;
    margin-bottom: 10px;
  }
  .sao-title {
    font-family: var(--font-serif);
    font-size: clamp(21px, 2.6vw, 30px);
    font-weight: 600;
    color: ${INK};
    line-height: 1.18;
    margin-bottom: 8px;
    max-width: 620px;
  }
  .sao-subtitle {
    font-size: 12.5px;
    color: rgba(36,16,9,0.56);
    max-width: 480px;
    line-height: 1.55;
  }
  .sao-stamp {
    flex-shrink: 0;
    width: 88px; height: 88px;
    border-radius: 50%;
    border: 1.5px dashed rgba(123,0,0,0.45);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    transform: rotate(-6deg);
    color: ${MAROON};
    font-family: var(--font-mono);
    background: rgba(123,0,0,0.035);
  }
  .sao-stamp-day  { font-size: 8.5px; font-weight: 700; letter-spacing: 0.12em; opacity: 0.85; }
  .sao-stamp-date { font-size: 18px; font-weight: 700; line-height: 1; margin: 3px 0; letter-spacing: 0.01em; }
  .sao-stamp-year { font-size: 8.5px; font-weight: 600; opacity: 0.65; }

  /* ---------- Stat cards (front-desk board) ---------- */
  .sao-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
    margin-bottom: 32px;
  }
  @keyframes sao-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .sao-stat-card {
    background: linear-gradient(150deg, #200406 0%, #12020380 100%), linear-gradient(150deg, #1c0507 0%, #0f0203 100%);
    border: 1px solid rgba(201,168,76,0.16);
    border-radius: 14px;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    animation: sao-rise 0.45s ease both;
  }
  .sao-grid .sao-stat-card:nth-child(1) { animation-delay: 0.02s; }
  .sao-grid .sao-stat-card:nth-child(2) { animation-delay: 0.06s; }
  .sao-grid .sao-stat-card:nth-child(3) { animation-delay: 0.10s; }
  .sao-grid .sao-stat-card:nth-child(4) { animation-delay: 0.14s; }
  .sao-grid .sao-stat-card:nth-child(5) { animation-delay: 0.18s; }
  .sao-grid .sao-stat-card:nth-child(6) { animation-delay: 0.22s; }
  .sao-stat-card:hover {
    transform: translateY(-3px);
    border-color: rgba(201,168,76,0.34);
    box-shadow: 0 10px 26px rgba(0,0,0,0.30);
  }
  .sao-stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent, ${GOLD}), transparent);
    opacity: 0.85;
  }
  .sao-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .sao-stat-icon {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    background: var(--icon-bg);
    flex-shrink: 0;
  }
  .sao-stat-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: rgba(245,228,168,0.55);
    max-width: 110px;
    line-height: 1.35;
  }
  .sao-stat-value {
    font-family: var(--font-serif);
    font-size: 30px;
    font-weight: 600;
    color: #F8EFD8;
    line-height: 1;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  .sao-stat-sub {
    font-size: 10.5px;
    color: rgba(245,228,168,0.38);
    margin-top: 6px;
  }

  /* ---------- Skeleton (loading) ---------- */
  @keyframes sao-shimmer { 0% { background-position: -220px 0; } 100% { background-position: 220px 0; } }
  .sao-skel {
    background: linear-gradient(90deg, rgba(255,255,255,0.035) 25%, rgba(255,255,255,0.09) 37%, rgba(255,255,255,0.035) 63%);
    background-size: 420px 100%;
    animation: sao-shimmer 1.3s linear infinite;
    border-radius: 7px;
  }
  .sao-skel-card { height: 106px; border-radius: 14px; }
  .sao-skel-line { height: 12px; }
  .sao-skel-header { height: 82px; border-radius: 14px; margin-bottom: 28px; max-width: 560px; }
  .sao-skel-carousel { height: 128px; border-radius: 14px; margin-bottom: 28px; }
  .sao-skel-ledger { height: 260px; border-radius: 14px; }

  /* ---------- Section titles ---------- */
  .sao-section-title {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: rgba(123,0,0,0.60);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sao-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(123,0,0,0.14); }
  .sao-section-caption {
    font-size: 11.5px;
    color: rgba(36,16,9,0.48);
    margin-bottom: 14px;
  }

  /* ---------- Campus roll (card-catalog drawer) ---------- */
  .sao-carousel-section { margin-bottom: 32px; }
  .sao-carousel-wrap {
    position: relative;
    background: linear-gradient(120deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(80,0,0,0.18);
  }
  .sao-carousel-wrap::before,
  .sao-carousel-wrap::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    width: 46px;
    z-index: 2;
    pointer-events: none;
  }
  .sao-carousel-wrap::before { left: 0;  background: linear-gradient(90deg, ${MAROON} 0%, rgba(123,0,0,0) 100%); }
  .sao-carousel-wrap::after  { right: 0; background: linear-gradient(270deg, ${MAROON_DEEP} 0%, rgba(90,0,0,0) 100%); }
  .sao-carousel-track-outer { overflow: hidden; }
  .sao-carousel-track { display: flex; width: max-content; will-change: transform; }
  .sao-campus-chip {
    flex-shrink: 0;
    width: 166px;
    padding: 18px 12px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border-right: 1px dashed rgba(255,255,255,0.14);
  }
  .sao-chip-logo {
    width: 52px; height: 52px;
    border-radius: 50%;
    border: 2px solid rgba(201,168,76,0.55);
    background: #fff;
    overflow: hidden;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 10px rgba(0,0,0,0.22);
  }
  .sao-chip-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .sao-chip-name {
    font-family: var(--font-serif);
    font-size: 11.5px;
    font-weight: 600;
    text-align: center;
    color: #fff;
    line-height: 1.3;
  }
  .sao-chip-meta {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: rgba(245,228,168,0.65);
  }
  .sao-chip-code {
    padding: 1px 7px;
    border-radius: 20px;
    background: rgba(201,168,76,0.18);
    color: #F5E4A8;
    letter-spacing: 0.05em;
  }
  .sao-chip-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .sao-carousel-empty { padding: 30px 20px; text-align: center; color: rgba(255,255,255,0.6); font-size: 12.5px; }

  /* ---------- The ledger (paper record book) ---------- */
  .sao-ledger-card {
    background: ${PAPER};
    background-image: repeating-linear-gradient(rgba(74,0,0,0.045) 0px, rgba(74,0,0,0.045) 1px, transparent 1px, transparent 42px);
    border: 1px solid rgba(74,0,0,0.14);
    border-radius: 14px;
    overflow: hidden;
  }
  .sao-ledger-scroll { overflow-x: auto; }
  .sao-ledger-table { width: 100%; min-width: 700px; border-collapse: collapse; }
  .sao-ledger-table th {
    text-align: left;
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: rgba(74,0,0,0.55);
    padding: 13px 16px;
    background: rgba(74,0,0,0.055);
    border-bottom: 1.5px solid rgba(74,0,0,0.22);
    white-space: nowrap;
  }
  .sao-ledger-table td {
    padding: 12px 16px;
    font-size: 12.5px;
    color: rgba(36,16,9,0.72);
    border-bottom: 1px dashed rgba(74,0,0,0.15);
    vertical-align: middle;
    white-space: nowrap;
  }
  .sao-ledger-table tr:last-child td { border-bottom: none; }
  .sao-ledger-table tr:hover td { background: rgba(74,0,0,0.035); }
  .sao-ledger-name { font-family: var(--font-serif); color: ${INK}; font-weight: 600; font-size: 13.5px; }
  .sao-status {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--font-mono);
    font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  }
  .sao-status-ring { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid currentColor; position: relative; flex-shrink: 0; }
  .sao-status-ring::after { content: ''; position: absolute; inset: 2px; border-radius: 50%; background: currentColor; }
  .sao-fig {
    display: inline-block;
    min-width: 28px;
    text-align: center;
    padding: 2px 9px;
    border-radius: 20px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .sao-code-badge {
    font-family: var(--font-mono);
    font-size: 10.5px;
    background: rgba(74,0,0,0.08);
    color: ${GOLD_DEEP};
    padding: 2px 8px;
    border-radius: 5px;
    letter-spacing: 0.03em;
    border: 1px solid rgba(74,0,0,0.1);
  }
  .sao-ledger-empty { text-align: center; color: rgba(36,16,9,0.4); padding: 34px 20px; font-size: 12.5px; white-space: normal; }

  /* ---------- Responsive ---------- */
  @media (max-width: 900px) {
    .sao-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  }

  @media (max-width: 720px) {
    .sao-header { gap: 16px; }
    .sao-stamp { width: 72px; height: 72px; }
    .sao-stamp-date { font-size: 15px; }

    /* Ledger becomes a stack of index cards */
    .sao-ledger-scroll { overflow-x: visible; }
    .sao-ledger-table, .sao-ledger-table thead, .sao-ledger-table tbody,
    .sao-ledger-table th, .sao-ledger-table td, .sao-ledger-table tr { display: block; width: 100%; }
    .sao-ledger-table { min-width: 0; }
    .sao-ledger-table thead { display: none; }
    .sao-ledger-table tr {
      background: #fff;
      border: 1px solid rgba(74,0,0,0.14);
      border-radius: 10px;
      margin: 12px;
      padding: 4px 14px;
      box-shadow: 0 2px 8px rgba(74,0,0,0.06);
    }
    .sao-ledger-table tr:hover td { background: transparent; }
    .sao-ledger-table td {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 0;
      border-bottom: 1px dashed rgba(74,0,0,0.14);
      white-space: normal;
      gap: 12px;
    }
    .sao-ledger-table td:last-child { border-bottom: none; }
    .sao-ledger-table td::before {
      content: attr(data-label);
      font-family: var(--font-mono);
      font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      color: rgba(74,0,0,0.45);
      flex-shrink: 0;
    }
    .sao-ledger-name { font-size: 14px; }
  }

  @media (max-width: 480px) {
    .sao-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .sao-stat-card { padding: 14px 15px; }
    .sao-stat-value { font-size: 24px; }
    .sao-stat-label { max-width: 90px; }
    .sao-header { flex-direction: column; }
    .sao-stamp { align-self: flex-end; transform: rotate(-4deg) scale(0.95); }
    .sao-campus-chip { width: 134px; padding: 14px 8px 12px; }
    .sao-chip-logo { width: 44px; height: 44px; }
  }
`;

/* ─── Decorative auto-scrolling campus roll (display only, no interaction) ── */
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
            <div className="sao-campus-chip" key={`${c.id}-${idx}`}>
              <div className="sao-chip-logo">
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
              <div className="sao-chip-name">{c.campus_name}</div>
              <div className="sao-chip-meta">
                <span className="sao-chip-dot" style={{ background: c.is_active ? '#7FCB8C' : '#E58484' }} />
                <span className="sao-chip-code">{c.campus_code}</span>
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
    <div className="sao-grid">
      {STATS_CONFIG.map((_, i) => <div key={i} className="sao-skel sao-skel-card" />)}
    </div>
  );
}

export default function SuperAdminOverview() {
  const [stats,    setStats]    = useState(null);
  const [campuses, setCampuses] = useState([]);
  const [loading,  setLoading]  = useState(true);

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
          totalCampuses:  allCampuses.length,
          totalStudents:  students.length,
          totalBooks:     allBooks.length,
          totalBorrows:   activeBorrows.length,
          totalAttend:    allAttend.length,
          totalLibrarians: allLibs.length,
        });

        // Per-campus breakdown
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
      date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
      year: d.getFullYear(),
    };
  }, []);

  return (
    <div className="sao">
      <style>{CSS}</style>

      {/* Header */}
      {loading ? (
        <div className="sao-skel sao-skel-header" />
      ) : (
        <div className="sao-header">
          <div>
            <div className="sao-eyebrow"><LayoutGrid size={11} /> Super Admin · System Overview</div>
            <div className="sao-title">The PSU Library Network, today</div>
            <div className="sao-subtitle">
              Live totals across every connected campus, updated as students and librarians check books in and out.
            </div>
          </div>
          <div className="sao-stamp">
            <CalendarDays size={13} style={{ marginBottom: 2, opacity: 0.7 }} />
            <span className="sao-stamp-day">{todayParts.day}</span>
            <span className="sao-stamp-date">{todayParts.date}</span>
            <span className="sao-stamp-year">{todayParts.year}</span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="sao-grid">
          {STATS_CONFIG.map(({ key, label, sub, Icon, accent, iconBg }) => (
            <div key={key} className="sao-stat-card" style={{ '--accent': accent, '--icon-bg': iconBg }}>
              <div className="sao-stat-top">
                <div className="sao-stat-label">{label}</div>
                <div className="sao-stat-icon" style={{ '--icon-bg': iconBg }}>
                  <Icon size={17} color={accent} strokeWidth={2} />
                </div>
              </div>
              <div className="sao-stat-value">{stats?.[key] ?? 0}</div>
              <div className="sao-stat-sub">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Campus roll */}
      <div className="sao-carousel-section">
        <div className="sao-section-title">Campus Directory</div>
        <div className="sao-section-caption">Every branch in the system, front to back.</div>
        {loading ? <div className="sao-skel sao-skel-carousel" /> : <CampusCarousel campuses={campuses} />}
      </div>

      {/* The ledger */}
      <div className="sao-section-title">Circulation Ledger</div>
      <div className="sao-section-caption">Per-campus staffing and holdings, recorded branch by branch.</div>
      {loading ? (
        <div className="sao-skel sao-skel-ledger" />
      ) : (
        <div className="sao-ledger-card">
          <div className="sao-ledger-scroll">
            <table className="sao-ledger-table">
              <thead>
                <tr>{LEDGER_COLUMNS.map(c => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {campuses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="sao-ledger-empty">
                      No campuses found. Add your first campus in Campus Management.
                    </td>
                  </tr>
                ) : campuses.map(c => (
                  <tr key={c.id}>
                    <td data-label="Campus" className="sao-ledger-name">{c.campus_name}</td>
                    <td data-label="Code">
                      <span className="sao-code-badge">{c.campus_code}</span>
                    </td>
                    <td data-label="Status">
                      <span className="sao-status" style={{ color: c.is_active ? '#3B9B4F' : '#C2483D' }}>
                        <span className="sao-status-ring" />
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td data-label="Librarians">
                      <span className="sao-fig" style={{ background: 'rgba(140,107,34,0.12)', color: GOLD_DEEP }}>{c.librarians}</span>
                    </td>
                    <td data-label="Students">
                      <span className="sao-fig" style={{ background: 'rgba(53,102,145,0.12)', color: '#356691' }}>{c.students}</span>
                    </td>
                    <td data-label="Books">
                      <span className="sao-fig" style={{ background: 'rgba(45,124,86,0.12)', color: '#2D7C56' }}>{c.books}</span>
                    </td>
                    <td data-label="Active Borrows">
                      <span className="sao-fig" style={{ background: 'rgba(178,90,46,0.12)', color: '#B25A2E' }}>{c.borrows}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}