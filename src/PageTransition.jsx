// src/PageTransition.jsx
// ── AESTHETIC PAGE TRANSITION LOADER ──────────────────────────────────────────
// A cinematic full-screen transition that plays when navigating between pages.
// Features: book-page-turn effect, gold particle dust, maroon curtain sweep.
// Usage: wrap any page-change trigger with <PageTransition key={page} />
//
// Also exports: <AppLoader /> — the initial auth-loading screen (replaces
// the plain spinner in App.jsx)

import { useEffect, useState, useRef } from 'react';

// ── Keyframes injected once globally ──────────────────────────────────────────
const STYLES = `
  @keyframes pt-spin     { to { transform: rotate(360deg); } }
  @keyframes pt-fadeIn   { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pt-fadeOut  { from { opacity: 1; } to { opacity: 0; } }
  @keyframes pt-curtainIn  { from { transform: scaleY(0); transform-origin: top; } to { transform: scaleY(1); transform-origin: top; } }
  @keyframes pt-curtainOut { from { transform: scaleY(1); transform-origin: bottom; } to { transform: scaleY(0); transform-origin: bottom; } }
  @keyframes pt-logoIn   { from { opacity: 0; transform: scale(0.7) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes pt-shimmer  {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes pt-particle {
    0%   { opacity: 0;   transform: translateY(0) scale(1);   }
    20%  { opacity: 1; }
    100% { opacity: 0;   transform: translateY(-80px) scale(0); }
  }
  @keyframes pt-float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes pt-ringPulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 0.9; transform: scale(1.05); }
  }
  @keyframes pt-barSweep {
    0%   { transform: scaleX(0); transform-origin: left; }
    60%  { transform: scaleX(1); transform-origin: left; }
    60.01% { transform-origin: right; }
    100% { transform: scaleX(0); transform-origin: right; }
  }
  @keyframes pt-dash {
    to { stroke-dashoffset: 0; }
  }
`;

function injectStyles() {
  if (document.getElementById('pt-styles')) return;
  const el = document.createElement('style');
  el.id = 'pt-styles';
  el.textContent = STYLES;
  document.head.appendChild(el);
}

// ── Gold particle ──────────────────────────────────────────────────────────────
function Particle({ x, delay, size }) {
  return (
    <div style={{
      position: 'absolute',
      left: x + '%',
      bottom: '35%',
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, #E8C97A, #C9A84C)`,
      animation: `pt-particle ${1.2 + Math.random() * 1}s ${delay}s ease-out infinite`,
      pointerEvents: 'none',
    }} />
  );
}

// ── SVG Decorative ring ───────────────────────────────────────────────────────
function DecorRing({ r, opacity, delay }) {
  return (
    <circle
      cx="50%" cy="50%" r={r}
      fill="none"
      stroke="rgba(201,168,76,0.6)"
      strokeWidth="1"
      strokeDasharray="4 8"
      style={{
        animation: `pt-ringPulse 2s ${delay}s ease-in-out infinite`,
        opacity,
      }}
    />
  );
}

