// src/Admin_Dashboard/Dashboard.jsx
import { useState } from 'react';
import { useAuth } from '../Login_SignUp/AuthContext';
import './Dashboard.css';

// ─── Page Components ──────────────────────────────────────────────────────────
import Overview            from './Overview';
import AttendanceMonitoring from './AttendanceMonitoring';
import BookManagement      from './BookManagement';
import OnlineCatalog       from './Book_Catalog';
import UserManagement      from './UserManagement';
import ReportsAnalytics    from './Reports_Analytics';
import Settings            from './Settings';

// ─── Icons ────────────────────────────────────────────────────────────────────
const NavIcons = {
  overview:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  attendance:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  bookmanage:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  catalog:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  users:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  reports:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  settings:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  bell:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  chevron:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  logout:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  dot:         <svg width="5" height="5" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>,
  // Collapse/expand arrows
  collapseLeft: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
};

// ─── Nav Structure ────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',    label: 'Overview',             icon: 'overview',   section: 'MAIN' },
  { id: 'attendance',  label: 'Attendance Monitoring', icon: 'attendance', section: 'MAIN' },
  {
    id: 'bookmanage', label: 'Book Management', icon: 'bookmanage', section: 'LIBRARY',
    sub: [
      { id: 'borrowed', label: 'Borrowed' },
      { id: 'return',   label: 'Return'   },
    ],
  },
  { id: 'catalog',  label: 'Book Catalog',      icon: 'catalog',  section: 'LIBRARY' },
  { id: 'users',    label: 'User Management',   icon: 'users',    section: 'ADMIN' },
  { id: 'reports',  label: 'Reports & Analytics', icon: 'reports', section: 'ADMIN' },
  { id: 'settings', label: 'Settings',          icon: 'settings', section: 'SYSTEM' },
];

const SECTION_LABELS = ['MAIN', 'LIBRARY', 'ADMIN', 'SYSTEM'];

