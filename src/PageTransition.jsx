import { useEffect, useRef, useCallback, useState } from 'react';

/* ============================================================================
   LIBRASCAN — Page Transition / Loader
   Sequence:  current page softens → maroon + gold sweep → logo reveal →
              thin gold progress → destination reveal.

   Exports (API unchanged): AppLoader, PageTransition, usePageTransition
   (+ usePageTransition now also returns `handleCovered`, which is optional).

   All motion uses transform / opacity (+ backdrop-filter for the soft blur),
   every keyframe is prefixed `pt-` so it cannot clash with App.css.
   ========================================================================== */

/* ── Timeline (ms). Keep in sync with the CSS delays below. ─────────────── */
const TIMING = {
  covered: 540,   // sweep has fully covered the screen → safe moment to swap page
  done:    1200,  // reveal finished → unmount
};
const TIMING_REDUCED = { covered: 140, done: 580 };

const STYLES = `
  @keyframes pt-spin      { to { transform: rotate(360deg); } }
  @keyframes pt-fadeIn    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pt-fadeOut   { from { opacity: 1; } to { opacity: 0; } }
  @keyframes pt-sweep     { from { transform: translate3d(-101%,0,0); } to { transform: translate3d(0,0,0); } }
  @keyframes pt-panelOut  { from { opacity: 1; transform: translate3d(0,0,0) scale(1); }
                            to   { opacity: 0; transform: translate3d(0,-6px,0) scale(1.015); } }
  @keyframes pt-stageOut  { from { opacity: 1; transform: translate3d(0,0,0) scale(1); }
                            to   { opacity: 0; transform: translate3d(0,-10px,0) scale(1.04); } }
  @keyframes pt-sheen     { 0%   { opacity: 0; transform: translate3d(-120%,0,0) skewX(-18deg); }
                            25%  { opacity: 1; }
                            100% { opacity: 0; transform: translate3d(380%,0,0) skewX(-18deg); } }
  @keyframes pt-brandIn   { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
  @keyframes pt-glow      { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
  @keyframes pt-pulse     { 0%,100% { opacity: .25; transform: scale(1); }  50% { opacity: .7; transform: scale(1.06); } }
  @keyframes pt-shimmer   { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes pt-rise      { 0%   { opacity: 0; transform: translate3d(0,0,0) scale(1); }
                            25%  { opacity: .7; }
                            100% { opacity: 0; transform: translate3d(0,-90px,0) scale(.3); } }
  @keyframes pt-indet     { 0% { transform: translate3d(-100%,0,0); } 100% { transform: translate3d(260%,0,0); } }
  @keyframes pt-fill      { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes pt-dot       { 0%,80%,100% { opacity: .2; } 40% { opacity: 1; } }
  @keyframes pt-exitFade  { from { opacity: 1; } to { opacity: 0; } }
  @keyframes pt-exitLogo  { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.06); } }

  /* ── Shared scene ───────────────────────────────────────────────────── */
  .pt-loader, .pt-root, .pt-exit {
    position: fixed; inset: 0; z-index: 9999; overflow: hidden;
    contain: layout paint;
  }
  .pt-loader { background: #1a0000; animation: pt-fadeIn .24s cubic-bezier(.4,0,.2,1) both; }
  .pt-loader--resume { animation: none; }
  .pt-root { z-index: 9998; }

  .pt-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .pt-bg {
    position: absolute; inset: 0; opacity: .14;
    background: url(/LoginBG.png) center / cover no-repeat;
  }
  .pt-vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, rgba(139,0,0,.55) 0%, rgba(60,0,0,.85) 55%, rgba(18,0,0,.96) 100%);
  }
  .pt-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; animation: pt-fadeIn .8s ease both; }
  .pt-ringsvg { animation: pt-pulse 2.6s ease-in-out infinite; }

  .pt-particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .pt-particle {
    position: absolute; bottom: 30%; left: var(--x);
    width: var(--s); height: var(--s); border-radius: 50%;
    background: radial-gradient(circle, #E8C97A, #C9A84C);
    opacity: 0;
    animation: pt-rise var(--d) var(--delay) ease-out infinite;
  }

  /* ── Brand block ────────────────────────────────────────────────────── */
  .pt-brand { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
  .pt-logo { position: relative; width: 76px; height: 76px; margin-bottom: 28px; }
  .pt-logo img {
    position: relative; display: block; width: 76px; height: 76px; border-radius: 50%;
    object-fit: cover; border: 2px solid rgba(201,168,76,.55);
    box-shadow: 0 0 28px rgba(201,168,76,.18), 0 0 60px rgba(107,0,0,.5);
  }
  .pt-glow {
    position: absolute; inset: -30px; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle, rgba(232,201,122,.22) 0%, rgba(232,201,122,0) 65%);
    animation: pt-glow 2.4s ease-in-out infinite;
  }
  .pt-ring {
    position: absolute; inset: -7px; border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: #C9A84C; border-right-color: rgba(201,168,76,.25);
    animation: pt-spin 1.8s linear infinite;
  }
  .pt-ring--pulse {
    inset: -14px; border: 1px solid rgba(201,168,76,.3);
    animation: pt-pulse 2.4s ease-in-out infinite;
  }
  .pt-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 13px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
    background: linear-gradient(90deg, #C9A84C, #E8C97A, #F5E4A8, #E8C97A, #C9A84C);
    background-size: 200% auto;
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent;
    animation: pt-shimmer 3s linear infinite;
    margin-bottom: 14px; text-align: center;
  }
  .pt-bar {
    position: relative; width: 120px; height: 2px; border-radius: 2px; overflow: hidden;
    background: rgba(201,168,76,.16); margin-bottom: 14px;
  }
  .pt-bar__fill {
    position: absolute; top: 0; left: 0; height: 100%; width: 45%; border-radius: 2px;
    background: linear-gradient(90deg, rgba(201,168,76,0), #C9A84C, #E8C97A, #C9A84C, rgba(201,168,76,0));
    animation: pt-indet 1.4s cubic-bezier(.65,0,.35,1) infinite;
  }
  .pt-bar__fill--fill {
    width: 100%; transform-origin: left center;
    background: linear-gradient(90deg, #C9A84C, #E8C97A);
    animation: pt-fill .34s cubic-bezier(.65,0,.35,1) .48s both;
  }
  .pt-label {
    margin: 0; min-width: 90px; text-align: center;
    font-family: 'Josefin Sans', sans-serif; font-size: 9.5px;
    letter-spacing: .2em; text-transform: uppercase; color: rgba(201,168,76,.6);
  }
  .pt-label--late { animation: pt-fadeIn .3s ease .46s both; }
  .pt-dots i { font-style: normal; animation: pt-dot 1.2s ease-in-out infinite; }
  .pt-dots i:nth-child(2) { animation-delay: .2s; }
  .pt-dots i:nth-child(3) { animation-delay: .4s; }

  /* ── PageTransition timeline ────────────────────────────────────────── */
  /* 0–260ms: current page softens (blur + tint) */
  .pt-veil {
    position: absolute; inset: 0;
    background: rgba(60,0,0,.28);
    -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
    animation:
      pt-fadeIn  .26s cubic-bezier(.4,0,.2,1) both,
      pt-fadeOut .38s cubic-bezier(.4,0,.2,1) .82s forwards;
  }
  /* 140–540ms: maroon sweep. 820–1200ms: fades away to reveal the page */
  .pt-panel {
    position: absolute; inset: 0; will-change: transform, opacity;
    background: linear-gradient(135deg, #6B0000 0%, #8B0000 50%, #5a0000 100%);
    animation:
      pt-sweep    .4s  cubic-bezier(.76,0,.24,1) .14s both,
      pt-panelOut .38s cubic-bezier(.4,0,.2,1)   .82s forwards;
  }
  .pt-panel::after {            /* thin gold leading edge */
    content: ''; position: absolute; top: 0; bottom: 0; right: 0; width: 2px;
    background: linear-gradient(180deg, rgba(232,201,122,0), #E8C97A 50%, rgba(232,201,122,0));
    opacity: .7;
  }
  .pt-sheen {                   /* soft gold light sweep */
    position: absolute; top: -10%; bottom: -10%; left: 0; width: 30vw; pointer-events: none;
    background: linear-gradient(90deg, rgba(232,201,122,0), rgba(232,201,122,.22), rgba(232,201,122,0));
    animation: pt-sheen .62s cubic-bezier(.4,0,.2,1) .12s both;
  }
  .pt-stage {
    position: relative; z-index: 2;
    animation: pt-stageOut .38s cubic-bezier(.4,0,.2,1) .82s forwards;
  }
  .pt-stage .pt-brand { animation: pt-brandIn .36s cubic-bezier(.22,1,.36,1) .42s both; }
  .pt-stage .pt-logo { margin-bottom: 22px; }

  /* ── Hand-off overlay shown once when AppLoader unmounts ───────────── */
  .pt-exit {
    pointer-events: none;
    background: radial-gradient(ellipse at center, rgba(90,0,0,.96) 0%, #1a0000 100%);
    animation: pt-exitFade .44s cubic-bezier(.4,0,.2,1) forwards;
  }
  .pt-exit__blur {
    position: absolute; inset: 0;
    -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  }
  .pt-exit__logo {
    position: absolute; top: 50%; left: 50%; width: 76px; height: 76px; margin: -38px 0 0 -38px;
    border-radius: 50%; object-fit: cover; border: 2px solid rgba(201,168,76,.55);
    box-shadow: 0 0 28px rgba(201,168,76,.18);
    animation: pt-exitLogo .3s cubic-bezier(.4,0,.2,1) forwards;
  }

  /* ── Reduced motion: simple, short fade ─────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .pt-particles, .pt-sheen, .pt-ring, .pt-ring--pulse, .pt-glow,
    .pt-lines, .pt-veil, .pt-panel::after { display: none; }
    .pt-title, .pt-dots i { animation: none; }
    .pt-bar__fill, .pt-bar__fill--fill { animation: none; width: 100%; opacity: .6; transform: none; }
    .pt-loader { animation-duration: .01ms; }
    .pt-panel  { animation: pt-fadeIn .14s linear both, pt-fadeOut .2s linear .36s forwards; }
    .pt-stage  { animation: pt-fadeIn .14s linear both; }
    .pt-stage .pt-brand, .pt-label--late { animation: none; }
    .pt-exit { animation-duration: .2s; }
    .pt-exit__logo { animation: none; }
  }
`;

