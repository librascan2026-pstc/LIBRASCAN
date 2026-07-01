import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../Login_SignUp/AuthContext';
import { supabase } from '../supabaseClient';
import './Dashboard.css';


const NOTIF_MAX = 15; 


const NOTIF_TYPES = {
  BORROW_REQUEST:  { label: 'Borrow Request',  color: '#C9A84C',  icon: 'book'   },
  BORROW_APPROVED: { label: 'Approved',         color: '#4CAF50',  icon: 'check'  },
  BORROW_CANCELLED:{ label: 'Cancelled',        color: '#EF5350',  icon: 'cancel' },
  BOOK_RETURNED:   { label: 'Returned',         color: '#42A5F5',  icon: 'return' },
  SCANNER_ACTIVITY:{ label: 'Scanner',          color: '#AB47BC',  icon: 'scan'   },
  SYSTEM_ALERT:    { label: 'System',           color: '#FF7043',  icon: 'alert'  },
};


function buildNotification({ id, type, title, message, createdAt, extra = {} }) {
  return { id, type, title, message, createdAt, extra, read: false };
}


function fmtAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}


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


  const [notifications, setNotifications] = useState([]);
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
    } catch { }
  }, []);


  const addNotifications = useCallback((incoming, isRealtime = false) => {
    if (!incoming.length) return;

    setNotifications(prev => {
      
      const existingIds = new Set(prev.map(n => n.id));
      const fresh = incoming.filter(n => !existingIds.has(n.id));
      const merged = [...fresh, ...prev].slice(0, NOTIF_MAX);
      return merged;
    });

    if (isRealtime && !isFirstLoad.current) {
      playNotifSound();
      setUnreadCount(c => Math.min(c + incoming.filter(n => !seenIdsRef.current.has(n.id)).length, NOTIF_MAX));
    }

    incoming.forEach(n => seenIdsRef.current.add(n.id));
    isFirstLoad.current = false;
  }, [playNotifSound]);

  
  // Phase 9 — campus isolation: notifications should only surface borrow
  // requests for books that belong to this librarian's own campus.
  const campusId = profile?.campus_id ?? null;

  const fetchPendingRequests = useCallback(async (isRealtime = false) => {
    let q = supabase
      .from('borrow_requests')
      .select(campusId ? 'id, student_name, book_title, created_at, status, books!inner(campus_id)' : 'id, student_name, book_title, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(NOTIF_MAX);
    if (campusId) q = q.eq('books.campus_id', campusId);
    const { data, error } = await q;

    if (error) { console.error('[Dashboard] notif fetch error:', error.message); return; }

    const rows = data || [];

    if (!isRealtime && isFirstLoad.current) {
      const notifs = rows.map(r => buildNotification({
        id:        `borrow_req_${r.id}`,
        type:      'BORROW_REQUEST',
        title:     'Borrow Request',
        message:   `${r.student_name || 'A student'} wants to borrow "${r.book_title || 'a book'}"`,
        createdAt: r.created_at,
        extra:     { borrowId: r.id },
      }));
      notifs.forEach(n => seenIdsRef.current.add(n.id));
      setNotifications(notifs.slice(0, NOTIF_MAX));
      setUnreadCount(notifs.length);
      isFirstLoad.current = false;
      return;
    }


    const newRows = rows.filter(r => !seenIdsRef.current.has(`borrow_req_${r.id}`));
    if (!newRows.length) return;

    const newNotifs = newRows.map(r => buildNotification({
      id:        `borrow_req_${r.id}`,
      type:      'BORROW_REQUEST',
      title:     'Borrow Request',
      message:   `${r.student_name || 'A student'} wants to borrow "${r.book_title || 'a book'}"`,
      createdAt: r.created_at,
      extra:     { borrowId: r.id },
    }));

    addNotifications(newNotifs, isRealtime);
  }, [addNotifications, campusId]);


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

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  
  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

 
  const dismissAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setNotifOpen(false);
  };

 
  const handleBellClick = () => {
    setNotifOpen(o => {
      if (!o) {
        
        setTimeout(() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
        }, 600);
      }
      return !o;
    });
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
                onClick={handleBellClick}
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
                  position: 'absolute', top: 52, right: 0,
                  width: 360,
                  background: 'linear-gradient(160deg, #6B0000 0%, #5A0000 100%)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  borderRadius: 16,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.10)',
                  zIndex: 200,
                  overflow: 'hidden',
                  animation: 'lm-fade-in 0.22s ease',
                }}>

              
                  <div style={{
                    padding: '14px 18px 12px',
                    borderBottom: '1px solid rgba(201,168,76,0.20)',
                    background: 'rgba(0,0,0,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 12, fontWeight: 700,
                          color: 'var(--gold-pale)', letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}>
                          Notifications
                        </div>
                        <div style={{
                          fontSize: 10.5, color: 'rgba(245,228,168,0.55)',
                          fontFamily: 'var(--font-sans)', marginTop: 1,
                        }}>
                         
                        </div>
                      </div>
                    </div>

                    
                    <div style={{ display: 'flex', gap: 6 }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          style={{
                            background: 'rgba(201,168,76,0.12)',
                            border: '1px solid rgba(201,168,76,0.25)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 10, color: '#C9A84C',
                            fontFamily: 'var(--font-sans)', fontWeight: 600,
                            padding: '4px 9px',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.22)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.12)'; }}
                          title="Mark all as read"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => { setBookManageTab('pending'); setActiveTab('bookmanage'); setNotifOpen(false); }}
                        style={{
                          background: 'rgba(201,168,76,0.12)',
                          border: '1px solid rgba(201,168,76,0.25)',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 10, color: '#C9A84C',
                          fontFamily: 'var(--font-sans)', fontWeight: 600,
                          padding: '4px 9px',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.22)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.12)'; }}
                      >
                        View All →
                      </button>
                    </div>
                  </div>

           
                  <div style={{
                    maxHeight: 380,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(201,168,76,0.30) rgba(0,0,0,0.15)',
                  }}>
                    {notifications.length === 0 ? (
                   
                      <div style={{
                        padding: '40px 20px', textAlign: 'center',
                        fontFamily: 'var(--font-sans)',
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: 'rgba(201,168,76,0.10)',
                          border: '1px solid rgba(201,168,76,0.20)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 12px',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.55)" strokeWidth="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(245,228,168,0.70)', marginBottom: 4 }}>
                          No notifications yet
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(245,228,168,0.38)' }}>
                          Activity will appear here in real time
                        </div>
                      </div>
                    ) : (
                      notifications.map((n, i) => {
                        const typeInfo = NOTIF_TYPES[n.type] || NOTIF_TYPES.BORROW_REQUEST;
                        const isUnread = !n.read;

                        
                        const iconSvg = {
                          book: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isUnread ? typeInfo.color : 'rgba(245,228,168,0.50)'} strokeWidth="1.8">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                            </svg>
                          ),
                          check: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isUnread ? typeInfo.color : 'rgba(245,228,168,0.50)'} strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ),
                          cancel: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isUnread ? typeInfo.color : 'rgba(245,228,168,0.50)'} strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          ),
                          return: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isUnread ? typeInfo.color : 'rgba(245,228,168,0.50)'} strokeWidth="2">
                              <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                            </svg>
                          ),
                          scan: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isUnread ? typeInfo.color : 'rgba(245,228,168,0.50)'} strokeWidth="2">
                              <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
                              <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                              <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/>
                            </svg>
                          ),
                          alert: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isUnread ? typeInfo.color : 'rgba(245,228,168,0.50)'} strokeWidth="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          ),
                        }[typeInfo.icon] || iconSvg?.book;

                        return (
                          <div
                            key={n.id || i}
                            onClick={() => {
                              markRead(n.id);
                              
                              if (n.type === 'BORROW_REQUEST' || n.type === 'BORROW_APPROVED' || n.type === 'BORROW_CANCELLED' || n.type === 'BOOK_RETURNED') {
                                setBookManageTab('pending');
                                setActiveTab('bookmanage');
                              } else if (n.type === 'SCANNER_ACTIVITY') {
                                setActiveTab('bookmanage');
                              }
                              setNotifOpen(false);
                            }}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 11,
                              padding: '11px 16px',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              background: isUnread ? 'rgba(201,168,76,0.07)' : 'transparent',
                              position: 'relative',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(201,168,76,0.07)' : 'transparent'}
                          >
                     
                            {isUnread && (
                              <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: 3, background: `linear-gradient(180deg, ${typeInfo.color}, ${typeInfo.color}44)`,
                                borderRadius: '0 2px 2px 0',
                              }} />
                            )}

                     
                            <div style={{
                              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                              background: isUnread ? `${typeInfo.color}22` : 'rgba(255,255,255,0.08)',
                              border: `1px solid ${isUnread ? `${typeInfo.color}44` : 'rgba(255,255,255,0.10)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {iconSvg}
                            </div>

                   
                            <div style={{ flex: 1, minWidth: 0 }}>
                              
                              <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', marginBottom: 2,
                              }}>
                                <span style={{
                                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  color: isUnread ? typeInfo.color : 'rgba(245,228,168,0.38)',
                                  fontFamily: 'var(--font-sans)',
                                }}>
                                  {typeInfo.label}
                                </span>
                                <span style={{
                                  fontSize: 9.5, color: 'rgba(245,228,168,0.38)',
                                  fontFamily: 'var(--font-sans)',
                                  display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                                }}>
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                  </svg>
                                  {fmtAgo(n.createdAt)}
                                </span>
                              </div>

                    
                              <div style={{
                                fontSize: 11.5,
                                fontFamily: 'var(--font-sans)',
                                color: isUnread ? 'rgba(245,228,168,0.90)' : 'rgba(245,228,168,0.58)',
                                lineHeight: 1.45,
                                fontWeight: isUnread ? 500 : 400,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}>
                                {n.message}
                              </div>
                            </div>

                      
                            {isUnread && (
                              <div style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: typeInfo.color,
                                boxShadow: `0 0 8px ${typeInfo.color}99`,
                                flexShrink: 0, marginTop: 5,
                              }} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  
                  {notifications.length > 0 && (
                    <div style={{
                      padding: '9px 16px',
                      borderTop: '1px solid rgba(201,168,76,0.20)',
                      background: 'rgba(0,0,0,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{
                        fontSize: 10, color: 'rgba(245,228,168,0.35)',
                        fontFamily: 'var(--font-sans)',
                      }}>
                        {notifications.length} of {NOTIF_MAX} max
                      </span>
                      <button
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 10.5, color: 'rgba(245,228,168,0.45)',
                          fontFamily: 'var(--font-sans)', fontWeight: 500,
                          padding: '3px 6px', borderRadius: 6,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,228,168,0.45)'}
                        onClick={dismissAll}
                      >
                        Clear all
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