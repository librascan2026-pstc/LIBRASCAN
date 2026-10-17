// ============================================================================
// LIBRASCAN — shared toast / notification message
// One look + one behaviour for every toast, validation toast and auto-dismiss
// banner in the app:
//   • centered horizontally at the top of the screen (never blocks clicks — pointer-events: none)
//   • smooth fade-in, then smooth fade-out when the message is cleared
//   • on-screen time scales with the length of the message
//
// Usage (the page keeps its own state, exactly as before):
//   <ToastCard msg={toast.msg} isError={toast.isError} />   // always rendered
//   setTimeout(() => clear(), getToastDuration(msg));
// ============================================================================
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Fired (window event) each time a ToastCard starts showing a new message, so a dashboard can
 *  mirror it into its notification bell / history. detail = { msg, isError }. */
export const TOAST_SHOWN_EVENT = 'librascan-toast-card-shown';

const FADE_IN_MS  = 260;
const FADE_OUT_MS = 360;

const MIN_MS     = 2200;   // shortest a message stays visible
const MAX_MS     = 9000;   // longest a message stays visible
const BASE_MS    = 1600;   // reaction time before reading starts
const PER_CHAR   = 55;     // ≈ 18 characters per second reading speed

/** How long (ms) a message should stay on screen, based on its length. */
export function getToastDuration(msg) {
  const len = typeof msg === 'string' ? msg.trim().length : 0;
  return Math.min(MAX_MS, Math.max(MIN_MS, BASE_MS + len * PER_CHAR));
}

// Per-channel timers so a newer toast is never cut short by an older timer.
const timers = {};
/** Clears any pending timer for `key`, then runs `clear` after the message's reading time. */
export function scheduleToastClear(key, msg, clear) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(clear, getToastDuration(msg));
}

// Layout is applied inline (not only via the injected <style>) so placement is
// always correct: fixed, top of the screen, horizontally centered.
const LAYER_STYLE = {
  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
  display: 'flex', justifyContent: 'right', alignItems: 'flex-start',
  padding: 'calc(24px + env(safe-area-inset-top, 0px)) 16px 16px',
  pointerEvents: 'none', boxSizing: 'border-box',
};

