import { useState, useEffect, useMemo } from 'react';
import {
  Building2, GraduationCap, BookOpen, Users,
  Briefcase, Landmark, Search, ChevronLeft, ChevronRight,
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
const ORANGE      = '#F97316';

const STATS_CONFIG = [
  { key: 'totalCampuses',   label: 'Total Campuses',    sub: 'active campuses',     Icon: Building2 },
  { key: 'totalStudents',   label: 'Total Students',    sub: 'registered students', Icon: GraduationCap },
  { key: 'totalBooks',      label: 'Total Books',       sub: 'across all campuses', Icon: BookOpen },
  { key: 'totalLibrarians', label: 'Librarians',        sub: 'assigned librarians', Icon: Users },
  { key: 'totalEmployees',  label: 'Total Employees',   sub: 'campus staff',        Icon: Briefcase },
];

const LEDGER_COLUMNS = ['Campus', 'Code', 'Librarians', 'Employees', 'Students', 'Books', 'Pending Books', 'Status'];

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
  .sao-hero-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    border-radius: 24px 24px 0 0;
    background: linear-gradient(90deg, ${MAROON_DEEP}, ${MAROON}, ${GOLD}, ${MAROON}, ${MAROON_DEEP});
    background-size: 200% 100%;
    animation: sao-shimmer-bar 3s ease-in-out infinite;
    z-index: 2;
  }
  @keyframes sao-shimmer-bar {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
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
  .sao-hero-sub { font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED}; max-width: 610px; font-weight: 500; text-align: left;}

  /* ---------- Stat cards ---------- */
  .sao-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }
  @keyframes sao-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .sao-stat-card {
    position: relative;
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 16px;
    padding: 16px 18px 14px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(59,42,37,0.04);
    transition: transform 0.18s cubic-bezier(.22,1,.36,1), box-shadow 0.18s, border-color 0.18s;
    animation: sao-rise 0.4s ease both;
    overflow: hidden;
  }
  .sao-stat-card::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
    border-radius: 0 0 16px 16px;
    background: ${MAROON};
    opacity: 1;
  }
  .sao-stats-grid .sao-stat-card:nth-child(1) { animation-delay: 0.02s; }
  .sao-stats-grid .sao-stat-card:nth-child(2) { animation-delay: 0.05s; }
  .sao-stats-grid .sao-stat-card:nth-child(3) { animation-delay: 0.08s; }
  .sao-stats-grid .sao-stat-card:nth-child(4) { animation-delay: 0.11s; }
  .sao-stats-grid .sao-stat-card:nth-child(5) { animation-delay: 0.14s; }
  .sao-stats-grid .sao-stat-card:nth-child(6) { animation-delay: 0.17s; }
  .sao-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 28px rgba(59,42,37,0.09);
    border-color: rgba(122,0,0,0.35);
  }
  .sao-stat-icon {
    position: absolute; top: 12px; right: 12px;
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON};
    opacity: 0.18;
    pointer-events: none;
    transition: opacity 0.18s;
  }
  .sao-stat-card:hover .sao-stat-icon { opacity: 0.28; }
  .sao-stat-body { min-width: 0; position: relative; z-index: 1; }
  .sao-stat-label { font-size: 10.5px; font-weight: 800; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .sao-stat-value { font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; color: ${TEXT}; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
  .sao-stat-sub { font-size: 10.5px; color: rgba(138,115,104,0.7); font-weight: 500; }

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

  .sao-status-dot { width: 7px; height: 7px; border-radius: 50%; background: ${SUCCESS}; box-shadow: 0 0 0 3px rgba(34,197,94,0.16); }
  .sao-status-dot.off { background: ${DANGER}; box-shadow: 0 0 0 3px rgba(239,68,68,0.16); }

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
    text-align: left !important;
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
    text-align: left !important;
  }
  .sao-table tbody tr:last-child td { border-bottom: none; }
  .sao-table tbody tr { transition: background 0.14s; }
  .sao-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  /* ── Unified table look: single row colour, maroon text, left aligned ── */
  .sao-table thead th, .sao-table tbody td { text-align: left !important; }
  .sao-table tbody tr td { background: ${CARD}; color: ${MAROON}; }
  .sao-table tbody tr:hover td { background: ${MAROON_SOFT}; }
  .sao-name-cell, .sao-fig { color: ${MAROON} !important; }
  .sao-code-badge { color: ${MAROON} !important; }
  .sao-table-empty { text-align: center; padding: 0; }

  .sao-name-cell { font-weight: 800; color: ${TEXT}; }
  .sao-name-wrap { display: flex; align-items: center; justify-content: flex-start; gap: 12px; min-width: 0; }
  .sao-name-logo {
    flex: 0 0 auto;
    width: 36px; height: 36px; border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, ${GOLD} 0%, #F5E4A8 50%, ${GOLD} 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 4px rgba(59,42,37,0.18);
  }
  .sao-name-logo img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #fff; display: block; }
  .sao-name-logo.empty { background: ${MAROON_SOFT}; box-shadow: none; border: 1px solid ${BORDER}; }
  .sao-code-badge {
    display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.02em;
    border-radius: 999px; padding: 4px 12px;
    background: ${GOLD_PALE}; color: ${GOLD_DEEP};
  }
  .sao-status-row { display: flex; align-items: center; gap: 6px; }
  .sao-status-label { font-size: 12px; font-weight: 700; }
  .sao-fig {
    background: ${MAROON_SOFT}; color: ${MAROON};
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
  .sao-skel-stat { height: 92px; border-radius: 16px; }
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
    .sao-table thead th:nth-child(3), .sao-table tbody td:nth-child(3) { display: none; }
  }
  @media (max-width: 560px) {
    .sao-table thead th:nth-child(2), .sao-table tbody td:nth-child(2) { display: none; }
    .sao-hero { padding: 22px 18px 18px; border-radius: 20px; }
    .sao-hero-title { font-size: 19px; gap: 10px; }
    .sao-hero-sub { font-size: 13.5px; }
    .sao-stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 430px) {
    .sao-hero { padding: 20px 16px 16px; }
    .sao-hero-eyebrow { font-size: 10px; padding: 5px 12px; margin-bottom: 12px; }
    .sao-hero-title { font-size: 17px; line-height: 1.3; gap: 9px; }
    .sao-hero-sub { font-size: 12.5px; line-height: 1.55; }
    .sao-search input { font-size: 12.5px; padding: 10px 12px 10px 36px; }
  }
  @media (max-width: 340px) {
    .sao-hero-title { font-size: 15.5px; }
  }

  /* ── Responsive banner: title + date adapt to every screen width ── */
  .sao-hero { flex-wrap: nowrap; align-items: center; }
  .sao-hero-left { flex: 1 1 0; min-width: 0; }
  .sao-hero-title { font-size: clamp(18px, 1.2vw + 14px, 26px); line-height: 1.25; overflow-wrap: anywhere; }
  .sao-hero-sub { font-size: clamp(12.5px, 0.35vw + 11.5px, 15px); }
  @media (max-width: 560px) {
    .sao-hero { flex-wrap: wrap; gap: 14px; }
    .sao-hero-left { flex: 1 1 100%; }
  }
`;

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
        // Supabase returns at most 1000 rows per request, which would silently
        // cap the counts below on larger campuses — so page through profiles.
        const fetchAllProfiles = async () => {
          const rows = [];
          const STEP = 1000;
          for (let from = 0; ; from += STEP) {
            const { data, error } = await supabaseAdmin
              .from('profiles')
              .select('id, campus_id, role')
              .range(from, from + STEP - 1);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < STEP) break;
          }
          return rows;
        };

        const [campusRes, allProfiles, booksRes] = await Promise.all([
          supabaseAdmin.from('campuses').select('id, campus_name, campus_code, is_active, logo_url'),
          fetchAllProfiles(),
          supabaseAdmin.from('books').select('id, campus_id, registration_status'),
        ]);

        const allCampuses = campusRes.data || [];
        const allBooks    = booksRes.data || [];
        // Librarians = library managers assigned to a campus.
        const allLibs     = allProfiles.filter(p => p.role === 'library_manager' && p.campus_id);

        const students      = allProfiles.filter(p => p.role === 'student');
        // Total Employees = librarians + regular employees assigned to a campus.
        // (The Librarians stat is kept separately; librarians are counted in both.)
        const employees     = allProfiles.filter(p => (p.role === 'library_manager' || p.role === 'employee') && p.campus_id);
        // Books still waiting on Super Admin approval (same rule as the Books page).
        const pendingBooks = allBooks.filter(b => b.registration_status === 'pending');

        setStats({
          totalCampuses:   allCampuses.length,
          totalStudents:   students.length,
          totalBooks:      allBooks.length,
          totalLibrarians: allLibs.length,
          totalEmployees:  employees.length,
        });

        const breakdown = allCampuses.map(c => ({
          ...c,
          students:   students.filter(p => p.campus_id === c.id).length,
          books:      allBooks.filter(b => b.campus_id === c.id).length,
          pending:    pendingBooks.filter(b => b.campus_id === c.id).length,
          librarians: allLibs.filter(l => l.campus_id === c.id).length,
          employees:  employees.filter(e => e.campus_id === c.id).length,
        }));
        setCampuses(breakdown);
      } catch (e) {
        console.error('[SuperAdminOverview] load error:', e);
      }
      setLoading(false);
    }
    load();
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
          <div className="sao-hero-bar" />
          <div className="sao-hero-left">
            <div className="sao-hero-title">
              Empowering Knowledge Across Every Campus
            </div>
            <div className="sao-hero-sub">
            Bringing every campus library together through centralized management,
            real-time monitoring, and intelligent insights.
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="sao-stats-grid">
          {STATS_CONFIG.map(({ key, label, sub, Icon }) => (
            <div key={key} className="sao-stat-card">
              <div className="sao-stat-icon"><Icon size={34} strokeWidth={1.6} /></div>
              <div className="sao-stat-body">
                <div className="sao-stat-label">{label}</div>
                <div className="sao-stat-value">{stats?.[key] ?? 0}</div>
                <div className="sao-stat-sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                          <td className="sao-name-cell">
                            <div className="sao-name-wrap">
                              <span className={`sao-name-logo${c.logo_url ? '' : ' empty'}`}>
                                {c.logo_url ? (
                                  <img
                                    src={c.logo_url}
                                    alt=""
                                    onError={ev => { ev.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <Building2 size={16} color={MAROON} />
                                )}
                              </span>
                              <span>{c.campus_name}</span>
                            </div>
                          </td>
                          <td><span className="sao-code-badge">{c.campus_code}</span></td>
                          <td><span className="sao-fig">{c.librarians}</span></td>
                          <td><span className="sao-fig">{c.employees}</span></td>
                          <td><span className="sao-fig">{c.students}</span></td>
                          <td><span className="sao-fig">{c.books}</span></td>
                          <td><span className="sao-fig">{c.pending}</span></td>
                          <td>
                            <div className="sao-status-row">
                              <span className={`sao-status-dot${c.is_active ? '' : ' off'}`} style={{ boxShadow: 'none' }} />
                              <span className="sao-status-label" style={{ color: c.is_active ? '#178A4C' : '#B91C1C' }}>
                                {c.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
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