/* ── One <style> element, ever ──────────────────────────────────────────── */
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pt-styles')) return;
  const el = document.createElement('style');
  el.id = 'pt-styles';
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ── Ref-counted scroll lock (no scrollbars during transitions) ─────────── */
let lockCount = 0;
let prevOverflow = '';
function lockScroll() {
  if (lockCount++ === 0) {
    const html = document.documentElement;
    prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
  }
}
function unlockScroll() {
  if (lockCount > 0 && --lockCount === 0) {
    document.documentElement.style.overflow = prevOverflow;
  }
}

/* ── Deterministic particles (no Math.random during render) ─────────────── */
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  x: 14 + i * 8,
  delay: +(i * 0.23).toFixed(2),
  dur: +(2.4 + (i % 3) * 0.5).toFixed(2),
  size: 2 + (i % 3),
}));

function Backdrop() {
  return (
    <>
      <div className="pt-bg" />
      <div className="pt-vignette" />
      <svg className="pt-lines" aria-hidden="true">
        {[120, 180, 240].map((r, i) => (
          <circle key={r} className="pt-ringsvg" cx="50%" cy="50%" r={r}
            fill="none" stroke="rgba(201,168,76,0.45)" strokeWidth="1" strokeDasharray="4 8"
            style={{ opacity: 0.35 - i * 0.12, animationDelay: `${i * 0.4}s` }} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1={`${i * 18}%`} y1="0" x2={`${i * 18 - 20}%`} y2="100%"
            stroke="rgba(201,168,76,0.05)" strokeWidth="1" />
        ))}
      </svg>
      <div className="pt-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span key={i} className="pt-particle"
            style={{ '--x': `${p.x}%`, '--s': `${p.size}px`, '--d': `${p.dur}s`, '--delay': `${p.delay}s` }} />
        ))}
      </div>
    </>
  );
}

