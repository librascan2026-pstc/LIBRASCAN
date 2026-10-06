import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { supabaseAdmin } from './lib/supabaseAdmin.js';
import { sendOtpEmail, sendLoginConfirmationEmail, sendVerificationEmail, sendPasswordResetEmail } from './lib/mailer.js';
import { locateIp, describeDevice, formatLocation } from './lib/geo.js';
import googleAuthRouter from './routes/googleAuth.js';
import {
  generateOtp, hashOtp, generateDeviceToken, hashDeviceToken, safeEqual,
  // Same random-token + HMAC/SHA-256 helpers, reused for the email
  // "Yes, it's me" / "No, secure my account" confirmation links below —
  // a confirmation token and a trusted-device token are the same shape
  // (one opaque secret, one stored hash), so there's no need for a
  // second implementation.
  generateDeviceToken as generateConfirmToken,
  hashDeviceToken as hashConfirmToken,
} from './lib/otp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// So req.ip is the real visitor IP (not the reverse proxy's) when this is
// deployed behind one — Render, Railway, Vercel, nginx, etc. all set
// X-Forwarded-For. Harmless locally: falls back to the socket address.
app.set('trust proxy', true);
app.use(express.json());

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins }));

// ---------------------------------------------------------------------------
// Standalone "Yes, it's me" / "No, secure my account" confirmation page —
// served directly by THIS server (plain HTML/JS, no React, no bundler), so
// tapping the email link never depends on the frontend SPA's own
// landing-page-vs-app routing decision. It just confirms/denies right there,
// same-origin, the moment it loads. See /api/mfa/send-login-confirmation
// below for where the emailed links point at this route.
// ---------------------------------------------------------------------------
app.get('/confirm-login', (req, res) => {
  try {
    const html = fs
      .readFileSync(path.join(__dirname, 'public', 'confirm-login.html'), 'utf8')
      .split('__FRONTEND_ORIGIN__').join(allowedOrigins[0]);
    res.set('Content-Type', 'text/html').send(html);
  } catch (err) {
    console.error('[confirm-login] failed to serve page:', err.message);
    res.status(500).send('Could not load the confirmation page.');
  }
});

const OTP_TTL_MS       = 5  * 60 * 1000;   // code valid for 5 minutes
const OTP_RESEND_MS    = 45 * 1000;        // min gap between sends
const OTP_MAX_ATTEMPTS = 5;                // wrong-code guesses allowed
const DEVICE_TTL_MS    = 30 * 24 * 60 * 60 * 1000; // "trust this device" for 30 days
const CONFIRM_TTL_MS    = 10 * 60 * 1000;   // "Yes/No" email link valid for 10 minutes
const CONFIRM_RESEND_MS = 45 * 1000;        // min gap between confirmation-email sends

const lastSendAt        = new Map(); // userId -> timestamp, simple in-memory resend throttle (OTP)
const lastConfirmSendAt = new Map(); // userId -> timestamp, same throttle for the confirmation email

// ---------------------------------------------------------------------------
// Auth middleware — every route below requires a valid Supabase session
// (the same access token the frontend already holds after signInWithPassword
// succeeds, i.e. before commitUser()/onLoginSuccess() has even run).
// ---------------------------------------------------------------------------
async function requireUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token.' });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired session.' });

  req.authUser  = data.user;
  req.authToken = token;
  next();
}

// Supabase Auth JWTs carry a "session_id" claim identifying which row in
// auth.sessions this token belongs to. getUser() above already verified the
// token's signature, so it's safe to just read that claim back out of the
// (unverified-here, but already-trusted) payload rather than re-decoding it
// with a JWT library we don't otherwise need.
function sessionIdFromToken(token) {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json).session_id || null;
  } catch {
    return null;
  }
}

async function getProfile(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name, role, mfa_enabled')
    .eq('id', userId)
    .single();
  return data;
}

