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
  // ── Student-only preferences that have their own dedicated toggles at the
  // top of the student Settings > Notifications tab (so `standalone: true`
  // keeps them out of the "Alert Types" list and its Enable all / Turn all
  // off buttons).
  {
    key:   'DUE_DATE_REMINDER',
    label: 'Due Date Reminders',
    desc:  'Get reminded before your books are due.',
    icon:  'alert',
    color: '#C97A1B',
    roles: ['student'],
    standalone: true,
  },
  {
    key:   'NEW_ARRIVAL',
    label: 'New Arrivals',
    desc:  'Notify me when new books are added.',
    icon:  'book',
    color: '#1D6FA5',
    roles: ['student'],
    standalone: true,
    defaultEnabled: false, // off until the student turns it on (matches the previous Settings default)
  },
  {
    key:   'SYSTEM_ALERT',
    label: 'System Alerts',
    desc:  'Important system notices and account alerts.',
    icon:  'alert',
    color: '#FF7043',
    roles: ['library_manager', 'student'],
  },
];

/**
 * Returns only the preference types a given role's Settings page should show
 * in its "Alert Types" list. `standalone` types (Due Date Reminders, New
 * Arrivals) are excluded — they have their own dedicated toggles.
 */
export function getNotifPrefTypesForRole(role) {
  return NOTIF_PREF_TYPES.filter(t => t.roles.includes(role) && !t.standalone);
}

import { supabase } from '../supabaseClient';
import { getNotifHistory } from './notificationHistory';

const PREFS_PREFIX = 'librascan_notif_prefs_';
const SOUND_PREFIX = 'librascan_notif_sound_';

// Fired (same tab) whenever a preference changes, so any open Dashboard
// instance can immediately re-sync without a page reload.
export const NOTIF_PREFS_EVENT = 'librascan-notif-prefs-changed';

function prefsKey(uid)  { return `${PREFS_PREFIX}${uid || 'guest'}`; }
function soundKey(uid)  { return `${SOUND_PREFIX}${uid || 'guest'}`; }

// ─────────────────────────────────────────────────────────────────────────
// "Off periods"
// A notification type that is switched OFF must not collect anything. The
// dashboards re-build most notifications from the live tables (pending
// requests, new users, approvals…) with no age limit, so without this,
// flipping a switch back ON would suddenly reveal everything that happened
// while it was OFF. We remember WHEN each type was switched off/on; any
// notification whose own createdAt falls inside an off period is treated as
// "never happened" — it is not shown in the bell and not kept in history.
// Due Date Reminders / New Arrivals (standalone types) are state-based, not
// events, and already skip generation while off, so they are exempt.
// ─────────────────────────────────────────────────────────────────────────
const SILENCE_PREFIX = 'librascan_notif_silence_';
const MAX_PERIODS    = 50;
function silenceKey(uid) { return `${SILENCE_PREFIX}${uid || 'guest'}`; }
function isStandaloneType(type) {
  return NOTIF_PREF_TYPES.some(t => t.key === type && t.standalone);
}

let silenceCache = { key: null, raw: null, value: { types: {} } };
function readSilence(uid) {
  const key = silenceKey(uid);
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { /* storage unavailable */ }
  if (silenceCache.key === key && silenceCache.raw === raw) return silenceCache.value;
  let value = { types: {} };
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && parsed.types && typeof parsed.types === 'object') value = parsed;
  } catch { /* corrupt — start clean */ }
  silenceCache = { key, raw, value };
  return value;
}
function writeSilence(uid, value) {
  let raw = null;
  try { raw = JSON.stringify(value); localStorage.setItem(silenceKey(uid), raw); } catch { /* storage unavailable */ }
  silenceCache = { key: silenceKey(uid), raw, value };
}

// When a type that was already off before this tracking existed is switched
// back on, assume it went off right after its newest stored entry.
function legacyOffStart(uid, type) {
  try {
    let newest = 0;
    getNotifHistory(uid).forEach(n => {
      if (n.type !== type) return;
      const t = Date.parse(n.createdAt);
      if (!Number.isNaN(t) && t > newest) newest = t;
    });
    return newest;
  } catch { return 0; }
}

function trackToggle(uid, type, prev, next) {
  if (!uid || isStandaloneType(type) || !!prev === !!next) return;
  const now   = Date.now();
  const value = { types: { ...readSilence(uid).types } };
  const rec   = { off: null, periods: [], ...(value.types[type] || {}) };
  rec.periods = [...(rec.periods || [])];
  if (!next) {
    rec.off = now;
  } else {
    const start = rec.off != null ? rec.off : legacyOffStart(uid, type);
    rec.periods.push([start, now]);
    if (rec.periods.length > MAX_PERIODS) rec.periods = rec.periods.slice(-MAX_PERIODS);
    rec.off = null;
  }
  value.types[type] = rec;
  writeSilence(uid, value);
}

/**
 * True when this notification happened while its type was switched off, so it
 * must not be shown or stored — not even after the type is switched back on.
 */
export function isNotifSilenced(uid, n) {
  if (!n || !n.type || isStandaloneType(n.type)) return false;
  const rec = readSilence(uid).types[n.type];
  if (!rec) return false;
  const t = Date.parse(n.createdAt);
  if (Number.isNaN(t)) return false;
  if (rec.off != null && t >= rec.off) return true;
  return Array.isArray(rec.periods) && rec.periods.some(([a, b]) => t >= a && t <= b);
}

