// ============================================================================
// LibraScan — email sending via Brevo's HTTPS API (https://api.brevo.com).
//
// WHY NOT SMTP ANYMORE: Railway (and most cloud hosts) block or heavily
// throttle outbound SMTP connections (ports 587/465) to providers like
// Gmail — that's what was causing every send to fail with "Connection
// timeout". Brevo's API runs entirely over normal HTTPS (port 443, the same
// port everything else on the internet uses), so it isn't affected by that
// block at all.
//
// SETUP (one-time):
//   1. Sign up at https://www.brevo.com (free tier: 300 emails/day).
//   2. Senders & IP → Senders → Add a sender → verify librascann2026@gmail.com
//      (just click the confirmation link Brevo emails you — no DNS needed).
//   3. Settings (top right) → SMTP & API → API Keys → Generate a new API key.
//   4. In Railway → Variables, add BREVO_API_KEY = <that key>, and make sure
//      SMTP_FROM is still set to the sender you verified in step 2.
//   5. Redeploy.
// ============================================================================

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sender is read from two DEDICATED variables instead of being parsed out of
 * SMTP_FROM's `"Name <email>"` text — regex-parsing that string turned out
 * to be fragile (a stray quote/backslash from how the value got pasted into
 * Railway silently blanked out the email, which is what caused Brevo's
 * "valid sender email required" error). Set these two plain variables in
 * Railway → Variables:
 *   SENDER_EMAIL = librascann2026@gmail.com   (must exactly match the address
 *                  verified under Brevo → Senders, IP, and Domains)
 *   SENDER_NAME  = LibraScan                   (optional — defaults below)
 */
function getSender() {
  const email = (process.env.SENDER_EMAIL || process.env.SMTP_USER || '').trim();
  const name = (process.env.SENDER_NAME || 'LibraScan').trim();
  if (!email) {
    throw new Error(
      'No sender email configured. Set SENDER_EMAIL in Railway → Variables to the address verified in Brevo (e.g. librascann2026@gmail.com).'
    );
  }
  return { name, email };
}

