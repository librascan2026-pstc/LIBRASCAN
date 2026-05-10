// src/Student_Dashboard/StudentDashboard.jsx
import { useState, useEffect } from 'react';

const G  = '#C9A84C';
const GP = '#F5E4A8';
const MAR = '#8B0000';

export default function StudentDashboard({ user, onSignOut }) {
  const [time, setTime] = useState(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [greeting, setGreeting] = useState('');

  const firstName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Student';
  const fullName  = user?.user_metadata?.full_name
    || user?.user_metadata?.first_name
    || firstName;
  const program   = user?.user_metadata?.program || 'Bachelor of Science in Information Technology';
  const studentNo = user?.user_metadata?.student_number || user?.user_metadata?.username || '';

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12)      setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else             setGreeting('Good Evening');
  }, []);

  const fmtTime = (d) => d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const fmtDate = (d) => d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      minWidth: 1920,
      minHeight: 1080,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Cinzel', 'Georgia', serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

        @keyframes sd-fadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sd-fadeInSlow {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sd-shimmer {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        @keyframes sd-glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(201,168,76,0.15), 0 0 80px rgba(139,0,0,0.10); }
          50%       { box-shadow: 0 0 70px rgba(201,168,76,0.28), 0 0 140px rgba(139,0,0,0.18); }
        }
        @keyframes sd-line-grow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes sd-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes sd-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes sd-confirm-in {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .sd-logout-btn {
          background: rgba(139,0,0,0.25);
          border: 1.5px solid rgba(201,168,76,0.40);
          color: ${GP};
          padding: 12px 36px;
          border-radius: 4px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .sd-logout-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(139,0,0,0.5), rgba(90,0,0,0.5));
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .sd-logout-btn:hover::before { opacity: 1; }
        .sd-logout-btn:hover {
          border-color: rgba(201,168,76,0.70);
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(139,0,0,0.35);
        }

        .sd-confirm-yes {
          background: linear-gradient(135deg, #8B0000, #5A0000);
          border: 1px solid rgba(201,168,76,0.40);
          color: ${GP};
          padding: 12px 32px;
          border-radius: 4px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s;
        }
        .sd-confirm-yes:hover {
          background: linear-gradient(135deg, #6B0000, #3A0000);
          box-shadow: 0 6px 24px rgba(139,0,0,0.45);
          transform: translateY(-1px);
        }
        .sd-confirm-no {
          background: transparent;
          border: 1.5px solid rgba(201,168,76,0.30);
          color: rgba(245,228,168,0.70);
          padding: 12px 32px;
          border-radius: 4px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s;
        }
        .sd-confirm-no:hover {
          border-color: rgba(201,168,76,0.60);
          color: ${GP};
          background: rgba(201,168,76,0.06);
        }
      `}</style>

      {/* ── Background: LogoBG image ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('/LogoBG.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* ── Dark overlay layers ── */}
      {/* Base dark veil */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5,0,0,0.72)',
      }} />
      {/* Radial vignette — darker at edges, lighter in center */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(30,4,4,0.30) 0%, rgba(5,0,0,0.85) 100%)',
      }} />
      {/* Warm amber glow from bottom — mimics the desk lamps */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
        background: 'linear-gradient(to top, rgba(80,35,0,0.35) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Subtle top maroon tone */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
        background: 'linear-gradient(to bottom, rgba(40,0,0,0.55) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Decorative diagonal gold lines ── */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04, pointerEvents:'none' }}
        viewBox="0 0 1920 1080" preserveAspectRatio="none">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={i * 180 - 200} y1="0" x2={i * 180 + 400} y2="1080"
            stroke={G} strokeWidth="1" />
        ))}
      </svg>

      {/* ── Top Navigation Bar ── */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 72px',
        height: 80,
        background: 'linear-gradient(180deg, rgba(10,0,0,0.90) 0%, rgba(10,0,0,0.60) 100%)',
        borderBottom: '1px solid rgba(201,168,76,0.20)',
        backdropFilter: 'blur(12px)',
        animation: 'sd-fadeInSlow 0.8s ease both',
      }}>
        {/* Logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 46, height: 46,
            borderRadius: '50%',
            border: `1.5px solid rgba(201,168,76,0.55)`,
            background: 'rgba(201,168,76,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'sd-float 4s ease-in-out infinite',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.6">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 13, fontWeight: 700,
              color: G, letterSpacing: '0.20em',
              textTransform: 'uppercase',
            }}>PSU Library</div>
            <div style={{
              fontSize: 10, color: 'rgba(201,168,76,0.50)',
              fontFamily: "'Crimson Text', serif",
              letterSpacing: '0.10em',
            }}>Sto. Tomas Campus</div>
          </div>
        </div>

        {/* Center — live clock */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 22, fontWeight: 600,
            color: GP, letterSpacing: '0.12em',
            animation: 'sd-shimmer 3s ease-in-out infinite',
          }}>{fmtTime(time)}</div>
          <div style={{
            fontSize: 11, color: 'rgba(245,228,168,0.45)',
            fontFamily: "'Crimson Text', serif",
            letterSpacing: '0.08em', marginTop: 2,
          }}>{fmtDate(time)}</div>
        </div>

        {/* Logout button */}
        <button className="sd-logout-btn" onClick={() => setShowConfirm(true)}>
          <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </span>
        </button>
      </nav>

      {/* ── Main Content — centered welcome ── */}
      <div style={{
        flex: 1,
        position: 'relative', zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: '0 120px',
      }}>

        {/* Decorative top ornament */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18, marginBottom: 40,
          animation: 'sd-fadeIn 0.9s ease 0.1s both',
        }}>
          <div style={{
            height: 1, width: 120,
            background: `linear-gradient(to right, transparent, ${G})`,
            transformOrigin: 'right',
            animation: 'sd-line-grow 1s ease 0.4s both',
          }} />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" style={{ opacity: 0.8 }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <div style={{
            height: 1, width: 120,
            background: `linear-gradient(to left, transparent, ${G})`,
            transformOrigin: 'left',
            animation: 'sd-line-grow 1s ease 0.4s both',
          }} />
        </div>

        {/* Greeting label */}
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: 'rgba(201,168,76,0.70)',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          fontFamily: "'Cinzel', serif",
          marginBottom: 20,
          animation: 'sd-fadeIn 0.9s ease 0.2s both',
        }}>
          {greeting}
        </div>

        {/* Main welcome card */}
        <div style={{
          textAlign: 'center',
          padding: '60px 100px 64px',
          borderRadius: 6,
          border: '1px solid rgba(201,168,76,0.22)',
          background: 'linear-gradient(160deg, rgba(20,4,4,0.78) 0%, rgba(10,2,2,0.85) 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 60px rgba(139,0,0,0.18), 0 40px 100px rgba(0,0,0,0.60), inset 0 1px 0 rgba(201,168,76,0.12)',
          maxWidth: 860,
          width: '100%',
          position: 'relative',
          animation: 'sd-fadeIn 1s ease 0.3s both, sd-glow-pulse 5s ease-in-out 1.5s infinite',
        }}>
          {/* Corner brackets */}
          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
            <div key={`${v}${h}`} style={{
              position: 'absolute',
              [v]: 14, [h]: 14,
              width: 20, height: 20,
              borderTop: v === 'top' ? `1.5px solid rgba(201,168,76,0.50)` : 'none',
              borderBottom: v === 'bottom' ? `1.5px solid rgba(201,168,76,0.50)` : 'none',
              borderLeft: h === 'left' ? `1.5px solid rgba(201,168,76,0.50)` : 'none',
              borderRight: h === 'right' ? `1.5px solid rgba(201,168,76,0.50)` : 'none',
            }} />
          ))}

          {/* Book icon orb */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(201,168,76,0.18), rgba(139,0,0,0.25))',
            border: '1.5px solid rgba(201,168,76,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 30px',
            boxShadow: '0 0 30px rgba(201,168,76,0.12), 0 8px 32px rgba(0,0,0,0.40)',
            animation: 'sd-float 5s ease-in-out infinite',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.4">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>

          {/* Welcome text */}
          <div style={{
            fontSize: 13, letterSpacing: '0.30em', textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.60)',
            fontFamily: "'Cinzel', serif",
            marginBottom: 14,
            animation: 'sd-fadeIn 0.9s ease 0.5s both',
          }}>Welcome to the Library</div>

          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 52, fontWeight: 700,
            color: GP,
            letterSpacing: '0.06em',
            lineHeight: 1.15,
            margin: '0 0 10px',
            textShadow: '0 2px 24px rgba(201,168,76,0.18)',
            animation: 'sd-fadeIn 0.9s ease 0.55s both',
          }}>
            {fullName.toUpperCase()}
          </h1>

          {/* Gold divider */}
          <div style={{
            width: 80, height: 1.5,
            background: `linear-gradient(to right, transparent, ${G}, transparent)`,
            margin: '20px auto 22px',
            animation: 'sd-line-grow 1s ease 0.8s both',
          }} />

          {/* Student info */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 24, flexWrap: 'wrap',
            animation: 'sd-fadeIn 0.9s ease 0.7s both',
          }}>
            {studentNo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.55)" strokeWidth="1.8">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <span style={{
                  fontFamily: "'Crimson Text', serif",
                  fontSize: 14, color: 'rgba(245,228,168,0.55)',
                  letterSpacing: '0.08em',
                }}>ID {studentNo}</span>
              </div>
            )}
            <div style={{
              width: 1, height: 14,
              background: 'rgba(201,168,76,0.25)',
              display: studentNo ? 'block' : 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.55)" strokeWidth="1.8">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              <span style={{
                fontFamily: "'Crimson Text', serif",
                fontSize: 14, color: 'rgba(245,228,168,0.55)',
                letterSpacing: '0.04em',
              }}>{program}</span>
            </div>
          </div>

          {/* Sub message */}
          <p style={{
            fontFamily: "'Crimson Text', serif",
            fontSize: 16, fontStyle: 'italic',
            color: 'rgba(245,228,168,0.38)',
            marginTop: 28, marginBottom: 0,
            letterSpacing: '0.04em',
            lineHeight: 1.7,
            animation: 'sd-fadeIn 0.9s ease 0.85s both',
          }}>
            "A reader lives a thousand lives before he dies."
          </p>
        </div>

        {/* Bottom ornament */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18, marginTop: 40,
          animation: 'sd-fadeIn 0.9s ease 0.9s both',
        }}>
          <div style={{ height: 1, width: 80, background: `linear-gradient(to right, transparent, rgba(201,168,76,0.35))` }} />
          <div style={{
            fontSize: 10, color: 'rgba(201,168,76,0.35)',
            fontFamily: "'Cinzel', serif", letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}>Pampanga State University</div>
          <div style={{ height: 1, width: 80, background: `linear-gradient(to left, transparent, rgba(201,168,76,0.35))` }} />
        </div>
      </div>

      {/* ── Logout Confirmation Modal ── */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(160deg, rgba(22,4,4,0.98), rgba(12,2,2,0.98))',
            border: '1px solid rgba(201,168,76,0.28)',
            borderRadius: 6,
            padding: '52px 64px',
            textAlign: 'center',
            maxWidth: 480, width: '100%',
            boxShadow: '0 40px 100px rgba(0,0,0,0.70), 0 0 60px rgba(139,0,0,0.15)',
            animation: 'sd-confirm-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            position: 'relative',
          }}>
            {/* Corner brackets */}
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={`c${v}${h}`} style={{
                position: 'absolute', [v]: 12, [h]: 12,
                width: 16, height: 16,
                borderTop: v === 'top' ? `1px solid rgba(201,168,76,0.40)` : 'none',
                borderBottom: v === 'bottom' ? `1px solid rgba(201,168,76,0.40)` : 'none',
                borderLeft: h === 'left' ? `1px solid rgba(201,168,76,0.40)` : 'none',
                borderRight: h === 'right' ? `1px solid rgba(201,168,76,0.40)` : 'none',
              }} />
            ))}

            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(139,0,0,0.20)',
              border: '1.5px solid rgba(139,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.80)" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>

            <div style={{
              fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 700,
              color: GP, letterSpacing: '0.08em', marginBottom: 12,
            }}>Sign Out</div>

            <div style={{
              fontFamily: "'Crimson Text', serif", fontSize: 15,
              color: 'rgba(245,228,168,0.50)', lineHeight: 1.7,
              marginBottom: 36, letterSpacing: '0.03em',
            }}>
              Are you sure you want to sign out<br />of the PSU Library System?
            </div>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
              <button className="sd-confirm-no" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="sd-confirm-yes" onClick={onSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}