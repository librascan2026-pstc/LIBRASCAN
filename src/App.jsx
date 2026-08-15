import { useState, useEffect, useRef } from 'react'
import './App.css'
import {
  GOLD, GOLD_LIGHT, GOLD_PALE,
  MAROON, MAROON_DEEP,
  CREAM, WHITE,
  FEATURES, BENEFITS, STEPS, TEAM, SCOPE_TAGS, STAT_TARGETS,
} from './constants'
import { QR_URL, QR_SIZE, QR_RECTS } from './qrData'

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
// ─── Persona icons used on the "Built for Efficiency" benefit cards ──────────
function GraduationCapIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5z"/>
      <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>
      <path d="M22 10v6"/>
    </svg>
  );
}
function ClipboardCheckIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="3.5" width="12" height="18" rx="2"/>
      <path d="M9 3.5V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v.5"/>
      <path d="M9 13.5l2 2 4-4.5"/>
    </svg>
  );
}
function ChartAdminIcon({ size = 44, color = '#C9A84C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10"/>
      <path d="M12 20V4"/>
      <path d="M20 20v-7"/>
      <path d="M2.5 20h19"/>
    </svg>
  );
}
function CheckBadgeIcon({ size = 15, color = '#8B0000' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="currentColor" style={{ color: 'var(--gold-light)' }}/>
      <path d="M7 12.5l3 3 7-7.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Matches a benefit card's title to the persona icon it represents. Falls
// back to a neutral icon so new/renamed personas in constants.js never
// render blank.
function benefitIconFor(title = '') {
  const t = title.toLowerCase();
  if (t.includes('student'))       return GraduationCapIcon;
  if (t.includes('staff') || t.includes('librarian')) return ClipboardCheckIcon;
  if (t.includes('admin'))         return ChartAdminIcon;
  return GraduationCapIcon;
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

// Renders the ACTUAL scannable QR code (encodes the app download link) using
// the pre-generated module matrix in qrData.js. Colors are pulled straight
// from the site palette, but kept high-contrast so real cameras can read it.
function LiteralQRCode({ size = 168 }) {
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
      role="img"
      aria-label="QR code to download the app"
    >
      <rect x="0" y="0" width={QR_SIZE} height={QR_SIZE} fill={CREAM} />
      {QR_RECTS.map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={MAROON_DEEP} />
      ))}
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
function Navbar({ scrolled, onNavClick, onGetStarted, onLogoClick }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu automatically if the viewport is resized back up
  // to desktop width (e.g. rotating a tablet, or resizing a browser window).
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 640) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navIds = ["features", "benefits", "process", "team"];

  const handleNav = (id) => {
    setMenuOpen(false);
    onNavClick(id);
  };
  const handleGetStarted = () => {
    setMenuOpen(false);
    onGetStarted();
  };
  const handleLogoClick = () => {
    setMenuOpen(false);
    onLogoClick();
  };

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}${menuOpen ? " nav--open" : ""}`}>
      <button
        type="button"
        className="nav-brand"
        onClick={handleLogoClick}
        aria-label="Go to home"
      >
        <img src="/LibraryLogo.png" alt="PSU Library Logo" className="nav-brand__logo" />
      </button>

      <div className="nav-links">
        {navIds.map((id) => (
          <button key={id} className="nav-link" onClick={() => handleNav(id)}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      <button className="btn-primary btn-primary--sm nav-cta-desktop" onClick={handleGetStarted}>
        Get Started
      </button>

      <button
        type="button"
        className={`nav-toggle${menuOpen ? " nav-toggle--open" : ""}`}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span/><span/><span/>
      </button>

      <div
        id="mobile-nav-menu"
        className={`nav-mobile-menu${menuOpen ? " nav-mobile-menu--open" : ""}`}
      >
        {navIds.map((id) => (
          <button key={id} className="nav-mobile-link" onClick={() => handleNav(id)}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
        <button className="btn-primary nav-mobile-cta" onClick={handleGetStarted}>
          Get Started
        </button>
      </div>
    </nav>
  );
}

// Shown instead of navigating to QR_URL — the APK build isn't ready for
// public download yet, so scanning/clicking the QR opens this notice.
function UnderConstructionModal({ onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="uc-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="uc-modal-title"
      onClick={onClose}
    >
      <div className="uc-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="uc-modal__close"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="uc-modal__icon">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6">
            <path d="M12 9v4" strokeLinecap="round"/>
            <path d="M12 17h.01" strokeLinecap="round"/>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
        </div>
        <div className="section-label" style={{justifyContent:"center", marginBottom:14}}> Mobile App</div>
        <h3 id="uc-modal-title" className="uc-modal__title">Under Construction</h3>
        <p className="uc-modal__desc">
          The LibraScan mobile app isn't ready for download just yet. Our team is putting on
          the finishing touches please check back soon.
        </p>
        <button type="button" className="btn-primary" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function HeroSection({ onNavClick, onGetStarted }) {
  const [showUnderConstruction, setShowUnderConstruction] = useState(false);

  return (
    <section className="hero" id="home">
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
            catalog and attendance monitoring of Pampanga State University.
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
              <button
                type="button"
                className="qr-code-panel"
                aria-label="App download is under construction"
                onClick={() => setShowUnderConstruction(true)}
              >
                <LiteralQRCode size={168}/>
                <div className="qr-scan-line"/>
              </button>
              <div className="qr-caption">Scan to download the app</div>

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
      {showUnderConstruction && (
        <UnderConstructionModal onClose={() => setShowUnderConstruction(false)} />
      )}
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

// Small arrow used on the benefit-card CTA — slides right on hover via CSS.
function ArrowRightIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="M13 6l6 6-6 6"/>
    </svg>
  );
}

function BenefitsSection({ onNavClick }) {
  const [ref, inView] = useInView(0.2);
  return (
    <section id="benefits" className="benefits">
      <div className="benefits__inner">
        <div>
          <div className="benefits__header">
            <div className="section-label" style={{justifyContent:'center', marginBottom:16}}>Why LibraScan</div>
            <h2 className="benefits__title">Built for <span style={{color:GOLD}}>Efficiency</span></h2>
            <p className="benefits__subtitle">
              One system, built to move faster for everyone who touches the library
              from the student browsing the shelves to the admin reading the reports.
            </p>
          </div>
          <div ref={ref} className={`benefits__cards${inView ? ' benefits__cards--visible' : ''}`}>
            {Object.values(BENEFITS).map(({title, points}, index) => {
              const Icon = benefitIconFor(title);
              return (
                <div key={title} className="benefit-item">
                  <span className="benefit-item__sheen" aria-hidden="true"/>
                  <CornerBracket position="tl"/>
                  <CornerBracket position="br"/>
                  <div className="benefit-item__index">{String(index + 1).padStart(2, '0')}</div>
                  
                  <div className="benefit-item__title">{title}</div>
                  <div className="benefit-item__rule"/>
                  <div className="benefit-item__list">
                    {points && points.map((p, i) => (
                      <div key={i} className="benefit-item__desc" style={{transitionDelay:`${i * 0.05}s`}}>
                        <span className="benefit-item__check"><CheckBadgeIcon size={15}/></span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                 
                </div>
              );
            })}
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

// ─── Top-level URL routing ────────────────────────────────────────────────────
// Real, addressable browser URLs for the auth flow and each dashboard, using
// the native History API (same pattern as SuperAdminLayout's internal tabs):
//   /               → landing page (sections addressable via #features, #benefits, ...)
//   /login          → LoginPage
//   /signup         → SignupPage
//   /forgot-password → ForgotPasswordPage
//   /reset-password  → ResetPasswordPage
//   /admin          → Dashboard (library_manager / admin)
//   /student        → StudentDashboard
//   /superadmin*    → SuperAdminLayout (manages its own sub-paths already)
const AUTH_PATH_BY_PAGE = {
  'login':            '/login',
  'signup':           '/signup',
  'forgot-password':  '/forgot-password',
  'reset-password':   '/reset-password',
};
const AUTH_PAGE_BY_PATH = Object.fromEntries(
  Object.entries(AUTH_PATH_BY_PAGE).map(([key, path]) => [path, key])
);
const DASHBOARD_PATH_BY_ROLE = {
  super_admin:     '/superadmin',
  library_manager: '/admin',
  admin:           '/admin',
  student:         '/student',
};

function authPageFromPath(pathname) {
  return AUTH_PAGE_BY_PATH[pathname] || null;
}

// ─── Main app shell ───────────────────────────────────────────────────────────
function LandingApp() {
  const [scrolled, setScrolled] = useState(false);
  const [authPage, setAuthPage] = useState(() => {
    if (window.location.hash.includes('type=recovery')) return 'forgot-password';
    return authPageFromPath(window.location.pathname);
  });
  const { user, role, loading, signOut } = useAuth();

  // Move to an auth screen (or back to "/" when passed null), keeping the
  // address bar in sync via the native History API.
  const goToAuth = (page) => {
    const targetPath = page ? AUTH_PATH_BY_PAGE[page] : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ authPage: page }, '', targetPath);
    }
    setAuthPage(page);
  };

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

  // Keep the top-level screen in sync with browser Back/Forward navigation
  // between "/", the auth paths, and the dashboard paths.
  useEffect(() => {
    const onPopState = () => {
      if (window.location.hash.includes('type=recovery')) { setAuthPage('forgot-password'); return; }
      setAuthPage(authPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Once a logged-in user's DB role has resolved, point the address bar at
  // that dashboard's own path (e.g. /admin, /student, /superadmin) so it's
  // bookmarkable and reloads land in the right place.
  useEffect(() => {
    if (!user || role === null) return;
    const targetPath = DASHBOARD_PATH_BY_ROLE[role] || '/student';
    if (!window.location.pathname.startsWith(targetPath)) {
      window.history.replaceState({}, '', targetPath);
    }
  }, [user, role]);

  // Redirect straight dashboard-path visits back to /login when signed out
  // (e.g. someone bookmarked /admin or /superadmin).
  useEffect(() => {
    if (loading || user) return;
    const dashboardPaths = Object.values(DASHBOARD_PATH_BY_ROLE);
    if (dashboardPaths.some(p => window.location.pathname.startsWith(p))) {
      goToAuth('login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.history.pushState(null, '', `#${id}`);
    const navHeight = document.querySelector('.nav')?.offsetHeight || 80;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // Logo click: navigate to the #home route (top of the landing page),
  // using the same addressable-anchor pattern as the other nav links.
  const goHome = () => scrollTo('home');

  // On first load of the landing page, honor a section anchor already in
  // the URL (e.g. arriving at /#features from an external link).
  useEffect(() => {
    if (user || authPage) return;
    const id = window.location.hash.replace('#', '');
    if (!id || window.location.hash.includes('type=recovery')) return;
    const el = document.getElementById(id);
    if (el) {
      const navHeight = document.querySelector('.nav')?.offsetHeight || 80;
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authPage]);

  if (loading) return <AppLoader />;

  // Logged-in user → route to correct dashboard by DB role
  if (user) return <RoleRouter user={user} onSignOut={signOut} />;

  // Auth pages (login / signup / forgot / reset)
  if (authPage !== null) {
    return (
      <AuthRouter
        initialPage={authPage}
        onLoginSuccess={() => goToAuth(null)}
        onGoLanding={() => goToAuth(null)}
      />
    );
  }

  // Landing page
  return (
    <>
      <Navbar scrolled={scrolled} onNavClick={scrollTo} onGetStarted={() => goToAuth('login')} onLogoClick={goHome} />
      <HeroSection onNavClick={scrollTo} onGetStarted={() => goToAuth('login')} />
      <StatsSection/>
      <FeaturesSection/>
      <BenefitsSection onNavClick={scrollTo}/>
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