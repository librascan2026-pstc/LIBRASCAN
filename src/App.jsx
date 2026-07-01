import { useState, useEffect, useRef } from 'react'
import './App.css'
import {
  GOLD, GOLD_LIGHT, GOLD_PALE,
  MAROON, MAROON_DEEP,
  CREAM, WHITE,
  FEATURES, BENEFITS, STEPS, TEAM, SCOPE_TAGS, STAT_TARGETS,
} from './constants'

import { AuthProvider, useAuth }   from './Login_SignUp/AuthContext'
import AuthRouter                  from './Login_SignUp/AuthRouter'
import Dashboard                   from './Admin_Dashboard/Dashboard'
import StudentDashboard            from './Student_Dashboard/StudentDashboard'
import SuperAdminLayout            from './Super_Admin_Dashboard/SuperAdminLayout'
import { AppLoader }               from './PageTransition'

// ─── Icons (unchanged from original) ─────────────────────────────────────────
function QRIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="3" y="3" width="40" height="40" stroke={color} strokeWidth="7" fill="none"/>
      <rect x="15" y="15" width="16" height="16" fill={color}/>
      <rect x="57" y="3" width="40" height="40" stroke={color} strokeWidth="7" fill="none"/>
      <rect x="69" y="15" width="16" height="16" fill={color}/>
      <rect x="3" y="57" width="40" height="40" stroke={color} strokeWidth="7" fill="none"/>
      <rect x="15" y="69" width="16" height="16" fill={color}/>
      <rect x="57" y="57" width="10" height="10" fill={color}/>
      <rect x="71" y="57" width="10" height="10" fill={color}/>
      <rect x="85" y="57" width="10" height="10" fill={color}/>
      <rect x="57" y="71" width="10" height="10" fill={color}/>
      <rect x="71" y="71" width="10" height="10" fill={color}/>
      <rect x="85" y="71" width="10" height="10" fill={color}/>
      <rect x="57" y="85" width="10" height="10" fill={color}/>
      <rect x="71" y="85" width="10" height="10" fill={color}/>
      <rect x="85" y="85" width="10" height="10" fill={color}/>
    </svg>
  );
}
function AttendanceIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  );
}
function CatalogIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function DashboardIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function MobileIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}
function ShieldIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function CornerBracket({ position = 'tl', color = '#C9A84C', size = 24 }) {
  const paths = {
    tl: `M0,${size} L0,0 L${size},0`,
    tr: `M0,0 L${size},0 L${size},${size}`,
    bl: `M0,0 L0,${size} L${size},${size}`,
    br: `M0,${size} L${size},${size} L${size},0`,
  };
  const positions = {
    tl: { top: 8, left: 8 }, tr: { top: 8, right: 8 },
    bl: { bottom: 8, left: 8 }, br: { bottom: 8, right: 8 },
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      style={{ position: 'absolute', ...positions[position], opacity: 0.55 }}>
      <path d={paths[position]} stroke={color} strokeWidth="2.2"/>
    </svg>
  );
}

