import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../Login_SignUp/useAuth';
import { supabase, supabaseAdmin } from '../supabaseClient';
import {
  getNotifPrefs,
  getNotifSoundEnabled,
  NOTIF_PREFS_EVENT,
} from './notificationPrefs';
import {
  getNotifHistory,
  addNotifHistory,
  markNotifHistoryRead,
  markAllNotifHistoryRead,
  clearNotifHistory,
} from './notificationHistory';
import './Dashboard.css';


const NOTIF_MAX = 15; 
// On first load, "pending requests" always show (they're still actionable
// regardless of age). Every other type only used to silently mark existing
// rows as "seen" and show nothing — so anything that happened before the
// dashboard was last opened/refreshed (a new user registering, a book
// coming back, a scan at the desk) could never show up in the bell at all.
// This window makes those recent events (last 24h) show up on load too,
// the same way Facebook still shows you "earlier today" activity.
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;


// Note: BORROW_APPROVED / BORROW_CANCELLED are intentionally absent — those
// decisions are only ever meaningful to the student who made the request,
// so they're never synthesized into this (Librarian) dashboard's own bell.
// SCANNER_ACTIVITY is also absent — check-ins/outs stay attendance-only
// records and are never turned into a notification (see Attendance tab).
const NOTIF_TYPES = {
  BORROW_REQUEST:  { label: 'Borrow Request', color: '#B08D3E' },
  BOOK_RETURNED:   { label: 'Returned',       color: '#3B5878' },
  NEW_USER:        { label: 'New User',       color: '#3E6E6B' },
  SYSTEM_ALERT:    { label: 'System',         color: '#9C5A2E' },
  REGISTRATION_APPROVED: { label: 'Registration Approved', color: '#3F6B4A' },
  REGISTRATION_REJECTED: { label: 'Registration Rejected', color: '#8B3A3A' },
};


function buildNotification({ id, type, title, message, createdAt, extra = {} }) {
  return { id, type, title, message, createdAt, extra, read: false };
}


// Where a notification can take the librarian, and how precisely:
//   'exact' — jumps straight to the specific record and highlights/scrolls
//             to it (we have a real row id to look for).
//   'area'  — there's no single record to point at (e.g. an approved or
//             rejected request doesn't correspond to a fixed row anywhere
//             once it's decided), so it opens the relevant section instead.
//   null    — reserved for truly unroutable rows; no longer used in
//             practice (every case below now resolves to a target so
//             every notification is clickable).
function getNotifTarget(n) {
  const extra = n?.extra || {};
  switch (n?.type) {
    case 'BORROW_REQUEST':
      return extra.borrowId != null
        ? { kind: 'exact', tab: 'bookmanage', bookManageTab: 'pending', focusProp: 'focusBorrowId', focusValue: extra.borrowId }
        : { kind: 'area', tab: 'bookmanage', bookManageTab: 'pending' };
    case 'BOOK_RETURNED':
      return extra.borrowingId != null
        ? { kind: 'exact', tab: 'bookmanage', bookManageTab: 'history', focusProp: 'focusBorrowingId', focusValue: extra.borrowingId }
        : { kind: 'area', tab: 'bookmanage', bookManageTab: 'history' };
    case 'NEW_USER':
      return extra.userId != null
        ? { kind: 'exact', tab: 'users', focusProp: 'focusUserId', focusValue: extra.userId }
        : { kind: 'area', tab: 'users' };
    case 'REGISTRATION_APPROVED':
      // The book is live now — send the librarian straight to the Book
      // Catalog. It shows up there automatically (Book_Catalog.jsx refetches
      // on every `books` table change and only hides rows still 'pending'),
      // so by the time this link is opened the title is already visible.
      return { kind: 'area', tab: 'catalog' };
    case 'REGISTRATION_REJECTED':
      // A rejected registration has no row left anywhere (the books row is
      // deleted the moment Super Admin rejects it) — send the librarian to
      // the Book Catalog, the closest relevant section.
      return { kind: 'area', tab: 'catalog' };
    default:
      // SYSTEM_ALERT and anything unrecognized — fall back to Overview.
      // (Note: BORROW_APPROVED/BORROW_CANCELLED and SCANNER_ACTIVITY never
      // reach here — they're not generated on this dashboard at all.)
      return { kind: 'area', tab: 'overview' };
  }
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
  { id: 'overview',    label: 'Dashboard',             icon: 'overview',   section: '' },
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

const ADMIN_TAB_IDS = NAV.map(n => n.id); // overview, attendance, bookmanage, catalog, users, reports, settings

function getTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  return ADMIN_TAB_IDS.includes(hash) ? hash : 'overview';
}

