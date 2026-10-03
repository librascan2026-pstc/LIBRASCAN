import { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Building2, BookOpen, Users, Settings as SettingsIcon } from 'lucide-react';
import SuperAdminOverview    from './SuperAdminOverview';
import CampusManagementHub   from './CampusManagementHub';
import LibrarianManagement   from './LibrarianManagement';
import SuperAdminBooks       from './SuperAdminBooks';
import SuperAdminSettings    from './SuperAdminSettings';
import { supabaseAdmin }     from '../supabaseClient';

/* ============================================================================
   LIBRASCAN — Super Admin Layout (Top Bar Navigation)
   Palette matches Dashboard.css reference: cream base / maroon bar / gold accents
============================================================================ */

const MAROON       = '#6E0000';
const MAROON_DEEP   = '#5A0000';
const MAROON_MID    = '#8B0000';
const GOLD          = '#C9A84C';
const GOLD_PALE     = '#F5E4A8';
const CREAM         = '#FDF8F0';

const PAGES = [
  {
    key: 'overview', label: 'Dashboard',
    icon: <LayoutGrid size={18} strokeWidth={1.8} />,
  },
  {
    key: 'campuses', label: 'Campuses',
    icon: <Building2 size={18} strokeWidth={1.8} />,
  },
  {
    key: 'books', label: 'Books',
    icon: <BookOpen size={18} strokeWidth={1.8} />,
  },
  {
    key: 'librarians', label: 'Users',
    icon: <Users size={18} strokeWidth={1.8} />,
  },
  {
    key: 'settings', label: 'Settings',
    icon: <SettingsIcon size={18} strokeWidth={1.8} />,
  },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap');

  html, body, #root {
    background: ${CREAM} !important;
    color-scheme: light;
  }

  .sa-layout, .sa-layout *, .sa-layout *::before, .sa-layout *::after {
    box-sizing: border-box;
  }

  .sa-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: ${CREAM};
    font-family: var(--font-sans, 'DM Sans', 'Josefin Sans', sans-serif);
    overflow-x: hidden;
    width: 100%;
  }

  /* ---------- Top bar ---------- */
  .sa-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    padding: 16px 30px;
    padding-top: max(16px, env(safe-area-inset-top));
    padding-left: max(30px, env(safe-area-inset-left));
    padding-right: max(30px, env(safe-area-inset-right));
    box-shadow: 0 3px 14px rgba(40,0,0,0.30);
    position: sticky;
    top: 0;
    z-index: 100;
    gap: 12px;
    width: 100%;
  }
  .sa-topbar-title {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Cinzel', var(--font-sans, serif);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: rgba(212,175,55,0.32);
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
  }
  .sa-brand { display: flex; align-items: center; gap: 14px; min-width: 0; flex-shrink: 1; }
  .sa-brand-logo-ring {
    flex-shrink: 0;
    width: 44px; height: 44px;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, ${GOLD} 0%, ${GOLD_PALE} 50%, ${GOLD} 100%);
    box-shadow: 0 2px 10px rgba(0,0,0,0.28);
    display: flex; align-items: center; justify-content: center;
  }
  .sa-brand img {
    width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
    border: 2px solid ${MAROON_DEEP};
    background: #fff;
    display: block;
  }
  .sa-brand-text { display: flex; flex-direction: column; justify-content: center; gap: 5px; min-width: 0; overflow: hidden; }
  .sa-brand-title {
    font-family: 'Cinzel', var(--font-sans, serif);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.13em;
    color: #fff;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sa-brand-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${GOLD_PALE};
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sa-brand-sub::before {
    content: '';
    width: 12px; height: 1px;
    background: ${GOLD};
    flex-shrink: 0;
  }

  .sa-topnav { display: flex; align-items: center; gap: 34px; position: relative; }
  .sa-topnav-item {
    display: flex; flex-direction: column; align-items: center;
    background: transparent; border: none; cursor: pointer;
    font-family: inherit; padding: 0; position: relative;
  }
  .sa-topnav-icon {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.82);
    transition: color 0.18s, transform 0.15s;
  }
  .sa-topnav-icon { position: relative; }
  .sa-topnav-item:hover .sa-topnav-icon { color: #fff; transform: scale(1.08); }
  .sa-topnav-item.active:hover .sa-topnav-icon { transform: none; }

  .sa-topnav-item.active .sa-topnav-icon {
    width: 52px; height: 52px; border-radius: 50%;
    background: #fff;
    color: ${MAROON};
    box-shadow: 0 8px 18px rgba(20,0,0,0.38), 0 2px 6px rgba(0,0,0,0.16);
    margin-top: -18px;
  }
  .sa-topnav-item.active .sa-topnav-icon svg { width: 22px; height: 22px; }

  /* ---------- Pending-registration badge (Books tab) ---------- */
  .sa-topnav-badge {
    position: absolute;
    top: -8px; right: -10px;
    min-width: 18px; height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(180deg, #FF5A4F 0%, #E11D2E 100%);
    color: #fff;
    font-size: 10.5px; font-weight: 800; line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
    box-shadow: 0 0 0 2px ${MAROON_DEEP}, 0 3px 8px rgba(0,0,0,0.35);
    pointer-events: none;
    z-index: 2;
    animation: sa-badge-pop 0.38s cubic-bezier(.22,1.4,.36,1);
  }
  .sa-topnav-item.active .sa-topnav-badge { top: -2px; right: -4px; }
  .sa-topnav-badge.fresh::after {
    content: '';
    position: absolute; inset: 0;
    border-radius: inherit;
    box-shadow: 0 0 0 0 rgba(255,90,79,0.65);
    animation: sa-badge-ping 1.1s ease-out 2;
  }
  .sa-topnav-item.ring .sa-topnav-icon svg {
    transform-origin: 50% 12%;
    animation: sa-bell-ring 0.9s ease-in-out 2;
  }
  @keyframes sa-badge-pop {
    0%   { transform: scale(0.4); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes sa-badge-ping {
    0%   { box-shadow: 0 0 0 0 rgba(255,90,79,0.65); }
    100% { box-shadow: 0 0 0 11px rgba(255,90,79,0); }
  }
  @keyframes sa-bell-ring {
    0%, 100% { transform: rotate(0); }
    20% { transform: rotate(-14deg); }
    40% { transform: rotate(12deg); }
    60% { transform: rotate(-8deg); }
    80% { transform: rotate(5deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sa-topnav-badge, .sa-topnav-badge.fresh::after, .sa-topnav-item.ring .sa-topnav-icon svg { animation: none; }
  }

  .sa-topnav-label {
    font-size: 9.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase;
    color: #fff;
    margin-top: 4px;
    height: 11px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .sa-topnav-item.active .sa-topnav-label { opacity: 1; }

  /* ---------- Main ---------- */
  .sa-main { flex: 1; display: flex; flex-direction: column; }
  .sa-content { flex: 1; padding: 26px 30px 40px; }

  /* ============================================================
     RESPONSIVE — tuned for real device widths, not just breakpoints:
     ~768px (tablets / small laptops), ~430px (large phones: iPhone
     Pro Max, most Android), ~375px (iPhone SE / compact Android),
     ~340px (oldest/smallest phones still in use).
  ============================================================ */

  /* Tablets & small laptops — tighten spacing, keep single row */
  @media (max-width: 768px) {
    .sa-topbar { padding-left: max(20px, env(safe-area-inset-left)); padding-right: max(20px, env(safe-area-inset-right)); }
    .sa-brand-title { font-size: 14px; }
    .sa-topnav { gap: 18px; }
    .sa-topnav-label { display: none; }
    .sa-content { padding: 20px; }
    .sa-topbar-title { display: none; }
  }

  /* Phones — Facebook-style layout: brand row on top, a full-width,
     evenly spaced, icon-only tab row underneath with real touch targets */
  @media (max-width: 560px) {
    .sa-topbar {
      flex-wrap: wrap;
      align-items: center;
      padding: 10px 14px 0;
      padding-top: max(10px, env(safe-area-inset-top));
      padding-left: max(14px, env(safe-area-inset-left));
      padding-right: max(14px, env(safe-area-inset-right));
      gap: 0;
    }
    .sa-brand { flex: 1 1 auto; min-width: 0; }
    .sa-brand-logo-ring { width: 36px; height: 36px; }
    .sa-brand-title { font-size: 13px; letter-spacing: 0.1em; }
    .sa-brand-sub { font-size: 8px; }

    .sa-topnav {
      order: 3;
      flex-basis: 100%;
      width: 100%;
      gap: 0;
      margin-top: 8px;
      padding-top: 2px;
      border-top: 1px solid rgba(212,175,55,0.20);
    }
    .sa-topnav-item {
      flex: 1 1 0;
      min-width: 0;
      min-height: 48px;
      justify-content: center;
      padding: 8px 2px 9px;
    }
    .sa-topnav-item.active .sa-topnav-icon {
      width: 36px; height: 36px;
      margin-top: 0;
      box-shadow: 0 4px 10px rgba(20,0,0,0.32);
    }
    .sa-topnav-item.active .sa-topnav-icon svg { width: 18px; height: 18px; }
    .sa-topnav-badge { top: -6px; right: -8px; min-width: 17px; height: 17px; font-size: 10px; }
    .sa-topnav-item.active .sa-topnav-badge { top: -4px; right: -6px; }
    /* Facebook-style active indicator: a small underline instead of a
       floating pill, since the icon row no longer overlaps the bar edge */
    .sa-topnav-item::after {
      content: '';
      position: absolute;
      bottom: 0; left: 50%;
      transform: translateX(-50%);
      width: 0; height: 2.5px;
      border-radius: 2px;
      background: ${GOLD};
      transition: width 0.18s ease;
    }
    .sa-topnav-item.active::after { width: 22px; }
    .sa-content { padding: 16px; }
  }

  /* Compact phones (iPhone SE, small Android) — trim further, never overflow */
  @media (max-width: 375px) {
    .sa-brand-logo-ring { width: 32px; height: 32px; }
    .sa-brand-title { font-size: 12px; letter-spacing: 0.08em; }
    .sa-brand-sub { display: none; }
    .sa-topnav-item { min-height: 46px; padding: 7px 0 8px; }
    .sa-topnav-icon { width: 20px; height: 20px; }
    .sa-topnav-item.active .sa-topnav-icon { width: 33px; height: 33px; }
    .sa-topnav-item.active .sa-topnav-icon svg { width: 17px; height: 17px; }
    .sa-content { padding: 12px; }
  }

  /* Smallest phones still in circulation */
  @media (max-width: 340px) {
    .sa-brand-sub { display: none; }
    .sa-topbar { padding-left: 10px; padding-right: 10px; }
    .sa-topnav-item { padding-left: 0; padding-right: 0; }
  }

  /* ============================================================
     TABLES — every Super Admin table shows in full when the screen is
     wide enough; on phones / tablets / narrow windows it scrolls
     sideways (swipe on touch, click-and-drag with a mouse).
  ============================================================ */
  .sao-table-scroll, .cmh-table-scroll, .lbm-table-scroll, .sab-table-scroll {
    overflow-x: auto;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(110,0,0,0.30) transparent;
  }
  .sao-table-scroll::-webkit-scrollbar,
  .cmh-table-scroll::-webkit-scrollbar,
  .lbm-table-scroll::-webkit-scrollbar,
  .sab-table-scroll::-webkit-scrollbar { height: 8px; }
  .sao-table-scroll::-webkit-scrollbar-thumb,
  .cmh-table-scroll::-webkit-scrollbar-thumb,
  .lbm-table-scroll::-webkit-scrollbar-thumb,
  .sab-table-scroll::-webkit-scrollbar-thumb { background: rgba(110,0,0,0.28); border-radius: 8px; }
  .sao-table-scroll::-webkit-scrollbar-thumb:hover,
  .cmh-table-scroll::-webkit-scrollbar-thumb:hover,
  .lbm-table-scroll::-webkit-scrollbar-thumb:hover,
  .sab-table-scroll::-webkit-scrollbar-thumb:hover { background: rgba(110,0,0,0.45); }

  /* Set by the drag-to-scroll handler below, only when a table overflows */
  .sa-can-drag { cursor: grab; }
  .sa-dragging, .sa-dragging * {
    cursor: grabbing !important;
    user-select: none !important;
    -webkit-user-select: none !important;
  }
`;

// Any table scroller used by a Super Admin page (Dashboard, Campuses, Books, Users).
const TABLE_SCROLL_SELECTOR =
  '.sao-table-scroll, .cmh-table-scroll, .lbm-table-scroll, .sab-table-scroll';

// ---------------------------------------------------------------------------
// URL <-> tab mapping. Gives each Super Admin tab a real browser URL
// (e.g. /superadmin/campuses) using the native History API — no router
// dependency required, and no changes needed anywhere outside this file.
// ---------------------------------------------------------------------------
const PATH_BY_PAGE = {
  overview:   '/superadmin/overview',
  campuses:   '/superadmin/campuses',
  books:      '/superadmin/books',
  librarians: '/superadmin/users',
  settings:   '/superadmin/settings',
};
const PAGE_BY_PATH = Object.fromEntries(
  Object.entries(PATH_BY_PAGE).map(([key, path]) => [path, key])
);

function pageFromCurrentPath() {
  return PAGE_BY_PATH[window.location.pathname] || 'overview';
}

export default function SuperAdminLayout({ user, onSignOut }) {
  const [page, setPage] = useState(pageFromCurrentPath);

  // ── New book-registration alert (Books tab badge + chime) ───────────────
  // The badge always mirrors how many books are still waiting for the Super
  // Admin's decision (registration_status = 'pending'), read straight from
  // the database. It only goes down when a book is confirmed or rejected —
  // opening the Books page, switching tabs or refreshing never clears it.
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFresh, setPendingFresh] = useState(false);
  const knownPendingRef = useRef(null);   // Set of pending ids; null until the first load
  const audioCtxRef     = useRef(null);
  const freshTimerRef   = useRef(null);

  // Browsers keep audio locked until the page has had a user gesture, so
  // prepare the audio context on the first click/tap/key press.
  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch { /* audio unavailable — the badge still works */ }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let seq = 0;
    let debounceTimer = null;
    let ch = null;

    // Fixed, always-on alarm: three urgent two-tone bursts (~1.4s) so a new
    // registration can't be missed. No preference toggle by design.
    const playChime = () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        const ring = () => {
          const note = (freq, start, dur) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            const t0 = ctx.currentTime + start;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
            gain.gain.setValueAtTime(0.22, t0 + dur - 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
          };
          for (let i = 0; i < 3; i += 1) {
            note(988,  i * 0.5,        0.17);
            note(1319, i * 0.5 + 0.2,  0.17);
          }
        };
        if (ctx.state === 'suspended') ctx.resume().then(ring).catch(() => {});
        else ring();
      } catch { /* audio unavailable — the badge still works */ }
    };

    const fetchPending = async () => {
      const mySeq = ++seq;
      const { data, error } = await supabaseAdmin
        .from('books')
        .select('id')
        .eq('registration_status', 'pending');
      // Ignore failed, stale (out-of-order) or post-unmount responses.
      if (cancelled || mySeq !== seq || error || !data) return;

      const ids  = new Set(data.map(b => b.id));
      const prev = knownPendingRef.current;
      knownPendingRef.current = ids;
      setPendingCount(ids.size);

      // First load only sets the baseline. After that, any id we have not
      // seen before is a genuinely new submission from a librarian.
      if (prev) {
        let hasNew = false;
        ids.forEach(id => { if (!prev.has(id)) hasNew = true; });
        if (hasNew) {
          playChime();
          setPendingFresh(true);
          if (freshTimerRef.current) clearTimeout(freshTimerRef.current);
          freshTimerRef.current = setTimeout(() => setPendingFresh(false), 2400);
        }
      }
    };

    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchPending, 250);
    };

    fetchPending();

    // Instant path: any change on `books` re-checks the pending list.
    try {
      ch = supabaseAdmin
        .channel(`sa-pending-books-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, schedule)
        .subscribe();
    } catch { /* realtime unavailable — polling below still keeps it accurate */ }

    // Safety net for projects with Realtime disabled on `books`, and for
    // approve/reject actions that only update the Books page's local state.
    const pollId = setInterval(fetchPending, 6000);
    const onVisible = () => { if (!document.hidden) fetchPending(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (freshTimerRef.current) clearTimeout(freshTimerRef.current);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      if (ch) { try { supabaseAdmin.removeChannel(ch); } catch { /* already closed */ } }
    };
  }, []);

  // If we land here on an unmapped path (e.g. "/" or "/superadmin"),
  // normalize the address bar to match whichever tab is showing.
  useEffect(() => {
    const targetPath = PATH_BY_PAGE[page];
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ page }, '', targetPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the tab in sync with browser Back/Forward navigation.
  useEffect(() => {
    const onPopState = () => setPage(pageFromCurrentPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Click-and-drag horizontal scrolling for every table scroller (mouse only —
  // touch screens already swipe natively). It does nothing while a table fits
  // entirely on screen, so wide screens behave exactly as before.
  useEffect(() => {
    let el = null;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const overflows = (node) => node.scrollWidth > node.clientWidth + 1;

    const onOver = (e) => {
      const t = e.target.closest && e.target.closest(TABLE_SCROLL_SELECTOR);
      if (t) t.classList.toggle('sa-can-drag', overflows(t));
    };

    const onDown = (e) => {
      if (e.button !== 0) return;
      const t = e.target.closest && e.target.closest(TABLE_SCROLL_SELECTOR);
      if (!t || !overflows(t)) return;
      // Leave form controls fully usable.
      if (e.target.closest('input, textarea, select, option, label')) return;
      el = t;
      startX = e.pageX;
      startScroll = t.scrollLeft;
      moved = false;
    };

    const onMove = (e) => {
      if (!el) return;
      const dx = e.pageX - startX;
      if (!moved) {
        if (Math.abs(dx) < 5) return;
        moved = true;
        el.classList.add('sa-dragging');
      }
      el.scrollLeft = startScroll - dx;
      e.preventDefault();
    };

    const onEnd = () => {
      if (!el) return;
      el.classList.remove('sa-dragging');
      if (moved) {
        // A drag must not also count as a click on the row/button underneath.
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener('click', swallow, true);
        window.setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      }
      el = null;
      moved = false;
    };

    // Stop the browser's native image/text drag from hijacking the gesture.
    const onDragStart = (e) => {
      if (e.target.closest && e.target.closest(TABLE_SCROLL_SELECTOR)) e.preventDefault();
    };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('dragstart', onDragStart);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  // Use this instead of setPage() wherever the tab changes, so the URL
  // always stays in sync with what's on screen.
  const navigateTo = (key) => {
    const targetPath = PATH_BY_PAGE[key] || PATH_BY_PAGE.overview;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: key }, '', targetPath);
    }
    setPage(key);
  };

  const renderPage = () => {
    switch (page) {
      case 'overview':
        return <SuperAdminOverview />;
      case 'campuses':
        return <CampusManagementHub user={user} onNavigate={navigateTo} />;
      case 'books':
        return <SuperAdminBooks />;
      case 'librarians':
        return <LibrarianManagement />;
      case 'settings':
        return <SuperAdminSettings user={user} onSignOut={onSignOut} />;
      default:
        return <SuperAdminOverview />;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="sa-layout">

        {/* Top bar */}
        <header className="sa-topbar">
          <div className="sa-brand">
            <div className="sa-brand-logo-ring">
              <img src="/LibraryLogo.png" alt="PSU" />
            </div>
            <div className="sa-brand-text">
              <div className="sa-brand-title">LIBRASCAN</div>
              <div className="sa-brand-sub">Pampanga State University</div>
            </div>
          </div>

          <div className="sa-topbar-title">Super Admin</div>

          <nav className="sa-topnav">
            {PAGES.map(({ key, label, icon }) => {
              const badge = key === 'books' ? pendingCount : 0;
              return (
                <button
                  key={key}
                  className={`sa-topnav-item${page === key ? ' active' : ''}${badge > 0 && pendingFresh ? ' ring' : ''}`}
                  onClick={() => navigateTo(key)}
                  aria-label={badge > 0 ? `${label}, ${badge} pending book registration${badge === 1 ? '' : 's'}` : undefined}
                >
                  <span className="sa-topnav-icon">
                    {icon}
                    {badge > 0 && (
                      <span key={badge} className={`sa-topnav-badge${pendingFresh ? ' fresh' : ''}`} aria-hidden="true">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  <span className="sa-topnav-label">{label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Main */}
        <main className="sa-main">
          <div className="sa-content">
            {renderPage()}
          </div>
        </main>
      </div>
    </>
  );
}