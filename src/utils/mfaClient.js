// ============================================================================
// LIBRASCAN — 2FA client
// Thin wrapper around the Node/Express service in /server. Every call is
// authenticated with the Supabase access token from the CURRENT session —
// that session already exists right after signInWithPassword() succeeds,
// even before the app "commits" the user, so this works at the OTP step
// of the login flow as well as from the Settings page.
// ============================================================================
import { supabase } from '../supabaseClient';

const API_BASE = import.meta.env.VITE_MFA_API_URL || 'http://localhost:4000';
const DEVICE_KEY_PREFIX = 'librascan_trusted_device_';

function deviceKey(uid) { return `${DEVICE_KEY_PREFIX}${uid}`; }

// ----------------------------------------------------------------------------
// "MFA pending" marker — closes the cross-tab hole where signInWithPassword()
// already leaves a real, persisted Supabase session in localStorage the
// instant the password is correct, i.e. BEFORE the OTP/email-confirmation
// step has been satisfied. Without this marker, opening any other tab in the
// same browser (most commonly: the "Yes, it's me" email link, opened from a
// Gmail tab in the same browser as the login tab) would let AuthContext pick
// up that raw session on mount and treat the person as fully signed in,
// skipping 2FA entirely. Every tab's AuthContext checks isMfaPending() before
// trusting a session; only the tab that actually finishes 2FA (or that never
// needed it) clears the marker.
// ----------------------------------------------------------------------------
const MFA_PENDING_PREFIX = 'librascan_mfa_pending_';
// Longer than both the OTP (5 min) and email-confirmation (10 min) windows,
// so an abandoned login attempt (tab closed mid-2FA) can't permanently lock
// a later, legitimate login out of every tab.
const MFA_PENDING_TTL_MS = 15 * 60 * 1000;

function mfaPendingKey(uid) { return `${MFA_PENDING_PREFIX}${uid}`; }

/** Call right after signInWithPassword() succeeds, before 2FA is resolved. */
export function markMfaPending(userId) {
  try { localStorage.setItem(mfaPendingKey(userId), String(Date.now())); } catch { /* storage unavailable */ }
}

/** Call once 2FA is satisfied (or wasn't required) and the login truly finishes. */
export function clearMfaPending(userId) {
  try { localStorage.removeItem(mfaPendingKey(userId)); } catch { /* storage unavailable */ }
}

/** True if this user has a Supabase session that hasn't cleared 2FA yet. */
export function isMfaPending(userId) {
  try {
    const raw = localStorage.getItem(mfaPendingKey(userId));
    if (!raw) return false;
    if (Date.now() - Number(raw) > MFA_PENDING_TTL_MS) {
      localStorage.removeItem(mfaPendingKey(userId));
      return false;
    }
    return true;
  } catch { return false; }
}

