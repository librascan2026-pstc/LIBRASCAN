// src/Student_Dashboard/StudentDashboard.jsx
import { useState, useEffect } from 'react';

const G  = '#C9A84C';
const GP = '#F5E4A8';

export default function StudentDashboard({ user, onSignOut }) {
  const [visible,     setVisible]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Student';
  const lastName  = user?.user_metadata?.last_name  || '';
  const fullName  = (`${firstName} ${lastName}`).trim();

  return (
    <>
      <style>{`
        @keyframes sd-fade { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sd-modal { from{opacity:0;transform:scale(.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .sd-logout-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 24px;
          background: rgba(90,0,0,0.30);
          border: 1.5px solid rgba(201,168,76,0.38);
          border-radius: 4px;
          color: ${GP};
          font-family: 'Cinzel', serif;
          font-size: 11px; font-weight: 600;
          letter-spacing: .18em; text-transform: uppercase;
          cursor: pointer; transition: all .22s;
        }
        .sd-logout-btn:hover {
          background: rgba(110,0,0,0.55);
          border-color: rgba(201,168,76,.62);
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(80,0,0,.40);
        }

        .sd-cancel-btn {
          padding: 11px 28px;
          background: transparent;
          border: 1.5px solid rgba(201,168,76,0.26);
          border-radius: 4px;
          color: rgba(245,228,168,.55);
          font-family: 'Cinzel', serif;
          font-size: 10.5px; font-weight: 500;
          letter-spacing: .14em; text-transform: uppercase;
          cursor: pointer; transition: all .20s;
        }
        .sd-cancel-btn:hover { border-color: rgba(201,168,76,.52); color: ${GP}; background: rgba(201,168,76,.06); }

        .sd-confirm-btn {
          padding: 11px 28px;
          background: linear-gradient(135deg,#8B0000,#5A0000);
          border: 1px solid rgba(201,168,76,0.30);
          border-radius: 4px;
          color: ${GP};
          font-family: 'Cinzel', serif;
          font-size: 10.5px; font-weight: 600;
          letter-spacing: .14em; text-transform: uppercase;
          cursor: pointer; transition: all .20s;
        }
        .sd-confirm-btn:hover { background: linear-gradient(135deg,#6B0000,#3A0000); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(80,0,0,.50); }
      `}</style>

      {/* ── Root ── */}
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Cinzel','Cormorant Garamond',serif",
        overflow: 'hidden',
      }}>

        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: "url('/LogoBG.png')",
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}/>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(6,0,0,0.74)' }}/>
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(18,2,2,.15) 0%, rgba(3,0,0,.88) 100%)' }}/>

        {/* ── Top bar ── */}
        <header style={{
          position: 'relative', zIndex: 10, flexShrink: 0,
          height: 68,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 48px',
          background: 'linear-gradient(180deg,rgba(8,0,0,0.95) 0%,rgba(6,0,0,0.70) 100%)',
          borderBottom: '1px solid rgba(201,168,76,0.15)',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Logo */}
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            border: '1.5px solid rgba(201,168,76,0.36)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(201,168,76,0.07)',
          }}>
            <img src="/LibraryLogo.png" alt="logo"
              style={{ width: 30, height: 30, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Sign Out */}
          <button className="sd-logout-btn" onClick={() => setShowConfirm(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </header>

        {/* ── Centre: Welcome ── */}
        <main style={{
          flex: 1, position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          padding: '0 32px',
          animation: visible ? 'sd-fade .75s ease both' : 'none',
        }}>

          {/* Small label */}
          <div style={{
            fontSize: 10.5, letterSpacing: '.30em', textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.50)', fontFamily: "'Cinzel',serif",
            marginBottom: 16,
          }}>
            Welcome to the Library
          </div>

          {/* Name */}
          <h1 style={{
            fontFamily: "'Cinzel',serif",
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 700,
            color: GP,
            letterSpacing: '.06em',
            lineHeight: 1.2,
            margin: 0,
            textShadow: '0 2px 24px rgba(201,168,76,0.14)',
          }}>
            {fullName.toUpperCase() || 'STUDENT'}
          </h1>

          {/* Gold accent line */}
          <div style={{
            width: 60, height: 1.5,
            background: `linear-gradient(to right, transparent, ${G}, transparent)`,
            margin: '20px auto 0',
          }}/>

        </main>
      </div>

      {/* ── Sign Out Confirm Modal ── */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 400,
              background: 'linear-gradient(155deg,rgba(18,2,2,0.98),rgba(9,1,1,0.98))',
              border: '1px solid rgba(201,168,76,0.20)',
              borderRadius: 6,
              padding: '48px 52px',
              textAlign: 'center',
              boxShadow: '0 40px 100px rgba(0,0,0,0.78)',
              animation: 'sd-modal .28s cubic-bezier(0.34,1.56,0.64,1) both',
              position: 'relative',
            }}
          >
            {/* Corner brackets */}
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={v+h} style={{
                position: 'absolute', [v]: 12, [h]: 12, width: 14, height: 14,
                borderTop:    v==='top'    ? '1px solid rgba(201,168,76,0.34)' : 'none',
                borderBottom: v==='bottom' ? '1px solid rgba(201,168,76,0.34)' : 'none',
                borderLeft:   h==='left'   ? '1px solid rgba(201,168,76,0.34)' : 'none',
                borderRight:  h==='right'  ? '1px solid rgba(201,168,76,0.34)' : 'none',
              }}/>
            ))}

            {/* Icon */}
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: 'rgba(110,0,0,0.20)',
              border: '1.5px solid rgba(110,0,0,0.46)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.76)" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>

            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 17, fontWeight: 700, color: GP, letterSpacing: '.08em', marginBottom: 10 }}>
              Sign Out
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14.5, color: 'rgba(245,228,168,0.44)', lineHeight: 1.75, marginBottom: 30, letterSpacing: '.03em' }}>
              Are you sure you want to sign out<br/>of the PSU Library System?
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="sd-cancel-btn"  onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="sd-confirm-btn" onClick={onSignOut}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}