// ---------------------------------------------------------------------------
// Live "force logout" — the other half of Settings' "View Logins" -> Logout.
// Revoking a session (below) kills that device's REFRESH token, but the
// ACCESS token it's already holding is a self-contained JWT that stays
// valid on its own until it naturally expires (often up to an hour) — so
// without this, a revoked device would keep showing the dashboard for a
// while. This pushes an instant Realtime broadcast on that user's channel;
// every open tab for the account (see AuthContext.jsx) is listening on it
// and signs itself out the moment a matching message arrives. Uses
// Realtime's plain HTTP broadcast endpoint (not a websocket) so it works
// fine from a stateless serverless function too.
// ---------------------------------------------------------------------------
async function broadcastForceLogout(userId, sessionId) {
  try {
    await fetch(`${process.env.SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{
          topic: `force-logout-${userId}`,
          event: 'force-logout',
          payload: { sessionId },
          private: false,
        }],
      }),
    });
  } catch (err) {
    // Best-effort — the session is already revoked server-side either way;
    // worst case the device just has to wait out its access token's natural
    // expiry instead of being kicked immediately.
    console.warn('[mfa] force-logout broadcast failed (non-fatal):', err.message);
  }
}

// ---------------------------------------------------------------------------
// GET/POST /api/mfa/status — is 2FA on for this account, and what's the role?
// ---------------------------------------------------------------------------
app.post('/api/mfa/status', requireUser, async (req, res) => {
  const profile = await getProfile(req.authUser.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  res.json({ mfaEnabled: !!profile.mfa_enabled, role: profile.role });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/toggle { enabled } — plain on/off switch, no proof required
// either way. send-otp/verify-otp with purpose "enable" is no longer part
// of turning 2FA on from Settings; that pair is still used for the actual
// OTP challenge at sign-in (purpose "login") — see the frontend login flow.
// ---------------------------------------------------------------------------
app.post('/api/mfa/toggle', requireUser, async (req, res) => {
  const enabled = req.body?.enabled === true;
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ mfa_enabled: enabled })
    .eq('id', req.authUser.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mfaEnabled: enabled });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/send-otp { purpose?: 'login' | 'enable' }
// ---------------------------------------------------------------------------
app.post('/api/mfa/send-otp', requireUser, async (req, res) => {
  const purpose = req.body?.purpose === 'enable' ? 'enable' : 'login';
  const profile = await getProfile(req.authUser.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });

  if (purpose === 'login' && !profile.mfa_enabled) {
    return res.status(400).json({ error: '2FA is not enabled on this account.' });
  }

  const now = Date.now();
  const last = lastSendAt.get(req.authUser.id) || 0;
  if (now - last < OTP_RESEND_MS) {
    return res.status(429).json({ error: 'Please wait before requesting another code.' });
  }

  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

  // Invalidate any earlier unused codes for this purpose so only the latest one works.
  await supabaseAdmin
    .from('mfa_otp_codes')
    .update({ consumed: true })
    .eq('user_id', req.authUser.id)
    .eq('purpose', purpose)
    .eq('consumed', false);

  const { error: insErr } = await supabaseAdmin.from('mfa_otp_codes').insert({
    user_id: req.authUser.id,
    code_hash: codeHash,
    purpose,
    expires_at: expiresAt,
  });
  if (insErr) return res.status(500).json({ error: insErr.message });

  try {
    await sendOtpEmail({
      to: profile.email || req.authUser.email,
      name: profile.first_name,
      code,
      purpose,
    });
  } catch (mailErr) {
    console.error('[mfa/send-otp] email send failed:', mailErr.message);
    return res.status(502).json({ error: 'Could not send the email. Check the SMTP settings in server/.env.' });
  }

  lastSendAt.set(req.authUser.id, now);
  res.json({ sent: true, expiresInSeconds: OTP_TTL_MS / 1000 });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/verify-otp { code, purpose?, trustDevice? }
// ---------------------------------------------------------------------------
app.post('/api/mfa/verify-otp', requireUser, async (req, res) => {
  const { code, trustDevice } = req.body || {};
  const purpose = req.body?.purpose === 'enable' ? 'enable' : 'login';
  if (!code || String(code).length !== 6) {
    return res.status(400).json({ error: 'Enter the 6-digit code.' });
  }

  const { data: row } = await supabaseAdmin
    .from('mfa_otp_codes')
    .select('*')
    .eq('user_id', req.authUser.id)
    .eq('purpose', purpose)
    .eq('consumed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return res.status(400).json({ error: 'No active code. Request a new one.' });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'That code expired. Request a new one.' });
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
  }

  const isMatch = safeEqual(hashOtp(String(code)), row.code_hash);
  if (!isMatch) {
    await supabaseAdmin.from('mfa_otp_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    return res.status(400).json({ error: 'Incorrect code. Please try again.' });
  }

  await supabaseAdmin.from('mfa_otp_codes').update({ consumed: true }).eq('id', row.id);

  if (purpose === 'enable') {
    await supabaseAdmin.from('profiles').update({ mfa_enabled: true }).eq('id', req.authUser.id);
  }

  let deviceToken = null;
  let deviceId    = null;
  if (trustDevice) {
    deviceToken = generateDeviceToken();
    const { data: deviceRow } = await supabaseAdmin
      .from('mfa_trusted_devices')
      .insert({
        user_id: req.authUser.id,
        token_hash: hashDeviceToken(deviceToken),
        user_agent: req.headers['user-agent'] || null,
        expires_at: new Date(Date.now() + DEVICE_TTL_MS).toISOString(),
      })
      .select('id')
      .single();
    deviceId = deviceRow?.id || null;
  }

  res.json({ verified: true, mfaEnabled: purpose === 'enable' ? true : undefined, deviceToken, deviceId });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/check-device { deviceToken } — lets the login screen skip
// OTP entirely on a device the user previously chose to trust.
// ---------------------------------------------------------------------------
app.post('/api/mfa/check-device', requireUser, async (req, res) => {
  const { deviceToken } = req.body || {};
  if (!deviceToken) return res.json({ trusted: false });

  const { data: row } = await supabaseAdmin
    .from('mfa_trusted_devices')
    .select('id, expires_at')
    .eq('user_id', req.authUser.id)
    .eq('token_hash', hashDeviceToken(deviceToken))
    .maybeSingle();

  const trusted = !!row && new Date(row.expires_at).getTime() > Date.now();
  // deviceId lets the frontend link this sign-in's session record back to
  // the trusted-device row, so "Logout" on that session in Settings can
  // remove both at once (see /api/mfa/sessions/revoke below).
  res.json({ trusted, deviceId: trusted ? row.id : null });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/send-login-confirmation { trustDevice? }
// The default 2FA prompt for an untrusted device: emails a "Yes, it's me" /
// "No, secure my account" link pair instead of a code. Applies to every
// MFA-eligible role the same way (student and library_manager today) —
// nothing here is role-specific.
// ---------------------------------------------------------------------------
app.post('/api/mfa/send-login-confirmation', requireUser, async (req, res) => {
  const profile = await getProfile(req.authUser.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });

  const now = Date.now();
  const last = lastConfirmSendAt.get(req.authUser.id) || 0;
  if (now - last < CONFIRM_RESEND_MS) {
    return res.status(429).json({ error: 'Please wait before requesting another confirmation email.' });
  }

  const trustDevice = req.body?.trustDevice === true;
  const token       = generateConfirmToken();
  const tokenHash   = hashConfirmToken(token);
  const requestId   = crypto.randomUUID();
  const expiresAt   = new Date(now + CONFIRM_TTL_MS).toISOString();

  // Resolved once, up front, so the SAME device/location the email shows is
  // also what the /confirm-login page itself shows — both read it back off
  // this row rather than re-deriving it (and the page's own visitor may be
  // on a completely different network than whoever is signing in).
  const geo = await locateIp(req.ip);
  const deviceLabel = describeDevice(req.headers['user-agent']);

  // Invalidate any earlier pending confirmations for this user so an old
  // email link can't still be acted on once a newer one has been sent.
  await supabaseAdmin
    .from('login_confirmations')
    .update({ status: 'expired' })
    .eq('user_id', req.authUser.id)
    .eq('status', 'pending');

  const { error: insErr } = await supabaseAdmin.from('login_confirmations').insert({
    user_id: req.authUser.id,
    request_id: requestId,
    token_hash: tokenHash,
    trust_requested: trustDevice,
    user_agent: req.headers['user-agent'] || null,
    ip: req.ip,
    device: deviceLabel,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    expires_at: expiresAt,
  });
  if (insErr) return res.status(500).json({ error: insErr.message });

  const base       = `${req.protocol}://${req.get('host')}`; // THIS server's own origin
  const confirmUrl = `${base}/confirm-login?token=${token}&action=yes`;
  const denyUrl    = `${base}/confirm-login?token=${token}&action=no`;

  try {
    await sendLoginConfirmationEmail({
      to: profile.email || req.authUser.email,
      name: profile.first_name,
      confirmUrl,
      denyUrl,
      device: deviceLabel,
      location: geo.label,
      ip: geo.ip,
    });
  } catch (mailErr) {
    console.error('[mfa/send-login-confirmation] email send failed:', mailErr.message);
    return res.status(502).json({ error: 'Could not send the email. Check the SMTP settings in server/.env.' });
  }

  lastConfirmSendAt.set(req.authUser.id, now);
  res.json({ requestId, expiresInSeconds: CONFIRM_TTL_MS / 1000 });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/login-confirmation-status { requestId }
// Polled from the ORIGINAL device/tab while it waits for the email link to
// be tapped. Only ever reads a row by (requestId, req.authUser.id) — the
// requestId is safe to hand back to the browser precisely because it can't
// be used to confirm or deny anything by itself (only the emailed token can).
// ---------------------------------------------------------------------------
app.post('/api/mfa/login-confirmation-status', requireUser, async (req, res) => {
  const { requestId } = req.body || {};
  if (!requestId) return res.status(400).json({ error: 'Missing requestId.' });

  const { data: row } = await supabaseAdmin
    .from('login_confirmations')
    .select('*')
    .eq('request_id', requestId)
    .eq('user_id', req.authUser.id)
    .maybeSingle();

  if (!row) return res.status(404).json({ error: 'Confirmation request not found.' });

  if (row.status === 'pending' && new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('login_confirmations').update({ status: 'expired' }).eq('id', row.id);
    return res.json({ status: 'expired' });
  }

  // Issue the "trust this device" token exactly once, the moment the polling
  // tab first observes a confirmed result — never on the deny path, and
  // never twice for the same confirmation.
  let deviceToken = null;
  let deviceId    = null;
  if (row.status === 'confirmed' && row.trust_requested && !row.device_trusted) {
    deviceToken = generateDeviceToken();
    const { data: deviceRow } = await supabaseAdmin
      .from('mfa_trusted_devices')
      .insert({
        user_id: req.authUser.id,
        token_hash: hashDeviceToken(deviceToken),
        user_agent: req.headers['user-agent'] || null,
        expires_at: new Date(Date.now() + DEVICE_TTL_MS).toISOString(),
      })
      .select('id')
      .single();
    deviceId = deviceRow?.id || null;
    await supabaseAdmin.from('login_confirmations').update({ device_trusted: true }).eq('id', row.id);
  }

  res.json({
    status: row.status,
    deviceToken,
    deviceId,
    device: row.device || null,
    location: formatLocation(row),
  });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/confirm-login-device { token, action: 'yes' | 'no' }
// Hit by the PUBLIC /confirm-login page when someone taps a button in the
// email — deliberately NOT behind requireUser, since that click may well
// happen on a completely different, unauthenticated device/browser than the
// one that's actually waiting to sign in.
// ---------------------------------------------------------------------------
app.post('/api/mfa/confirm-login-device', async (req, res) => {
  const { token, action } = req.body || {};
  if (!token || (action !== 'yes' && action !== 'no')) {
    return res.status(400).json({ error: 'Invalid confirmation link.' });
  }

  const tokenHash = hashConfirmToken(token);
  const { data: row } = await supabaseAdmin
    .from('login_confirmations')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!row) return res.json({ status: 'invalid' });
  if (row.status !== 'pending') {
    // already resolved — link is one-shot
    return res.json({ status: row.status, device: row.device || null, location: formatLocation(row) });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('login_confirmations').update({ status: 'expired' }).eq('id', row.id);
    return res.json({ status: 'expired', device: row.device || null, location: formatLocation(row) });
  }

  const nextStatus = action === 'yes' ? 'confirmed' : 'denied';
  await supabaseAdmin
    .from('login_confirmations')
    .update({ status: nextStatus, resolved_at: new Date().toISOString() })
    .eq('id', row.id);

  // "No, that wasn't me" is a real account-security signal: drop every
  // trusted-device token on file so nothing else can skip straight past the
  // email/OTP check either, on top of the advice shown on the confirm page.
  if (nextStatus === 'denied') {
    await supabaseAdmin.from('mfa_trusted_devices').delete().eq('user_id', row.user_id);
  }

  const profile = await getProfile(row.user_id);
  res.json({
    status: nextStatus,
    firstName: profile?.first_name || null,
    device: row.device || null,
    location: formatLocation(row),
  });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/record-session { deviceId? }
// Called exactly once per login, right after the frontend's finishLogin()
// (i.e. after any 2FA step has genuinely finished) — never on every page
// load. Upserts a row in login_sessions so it shows up in "View Logins".
// deviceId, when present, is the mfa_trusted_devices row this browser was
// just linked to (from verify-otp / login-confirmation-status / a matched
// check-device) — it's what lets Logout also drop the trusted-device entry.
// ---------------------------------------------------------------------------
app.post('/api/mfa/record-session', requireUser, async (req, res) => {
  const sessionId = sessionIdFromToken(req.authToken);
  if (!sessionId) return res.status(400).json({ error: 'Could not identify this session.' });

  const deviceId = req.body?.deviceId || null;
  const geo = await locateIp(req.ip);

  const { error } = await supabaseAdmin
    .from('login_sessions')
    .upsert({
      user_id: req.authUser.id,
      session_id: sessionId,
      device_id: deviceId,
      user_agent: req.headers['user-agent'] || null,
      ip: geo.ip,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    }, { onConflict: 'user_id,session_id' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ recorded: true });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/sessions — list this account's signed-in devices for the
// "View Logins" panel in Settings, newest-active first.
// ---------------------------------------------------------------------------
app.post('/api/mfa/sessions', requireUser, async (req, res) => {
  const currentSessionId = sessionIdFromToken(req.authToken);

  const { data, error } = await supabaseAdmin
    .from('login_sessions')
    .select('id, user_agent, ip, city, region, country, created_at, last_seen_at, session_id')
    .eq('user_id', req.authUser.id)
    .is('revoked_at', null)
    .order('last_seen_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const sessions = (data || []).map(row => ({
    id: row.id,
    device: describeDevice(row.user_agent),
    location: [row.city, row.region, row.country].filter(Boolean).join(', ') || 'Unknown location',
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    current: row.session_id === currentSessionId,
  }));

  res.json({ sessions });
});

// ---------------------------------------------------------------------------
// POST /api/mfa/sessions/revoke { sessionId }
// The "Logout" button next to a device in "View Logins". This does two
// things, both required for the device to actually be logged out rather
// than just hidden from the list:
//   1. Deletes the matching row from Supabase Auth's own auth.sessions table
//      (via the admin_revoke_gotrue_session RPC), which invalidates that
//      device's refresh token immediately — its next request/token refresh
//      fails and it's kicked back to the login screen for real.
//   2. Removes the matching mfa_trusted_devices row, if any, so that device
//      also loses "skip 2FA" trust and can't just log back in unchecked.
// ---------------------------------------------------------------------------
app.post('/api/mfa/sessions/revoke', requireUser, async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId.' });

  const { data: row } = await supabaseAdmin
    .from('login_sessions')
    .select('id, session_id, device_id')
    .eq('id', sessionId)
    .eq('user_id', req.authUser.id)
    .maybeSingle();

  if (!row) return res.status(404).json({ error: 'Session not found.' });

  const { error: rpcErr } = await supabaseAdmin.rpc('admin_revoke_gotrue_session', {
    p_session_id: row.session_id,
  });
  if (rpcErr) return res.status(500).json({ error: rpcErr.message });

  await supabaseAdmin
    .from('login_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', row.id);

  if (row.device_id) {
    await supabaseAdmin.from('mfa_trusted_devices').delete().eq('id', row.device_id);
  }

  // Don't make the person wait on that device's token to expire naturally —
  // tell it right now.
  broadcastForceLogout(req.authUser.id, row.session_id);

  res.json({ revoked: true });
});

// ===========================================================================
// EMAIL VERIFICATION AT SIGN-UP
//
// Flow: the signup form POSTs to /api/auth/signup -> we create the auth user
// as UNCONFIRMED (Supabase sends nothing itself) -> we email a one-time link
// through Brevo -> the link hits GET /verify-email, which marks the user's
// email as confirmed. Until then Supabase refuses password sign-in with
// "Email not confirmed" (requires Auth -> Providers -> Email -> "Confirm
// email" to stay ON in the Supabase dashboard).
// ===========================================================================
const PSU_DOMAIN        = '@pampangastateu.edu.ph';
const VERIFY_TTL_MS     = 24 * 60 * 60 * 1000; // link valid for 24 hours
const VERIFY_RESEND_MS  = 60 * 1000;           // min gap between verification emails

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Creates a fresh verification token for the user and emails it.
 * Returns { sent: true } or { sent: false, throttled: true } when a link was
 * already sent less than VERIFY_RESEND_MS ago. The throttle lives in the DB
 * (not an in-memory Map) so it also works on serverless/Vercel.
 * Throws if the email itself fails to send.
 */
async function issueVerificationEmail(req, { userId, email, name }) {
  const { data: last } = await supabaseAdmin
    .from('email_verifications')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < VERIFY_RESEND_MS) {
    return { sent: false, throttled: true };
  }

  const token = generateConfirmToken();

  // Only the newest link should work.
  await supabaseAdmin
    .from('email_verifications')
    .update({ status: 'expired' })
    .eq('user_id', userId)
    .eq('status', 'pending');

  const { error: insErr } = await supabaseAdmin.from('email_verifications').insert({
    user_id: userId,
    token_hash: hashConfirmToken(token),
    expires_at: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
  });
  if (insErr) throw new Error(insErr.message);

  const base = `${req.protocol}://${req.get('host')}`; // THIS server's own origin
  await sendVerificationEmail({ to: email, name, verifyUrl: `${base}/verify-email?token=${token}` });
  return { sent: true };
}

// POST /api/auth/signup — public. Replaces the browser-side supabase.auth.signUp().
app.post('/api/auth/signup', async (req, res) => {
  const b = req.body || {};
  const email         = String(b.email || '').trim().toLowerCase();
  const password      = String(b.password || '');
  const firstName     = String(b.firstName || '').trim();
  const lastName      = String(b.lastName || '').trim();
  const middleName    = String(b.middleName || '').trim();
  const username      = String(b.username || '').trim();
  const studentNumber = String(b.studentNumber || '').trim();

  // Same rules as the form — never trust the browser alone.
  if (!firstName || !lastName || !username) return res.status(400).json({ error: 'Please fill in all required fields.' });
  if (!/^\d{10,}$/.test(studentNumber))     return res.status(400).json({ error: 'Invalid student number.' });
  if (!email.endsWith(PSU_DOMAIN) || email !== `${studentNumber}${PSU_DOMAIN}`) {
    return res.status(400).json({ error: `Email must be your Student Number followed by ${PSU_DOMAIN}.` });
  }
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must be 8+ characters with an uppercase letter, a lowercase letter and a number.' });
  }

  // Already registered but never verified? Just send a fresh link instead of
  // failing — that person is stuck otherwise.
  const { data: existing } = await supabaseAdmin
    .from('profiles').select('id, first_name').eq('email', email).maybeSingle();
  if (existing) {
    const { data: au } = await supabaseAdmin.auth.admin.getUserById(existing.id);
    if (au?.user && !au.user.email_confirmed_at) {
      try {
        const r = await issueVerificationEmail(req, { userId: existing.id, email, name: existing.first_name });
        return res.json({ needsVerification: true, resent: true, throttled: !!r.throttled });
      } catch (err) {
        console.error('[auth/signup] resend failed:', err.message);
        return res.status(502).json({ error: 'Could not send the confirmation email. Please try again shortly.' });
      }
    }
    return res.status(409).json({ error: 'This email is already registered. Please log in instead.' });
  }

  const { data: taken } = await supabaseAdmin
    .from('profiles').select('id').eq('student_number', studentNumber).maybeSingle();
  if (taken) return res.status(409).json({ error: 'This Student Number is already registered to another account.' });

  // email_confirm:false => created UNCONFIRMED, and Supabase sends no email.
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      first_name: firstName, last_name: lastName, middle_name: middleName,
      username, student_number: studentNumber, role: 'student',
      campus_id: b.campusId || null, college_id: b.collegeId || null,
      program_id: b.programId || null, major_id: b.majorId || null,
    },
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message || 'Could not create the account.';
    const dup = /already|registered|exists/i.test(msg);
    return res.status(dup ? 409 : 500).json({ error: dup ? 'This email is already registered. Please log in instead.' : msg });
  }

  const user = created.user;
  const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
    id: user.id,
    first_name: firstName, last_name: lastName, middle_name: middleName,
    username, email, student_number: studentNumber,
    campus_id: b.campusId || null, college_id: b.collegeId || null,
    program_id: b.programId || null, major_id: b.majorId || null,
    role: 'student',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (profileErr) console.error('[auth/signup] profiles upsert error:', profileErr.message);

  try {
    await issueVerificationEmail(req, { userId: user.id, email, name: firstName });
  } catch (err) {
    // Account exists; the person can hit "Resend" on the next screen.
    console.error('[auth/signup] verification email failed:', err.message);
    return res.status(201).json({ needsVerification: true, emailSent: false });
  }
  res.status(201).json({ needsVerification: true, emailSent: true });
});

// POST /api/auth/resend-verification { email } — public. Always answers the
// same way whether or not the address exists, so it can't be used to probe
// which emails are registered.
app.post('/api/auth/resend-verification', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Missing email.' });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id, first_name').eq('email', email).maybeSingle();
  if (profile) {
    const { data: au } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (au?.user && !au.user.email_confirmed_at) {
      try {
        const r = await issueVerificationEmail(req, { userId: profile.id, email, name: profile.first_name });
        if (r.throttled) return res.status(429).json({ error: 'Please wait a minute before requesting another email.' });
      } catch (err) {
        console.error('[auth/resend-verification] failed:', err.message);
        return res.status(502).json({ error: 'Could not send the email. Please try again shortly.' });
      }
    }
  }
  res.json({ sent: true });
});


