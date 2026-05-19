import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../Login_SignUp/AuthContext';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

import Overview            from './Overview';
import AttendanceMonitoring from './AttendanceMonitoring';
import BookManagement      from './BookManagement';
import OnlineCatalog       from './Book_Catalog';
import UserManagement      from './UserManagement';
import ReportsAnalytics    from './Reports_Analytics';
import Settings            from './Settings';

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
  collapseLeft: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
};

const NAV = [
  { id: 'overview',    label: 'Overview',             icon: 'overview',   section: '' },
  { id: 'attendance',  label: 'Attendance Monitoring', icon: 'attendance', section: '' },
  { id: 'bookmanage', label: 'Book Management', icon: 'bookmanage', section: '' },
  { id: 'catalog',  label: 'Book Catalog',      icon: 'catalog',  section: '' },
  { id: 'users',    label: 'User Management',   icon: 'users',    section: '' },
  { id: 'reports',  label: 'Reports & Analytics', icon: 'reports', section: '' },
  { id: 'settings', label: 'Settings',          icon: 'settings', section: '' },
];

const SECTION_LABELS = ['',  ];

const LABEL_MAP = {
  overview:    'Overview Dashboard',
  attendance:  'Attendance Monitoring',
  bookmanage:  'Book Management',
  catalog:     'Book Catalog',
  users:       'User Management',
  reports:     'Reports & Analytics',
  settings:    'Settings',
};

