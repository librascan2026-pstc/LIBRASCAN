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

  // Same public logo URL logic as the login-confirmation email.
  const logoBase = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const logoUrl  = process.env.EMAIL_LOGO_URL || (logoBase ? `${logoBase}/LibraryLogo.png` : '');
  const glyph = (c) => `<span style="font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">${c}&#xFE0E;</span>`;

  const html = `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your LibraScan code is ${escHtml(code)}. It expires in 5 minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:100%;max-width:480px;background:#FFFFFF;border:1px solid #EADFC8;border-radius:26px;overflow:hidden;">
        <tr><td bgcolor="#6E1620" style="background:#6E1620;padding:26px 30px;border-bottom:2px solid #C9A84C;">
          ${logoUrl ? `<img src="${logoUrl}" height="32" alt="" style="height:32px;width:auto;border:0;vertical-align:middle;" />` : ''}
          <span style="color:#C9A84C;font-size:24px;vertical-align:middle;padding:0 10px;">|</span>
          <span style="font:600 15px Georgia,serif;letter-spacing:0.24em;color:#F3E6CF;vertical-align:middle;">LIBRASCAN</span>
        </td></tr>
        <tr><td align="center" style="padding:28px 30px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="80" height="80" align="center" bgcolor="#F3E1DC" style="width:80px;height:80px;background:#F3E1DC;border-radius:40px;font-size:32px;line-height:80px;font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">&#128274;&#xFE0E;</td></tr></table>
          <h1 style="margin:16px 0 10px;font:600 ${purpose === 'enable' ? '24' : '28'}px Georgia,serif;color:#4A1A1E;">${heading}</h1>
          <p style="margin:0;font:400 15px/1.6 Arial,sans-serif;color:#6B6460;">Hi ${escHtml(name) || 'there'}, use the code below to continue${purpose === 'enable' ? ' turning on 2FA' : ' signing in'}.</p>
        </td></tr>
        <tr><td style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #7A1A24;border-radius:16px;">
            <tr><td align="center" style="padding:20px 0 20px 10px;font:700 36px Georgia,serif;letter-spacing:0.3em;color:#7A1A24;">${escHtml(code)}</td></tr>
          </table>
          <p style="margin:12px 0 0;text-align:center;font:400 13px Arial,sans-serif;color:#7A726C;">${glyph('&#128339;')}&nbsp; Expires in 5 minutes</p>
        </td></tr>
        <tr><td style="padding:22px 30px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" width="30">${glyph('&#128737;')}</td>
            <td style="font:400 12.5px/1.6 Arial,sans-serif;color:#8C837C;">Didn&rsquo;t request this? You can safely ignore this email, your account is still secure. Never share this code with anyone.</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

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

const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function sendLoginConfirmationEmail({ to, name, confirmUrl, denyUrl, device, location, ip, time }) {
  const deviceLabel   = device || 'Unknown device';
  const locationLabel = location || 'Unknown location';
  // Logo must be a PUBLIC https URL (email apps can't load localhost/file paths).
  // Set EMAIL_LOGO_URL, or FRONTEND_ORIGIN to your deployed site (serves /LibraryLogo.png).
  const logoBase = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const logoUrl  = process.env.EMAIL_LOGO_URL || (logoBase ? `${logoBase}/LibraryLogo.png` : '');
  const when = time || new Date().toLocaleString('en-US', {
    timeZone: process.env.MAIL_TIMEZONE || 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  });

  // Email-safe: tables + inline styles only (Gmail/Outlook strip SVG, flex
  // and most modern CSS). Icons are monochrome text glyphs (\uFE0E forces
  // text style instead of colour emoji).
  const G = (code) => `<span style="font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;font-size:16px;">${code}&#xFE0E;</span>`;
  const row = (icon, label, value, last) =>
    `<tr><td width="34" style="padding:13px 0;${last ? '' : 'border-bottom:1px solid #7A1A24;'}">${G(icon)}</td>` +
    `<td width="96" style="padding:13px 0;${last ? '' : 'border-bottom:1px solid #7A1A24;'}font:400 14.5px Arial,sans-serif;color:#7A726C;">${label}</td>` +
    `<td style="padding:13px 0;${last ? '' : 'border-bottom:1px solid #7A1A24;'}font:700 14.5px Arial,sans-serif;color:#2E2321;">${value}</td></tr>`;

  const html = `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Was this you? Confirm your LibraScan sign-in. This link expires in 10 minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:100%;max-width:480px;background:#FFFFFF;border:1px solid #EADFC8;border-radius:26px;overflow:hidden;">
        <tr><td bgcolor="#6E1620" style="background:#6E1620;padding:26px 30px;border-bottom:2px solid #C9A84C;">
          ${logoUrl ? `<img src="${logoUrl}" height="32" alt="" style="height:32px;width:auto;border:0;vertical-align:middle;" />` : ''}
          <span style="color:#C9A84C;font-size:24px;vertical-align:middle;padding:0 10px;">|</span>
          <span style="font:600 15px Georgia,serif;letter-spacing:0.24em;color:#F3E6CF;vertical-align:middle;">LIBRASCAN</span>
        </td></tr>
        <tr><td align="center" style="padding:28px 30px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="80" height="80" align="center" bgcolor="#F3E1DC" style="width:80px;height:80px;background:#F3E1DC;border-radius:40px;font-size:32px;line-height:80px;font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">&#128187;&#xFE0E;</td></tr></table>
          <h1 style="margin:16px 0 10px;font:600 28px Georgia,serif;color:#4A1A1E;">Was this you signing in?</h1>
          <p style="margin:0;font:400 15px/1.6 Arial,sans-serif;color:#6B6460;">Hi ${escHtml(name) || 'there'}, we noticed a sign-in from a device we don&rsquo;t recognize. Please confirm it&rsquo;s you.</p>
        </td></tr>
        <tr><td style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #7A1A24;border-radius:16px;">
            <tr><td style="padding:2px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row('&#128187;', 'Device', escHtml(deviceLabel))}
              ${row('&#128205;', 'Location', escHtml(locationLabel))}
              ${row('&#128339;', 'Time', escHtml(when), !ip)}
              ${ip ? row('&#127760;', 'IP address', escHtml(ip), true) : ''}
            </table></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" bgcolor="#7A1A24" style="background:#7A1A24;border-radius:14px;">
              <a href="${confirmUrl}" style="display:block;padding:17px 0;font:600 16px Arial,sans-serif;color:#ffffff;text-decoration:none;">Yes, it&rsquo;s me &nbsp;&rarr;</a>
            </td></tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
            <td align="center" style="border:1.5px solid #7A1A24;border-radius:14px;">
              <a href="${denyUrl}" style="display:block;padding:15px 0;font:600 15px Arial,sans-serif;color:#7A1A24;text-decoration:none;">No, secure my account</a>
            </td></tr></table>
        </td></tr>
        <tr><td style="padding:22px 30px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" width="30">${G('&#128737;')}</td>
            <td style="font:400 12.5px/1.6 Arial,sans-serif;color:#8C837C;">This link expires in 10 minutes. If you choose &ldquo;No,&rdquo; we&rsquo;ll block that sign-in and remove every device we previously trusted on this account. Never share this email with anyone.</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

  await sendViaBrevo({
    to,
    subject: 'Confirm it\u2019s you \u2014 new LibraScan sign-in',
    html,
    text: `Someone just signed in to your LibraScan account.\n\nDevice: ${deviceLabel}\nLocation: ${locationLabel}\nTime: ${when}${ip ? `\nIP: ${ip}` : ''}\n\nIf this was you, confirm here: ${confirmUrl}\n\nIf it wasn't you, block it and secure your account: ${denyUrl}\n\nThis link expires in 10 minutes.`,
  });
}

