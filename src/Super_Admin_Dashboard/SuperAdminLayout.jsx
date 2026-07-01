import { useState } from 'react';
import SuperAdminOverview    from './SuperAdminOverview';
import CampusManagementHub   from './CampusManagementHub';
import LibrarianManagement   from './LibrarianManagement';
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
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    key: 'campuses', label: 'Campuses',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    key: 'librarians', label: 'Librarian',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    key: 'settings', label: 'Settings',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

const CSS = `
  .sa-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: ${CREAM};
    font-family: var(--font-sans, 'DM Sans', 'Josefin Sans', sans-serif);
  }

  /* ---------- Top bar ---------- */
  .sa-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    padding: 10px 26px;
    box-shadow: 0 3px 14px rgba(40,0,0,0.30);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .sa-brand { display:flex; align-items:center; gap:10px; }
  .sa-brand img {
    width: 38px; height: 38px; border-radius: 50%; object-fit: cover;
    border: 2px solid rgba(245,228,168,0.55);
    background: #fff;
  }
  .sa-brand-title { font-size: 15px; font-weight: 800; letter-spacing: 0.05em; color: #fff; line-height: 1.15; }
  .sa-brand-sub { font-size: 9px; font-weight: 600; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(245,228,168,0.75); }

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
    width: 56px; height: 56px; border-radius: 50%;
    background: #fff;
    color: ${MAROON};
    box-shadow: 0 10px 22px rgba(20,0,0,0.40), 0 2px 6px rgba(0,0,0,0.18);
    margin-top: -26px;
  }
  .sa-topnav-item.active .sa-topnav-icon svg { width: 24px; height: 24px; }

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

  @media (max-width: 768px) {
    .sa-topbar { padding: 10px 14px; }
    .sa-brand-title { font-size: 13px; }
    .sa-topnav { gap: 14px; }
    .sa-topnav-label { display: none; }
    .sa-content { padding: 16px; }
  }
`;

export default function SuperAdminLayout({ user, onSignOut }) {
  const [page, setPage] = useState('overview');

  const renderPage = () => {
    switch (page) {
      case 'overview':
        return <SuperAdminOverview />;
      case 'campuses':
        return <CampusManagementHub user={user} onNavigate={setPage} />;
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
            <img src="/LibraryLogo.png" alt="PSU" />
            <div>
              <div className="sa-brand-title">LIBRASCAN</div>
              <div className="sa-brand-sub">Pampanga State University</div>
            </div>
          </div>

          <nav className="sa-topnav">
            {PAGES.map(({ key, label, icon }) => (
              <button
                key={key}
                className={`sa-topnav-item${page === key ? ' active' : ''}`}
                onClick={() => setPage(key)}
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