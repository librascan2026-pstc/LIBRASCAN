// ============================================================================
// LIBRASCAN — Notification History
// Full, persisted (per-browser, per-account) log of every notification the
// bell has ever shown. The bell dropdown itself only keeps the most recent
// NOTIF_MAX (15) in memory for speed — this store is what "See all" reads
// from, so older activity isn't lost once it scrolls out of the dropdown.
// ============================================================================

const HISTORY_PREFIX = 'librascan_notif_history_';
const HISTORY_MAX = 300; // generous cap so localStorage doesn't grow unbounded

function historyKey(uid) { return `${HISTORY_PREFIX}${uid || 'guest'}`; }

/** Returns the full notification history for a user, newest first. */
export function getNotifHistory(uid) {
  try {
    const raw = localStorage.getItem(historyKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Merge a batch of notifications into the persisted history (dedupes by id,
 * newest first, capped at HISTORY_MAX). Safe to call repeatedly with
 * overlapping batches — existing entries (and their read state) are kept.
 */
export function addNotifHistory(uid, notifs) {
  if (!notifs || !notifs.length) return getNotifHistory(uid);
  const existing = getNotifHistory(uid);
  const existingIds = new Set(existing.map(n => n.id));
  const fresh = notifs.filter(n => !existingIds.has(n.id));
  const merged = [...fresh, ...existing]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, HISTORY_MAX);
  try { localStorage.setItem(historyKey(uid), JSON.stringify(merged)); } catch { /* storage unavailable */ }
  return merged;
}

/** Marks a single history entry as read (used when the bell list has already scrolled past it). */
export function markNotifHistoryRead(uid, id) {
  const existing = getNotifHistory(uid);
  const next = existing.map(n => n.id === id ? { ...n, read: true } : n);
  try { localStorage.setItem(historyKey(uid), JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
}

/** Marks every history entry as read. */
export function markAllNotifHistoryRead(uid) {
  const existing = getNotifHistory(uid);
  const next = existing.map(n => ({ ...n, read: true }));
  try { localStorage.setItem(historyKey(uid), JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
}

/** Wipes the persisted history for a user (does not touch the live bell list). */
export function clearNotifHistory(uid) {
  try { localStorage.removeItem(historyKey(uid)); } catch { /* storage unavailable */ }
  return [];
}