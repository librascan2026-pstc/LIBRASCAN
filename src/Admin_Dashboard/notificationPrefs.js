// ============================================================================
// LIBRASCAN — Notification Preferences
// Lightweight, client-side (per-browser, per-account) store for which
// notification types the signed-in user wants to see/hear. Used by
// Dashboard.jsx + Settings.jsx (Librarian) and StudentDashboard.jsx
// (Student) — both dashboards share this single source of truth so a
// notification type only ever has one definition, one icon, one color.
// ============================================================================

// Master list of every notification type in the app. `icon` matches the
// icon keys already used in the notification bell so every dashboard
// renders the same glyph for the same type.
//
// `roles` controls which dashboard's Settings page shows a toggle for that
// type — NOT whether the type is capable of firing. A type with a role not
// present in `roles` still works exactly as before (defaults to "on",
// unaffected by that other role's Settings actions); it's simply not
// something that role's Settings page exposes a switch for. This is what
// lets us remove a preference *toggle* from the Librarian's Settings page
// (per product requirements) without touching the Student notification
// functionality that relies on the same underlying type, and vice versa.
export const NOTIF_PREF_TYPES = [
  {
    key:   'BORROW_REQUEST',
    label: 'Pending Borrow Requests',
    desc:  'A student requests to borrow a book and is waiting on your review.',
    icon:  'book',
    color: '#C9A84C',
    roles: ['library_manager'],
  },
  {
    key:   'BORROW_APPROVED',
    label: 'Approved Requests',
    desc:  'A borrow request is approved and the book is ready for pickup.',
    icon:  'check',
    color: '#4CAF50',
    roles: ['student'],
  },
  {
    key:   'BORROW_CANCELLED',
    label: 'Canceled/Rejected Request',
    desc:  'A notification is sent when your book request is canceled or rejected.',
    icon:  'cancel',
    color: '#EF5350',
    roles: ['student'],
  },
  {
    key:   'BOOK_RETURNED',
    label: 'Book Returned',
    desc:  'A borrowed book is checked back in to the library.',
    icon:  'return',
    color: '#42A5F5',
    roles: ['library_manager'],
  },
  {
    key:   'NEW_USER',
    label: 'New User Registered',
    desc:  'A new student account is created on your campus.',
    icon:  'user',
    color: '#26A69A',
    roles: ['library_manager'],
  },
  {
    key:   'SCANNER_ACTIVITY',
    label: 'Scanner Activity',
    desc:  'Live QR check-in and check-out activity at the desk.',
    icon:  'scan',
    color: '#AB47BC',
    roles: [], // toggle removed from every Settings page; type stays functional (see note above)
  },
  {
    key:   'SYSTEM_ALERT',
    label: 'System Alerts',
    desc:  'Important system notices and account alerts.',
    icon:  'alert',
    color: '#FF7043',
    roles: ['library_manager', 'student'],
  },
  {
    key:   'REGISTRATION_APPROVED',
    label: 'Registration Approved',
    desc:  'Your book registration request has been approved by the Super Admin.',
    icon:  'check',
    color: '#4CAF50',
    roles: ['library_manager'],
  },
  {
    key:   'REGISTRATION_REJECTED',
    label: 'Registration Rejected',
    desc:  'Your book registration request has been rejected by the Super Admin.',
    icon:  'cancel',
    color: '#EF5350',
    roles: ['library_manager'],
  },
];

/** Returns only the preference types a given role's Settings page should show a toggle for. */
export function getNotifPrefTypesForRole(role) {
  return NOTIF_PREF_TYPES.filter(t => t.roles.includes(role));
}

const PREFS_PREFIX = 'librascan_notif_prefs_';
const SOUND_PREFIX = 'librascan_notif_sound_';

// Fired (same tab) whenever a preference changes, so any open Dashboard
// instance can immediately re-sync without a page reload.
export const NOTIF_PREFS_EVENT = 'librascan-notif-prefs-changed';

function prefsKey(uid)  { return `${PREFS_PREFIX}${uid || 'guest'}`; }
function soundKey(uid)  { return `${SOUND_PREFIX}${uid || 'guest'}`; }

function defaultPrefs() {
  const prefs = {};
  NOTIF_PREF_TYPES.forEach(t => { prefs[t.key] = true; });
  return prefs;
}

function notifyChange(uid) {
  try {
    window.dispatchEvent(new CustomEvent(NOTIF_PREFS_EVENT, { detail: { uid } }));
  } catch { /* no-op — SSR / non-browser environment */ }
}

/** Returns the full { TYPE_KEY: boolean } map for a user, filled in with defaults. */
export function getNotifPrefs(uid) {
  try {
    const raw = localStorage.getItem(prefsKey(uid));
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw);
    return { ...defaultPrefs(), ...parsed };
  } catch {
    return defaultPrefs();
  }
}

/** Enable/disable a single notification type for a user. */
export function setNotifPref(uid, type, enabled) {
  const next = { ...getNotifPrefs(uid), [type]: enabled };
  try { localStorage.setItem(prefsKey(uid), JSON.stringify(next)); } catch { /* storage unavailable */ }
  notifyChange(uid);
  return next;
}

/**
 * Enable/disable every notification type *visible to this role* at once.
 * Deliberately scoped to `role` (rather than every key in NOTIF_PREF_TYPES)
 * so a Librarian's "Turn all off" can never silently disable a
 * Student-only preference (like Canceled/Rejected Request) or vice versa —
 * each role's bulk actions only ever touch the toggles that role can see.
 */
export function setAllNotifPrefs(uid, enabled, role) {
  const current = getNotifPrefs(uid);
  const scoped = role ? getNotifPrefTypesForRole(role) : NOTIF_PREF_TYPES;
  const next = { ...current };
  scoped.forEach(t => { next[t.key] = enabled; });
  try { localStorage.setItem(prefsKey(uid), JSON.stringify(next)); } catch { /* storage unavailable */ }
  notifyChange(uid);
  return next;
}

/** Whether the notification chime should play. Defaults to on. */
export function getNotifSoundEnabled(uid) {
  try {
    const raw = localStorage.getItem(soundKey(uid));
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function setNotifSoundEnabled(uid, enabled) {
  try { localStorage.setItem(soundKey(uid), enabled ? '1' : '0'); } catch { /* storage unavailable */ }
  notifyChange(uid);
}