const LABEL_MAP = {
  overview:    'Overview Dashboard',
  attendance:  'Attendance Monitoring',
  bookmanage:  'Book Management',
  catalog:     'Book Catalog',
  users:       'User Management',
  reports:     'Reports & Analytics',
  settings:    'Settings',
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onSignOut }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab]       = useState('overview');
  const [subPage,   setSubPage]         = useState('borrowed');
  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Derive display info
  const firstName  = profile?.first_name  || user?.user_metadata?.first_name || '';
  const lastName   = profile?.last_name   || user?.user_metadata?.last_name  || '';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'A';
  const displayName = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'Admin';
  const role        = profile?.role || user?.user_metadata?.role || 'library_manager';
  const roleLabel   = role === 'library_manager' ? 'Library Manager'
                    : role === 'admin' ? 'Administrator' : 'Student';
  const avatarUrl   = profile?.avatar_url || null;

  const navigate = (tab) => {
    if (tab === 'bookmanage') {
      // When collapsed, clicking bookmanage just expands sidebar first
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
        setTimeout(() => setBookMenuOpen(o => !o), 60);
        return;
      }
      setBookMenuOpen(o => !o);
      return;
    }
    setActiveTab(tab);
    if (tab !== 'bookmanage') setBookMenuOpen(false);
  };

  const navigateFromOverview = (tab) => {
    setActiveTab(tab);
    setBookMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':   return <Overview onNavigate={navigateFromOverview} />;
      case 'attendance': return <AttendanceMonitoring />;
      case 'bookmanage': return <BookManagement subPage={subPage} />;
      case 'catalog':    return <OnlineCatalog />;
      case 'users':      return <UserManagement />;
      case 'reports':    return <ReportsAnalytics />;
      case 'settings':   return <Settings user={user} onSignOut={onSignOut} />;
      default:           return <Overview onNavigate={navigateFromOverview} />;
    }
  };

  // Group nav items by section
  const sections = SECTION_LABELS.map(s => ({
    label: s,
    items: NAV.filter(n => n.section === s),
  }));

  return (
    <div className="lm-shell">

      {/* ── Sidebar ── */}
      <aside className={`lm-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>

        {/* Logo */}
        <div className="lm-sidebar-logo">
          <div className="lm-logo-icon">
            <img src="/LibraryLogo.png" alt="LIBRASCAN Logo" />
          </div>
          <div>
            <div className="lm-logo-text">LIBRASCAN</div>
            <div className="lm-logo-sub">QR Code Based Library Management System</div>
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          className="lm-collapse-btn"
          onClick={() => {
            setSidebarCollapsed(o => !o);
            if (!sidebarCollapsed) setBookMenuOpen(false);
          }}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span style={{ flexShrink: 0, display: 'flex', transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)', transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            {NavIcons.collapseLeft}
          </span>
          {!sidebarCollapsed && (
            <span style={{ fontSize: 10, letterSpacing: '0.08em', opacity: 0.75 }}>Collapse</span>
          )}
        </button>

        {/* Nav sections */}
        <nav className="lm-nav">
          {sections.map(({ label, items }) => items.length > 0 && (
            <div key={label}>
              <div className="lm-nav-section">
                <div className="lm-nav-section-label">{label}</div>
              </div>
              {items.map(item => (
                <div key={item.id}>
                  <button
                    className={`lm-nav-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => navigate(item.id)}
                    data-tooltip={sidebarCollapsed ? item.label : undefined}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="lm-nav-item-icon">{NavIcons[item.icon]}</span>
                    <span className="lm-nav-item-label">{item.label}</span>
                    {item.sub && (
                      <span className="lm-chevron" style={{
                        transition: 'transform 0.2s ease',
                        transform: bookMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: 'var(--text-dim)',
                        flexShrink: 0,
                      }}>
                        {NavIcons.chevron}
                      </span>
                    )}
                  </button>

                  {/* Sub-menu — hidden when collapsed */}
                  {item.sub && !sidebarCollapsed && (
                    <div className={`lm-nav-sub ${bookMenuOpen ? 'open' : ''}`}>
                      {item.sub.map(s => (
                        <button
                          key={s.id}
                          className={`lm-nav-sub-item ${activeTab === 'bookmanage' && subPage === s.id ? 'active' : ''}`}
                          onClick={() => { setActiveTab('bookmanage'); setSubPage(s.id); }}
                        >
                          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{NavIcons.dot}</span>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer / Logout */}
        <div className="lm-sidebar-footer">
          <button
            className="lm-nav-item lm-nav-item--logout"
            onClick={onSignOut}
            data-tooltip={sidebarCollapsed ? 'Sign Out' : undefined}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
          >
            <span className="lm-nav-item-icon">{NavIcons.logout}</span>
            <span className="lm-nav-item-label lm-logout-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className={`lm-main${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>

        {/* Topbar */}
        <header className="lm-topbar">
          <div className="lm-topbar-left">
          </div>

          <div className="lm-topbar-right">
            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button
                className="lm-notif-btn"
                onClick={() => setNotifOpen(o => !o)}
                aria-label="Notifications"
              >
                {NavIcons.bell}
                <span className="lm-notif-dot" />
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0,
                  width: 280,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
                  zIndex: 200,
                  overflow: 'hidden',
                  animation: 'lm-fade-in 0.22s ease',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                    color: 'var(--gold-pale)',
                    letterSpacing: '0.04em',
                  }}>
                    Notifications
                  </div>
                  {[
                    { text: '3 books are overdue', time: 'Now',       dot: '#ef9a9a' },
                    { text: 'New user registered', time: '10 min ago', dot: '#81c784' },
                    { text: 'Book return pending', time: '1 hr ago',   dot: '#64b5f6' },
                  ].map((n, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 16px',
                      borderBottom: '1px solid rgba(201,168,76,0.06)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.dot, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>{n.text}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{n.time}</div>
                    </div>
                  ))}
                  <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <button style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-sans)',
                    }}
                    onClick={() => setNotifOpen(false)}>
                      Dismiss all
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile chip */}
            <div className="lm-profile-chip" onClick={() => { setActiveTab('settings'); setNotifOpen(false); }}>
              <div className="lm-avatar" style={{ overflow: 'hidden' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials
                }
              </div>
              <div>
                <div className="lm-profile-name">{displayName}</div>
                <div className="lm-profile-role">{roleLabel}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="lm-content" onClick={() => notifOpen && setNotifOpen(false)}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}