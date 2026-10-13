import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import {
  GOLD, MAROON_DEEP, WHITE,
  NAV_LINKS, SECTION_COPY, STAT_TARGETS, FEATURES, PORTALS,
  APP_SCREENSHOTS, FAQS, ADVISER, TEAM, CAMPUSES,
} from './constants'
import { QR_URL, IS_QR_A_LINK, QR_SIZE, QR_RECTS } from './qrData'
import { supabase } from './supabaseClient'

import { AuthProvider }            from './Login_SignUp/AuthContext'
import { useAuth }                 from './Login_SignUp/useAuth'
import AuthRouter                  from './Login_SignUp/AuthRouter'
import Dashboard                   from './Admin_Dashboard/Dashboard'
import StudentDashboard            from './Student_Dashboard/StudentDashboard'
import SuperAdminLayout            from './Super_Admin_Dashboard/SuperAdminLayout'
import { AppLoader }               from './PageTransition'

// ─── Helpers & hooks ──────────────────────────────────────────────────────────
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    if (prefersReducedMotion()) { setCount(target); return }
    let raf
    let t0 = null
    const step = (ts) => {
      if (t0 === null) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return count
}

// Live numbers for the hero stats card: books in the approved catalog and
// registered users. Uses the get_landing_stats() database function (see
// landing_stats.sql) so it works for signed-out visitors; falls back to direct
// counts if the function isn't installed. Unknown values stay null → "—".
function useLandingStats() {
  const [stats, setStats] = useState({ books: null, users: null })
  useEffect(() => {
    let cancelled = false
    const apply = (books, users) => {
      if (cancelled) return
      setStats({
        books: Number.isFinite(books) ? books : null,
        users: Number.isFinite(users) ? users : null,
      })
    }
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('get_landing_stats')
        if (!error && data) {
          const d = typeof data === 'string' ? JSON.parse(data) : data
          apply(Number(d.books), Number(d.users))
          return
        }
      } catch (_) { /* fall through to direct counts */ }
      try {
        const [b, u] = await Promise.all([
          supabase.from('books').select('id', { count: 'exact', head: true })
            .or('registration_status.is.null,registration_status.neq.pending'),
          supabase.from('profiles').select('id', { count: 'exact', head: true })
            .neq('role', 'super_admin'),
        ])
        // A count of 0 for a signed-out visitor usually means row-level
        // security is hiding the rows, so treat it as "unknown".
        apply(b.error || !b.count ? NaN : b.count, u.error || !u.count ? NaN : u.count)
      } catch (_) { apply(NaN, NaN) }
    })()
    return () => { cancelled = true }
  }, [])
  return stats
}

