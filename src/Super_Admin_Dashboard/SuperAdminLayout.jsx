import { useState, useEffect } from 'react';
import { LayoutGrid, Building2, BookOpen, BarChart3, Users, Settings as SettingsIcon } from 'lucide-react';
import SuperAdminOverview    from './SuperAdminOverview';
import CampusManagementHub   from './CampusManagementHub';
import LibrarianManagement   from './LibrarianManagement';
import SuperAdminBooks       from './SuperAdminBooks';
import SuperAdminAnalytics   from './SuperAdminAnalytics';
import SuperAdminSettings    from './SuperAdminSettings';

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
    key: 'analytics', label: 'Analytics',
    icon: <BarChart3 size={18} strokeWidth={1.8} />,
  },
  {
    key: 'librarians', label: 'Librarian',
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
`;

// ---------------------------------------------------------------------------
// URL <-> tab mapping. Gives each Super Admin tab a real browser URL
// (e.g. /superadmin/campuses) using the native History API — no router
// dependency required, and no changes needed anywhere outside this file.
// ---------------------------------------------------------------------------
const PATH_BY_PAGE = {
  overview:   '/superadmin/overview',
  campuses:   '/superadmin/campuses',
  books:      '/superadmin/books',
  analytics:  '/superadmin/analytics',
  librarians: '/superadmin/librarians',
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
      case 'analytics':
        return <SuperAdminAnalytics />;
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
            {PAGES.map(({ key, label, icon }) => (
              <button
                key={key}
                className={`sa-topnav-item${page === key ? ' active' : ''}`}
                onClick={() => navigateTo(key)}
              >
                <span className="sa-topnav-icon">{icon}</span>
                <span className="sa-topnav-label">{label}</span>
              </button>
            ))}
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