async function sendViaBrevo({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not set. Add it in Railway → Variables.');
  }

  const sender = getSender();

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body.slice(0, 300)}`);
  }
}

/** Kept for parity with the old mailer.js — nothing to "verify" with an HTTP API. */
export async function verifyMailer() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set. Add it in Railway → Variables.');
  }
}

export async function sendOtpEmail({ to, name, code, purpose }) {
  const heading = purpose === 'enable'
    ? 'Confirm your email to turn on two-factor authentication'
    : 'Your LibraScan sign-in code';

  const html = `
  <div style="font-family:Georgia,serif;max-width:420px;margin:0 auto;padding:28px 26px;background:#FFFCF2;border:1px solid #e7dcc0;border-radius:14px;">
    <p style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8B0000;font-weight:700;margin:0 0 14px;">LibraScan</p>
    <h1 style="font-size:18px;color:#3a2410;margin:0 0 10px;">${heading}</h1>
    <p style="font-size:13.5px;color:#5a4326;line-height:1.6;margin:0 0 18px;">
      Hi ${name || 'there'}, use the code below to continue${purpose === 'enable' ? ' turning on 2FA' : ' signing in'}. It expires in 5 minutes.
    </p>
    <div style="font-size:32px;font-weight:700;letter-spacing:0.28em;color:#8B0000;background:rgba(139,0,0,0.07);border:1px dashed rgba(139,0,0,0.35);border-radius:10px;padding:14px 0;text-align:center;">
      ${code}
    </div>
    <p style="font-size:11.5px;color:#8a7250;line-height:1.6;margin:18px 0 0;">
      Didn't request this? You can safely ignore this email — your account is still secure.
    </p>
  </div>`;

  await sendViaBrevo({
    to,
    subject: `${code} — ${purpose === 'enable' ? 'confirm your email' : 'your LibraScan sign-in code'}`,
    html,
    text: `Your LibraScan code is ${code}. It expires in 5 minutes.`,
  });
}

// ---------------------------------------------------------------------------
// "New sign-in" device confirmation — the default 2FA prompt on an untrusted
// device (the 6-digit code above is kept only as the "try another way"
// fallback). Two big buttons, "Yes, it's me" / "No, secure my account",
// link straight to the public /confirm-login page with the one-time token.
// ---------------------------------------------------------------------------
export async function sendLoginConfirmationEmail({ to, name, confirmUrl, denyUrl, device, location, ip }) {
  const deviceLabel   = device || 'Unknown device';
  const locationLabel = location || 'Unknown location';
  const isMobile      = /iphone|ipad|android|mobile/i.test(deviceLabel);

  const deviceIconSvg = isMobile
    ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#cbd3da" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`
    : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#cbd3da" stroke-width="1.8"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

  const html = `
  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;padding:24px;background:#f0f2f5;">
    <div style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

      <div style="padding:22px 26px 18px;border-bottom:1px solid #eef0f2;">
        <p style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8B0000;font-weight:700;margin:0 0 12px;">LibraScan</p>
        <h1 style="font-size:19px;color:#050505;margin:0 0 8px;">New sign-in to your account</h1>
        <p style="font-size:13.5px;color:#65676b;line-height:1.55;margin:0;">
          Hi ${name || 'there'}, we noticed a sign-in on a device we don't recognize. Please confirm it was you.
        </p>
      </div>

      <!-- Device card — dark, like Facebook/Google's "was this you?" card -->
      <div style="margin:20px 26px 4px;background:#1c1e21;border-radius:12px;padding:18px 20px;display:table;width:calc(100% - 40px);">
        <div style="display:table-cell;vertical-align:middle;width:44px;">
          <div style="width:40px;height:40px;border-radius:8px;background:#3a3b3c;display:table;">
            <div style="display:table-cell;vertical-align:middle;text-align:center;">${deviceIconSvg}</div>
          </div>
        </div>
        <div style="display:table-cell;vertical-align:middle;padding-left:14px;">
          <div style="color:#ffffff;font-size:14.5px;font-weight:600;">${deviceLabel}</div>
          <div style="color:#b0b3b8;font-size:12.5px;margin-top:2px;">📍 ${locationLabel}</div>
          ${ip ? `<div style="color:#8a8d91;font-size:11px;margin-top:2px;">IP address ${ip}</div>` : ''}
        </div>
      </div>

      <p style="font-size:11.5px;color:#8a8d91;line-height:1.6;margin:10px 26px 4px;">
        If other people have access to this device, don't trust it unless you're sure it's yours.
      </p>

      <div style="padding:8px 26px 24px;">
        <a href="${confirmUrl}" style="display:block;text-align:center;background:#2e7d32;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 0;border-radius:8px;margin-top:14px;">Yes, it's me</a>
        <a href="${denyUrl}" style="display:block;text-align:center;background:#f0f2f5;color:#050505;text-decoration:none;font-weight:700;font-size:14px;padding:13px 0;border-radius:8px;margin-top:10px;">No, secure my account</a>
      </div>

      <div style="padding:16px 26px 22px;border-top:1px solid #eef0f2;">
        <p style="font-size:11.5px;color:#8a8d91;line-height:1.6;margin:0;">
          This link expires in 10 minutes. If you choose "No", we'll block that sign-in immediately and remove every device we'd previously trusted on this account.
        </p>
      </div>
    </div>
  </div>`;

  await sendViaBrevo({
    to,
    subject: 'Confirm it\u2019s you — new LibraScan sign-in',
    html,
    text: `Someone just signed in to your LibraScan account from ${deviceLabel} near ${locationLabel}${ip ? ` (IP ${ip})` : ''}.\n\nIf this was you, confirm here: ${confirmUrl}\n\nIf it wasn't you, block it and secure your account here: ${denyUrl}\n\nThis link expires in 10 minutes.`,
  });
}