// src/Login_SignUp/AuthLayout.jsx
// ── FULLY RESPONSIVE VERSION ───────────────────────────────────────────────────
// Works on: iPhone SE, iPhone XR, iPad Mini/Air/Pro, Android phones, desktops
// Card adapts: stacked on mobile, side-by-side on tablet+

import { motion } from 'framer-motion';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY    = "'Crimson Pro', Georgia, serif";
const FONT_SANS    = "'Josefin Sans', sans-serif";

export default function AuthLayout({ children, title, subtitle, onExit, onBack }) {
  const handleExit = onExit || onBack || (() => { window.location.href = '/'; });

  return (
    <div style={{
      position:  'fixed',
      inset:      0,
      display:   'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT_BODY,
      overflow:  'hidden',
      zIndex:    0,
    }}>
      {/* ── Responsive styles injected ── */}
      <style>{`
        /* Auth card wrapper */
        .auth-card {
          position: relative;
          z-index: 5;
          display: flex;
          width: min(900px, calc(100vw - 32px));
          max-height: calc(100vh - 60px);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 32px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(201,168,76,0.22);
          flex-direction: row;
        }

        /* Book image panel — hidden on small screens */
        .auth-book-panel {
          width: 42%;
          flex-shrink: 0;
          position: relative;
          display: block;
        }

        /* Right parchment panel */
        .auth-form-panel {
          flex: 1;
          background: linear-gradient(160deg, #f8efd4 0%, #eddebb 45%, #e6ce9c 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 24px 36px 16px;
          overflow: hidden;
          min-width: 0;
        }

        /* Scrollable content area */
        .auth-pane {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
          min-height: 0;
        }
        .auth-pane::-webkit-scrollbar { width: 5px; }
        .auth-pane::-webkit-scrollbar-track { background: transparent; }
        .auth-pane::-webkit-scrollbar-thumb { background: rgba(139,0,0,0.25); border-radius: 10px; }
        .auth-pane::-webkit-scrollbar-thumb:hover { background: rgba(139,0,0,0.45); }

        /* === TABLET (641px – 900px) === */
        @media (max-width: 900px) {
          .auth-card {
            width: calc(100vw - 24px);
            max-height: calc(100vh - 40px);
          }
          .auth-book-panel { width: 35%; }
          .auth-form-panel { padding: 20px 24px 14px; }
        }

        /* === MOBILE (≤ 640px) === */
        @media (max-width: 640px) {
          .auth-card {
            flex-direction: column;
            width: calc(100vw - 16px);
            max-height: calc(100vh - 20px);
            border-radius: 14px;
          }
          /* On mobile: hide the book panel, show a slim header banner instead */
          .auth-book-panel { display: none; }
          .auth-form-panel {
            padding: 16px 20px 12px;
            width: 100%;
          }
          .auth-mobile-banner {
            display: flex !important;
          }
        }

        /* Default: mobile banner hidden */
        .auth-mobile-banner {
          display: none;
          background: linear-gradient(135deg, #8B0000, #6B0000);
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          flex-shrink: 0;
        }

        /* === VERY SMALL (≤ 380px, iPhone SE) === */
        @media (max-width: 380px) {
          .auth-card {
            width: 100vw;
            max-height: 100vh;
            border-radius: 0;
          }
          .auth-form-panel { padding: 12px 16px 10px; }
        }
      `}</style>

      {/* ── Background image ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/LoginBG.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        zIndex: 0,
      }} />
      {/* ── Dark maroon overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(68, 0, 0, 0.76)',
        zIndex: 1,
      }} />

      {/* ── PSU Logo — top left ── */}
      <div style={{ position: 'absolute', top: 16, left: 20, zIndex: 10 }}>
        <img src="/LibraryLogo.png" alt="PSU Logo" style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '2px solid #C9A84C', objectFit: 'cover', display: 'block',
        }} />
      </div>

      {/* ── X Exit Button ── */}
      <button
        type="button"
        onClick={handleExit}
        title="Exit to Home"
        style={{
          position: 'absolute', top: 16, right: 20, zIndex: 20,
          background: 'rgba(255,255,255,0.12)',
          border: '1.5px solid rgba(255,255,255,0.32)',
          borderRadius: '50%', width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
          transition: 'background 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6"  x2="6"  y2="18" />
          <line x1="6"  y1="6"  x2="18" y2="18" />
        </svg>
      </button>

      {/* ── Main Card ── */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── Left: Book image (hidden on mobile) ── */}
        <div className="auth-book-panel">
          <img
            src="/Book.png" alt="Library"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Spine shadow */}
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 16,
            background: 'linear-gradient(to right, rgba(0,0,0,0.55), transparent)',
          }} />
        </div>

        {/* ── Mobile top banner (replaces book panel on mobile) ── */}
        <div className="auth-mobile-banner">
          
          <div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C' }}></div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 8, letterSpacing: '0.08em', color: 'rgba(245,228,168,0.6)', textTransform: 'uppercase' }}></div>
          </div>
        </div>

        {/* ── Right: Parchment form panel ── */}
        <div className="auth-form-panel">
          {/* Corner flourishes */}
          <svg style={{ position:'absolute', top:10, right:10, opacity:0.15 }} width="36" height="36" viewBox="0 0 44 44" fill="none">
            <path d="M44,0 L44,18 M44,0 L26,0" stroke="#8B0000" strokeWidth="2"/>
          </svg>
          <svg style={{ position:'absolute', bottom:10, left:10, opacity:0.15 }} width="36" height="36" viewBox="0 0 44 44" fill="none">
            <path d="M0,44 L0,26 M0,44 L18,44" stroke="#8B0000" strokeWidth="2"/>
          </svg>

          {/* Ornament */}
          <div style={{ textAlign:'center', marginBottom:4, flexShrink:0 }}>
            <svg width="120" height="14" viewBox="0 0 140 16" fill="none">
              <line x1="0"   y1="8" x2="52"  y2="8" stroke="#8B0000" strokeWidth="1" strokeOpacity="0.3"/>
              <polygon points="58,3 70,13 82,3" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
              <line x1="88"  y1="8" x2="140" y2="8" stroke="#8B0000" strokeWidth="1" strokeOpacity="0.3"/>
            </svg>
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(16px, 3vw, 22px)',
            fontWeight: 700, color: '#4a1200',
            textAlign: 'center', letterSpacing: '0.07em', textTransform: 'uppercase',
            margin: '0 0 2px 0', flexShrink: 0,
          }}>
            {title}
          </h2>

          {/* Subtitle */}
          {subtitle && (
            <p style={{
              fontFamily: FONT_BODY,
              textAlign: 'center',
              fontSize: 'clamp(10px, 2vw, 12px)',
              color: '#7a3820',
              margin: '0 0 10px 0', fontStyle: 'italic', flexShrink: 0,
            }}>
              {subtitle}
            </p>
          )}

          {/* ── Scrollable content ── */}
          <div className="auth-pane">
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}