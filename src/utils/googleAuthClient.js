// src/utils/googleAuthClient.js
// Thin client for the server-side Google validation (server/routes/googleAuth.js).
// Same API_BASE convention as LoginPage / SignupPage.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function call(path, accessToken, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/auth/google${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    const e = new Error('Could not reach the server. Please check your connection and try again.');
    e.code = 'NETWORK';
    throw e;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(json.error || 'Google sign-in failed. Please try again.');
    e.code = json.code || 'ERROR';
    e.status = res.status;
    throw e;
  }
  return json;
}

// -> { status: 'existing', role } | { status: 'needs_profile', accountType, prefill }
export const checkGoogleAccount = (accessToken) => call('/status', accessToken);

// -> { status: 'existing', role }
export const completeGoogleProfile = (accessToken, payload) =>
  call('/complete-profile', accessToken, { method: 'POST', body: JSON.stringify(payload) });