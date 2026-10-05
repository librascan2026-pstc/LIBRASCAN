// ============================================================================
// LIBRASCAN — Notification History
// Full log of every notification the bell has ever shown. The bell dropdown
// itself only keeps the most recent NOTIF_MAX in memory for speed — this
// store is what "See all" reads from, so older activity isn't lost once it
// scrolls out of the dropdown.
//
// SOURCE OF TRUTH = Supabase table `notification_history` (one row per
// user + notification id, holding the notification itself plus its
// read/deleted state). localStorage is only a fast cache of it.
//
// Why: this used to be localStorage-only, which is per-browser AND
// per-origin. http://localhost:5173 and the deployed domain each kept their
// own private history (so counts never matched) and "read" state never left
// the device it was clicked on (so every other device showed everything as
// unread). Now every device syncs to the same rows, so history, read state
// and deletions are identical everywhere.
//
// The public API below is unchanged and still SYNCHRONOUS (it returns the
// updated list immediately from the cache, exactly like before) — the
// Supabase write/sync happens in the background. If the table is missing or
// the network is down, everything keeps working from localStorage as before.
// ============================================================================

import { supabase } from '../supabaseClient';

const HISTORY_PREFIX = 'librascan_notif_history_';
const DELETED_PREFIX = 'librascan_notif_deleted_';
const TABLE          = 'notification_history';
// Raised from 300 — that cap, combined with the (now-removed) 24h fetch
// window in Dashboard.jsx/StudentDashboard.jsx, was quietly rotating out
// older activity. 2000 small entries is effectively "keep everything" for
// normal day-to-day use while still guarding against unbounded growth.
const HISTORY_MAX = 2000;

const DELETED_MAX      = 5000;          // cap on remembered deleted ids (local cache)
const SYNC_INTERVAL_MS = 60 * 1000;     // background re-sync while the tab is visible
const SYNC_OVERLAP_MS  = 2 * 60 * 1000; // incremental pulls re-read a small overlap (idempotent) so nothing is missed
const WRITE_CHUNK      = 500;
const PULL_PAGE        = 1000;          // Supabase returns at most 1000 rows per request

/** Fired (same tab) after a background sync changed the persisted history. */
export const NOTIF_HISTORY_EVENT = 'librascan-notif-history-changed';

// Historical cleanup: an earlier version of this app briefly logged QR
// check-in/attendance scans as notifications (tagged BORROW_REQUEST,
// message "<name> checked in at the library."). That was intentionally
// removed — check-ins are attendance-only now (see Dashboard.jsx) — but
// this store only ever appends/reads, it never prunes, so any copy of
// that message already saved to a browser before the removal just sits
// here forever, tagged as a type that's still perfectly valid today.
// Preference filtering alone can't catch it (BORROW_REQUEST is enabled),
// so we recognize the retired message shape directly and strip it out.
const LEGACY_CHECKIN_PATTERN = /checked in at the library\.?\s*$/i;
function isLegacyCheckIn(n) {
  return typeof n?.message === 'string' && LEGACY_CHECKIN_PATTERN.test(n.message);
}

function historyKey(uid) { return `${HISTORY_PREFIX}${uid || 'guest'}`; }
function deletedKey(uid) { return `${DELETED_PREFIX}${uid || 'guest'}`; }

// ─────────────────────────────────────────────────────────────────────────
// Deleted-id memory ("tombstones")
// Notifications are re-synthesized from the live tables on every load, so
// without remembering what the user deleted, a deleted entry would simply
// come back on the next refresh (or on another device). Deleted ids are
// kept here and mirrored to the server as `deleted = true` rows.
// ─────────────────────────────────────────────────────────────────────────
const deletedCache = new Map(); // uid -> Set<string>

function getDeletedSet(uid) {
  const key = deletedKey(uid);
  if (deletedCache.has(key)) return deletedCache.get(key);
  let set = new Set();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) set = new Set(arr);
    }
  } catch { /* storage unavailable */ }
  deletedCache.set(key, set);
  return set;
}