// ===========================================================================
// FORGOT PASSWORD — 6-digit code emailed through Brevo (not Supabase).
//
//   1. POST /api/auth/forgot-password   { email }                -> emails a code
//   2. POST /api/auth/verify-reset-code { email, code }          -> { resetToken }
//   3. POST /api/auth/reset-password    { email, resetToken, password }
//
// Needs the `password_reset_codes` table (see password_reset_codes.sql).
// Nothing here creates a Supabase session — the browser never gets signed in
// by the reset flow; the password is changed server-side with the service key.
// ===========================================================================
const RESET_CODE_TTL_MS   = 10 * 60 * 1000; // code valid for 10 minutes
const RESET_TOKEN_TTL_MS  = 10 * 60 * 1000; // after the code is accepted, 10 min to set the password
const RESET_RESEND_MS     = 60 * 1000;      // min gap between codes (stored in DB -> works on Vercel)
const RESET_MAX_ATTEMPTS  = 5;

const passwordOk = (pw) =>
  typeof pw === 'string' && pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw);

// Looks up a CONFIRMED account by email. Returns { id, first_name, email } or null.
async function findResettableUser(email) {
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id, first_name, email').eq('email', email).maybeSingle();
  if (!profile) return null;
  const { data: au } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (!au?.user || !au.user.email_confirmed_at) return null;
  return profile;
}