// ---------------------------------------------------------------------------
// "Confirm your email" — sent right after registering. One big button that
// links to this server's public GET /verify-email?token=... route.
// ---------------------------------------------------------------------------
export async function sendVerificationEmail({ to, name, verifyUrl }) {
  const logoBase = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
  const logoUrl  = process.env.EMAIL_LOGO_URL || (logoBase ? `${logoBase}/LibraryLogo.png` : '');
  const G = (c) => `<span style="font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">${c}&#xFE0E;</span>`;

  const html = `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirm your email to activate your LibraScan account. This link expires in 24 hours.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:100%;max-width:480px;background:#FFFFFF;border:1px solid #EADFC8;border-radius:26px;overflow:hidden;">
        <tr><td bgcolor="#6E1620" style="background:#6E1620;padding:26px 30px;border-bottom:2px solid #C9A84C;">
          ${logoUrl ? `<img src="${logoUrl}" height="32" alt="" style="height:32px;width:auto;border:0;vertical-align:middle;" />` : ''}
          <span style="color:#C9A84C;font-size:24px;vertical-align:middle;padding:0 10px;">|</span>
          <span style="font:600 15px Georgia,serif;letter-spacing:0.24em;color:#F3E6CF;vertical-align:middle;">LIBRASCAN</span>
        </td></tr>
        <tr><td align="center" style="padding:28px 30px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="80" height="80" align="center" bgcolor="#F3E1DC" style="width:80px;height:80px;background:#F3E1DC;border-radius:40px;font-size:32px;line-height:80px;font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">&#9993;&#xFE0E;</td></tr></table>
          <h1 style="margin:16px 0 10px;font:600 28px Georgia,serif;color:#4A1A1E;">Confirm your email</h1>
          <p style="margin:0;font:400 15px/1.6 Arial,sans-serif;color:#6B6460;">Hi ${escHtml(name) || 'there'}, welcome to LibraScan! Tap the button below to verify this email address and activate your account.</p>
        </td></tr>
        <tr><td style="padding:24px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" bgcolor="#7A1A24" style="background:#7A1A24;border-radius:14px;">
              <a href="${verifyUrl}" style="display:block;padding:17px 0;font:600 16px Arial,sans-serif;color:#ffffff;text-decoration:none;">Confirm my email &nbsp;&rarr;</a>
            </td></tr></table>
          <p style="margin:14px 0 0;text-align:center;font:400 13px Arial,sans-serif;color:#7A726C;">${G('&#128339;')}&nbsp; This link expires in 24 hours</p>
        </td></tr>
        <tr><td style="padding:22px 30px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" width="30">${G('&#128737;')}</td>
            <td style="font:400 12.5px/1.6 Arial,sans-serif;color:#8C837C;">Didn&rsquo;t create a LibraScan account? You can safely ignore this email &mdash; nothing will happen unless the button is pressed.</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

  await sendViaBrevo({
    to,
    subject: 'Confirm your email \u2014 LibraScan',
    html,
    text: `Welcome to LibraScan!\n\nConfirm your email to activate your account: ${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create an account, ignore this email.`,
  });
}

// ---------------------------------------------------------------------------
// Forgot-password code — emailed through Brevo (replaces Supabase's own
// "recovery" email). Same look as the sign-in code email.
// ---------------------------------------------------------------------------
export async function sendPasswordResetEmail({ to, name, code }) {
  const logoBase = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
  const logoUrl  = process.env.EMAIL_LOGO_URL || (logoBase ? `${logoBase}/LibraryLogo.png` : '');
  const glyph = (c) => `<span style="font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">${c}&#xFE0E;</span>`;

  const html = `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your LibraScan password reset code is ${escHtml(code)}. It expires in 10 minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:100%;max-width:480px;background:#FFFFFF;border:1px solid #EADFC8;border-radius:26px;overflow:hidden;">
        <tr><td bgcolor="#6E1620" style="background:#6E1620;padding:26px 30px;border-bottom:2px solid #C9A84C;">
          ${logoUrl ? `<img src="${logoUrl}" height="32" alt="" style="height:32px;width:auto;border:0;vertical-align:middle;" />` : ''}
          <span style="color:#C9A84C;font-size:24px;vertical-align:middle;padding:0 10px;">|</span>
          <span style="font:600 15px Georgia,serif;letter-spacing:0.24em;color:#F3E6CF;vertical-align:middle;">LIBRASCAN</span>
        </td></tr>
        <tr><td align="center" style="padding:28px 30px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="80" height="80" align="center" bgcolor="#F3E1DC" style="width:80px;height:80px;background:#F3E1DC;border-radius:40px;font-size:32px;line-height:80px;font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">&#128273;&#xFE0E;</td></tr></table>
          <h1 style="margin:16px 0 10px;font:600 28px Georgia,serif;color:#4A1A1E;">Reset your password</h1>
          <p style="margin:0;font:400 15px/1.6 Arial,sans-serif;color:#6B6460;">Hi ${escHtml(name) || 'there'}, enter the code below on the LibraScan reset page to choose a new password.</p>
        </td></tr>
        <tr><td style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #7A1A24;border-radius:16px;">
            <tr><td align="center" style="padding:20px 0 20px 10px;font:700 36px Georgia,serif;letter-spacing:0.3em;color:#7A1A24;">${escHtml(code)}</td></tr>
          </table>
          <p style="margin:12px 0 0;text-align:center;font:400 13px Arial,sans-serif;color:#7A726C;">${glyph('&#128339;')}&nbsp; Expires in 10 minutes</p>
        </td></tr>
        <tr><td style="padding:22px 30px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" width="30">${glyph('&#128737;')}</td>
            <td style="font:400 12.5px/1.6 Arial,sans-serif;color:#8C837C;">Didn&rsquo;t ask to reset your password? You can safely ignore this email &mdash; your password won&rsquo;t change. Never share this code with anyone.</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

  await sendViaBrevo({
    to,
    subject: `${code} \u2014 your LibraScan password reset code`,
    html,
    text: `Your LibraScan password reset code is ${code}. It expires in 10 minutes. If you didn't ask for this, ignore this email.`,
  });
}

