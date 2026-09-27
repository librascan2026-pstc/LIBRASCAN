import { useState } from 'react';
import { confirmLoginDevice, pingLoginConfirmationWaiters } from '../utils/mfaClient';

// ============================================================================
// LIBRASCAN — public "Yes, it's me" / "No, secure my account" landing page.
// This is what the two buttons in the login-confirmation email point at:
//   /confirm-login?token=...&action=yes
//   /confirm-login?token=...&action=no
// Mount it at that public route (no auth guard) — the person may well be
// reading their email on a different device from the one that's actually
// waiting to sign in, so this page never assumes a Supabase session exists.
//
// IMPORTANT — this page must NEVER call confirmLoginDevice() automatically
// on load. These links are plain GETs sitting inside an email, and mail
// providers / corporate mail-security gateways (Outlook Safe Links, Gmail's
// link-scanning, antivirus proxies, chat-app link previews, etc.) routinely
// "visit" every link in an email to scan it — before the person ever opens
// or clicks anything. If loading this page fired the confirm/deny request
// by itself, one of those automated visits would silently approve (or deny)
// a sign-in the person never actually looked at. So the token/action are
// only ever used once a real person taps a button below — a scanner loads
// pages, it doesn't click buttons.
// ============================================================================

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY    = "'Crimson Pro', Georgia, serif";

function Card({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#FFFCF2,#f6ecd6)', padding: 20,
    }}>
      <div style={{
        maxWidth: 440, width: '100%', background: '#fff', borderRadius: 18,
        border: '1px solid rgba(139,0,0,0.14)', boxShadow: '0 12px 40px rgba(0,0,0,0.10)',
        padding: '36px 32px', textAlign: 'center',
      }}>
        <p style={{
          fontFamily: FONT_BODY, fontSize: 11, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: '#8B0000', fontWeight: 700, margin: '0 0 18px',
        }}>
          LibraScan
        </p>
        {children}
      </div>
    </div>
  );
}

function H({ children }) {
  return <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 21, color: '#3a2410', margin: '0 0 10px' }}>{children}</h1>;
}
function P({ children, style = {} }) {
  return (
    <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: '#5a4326', lineHeight: 1.65, margin: '0 0 6px', ...style }}>
      {children}
    </p>
  );
}
function Btn({ children, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: 18, padding: '11px 22px', borderRadius: 22, border: 'none', cursor: 'pointer',
        fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700,
        background: primary ? 'linear-gradient(135deg,#8B0000,#6B0000)' : 'rgba(139,0,0,0.08)',
        color: primary ? '#F5E4A8' : '#8B0000',
      }}
    >
      {children}
    </button>
  );
}

/**
 * onGoForgot / onGoLogin: optional callbacks from your router — pass
 * whatever navigates to the forgot-password and login routes. If you don't
 * pass them, the buttons on this page just don't render (the message text
 * still tells the person what to do).
 */
export default function ConfirmLoginPage({ onGoForgot, onGoLogin }) {
  // Read the link's own token/action once. `action` is only used to decide
  // which button to visually emphasize (a hint for which link they opened)
  // — it is NEVER used to fire a request by itself.
  const params    = new URLSearchParams(window.location.search);
  const token     = params.get('token');
  const linkAction = params.get('action');
  const linkValid = !!token && (linkAction === 'yes' || linkAction === 'no');

  // choice = waiting for the person to actually tap a button.
  const [state, setState]         = useState(linkValid ? 'choice' : 'invalid'); // choice|checking|confirmed|denied|expired|invalid|error
  const [firstName, setFirstName] = useState('');
  const [device, setDevice]       = useState('');
  const [location, setLocation]   = useState('');

  // Only ever called from an onClick — this is the one and only place that
  // hits the server, so an automated page visit (scanner/prefetch) can never
  // trigger it.
  const respond = async (action) => {
    if (state === 'checking') return;
    setState('checking');
    try {
      const res = await confirmLoginDevice(token, action);
      setFirstName(res.firstName || '');
      setDevice(res.device || '');
      setLocation(res.location || '');
      setState(
        res.status === 'confirmed' ? 'confirmed' :
        res.status === 'denied'    ? 'denied'    :
        res.status === 'expired'   ? 'expired'   : 'invalid'
      );
      // Nudge the original tab — it's likely sitting in the background
      // right now (the person came here from it) and its polling timer
      // may be throttled, so don't make it wait on that timer.
      pingLoginConfirmationWaiters();
    } catch {
      setState('error');
    }
  };

  // Shown above the headline on every resolved state (not "checking"/"error",
  // where we either don't have it yet or don't trust what little we do have)
  // so whoever's reading — on any device — can see at a glance which device
  // and where this sign-in actually came from, same idea as the email.
  const DeviceLine = () => (
    (device || location) ? (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 0 16px',
        padding: '8px 14px', borderRadius: 20, background: 'rgba(139,0,0,0.06)',
        border: '1px solid rgba(139,0,0,0.14)', fontFamily: FONT_BODY, fontSize: 12.5, color: '#5a4326',
      }}>
        <span>{device || 'Unknown device'}</span>
        {location && <><span style={{ opacity: 0.5 }}>·</span><span>📍 {location}</span></>}
      </div>
    ) : null
  );

  if (state === 'choice') {
    return (
      <Card>
        <H>Confirm this sign-in</H>
        <P>
          Someone just tried signing in to your LibraScan account. Only
          continue if this was you — the email you opened this link from
          shows which device and location it came from.
        </P>
        <Btn primary onClick={() => respond('yes')}>Yes, it's me</Btn>
        <Btn onClick={() => respond('no')}>No, secure my account</Btn>
      </Card>
    );
  }

  if (state === 'checking') {
    return <Card><P>Submitting your response…</P></Card>;
  }

  if (state === 'confirmed') {
    return (
      <Card>
        <DeviceLine />
        <H>Login confirmed successfully ✓</H>
        <P>
          Thanks{firstName ? `, ${firstName}` : ''} — that sign-in has been
          approved. You may now continue using the original login page;
          it's watching for this and will finish signing you in within a
          few seconds. You can close this tab.
        </P>
      </Card>
    );
  }

  if (state === 'denied') {
    return (
      <Card>
        <DeviceLine />
        <H>That sign-in is blocked</H>
        <P>
          Good call{firstName ? `, ${firstName}` : ''} — that login attempt
          has been rejected. The original login page has been told to block
          it, and we removed every device we'd previously trusted on this
          account so nothing else can skip straight past this check either.
        </P>
        <P style={{ color: '#8B0000', fontWeight: 700 }}>
          Please change your password to secure your account.
        </P>
        {onGoForgot && <Btn primary onClick={onGoForgot}>Change My Password</Btn>}
      </Card>
    );
  }

  if (state === 'expired') {
    return (
      <Card>
        <DeviceLine />
        <H>This link expired</H>
        <P>
          That confirmation link is no longer valid. If someone is still
          trying to sign in, go back to the login page — a new email (or the
          code-entry option) will be waiting there.
        </P>
        {onGoLogin && <Btn onClick={onGoLogin}>Back to Login</Btn>}
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card>
        <H>Something went wrong</H>
        <P>We couldn't reach the server just now. Please try the link again in a moment.</P>
        {onGoLogin && <Btn onClick={onGoLogin}>Back to Login</Btn>}
      </Card>
    );
  }

  return (
    <Card>
      <H>Link not valid</H>
      <P>
        We couldn't match this link to a pending sign-in. It may have
        already been used, or the link was copied incorrectly.
      </P>
      {onGoLogin && <Btn onClick={onGoLogin}>Back to Login</Btn>}
    </Card>
  );
}