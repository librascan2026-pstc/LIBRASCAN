import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { supabaseAdmin } from './lib/supabaseAdmin.js';
import { sendOtpEmail, sendLoginConfirmationEmail } from './lib/mailer.js';
import { locateIp, describeDevice, formatLocation } from './lib/geo.js';
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

  res.json({ revoked: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`[librascan-2fa] listening on http://localhost:${port}`));