function Logo() {
  return (
    <div className="pt-logo">
      <div className="pt-glow" />
      <div className="pt-ring pt-ring--pulse" />
      <div className="pt-ring" />
      <img src="/LibraryLogo.png" alt="PSU" />
    </div>
  );
}

/* ── One-shot hand-off: when AppLoader unmounts, fade it out over the page ─
   (AppLoader is removed by App.jsx the instant loading ends, so the reveal
   is played by a detached overlay that removes itself.)                    */
let revealTimer = null;
let handoffUntil = 0;

function playRevealOverlay() {
  if (typeof document === 'undefined') return;
  ensureStyles();
  document.querySelectorAll('.pt-exit').forEach(n => n.remove());
  const el = document.createElement('div');
  el.className = 'pt-exit';
  el.setAttribute('aria-hidden', 'true');
  const blur = document.createElement('div');
  blur.className = 'pt-exit__blur';
  const img = document.createElement('img');
  img.className = 'pt-exit__logo';
  img.src = '/LibraryLogo.png';
  img.alt = '';
  el.append(blur, img);
  document.body.appendChild(el);
  const remove = () => el.remove();
  el.addEventListener('animationend', e => { if (e.target === el) remove(); });
  setTimeout(remove, 900); // safety net
}

/* ============================================================================
   AppLoader — full-screen loader used while auth / role resolves.
   ========================================================================== */