async function authedPost(path, body) {
  let { data: { session } } = await supabase.auth.getSession();

  // getSession() can momentarily come back empty right after a tab wakes up
  // or a token just expired, even though the person is genuinely still
  // signed in — autoRefreshToken just hasn't caught up yet. Try one explicit
  // refresh before giving up, instead of silently sending a headerless
  // request that the server will reject as "Missing bearer token."
  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    session = refreshed?.data?.session ?? null;
  }

  const token = session?.access_token;
  if (!token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

/** { mfaEnabled, role } for the currently signed-in user. */
export function getMfaStatus() {
  return authedPost('/api/mfa/status');
}

// Roles that support the email-OTP 2FA flow. Any other role never sees the
// OTP screen even if mfa_enabled somehow got set on their profile.
const MFA_ELIGIBLE_ROLES = ['library_manager', 'student'];

/**
 * Decides whether the login flow needs to show the OTP screen:
 * only true when mfa_enabled is on, the role is one of MFA_ELIGIBLE_ROLES
 * (library_manager or student, per the app's flow), AND this browser
 * doesn't hold a still-valid trusted-device token for this account.
 */
export async function checkMfaRequired(userId) {
  const status = await getMfaStatus();
  if (!status.mfaEnabled || !MFA_ELIGIBLE_ROLES.includes(status.role)) {
    return { required: false, deviceId: null };
  }
  const token = localStorage.getItem(deviceKey(userId));
  if (token) {
    try {
      const dev = await authedPost('/api/mfa/check-device', { deviceToken: token });
      // deviceId (present when trusted) links this login's session record
      // back to the trusted-device row — see recordSession() below.
      if (dev.trusted) return { required: false, deviceId: dev.deviceId || null };
    } catch {
      // If the check fails for any reason, fall back to asking for OTP —
      // never fail open on a security check.
    }
  }
  return { required: true, deviceId: null };
}

/** purpose: 'login' (default) while signing in — used by the OTP step of the sign-in flow. */
export function sendOtp(purpose = 'login') {
  return authedPost('/api/mfa/send-otp', { purpose });
}

/**
 * Verifies a code. When trustDevice is true and verification succeeds, the
 * returned device token is saved locally so future logins on this browser
 * skip the OTP step (until it expires on the server, 30 days by default).
 */
export async function verifyOtp({ userId, code, purpose = 'login', trustDevice = false }) {
  const result = await authedPost('/api/mfa/verify-otp', { code, purpose, trustDevice });
  if (trustDevice && result.deviceToken && userId) {
    try { localStorage.setItem(deviceKey(userId), result.deviceToken); } catch { /* storage unavailable */ }
  }
  return result;
}

/**
 * Kicks off the "confirm it's you by email" flow for an untrusted device —
 * this is now the DEFAULT second factor at login (the 6-digit code above is
 * kept only as the "try another way" fallback). Sends a "Yes, it's me" /
 * "No, secure my account" link pair to the account's email.
 */
export function sendLoginConfirmation(trustDevice = false) {
  return authedPost('/api/mfa/send-login-confirmation', { trustDevice });
}

/**
 * Polled from the tab that's waiting on the email link. When the link has
 * just been confirmed AND "remember me" was on at send time, the server
 * hands back a fresh trusted-device token here (once) — save it exactly the
 * way verifyOtp() below does.
 */
export async function getLoginConfirmationStatus(userId, requestId) {
  const result = await authedPost('/api/mfa/login-confirmation-status', { requestId });
  if (result.deviceToken && userId) {
    try { localStorage.setItem(deviceKey(userId), result.deviceToken); } catch { /* storage unavailable */ }
  }
  return result;
}

/**
 * Called from the PUBLIC /confirm-login page after someone taps "Yes, it's
 * me" / "No, secure my account" in the email. Deliberately a plain,
 * unauthenticated fetch (not authedPost) — that click may land in a browser
 * that never had a Supabase session for this account at all.
 */
export async function confirmLoginDevice(token, action) {
  const res = await fetch(`${API_BASE}/api/mfa/confirm-login-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

// ----------------------------------------------------------------------------
// Cross-tab "wake up and check now" signal for the login-confirmation flow.
// The tab polling login-confirmation-status (LoginPage) is, by definition,
// the tab the person just switched AWAY from to go tap "Yes, it's me" / "No,
// secure my account" in their inbox — which means the browser throttles its
// setInterval heavily while it sits in the background, so the 3-second poll
// can take a long time to actually fire even though the server already has
// the answer. A localStorage write is delivered to other same-origin tabs as
// a real `storage` event (not a timer), including backgrounded ones, so the
// /confirm-login tab uses it to nudge the waiting tab into re-checking right
// away instead of waiting on its throttled timer. The signal carries no
// status of its own — it only ever triggers an authenticated re-poll — so a
// tab can never be told "confirmed" by anything other than the server.
// ----------------------------------------------------------------------------
const CONFIRM_SIGNAL_KEY = 'librascan_login_confirmation_ping';

/** Call from the public /confirm-login page once the server has answered. */
export function pingLoginConfirmationWaiters() {
  try { localStorage.setItem(CONFIRM_SIGNAL_KEY, String(Date.now())); } catch { /* storage unavailable */ }
}

/** Call from the tab polling login-confirmation-status. Returns an unsubscribe fn. */
export function onLoginConfirmationPing(callback) {
  const handler = (e) => {
    if (e.key === CONFIRM_SIGNAL_KEY) callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/** Turns 2FA ON immediately — plain on/off, no email confirmation step. */
export function enableMfa() {
  return authedPost('/api/mfa/toggle', { enabled: true });
}

/** Turns 2FA OFF immediately — plain on/off, same endpoint as enableMfa(). */
export function disableMfa() {
  return authedPost('/api/mfa/toggle', { enabled: false });
}

/** Forgets this browser as a trusted device (e.g. from a "sign out everywhere" action). */
export function forgetThisDevice(userId) {
  try { localStorage.removeItem(deviceKey(userId)); } catch { /* storage unavailable */ }
}

// ----------------------------------------------------------------------------
// "View Logins" / login management — powers the Security panel's list of
// signed-in devices on both the Library Manager and Student accounts.
// ----------------------------------------------------------------------------

/**
 * Call exactly once per login, right after the app's own finishLogin()/
 * commitUser() — i.e. once any 2FA step has genuinely finished, never on
 * every page load. deviceId (optional) is the mfa_trusted_devices row this
 * browser was just linked to, if any (from checkMfaRequired/verifyOtp/
 * getLoginConfirmationStatus) — passing it is what lets a later "Logout" on
 * this session also drop that device's "skip 2FA" trust.
 */
export function recordSession(deviceId = null) {
  return authedPost('/api/mfa/record-session', { deviceId });
}

/** Every signed-in device for the current account, newest-active first. */
export async function getSessions() {
  const res = await authedPost('/api/mfa/sessions');
  return res.sessions || [];
}

/**
 * Fully signs the given session out — not just removed from the list. The
 * server both kills that device's Supabase Auth session (so it's actually
 * logged out on its next request) and, if that device had been trusted,
 * deletes it from mfa_trusted_devices too.
 */
export function revokeSession(sessionId) {
  return authedPost('/api/mfa/sessions/revoke', { sessionId });
}