export default function Dashboard({ user, onSignOut }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab]       = useState(getTabFromHash);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [bookManageTab, setBookManageTab] = useState('scanner');


  const [notifications, setNotifications] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');

  // Facebook-style "All / Unread" filter tabs in the bell dropdown. Purely a
  // display filter — it never touches unreadCount or the underlying data.
  const [notifTab, setNotifTab] = useState('all'); // 'all' | 'unread'

  // SINGLE SOURCE OF TRUTH for the unread badge: derived directly from each
  // notification's own `read` flag instead of a hand-maintained counter.
  // Previously `unreadCount` was a separate piece of state that every call
  // site (realtime insert, mark-read, mark-all-read, clear, initial load…)
  // had to remember to increment/decrement in lockstep with `notifications`.
  // Any place that forgot — or that ran in a different order than expected
  // (e.g. a realtime event landing while a fetch was still in flight) — left
  // the badge showing a number that didn't match reality until a full page
  // refresh recomputed it from scratch. Deriving it here means the badge is
  // *structurally* incapable of disagreeing with the notification list: it
  // updates the instant `notifications` does, every time, with no manual
  // bookkeeping anywhere else in this file.
  const unreadCount = useMemo(
    () => notifications.reduce((n, item) => (item.read ? n : n + 1), 0),
    [notifications]
  );

  // Facebook-style "New" vs "Earlier" grouping — purely about *when* a
  // notification happened, completely independent from its read/unread
  // state (a read notification from 2 minutes ago is still "New").
  const NOTIF_NEW_WINDOW_MS = 3 * 60 * 60 * 1000; // last 3 hours = "New"
  const visibleNotifications = useMemo(
    () => (notifTab === 'unread' ? notifications.filter(n => !n.read) : notifications),
    [notifications, notifTab]
  );
  const notifNewGroup = useMemo(
    () => visibleNotifications.filter(n => Date.now() - new Date(n.createdAt).getTime() <= NOTIF_NEW_WINDOW_MS),
    [visibleNotifications]
  );
  const notifEarlierGroup = useMemo(
    () => visibleNotifications.filter(n => Date.now() - new Date(n.createdAt).getTime() > NOTIF_NEW_WINDOW_MS),
    [visibleNotifications]
  );

  // Full persisted notification history ("See all"), independent from the
  // 15-item live bell list above so older activity is never lost.
  const [notifHistory, setNotifHistory] = useState(() => getNotifHistory(user?.id));
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  // Which record (if any) a clicked notification should scroll to/highlight
  // once its tab mounts. `nonce` forces the target tab to re-run its focus
  // effect even if the same id is clicked again.
  const [notifFocus, setNotifFocus] = useState({ prop: null, value: null, nonce: 0 });

  // The panel is rendered through a portal straight into <body> (see
  // handleBellClick / the render below). Root cause of the "notifications
  // disappear / panel shows blank" bug: .lm-topbar is `position: sticky`,
  // and .lm-notif-panel combines `backdrop-filter` with a `transform`
  // animation — WebKit/Safari has a well-known rendering bug where that
  // combination, nested inside a sticky/fixed ancestor, paints the panel
  // as blank/white instead of its actual maroon background. Portaling the
  // panel out to <body> removes it from that sticky ancestor entirely, so
  // the bug can't trigger. React still bubbles its click events through
  // the normal component tree, so the existing "click outside closes it"
  // behavior keeps working unchanged.
  const notifBtnRef  = useRef(null);
  const [notifPanelPos, setNotifPanelPos] = useState(null);

  const NOTIF_PANEL_WIDTH = 368; // keep in sync with .lm-notif-panel width in Dashboard.css
  const NOTIF_PANEL_EDGE_GAP = 24; // fixed inset from the screen's right edge — matches where the topbar's own right padding sits, so the panel lines up with the avatar chip rather than trailing off wherever the bell happens to sit

  const computeNotifPanelPos = useCallback(() => {
    if (!notifBtnRef.current) return null;
    if (window.innerWidth <= 560) return null; // mobile sheet is handled entirely by CSS
    const r = notifBtnRef.current.getBoundingClientRect();
    // Docked to the screen's right edge (like a proper side panel) instead
    // of being tucked directly under the bell — the bell sits to the left
    // of the avatar in the topbar, so anchoring purely to the bell's own
    // rect left an odd gap between the panel and the actual corner of the
    // screen where the avatar/profile chip live.
    const right = NOTIF_PANEL_EDGE_GAP;
    const bellCenterX = r.left + r.width / 2;
    const rawArrowRight = (window.innerWidth - bellCenterX) - 8; // 8 = half the 16px caret
    const arrowRight = Math.min(
      right + NOTIF_PANEL_WIDTH - 34,   // don't overshoot the panel's left edge
      Math.max(right + 18, rawArrowRight) // don't undershoot the panel's right edge
    );
    return { top: r.bottom + 14, right, arrowRight };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const onReposition = () => setNotifPanelPos(computeNotifPanelPos());
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [notifOpen, computeNotifPanelPos]);

  const seenIdsRef  = useRef(new Set());
  // Ids currently represented in the `notifications` state array (the live
  // 15-item bell list). Kept separate from `seenIdsRef` — that one tracks
  // every row a fetch has ever looked at (including ones filtered out by
  // notification preferences); this one tracks only what's actually in
  // state right now, which is what de-duping *inserts* needs.
  const seenNotifIdsInStateRef = useRef(new Set());
  const isFirstLoad = useRef(true);
  const isFirstUserLoad     = useRef(true);

  // Settings → Notifications preferences (which types show up / whether the
  // chime plays). Read from localStorage and kept in a ref so the realtime
  // callbacks below always see the latest value without re-subscribing.
  const notifPrefsRef = useRef(getNotifPrefs(user?.id));
  const notifSoundRef = useRef(getNotifSoundEnabled(user?.id));

  useEffect(() => {
    const syncNotifPrefs = () => {
      notifPrefsRef.current = getNotifPrefs(user?.id);
      notifSoundRef.current = getNotifSoundEnabled(user?.id);
    };
    syncNotifPrefs();
    window.addEventListener(NOTIF_PREFS_EVENT, syncNotifPrefs);
    window.addEventListener('storage', syncNotifPrefs);
    return () => {
      window.removeEventListener(NOTIF_PREFS_EVENT, syncNotifPrefs);
      window.removeEventListener('storage', syncNotifPrefs);
    };
  }, [user?.id]);

  useEffect(() => {
    setNotifHistory(getNotifHistory(user?.id));
  }, [user?.id]);


  
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

    // Respect Settings → Notifications: a disabled type never enters the
    // bell, but we still remember its id so it isn't re-evaluated later.
    const allowed = incoming.filter(n => notifPrefsRef.current[n.type] !== false);

    if (allowed.length) {
      // De-dupe against the CURRENT id set (a plain ref-tracked set the
      // realtime effect already maintains) rather than doing this dedupe
      // check inside the setState updater — updater functions aren't
      // guaranteed to run synchronously, so a flag set inside one can't be
      // safely read on the next line. `notifications` is the same
      // de-dupe-by-id list the badge count is derived from (see
      // `unreadCount` above), so once this setState commits the badge is
      // automatically correct; nothing else needs to touch it.
      const existingIds = new Set(seenNotifIdsInStateRef.current);
      const fresh = allowed.filter(n => !existingIds.has(n.id));

      if (fresh.length) {
        fresh.forEach(n => seenNotifIdsInStateRef.current.add(n.id));
        setNotifications(prev => [...fresh, ...prev].slice(0, NOTIF_MAX));
        if (isRealtime && !isFirstLoad.current && notifSoundRef.current) {
          playNotifSound();
        }
      }

      setNotifHistory(addNotifHistory(user?.id, allowed));
    }

    incoming.forEach(n => seenIdsRef.current.add(n.id));
    isFirstLoad.current = false;
  }, [playNotifSound, user?.id]);

  // Removes notifications by id (used by realtime DELETE events — e.g. a
  // student withdraws a pending borrow request before it's reviewed). If a
  // removed notification was unread, the badge decrements automatically
  // since unreadCount is derived from `notifications`.
  const removeNotifications = useCallback((ids) => {
    if (!ids || !ids.length) return;
    const idSet = new Set(ids);
    setNotifications(prev => prev.filter(n => !idSet.has(n.id)));
    idSet.forEach(id => seenNotifIdsInStateRef.current.delete(id));
  }, []);

  // Shared by every "first load / catch-up" branch below. Uses a functional
  // setState update so it can never race with — or get silently wiped out
  // by — one of the other fetches (pending / decisions / new users / returns
  // / scans) resolving at nearly the same time on page load. That race was
  // the actual bug behind "only pending requests show up": whichever fetch's
  // network response landed last was overwriting the notification list
  // outright instead of merging into it, discarding everything the others
  // had already added a moment earlier.
  const showInitialBatch = useCallback((notifs) => {
    if (!notifs.length) return;
    const allowed = notifs.filter(n => notifPrefsRef.current[n.type] !== false);
    if (!allowed.length) return;

    // Bug fix: a notification the person already opened/read in a previous
    // session must stay read here too. Previously this always marked every
    // "recent" (last 24h) item as unread on every load, so re-opening the
    // account (or simply refreshing) would resurrect the unread badge for
    // things already read — the persisted history (which does track read
    // state correctly) was never consulted before counting. We look each
    // item up by id against that persisted history and carry its read flag
    // over before it ever reaches state or the unread counter.
    const readIds = new Set(getNotifHistory(user?.id).filter(h => h.read).map(h => h.id));
    const withReadState = allowed.map(n => (readIds.has(n.id) ? { ...n, read: true } : n));

    const existingIds = new Set(seenNotifIdsInStateRef.current);
    const fresh = withReadState.filter(n => !existingIds.has(n.id));
    if (fresh.length) {
      fresh.forEach(n => seenNotifIdsInStateRef.current.add(n.id));
      setNotifications(prev =>
        [...fresh, ...prev]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, NOTIF_MAX)
      );
    }
    setNotifHistory(addNotifHistory(user?.id, allowed));
    // unreadCount is derived from `notifications` (see the useMemo near the
    // top of the component) — nothing to update manually here.
  }, [user?.id]);

  
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
      isFirstLoad.current = false;
      showInitialBatch(notifs);
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
  }, [addNotifications, showInitialBatch, campusId]);


  // NOTE: Approved / rejected borrow-request decisions are deliberately NOT
  // synthesized into notifications here. Only the student who made the
  // request should ever be told "your request was approved/rejected" —
  // including when the librarian looking at this dashboard is the one who
  // just made that decision themselves. That notification type is
  // student-only and lives in StudentDashboard.jsx instead.

  // New student accounts on this librarian's campus.
  const fetchRecentNewUsers = useCallback(async (isRealtime = false) => {
    let q = supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, role, created_at, campus_id')
      .order('created_at', { ascending: false })
      .limit(NOTIF_MAX);
    if (campusId) q = q.eq('campus_id', campusId);
    const { data, error } = await q;

    if (error) { console.error('[Dashboard] new-user fetch error:', error.message); return; }

    const rows = (data || []).filter(r => r.role !== 'super_admin' && r.role !== 'library_manager');

    if (isFirstUserLoad.current) {
      rows.forEach(r => seenIdsRef.current.add(`new_user_${r.id}`));
      isFirstUserLoad.current = false;
      const recent = rows.filter(r => Date.now() - new Date(r.created_at).getTime() <= RECENT_WINDOW_MS);
      const recentNotifs = recent.map(r => buildNotification({
        id:        `new_user_${r.id}`,
        type:      'NEW_USER',
        title:     'New User Registered',
        message:   `${[r.first_name, r.last_name].filter(Boolean).join(' ') || 'A new student'} just created an account.`,
        createdAt: r.created_at,
        extra:     { userId: r.id },
      }));
      showInitialBatch(recentNotifs);
      return;
    }

    const newRows = rows.filter(r => !seenIdsRef.current.has(`new_user_${r.id}`));
    if (!newRows.length) return;

    const newNotifs = newRows.map(r => buildNotification({
      id:        `new_user_${r.id}`,
      type:      'NEW_USER',
      title:     'New User Registered',
      message:   `${[r.first_name, r.last_name].filter(Boolean).join(' ') || 'A new student'} just created an account.`,
      createdAt: r.created_at,
      extra:     { userId: r.id },
    }));

    addNotifications(newNotifs, isRealtime);
  }, [addNotifications, showInitialBatch, campusId]);

  // Books checked back in at the front desk. Lives in `borrowings` (not
  // `borrow_requests`) — that table is where BookManagement's scanner flow
  // writes `status: 'Returned'` once a copy is handed back.
  const isFirstReturnLoad = useRef(true);
  const fetchRecentReturns = useCallback(async (isRealtime = false) => {
    let q = supabaseAdmin
      .from('borrowings')
      .select('id, student_name, book_title, returned_at, status, campus_id')
      .eq('status', 'Returned')
      .order('returned_at', { ascending: false })
      .limit(NOTIF_MAX);
    if (campusId) q = q.eq('campus_id', campusId);
    const { data, error } = await q;

    if (error) { console.error('[Dashboard] returns fetch error:', error.message); return; }

    const rows = data || [];

    if (isFirstReturnLoad.current) {
      rows.forEach(r => seenIdsRef.current.add(`book_ret_${r.id}`));
      isFirstReturnLoad.current = false;
      const recent = rows.filter(r => Date.now() - new Date(r.returned_at).getTime() <= RECENT_WINDOW_MS);
      const recentNotifs = recent.map(r => buildNotification({
        id:        `book_ret_${r.id}`,
        type:      'BOOK_RETURNED',
        title:     'Book Returned',
        message:   `"${r.book_title || 'A book'}" was checked back in by ${r.student_name || 'a student'}.`,
        createdAt: r.returned_at,
        extra:     { borrowingId: r.id },
      }));
      showInitialBatch(recentNotifs);
      return;
    }

    const newRows = rows.filter(r => !seenIdsRef.current.has(`book_ret_${r.id}`));
    if (!newRows.length) return;

    const newNotifs = newRows.map(r => buildNotification({
      id:        `book_ret_${r.id}`,
      type:      'BOOK_RETURNED',
      title:     'Book Returned',
      message:   `"${r.book_title || 'A book'}" was checked back in by ${r.student_name || 'a student'}.`,
      createdAt: r.returned_at,
      extra:     { borrowingId: r.id },
    }));

    addNotifications(newNotifs, isRealtime);
  }, [addNotifications, showInitialBatch, campusId]);

  // NOTE: Scanner/check-in activity (attendance_logs) is intentionally NOT
  // turned into a notification. QR check-ins/check-outs stay attendance
  // records only — see AttendanceMonitoring.jsx — and are never added to
  // this dashboard's notification list or its persisted history.

  // Super Admin approval/rejection of this librarian's book registration
  // requests. Unlike every other notification type above, these rows come
  // from a real, persisted `notifications` table (see migration_notifications_table.sql)
  // rather than being synthesized from an existing operational table —
  // the decision is made on a different device (Super Admin's), and a
  // rejection deletes the underlying `books` row outright, so there's
  // nothing left afterward for a client-side synthesis approach to read.
  const isFirstRegistrationLoad = useRef(true);
  const fetchRecentRegistrationDecisions = useCallback(async (isRealtime = false) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, book_title, created_at, read')
      .eq('recipient_id', user.id)
      .in('type', ['REGISTRATION_APPROVED', 'REGISTRATION_REJECTED'])
      .order('created_at', { ascending: false })
      .limit(NOTIF_MAX);

    if (error) { console.error('[Dashboard] registration notif fetch error:', error.message); return; }

    const rows = data || [];

    if (isFirstRegistrationLoad.current) {
      rows.forEach(r => seenIdsRef.current.add(`reg_${r.id}`));
      isFirstRegistrationLoad.current = false;
      const recent = rows.filter(r => Date.now() - new Date(r.created_at).getTime() <= RECENT_WINDOW_MS);
      const recentNotifs = recent.map(r => buildNotification({
        id:        `reg_${r.id}`,
        type:      r.type,
        title:     r.title,
        message:   r.message,
        createdAt: r.created_at,
        extra:     { notificationId: r.id, read: r.read },
      }));
      showInitialBatch(recentNotifs);
      return;
    }

    const newRows = rows.filter(r => !seenIdsRef.current.has(`reg_${r.id}`));
    if (!newRows.length) return;

    const newNotifs = newRows.map(r => buildNotification({
      id:        `reg_${r.id}`,
      type:      r.type,
      title:     r.title,
      message:   r.message,
      createdAt: r.created_at,
      extra:     { notificationId: r.id, read: r.read },
    }));

    addNotifications(newNotifs, isRealtime);
  }, [addNotifications, showInitialBatch, user?.id]);


  // Unique-per-*attempt* channel name generator — NOT a ref computed once.
  // Reusing the same topic string across retries causes Supabase-js to
  // reuse the still-registered (already-subscribed) channel instance if the
  // previous removeChannel() hasn't finished deregistering it yet, and
  // chaining .on() onto an already-subscribed channel throws
  // "cannot add postgres_changes callbacks ... after subscribe()". Minting
  // a brand-new name every time subscribe() runs (initial mount AND every
  // reconnect) sidesteps that race entirely.
  const newChannelName = () => `dashboard-borrow-notif-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    let cancelled = false;
    let resubscribeTimer = null;

    const load = () => {
      fetchPendingRequests(false);
      fetchRecentNewUsers(false);
      fetchRecentReturns(false);
      fetchRecentRegistrationDecisions(false);
    };
    load();

    // Instant, zero-round-trip fast path: Supabase's realtime payload already
    // carries the full new/updated row, so for the (common) non-campus-scoped
    // case we push a notification straight into the bell the moment the
    // event arrives instead of waiting on a follow-up SELECT. The existing
    // fetch* calls still run right after as a reconciliation pass (needed
    // for campus-scoped accounts, which require the `books` join) — since
    // addNotifications de-dupes by id, this never double-adds or double-counts.
    let ch = null;

    const subscribe = () => {
      ch = supabase
        .channel(newChannelName())
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'borrow_requests',
        }, (payload) => {
          const r = payload?.new;
          if (r && !campusId && r.status === 'pending') {
            addNotifications([buildNotification({
              id:        `borrow_req_${r.id}`,
              type:      'BORROW_REQUEST',
              title:     'Borrow Request',
              message:   `${r.student_name || 'A student'} wants to borrow "${r.book_title || 'a book'}"`,
              createdAt: r.created_at,
              extra:     { borrowId: r.id },
            })], true);
          }
          fetchPendingRequests(true);
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'borrow_requests',
        }, () => {
          // A decision (approved/rejected) was made — no notification is
          // synthesized here for the Librarian (that's student-only), we
          // just need the pending list to drop the now-resolved request.
          fetchPendingRequests(false);
        })
        .on('postgres_changes', {
          event: 'DELETE', schema: 'public', table: 'borrow_requests',
        }, (payload) => {
          // Realtime DELETE payloads only reliably carry the primary key
          // (`old.id`), not the full row, so we just drop the matching
          // synthesized notification rather than trying to rebuild it.
          const oldId = payload?.old?.id;
          if (oldId == null) return;
          removeNotifications([`borrow_req_${oldId}`]);
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'profiles',
        }, (payload) => {
          const r = payload?.new;
          if (r && r.role !== 'super_admin' && r.role !== 'library_manager' && (!campusId || r.campus_id === campusId)) {
            addNotifications([buildNotification({
              id:        `new_user_${r.id}`,
              type:      'NEW_USER',
              title:     'New User Registered',
              message:   `${[r.first_name, r.last_name].filter(Boolean).join(' ') || 'A new student'} just created an account.`,
              createdAt: r.created_at,
              extra:     { userId: r.id },
            })], true);
          }
          fetchRecentNewUsers(true);
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'borrowings',
        }, (payload) => {
          const r = payload?.new;
          if (r && r.status === 'Returned' && (!campusId || r.campus_id === campusId)) {
            addNotifications([buildNotification({
              id:        `book_ret_${r.id}`,
              type:      'BOOK_RETURNED',
              title:     'Book Returned',
              message:   `"${r.book_title || 'A book'}" was checked back in by ${r.student_name || 'a student'}.`,
              createdAt: r.returned_at,
              extra:     { borrowingId: r.id },
            })], true);
          }
          fetchRecentReturns(true);
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
        }, (payload) => {
          const r = payload?.new;
          if (r && r.recipient_id === user?.id && (r.type === 'REGISTRATION_APPROVED' || r.type === 'REGISTRATION_REJECTED')) {
            addNotifications([buildNotification({
              id:        `reg_${r.id}`,
              type:      r.type,
              title:     r.title,
              message:   r.message,
              createdAt: r.created_at,
              extra:     { notificationId: r.id, read: r.read },
            })], true);
          }
          fetchRecentRegistrationDecisions(false);
        })
        .subscribe((status) => {
          if (cancelled) return;
          setRealtimeStatus(status);
          if (import.meta?.env?.DEV) console.log('[Dashboard] realtime channel status:', status);

          // If the socket drops or the initial handshake fails (bad network,
          // a proxy timing it out, the tab waking from sleep, etc.), rebuild
          // the channel instead of silently staying dead in the water.
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            const dead = ch;
            ch = null;
            // removeChannel() is async — wait for it to fully deregister
            // the old topic before minting a new channel, otherwise a
            // stale-but-still-registered channel can get reused and throw
            // "cannot add postgres_changes callbacks ... after subscribe()".
            Promise.resolve(supabase.removeChannel(dead)).finally(() => {
              resubscribeTimer = setTimeout(() => { if (!cancelled) subscribe(); }, 2000);
            });
          }
        });
    };
    subscribe();

    // Safety-net poll: some Supabase projects have Realtime replication
    // switched off for a table (Database → Replication in the dashboard),
    // in which case postgres_changes never fires no matter how correct the
    // subscription code is. Polling quietly in the background guarantees
    // new activity still shows up even in that case, while the realtime
    // path above keeps things instant whenever the socket is up.
    const pollId = setInterval(() => {
      fetchPendingRequests(true);
      fetchRecentNewUsers(true);
      fetchRecentReturns(true);
      fetchRecentRegistrationDecisions(true);
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      if (resubscribeTimer) clearTimeout(resubscribeTimer);
      if (ch) supabase.removeChannel(ch);
    };
  }, [fetchPendingRequests, fetchRecentNewUsers, fetchRecentReturns, fetchRecentRegistrationDecisions, addNotifications, removeNotifications, campusId, user?.id]);

  // Optimistic: flip local state first (badge updates instantly), then
  // persist. Persistence here is localStorage (notificationHistory.js) —
  // this app's notification feed is synthesized client-side from several
  // tables (see fetchPendingRequests/fetchRecentReturns/etc. above), not
  // a single Supabase `notifications` row with an `is_read` column, so
  // there's no network round trip that can fail here the way a Supabase
  // UPDATE could. The try/catch still guards against a full/blocked
  // localStorage (private browsing, quota) so a storage failure can never
  // silently desync the UI from what's persisted — it rolls the optimistic
  // update back and surfaces it instead of leaving the badge lying.
  const markAllRead = () => {
    const prevSnapshot = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      setNotifHistory(markAllNotifHistoryRead(user?.id));
    } catch (err) {
      console.error('[Dashboard] failed to persist mark-all-read:', err);
      setNotifications(prevSnapshot);
    }
  };

  const markRead = (id) => {
    const prevSnapshot = notifications;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      setNotifHistory(markNotifHistoryRead(user?.id, id));
    } catch (err) {
      console.error('[Dashboard] failed to persist mark-read:', err);
      setNotifications(prevSnapshot);
    }
  };

  const dismissAll = () => {
    // Clears the live bell list only — the full history ("See all") is kept
    // so nothing actually gets lost, it's just tucked out of the dropdown.
    setNotifications([]);
    seenNotifIdsInStateRef.current = new Set();
    setNotifOpen(false);
  };

  const clearHistory = () => {
    setNotifHistory(clearNotifHistory(user?.id));
  };

  // Shared by both the bell dropdown and the "See all" history modal.
  // Marks the notification read, then switches to the relevant tab (and,
  // for 'exact' targets, hands the target component a focus id so it can
  // scroll to and highlight the specific record). Every notification now
  // resolves to a target (see getNotifTarget), so this always navigates —
  // the `if (!target) return;` below is just a defensive fallback.
  const openNotification = (n) => {
    markRead(n.id);
    const target = getNotifTarget(n);
    if (!target) return;

    if (target.tab === 'bookmanage') setBookManageTab(target.bookManageTab || 'scanner');
    setActiveTab(target.tab);
    if (window.location.hash !== `#${target.tab}`) window.location.hash = target.tab;

    setNotifFocus({
      prop:  target.kind === 'exact' ? target.focusProp : null,
      value: target.kind === 'exact' ? target.focusValue : null,
      nonce: Date.now(),
    });

    setNotifOpen(false);
    setHistoryOpen(false);
  };

 
  const handleBellClick = () => {
    setNotifOpen(o => {
      const next = !o;
      if (next) setNotifPanelPos(computeNotifPanelPos());
      return next;
    });
  };
 

  // Shared row renderer — used for both the "New" and "Earlier" groups in
  // the dropdown list so the markup only exists in one place.
  const renderNotifRow = (n) => {
    const typeInfo = NOTIF_TYPES[n.type] || NOTIF_TYPES.BORROW_REQUEST;
    const isUnread = !n.read;
    const target   = getNotifTarget(n);
    const canOpen  = !!target;

    return (
      <div
        key={n.id}
        className={`lm-notif-row${isUnread ? ' unread' : ''}${canOpen ? '' : ' unlinked'}`}
        onClick={canOpen ? () => openNotification(n) : () => markRead(n.id)}
        style={canOpen ? undefined : { cursor: 'default' }}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            canOpen ? openNotification(n) : markRead(n.id);
          }
        }}
      >
        <div
          className="lm-notif-row-bar"
          style={{ background: isUnread ? typeInfo.color : `${typeInfo.color}55` }}
        />

        <div className="lm-notif-body">
          <div className="lm-notif-row-top">
            <span className="lm-notif-type" style={{ color: isUnread ? typeInfo.color : 'var(--notif-secondary)' }}>
              {typeInfo.label}
            </span>
            <span className="lm-notif-time">{fmtAgo(n.createdAt)}</span>
          </div>

          <div className={`lm-notif-msg${isUnread ? ' is-unread' : ''}`}>
            {n.message}
          </div>

        </div>

        {isUnread && (
          <div
            className="lm-notif-unread-dot"
            style={{ background: typeInfo.color, boxShadow: `0 0 8px ${typeInfo.color}99` }}
          />
        )}
      </div>
    );
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
    setHistoryOpen(false);
    if (window.location.hash !== `#${tab}`) window.location.hash = tab;
  };

  const navigateFromOverview = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
    setHistoryOpen(false);
    if (window.location.hash !== `#${tab}`) window.location.hash = tab;
  };

  // Keep activeTab in sync with the URL hash (back/forward buttons, direct links, manual edits)
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':   return <Overview onNavigate={navigateFromOverview} />;
      case 'attendance': return (
        <AttendanceMonitoring
          focusAttendanceId={notifFocus.prop === 'focusAttendanceId' ? notifFocus.value : null}
          focusNonce={notifFocus.nonce}
        />
      );
      case 'bookmanage': return (
        <BookManagement
          initialTab={bookManageTab}
          focusBorrowId={notifFocus.prop === 'focusBorrowId' ? notifFocus.value : null}
          focusBorrowingId={notifFocus.prop === 'focusBorrowingId' ? notifFocus.value : null}
          focusNonce={notifFocus.nonce}
        />
      );
      case 'catalog':    return <OnlineCatalog />;
      case 'users':      return (
        <UserManagement
          focusUserId={notifFocus.prop === 'focusUserId' ? notifFocus.value : null}
          focusNonce={notifFocus.nonce}
        />
      );
      case 'reports':    return <ReportsAnalytics />;
      case 'settings':   return <Settings user={user} onSignOut={onSignOut} />;
      default:           return <Overview onNavigate={navigateFromOverview} />;
    }
  };

  // "See all" no longer opens a floating modal — it renders right here in
  // the main content area, styled the same way every other page in the app
  // is (module header + stat cards + filters + panel), so it reads as a
  // real page instead of something hovering disconnected on top of the UI.
  const renderNotifHistoryPage = () => {
    const q = historySearch.trim().toLowerCase();
    const rows = notifHistory.filter(n => {
      const matchType = historyTypeFilter === 'all' || n.type === historyTypeFilter;
      const matchQ = !q || n.message?.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q);
      return matchType && matchQ;
    });
    const unreadTotal = notifHistory.filter(n => !n.read).length;
    const todayTotal = notifHistory.filter(n => {
      const d = new Date(n.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;

    return (
      <div className="lm-module lm-notif-hist-page">
        <div className="lm-module-header">
          <div>
            <div className="lm-module-title">Notification History</div>
            <div className="lm-module-subtitle">Every notification the bell has shown, kept locally on this device.</div>
          </div>
          <button className="lm-btn lm-btn--ghost" onClick={() => setHistoryOpen(false)}>
            Back to Dashboard
          </button>
        </div>

        <div className="lm-stats-grid">
          <div className="lm-stat-card">
            <div className="lm-stat-label">Total Logged</div>
            <div className="lm-stat-value">{notifHistory.length}</div>
            <div className="lm-stat-sub">Up to 300 kept</div>
          </div>
          <div className="lm-stat-card">
            <div className="lm-stat-label">Unread</div>
            <div className="lm-stat-value">{unreadTotal}</div>
            <div className="lm-stat-sub">Awaiting review</div>
          </div>
          <div className="lm-stat-card">
            <div className="lm-stat-label">Today</div>
            <div className="lm-stat-value">{todayTotal}</div>
            <div className="lm-stat-sub">Since midnight</div>
          </div>
          <div className="lm-stat-card">
            <div className="lm-stat-label">Showing</div>
            <div className="lm-stat-value">{rows.length}</div>
            <div className="lm-stat-sub">Matches current filter</div>
          </div>
        </div>

        <div className="lm-filters">
          <div className="lm-search-wrap">
            <input
              type="text"
              className="lm-search"
              placeholder="Search notifications…"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              style={{ paddingLeft: 14 }}
            />
          </div>
          <select
            className="lm-select"
            value={historyTypeFilter}
            onChange={e => setHistoryTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {Object.entries(NOTIF_TYPES).map(([key, t]) => (
              <option key={key} value={key}>{t.label}</option>
            ))}
          </select>
          {notifHistory.length > 0 && (
            <button className="lm-btn lm-btn--danger" onClick={clearHistory}>Clear history</button>
          )}
        </div>

        <div className="lm-notif-hist-panel">
          <div className="lm-panel-title">
            Activity Log
            <span className="lm-notif-hist-count">{rows.length}</span>
          </div>

          <div className="lm-notif-hist-list">
            {rows.length === 0 ? (
              <div className="lm-notif-empty">
                <div className="lm-notif-empty-title">
                  {notifHistory.length === 0 ? 'No notifications yet' : 'No matches'}
                </div>
                <div className="lm-notif-empty-sub">
                  {notifHistory.length === 0
                    ? 'Everything that comes in will be kept here, even after it scrolls out of the bell.'
                    : 'Try a different search term or type filter.'}
                </div>
              </div>
            ) : (
              rows.map((n, i) => {
                const typeInfo = NOTIF_TYPES[n.type] || NOTIF_TYPES.BORROW_REQUEST;
                const isUnread = !n.read;
                const target   = getNotifTarget(n);
                const canOpen  = !!target;

                return (
                  <div
                    key={n.id || i}
                    className={`lm-notif-row${isUnread ? ' unread' : ''}${canOpen ? '' : ' unlinked'}`}
                    onClick={canOpen ? () => openNotification(n) : () => markRead(n.id)}
                    style={canOpen ? undefined : { cursor: 'default' }}
                  >
                    <div
                      className="lm-notif-row-bar"
                      style={{ background: isUnread ? typeInfo.color : `${typeInfo.color}55` }}
                    />

                    <div className="lm-notif-body">
                      <div className="lm-notif-row-top">
                        <span className="lm-notif-type" style={{ color: isUnread ? typeInfo.color : 'rgba(122,48,48,0.55)' }}>
                          {typeInfo.label}
                        </span>
                        <span className="lm-notif-time">{fmtAgo(n.createdAt)}</span>
                      </div>
                      <div
                        className="lm-notif-msg"
                        style={{ color: isUnread ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isUnread ? 500 : 400 }}
                      >
                        {n.message}
                      </div>
                    </div>

                    {isUnread && (
                      <div className="lm-notif-unread-dot" style={{ background: typeInfo.color, boxShadow: `0 0 8px ${typeInfo.color}99` }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="lm-notif-hist-foot">
            <span className="lm-notif-hist-foot-note">Kept locally on this device — up to 300 notifications.</span>
          </div>
        </div>
      </div>
    );
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
            <div className="lm-topbar-title">{historyOpen ? 'Notification History' : (LABEL_MAP[activeTab] || 'Dashboard')}</div>
            <div className="lm-breadcrumb">
              {historyOpen ? 'Your full notification activity, saved locally on this device.' : <>
              {activeTab === 'overview'    && "Welcome back. Here's what's happening at the library today."}
              {activeTab === 'attendance'  && 'Track and manage student library attendance records.'}
              {activeTab === 'bookmanage'  && 'Manage book borrowing and returns via QR scanning.'}
              {activeTab === 'catalog'     && "Manage the library's full collection."}
              {activeTab === 'users'       && 'View and manage all registered library accounts.'}
              {activeTab === 'reports'     && 'View detailed reports on loans, activity, and usage.'}
              {activeTab === 'settings'    && 'Configure your account and system preferences.'}
              </>}
            </div>
          </div>

          <div className="lm-topbar-right">
            <div className="lm-notif-wrap">
              <button
                ref={notifBtnRef}
                className={`lm-notif-btn${unreadCount > 0 ? ' has-unread' : ''}`}
                onClick={handleBellClick}
                aria-label="Notifications"
              >
                {NavIcons.bell}
                {unreadCount > 0 && (
                  <span className="lm-notif-badge" aria-hidden="true">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {unreadCount > 0 && (
                  <span className="lm-sr-only">{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</span>
                )}
              </button>

              {notifOpen && createPortal(
                <>
                  <div
                    className="lm-notif-backdrop"
                    onClick={() => setNotifOpen(false)}
                  />
                  {notifPanelPos && (
                    // Must be a SIBLING of .lm-notif-panel, not a child — the
                    // panel's own entrance animation leaves a `transform`
                    // applied to it (animation-fill-mode: both), and any
                    // non-`none` transform on an ancestor turns it into the
                    // positioning reference for position:fixed descendants.
                    // Nested inside the panel, this caret's top/right were
                    // being measured from the panel's own corner instead of
                    // the viewport, which is why it rendered as a stray
                    // square jammed inside the header instead of a triangle
                    // pointing at the bell.
                    <div className="lm-notif-caret" style={{ right: notifPanelPos.arrowRight, top: notifPanelPos.top - 8 }} />
                  )}
                  <div
                    className="lm-notif-panel"
                    style={notifPanelPos ? { top: notifPanelPos.top, right: notifPanelPos.right } : undefined}
                    onClick={e => e.stopPropagation()}
                  >

                  <div className="lm-notif-head">
                    <div className="lm-notif-head-top">
                      <div className="lm-notif-head-title">
                        Notifications
                        <span
                          className={`lm-notif-live${realtimeStatus === 'SUBSCRIBED' ? ' is-live' : ''}`}
                          title={realtimeStatus === 'SUBSCRIBED' ? 'Live — updates instantly' : 'Reconnecting…'}
                        >
                          <i className="lm-notif-live-dot" />
                          {realtimeStatus === 'SUBSCRIBED' ? 'Live' : 'Syncing'}
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          className="lm-notif-action-btn"
                          onClick={markAllRead}
                          title="Mark all as read"
                          aria-label="Mark all notifications as read"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="lm-notif-tabs" role="tablist" aria-label="Filter notifications">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={notifTab === 'all'}
                        className={`lm-notif-tab${notifTab === 'all' ? ' active' : ''}`}
                        onClick={() => setNotifTab('all')}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={notifTab === 'unread'}
                        className={`lm-notif-tab${notifTab === 'unread' ? ' active' : ''}`}
                        onClick={() => setNotifTab('unread')}
                      >
                        Unread{unreadCount > 0 ? ` (${unreadCount > 99 ? '99+' : unreadCount})` : ''}
                      </button>
                    </div>
                  </div>

                  <div className="lm-notif-list">
                    {visibleNotifications.length === 0 ? (
                      <div className="lm-notif-empty">
                        <div className="lm-notif-empty-title">
                          {notifTab === 'unread' ? "You're all caught up" : 'No notifications yet'}
                        </div>
                        <div className="lm-notif-empty-sub">
                          {notifTab === 'unread'
                            ? 'No unread notifications right now.'
                            : "New activity will appear here instantly — no refresh needed."}
                        </div>
                      </div>
                    ) : (
                      <>
                        {notifNewGroup.length > 0 && (
                          <>
                            <div className="lm-notif-section-head">
                              <span>New</span>
                              <button
                                type="button"
                                className="lm-notif-see-all"
                                onClick={() => { setNotifOpen(false); setHistoryOpen(true); }}
                              >
                                See all →
                              </button>
                            </div>
                            {notifNewGroup.map(renderNotifRow)}
                          </>
                        )}
                        {notifEarlierGroup.length > 0 && (
                          <>
                            <div className="lm-notif-section-head">
                              <span>Earlier</span>
                              {notifNewGroup.length === 0 && (
                                <button
                                  type="button"
                                  className="lm-notif-see-all"
                                  onClick={() => { setNotifOpen(false); setHistoryOpen(true); }}
                                >
                                  See all →
                                </button>
                              )}
                            </div>
                            {notifEarlierGroup.map(renderNotifRow)}
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="lm-notif-foot">
                    <button
                      type="button"
                      className="lm-notif-settings-link"
                      onClick={() => { setActiveTab('settings'); setNotifOpen(false); setHistoryOpen(false); }}
                      title="Manage notification preferences"
                    >
                      Preferences
                    </button>
                    <div className="lm-notif-foot-right">
                      {notifications.length > 0 && (
                        <>
                          <span className="lm-notif-foot-count">{notifications.length} of {NOTIF_MAX} max</span>
                          <button className="lm-notif-clear-btn" onClick={dismissAll} title="Clears this dropdown only — full history stays in See all">Clear all</button>
                        </>
                      )}
                    </div>
                  </div>
                  </div>
                </>,
                document.body
              )}

            </div>

            <div className="lm-profile-chip" onClick={() => { setActiveTab('settings'); setNotifOpen(false); setHistoryOpen(false); }}>
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
          {historyOpen ? renderNotifHistoryPage() : renderContent()}
        </main>
      </div>
    </div>
  );
}