const STYLE_ID = 'lm-top-toast-css';
const CSS = `
.lm-ctoast-layer {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: flex-start; justify-content: center;
  padding: calc(24px + env(safe-area-inset-top, 0px)) 16px 16px; pointer-events: none;
}
.lm-ctoast {
  display: flex; align-items: center; gap: 10px;
  max-width: min(440px, calc(100vw - 32px));
  padding: 14px 22px; border-radius: 12px;
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 13px; line-height: 1.5; text-align: center;
  font-weight: 600; word-break: break-word;
  box-shadow: 0 14px 36px rgba(30,40,30,0.20);
  opacity: 0;
}
.lm-ctoast.in  { animation: lm-ctoast-in  ${FADE_IN_MS}ms ease forwards; }
.lm-ctoast.out { animation: lm-ctoast-out ${FADE_OUT_MS}ms ease forwards; }
.lm-ftoast { opacity: 0; }
.lm-ftoast.in  { animation: lm-ctoast-in  ${FADE_IN_MS}ms ease forwards; }
.lm-ftoast.out { animation: lm-ctoast-out ${FADE_OUT_MS}ms ease forwards; }
.lm-ctoast-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
@keyframes lm-ctoast-in  { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lm-ctoast-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-8px); } }
@media (prefers-reduced-motion: reduce) {
  .lm-ctoast.in, .lm-ftoast.in   { animation-name: lm-ctoast-fade-in; }
  .lm-ctoast.out, .lm-ftoast.out { animation-name: lm-ctoast-fade-out; }
  @keyframes lm-ctoast-fade-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes lm-ctoast-fade-out { from { opacity: 1; } to { opacity: 0; } }
}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  // Always keep the tag in sync, so an edited style (or hot reload) never leaves stale CSS behind.
  if (el.textContent !== CSS) el.textContent = CSS;
}

/**
 * Always render this (do not wrap it in `msg && …`): it stays mounted for the
 * fade-out after `msg` becomes empty, then renders nothing.
 */
export function ToastCard({ msg, isError = false }) {
  // `shown` keeps the last message alive while it fades out.
  const [shown, setShown] = useState({ msg: '', isError: false, n: 0 });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => { ensureStyle(); }, []);

  // Announce every new message (used by the librarian bell / Notification History).
  useEffect(() => {
    if (!msg || typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent(TOAST_SHOWN_EVENT, { detail: { msg, isError: !!isError } }));
    } catch { /* non-browser environment */ }
  }, [msg, isError]);

  useEffect(() => {
    if (msg) {
      setShown(prev => (prev.msg === msg && prev.isError === !!isError)
        ? prev
        : { msg, isError: !!isError, n: prev.n + 1 });
      setLeaving(false);
      return undefined;
    }
    // Cleared by the page -> fade out, then unmount.
    setLeaving(true);
    const t = setTimeout(() => {
      setShown(prev => (prev.msg ? { ...prev, msg: '' } : prev));
      setLeaving(false);
    }, FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [msg, isError]);

  if (!shown.msg || typeof document === 'undefined') return null;

  const err = shown.isError;
  return createPortal(
    <div className="lm-ctoast-layer" style={LAYER_STYLE}>
      <div
        key={shown.n}
        className={`lm-ctoast ${leaving ? 'out' : 'in'}`}
        role={err ? 'alert' : 'status'}
        aria-live={err ? 'assertive' : 'polite'}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: 'min(440px, calc(100vw - 32px))', boxSizing: 'border-box',
          padding: '14px 22px', borderRadius: 12,
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          fontSize: 13, fontWeight: 600, lineHeight: 1.5, textAlign: 'center',
          boxShadow: '0 14px 36px rgba(30,40,30,0.20)',
          background: err ? '#FDE8E8' : '#E6F4EA',
          color:      err ? '#8B1A1A' : '#1E5B2B',
          border: `1px solid ${err ? 'rgba(192,57,43,0.55)' : 'rgba(46,125,50,0.50)'}`,
        }}
      >
        <span className="lm-ctoast-dot" style={{ background: err ? '#C0392B' : '#2E7D32' }} />
        <span>{shown.msg}</span>
      </div>
    </div>,
    document.body
  );
}

/**
 * Same top-centered fade in/out as ToastCard, but for richer content (e.g. the
 * scanner result cards). The children are shown as-is; this only handles
 * placement, the opaque backing, and the fade. Always render it (do not wrap in
 * `show && …`): it stays mounted for the fade-out, then renders nothing.
 *   show     – true while the toast should be visible
 *   toastKey – changes for every new toast so the fade-in replays
 */
export function FloatingToast({ show, toastKey, width = 520, radius = 12, children }) {
  const active = !!(show && children);
  const [phase, setPhase] = useState('hidden');   // hidden | in | out
  const lastRef = useRef(null);
  if (active) lastRef.current = children;

  useEffect(() => { ensureStyle(); }, []);

  useEffect(() => {
    if (active) { setPhase('in'); return undefined; }
    setPhase(p => (p === 'hidden' ? p : 'out'));
    const t = setTimeout(() => setPhase('hidden'), FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [active]);

  if (phase === 'hidden' || !lastRef.current || typeof document === 'undefined') return null;

  return createPortal(
    <div className="lm-ctoast-layer" style={LAYER_STYLE}>
      <div
        key={toastKey}
        className={`lm-ftoast ${phase === 'out' ? 'out' : 'in'}`}
        style={{
          width: `min(${width}px, calc(100vw - 32px))`, boxSizing: 'border-box', pointerEvents: 'auto',
          background: '#FDF8F0', borderRadius: radius,
          boxShadow: '0 14px 36px rgba(90,20,20,0.22)',
        }}
      >
        {lastRef.current}
      </div>
    </div>,
    document.body
  );
}