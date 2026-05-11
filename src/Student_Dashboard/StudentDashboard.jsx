// src/Student_Dashboard/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import '../Admin_Dashboard/Dashboard.css';

export default function StudentDashboard({ user, onSignOut }) {
  const [time, setTime]               = useState(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [visible, setVisible]         = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Student';
  const lastName  = user?.user_metadata?.last_name  || '';
  const fullName  = (`${firstName} ${lastName}`).trim();
  const program   = user?.user_metadata?.program || 'Bachelor of Science in Information Technology';
  const studentNo = user?.user_metadata?.student_number || user?.user_metadata?.username || '';

  const hour    = time.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const fmtTime = d => d.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
  const fmtDate = d => d.toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const G  = '#C9A84C';
  const GP = '#F5E4A8';

  return (
    <>
      <style>{`
        @keyframes sd-up    { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sd-fade  { from{opacity:0} to{opacity:1} }
        @keyframes sd-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes sd-pulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes sd-glow  { 0%,100%{box-shadow:0 0 50px rgba(123,0,0,.20),0 0 90px rgba(201,168,76,.07)}
                              50%    {box-shadow:0 0 80px rgba(123,0,0,.32),0 0 150px rgba(201,168,76,.13)} }
        @keyframes sd-line  { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes sd-modal { from{opacity:0;transform:scale(.93) translateY(14px)}
                              to  {opacity:1;transform:scale(1)   translateY(0)} }

        .sd-logout-btn {
          display:flex; align-items:center; gap:8px;
          padding:10px 26px;
          background:rgba(90,0,0,0.32);
          border:1.5px solid rgba(201,168,76,0.38);
          border-radius:4px;
          color:${GP};
          font-family:'Cinzel',serif;
          font-size:11px; font-weight:600;
          letter-spacing:.18em; text-transform:uppercase;
          cursor:pointer; transition:all .24s;
          position:relative; overflow:hidden;
          z-index:0;
        }
        .sd-logout-btn::after {
          content:''; position:absolute; inset:0;
          background:rgba(100,0,0,.45); opacity:0; transition:opacity .24s; z-index:-1;
        }
        .sd-logout-btn:hover { border-color:rgba(201,168,76,.65); transform:translateY(-1px); box-shadow:0 8px 28px rgba(80,0,0,.45); }
        .sd-logout-btn:hover::after { opacity:1; }

        .sd-cancel-btn {
          padding:11px 30px;
          background:transparent;
          border:1.5px solid rgba(201,168,76,0.26);
          border-radius:4px;
          color:rgba(245,228,168,.60);
          font-family:'Cinzel',serif;
          font-size:10.5px; font-weight:500;
          letter-spacing:.14em; text-transform:uppercase;
          cursor:pointer; transition:all .22s;
        }
        .sd-cancel-btn:hover { border-color:rgba(201,168,76,.55); color:${GP}; background:rgba(201,168,76,.06); }

        .sd-signout-btn {
          padding:11px 30px;
          background:linear-gradient(135deg,#8B0000,#5A0000);
          border:1px solid rgba(201,168,76,0.32);
          border-radius:4px;
          color:${GP};
          font-family:'Cinzel',serif;
          font-size:10.5px; font-weight:600;
          letter-spacing:.14em; text-transform:uppercase;
          cursor:pointer; transition:all .22s;
        }
        .sd-signout-btn:hover { background:linear-gradient(135deg,#6B0000,#3A0000); transform:translateY(-1px); box-shadow:0 6px 22px rgba(80,0,0,.55); }
      `}</style>

      {/* ─── Root ─── */}
      <div style={{
        position:'fixed', inset:0,
        width:'100vw', height:'100vh',
        display:'flex', flexDirection:'column',
        fontFamily:"'Cinzel','Cormorant Garamond',serif",
        overflow:'hidden',
      }}>

        {/* BG image */}
        <div style={{
          position:'absolute', inset:0, zIndex:0,
          backgroundImage:"url('/LogoBG.png')",
          backgroundSize:'cover', backgroundPosition:'center',
        }}/>

        {/* Dark veil */}
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'rgba(6,0,0,0.72)' }}/>

        {/* Radial vignette */}
        <div style={{ position:'absolute', inset:0, zIndex:2, background:'radial-gradient(ellipse 72% 62% at 50% 50%, rgba(18,2,2,.18) 0%, rgba(3,0,0,.90) 100%)' }}/>

        {/* Amber lamp glow */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'38%', zIndex:3, background:'linear-gradient(to top, rgba(65,26,0,.28) 0%, transparent 100%)', pointerEvents:'none' }}/>

        {/* Diagonal lines */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.030, zIndex:4, pointerEvents:'none' }}
          viewBox="0 0 1920 1080" preserveAspectRatio="none">
          {Array.from({length:14}).map((_,i) => (
            <line key={i} x1={i*150-100} y1="0" x2={i*150+500} y2="1080" stroke={G} strokeWidth="1"/>
          ))}
        </svg>

        {/* ═══════════ TOP BAR ═══════════ */}
        <header style={{
          position:'relative', zIndex:10, flexShrink:0,
          height:72,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 64px',
          background:'linear-gradient(180deg,rgba(8,0,0,0.94) 0%,rgba(6,0,0,0.68) 100%)',
          borderBottom:'1px solid rgba(201,168,76,0.16)',
          backdropFilter:'blur(14px)',
          animation: visible ? 'sd-fade .7s ease both' : 'none',
        }}>

          {/* Left — Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:44, height:44, borderRadius:'50%',
              background:'rgba(201,168,76,0.09)',
              border:'1.5px solid rgba(201,168,76,0.38)',
              display:'flex', alignItems:'center', justifyContent:'center',
              animation:'sd-float 4.5s ease-in-out infinite',
              overflow:'hidden',
            }}>
              <img src="/LibraryLogo.png" alt="logo"
                style={{ width:30, height:30, objectFit:'contain' }}
                onError={e => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${G}" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
                }}
              />
            </div>
            
          </div>

          {/* Center — Clock */}
          <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', textAlign:'center' }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:19, fontWeight:600, color:GP, letterSpacing:'.10em', animation:'sd-pulse 3s ease-in-out infinite' }}>
              {fmtTime(time)}
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:11, color:'rgba(245,228,168,0.38)', letterSpacing:'.07em', marginTop:2 }}>
              {fmtDate(time)}
            </div>
          </div>

          {/* Right — Sign Out */}
          <button className="sd-logout-btn" onClick={() => setShowConfirm(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </header>

        {/* ═══════════ CENTRE CONTENT ═══════════ */}
        <main style={{
          flex:1, position:'relative', zIndex:10,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'36px 80px',
        }}>

          {/* Greeting */}
          <div style={{
            fontSize:11, fontWeight:500,
            color:'rgba(201,168,76,0.60)',
            letterSpacing:'.32em', textTransform:'uppercase',
            fontFamily:"'Cinzel',serif",
            marginBottom:20,
            animation: visible ? 'sd-up .8s ease .08s both' : 'none',
          }}>{greeting}</div>

          {/* ── Welcome card ── */}
          <div style={{
            width:'100%', maxWidth:800,
            padding:'54px 84px 58px',
            borderRadius:6,
            background:'linear-gradient(155deg,rgba(16,2,2,0.84) 0%,rgba(7,1,1,0.90) 100%)',
            border:'1px solid rgba(201,168,76,0.20)',
            backdropFilter:'blur(24px)',
            textAlign:'center',
            position:'relative',
            boxShadow:'0 1px 0 rgba(201,168,76,0.10) inset, 0 40px 100px rgba(0,0,0,0.68)',
            animation: visible ? 'sd-up .9s ease .16s both, sd-glow 6s ease-in-out 2.2s infinite' : 'none',
          }}>

            {/* Corner brackets */}
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={v+h} style={{
                position:'absolute', [v]:13, [h]:13, width:18, height:18,
                borderTop:    v==='top'    ? '1.5px solid rgba(201,168,76,0.42)' : 'none',
                borderBottom: v==='bottom' ? '1.5px solid rgba(201,168,76,0.42)' : 'none',
                borderLeft:   h==='left'   ? '1.5px solid rgba(201,168,76,0.42)' : 'none',
                borderRight:  h==='right'  ? '1.5px solid rgba(201,168,76,0.42)' : 'none',
              }}/>
            ))}

            {/* Horizontal rule with avatar orb */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:20, marginBottom:30,
              animation: visible ? 'sd-up .8s ease .26s both' : 'none',
            }}>
              <div style={{ height:1, width:90, background:`linear-gradient(to right,transparent,${G})`, transformOrigin:'right', animation: visible ? 'sd-line .9s ease .55s both' : 'none' }}/>
              <div style={{
                width:80, height:80, borderRadius:'50%', flexShrink:0,
                background:'radial-gradient(circle at 35% 35%,rgba(201,168,76,0.18),rgba(110,0,0,0.28))',
                border:'1.5px solid rgba(201,168,76,0.36)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 0 26px rgba(201,168,76,0.10), 0 8px 30px rgba(0,0,0,0.42)',
                animation:'sd-float 5s ease-in-out infinite',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.4">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div style={{ height:1, width:90, background:`linear-gradient(to left,transparent,${G})`, transformOrigin:'left', animation: visible ? 'sd-line .9s ease .55s both' : 'none' }}/>
            </div>

            {/* Label */}
            <div style={{
              fontSize:10.5, letterSpacing:'.28em', textTransform:'uppercase',
              color:'rgba(201,168,76,0.52)', fontFamily:"'Cinzel',serif",
              marginBottom:12,
              animation: visible ? 'sd-up .8s ease .33s both' : 'none',
            }}>Welcome to the Library</div>

            {/* Name */}
            <h1 style={{
              fontFamily:"'Cinzel',serif",
              fontSize:44, fontWeight:700,
              color:GP, letterSpacing:'.06em', lineHeight:1.18,
              margin:'0 0 6px',
              textShadow:'0 2px 18px rgba(201,168,76,0.15)',
              animation: visible ? 'sd-up .9s ease .38s both' : 'none',
            }}>
              {fullName.toUpperCase() || 'STUDENT'}
            </h1>

            {/* Gold divider */}
            <div style={{
              width:68, height:1.5,
              background:`linear-gradient(to right,transparent,${G},transparent)`,
              margin:'17px auto 18px',
              animation: visible ? 'sd-line 1s ease .62s both' : 'none',
            }}/>

            {/* Info chips */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:18, flexWrap:'wrap',
              animation: visible ? 'sd-up .8s ease .46s both' : 'none',
            }}>
              {studentNo && <>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.48)" strokeWidth="1.8">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, color:'rgba(245,228,168,0.48)', letterSpacing:'.06em' }}>
                    ID {studentNo}
                  </span>
                </div>
                <div style={{ width:1, height:12, background:'rgba(201,168,76,0.20)' }}/>
              </>}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.48)" strokeWidth="1.8">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, color:'rgba(245,228,168,0.48)', letterSpacing:'.04em' }}>
                  {program}
                </span>
              </div>
            </div>

           
           
          </div>

          {/* Bottom ornament */}
          <div style={{
            display:'flex', alignItems:'center', gap:14, marginTop:28,
            animation: visible ? 'sd-up .8s ease .68s both' : 'none',
          }}>
            <div style={{ height:1, width:56, background:`linear-gradient(to right,transparent,rgba(201,168,76,0.26))` }}/>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:'rgba(201,168,76,0.28)', letterSpacing:'.22em', textTransform:'uppercase' }}>
              Pampanga State University · Sto. Tomas Campus
            </span>
            <div style={{ height:1, width:56, background:`linear-gradient(to left,transparent,rgba(201,168,76,0.26))` }}/>
          </div>
        </main>
      </div>

      {/* ══════════ SIGN OUT MODAL ══════════ */}
      {showConfirm && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'rgba(0,0,0,0.80)',
          backdropFilter:'blur(14px)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }} onClick={() => setShowConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width:430,
            background:'linear-gradient(155deg,rgba(18,2,2,0.98),rgba(9,1,1,0.98))',
            border:'1px solid rgba(201,168,76,0.22)',
            borderRadius:6,
            padding:'50px 54px',
            textAlign:'center',
            boxShadow:'0 40px 100px rgba(0,0,0,0.78),0 0 60px rgba(110,0,0,0.18)',
            animation:'sd-modal .30s cubic-bezier(0.34,1.56,0.64,1) both',
            position:'relative',
          }}>
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={v+h} style={{
                position:'absolute', [v]:12, [h]:12, width:15, height:15,
                borderTop:    v==='top'    ? '1px solid rgba(201,168,76,0.36)' : 'none',
                borderBottom: v==='bottom' ? '1px solid rgba(201,168,76,0.36)' : 'none',
                borderLeft:   h==='left'   ? '1px solid rgba(201,168,76,0.36)' : 'none',
                borderRight:  h==='right'  ? '1px solid rgba(201,168,76,0.36)' : 'none',
              }}/>
            ))}

            <div style={{
              width:52, height:52, borderRadius:'50%',
              background:'rgba(110,0,0,0.22)',
              border:'1.5px solid rgba(110,0,0,0.48)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px',
            }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.78)" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>

            <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, fontWeight:700, color:GP, letterSpacing:'.08em', marginBottom:10 }}>
              Sign Out
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'rgba(245,228,168,0.46)', lineHeight:1.78, marginBottom:32, letterSpacing:'.03em' }}>
              Are you sure you want to sign out<br/>of the PSU Library System?
            </div>

            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button className="sd-cancel-btn"  onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="sd-signout-btn" onClick={onSignOut}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}