export default function Dashboard({ user, onSignOut }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab]       = useState('overview');
  const [notifOpen, setNotifOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [bookManageTab, setBookManageTab] = useState('scanner');

  const [notifications, setNotifications] = useState([]);   // { id, text, time, dot, req_id, isNew }
  const [unreadCount,   setUnreadCount]   = useState(0);
  const seenIdsRef  = useRef(new Set());  
  const isFirstLoad = useRef(true);       

  
  const playNotifSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (freq, start, dur, vol = 0.18) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      beep(880,  0,    0.12);
      beep(1100, 0.14, 0.12);
      beep(1320, 0.28, 0.22);
    } catch {  }
  }, []);

  const fmtAgo = (iso) => {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff <  60)  return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return new Date(iso).toLocaleDateString('en-PH', { month:'short', day:'numeric' });
  };


  const fetchPendingRequests = useCallback(async (isRealtime = false) => {
    const { data, error } = await supabase
      .from('borrow_requests')
      .select('id, student_name, book_title, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) { console.error('[Dashboard] notif fetch error:', error.message); return; }

    const rows = data || [];
    const newOnes = rows.filter(r => !seenIdsRef.current.has(r.id));

 
    if (isRealtime && !isFirstLoad.current && newOnes.length > 0) {
      playNotifSound();
    }
    isFirstLoad.current = false;


    rows.forEach(r => seenIdsRef.current.add(r.id));

    setNotifications(rows.map(r => ({
      id:     r.id,
      text:   `${r.student_name || 'A student'} wants to borrow "${r.book_title || 'a book'}"`,
      time:   fmtAgo(r.created_at),
      dot:    '#C9A84C',
      isNew:  newOnes.some(n => n.id === r.id),
    })));
    setUnreadCount(rows.length);
  }, [playNotifSound]);

  
  useEffect(() => {
    fetchPendingRequests(false);

    const ch = supabase
      .channel('dashboard-borrow-notif')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'borrow_requests',
      }, () => fetchPendingRequests(true))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'borrow_requests',
      }, () => fetchPendingRequests(false))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [fetchPendingRequests]);


  const dismissAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setNotifOpen(false);
  };

  const firstName  = profile?.first_name  || user?.user_metadata?.first_name || '';
  const lastName   = profile?.last_name   || user?.user_metadata?.last_name  || '';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'A';
  const displayName = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'Admin';
  const role        = profile?.role || user?.user_metadata?.role || 'library_manager';
  const roleLabel   = role === 'library_manager' ? 'Library Manager'
                    : role === 'admin' ? 'Administrator' : 'Student';
  const avatarUrl   = profile?.avatar_url || null;

  const navigate = (tab) => {
    if (tab === 'bookmanage') setBookManageTab('scanner');
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const navigateFromOverview = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':   return <Overview onNavigate={navigateFromOverview} />;
      case 'attendance': return <AttendanceMonitoring />;
      case 'bookmanage': return <BookManagement initialTab={bookManageTab} />;
      case 'catalog':    return <OnlineCatalog />;
      case 'users':      return <UserManagement />;
      case 'reports':    return <ReportsAnalytics />;
      case 'settings':   return <Settings user={user} onSignOut={onSignOut} />;
      default:           return <Overview onNavigate={navigateFromOverview} />;
    }
  };

  const sections = SECTION_LABELS.map(s => ({
    label: s,
    items: NAV.filter(n => n.section === s),
  }));

  return (
    <div className="lm-shell">

      {mobileOpen && (
        <div className="lm-sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`lm-sidebar${sidebarCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>

        <div className="lm-sidebar-logo">
          <div className="lm-logo-icon">
            <img src="/LibraryLogo.png" alt="LIBRASCAN Logo" />
          </div>
          <div>
            <div className="lm-logo-text">LIBRASCAN</div>
            <div className="lm-logo-sub">QR Code Based Library Management System</div>
          </div>
        </div>

        <button
          className="lm-collapse-btn"
          onClick={() => {
            setSidebarCollapsed(o => !o);
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
                  </button>
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="lm-sidebar-footer">
          <button
            className="lm-nav-item lm-nav-item--logout"
            onClick={() => setShowLogoutConfirm(true)}
            data-tooltip={sidebarCollapsed ? 'Sign Out' : undefined}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
          >
            <span className="lm-nav-item-icon">{NavIcons.logout}</span>
            <span className="lm-nav-item-label lm-logout-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'rgba(0,0,0,0.55)',
          backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }} onClick={() => setShowLogoutConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width:460,
            background:'var(--cream)',
            borderRadius:16,
            overflow:'hidden',
            boxShadow:'0 24px 60px rgba(0,0,0,0.40)',
            animation:'lm-fade-in .22s ease both',
          }}>

            <div style={{
              background:'linear-gradient(135deg, var(--maroon), var(--maroon-deep))',
              padding:'22px 28px',
              display:'flex', alignItems:'center', gap:14,
            }}>
              <div style={{
                width:38, height:38, borderRadius:'50%',
                background:'rgba(0,0,0,0.22)',
                border:'1.5px solid rgba(201,168,76,0.35)',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.90)" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--gold-pale)', letterSpacing:'.06em' }}>
                  Sign Out
                </div>
                <div style={{ fontFamily:'var(--font-sans)', fontSize:12, color:'rgba(245,228,168,0.55)', marginTop:2 }}>
                  This will end your current session
                </div>
              </div>
            </div>

            <div style={{ padding:'24px 28px 28px' }}>
              <div style={{
                background:'rgba(139,0,0,0.06)',
                border:'1px solid rgba(139,0,0,0.14)',
                borderRadius:10,
                padding:'14px 18px',
                textAlign:'left',
                marginBottom:24,
              }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'var(--text-primary)', letterSpacing:'.03em', textAlign:'Center' }}>
                  Are you sure you want to sign out?
                </div>
                <div style={{ fontFamily:'var(--font-sans)', fontSize:12, color:'var(--text-muted)', marginTop:5, textAlign:'Center' }}>
                  of the PSTC Library System
                </div>
              </div>

              <div style={{ display:'flex', gap:12 }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex:1, padding:'12px',
                    background:'transparent',
                    border:'1.5px solid rgba(139,0,0,0.22)',
                    borderRadius:10,
                    color:'var(--text-secondary)',
                    fontFamily:'var(--font-display)',
                    fontSize:13, fontWeight:600,
                    letterSpacing:'.05em',
                    cursor:'pointer', transition:'all .18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(139,0,0,0.06)'; e.currentTarget.style.borderColor='rgba(139,0,0,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(139,0,0,0.22)'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={onSignOut}
                  style={{
                    flex:1, padding:'12px',
                    background:'linear-gradient(135deg,#8B0000,#6B0000)',
                    border:'none',
                    borderRadius:10,
                    color:'#F5E4A8',
                    fontFamily:'var(--font-display)',
                    fontSize:13, fontWeight:700,
                    letterSpacing:'.05em',
                    cursor:'pointer', transition:'all .18s',
                    boxShadow:'0 4px 14px rgba(90,0,0,0.35)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='linear-gradient(135deg,#6B0000,#4A0000)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(80,0,0,.50)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='linear-gradient(135deg,#8B0000,#6B0000)'; e.currentTarget.style.boxShadow='0 4px 14px rgba(90,0,0,0.35)'; e.currentTarget.style.transform='none'; }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`lm-main${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>

        <header className="lm-topbar">
          <div className="lm-topbar-left">
            <button
              className="lm-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="lm-topbar-title">{LABEL_MAP[activeTab] || 'Dashboard'}</div>
            <div className="lm-breadcrumb">
              {activeTab === 'overview'    && "Welcome back. Here's what's happening at the library today."}
              {activeTab === 'attendance'  && 'Track and manage student library attendance records.'}
              {activeTab === 'bookmanage'  && 'Manage book borrowing and returns via QR scanning.'}
              {activeTab === 'catalog'     && "Manage the library's full collection."}
              {activeTab === 'users'       && 'View and manage all registered library accounts.'}
              {activeTab === 'reports'     && 'View detailed reports on loans, activity, and usage.'}
              {activeTab === 'settings'    && 'Configure your account and system preferences.'}
            </div>
          </div>

          <div className="lm-topbar-right">
            <div style={{ position: 'relative' }}>
              <button
                className="lm-notif-btn"
                onClick={() => { setNotifOpen(o => !o); }}
                aria-label="Notifications"
                style={{ position: 'relative' }}
              >
                {NavIcons.bell}
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 17, height: 17,
                    background: '#C9A84C',
                    color: '#3a0000',
                    borderRadius: 10,
                    fontSize: 10, fontWeight: 800,
                    fontFamily: 'var(--font-sans)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                    border: '1.5px solid var(--cream, #FAF6EE)',
                    lineHeight: 1,
                    animation: 'lm-fade-in 0.2s ease',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 48, right: 0,
                  width: 320,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
                  zIndex: 200,
                  overflow: 'hidden',
                  animation: 'lm-fade-in 0.22s ease',
                }}>
            
                  <div style={{
                    padding: '13px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 13, fontWeight: 700,
                      color: 'var(--gold-pale)', letterSpacing: '0.04em',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      Borrow Requests
                      {unreadCount > 0 && (
                        <span style={{
                          padding: '1px 7px', borderRadius: 10,
                          background: 'rgba(201,168,76,0.18)', color: '#C9A84C',
                          border: '1px solid rgba(201,168,76,0.30)',
                          fontSize: 10, fontWeight: 800,
                        }}>{unreadCount} pending</span>
                      )}
                    </div>
                    <button
                      onClick={() => { setBookManageTab('pending'); setActiveTab('bookmanage'); setNotifOpen(false); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 10.5, color: 'var(--gold)',
                        fontFamily: 'var(--font-sans)', fontWeight: 600,
                        padding: '3px 8px', borderRadius: 6,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      View All →
                    </button>
                  </div>

                  {/* List */}
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{
                        padding: '28px 16px', textAlign: 'center',
                        color: 'var(--text-dim)', fontSize: 12,
                        fontFamily: 'var(--font-sans)',
                      }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                        No pending borrow requests
                      </div>
                    ) : notifications.map((n, i) => (
                      <div
                        key={n.id || i}
                        onClick={() => { setBookManageTab('pending'); setActiveTab('bookmanage'); setNotifOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '11px 16px',
                          borderBottom: '1px solid rgba(201,168,76,0.06)',
                          cursor: 'pointer', transition: 'background 0.15s',
                          background: n.isNew ? 'rgba(201,168,76,0.06)' : 'transparent',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = n.isNew ? 'rgba(201,168,76,0.06)' : 'transparent'}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: n.dot, flexShrink: 0, marginTop: 4,
                          boxShadow: n.isNew ? `0 0 6px ${n.dot}` : 'none',
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                            {n.text}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                            {n.time}
                          </div>
                        </div>
                        {n.isNew && (
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#C9A84C', flexShrink: 0, marginTop: 5,
                          }} />
                        )}
                      </div>
                    ))}
                  </div>

                
                  {notifications.length > 0 && (
                    <div style={{
                      padding: '9px 16px', textAlign: 'center',
                      borderTop: '1px solid var(--border)',
                    }}>
                      <button
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: 'var(--gold)',
                          fontFamily: 'var(--font-sans)',
                        }}
                        onClick={dismissAll}
                      >
                        Dismiss all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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

        <main className="lm-content" onClick={() => notifOpen && setNotifOpen(false)}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}