// ─────────────────────────────────────────────────────────────────────────
// Cross-device sync
// Preferences used to live ONLY in this browser's localStorage, which is
// private per browser AND per origin — so http://localhost:5173 and the
// deployed domain each had their own copy. Because the Notification History
// page hides every type that is switched off, one origin could show e.g.
// Borrow Requests while the other (same account, same synced history rows)
// hid them, giving different lists and counts. The preferences are now also
// kept in the account's Supabase Auth user_metadata (no table/migration
// needed), and the newest copy wins on every device. localStorage stays the
// fast synchronous source, so the public API below is unchanged.
// ─────────────────────────────────────────────────────────────────────────
const META_KEY     = 'librascan_notif_prefs';
const STAMP_PREFIX = 'librascan_notif_prefs_ts_';
const PUSH_DELAY   = 800;

function stampKey(uid) { return `${STAMP_PREFIX}${uid || 'guest'}`; }
function getLocalStamp(uid) {
  try { return Number(localStorage.getItem(stampKey(uid))) || 0; } catch { return 0; }
}
function setLocalStamp(uid, ts) {
  try { localStorage.setItem(stampKey(uid), String(ts)); } catch { /* storage unavailable */ }
}

const cloudChecked = new Set();   // uids whose server copy was already pulled this page load
const pushTimers   = new Map();   // uid -> debounce timer

async function sessionMatches(uid) {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id === uid;
}

async function pushToCloud(uid) {
  try {
    if (!uid || !(await sessionMatches(uid))) return;
    await supabase.auth.updateUser({
      data: {
        [META_KEY]: {
          prefs:     getNotifPrefs(uid),
          sound:     getNotifSoundEnabled(uid),
          silence:   readSilence(uid),
          updatedAt: getLocalStamp(uid) || Date.now(),
        },
      },
    });
  } catch { /* offline / not signed in — local copy still works */ }
}

// Called after every local change: stamp it, then upload (debounced).
function schedulePush(uid) {
  if (!uid) return;
  setLocalStamp(uid, Date.now());
  clearTimeout(pushTimers.get(uid));
  pushTimers.set(uid, setTimeout(() => { pushTimers.delete(uid); pushToCloud(uid); }, PUSH_DELAY));
}

// Pulls the account's saved preferences once per page load. Newer server
// copy -> adopt it here; newer (or first) local copy -> upload it.
async function syncFromCloud(uid) {
  try {
    if (!(await sessionMatches(uid))) { cloudChecked.delete(uid); return; }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) { cloudChecked.delete(uid); return; }
    const remote = data.user.user_metadata?.[META_KEY];
    const remoteStamp = Number(remote?.updatedAt) || 0;
    const localStamp  = getLocalStamp(uid);

    if (remote && remote.prefs && typeof remote.prefs === 'object' && remoteStamp > localStamp) {
      try {
        localStorage.setItem(prefsKey(uid), JSON.stringify({ ...defaultPrefs(), ...remote.prefs }));
        if (typeof remote.sound === 'boolean') localStorage.setItem(soundKey(uid), remote.sound ? '1' : '0');
      } catch { /* storage unavailable */ }
      if (remote.silence && typeof remote.silence === 'object' && remote.silence.types) writeSilence(uid, remote.silence);
      setLocalStamp(uid, remoteStamp);
      notifyChange(uid);
    } else if (!remote || localStamp > remoteStamp) {
      if (!localStamp) setLocalStamp(uid, Date.now());
      await pushToCloud(uid);
    }
  } catch {
    cloudChecked.delete(uid);
  }
}

function ensureCloudSync(uid) {
  if (!uid || uid === 'guest' || cloudChecked.has(uid)) return;
  cloudChecked.add(uid);
  syncFromCloud(uid);
}

function defaultPrefs() {
  const prefs = {};
  NOTIF_PREF_TYPES.forEach(t => { prefs[t.key] = t.defaultEnabled !== false; });
  return prefs;
}

function notifyChange(uid) {
  try {
    window.dispatchEvent(new CustomEvent(NOTIF_PREFS_EVENT, { detail: { uid } }));
  } catch { /* no-op — SSR / non-browser environment */ }
}

/** Returns the full { TYPE_KEY: boolean } map for a user, filled in with defaults. */
export function getNotifPrefs(uid) {
  ensureCloudSync(uid);
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
  const before = getNotifPrefs(uid);
  const next = { ...before, [type]: enabled };
  trackToggle(uid, type, before[type], enabled);
  try { localStorage.setItem(prefsKey(uid), JSON.stringify(next)); } catch { /* storage unavailable */ }
  notifyChange(uid);
  schedulePush(uid);
  return next;
}


export function setAllNotifPrefs(uid, enabled, role) {
  const current = getNotifPrefs(uid);
  const scoped = role ? getNotifPrefTypesForRole(role) : NOTIF_PREF_TYPES;
  const next = { ...current };
  scoped.forEach(t => { trackToggle(uid, t.key, current[t.key], enabled); next[t.key] = enabled; });
  try { localStorage.setItem(prefsKey(uid), JSON.stringify(next)); } catch { /* storage unavailable */ }
  notifyChange(uid);
  schedulePush(uid);
  return next;
}

/** Whether the notification chime should play. Defaults to on. */
export function getNotifSoundEnabled(uid) {
  ensureCloudSync(uid);
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
  schedulePush(uid);
}