const ICON_MAP = {
  qr:         (size) => <QRIcon         size={size} color={GOLD} />,
  attendance: (size) => <AttendanceIcon size={size} color={GOLD} />,
  catalog:    (size) => <CatalogIcon    size={size} color={GOLD} />,
  dashboard:  (size) => <DashboardIcon  size={size} color={GOLD} />,
  mobile:     (size) => <MobileIcon     size={size} color={GOLD} />,
  shield:     (size) => <ShieldIcon     size={size} color={GOLD} />,
};

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function useInView(threshold = 0.2) {
  const ref  = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

// ─── Role Router ──────────────────────────────────────────────────────────────
// Routes the logged-in user to the correct dashboard based on their DB role.
//   super_admin     → SuperAdminLayout
//   library_manager → Dashboard (librarian dashboard)
//   student         → StudentDashboard
function RoleRouter({ user, onSignOut }) {
  const { role, profile } = useAuth();

  // Show loader until profile (and therefore accurate DB role) is resolved
  if (role === null) return <AppLoader />;

  if (role === 'super_admin') {
    return <SuperAdminLayout user={user} onSignOut={onSignOut} />;
  }

  if (role === 'library_manager' || role === 'admin') {
    return <Dashboard user={user} onSignOut={onSignOut} />;
  }

  // Default: student
  return <StudentDashboard user={user} onSignOut={onSignOut} />;
}

// ─── Landing page sections (all unchanged from original) ──────────────────────
function Navbar({ scrolled, onNavClick, onGetStarted }) {
  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="nav-brand">
        <img src="/LibraryLogo.png" alt="PSU Library Logo" className="nav-brand__logo" />
      </div>
      <div className="nav-links">
        {["features", "benefits", "process", "team"].map((id) => (
          <button key={id} className="nav-link" onClick={() => onNavClick(id)}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>
      <button className="btn-primary btn-primary--sm" onClick={onGetStarted}>
        Get Started
      </button>
    </nav>
  );
}

function HeroSection({ onNavClick, onGetStarted }) {
  return (
    <section className="hero">
      <div className="hero__bg">
        <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.04 }} viewBox="0 0 1440 900" preserveAspectRatio="none">
          {Array.from({length:12}).map((_,i) => (
            <line key={i} x1={i*130} y1="0" x2={i*130-400} y2="900" stroke={GOLD} strokeWidth="1"/>
          ))}
        </svg>
      </div>
      <div className="hero__grid">
        <div style={{textAlign:"left"}}>
          <div className="hero-animate section-label" style={{marginBottom:28}}>BSIT Capstone Project · 2026</div>
          <h1 className="hero-animate-2 hero__title" style={{color:"#fff",marginBottom:8}}>Library</h1>
          <h1 className="hero__title gold-shimmer" style={{marginBottom:8}}>Management</h1>
          <h1 className="hero-animate-2 hero__title" style={{color:"#fff",marginBottom:32}}>System</h1>
          <p className="hero-animate-3 hero__subtitle">
            Development and implementation of a QR code-based library management system with online public access
            catalog and attendance monitoring of Pampanga State University, Sto. Tomas Campus.
          </p>
          <div className="hero-animate-4 hero__ctas">
            <button className="btn-primary" onClick={() => onNavClick("features")}>Explore Features</button>
            <button className="btn-secondary" onClick={onGetStarted} style={{marginLeft:12}}>Get Started</button>
          </div>
        </div>
        <div className="qr-visual">
          <div className="qr-frame floating">
            <CornerBracket position="tl" color={GOLD} size={32}/>
            <CornerBracket position="tr" color={GOLD} size={32}/>
            <CornerBracket position="bl" color={GOLD} size={32}/>
            <CornerBracket position="br" color={GOLD} size={32}/>
            <div className="qr-frame__inner">
              <span className="qr-decoration">
                <QRIcon size={160} color={GOLD}/>
                <div className="qr-scan-line"/>
              </span>
              <div className="qr-caption">Scan · Manage · Track</div>
            </div>
            <div className="qr-badge qr-badge--tl">
              <div className="qr-badge__title">Book Checked Out</div>
              <div className="qr-badge__sub">Just now</div>
            </div>
            <div className="qr-badge qr-badge--br">
              <div className="qr-badge__title">Attendance Logged</div>
              <div className="qr-badge__sub">2 min ago</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const [ref, inView] = useInView(0.3);
  return (
    <section ref={ref} className="stats">
      <div className="stats__grid">
        {STAT_TARGETS.map(({ label, target, suffix }) => {
          const count = useCountUp(target, 2000, inView);
          return (
            <div key={label} className="stat-item">
              <div className="stat-item__value">{count}{suffix}</div>
              <div className="stat-item__label">{label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="features">
      <div style={{textAlign:'center', marginBottom:48}}>
        <div className="section-label" style={{justifyContent:'center', marginBottom:16}}>Core Capabilities</div>
        <h2 className="features__title">System <span style={{color:GOLD}}>Features</span></h2>
      </div>
      <div className="features__grid">
        {FEATURES.map(({iconKey,title,desc}) => (
          <div key={title} className="feature-card">
            <CornerBracket position="tl"/>
            <CornerBracket position="br"/>
            <div className="feature-card__icon">{ICON_MAP[iconKey]?.(44)}</div>
            <h3 className="feature-card__title">{title}</h3>
            <p className="feature-card__desc">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section id="benefits" className="benefits">
      <div className="benefits__inner">
        <div>
          <div className="section-label" style={{marginBottom:16}}>Why LibraScan</div>
          <h2 className="benefits__title">Built for <span style={{color:GOLD}}>Efficiency</span></h2>
          <div style={{display:'flex', flexDirection:'column', gap:16, marginTop:32}}>
            {Object.values(BENEFITS).map(({title, points}) => (
              <div key={title} className="benefit-item">
                <div className="benefit-item__dot"/>
                <div>
                  <div className="benefit-item__title">{title}</div>
                  {points && points.map((p, i) => (
                    <div key={i} className="benefit-item__desc">• {p}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScopeSection() {
  return (
    <section className="scope">
      <div className="section-label" style={{justifyContent:'center', marginBottom:20}}>Scope & Delimitation</div>
      <h2 className="scope__title">What's <span style={{color:GOLD}}>Covered</span></h2>
      <p className="scope__desc">
        The PSU Library Management System covers the following platforms and modules,
        designed exclusively for Pampanga State University, Sto. Tomas Campus.
      </p>
      <div className="scope__tags-grid">
        {SCOPE_TAGS.map((tag) => (
          <div key={tag.label} className="scope-tag-item">
            <span className="scope-tag-dot" style={{background: tag.accent}}/>
            <span className="scope-tag-label">{tag.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="process" className="process">
      <div style={{textAlign:'center', marginBottom:20}}>
        <div className="section-label" style={{justifyContent:'center', marginBottom:20}}>How It Works</div>
        <h2 className="process__title">Development <span style={{color:GOLD}}>Process</span></h2>
      </div>
      <div style={{maxWidth:900, margin:'0 auto'}}>
        {STEPS.map(({num,title,desc}) => (
          <div key={num} className="process-step">
            <div className="process-step__num">{num}</div>
            <div>
              <h3 className="process-step__title">{title}</h3>
              <p className="process-step__desc">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const PHOTO_MAP = {
  Bondoc:   'Bondoc.jpg',
  Pineda:   'Pineda.jpg',
  Lacap:    'Lacap.jpg',
  Mata:     'Mata.jpg',
  Balagtas: 'Balagtas.jpg',
};
const ROLE_MAP = {
  Bondoc:   'Developer',
  Pineda:   'Developer',
  Lacap:    'Developer',
  Mata:     'Developer',
  Balagtas: 'Developer',
};

function TeamSection() {
  return (
    <section id="team" className="team">
      <div className="team__bg">
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.04}} viewBox="0 0 1440 900" preserveAspectRatio="none">
          {Array.from({length:14}).map((_,i) => (
            <line key={i} x1={i*110} y1="0" x2={i*110-300} y2="900" stroke={GOLD} strokeWidth="1"/>
          ))}
        </svg>
        <div className="team__bg-glow"/>
      </div>
      <div className="team__header">
        <div className="section-label" style={{justifyContent:"center",marginBottom:20}}>The Proponents</div>
        <h2 className="team__title">Meet the <span style={{color:GOLD_LIGHT}}>Developers</span></h2>
        <p className="team__subtitle">A dedicated team of BSIT students from Pampanga State University,<br/>Sto. Tomas Campus, Class of 2026.</p>
      </div>
      <div className="team__ornament">
        <span className="team__ornament-line"/>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="5" width="6" height="6" stroke={GOLD} strokeWidth="1.5" fill="none"/>
          <rect x="13" y="5" width="6" height="6" stroke={GOLD} strokeWidth="1.5" fill="none"/>
          <rect x="5" y="13" width="6" height="6" stroke={GOLD} strokeWidth="1.5" fill="none"/>
          <rect x="13" y="13" width="6" height="6" stroke={GOLD} strokeWidth="1.5" fill="none"/>
        </svg>
        <span className="team__ornament-line"/>
      </div>
      <div className="team__grid">
        {TEAM.map(({name,contact},index) => {
          const parts     = name.split(" ");
          const lastName  = parts[parts.length-1] || parts[0];
          const photo     = PHOTO_MAP[lastName] || null;
          const role      = ROLE_MAP[lastName]  || "Developer";
          const initials  = parts.filter(p=>p.length>1&&!p.includes(".")).map(p=>p[0]).slice(0,2).join("");
          return (
            <div key={name} className="team-member" style={{animationDelay:`${index*0.1}s`}}>
              <div className="team-member__photo-ring">
                <div className="team-member__photo-wrap">
                  {photo
                    ? <img src={`/${photo}`} alt={name} className="team-member__photo"/>
                    : <div className="team-member__avatar"><span>{initials}</span></div>
                  }
                </div>
              </div>
              <div className="team-member__info">
                <h3 className="team-member__name">{name}</h3>
                <div className="team-member__role">{role}</div>
                <div className="team-member__divider"/>
                <div className="team-member__contact">{contact}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">PSU Library Management System</div>
          <div className="footer__sub">Pampanga State University · Sto. Tomas Campus · BSIT Capstone 2026</div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main app shell ───────────────────────────────────────────────────────────
function LandingApp() {
  const [scrolled, setScrolled] = useState(false);
  const [authPage, setAuthPage] = useState(() => {
    if (window.location.hash.includes('type=recovery')) return 'forgot-password';
    return null;
  });
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handle = () => {
      if (window.location.hash.includes('type=recovery')) setAuthPage('forgot-password');
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = document.querySelector('.nav')?.offsetHeight || 80;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  if (loading) return <AppLoader />;

  // Logged-in user → route to correct dashboard by DB role
  if (user) return <RoleRouter user={user} onSignOut={signOut} />;

  // Auth pages (login / signup / forgot / reset)
  if (authPage !== null) {
    return (
      <AuthRouter
        initialPage={authPage}
        onLoginSuccess={() => setAuthPage(null)}
        onGoLanding={() => setAuthPage(null)}
      />
    );
  }

  // Landing page
  return (
    <>
      <Navbar scrolled={scrolled} onNavClick={scrollTo} onGetStarted={() => setAuthPage('login')} />
      <HeroSection onNavClick={scrollTo} onGetStarted={() => setAuthPage('login')} />
      <StatsSection/>
      <FeaturesSection/>
      <BenefitsSection/>
      <ScopeSection/>
      <ProcessSection/>
      <TeamSection/>
      <Footer/>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LandingApp/>
    </AuthProvider>
  );
}