// Fades + rises its children into place the first time they scroll into view.
function Reveal({ as: Tag = 'div', className = '', index = 0, children, ...rest }) {
  const [ref, inView] = useInView(0.12)
  return (
    <Tag
      ref={ref}
      className={`ls-reveal${inView ? ' is-in' : ''}${className ? ' ' + className : ''}`}
      style={{ '--i': index }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

function SectionHeading({ id, lead, accent, sub }) {
  return (
    <Reveal className="ls-heading">
      <h2 id={id}>
        {lead && <span className="ls-heading__lead">{lead} </span>}
        <span className="ls-heading__accent">{accent}</span>
      </h2>
      <p className="ls-heading__sub">{sub}</p>
    </Reveal>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function FeatureIcon({ name, size = 46 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  switch (name) {
    case 'scan':
      return (
        <svg {...common}>
          <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/>
          <path d="M7.5 8.5h9v7h-9zM12 8.5v7M9 11h1.5M13.5 11H15"/>
        </svg>
      )
    case 'visitor':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="1.5"/>
          <path d="M3.5 9.5h17M8 3v4M16 3v4"/>
          <circle cx="10" cy="13.2" r="1.5"/>
          <path d="M7.2 18c.3-1.4 1.4-2.2 2.8-2.2s2.5.8 2.8 2.2"/>
          <path d="m14.5 15.5 1.4 1.4 2.6-2.8"/>
        </svg>
      )
    case 'catalog':
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="12" rx="1.5"/>
          <path d="M9 20h6M12 16.5V20"/>
          <path d="M12 8v6.2M6.8 8.6c1.9-.6 3.5-.4 5.2.6 1.7-1 3.3-1.2 5.2-.6v5.6c-1.9-.6-3.5-.4-5.2.6-1.7-1-3.3-1.2-5.2-.6z"/>
        </svg>
      )
    case 'portals':
      return (
        <svg {...common}>
          <circle cx="12" cy="6.2" r="2.3"/>
          <circle cx="5.2" cy="9.4" r="1.8"/>
          <circle cx="18.8" cy="9.4" r="1.8"/>
          <path d="M8.4 14.2v-.7a3.6 3.6 0 0 1 7.2 0v.7M2.6 14.6v-.4a2.6 2.6 0 0 1 2.6-2.6M21.4 14.6v-.4a2.6 2.6 0 0 0-2.6-2.6"/>
          <path d="M3 20c2.2.3 4-.3 5.6-1.8l2.2-2.2M21 20c-2.2.3-4-.3-5.6-1.8l-2.2-2.2"/>
        </svg>
      )
    case 'devices':
      return (
        <svg {...common}>
          <rect x="2.8" y="4.5" width="14" height="10.5" rx="1.4"/>
          <path d="M7 19.5h6M9.8 15v4.5"/>
          <rect x="15.5" y="9" width="5.7" height="11" rx="1.3"/>
          <path d="M18.3 17.6h.01"/>
        </svg>
      )
    case 'secure':
      return (
        <svg {...common}>
          <path d="M12 3 5 5.8v5.4c0 4.4 3 8 7 9.8 4-1.8 7-5.4 7-9.8V5.8z"/>
          <circle cx="12" cy="10.2" r="2"/>
          <path d="M8.6 15.6c.5-1.5 1.8-2.3 3.4-2.3s2.9.8 3.4 2.3"/>
        </svg>
      )
    default:
      return null
  }
}

function ChevronIcon({ dir = 'down', size = 22 }) {
  const rot = { down: 0, up: 180, left: 90, right: -90 }[dir]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: `rotate(${rot}deg)` }}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}

// Renders the ACTUAL scannable QR code (encodes the app download link) using
// the pre-generated module matrix in qrData.js. High contrast so real cameras
// can read it.
function LiteralQRCode() {
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', width: '100%', height: 'auto' }}
      role="img"
      aria-label="QR code to download the app"
    >
      <rect x="0" y="0" width={QR_SIZE} height={QR_SIZE} fill={WHITE} />
      {QR_RECTS.map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={MAROON_DEEP} />
      ))}
    </svg>
  )
}