export function AppLoader() {
  ensureStyles();
  // If another loader unmounted a moment ago (Landing → RoleRouter), skip the
  // intro fade so the two read as one continuous loader instead of a flicker.
  const resume = performance.now() < handoffUntil;

  useEffect(() => {
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
    document.querySelectorAll('.pt-exit').forEach(n => n.remove());
    lockScroll();
    return () => {
      unlockScroll();
      handoffUntil = performance.now() + 120;
      revealTimer = setTimeout(() => { revealTimer = null; playRevealOverlay(); }, 60);
    };
  }, []);

  return (
    <div className={`pt-loader${resume ? ' pt-loader--resume' : ''}`} role="status" aria-label="Loading">
      <div className="pt-scene">
        <Backdrop />
        <div className="pt-brand">
          <Logo />
          <div className="pt-title">LIBRASCAN</div>
          <div className="pt-bar"><div className="pt-bar__fill" /></div>
          <p className="pt-label">
            Loading<span className="pt-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PageTransition — sweep → logo → progress → reveal.
   onCovered (optional): fired when the screen is fully covered — the ideal
                         moment to swap the page underneath.
   onDone:               fired when the whole sequence has finished.
   ========================================================================== */
export function PageTransition({ onDone, onCovered, label = '' }) {
  ensureStyles();
  const doneRef = useRef(onDone);
  const coveredRef = useRef(onCovered);
  doneRef.current = onDone;
  coveredRef.current = onCovered;

  useEffect(() => {
    const reduced = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = reduced ? TIMING_REDUCED : TIMING;

    lockScroll();
    const t1 = setTimeout(() => coveredRef.current?.(), t.covered);
    const t2 = setTimeout(() => doneRef.current?.(), t.done);
    return () => { clearTimeout(t1); clearTimeout(t2); unlockScroll(); };
  }, []);

  return (
    <div className="pt-root" role="status" aria-live="polite" aria-busy="true">
      <div className="pt-veil" />
      <div className="pt-panel">
        <Backdrop />
        <div className="pt-scene">
          <div className="pt-stage">
            <div className="pt-brand">
              <Logo />
              <div className="pt-bar"><div className="pt-bar__fill pt-bar__fill--fill" /></div>
              {label && <p className="pt-label pt-label--late">{label}</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="pt-sheen" />
    </div>
  );
}

/* ============================================================================
   usePageTransition — same shape as before.
   - startTransition(cb): ignored if a transition is already running.
   - cb runs when the screen is covered (handleCovered) or, if the consumer
     only wires onDone, at the end (handleDone) — so old usage still works.
   ========================================================================== */
export function usePageTransition() {
  const [transitioning, setTransitioning] = useState(false);
  const pendingCb = useRef(null);
  const busy = useRef(false);

  const flush = useCallback(() => {
    const cb = pendingCb.current;
    pendingCb.current = null;
    cb?.();
  }, []);

  const startTransition = useCallback((cb) => {
    if (busy.current) return;
    busy.current = true;
    pendingCb.current = cb;
    setTransitioning(true);
  }, []);

  const handleCovered = flush;

  const handleDone = useCallback(() => {
    flush();
    busy.current = false;
    setTransitioning(false);
  }, [flush]);

  return { transitioning, handleDone, handleCovered, startTransition };
}