// ── AppLoader: initial auth/session loading ───────────────────────────────────
export function AppLoader() {
  injectStyles();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(id);
  }, []);

  // Generate stable particles
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      x: 10 + (i * 7.5),
      delay: i * 0.18,
      size: 2 + Math.random() * 3,
    }))
  ).current;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1a0000',
      overflow: 'hidden',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/LoginBG.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.18,
      }} />
      {/* Deep maroon gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(80,0,0,0.5) 0%, rgba(10,0,0,0.9) 70%)',
      }} />

      {/* Decorative SVG rings */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        <DecorRing r={120} opacity={0.35} delay={0}   />
        <DecorRing r={180} opacity={0.2}  delay={0.4} />
        <DecorRing r={240} opacity={0.1}  delay={0.8} />
        {/* Diagonal lines */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i}
            x1={`${i * 14}%`} y1="0"
            x2={`${i * 14 - 20}%`} y2="100%"
            stroke="rgba(201,168,76,0.04)" strokeWidth="1"
          />
        ))}
      </svg>

      {/* Gold dust particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {particles.map((p, i) => <Particle key={i} {...p} />)}
      </div>

      {/* Center content */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        animation: 'pt-logoIn 0.7s ease forwards',
      }}>
        {/* Logo with animated golden ring */}
        <div style={{ position: 'relative', marginBottom: 28, animation: 'pt-float 3s ease-in-out infinite' }}>
          {/* Outer spinning ring */}
          <div style={{
            position: 'absolute', inset: -6,
            border: '1.5px solid transparent',
            borderTopColor: '#C9A84C',
            borderRightColor: 'rgba(201,168,76,0.3)',
            borderRadius: '50%',
            animation: 'pt-spin 1.4s linear infinite',
          }} />
          {/* Inner spinning ring (reverse) */}
          <div style={{
            position: 'absolute', inset: -12,
            border: '1px solid transparent',
            borderBottomColor: 'rgba(201,168,76,0.5)',
            borderLeftColor: 'rgba(201,168,76,0.2)',
            borderRadius: '50%',
            animation: 'pt-spin 2.1s linear infinite reverse',
          }} />
          <img
            src="/LibraryLogo.png"
            alt="PSU"
            style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '2.5px solid rgba(201,168,76,0.6)',
              objectFit: 'cover', display: 'block',
              boxShadow: '0 0 30px rgba(201,168,76,0.2), 0 0 60px rgba(139,0,0,0.4)',
            }}
          />
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 13, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          background: 'linear-gradient(90deg, #C9A84C, #E8C97A, #F5E4A8, #E8C97A, #C9A84C)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'pt-shimmer 2.5s linear infinite',
          marginBottom: 6,
        }}>
          PSU Library
        </div>

        {/* Gold progress bar */}
        <div style={{
          width: 120, height: 2,
          background: 'rgba(201,168,76,0.15)',
          borderRadius: 2, overflow: 'hidden',
          marginBottom: 14,
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #C9A84C, #E8C97A)',
            borderRadius: 2,
            animation: 'pt-barSweep 1.8s ease-in-out infinite',
          }} />
        </div>

        {/* Status text */}
        <p style={{
          color: 'rgba(201,168,76,0.55)',
          fontSize: 9.5,
          fontFamily: "'Josefin Sans', sans-serif",
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: 0,
          minWidth: 90,
          textAlign: 'center',
        }}>
          Loading{dots}
        </p>
      </div>
    </div>
  );
}

// ── PageTransition: plays on every page/route change ─────────────────────────
// Usage in AuthRouter or LandingApp:
//   wrap route changes with: setTransitioning(true) → render <PageTransition onDone={() => actuallyChangePage()} />
//
// OR simpler: just render this as an overlay during the transition phase.
// The component auto-calls onDone after the animation completes.
export function PageTransition({ onDone, label = '' }) {
  injectStyles();
  const [phase, setPhase] = useState('in'); // 'in' → 'hold' → 'out'

  useEffect(() => {
    // Phase 1: curtain sweeps in (400ms)
    const t1 = setTimeout(() => setPhase('hold'), 100);
    // Phase 2: hold briefly (300ms)
    const t2 = setTimeout(() => setPhase('out'), 400);
    // Phase 3: curtain sweeps out, call onDone
    const t3 = setTimeout(() => onDone?.(), 7050);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const curtainStyle = {
    position: 'fixed', inset: 0, zIndex: 9998,
    background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 50%, #5a0000 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    animation:
      phase === 'in'   ? 'pt-curtainIn  0.42s cubic-bezier(0.76, 0, 0.24, 1) forwards' :
      phase === 'out'  ? 'pt-curtainOut 0.38s cubic-bezier(0.76, 0, 0.24, 1) forwards' :
      'none',
  };

  return (
    <div style={curtainStyle}>
      {/* Gold diagonal stripe overlay */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {[0.08, 0.16, 0.24].map((op, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${20 + i * 30}%`, width: 1,
            background: `rgba(201,168,76,${op})`,
            transform: 'skewX(-20deg)',
          }} />
        ))}
      </div>

      {/* Logo + label */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        animation: 'pt-logoIn 0.3s 0.15s ease both',
        opacity: phase === 'out' ? 0 : 1,
        transition: 'opacity 0.2s',
      }}>
        <img src="/LibraryLogo.png" alt="" style={{
          width: 52, height: 52, borderRadius: '50%',
          border: '2px solid rgba(201,168,76,0.7)',
          objectFit: 'cover',
          boxShadow: '0 0 20px rgba(201,168,76,0.3)',
        }} />
        {label && (
          <div style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: 9, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(245,228,168,0.75)',
          }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

// ── usePageTransition hook ─────────────────────────────────────────────────────
// Returns: { transitioning, startTransition(cb) }
// Usage:
//   const { transitioning, startTransition } = usePageTransition();
//   <button onClick={() => startTransition(() => setPage('login'))}>Go</button>
//   {transitioning && <PageTransition onDone={...} />}
export function usePageTransition() {
  const [transitioning, setTransitioning] = useState(false);
  const pendingCb = useRef(null);

  const startTransition = (cb) => {
    pendingCb.current = cb;
    setTransitioning(true);
  };

  const handleDone = () => {
    pendingCb.current?.();
    pendingCb.current = null;
    setTransitioning(false);
  };

  return { transitioning, handleDone, startTransition };
}