function saveDeletedSet(uid) {
  const set = getDeletedSet(uid);
  while (set.size > DELETED_MAX) set.delete(set.values().next().value);
  try { localStorage.setItem(deletedKey(uid), JSON.stringify([...set])); } catch { /* storage unavailable */ }
}

/** True if this notification id was deleted from the history (on any device). */
export function isNotifDeleted(uid, id) {
  return getDeletedSet(uid).has(id);
}

// ─────────────────────────────────────────────────────────────────────────
// Local cache (localStorage)
// ─────────────────────────────────────────────────────────────────────────
function writeLocal(uid, list) {
  try { localStorage.setItem(historyKey(uid), JSON.stringify(list)); } catch { /* storage unavailable */ }
}

/** Returns the full notification history for a user, newest first. */
export function getNotifHistory(uid) {
  try {
    const raw = localStorage.getItem(historyKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed.filter(n => !isLegacyCheckIn(n));
    if (cleaned.length !== parsed.length) {
      // Self-healing: persist the pruned list so every future read doesn't
      // have to keep filtering the same junk back out.
      writeLocal(uid, cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Server writes (background, fire-and-forget, never throw into the UI)
// ─────────────────────────────────────────────────────────────────────────
let mutationEpoch = 0;            // bumped on every local read/delete/restore/clear — see syncNotifHistory
const pendingWrites = new Set();  // in-flight server writes
let warned = false;

function warnOnce(err) {
  if (warned) return;
  warned = true;
  console.warn(
    '[notificationHistory] Could not sync with Supabase table "notification_history" — ' +
    'falling back to this device only. Did you run the migration SQL? Details:',
    err?.message || err
  );
}

function trackWrite(run) {
  const p = (async () => {
    try {
      const { error } = await run();
      if (error) throw error;
    } catch (err) {
      warnOnce(err);
    }
  })();
  pendingWrites.add(p);
  p.then(() => pendingWrites.delete(p));
  return p;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toRow(uid, n, extra = {}) {
  return {
    user_id:    uid,
    notif_id:   n.id,
    type:       n.type ?? null,
    title:      n.title ?? null,
    message:    n.message ?? null,
    created_at: n.createdAt ?? null,
    extra:      n.extra ?? {},
    read:       !!n.read,
    ...extra,
  };
}

// Insert rows that don't exist yet; NEVER touches an existing row, so it can
// never overwrite a read/deleted state another device already saved.
function pushInsertIgnore(uid, notifs) {
  if (!uid || !notifs.length) return;
  chunk(notifs.map(n => toRow(uid, n)), WRITE_CHUNK).forEach(rows => {
    trackWrite(() => supabase.from(TABLE).upsert(rows, { onConflict: 'user_id,notif_id', ignoreDuplicates: true }));
  });
}

// Insert-or-update ONLY the columns present in the rows.
function pushMerge(uid, rows) {
  if (!uid || !rows.length) return;
  chunk(rows, WRITE_CHUNK).forEach(part => {
    trackWrite(() => supabase.from(TABLE).upsert(part, { onConflict: 'user_id,notif_id' }));
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Public API — same signatures/return values as before
// ─────────────────────────────────────────────────────────────────────────

/**
 * Merge a batch of notifications into the persisted history (dedupes by id,
 * newest first, capped at HISTORY_MAX). Safe to call repeatedly with
 * overlapping batches — existing entries (and their read state) are kept.
 */
export function addNotifHistory(uid, notifs) {
  if (!notifs || !notifs.length) return getNotifHistory(uid);
  // Defense in depth: never let the retired check-in message shape back
  // in, even if some future code path accidentally reintroduces it. Also
  // never re-add something the user deleted.
  const deleted  = getDeletedSet(uid);
  const incoming = notifs.filter(n => !isLegacyCheckIn(n) && !deleted.has(n.id));
  if (!incoming.length) return getNotifHistory(uid);
  const existing = getNotifHistory(uid);
  const existingIds = new Set(existing.map(n => n.id));
  const fresh = incoming.filter(n => !existingIds.has(n.id));
  const merged = [...fresh, ...existing]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, HISTORY_MAX);
  writeLocal(uid, merged);
  pushInsertIgnore(uid, fresh);
  return merged;
}

/** Marks a single history entry as read (used when the bell list has already scrolled past it). */
export function markNotifHistoryRead(uid, id) {
  mutationEpoch++;
  const existing = getNotifHistory(uid);
  let target = null;
  const next = existing.map(n => {
    if (n.id !== id) return n;
    target = { ...n, read: true };
    return target;
  });
  writeLocal(uid, next);
  if (target) pushMerge(uid, [toRow(uid, target)]);
  return next;
}

/** Marks every history entry as read. */
export function markAllNotifHistoryRead(uid) {
  mutationEpoch++;
  const existing = getNotifHistory(uid);
  const changed = existing.filter(n => !n.read).map(n => ({ ...n, read: true }));
  const next = existing.map(n => ({ ...n, read: true }));
  writeLocal(uid, next);
  pushMerge(uid, changed.map(n => toRow(uid, n)));
  return next;
}

/** Wipes the persisted history for a user (does not touch the live bell list). */
export function clearNotifHistory(uid) {
  mutationEpoch++;
  const existing = getNotifHistory(uid);
  const deleted = getDeletedSet(uid);
  existing.forEach(n => deleted.add(n.id));
  saveDeletedSet(uid);
  try { localStorage.removeItem(historyKey(uid)); } catch { /* storage unavailable */ }

  if (uid) {
    // Tombstone what this device has, then everything else still alive on
    // the server for this account, so other devices clear too.
    pushMerge(uid, existing.map(n => ({ user_id: uid, notif_id: n.id, deleted: true })));
    trackWrite(() => supabase.from(TABLE).update({ deleted: true }).eq('user_id', uid).eq('deleted', false));
  }
  return [];
}

/**
 * Removes a single entry from the persisted history by id — the per-row
 * "Delete this notification" action in the bell dropdown / "See all" page.
 * Unlike clearNotifHistory (which wipes everything), this only drops the
 * one entry so the rest of the log is untouched.
 */
export function deleteNotifHistoryEntry(uid, id) {
  mutationEpoch++;
  const existing = getNotifHistory(uid);
  const next = existing.filter(n => n.id !== id);
  writeLocal(uid, next);
  getDeletedSet(uid).add(id);
  saveDeletedSet(uid);
  pushMerge(uid, [{ user_id: uid, notif_id: id, deleted: true }]);
  return next;
}

/**
 * Re-inserts a previously-deleted entry — backs the "Undo" action shown
 * right after a delete. Merges back into its correct sorted position (and
 * dedupes safely if it was somehow never fully removed).
 */
export function restoreNotifHistoryEntry(uid, notif) {
  if (!notif) return getNotifHistory(uid);
  mutationEpoch++;
  getDeletedSet(uid).delete(notif.id);
  saveDeletedSet(uid);
  pushMerge(uid, [toRow(uid, notif, { deleted: false })]);
  return addNotifHistory(uid, [notif]);
}

// ─────────────────────────────────────────────────────────────────────────
// Sync (server → this device)
// ─────────────────────────────────────────────────────────────────────────
const syncStates = new Map(); // uid -> { cursor, inFlight }

async function pullRows(uid, sinceIso) {
  const rows = [];
  for (let from = 0; ; from += PULL_PAGE) {
    let q = supabase
      .from(TABLE)
      .select('notif_id, type, title, message, created_at, extra, read, deleted, updated_at')
      .eq('user_id', uid)
      .order('updated_at', { ascending: true })
      .order('notif_id',   { ascending: true })
      .range(from, from + PULL_PAGE - 1);
    if (sinceIso) q = q.gte('updated_at', sinceIso);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PULL_PAGE) break;
  }
  return rows;
}

function signature(list) {
  return list.map(n => `${n.id}:${n.read ? 1 : 0}`).join(',');
}

function applyServerRows(uid, rows, full, st) {
  const before   = getNotifHistory(uid);
  const localMap = new Map(before.map(n => [n.id, n]));
  const deleted  = getDeletedSet(uid);
  const serverIds = new Set();
  const readFixes = [];
  let cursor = st.cursor;

  rows.forEach(r => {
    serverIds.add(r.notif_id);
    if (r.updated_at && (!cursor || Date.parse(r.updated_at) > Date.parse(cursor))) cursor = r.updated_at;

    if (r.deleted) {
      deleted.add(r.notif_id);
      localMap.delete(r.notif_id);
      return;
    }
    deleted.delete(r.notif_id);
    if (!r.type) return; // placeholder row without content

    const prev = localMap.get(r.notif_id);
    const entry = {
      id:        r.notif_id,
      type:      r.type,
      title:     r.title,
      message:   r.message,
      createdAt: r.created_at,
      extra:     r.extra || {},
      // Reading is one-way (nothing can mark a notification unread again),
      // so "read anywhere" wins.
      read:      !!r.read || !!prev?.read,
    };
    if (isLegacyCheckIn(entry)) { localMap.delete(r.notif_id); return; }
    if (entry.read && !r.read) readFixes.push(entry); // this device knew it was read, server didn't
    localMap.set(r.notif_id, entry);
  });

  if (full) {
    // First sync on this device: upload anything only this device has (this
    // is what merges the old per-browser histories into one shared log), and
    // re-send deletes the server never received.
    const unpushed = [];
    localMap.forEach(n => { if (!serverIds.has(n.id) && !deleted.has(n.id)) unpushed.push(n); });
    pushInsertIgnore(uid, unpushed);
    pushMerge(uid, [...deleted].filter(id => !serverIds.has(id)).map(id => ({ user_id: uid, notif_id: id, deleted: true })));
  }
  pushMerge(uid, readFixes.map(n => toRow(uid, n)));

  const merged = [...localMap.values()]
    .filter(n => !deleted.has(n.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, HISTORY_MAX);

  const changed = signature(merged) !== signature(before);
  if (changed) writeLocal(uid, merged);
  saveDeletedSet(uid);
  st.cursor = cursor;

  if (changed) {
    try { window.dispatchEvent(new CustomEvent(NOTIF_HISTORY_EVENT, { detail: { uid } })); } catch { /* non-browser */ }
  }
}

/**
 * Pulls the account's history from Supabase into this device's cache
 * (first call = full pull + one-time upload of anything only this device
 * had; later calls = incremental). Fires NOTIF_HISTORY_EVENT if anything
 * changed. Never throws.
 */
export async function syncNotifHistory(uid) {
  if (!uid) return getNotifHistory(uid);
  let st = syncStates.get(uid);
  if (!st) { st = { cursor: null, inFlight: null }; syncStates.set(uid, st); }
  if (st.inFlight) return st.inFlight;

  st.inFlight = (async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        await Promise.allSettled([...pendingWrites]);
        const epochAtStart = mutationEpoch;
        const full  = !st.cursor;
        const since = full ? null : new Date(Date.parse(st.cursor) - SYNC_OVERLAP_MS).toISOString();
        const rows  = await pullRows(uid, since);
        // The user read/deleted something while we were fetching — this
        // result may be stale, so throw it away and pull again.
        if (epochAtStart !== mutationEpoch) continue;
        applyServerRows(uid, rows, full, st);
        break;
      }
    } catch (err) {
      warnOnce(err);
    } finally {
      st.inFlight = null;
    }
    return getNotifHistory(uid);
  })();
  return st.inFlight;
}

/**
 * Starts syncing now, then again on tab focus / becoming visible and every
 * minute while visible. Returns a cleanup function.
 */
export function startNotifHistorySync(uid) {
  if (!uid) return () => {};
  let stopped = false;
  const run = () => {
    if (stopped) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    syncNotifHistory(uid);
  };
  syncNotifHistory(uid);
  const intervalId = setInterval(run, SYNC_INTERVAL_MS);
  window.addEventListener('focus', run);
  document.addEventListener('visibilitychange', run);
  return () => {
    stopped = true;
    clearInterval(intervalId);
    window.removeEventListener('focus', run);
    document.removeEventListener('visibilitychange', run);
  };
}