// POST /api/auth/forgot-password { email } — public. Always answers
// { sent: true } so it can't be used to probe which emails are registered.
app.post('/api/auth/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Missing email.' });

  const user = await findResettableUser(email);
  if (!user) return res.json({ sent: true });

  const { data: last } = await supabaseAdmin
    .from('password_reset_codes').select('created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < RESET_RESEND_MS) {
    return res.json({ sent: true }); // throttled: stay silent, same answer as success
  }

  const code = generateOtp();

  // Only the newest code should work.
  await supabaseAdmin.from('password_reset_codes')
    .update({ consumed: true }).eq('user_id', user.id).eq('consumed', false);

  const { error: insErr } = await supabaseAdmin.from('password_reset_codes').insert({
    user_id: user.id,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + RESET_CODE_TTL_MS).toISOString(),
  });
  if (insErr) {
    console.error('[auth/forgot-password] insert failed:', insErr.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }

  try {
    await sendPasswordResetEmail({ to: user.email || email, name: user.first_name, code });
  } catch (err) {
    console.error('[auth/forgot-password] email failed:', err.message);
    return res.status(502).json({ error: 'Could not send the email. Please try again shortly.' });
  }
  res.json({ sent: true });
});

// POST /api/auth/verify-reset-code { email, code } — public.
app.post('/api/auth/verify-reset-code', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code  = String(req.body?.code || '').trim();
  const bad   = () => res.status(400).json({ error: 'Invalid or expired code. Please try again or request a new one.' });
  if (!email || !/^\d{6}$/.test(code)) return bad();

  const user = await findResettableUser(email);
  if (!user) return bad();

  const { data: row } = await supabaseAdmin
    .from('password_reset_codes').select('*')
    .eq('user_id', user.id).eq('consumed', false)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return bad();
  if (row.attempts >= RESET_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (!safeEqual(hashOtp(code), row.code_hash)) {
    await supabaseAdmin.from('password_reset_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    return bad();
  }

  // Code accepted: burn it and hand back a one-time token for step 3.
  const resetToken = generateConfirmToken();
  await supabaseAdmin.from('password_reset_codes').update({
    consumed: true,
    reset_token_hash: hashConfirmToken(resetToken),
    reset_token_expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
  }).eq('id', row.id);

  res.json({ verified: true, resetToken });
});

// POST /api/auth/reset-password { email, resetToken, password } — public, but
// only works with the one-time token issued by verify-reset-code.
app.post('/api/auth/reset-password', async (req, res) => {
  const email      = String(req.body?.email || '').trim().toLowerCase();
  const resetToken = String(req.body?.resetToken || '');
  const password   = String(req.body?.password || '');
  const expired    = () => res.status(400).json({ error: 'Your reset session expired. Please go back and request a new code.' });

  if (!passwordOk(password)) {
    return res.status(400).json({ error: 'Password must be 8+ characters with an uppercase letter, a lowercase letter and a number.' });
  }
  if (!email || !resetToken) return expired();

  const user = await findResettableUser(email);
  if (!user) return expired();

  const { data: row } = await supabaseAdmin
    .from('password_reset_codes').select('*')
    .eq('user_id', user.id).eq('reset_token_hash', hashConfirmToken(resetToken)).maybeSingle();
  if (!row || !row.reset_token_expires_at || new Date(row.reset_token_expires_at).getTime() < Date.now()) return expired();

  const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (pwErr) {
    console.error('[auth/reset-password] update failed:', pwErr.message);
    return res.status(500).json({ error: pwErr.message || 'Could not update the password.' });
  }

  // Single use.
  await supabaseAdmin.from('password_reset_codes').update({ reset_token_hash: null }).eq('id', row.id);
  res.json({ ok: true });
});

// Small self-contained result page for the emailed link (no bundler needed).
function verifyPage({ tone, title, body, href, label }) {
  const color = tone === 'ok' ? '#2E8B57' : '#9A5B00';
  const bg    = tone === 'ok' ? '#E1F0E4' : '#FFF0D6';
  const icon  = tone === 'ok' ? '&#10003;' : '!';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LibraScan \u2014 Email Verification</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:linear-gradient(160deg,#FFFCF5,#F7EEDD);font-family:Inter,system-ui,Arial,sans-serif;color:#4A1A1E}
.c{width:100%;max-width:460px;background:linear-gradient(180deg,#FFFDF8,#FBF5EA);border:1px solid #EADFC8;border-radius:28px;box-shadow:0 18px 50px rgba(90,40,20,.14);overflow:hidden}
.h{padding:24px 30px;background:linear-gradient(120deg,#7E1C26,#561017);border-bottom:2px solid #C9A84C;font:600 15px 'Playfair Display',Georgia,serif;letter-spacing:.24em;color:#F3E6CF}
.b{padding:30px;text-align:center}.i{width:84px;height:84px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${bg};color:${color};font-size:40px;font-weight:700}
h1{font:600 28px/1.2 'Playfair Display',Georgia,serif;margin:0 0 12px}p{font-size:15.5px;line-height:1.6;color:#6B6460;margin:0}
a.btn{display:block;margin-top:24px;padding:16px;border-radius:14px;background:linear-gradient(180deg,#8A1E28,#651119);color:#fff;font-weight:600;text-decoration:none}
.f{margin-top:24px;font-size:12px;color:#8C837C}</style></head><body><main class="c"><div class="h">LIBRASCAN</div><div class="b">
<div class="i">${icon}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p>
${href ? `<a class="btn" href="${escapeHtml(href)}">${escapeHtml(label)}</a>` : ''}
<p class="f">Part of LibraScan\u2019s account security. We will never ask for your password here.</p></div></main></body></html>`;
}

// GET /verify-email?token=... — the link inside the confirmation email.
app.get('/verify-email', async (req, res) => {
  const loginUrl = `${allowedOrigins[0]}/login`;
  const token = String(req.query.token || '');
  res.set('Content-Type', 'text/html');
  res.set('Cache-Control', 'no-store');

  if (!token) return res.status(400).send(verifyPage({ tone: 'warn', title: 'Link not valid', body: 'This confirmation link is missing its token.', href: loginUrl, label: 'Back to login' }));

  const { data: row } = await supabaseAdmin
    .from('email_verifications').select('*').eq('token_hash', hashConfirmToken(token)).maybeSingle();

  if (!row) return res.status(400).send(verifyPage({ tone: 'warn', title: 'Link not valid', body: 'We couldn\u2019t match this link to an account. It may have been replaced by a newer email.', href: loginUrl, label: 'Back to login' }));

  // Clicking twice (or an email scanner pre-opening the link) is harmless.
  if (row.status === 'verified') {
    return res.send(verifyPage({ tone: 'ok', title: 'Email already confirmed', body: 'Your account is active. You can log in now.', href: loginUrl, label: 'Go to login' }));
  }
  if (row.status !== 'pending' || new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('email_verifications').update({ status: 'expired' }).eq('id', row.id).eq('status', 'pending');
    return res.status(410).send(verifyPage({ tone: 'warn', title: 'This link has expired', body: 'Register again with the same Student Number and we will send you a fresh confirmation email.', href: loginUrl, label: 'Back to login' }));
  }

  const { error: confirmErr } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, { email_confirm: true });
  if (confirmErr) {
    console.error('[verify-email] confirm failed:', confirmErr.message);
    return res.status(500).send(verifyPage({ tone: 'warn', title: 'Something went wrong', body: 'We couldn\u2019t confirm your email right now. Please try the link again in a moment.', href: loginUrl, label: 'Back to login' }));
  }
  await supabaseAdmin.from('email_verifications')
    .update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', row.id);

  res.send(verifyPage({ tone: 'ok', title: 'Email confirmed!', body: 'Thanks \u2014 your LibraScan account is now active. You can log in.', href: loginUrl, label: 'Go to login' }));
});

// Google sign-in: server-side domain check, first-login detection, profile setup.
app.use('/api/auth/google', googleAuthRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// NOTE ON SERVERLESS STATELESSNESS — the two in-memory throttle maps below
// (lastSendAt, lastConfirmSendAt) work fine here on a traditional server,
// but on Vercel each request may hit a fresh, isolated function instance —
// there's no guarantee they share memory between calls the way they did on
// Railway. In practice this only weakens the "wait 45s before resending" 
// anti-spam check (it may occasionally allow an early resend); it does NOT
// break login, OTP verification, or email sending. Fine for now — if this
// becomes a real problem later, move that throttle into a Supabase table
// (a timestamp column checked/updated per request) instead of the Map.

export default app;