// ─── Role Router ──────────────────────────────────────────────────────────────
// Routes the logged-in user to the correct dashboard based on their DB role.
//   super_admin     → SuperAdminLayout
//   library_manager → Dashboard (librarian dashboard)
//   student         → StudentDashboard
function RoleRouter({ user, onSignOut }) {
  const { role } = useAuth()

  // Show loader until profile (and therefore accurate DB role) is resolved
  if (role === null) return <AppLoader />

  if (role === 'super_admin') {
    return <SuperAdminLayout user={user} onSignOut={onSignOut} />
  }
  if (role === 'library_manager' || role === 'admin') {
    return <Dashboard user={user} onSignOut={onSignOut} />
  }
  return <StudentDashboard user={user} onSignOut={onSignOut} />
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ scrolled, onNavClick, onGetStarted }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive]     = useState('home')

  // Close the mobile menu if the viewport grows back to desktop width.
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 960) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close with Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Highlight the link of the section currently in view.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean)
    if (!els.length) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const go = (id) => { setMenuOpen(false); onNavClick(id) }

  return (
    <header className={`ls-nav${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' is-open' : ''}`}>
      <button type="button" className="ls-nav__brand" onClick={() => go('home')} aria-label="Go to home">
        <img src="/LibraryLogo.png" alt="PSU Library logo" />
      </button>

      <nav className="ls-nav__links" aria-label="Primary">
        {NAV_LINKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`ls-nav__link${active === id ? ' is-active' : ''}`}
            aria-current={active === id ? 'true' : undefined}
            onClick={() => go(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <button type="button" className="ls-btn ls-btn--gold ls-btn--sm ls-nav__cta"
        onClick={() => { setMenuOpen(false); onGetStarted() }}>
        Get Started
      </button>

      <button
        type="button"
        className="ls-nav__toggle"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="ls-mobile-menu"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span /><span /><span />
      </button>

      <div id="ls-mobile-menu" className="ls-nav__mobile">
        <div className="ls-nav__mobile-inner">
          {NAV_LINKS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`ls-nav__mlink${active === id ? ' is-active' : ''}`}
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => go(id)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="ls-btn ls-btn--gold ls-nav__mcta"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => { setMenuOpen(false); onGetStarted() }}>
            Get Started
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── "Under construction" notice (APK isn't public yet) ──────────────────────
function UnderConstructionModal({ onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="uc-overlay" role="dialog" aria-modal="true" aria-labelledby="uc-modal-title" onClick={onClose}>
      <div className="uc-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="uc-modal__close" aria-label="Close" onClick={onClose}>✕</button>
        <div className="uc-modal__icon">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6">
            <path d="M12 9v4" strokeLinecap="round"/>
            <path d="M12 17h.01" strokeLinecap="round"/>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
        </div>
        <h3 id="uc-modal-title" className="uc-modal__title">Under Construction</h3>
        <p className="uc-modal__desc">
          The LibraScan mobile app isn't ready for download just yet. Our team is putting on
          the finishing touches, so please check back soon.
        </p>
        <button type="button" className="btn-primary" onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}

// Renders a real link to the app build when one is available, otherwise a
// button that opens the "under construction" notice.
function AppLink({ className, label, onOpenApp, children }) {
  if (IS_QR_A_LINK) {
    return (
      <a className={className} href={QR_URL} target="_blank" rel="noopener noreferrer" aria-label={label}>
        {children}
      </a>
    )
  }
  return <button type="button" className={className} aria-label={label} onClick={onOpenApp}>{children}</button>
}

// ─── Hero + stats ─────────────────────────────────────────────────────────────
function StatItem({ target, suffix, label, inView }) {
  const ready = typeof target === 'number' && Number.isFinite(target)
  const count = useCountUp(ready ? target : 0, 1800, inView && ready)
  return (
    <div className="ls-stat">
      <div className="ls-stat__value">{ready ? `${count.toLocaleString('en-US')}${suffix}` : '—'}</div>
      <div className="ls-stat__label">{label}</div>
    </div>
  )
}

function StatsCard() {
  const [ref, inView] = useInView(0.3)
  const live = useLandingStats()
  return (
    <div ref={ref} className="ls-stats ls-rise" style={{ '--d': 500 }}>
      {STAT_TARGETS.map((s) => (
        <StatItem
          key={s.key}
          label={s.label}
          suffix={s.suffix}
          target={s.live ? live[s.key] : s.target}
          inView={inView}
        />
      ))}
    </div>
  )
}

function HeroSection({ onNavClick, onGetStarted, onOpenApp }) {
  return (
    <section className="ls-hero" id="home" aria-label="LibraScan">
      <div className="ls-hero__main">
        <div className="ls-hero__copy">
          <h1 className="ls-hero__title ls-rise" style={{ '--d': 0 }}>
            LIBRA<span>SCAN</span>
          </h1>
          <p className="ls-hero__sub ls-rise" style={{ '--d': 150 }}>
            Development and implementation of a QR code-based library management system with
            online public access catalog and attendance monitoring of Pampanga State University.
          </p>
          <div className="ls-hero__ctas ls-rise" style={{ '--d': 300 }}>
            <button type="button" className="ls-btn ls-btn--gold ls-btn--serif" onClick={() => onNavClick('application')}>
              Application
            </button>
            <button type="button" className="ls-btn ls-btn--ghost ls-btn--serif" onClick={onGetStarted}>
              Get Started
            </button>
          </div>
        </div>

        <div className="ls-qr ls-rise" style={{ '--d': 250 }}>
          <div className="ls-qr__stage">
            <div className="ls-badge ls-badge--tl">
              <div className="ls-badge__title">Book Checked Out</div>
              <div className="ls-badge__sub">Just now</div>
            </div>

            <AppLink className="ls-qr__code" onOpenApp={onOpenApp}
              label={IS_QR_A_LINK ? 'Open the LibraScan app download page' : 'App download is under construction'}>
              <LiteralQRCode />
              <span className="ls-qr__scan" aria-hidden="true" />
            </AppLink>
            <p className="ls-qr__caption">Scan to download the app</p>

            <div className="ls-badge ls-badge--br">
              <div className="ls-badge__title">Visitor Logged</div>
              <div className="ls-badge__sub">2 min ago</div>
            </div>
          </div>
        </div>
      </div>

      <StatsCard />
    </section>
  )
}

// ─── System Features ──────────────────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section id="features" className="ls-section ls-features" aria-labelledby="features-title">
      <div className="ls-container">
        <SectionHeading id="features-title" lead="System" accent="Features" sub={SECTION_COPY.features} />
        <div className="ls-features__grid">
          {FEATURES.map(({ iconKey, title, desc }, i) => (
            <Reveal key={title} index={i % 3} className="ls-feature-wrap">
              <article className="ls-feature">
                <div className="ls-feature__icon"><FeatureIcon name={iconKey} /></div>
                <h3 className="ls-feature__title">{title}</h3>
                <p className="ls-feature__desc">{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Built for Efficiency (tabs) ──────────────────────────────────────────────
function BenefitsSection() {
  const [active, setActive] = useState(0)
  const [edge, setEdge]     = useState({ left: false, right: false })
  const tabRefs  = useRef([])
  const tabsRef  = useRef(null)
  const dragRef  = useRef({ down: false, captured: false, moved: false, startX: 0, startLeft: 0 })

  // Show a fade + arrow on whichever side has more tabs to scroll to.
  const updateEdge = useCallback(() => {
    const el = tabsRef.current
    if (!el) return
    setEdge({
      left:  el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    const el = tabsRef.current
    updateEdge()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdge) : null
    if (el && ro) ro.observe(el)
    window.addEventListener('resize', updateEdge)
    return () => { ro?.disconnect(); window.removeEventListener('resize', updateEdge) }
  }, [updateEdge])

  // Keep the selected tab centred in view (so Super Admin is reachable on phones).
  useEffect(() => {
    const el = tabsRef.current
    const btn = tabRefs.current[active]
    if (!el || !btn) return
    const left = Math.max(0, btn.offsetLeft - (el.clientWidth - btn.offsetWidth) / 2)
    el.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [active])

  // Mouse drag-to-scroll (touch already scrolls natively).
  const onTabsDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    dragRef.current = { down: true, captured: false, moved: false, startX: e.clientX, startLeft: tabsRef.current.scrollLeft }
  }
  const onTabsMove = (e) => {
    const d = dragRef.current
    if (!d.down) return
    const dx = e.clientX - d.startX
    if (!d.moved && Math.abs(dx) > 5) d.moved = true
    if (d.moved) {
      if (!d.captured) { e.currentTarget.setPointerCapture?.(e.pointerId); d.captured = true }
      tabsRef.current.scrollLeft = d.startLeft - dx
    }
  }
  const onTabsUp = () => { dragRef.current.down = false }
  // A drag must not count as a click on a tab.
  const onTabsClickCapture = (e) => {
    if (dragRef.current.moved) { e.preventDefault(); e.stopPropagation(); dragRef.current.moved = false }
  }

  const onKeyDown = (e, i) => {
    const last = PORTALS.length - 1
    let next = i
    if (e.key === 'ArrowRight')     next = i === last ? 0 : i + 1
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1
    else if (e.key === 'Home')      next = 0
    else if (e.key === 'End')       next = last
    else return
    e.preventDefault()
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  const portal = PORTALS[active]

  return (
    <section id="benefits" className="ls-section ls-benefits" aria-labelledby="benefits-title">
      <div className="ls-container">
        <SectionHeading id="benefits-title" lead="Built for" accent="Efficiency" sub={SECTION_COPY.benefits} />

        <Reveal className="ls-panel" index={1}>
          <div className={`ls-tabs-wrap${edge.left ? ' has-left' : ''}${edge.right ? ' has-right' : ''}`}>
          <div
            ref={tabsRef}
            className={`ls-tabs${edge.left || edge.right ? ' is-scrollable' : ''}`}
            role="tablist"
            aria-label="Portals"
            onScroll={updateEdge}
            onPointerDown={onTabsDown}
            onPointerMove={onTabsMove}
            onPointerUp={onTabsUp}
            onPointerCancel={onTabsUp}
            onClickCapture={onTabsClickCapture}
          >
            {PORTALS.map((p, i) => (
              <button
                key={p.id}
                ref={(el) => (tabRefs.current[i] = el)}
                id={`tab-${p.id}`}
                role="tab"
                type="button"
                className="ls-tab"
                aria-selected={active === i}
                aria-controls={`panel-${p.id}`}
                tabIndex={active === i ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                {p.label}
              </button>
            ))}
          </div>
          </div>

          <div
            key={portal.id}
            id={`panel-${portal.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${portal.id}`}
            className="ls-panel__body"
          >
            <ol className="ls-steps">
              {portal.points.map((text, i) => (
                <li key={i} className="ls-step" style={{ '--i': i }}>
                  <span className="ls-step__n" aria-hidden="true">{i + 1}.</span>
                  <span className="ls-step__text">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Application carousel (auto-running, draggable, arrows) ──────────────────
function AppCarousel({ items }) {
  const viewportRef = useRef(null)
  const trackRef    = useRef(null)
  const st = useRef({ pos: 0, vel: 0, dragging: false, paused: false, visible: true, lastX: 0, lastT: 0, anim: null })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return
    const s = st.current
    // Always runs; people who prefer reduced motion get a calmer speed.
    const SPEED = prefersReducedMotion() ? 22 : 40 // px per second
    let raf
    let last = performance.now()

    let io
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting })
      io.observe(viewport)
    }

    const tick = (now) => {
      const dt = Math.min(now - last, 64)
      last = now
      const half = track.scrollWidth / 2
      if (s.visible && half > 0) {
        if (s.anim) {
          const t = Math.min((now - s.anim.t0) / s.anim.dur, 1)
          s.pos = s.anim.from + (s.anim.to - s.anim.from) * (1 - Math.pow(1 - t, 3))
          if (t >= 1) s.anim = null
        } else if (!s.dragging) {
          if (Math.abs(s.vel) > 0.01) {
            s.pos += s.vel * dt
            s.vel *= Math.pow(0.92, dt / 16.7)
          } else {
            s.vel = 0
            if (!s.paused) s.pos += (SPEED * dt) / 1000
          }
        }
        // Seamless loop: the track holds the list twice, so wrap at half.
        const wrapped = ((s.pos % half) + half) % half
        const shift = wrapped - s.pos
        if (shift) {
          s.pos = wrapped
          if (s.anim) { s.anim.from += shift; s.anim.to += shift }
        }
        track.style.transform = `translate3d(${-s.pos}px,0,0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); io?.disconnect() }
  }, [])

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const s = st.current
    s.dragging = true
    s.anim = null
    s.vel = 0
    s.lastX = e.clientX
    s.lastT = performance.now()
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    const s = st.current
    if (!s.dragging) return
    const now = performance.now()
    const dx = e.clientX - s.lastX
    const dt = Math.max(now - s.lastT, 1)
    s.pos -= dx
    s.vel = Math.max(-3, Math.min(3, 0.7 * s.vel + 0.3 * (-dx / dt)))
    s.lastX = e.clientX
    s.lastT = now
  }
  const endDrag = () => {
    const s = st.current
    if (!s.dragging) return
    s.dragging = false
    setDragging(false)
    if (performance.now() - s.lastT > 90) s.vel = 0 // held still before release → no fling
  }

  const nudge = (dir) => {
    const s = st.current
    const kids = trackRef.current?.children
    if (!kids) return
    const step = kids.length > 1 ? kids[1].offsetLeft - kids[0].offsetLeft : 220
    s.vel = 0
    s.anim = { from: s.pos, to: s.pos + dir * step * 2, t0: performance.now(), dur: 650 }
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); nudge(-1) }
  }

  return (
    <div className="ls-carousel" role="region" aria-roledescription="carousel" aria-label="App screenshots">
      <button type="button" className="ls-carousel__arrow ls-carousel__arrow--prev" aria-label="Previous screenshots" onClick={() => nudge(-1)}>
        <ChevronIcon dir="left" size={26} />
      </button>

      <div
        ref={viewportRef}
        className={`ls-carousel__viewport${dragging ? ' is-dragging' : ''}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div ref={trackRef} className="ls-carousel__track">
          {[...items, ...items].map((it, i) => {
            const isClone = i >= items.length
            return (
              <figure key={i} className="ls-shot" aria-hidden={isClone || undefined}>
                <img src={it.src} alt={isClone ? '' : it.alt} draggable={false} loading="lazy" />
              </figure>
            )
          })}
        </div>
      </div>

      <button type="button" className="ls-carousel__arrow ls-carousel__arrow--next" aria-label="Next screenshots" onClick={() => nudge(1)}>
        <ChevronIcon dir="right" size={26} />
      </button>
    </div>
  )
}

function ApplicationSection({ onOpenApp }) {
  return (
    <section id="application" className="ls-section ls-apps" aria-labelledby="application-title">
      <div className="ls-container ls-container--wide">
        <SectionHeading id="application-title" accent="Application" sub={SECTION_COPY.application} />
        <Reveal index={1}>
          <AppCarousel items={APP_SCREENSHOTS} />
        </Reveal>
        <Reveal index={2} className="ls-apps__cta">
          <AppLink className="ls-install" onOpenApp={onOpenApp}>Install Mobile App</AppLink>
        </Reveal>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="ls-section ls-faq" aria-labelledby="faq-title">
      <div className="ls-container ls-container--narrow">
        <SectionHeading id="faq-title" lead="Frequently Asked" accent="Questions" sub={SECTION_COPY.faq} />
        <div className="ls-faq__list">
          {FAQS.map(({ q, a }, i) => {
            const isOpen = open === i
            return (
              <Reveal key={q} index={Math.min(i, 3)}>
                <div className={`ls-qa${isOpen ? ' is-open' : ''}`}>
                  <h3>
                    <button
                      type="button"
                      id={`faq-q-${i}`}
                      className="ls-qa__q"
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpen(isOpen ? -1 : i)}
                    >
                      <span>{q}</span>
                      <span className="ls-qa__chev"><ChevronIcon size={26} /></span>
                    </button>
                  </h3>
                  <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="ls-qa__a">
                    <div><p>{a}</p></div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Team ─────────────────────────────────────────────────────────────────────
function Portrait({ src, name }) {
  const [failed, setFailed] = useState(false)
  const [last = '', first = ''] = name.split(',').map((s) => s.trim())
  const initials = `${first[0] || ''}${last[0] || ''}`
  if (!src || failed) return <span className="ls-portrait__fallback" aria-label={name}>{initials}</span>
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
}

function TeamSection() {
  return (
    <section id="team" className="ls-section ls-team" aria-labelledby="team-title">
      <div className="ls-container">
        <Reveal className="ls-heading ls-heading--dark">
          <h2 id="team-title">Get to Know the <span className="ls-heading__accent">LibraScan Team</span></h2>
          <p className="ls-heading__sub">{SECTION_COPY.team}</p>
        </Reveal>

        <Reveal className="ls-person ls-person--adviser" index={1}>
          <div className="ls-portrait"><Portrait src={ADVISER.photo} name={ADVISER.name} /></div>
          <h3 className="ls-person__name">{ADVISER.name}</h3>
          <p className="ls-person__role">{ADVISER.role}</p>
        </Reveal>

        <div className="ls-team__grid">
          {TEAM.map(({ name, role, photo }, i) => (
            <Reveal key={name} className="ls-person" index={i}>
              <div className="ls-portrait"><Portrait src={photo} name={name} /></div>
              <h3 className="ls-person__name">{name.replace(/ (\S+)$/, '\u00A0$1')}</h3>
              <p className="ls-person__role">{role}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="ls-footer">
      <div className="ls-container">
        <h2 className="ls-footer__title">Pampanga State University</h2>
        <ul className="ls-footer__grid">
          {CAMPUSES.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <p className="ls-footer__copy">LibraScan · BSIT Capstone Project · PSU Sto. Tomas Campus · 2026</p>
      </div>
    </footer>
  )
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
}
const AUTH_PAGE_BY_PATH = Object.fromEntries(
  Object.entries(AUTH_PATH_BY_PAGE).map(([key, path]) => [path, key])
)
const DASHBOARD_PATH_BY_ROLE = {
  super_admin:     '/superadmin',
  library_manager: '/admin',
  admin:           '/admin',
  student:         '/student',
}

function authPageFromPath(pathname) {
  return AUTH_PAGE_BY_PATH[pathname] || null
}

// ─── Main app shell ───────────────────────────────────────────────────────────
function LandingApp() {
  const [scrolled, setScrolled]   = useState(false)
  const [showUC, setShowUC]       = useState(false)
  const [authPage, setAuthPage]   = useState(() => {
    if (window.location.hash.includes('type=recovery')) return 'forgot-password'
    return authPageFromPath(window.location.pathname)
  })
  const { user, role, loading, signOut } = useAuth()

  // Move to an auth screen (or back to "/" when passed null), keeping the
  // address bar in sync via the native History API.
  const goToAuth = (page) => {
    const targetPath = page ? AUTH_PATH_BY_PAGE[page] : '/'
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ authPage: page }, '', targetPath)
    }
    setAuthPage(page)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handle = () => {
      if (window.location.hash.includes('type=recovery')) setAuthPage('forgot-password')
    }
    window.addEventListener('hashchange', handle)
    return () => window.removeEventListener('hashchange', handle)
  }, [])

  // Keep the top-level screen in sync with browser Back/Forward navigation
  // between "/", the auth paths, and the dashboard paths.
  useEffect(() => {
    const onPopState = () => {
      if (window.location.hash.includes('type=recovery')) { setAuthPage('forgot-password'); return }
      setAuthPage(authPageFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Once a logged-in user's DB role has resolved, point the address bar at
  // that dashboard's own path (e.g. /admin, /student, /superadmin) so it's
  // bookmarkable and reloads land in the right place.
  useEffect(() => {
    if (!user || role === null) return
    const targetPath = DASHBOARD_PATH_BY_ROLE[role] || '/student'
    if (!window.location.pathname.startsWith(targetPath)) {
      window.history.replaceState({}, '', targetPath)
    }
  }, [user, role])

  // Redirect straight dashboard-path visits back to /login when signed out
  // (e.g. someone bookmarked /admin or /superadmin).
  useEffect(() => {
    if (loading || user) return
    const dashboardPaths = Object.values(DASHBOARD_PATH_BY_ROLE)
    if (dashboardPaths.some((p) => window.location.pathname.startsWith(p))) {
      goToAuth('login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    window.history.pushState(null, '', `#${id}`)
    const navHeight = id === 'home' ? 0 : (document.querySelector('.ls-nav')?.offsetHeight || 72)
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight
    window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  // On first load of the landing page, honor a section anchor already in
  // the URL (e.g. arriving at /#features from an external link).
  useEffect(() => {
    if (user || authPage) return
    const id = window.location.hash.replace('#', '')
    if (!id || window.location.hash.includes('type=recovery')) return
    const el = document.getElementById(id)
    if (el) {
      const navHeight = document.querySelector('.ls-nav')?.offsetHeight || 72
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight
      window.scrollTo({ top, behavior: 'smooth' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authPage])

  if (loading) return <AppLoader />

  // Logged-in user → route to correct dashboard by DB role
  if (user) return <RoleRouter user={user} onSignOut={signOut} />

  // Auth pages (login / signup / forgot / reset)
  if (authPage !== null) {
    return (
      <AuthRouter
        initialPage={authPage}
        onLoginSuccess={() => goToAuth(null)}
        onGoLanding={() => goToAuth(null)}
      />
    )
  }

  // Landing page
  return (
    <div className="ls" lang="en">
      <Navbar scrolled={scrolled} onNavClick={scrollTo} onGetStarted={() => goToAuth('login')} />
      <main>
        <HeroSection onNavClick={scrollTo} onGetStarted={() => goToAuth('login')} onOpenApp={() => setShowUC(true)} />
        <FeaturesSection />
        <BenefitsSection />
        <ApplicationSection onOpenApp={() => setShowUC(true)} />
        <FaqSection />
        <TeamSection />
      </main>
      <Footer />
      {showUC && <UnderConstructionModal onClose={() => setShowUC(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LandingApp />
    </AuthProvider>
  )
}