// ---------------------------------------------------------------------------
// Due-date reminder / due-today / overdue notice for a borrowed book.
// stage: 'reminder' (3 days or fewer left) | 'due_today' | 'overdue'
// Same look as the other LibraScan emails; wording matches the in-app
// notifications in StudentDashboard.jsx.
// ---------------------------------------------------------------------------
export async function sendDueDateReminderEmail({ to, name, bookTitle, dueDateLabel, daysLeft, stage }) {
  const logoBase = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
  const logoUrl  = process.env.EMAIL_LOGO_URL || (logoBase ? `${logoBase}/LibraryLogo.png` : '');
  const glyph = (c) => `<span style="font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">${c}&#xFE0E;</span>`;

  const title = String(bookTitle || 'A borrowed book').replace(/[\r\n]+/g, ' ').trim();
  const when  = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;

  let heading, intro, icon, iconBg, badge, subject, preheader, text;
  if (stage === 'overdue') {
    heading   = 'Your book is overdue';
    intro     = `&ldquo;${escHtml(title)}&rdquo; was due on ${escHtml(dueDateLabel)} and is now overdue. Please return it to the library as soon as possible.`;
    icon      = '&#9888;'; iconBg = '#FBEAEA'; badge = 'Overdue since ' + escHtml(dueDateLabel);
    subject   = `Overdue: "${title}" \u2014 LibraScan`;
    preheader = `"${title}" was due on ${dueDateLabel} and is now overdue.`;
    text      = `Hi ${name || 'there'}, "${title}" was due on ${dueDateLabel} and is now overdue. Please return it to the library as soon as possible.`;
  } else if (stage === 'due_today') {
    heading   = 'Your book is due today';
    intro     = `&ldquo;${escHtml(title)}&rdquo; is due today (${escHtml(dueDateLabel)}). Please return it to the library on time.`;
    icon      = '&#128339;'; iconBg = '#FFF0D6'; badge = 'Due today &middot; ' + escHtml(dueDateLabel);
    subject   = `Due today: "${title}" \u2014 LibraScan`;
    preheader = `"${title}" is due today (${dueDateLabel}).`;
    text      = `Hi ${name || 'there'}, "${title}" is due today (${dueDateLabel}). Please return it to the library on time.`;
  } else {
    heading   = daysLeft === 1 ? 'Your book is due tomorrow' : `Your book is due in ${daysLeft} days`;
    intro     = `&ldquo;${escHtml(title)}&rdquo; is due ${when} (${escHtml(dueDateLabel)}). Please return it to the library on time.`;
    icon      = '&#128214;'; iconBg = '#F3E1DC'; badge = 'Due ' + escHtml(dueDateLabel);
    subject   = `Due ${when}: "${title}" \u2014 LibraScan`;
    preheader = `"${title}" is due ${when} (${dueDateLabel}).`;
    text      = `Hi ${name || 'there'}, "${title}" is due ${when} (${dueDateLabel}). Please return it to the library on time.`;
  }

  const html = `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:100%;max-width:480px;background:#FFFFFF;border:1px solid #EADFC8;border-radius:26px;overflow:hidden;">
        <tr><td bgcolor="#6E1620" style="background:#6E1620;padding:26px 30px;border-bottom:2px solid #C9A84C;">
          ${logoUrl ? `<img src="${logoUrl}" height="32" alt="" style="height:32px;width:auto;border:0;vertical-align:middle;" />` : ''}
          <span style="color:#C9A84C;font-size:24px;vertical-align:middle;padding:0 10px;">|</span>
          <span style="font:600 15px Georgia,serif;letter-spacing:0.24em;color:#F3E6CF;vertical-align:middle;">LIBRASCAN</span>
        </td></tr>
        <tr><td align="center" style="padding:28px 30px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="80" height="80" align="center" bgcolor="${iconBg}" style="width:80px;height:80px;background:${iconBg};border-radius:40px;font-size:32px;line-height:80px;font-family:'Segoe UI Symbol',Arial,sans-serif;color:#7A1A24;">${icon}&#xFE0E;</td></tr></table>
          <h1 style="margin:16px 0 10px;font:600 26px Georgia,serif;color:#4A1A1E;">${heading}</h1>
          <p style="margin:0;font:400 15px/1.6 Arial,sans-serif;color:#6B6460;">Hi ${escHtml(name) || 'there'}, ${intro}</p>
        </td></tr>
        <tr><td style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #7A1A24;border-radius:16px;">
            <tr><td align="center" style="padding:18px 16px 4px;font:700 20px Georgia,serif;color:#7A1A24;">${escHtml(title)}</td></tr>
            <tr><td align="center" style="padding:0 16px 18px;font:400 13px Arial,sans-serif;color:#7A726C;">${glyph('&#128339;')}&nbsp; ${badge}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 30px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" width="30">${glyph('&#128214;')}</td>
            <td style="font:400 12.5px/1.6 Arial,sans-serif;color:#8C837C;">Already returned this book? You can safely ignore this email. You can also check your borrowed books anytime in your LibraScan dashboard.</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

  await sendViaBrevo({ to, subject, html, text });
}