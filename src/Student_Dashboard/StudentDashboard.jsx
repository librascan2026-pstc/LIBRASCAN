import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { searchOpenLibrary } from '../utils/openLibraryApi';
import {
  getNotifPrefs,
  setNotifPref,
  setAllNotifPrefs,
  getNotifPrefTypesForRole,
  getNotifSoundEnabled,
  setNotifSoundEnabled,
  NOTIF_PREFS_EVENT,
} from '../Admin_Dashboard/notificationPrefs';
import {
  getNotifHistory,
  addNotifHistory,
  markNotifHistoryRead,
  markAllNotifHistoryRead,
  clearNotifHistory,
} from '../Admin_Dashboard/notificationHistory';

/* ═══════════════════════════════════════════════════════════════
   INLINE STYLES  — mirrors every token in Dashboard.css exactly
═══════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

/* ── Variables (same as Dashboard.css :root) ── */
:root {
  --gold:              #C9A84C;
  --gold-light:        #E0BE72;
  --gold-pale:         #F5E4A8;
  --gold-dim:          #9E7D35;
  --maroon:            #7B0000;
  --maroon-deep:       #5A0000;
  --maroon-mid:        #8B0000;
  --maroon-light:      #A00000;
  --maroon-bright:     #C00000;
  --maroon-card:       #6B0000;
  --maroon-sidebar:    #6E0000;
  --cream:             #FDF8F0;
  --bg-base:           #F8F0DD;
  --bg-sidebar:        #6E0000;
  --panel-bg:          #EAD9B4;
  --text-primary:      #3A0000;
  --text-secondary:    #5A1010;
  --text-muted:        #7A3030;
  --text-dim:          rgba(90,16,16,0.55);
  --sidebar-text:      rgba(245,228,168,0.90);
  --sidebar-text-dim:  rgba(245,228,168,0.45);
  --border:            rgba(139,0,0,0.18);
  --border-card:       rgba(201,168,76,0.40);
  --font-display:      'Cinzel','Cormorant Garamond',serif;
  --font-hero:         'Playfair Display','Cormorant Garamond',Georgia,serif;
  --font-sans:         'DM Sans',system-ui,sans-serif;
  --sidebar-w:         252px;
  --sidebar-collapsed-w: 68px;
  --topbar-h:          72px;
  --radius:            10px;
  --radius-sm:         6px;
  --radius-md:         12px;
  --radius-lg:         14px;
  --radius-xl:         20px;
  --shadow-sm:         0 2px 8px rgba(50,0,0,0.12);
  --shadow-md:         0 4px 20px rgba(50,0,0,0.18);
  --shadow-card:       0 4px 18px rgba(40,0,0,0.30);
  --shadow-sidebar:    4px 0 24px rgba(30,0,0,0.40);
  --ease:              0.22s cubic-bezier(0.4,0,0.2,1);
  --ease-bounce:       0.3s cubic-bezier(0.34,1.56,0.64,1);
  --cream-light:       #FDF8F0;
  /* Notification bell/panel-specific tokens (same values as Dashboard.css :root) */
  --notif-maroon:      #8B0000;
  --notif-maroon-dark: #720000;
  --notif-cream:       #FFF9F1;
  --notif-unread:      #FFF3D6;
  --notif-gold:        #C99A2E;
  --notif-border:      #E8CFC0;
  --notif-text:        #4A1717;
  --notif-secondary:   #9B6F68;
  --notif-header-text: #FFF8ED;
}

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
button { cursor:pointer; }


html { scrollbar-width:auto; scrollbar-color:var(--maroon-mid) var(--bg-base); }
::-webkit-scrollbar { width:12px; height:12px; }
::-webkit-scrollbar-track { background:var(--bg-base); }
::-webkit-scrollbar-thumb {
  background:var(--maroon-mid); border-radius:10px;
  border:3px solid var(--bg-base); background-clip:padding-box;
}
::-webkit-scrollbar-thumb:hover { background:var(--maroon-deep); }

/* ════════ KEYFRAMES ════════ */
@keyframes lm-fade-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
@keyframes lm-modal-in   { from{opacity:0;transform:scale(.93) translateY(-12px)} to{opacity:1;transform:none} }
@keyframes lm-spin       { to{transform:rotate(360deg)} }
@keyframes lm-toast-in   { from{opacity:0;transform:translateY(12px) scale(.96)} to{opacity:1;transform:none} }
@keyframes lm-pulse-dot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:.8} }
@keyframes sdb-slide-in  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }

/* ════════ SHELL ════════ */
.sdb-shell {
  display:flex; flex-direction:column; min-height:100vh; width:100%;
  background:var(--bg-base); color:var(--text-primary);
  font-family:var(--font-sans); font-size:14px; line-height:1.5;
  overflow-x:hidden; /* safety net for the full-bleed banner's 100vw breakout — sits
                         at the true root so it never clips the breakout itself */
}

/* ════════ TOP NAVBAR ════════ */
.sdb-navbar {
  height:var(--topbar-h); min-height:var(--topbar-h);
  background:linear-gradient(180deg,var(--maroon-mid) 0%,var(--maroon-deep) 100%);
  display:flex; align-items:center; justify-content:space-between;
  padding:0 26px; position:sticky; top:0; z-index:200;
  box-shadow:0 3px 16px rgba(30,0,0,.35);
  border-bottom:2px solid var(--gold);
  gap:16px;
}

/* Brand */
.sdb-brand { display:flex; align-items:center; gap:12px; min-width:0; flex-shrink:0; }
.sdb-brand-logo {
  width:42px; height:42px; border-radius:50%; flex-shrink:0;
  border:2px solid rgba(201,168,76,.65); background:#fff;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  box-shadow:0 2px 10px rgba(0,0,0,.30);
}
.sdb-brand-logo img { width:100%; height:100%; object-fit:contain; }
.sdb-brand-text { display:flex; flex-direction:column; gap:2px; line-height:1.15; }
.sdb-brand-title {
  font-family:var(--font-display); font-size:16.5px; font-weight:700;
  color:#fff; letter-spacing:.08em; white-space:nowrap;
}
.sdb-brand-sub {
  display:flex; align-items:center; gap:6px;
  font-size:9px; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
  color:rgba(245,228,168,.72); white-space:nowrap;
 
}
.sdb-brand-sub::before {
  content:''; width:12px; height:1px; background:var(--gold); flex-shrink:0;
}

/* Nav links */
.sdb-navlinks {
  display:flex; align-items:center; gap:6px; flex:1;
  justify-content:center; overflow-x:auto; scrollbar-width:none;
}
.sdb-navlinks::-webkit-scrollbar { display:none; }
.sdb-navlink {
  position:relative; background:transparent; border:none; cursor:pointer;
  padding:10px 14px; white-space:nowrap;
  font-family:var(--font-sans); font-size:13.5px; font-weight:500;
  color:rgba(255,236,190,.82); letter-spacing:.01em;
  transition:color var(--ease);
}
.sdb-navlink:hover { color:#fff; }
.sdb-navlink::after {
  content:''; position:absolute; left:14px; right:14px; bottom:2px; height:2px;
  background:var(--gold); border-radius:2px; transform:scaleX(0);
  transition:transform var(--ease);
}
.sdb-navlink:hover::after { transform:scaleX(.45); }
.sdb-navlink.active { color:#fff; font-weight:700; }
.sdb-navlink.active::after { transform:scaleX(1); }

/* Right cluster */
.sdb-nav-right { display:flex; align-items:center; gap:14px; flex-shrink:0; position:relative; }

/* Bell */
.sdb-bell-btn {
  position:relative; width:38px; height:38px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,.08); border:1px solid rgba(245,228,168,.22);
  color:rgba(255,236,190,.90); cursor:pointer; flex-shrink:0;
  transition:background var(--ease),border-color var(--ease),transform var(--ease);
}
.sdb-bell-btn:hover { background:rgba(255,255,255,.16); border-color:rgba(245,228,168,.40); transform:translateY(-1px); }
.sdb-bell-dot {
  position:absolute; top:8px; right:9px; width:8px; height:8px; border-radius:50%;
  background:#e74c3c; border:1.5px solid var(--maroon-deep);
}

/* Profile chip — top navbar */
.sdb-profile-chip {
  display:flex; align-items:center; gap:10px;
  padding:5px 12px 5px 5px; border-radius:40px;
  background:rgba(255,255,255,.94);
  border:1.5px solid rgba(201,168,76,.55); cursor:pointer;
  box-shadow:0 2px 10px rgba(0,0,0,.20);
  transition:background var(--ease),border-color var(--ease),transform var(--ease),box-shadow var(--ease);
}
.sdb-profile-chip:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,.28); border-color:rgba(201,168,76,.80); }
.sdb-profile-name {
  font-family:var(--font-display); font-size:12.5px; font-weight:700;
  color:var(--maroon-deep); letter-spacing:.02em; line-height:1.2; white-space:nowrap;
}
.sdb-profile-role { font-size:10px; color:var(--text-muted); font-family:var(--font-sans); white-space:nowrap; }
.sdb-chip-caret { color:var(--maroon-mid); display:flex; flex-shrink:0; transition:transform var(--ease); }
.sdb-profile-chip.open .sdb-chip-caret { transform:rotate(180deg); }

/* Avatar — matches .lm-avatar */
.sdb-avatar {
  width:34px; height:34px; border-radius:50%;
  background:linear-gradient(135deg,var(--gold-dim),var(--gold));
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-display); font-size:12px; font-weight:700;
  color:var(--maroon-deep); border:2px solid rgba(201,168,76,.40);
  flex-shrink:0; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.25);
}

/* Dropdown menu (profile) */
.sdb-dropdown {
  position:absolute; top:calc(100% + 6px); right:0; width:230px;
  background:var(--dd-bg); border:1px solid var(--dd-border);
  border-radius:var(--radius-lg); box-shadow:0 18px 44px rgba(20,0,0,.28), 0 2px 8px rgba(20,0,0,.10);
  overflow:hidden; z-index:250; animation:lm-modal-in .18s cubic-bezier(.34,1.56,.64,1);
}
.sdb-dropdown-user {
  display:flex; align-items:center; gap:10px; padding:14px 16px;
  border-bottom:1px solid var(--dd-border); background:var(--dd-head-bg);
}
.sdb-dropdown-user-name { font-family:var(--font-display); font-size:13px; font-weight:700; color:var(--text-primary); }
.sdb-dropdown-user-role { font-size:10.5px; color:var(--text-muted); margin-top:1px; }
.sdb-dropdown-item {
  display:flex; align-items:center; gap:11px; width:100%;
  padding:11px 16px; background:transparent; border:none; cursor:pointer;
  font-family:var(--font-sans); font-size:13px; font-weight:500;
  color:var(--text-secondary); text-align:left;
  transition:background var(--ease),color var(--ease);
}
.sdb-dropdown-item:hover { background:var(--dd-hover); color:var(--maroon-mid); }
.sdb-dropdown-item svg { flex-shrink:0; color:var(--maroon-mid); }
.sdb-dropdown-item.danger { color:#b23a3a; }
.sdb-dropdown-item.danger svg { color:#b23a3a; }
.sdb-dropdown-item.danger:hover { background:rgba(178,58,58,.10); }
.sdb-dropdown-sep { height:1px; background:var(--dd-border); margin:4px 0; }
.sdb-dropdown-toggle-wrap { display:flex; align-items:center; justify-content:space-between; padding:11px 16px; }
.sdb-dropdown-toggle-label { display:flex; align-items:center; gap:11px; font-family:var(--font-sans); font-size:13px; font-weight:500; color:var(--text-secondary); }
.sdb-dropdown-toggle-label svg { color:var(--maroon-mid); flex-shrink:0; }

/* Hamburger (mobile) */
.sdb-hamburger {
  display:none; align-items:center; justify-content:center;
  width:38px; height:38px; border-radius:var(--radius);
  background:rgba(255,255,255,.10); border:1.5px solid rgba(245,228,168,.28);
  color:#fff; cursor:pointer; flex-shrink:0;
  transition:background var(--ease),border-color var(--ease);
}
.sdb-hamburger:hover { background:rgba(255,255,255,.18); }

/* Mobile dropdown nav panel */
.sdb-mobnav {
  display:none; flex-direction:column; background:var(--maroon-deep);
  border-bottom:2px solid var(--gold); box-shadow:0 8px 20px rgba(20,0,0,.30);
  position:sticky; top:var(--topbar-h); z-index:190; padding:6px;
}
.sdb-mobnav-item {
  display:flex; align-items:center; gap:10px; padding:12px 14px;
  background:transparent; border:none; border-radius:8px; cursor:pointer;
  font-family:var(--font-sans); font-size:14px; font-weight:500;
  color:rgba(255,236,190,.88); text-align:left;
}
.sdb-mobnav-item.active { background:rgba(201,168,76,.20); color:#FFE97A; font-weight:700; }

/* ════════ MAIN / CONTENT ════════ */
.sdb-main { flex:1; display:flex; flex-direction:column; width:100%; }
.sdb-content {
  /* The page now scrolls as one normal document (.sdb-navbar is already
     position:sticky, built for exactly this) instead of scrolling inside
     this box. A nested overflow:auto here used to reserve its own
     scrollbar gutter and quietly shave a few px off JUST this element's
     right edge — since .sdb-navbar sits outside it and never lost that
     width, the two edges drifted apart by the scrollbar's width. With no
     scrollbar nested in here, .sdb-content stays pixel-identical to
     .sdb-navbar's box at every width, with nothing to compensate for.
     The 1520px reading-width cap + padding live on .sdb-module, so every
     page's normal content (search bar, cards, tables…) is unchanged. */
  flex:1; width:100%; background:var(--bg-base);
}

/* ════════ MODULE ════════ */
.sdb-module { max-width:1520px; margin:0 auto; padding:28px 30px; animation:lm-fade-in .32s ease; }
.sdb-module-header {
  display:flex; align-items:flex-start; justify-content:space-between;
  margin-bottom:24px; gap:16px; flex-wrap:wrap;
}
.sdb-module-title {
  font-family:var(--font-display); font-size:22px; font-weight:600;
  color:var(--maroon-deep); letter-spacing:.03em; line-height:1.2;
}
.sdb-module-sub { font-size:12.5px; color:var(--text-muted); margin-top:5px; }

/* ════════ STAT CARDS — matches .lm-stat-card ════════ */
.sdb-stats-grid {
  display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:22px;
}
.sdb-stat-card {
  background:linear-gradient(160deg,#FDF6EC 0%,#FAF0E4 100%);
  border:1px solid rgba(139,0,0,.14); border-radius:var(--radius-lg);
  padding:22px 22px 20px; display:flex; flex-direction:column; gap:6px;
  position:relative; overflow:hidden;
  box-shadow:0 2px 8px rgba(80,0,0,.07),0 6px 24px rgba(80,0,0,.05); cursor:default;
  transition:transform var(--ease),box-shadow var(--ease),border-color var(--ease);
}
.sdb-stat-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--gold-dim),var(--gold-light),var(--gold));
}
.sdb-stat-card::after {
  content:''; position:absolute; bottom:-20px; right:-20px;
  width:80px; height:80px; border-radius:50%;
  background:radial-gradient(circle,rgba(122,0,0,.05) 0%,transparent 70%);
  pointer-events:none;
}
.sdb-stat-card:hover { transform:translateY(-4px); box-shadow:0 10px 28px rgba(80,0,0,.14); border-color:rgba(139,0,0,.28); }
.sdb-stat-icon {
  display:flex; align-items:center; justify-content:center;
  width:40px; height:40px; border-radius:11px;
  background:rgba(122,0,0,.08); border:1px solid rgba(122,0,0,.18);
  color:var(--maroon); margin-bottom:4px; flex-shrink:0;
  transition:background var(--ease),transform var(--ease);
}
.sdb-stat-card:hover .sdb-stat-icon { background:rgba(122,0,0,.14); transform:scale(1.08); }
.sdb-stat-label {
  font-size:10px; font-weight:600; letter-spacing:.11em; text-transform:uppercase;
  color:var(--text-muted); font-family:var(--font-sans);
}
.sdb-stat-value {
  font-family:var(--font-display); font-size:32px; color:var(--maroon-deep);
  line-height:1; letter-spacing:.02em;
}
.sdb-stat-sub { font-size:11px; color:var(--text-muted); font-family:var(--font-sans); margin-top:2px; }

/* ════════ PANEL — matches .sas-card (light) ════════ */
.sdb-panel {
  background:linear-gradient(160deg,#FDF6EC 0%,#FAF0E4 100%);
  border:1px solid rgba(139,0,0,.14); border-radius:var(--radius-lg);
  padding:20px 22px; margin-bottom:16px;
  box-shadow:0 2px 8px rgba(80,0,0,.07),0 6px 24px rgba(80,0,0,.05);
  overflow:hidden;
  text-align:left; display:flex; flex-direction:column; gap:12px;
}
.sdb-panel-hdr {
  font-family:var(--font-display); font-size:12px; font-weight:700;
  color:var(--maroon); letter-spacing:.10em; text-transform:uppercase;
  margin-bottom:14px; padding-bottom:10px;
  border-bottom:1px solid rgba(139,0,0,.14);
  display:flex; align-items:center; justify-content:space-between; gap:8px;

}

/* ════════ WELCOME CARD (student-specific, light hero — matches Super Admin hero) ════════ */
.sdb-welcome-card {
  background:linear-gradient(135deg,var(--cream) 0%,#FFFFFF 100%);
  border:1.5px solid rgba(139,0,0,.14); border-radius:20px;
  padding:26px 30px; margin-bottom:20px;
  display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:18px;
  box-shadow:0 10px 30px rgba(59,42,37,.08); position:relative; overflow:hidden;
}
.sdb-welcome-card::before {
  content:''; position:absolute; top:-60%; right:-8%;
  width:340px; height:340px; border-radius:50%;
  background:radial-gradient(circle,rgba(212,175,55,.16) 0%,rgba(212,175,55,0) 70%);
  pointer-events:none;
}

/* ════════ CATALOG GRID ════════ */
.sdb-book-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(212px,1fr)); gap:22px;
  align-items:stretch;
}
/* Skeleton placeholders match the real card height so nothing jumps on load */
.sdb-book-grid > .sdb-skeleton { height:440px !important; }
/* Book card — matches .lm-book-card */
.sdb-book-card {
  background:linear-gradient(160deg,#FDF6EC 0%,#FAF0E4 100%);
  border:1px solid rgba(139,0,0,.16); border-radius:var(--radius-lg);
  overflow:hidden; cursor:pointer; min-width:0;
  transition:border-color var(--ease),transform var(--ease),box-shadow var(--ease);
  box-shadow:0 2px 8px rgba(80,0,0,.07),0 6px 24px rgba(80,0,0,.05); display:flex; flex-direction:column;
}
.sdb-book-card:hover {
  border-color:rgba(139,0,0,.34); transform:translateY(-6px);
  box-shadow:0 16px 34px rgba(80,0,0,.16);
}
/* Cover stage — fixed frame, whole cover always visible (never cropped) */
.sdb-book-cover-area {
  height:250px; flex-shrink:0; box-sizing:border-box; padding:18px;
  display:flex; align-items:center; justify-content:center;
  background:
    radial-gradient(ellipse at 50% 42%,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 68%),
    linear-gradient(145deg,rgba(122,0,0,.07) 0%,rgba(122,0,0,.14) 100%);
  border-bottom:1px solid rgba(139,0,0,.14); position:relative; overflow:hidden;
}
.sdb-book-cover-area img {
  width:auto !important; height:auto !important;
  max-width:100% !important; max-height:100% !important;
  object-fit:contain !important; border-radius:4px !important; display:block;
  border:1px solid rgba(139,0,0,.20);
  box-shadow:0 8px 18px rgba(50,0,0,.28),0 2px 4px rgba(50,0,0,.18);
  transition:transform .28s ease, box-shadow .28s ease;
}
/* Fallback cover (shown when a book has no image) keeps a proper book proportion */
.sdb-book-cover-area > div:not(.sdb-ol-tag) {
  width:64% !important; height:100% !important; border-radius:4px !important;
  box-shadow:0 8px 18px rgba(50,0,0,.28);
}
.sdb-book-card:hover .sdb-book-cover-area img { transform:scale(1.035); box-shadow:0 12px 24px rgba(50,0,0,.34),0 3px 6px rgba(50,0,0,.2); }
.sdb-fav-btn {
  position:absolute; top:7px; right:7px;
  background:rgba(255,255,255,.85); border:1px solid rgba(139,0,0,.18);
  border-radius:8px; padding:5px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .18s; backdrop-filter:blur(4px);
}
.sdb-fav-btn:hover { background:#fff; transform:scale(1.12); }
.sdb-book-body { padding:16px 16px 16px; flex:1; display:flex; flex-direction:column; align-items:flex-start; text-align:left; }
.sdb-book-title {
  font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px; width:100%;
  line-height:1.35; min-height:calc(2 * 1.35em); /* reserve 2 lines so every card lines up */
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  text-align:left;
}
.sdb-book-author { font-size:12px; color:var(--text-muted); margin-bottom:10px; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left; }
.sdb-book-genre {
  display:inline-flex; align-items:center; gap:5px; max-width:100%; box-sizing:border-box; padding:4px 11px; border-radius:14px;
  font-size:11px; font-family:var(--font-sans); text-align:left; font-weight:500;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  background:rgba(122,0,0,.07); color:var(--maroon); border:1px solid rgba(122,0,0,.18);
}
.sdb-book-genre svg { flex-shrink:0; width:11px; height:11px; }
/* Bookmark ribbon — top-left corner of every catalog cover */
.sdb-book-bookmark {
  position:absolute; top:10px; left:10px; z-index:2;
  width:29px; height:29px; border-radius:9px;
  background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep));
  display:flex; align-items:center; justify-content:center;
  color:var(--gold-pale); box-shadow:0 3px 10px rgba(40,0,0,.35);
  border:1px solid rgba(201,168,76,.35);
}
.sdb-book-actions { display:flex; gap:8px; margin-top:auto; padding-top:14px; width:100%; align-items:stretch; }
.sdb-book-actions .sdb-btn { justify-content:center; min-height:36px; }
.sdb-book-actions .sdb-tbl-btn { min-width:38px; min-height:36px; display:inline-flex; align-items:center; justify-content:center; }
@media (max-width:768px) {
  .sdb-book-grid { gap:14px; }
  .sdb-book-cover-area { height:200px; padding:12px; }
  .sdb-book-body { padding:12px; }
  .sdb-book-grid > .sdb-skeleton { height:380px !important; }
}


.sdb-book-grid.sdb-bk-grid { grid-template-columns:repeat(6,minmax(0,1fr)); gap:22px; }   /* 6 per row on desktop */
@media (max-width:1279px) { .sdb-book-grid.sdb-bk-grid { grid-template-columns:repeat(5,minmax(0,1fr)); } }
@media (max-width:999px)  { .sdb-book-grid.sdb-bk-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.sdb-bk-card {
  position:relative; display:flex; flex-direction:column; min-width:0; cursor:pointer;
  background:#FDF3E3 url('/BookCover.png') center/cover no-repeat;
  border:1px solid rgba(107,0,0,.14); border-radius:3px; overflow:hidden;
  box-shadow:0 2px 6px rgba(80,0,0,.08),0 10px 28px rgba(80,0,0,.10);
  transition:transform var(--ease),box-shadow var(--ease),border-color var(--ease);
}
.sdb-bk-card:hover { transform:translateY(-6px); border-color:rgba(107,0,0,.32); box-shadow:0 16px 34px rgba(80,0,0,.20); }
/* Cover — fixed book proportion (270 x 385), whole cover always visible */
.sdb-bk-cover { position:relative; flex-shrink:0; margin:9.4% 10.3% 0; aspect-ratio:270 / 385; }
.sdb-bk-cover > img,
.sdb-bk-cover > div { position:absolute; inset:0; width:100% !important; height:100% !important; }
.sdb-bk-cover > img { object-fit:contain !important; border-radius:2px !important; }
/* Bookmark (save) — top-right corner, overlapping the cover's corner */
.sdb-bk-bookmark {
  position:absolute; top:8px; right:10px; z-index:3; width:32px; height:32px; padding:0;
  display:flex; align-items:center; justify-content:center; cursor:pointer;
  background:#6B0000; color:#FFF6DF; border:2px solid #3F0000; border-radius:7px;
  box-shadow:0 3px 8px rgba(40,0,0,.30); transition:transform .18s ease,background .18s ease;
}
.sdb-bk-bookmark:hover { transform:scale(1.08); background:#7B0000; }
.sdb-bk-bookmark svg { width:17px; height:17px; display:block; }
/* Title + author — kept tight together */
.sdb-bk-info { padding:14px 10.3% 0; }
.sdb-bk-title {
  font-family:'Playfair Display',var(--font-display),serif; font-size:16px; font-weight:700;
  line-height:1.2; color:#6B0000; text-align:left;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.sdb-bk-author {
  font-family:var(--font-sans); font-size:13px; line-height:1.3; color:#A0524F; margin-top:2px; text-align:left;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
/* View Details — full-width bar pinned to the bottom of every card */
.sdb-bk-foot { margin-top:auto; padding:12px 4.1% 4.5%; }
.sdb-bk-btn {
  display:block; width:100%; height:32px; border:0; border-radius:4px; cursor:pointer;
  background:#6B0000; color:#fff; font-family:var(--font-sans); font-size:14px; font-weight:500;
  transition:background .18s ease;
}
.sdb-bk-btn:hover { background:#560000; }
/* Open Library variant: status pill under the author, View Details + Borrow/Read side by side */
.sdb-bk-info .sdb-ol-status { margin-top:6px; max-width:100%; box-sizing:border-box; overflow:hidden; text-overflow:ellipsis; }
.sdb-bk-foot-row { display:flex; gap:6px; }
.sdb-bk-foot-row .sdb-bk-btn { flex:1; min-width:0; padding:0 4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sdb-bk-btn.sdb-bk-btn-read { background:linear-gradient(135deg,var(--gold-light),var(--gold-dim)); color:var(--maroon-deep); font-weight:600; }
.sdb-bk-btn.sdb-bk-btn-read:hover { background:linear-gradient(135deg,var(--gold-pale),var(--gold)); }
/* "Readers' All-Time Favorites" shelf (Home) — same card, no button; keeps the shelf's own 6 / 3 / 2 per-row scroller */
.sdb-mr-bk-card { flex:0 0 calc((100% - 5 * 18px) / 6); scroll-snap-align:start; box-shadow:0 2px 6px rgba(80,0,0,.08),0 4px 14px rgba(80,0,0,.08); }
.sdb-mr-bk-card:hover { transform:translateY(-4px); box-shadow:0 10px 24px rgba(80,0,0,.20); }
.sdb-mr-bk-card .sdb-bk-info { padding-bottom:16px; }
@media (max-width:1100px) { .sdb-mr-bk-card { flex-basis:calc((100% - 2 * 18px) / 3); } }
@media (max-width:640px)  { .sdb-mr-bk-card { flex-basis:calc((100% - 1 * 18px) / 2); } }
@media (max-width:768px) {
  .sdb-book-grid.sdb-bk-grid { gap:14px; }
  .sdb-bk-bookmark { top:6px; right:7px; width:28px; height:28px; border-radius:6px; }
  .sdb-bk-bookmark svg { width:14px; height:14px; }
  .sdb-bk-info { padding-top:10px; }
  .sdb-bk-title { font-size:13px; }
  .sdb-bk-author { font-size:11px; }
  .sdb-bk-foot { padding-top:8px; }
  .sdb-bk-btn { height:28px; font-size:12px; }
}

/* ════════ BOOK DETAILS POPUP — bordered two-card layout (Browse Catalog) ════════
   Own sdb-bd-* classes; the shared .sdb-modal* rules are not touched. */
.sdb-bd-hdr {
  position:relative; flex-shrink:0; display:flex; align-items:center; gap:14px;
  padding:16px 22px; background:linear-gradient(135deg,var(--maroon-deep),var(--maroon-mid));
  border-bottom:1px solid rgba(201,168,76,.35);
}
.sdb-bd-hdr-ico { display:flex; flex:none; color:var(--gold-pale); }
.sdb-bd-hdr-ico svg { width:30px; height:30px; }
.sdb-bd-hdr-text { flex:1; min-width:0; text-align:left; }
.sdb-bd-hdr-title { font-family:'Playfair Display',var(--font-display),serif; font-size:24px; font-weight:600; line-height:1.15; color:#FFF6DF; }
.sdb-bd-hdr-sub {
  display:flex; align-items:center; gap:8px; margin-top:4px;
  font-family:var(--font-sans); font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:rgba(245,228,168,.70);
}
.sdb-bd-hdr-sub::before { content:''; flex:none; width:16px; height:1px; background:rgba(245,228,168,.55); }
.sdb-bd-hdr .sdb-modal-close { flex:none; width:36px; height:36px; }
.sdb-modal-body.sdb-bd-body {
  padding:16px; display:grid; grid-template-columns:minmax(190px,31%) minmax(0,1fr);
  gap:14px; align-items:start; text-align:left;
}
.sdb-bd-side, .sdb-bd-main { border:1px solid rgba(139,0,0,.18); border-radius:14px; background:rgba(255,255,255,.55); }
.sdb-bd-side { position:sticky; top:0; padding:18px 14px 16px; display:flex; flex-direction:column; align-items:center; gap:12px; }
.sdb-bd-cover { position:relative; flex-shrink:0; width:82%; aspect-ratio:160 / 204; }
.sdb-bd-cover > img,
.sdb-bd-cover > div { position:absolute; inset:0; width:100% !important; height:100% !important; }
.sdb-bd-cover > img { object-fit:contain !important; border-radius:3px !important; filter:drop-shadow(0 6px 10px rgba(50,0,0,.30)); }
.sdb-bd-copies { margin-top:0; font-family:var(--font-sans); font-size:11.5px; color:var(--text-muted); text-align:center; }
.sdb-bd-btn {
  display:flex; align-items:center; justify-content:center; gap:8px; width:100%; min-height:40px; padding:0 14px;
  border-radius:8px; cursor:pointer; font-family:var(--font-sans); font-size:12.5px; font-weight:500;
  transition:filter .18s ease, background .18s ease;
}
.sdb-bd-btn svg { width:16px; height:16px; flex:none; }
.sdb-bd-btn-lbl { display:inline-flex; align-items:center; gap:8px; }
.sdb-bd-btn-fav { justify-content:space-between; background:linear-gradient(180deg,#7A1414,#5C0D0D); color:#FFF6DF; border:1px solid #4A0000; box-shadow:0 3px 8px rgba(80,0,0,.25); }
.sdb-bd-btn-fav:hover { filter:brightness(1.14); }
.sdb-bd-btn-gold { background:linear-gradient(135deg,var(--gold-light),var(--gold-dim)); color:var(--maroon-deep); border:1px solid rgba(122,0,0,.30); font-weight:600; }
.sdb-bd-btn-gold:hover { filter:brightness(1.08); }
.sdb-bd-btn-ghost { background:rgba(255,255,255,.70); color:var(--maroon-deep); border:1px solid rgba(139,0,0,.22); }
.sdb-bd-btn-ghost:hover { background:#fff; }
.sdb-bd-main { padding:20px 20px 22px; min-width:0; text-align:left; }
.sdb-bd-title { font-family:'Playfair Display',var(--font-display),serif; font-size:clamp(22px,2.6vw,28px); font-weight:700; line-height:1.2; color:var(--text-primary); margin:0 0 6px; text-align:left; }
.sdb-bd-by { font-family:var(--font-sans); font-size:13.5px; color:var(--text-secondary); margin-bottom:16px; text-align:left; }
.sdb-bd-facts { display:grid; grid-template-columns:1fr 1fr; gap:14px 20px; padding:14px 16px; border:1px solid rgba(139,0,0,.16); border-radius:12px; background:rgba(255,255,255,.45); }
.sdb-bd-fact { display:flex; align-items:center; gap:11px; min-width:0; }
.sdb-bd-fact-ico { flex:none; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:var(--maroon-deep); background:rgba(255,255,255,.70); border:1px solid rgba(139,0,0,.18); border-radius:9px; }
.sdb-bd-fact-ico svg { width:16px; height:16px; }
.sdb-bd-fact-txt { min-width:0; text-align:left; }
.sdb-bd-fact-k { font-family:var(--font-sans); font-size:9.5px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--text-dim); }
.sdb-bd-fact-v { margin-top:1px; font-family:var(--font-sans); font-size:13px; color:var(--text-primary); overflow-wrap:anywhere; }
.sdb-bd-abs-hd { display:flex; align-items:center; gap:10px; margin:20px 0 10px; font-family:var(--font-sans); font-size:10.5px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--text-dim); }
.sdb-bd-abs-hd svg { width:16px; height:16px; flex:none; }
.sdb-bd-abs-hd::after { content:''; flex:1; height:1px; background:rgba(139,0,0,.16); }
.sdb-bd-desc { margin:0; font-family:var(--font-sans); font-size:13.5px; line-height:1.75; color:var(--text-secondary); text-align:left; }
.sdb-bd-note { margin-top:16px; padding:12px 14px; border:1px solid rgba(139,0,0,.16); border-radius:10px; background:rgba(255,255,255,.45); font-family:var(--font-sans); font-size:12.5px; line-height:1.65; color:var(--text-muted); text-align:left; }
@media (max-width:640px) {
  .sdb-modal-body.sdb-bd-body { grid-template-columns:1fr; }
  .sdb-bd-side { position:static; }
  .sdb-bd-cover { width:58%; }
  .sdb-bd-facts { grid-template-columns:1fr; }
  .sdb-bd-hdr { padding:14px 16px; }
  .sdb-bd-hdr-title { font-size:20px; }
}

/* ════════ BROWSE CATALOG — PANEL + TOOLBAR (scoped to Browse Catalog only,
   uses its own sdb-cat-* classes so History/Settings/forms, which share
   .sdb-filters / .sdb-input / .sdb-select / .sdb-count, are unaffected) ════════ */
/* Closer gap between the hero banner and the search panel (Browse Catalog only):
   the hero's own 24px bottom margin is kept, the module's extra 28px top padding is removed. */
.sdb-module.sdb-cat-module { padding-top:0; }
/* Borrowing History reuses the same panel — inner wrapper keeps the search + table above the panel's decorative leaf */
.sdb-hist-inner { position:relative; z-index:1; }
/* Floating panel — Browse Catalog / Borrowing History / Favorites.
   The panel is pulled up so it overlaps the bottom edge of the hero banner (~22px) and sits above it.
   Negative margin = the banner's own bottom margin (24 / 20 / 16 / 14px per breakpoint) + the overlap.
   NOTE: z-index lives on the PANEL, not the module — a z-index on the module would trap the book-details
   modal (position:fixed) inside a low stacking context, underneath the navbar. */
.sdb-page-hero + .sdb-module.sdb-cat-module { margin-top:-46px; }
.sdb-page-hero + .sdb-module.sdb-cat-module .sdb-cat-panel { z-index:2; box-shadow:0 12px 32px rgba(80,0,0,.16),0 3px 8px rgba(80,0,0,.08); }
@media (max-width:1024px) { .sdb-page-hero + .sdb-module.sdb-cat-module { margin-top:-40px; } }
@media (max-width:768px)  { .sdb-page-hero + .sdb-module.sdb-cat-module { margin-top:-30px; } }
@media (max-width:480px)  { .sdb-page-hero + .sdb-module.sdb-cat-module { margin-top:-26px; } }
.sdb-cat-panel {
  position:relative; background:linear-gradient(160deg,#FBF4E6 0%,#F6ECDA 100%);
  border:1px solid rgba(139,0,0,.14); border-radius:22px;
  padding:22px 24px 26px; margin-bottom:26px; overflow:hidden;
  box-shadow:0 4px 20px rgba(80,0,0,.06);
}
.sdb-cat-toolbar { position:relative; z-index:1; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.sdb-cat-search { position:relative; flex:1 1 260px; min-width:220px; }
.sdb-cat-search-icon {
  position:absolute; left:16px; top:50%; transform:translateY(-50%);
  color:var(--text-muted); display:flex; pointer-events:none;
}
.sdb-cat-search input {
  width:100%; padding:12px 18px 12px 42px; border-radius:999px; box-sizing:border-box;
  border:1px solid rgba(139,0,0,.16); background:var(--cream);
  color:var(--text-primary); font-family:var(--font-sans); font-size:13.5px;
  outline:none; transition:border-color var(--ease),box-shadow var(--ease),background var(--ease);
}
.sdb-cat-search input::placeholder { color:var(--text-dim); }
.sdb-cat-search input:focus { border-color:var(--maroon-mid); box-shadow:0 0 0 3px rgba(139,0,0,.10); background:#fff; }
.sdb-cat-pillselect {
  padding:11px 36px 11px 16px; border-radius:999px; flex-shrink:0;
  border:1px solid rgba(139,0,0,.16); background:var(--cream);
  color:var(--text-primary); font-family:var(--font-sans); font-size:12.5px; font-weight:500;
  outline:none; cursor:pointer; appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A3030' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 14px center;
  transition:border-color var(--ease),box-shadow var(--ease);
}
.sdb-cat-pillselect:focus { border-color:rgba(139,0,0,.4); box-shadow:0 0 0 3px rgba(139,0,0,.09); }
.sdb-cat-count {
  display:inline-flex; align-items:center; gap:8px; flex-shrink:0;
  padding:11px 20px; border-radius:999px; white-space:nowrap;
  background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep));
  color:var(--gold-pale); font-family:var(--font-sans); font-size:12.5px; font-weight:600;
  border:1px solid rgba(201,168,76,.30); box-shadow:0 2px 10px rgba(40,0,0,.25);
}
.sdb-cat-count svg { flex-shrink:0; }
.sdb-cat-body { position:relative; z-index:1; margin-top:22px; }
@media (max-width:640px) {
  .sdb-cat-panel { padding:16px 16px 20px; border-radius:16px; }
  .sdb-cat-count { order:99; width:100%; justify-content:center; }
}

/* ── Open Library integration — small additions, same visual language ── */
.sdb-ol-tag {
  position:absolute; top:7px; left:7px; z-index:2;
  display:inline-flex; align-items:center; gap:4px;
  padding:3px 8px; border-radius:8px;
  font-size:9px; font-weight:700; font-family:var(--font-sans);
  letter-spacing:.06em; text-transform:uppercase;
  background:rgba(58,0,0,.82); color:var(--gold-pale);
  border:1px solid rgba(201,168,76,.45); backdrop-filter:blur(3px);
}
.sdb-ol-status {
  display:inline-flex; align-items:center; gap:5px;
  padding:3px 10px; border-radius:12px; margin-top:8px;
  font-size:10.5px; font-weight:600; font-family:var(--font-sans);
  letter-spacing:.03em; white-space:nowrap;
  background:rgba(122,0,0,.07); color:var(--text-muted); border:1px solid rgba(122,0,0,.16);
}
.sdb-btn-ol-read {
  background:linear-gradient(135deg,var(--gold-light),var(--gold-dim));
  color:var(--maroon-deep); border-color:rgba(122,0,0,.30);
  box-shadow:0 2px 10px rgba(120,90,0,.25);
}
.sdb-btn-ol-read:hover:not(:disabled) {
  background:linear-gradient(135deg,var(--gold-pale),var(--gold));
  transform:translateY(-2px); box-shadow:0 6px 18px rgba(120,90,0,.35);
}
.sdb-ol-section-label {
  display:flex; align-items:center; gap:10px; margin:26px 0 14px;
  font-family:var(--font-display); font-size:13px; font-weight:700;
  letter-spacing:.08em; text-transform:uppercase; color:var(--text-dim);
}
.sdb-ol-section-label::after {
  content:''; flex:1; height:1px; background:rgba(139,0,0,.16);
}
.sdb-ol-error {
  font-family:var(--font-sans); font-size:12px; color:var(--text-muted);
  padding:8px 2px; font-style:italic;
}

/* ════════ TABLE — rich book-table style (matches Admin Book Catalog) ════════ */
.sdb-table-wrap {
  background:var(--bg-base);
  border:1px solid rgba(139,0,0,.14); border-radius:var(--radius-lg);
  overflow:hidden; overflow-x:auto; -webkit-overflow-scrolling:touch;
  box-shadow:0 2px 8px rgba(80,0,0,.07),0 6px 24px rgba(80,0,0,.05);
}
.sdb-table-wrap table { width:100%; min-width:640px; border-collapse:collapse; }
.sdb-table-wrap thead tr { background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-card)); border-bottom:2px solid rgba(201,168,76,.35); }
.sdb-table-wrap thead th {
  padding:13px 16px; text-align:left; font-family:var(--font-sans);
  font-size:11px; font-weight:700; letter-spacing:.10em; text-transform:uppercase;
  color:#F5E4A8; white-space:nowrap;
}
.sdb-table-wrap tbody tr { border-bottom:1px solid rgba(139,0,0,.08); transition:background var(--ease); }
.sdb-table-wrap tbody tr:last-child { border-bottom:none; }
.sdb-table-wrap tbody tr:hover { background:rgba(122,0,0,.04); }
.sdb-table-wrap tbody td { padding:12px 16px; text-align:left;font-size:13px; color:var(--text-secondary); vertical-align:middle; }

/* Book cell — cover + stacked title/author, used inside any table */
.sdb-rtbl-book { display:flex; align-items:center; gap:12px; min-width:180px; }
.sdb-rtbl-book-title { font-family:var(--font-display); font-weight:700; font-size:13.5px; color:var(--text-primary); line-height:1.25; }
.sdb-rtbl-book-author { font-size:11.5px; color:var(--text-muted); margin-top:2px; font-family:var(--font-sans); }

/* Pills — Campus / Genre chips inside tables */
.sdb-rtbl-pill { display:inline-flex; align-items:center; padding:4px 12px; border-radius:99px; font-size:11px; font-weight:600; font-family:var(--font-sans); white-space:nowrap; }
.sdb-rtbl-pill-campus { background:rgba(201,168,76,.16); color:var(--gold-dim); border:1px solid rgba(201,168,76,.34); }
.sdb-rtbl-pill-genre  { background:rgba(59,130,246,.10); color:#2563EB; border:1px solid rgba(59,130,246,.22); }
.sdb-rtbl-copies { font-weight:700; color:var(--text-primary); font-family:var(--font-sans); }
.sdb-rtbl-isbn { font-family:var(--font-sans); color:var(--text-muted); font-size:12.5px; letter-spacing:.01em; }

/* ════════ BUTTONS — matches .lm-btn ════════ */
.sdb-btn {
  display:inline-flex; align-items:center; gap:7px;
  padding:9px 18px; border-radius:var(--radius);
  font-family:var(--font-sans); font-size:13px; font-weight:500;
  cursor:pointer; border:1px solid transparent; white-space:nowrap;
  letter-spacing:.01em; transition:all var(--ease);
}
.sdb-btn-primary {
  background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep));
  color:var(--gold-pale); border-color:rgba(201,168,76,.30);
  box-shadow:0 2px 10px rgba(40,0,0,.30);
}
.sdb-btn-primary:hover:not(:disabled) {
  background:linear-gradient(135deg,var(--maroon-light),var(--maroon-mid));
  border-color:rgba(201,168,76,.50); transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(40,0,0,.40);
}
.sdb-btn-primary:disabled { opacity:.50; cursor:not-allowed; transform:none !important; }
.sdb-btn-ghost {
  background:transparent; color:var(--maroon); border-color:rgba(139,0,0,.28);
}
.sdb-btn-ghost:hover:not(:disabled) {
  background:rgba(139,0,0,.06); border-color:rgba(139,0,0,.48);
  transform:translateY(-1px); color:var(--maroon-deep);
}
.sdb-btn-ghost:disabled { opacity:.50; cursor:not-allowed; }
.sdb-btn-danger {
  background:rgba(178,58,58,.08);
  color:#b23a3a; border-color:rgba(178,58,58,.25);
}
.sdb-btn-danger:hover { background:rgba(178,58,58,.16); border-color:rgba(178,58,58,.42); transform:translateY(-1px); }

/* Table action btns */
.sdb-tbl-btn {
  display:inline-flex; align-items:center; gap:5px;
  padding:5px 12px; border-radius:7px;
  font-family:var(--font-sans); font-size:11.5px; font-weight:500;
  cursor:pointer; border:1px solid transparent; transition:all var(--ease);
}
.sdb-tbl-edit { background:rgba(122,0,0,.07); color:var(--maroon); border-color:rgba(122,0,0,.18); }
.sdb-tbl-edit:hover { background:rgba(122,0,0,.14); border-color:rgba(122,0,0,.32); transform:translateY(-1px); }
.sdb-tbl-del { background:rgba(178,58,58,.08); color:#b23a3a; border-color:rgba(178,58,58,.18); }
.sdb-tbl-del:hover { background:rgba(178,58,58,.16); border-color:rgba(178,58,58,.32); transform:translateY(-1px); }

/* ════════ STATUS BADGE ════════ */
.sdb-badge {
  display:inline-flex; align-items:center; gap:5px;
  padding:3px 10px; border-radius:12px;
  font-size:10.5px; font-weight:600; font-family:var(--font-sans);
  letter-spacing:.04em; white-space:nowrap;
}

/* ════════ FORM — matches .lm-input / .lm-label ════════ */
.sdb-form-group { display:flex; flex-direction:column; margin-bottom:14px; }
.sdb-form-row   { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.sdb-form-row-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:14px; }
.sdb-label {
  display:block; font-size:11px; font-weight:600; letter-spacing:.08em;
  text-transform:uppercase; color:var(--text-dim); margin-bottom:6px;
}
.sdb-input {
  width:100%; padding:9.5px 13px; border-radius:var(--radius);
  border:1px solid rgba(139,0,0,.24); background:var(--cream);
  color:var(--text-primary); font-family:var(--font-sans); font-size:13px;
  outline:none; transition:border-color var(--ease),box-shadow var(--ease),background var(--ease);
}
.sdb-input::placeholder { color:var(--text-dim); }
.sdb-input:focus { border-color:var(--maroon-mid); box-shadow:0 0 0 3px rgba(139,0,0,.10); background:#F5ECD0; }
.sdb-select {
  padding:8.5px 12px; border-radius:var(--radius);
  border:1px solid rgba(139,0,0,.22); background:var(--cream);
  color:var(--text-primary); font-family:var(--font-sans); font-size:12.5px;
  outline:none; cursor:pointer; transition:border-color var(--ease);
  appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A3030' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 12px center;
  padding-right:36px;
}
.sdb-select:focus { border-color:rgba(139,0,0,.45); box-shadow:0 0 0 3px rgba(139,0,0,.09); }
.sdb-pw-wrap { position:relative; }
.sdb-pw-toggle {
  position:absolute; right:10px; top:50%; transform:translateY(-50%);
  background:none; border:none; color:var(--text-dim); cursor:pointer;
  display:flex; padding:4px; transition:color var(--ease);
}
.sdb-pw-toggle:hover { color:var(--text-muted); }
.sdb-search-wrap { position:relative; flex:1; min-width:200px; }
.sdb-search-icon {
  position:absolute; left:12px; top:50%; transform:translateY(-50%);
  color:var(--text-muted); display:flex; pointer-events:none;
}

/* ════════ FILTER BAR ════════ */
.sdb-filters { display:flex; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
.sdb-count {
  font-size:12px; color:var(--text-muted); padding:6px 12px;
  border-radius:var(--radius-sm); background:rgba(139,0,0,.07);
  border:1px solid rgba(139,0,0,.14); white-space:nowrap;
}

/* ════════ MODAL — matches .lm-modal ════════ */
.sdb-modal-bg {
  position:fixed; inset:0; background:rgba(15,0,0,.72);
  backdrop-filter:blur(5px); display:flex; align-items:center;
  justify-content:center; z-index:500; animation:lm-fade-in .2s ease; padding:20px;
}
.sdb-modal {
  background:var(--cream); border:1px solid rgba(139,0,0,.22);
  border-radius:var(--radius-xl); width:100%; max-width:520px;
  max-height:90vh; display:flex; flex-direction:column; overflow:hidden;
  box-shadow:0 24px 64px rgba(40,0,0,.50),0 0 0 1px rgba(201,168,76,.10);
  animation:lm-modal-in .28s cubic-bezier(.34,1.56,.64,1);
}
.sdb-modal-hdr {
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 24px; border-bottom:1px solid rgba(139,0,0,.15);
  background:linear-gradient(135deg,var(--maroon-deep),var(--maroon-mid));
  flex-shrink:0; position:relative;
}
.sdb-modal-hdr::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.40),transparent);
}
.sdb-modal-title { font-family:var(--font-display); font-size:16px; font-weight:600; color:var(--gold-pale); letter-spacing:.05em; }
.sdb-modal-sub   { font-size:11.5px; color:rgba(245,228,168,.55); margin-top:2px; font-family:var(--font-sans); }
.sdb-modal-close {
  width:30px; height:30px; border-radius:50%;
  background:rgba(245,228,168,.10); border:1px solid rgba(245,228,168,.15);
  color:rgba(245,228,168,.70); font-size:14px;
  display:flex; align-items:center; justify-content:center; cursor:pointer;
  transition:all var(--ease);
}
.sdb-modal-close:hover { background:rgba(245,228,168,.22); color:var(--gold-pale); transform:scale(1.08); }
.sdb-modal-body { padding:22px 24px; overflow-y:auto; flex:1; background:var(--cream); }
.sdb-modal-foot {
  padding:16px 24px; border-top:1px solid rgba(139,0,0,.14);
  display:flex; justify-content:flex-end; gap:10px; flex-shrink:0;
  background:rgba(139,0,0,.05);
}

/* ════════ ACTIVITY ITEM ════════ */
.sdb-activity-item {
  display:flex; align-items:center; gap:12px;
  padding:11px 4px; border-bottom:1px solid rgba(201,168,76,.07);
  transition:background var(--ease),padding-left var(--ease);
  border-radius:var(--radius-sm); cursor:default;
}
.sdb-activity-item:last-child { border-bottom:none; }
.sdb-activity-item:hover { background:rgba(122,0,0,.04); padding-left:8px; }
.sdb-activity-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; box-shadow:0 0 6px currentColor; }
.sdb-activity-text { flex:1; font-size:12.5px; color:var(--text-secondary); line-height:1.45; }
.sdb-activity-time { font-size:10.5px; color:var(--text-muted); white-space:nowrap; flex-shrink:0; }

/* ════════ PROFILE HEADER ════════ */
.sdb-profile-banner {
  background:linear-gradient(160deg,#FDF6EC 0%,#FAF0E4 100%);
  border:1px solid rgba(139,0,0,.14); border-radius:var(--radius-lg);
  overflow:hidden; margin-bottom:18px;
  box-shadow:0 2px 8px rgba(80,0,0,.07),0 6px 24px rgba(80,0,0,.05);
}
.sdb-profile-cover {
  height:90px; position:relative;
  background:linear-gradient(135deg,var(--maroon-mid) 0%,var(--maroon-deep) 100%);
}
.sdb-profile-cover::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.55),transparent);
}
.sdb-profile-info { display:flex; align-items:flex-end; gap:20px; padding:0 28px 22px; margin-top:-46px; }
.sdb-profile-av-wrap {
  width:90px; height:90px; border-radius:50%; flex-shrink:0;
  border:3px solid rgba(201,168,76,.60); overflow:hidden;
  background:linear-gradient(135deg,#8B0000,#5A0000);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 18px rgba(0,0,0,.45);
}
.sdb-profile-upload-btn {
  position:absolute; bottom:2px; right:2px; width:28px; height:28px;
  border-radius:50%; background:linear-gradient(135deg,#8B0000,#5A0000);
  border:2px solid rgba(201,168,76,.55); cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  color:var(--gold-pale); transition:transform .18s;
}
.sdb-profile-upload-btn:hover { transform:scale(1.10); }

/* ════════ INFO ROW ════════ */
.sdb-info-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:11px 0; border-bottom:1px solid rgba(201,168,76,.07);
  transition:padding-left var(--ease);
}
.sdb-info-row:last-child { border-bottom:none; }
.sdb-info-row:hover { padding-left:4px; }
.sdb-info-key { font-size:11px; font-weight:600; letter-spacing:.09em; text-transform:uppercase; color:var(--text-dim); font-family:var(--font-sans); }
.sdb-info-val { font-size:13px; color:var(--text-secondary); font-family:var(--font-sans); text-align:right; }

/* ════════ TOGGLE ════════ */
.sdb-toggle-track {
  width:44px; height:24px; border-radius:12px; border:none; cursor:pointer;
  position:relative; transition:background .22s; flex-shrink:0;
}
.sdb-toggle-thumb {
  width:18px; height:18px; border-radius:50%; background:white;
  position:absolute; top:3px; transition:left .22s;
  box-shadow:0 1px 4px rgba(0,0,0,.30);
}
.sdb-toggle-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:13px 0; border-bottom:1px solid rgba(201,168,76,.07);
}
.sdb-toggle-row:last-child { border-bottom:none; }

/* ════════ SPINNER / SKELETON / EMPTY ════════ */
.sdb-spinner {
  width:22px; height:22px; border:2px solid rgba(139,0,0,.18);
  border-top-color:var(--maroon-mid); border-radius:50%;
  animation:lm-spin .65s linear infinite;
}
.sdb-loading { display:flex; align-items:center; justify-content:center; gap:12px; padding:60px 20px; }
.sdb-skeleton {
  background:linear-gradient(90deg,rgba(201,168,76,.08) 25%,rgba(201,168,76,.04) 50%,rgba(201,168,76,.08) 75%);
  background-size:200% 100%; animation:lm-fade-in 1.4s ease infinite; border-radius:6px;
}
.sdb-empty { text-align:center; padding:60px 20px; }
.sdb-empty-icon { font-size:38px; margin-bottom:12px; opacity:.50; }
.sdb-empty-text { font-family:var(--font-display); font-size:15px; color:var(--maroon-mid); }
.sdb-empty-sub  { font-size:12px; color:var(--text-muted); margin-top:5px; }

/* ════════ TOAST ════════ */
.sdb-toast {
  position:fixed; bottom:28px; right:28px; z-index:9999;
  border-radius:12px; padding:13px 22px;
  display:flex; align-items:center; gap:10px;
  font-family:var(--font-sans); font-size:13px;
  box-shadow:0 10px 32px rgba(40,0,0,.44); max-width:340px;
  animation:lm-toast-in .3s cubic-bezier(.34,1.56,.64,1);
}
.sdb-toast-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

/* ════════ TABS ════════ */
.sdb-tabs { display:flex; border-bottom:1px solid rgba(139,0,0,.18); margin-bottom:18px; gap:0; }
.sdb-tab {
  display:inline-flex; align-items:center; gap:7px; padding:10px 20px;
  border:none; border-bottom:2.5px solid transparent; margin-bottom:-1px;
  background:transparent; font-family:var(--font-sans); font-size:13px; font-weight:500;
  color:var(--text-muted); cursor:pointer; white-space:nowrap;
  transition:color .15s,border-color .15s;
}
.sdb-tab:hover { color:var(--text-secondary); }
.sdb-tab.on { font-weight:700; color:var(--maroon); border-bottom-color:var(--maroon); }

.sdb-shell {
  --dd-bg:#ffffff; --dd-border:rgba(139,0,0,.14); --dd-head-bg:rgba(139,0,0,.04); --dd-hover:rgba(139,0,0,.06);
}
.sdb-hero-name--onbanner { color:#F5E4A8 !important; text-shadow:0 1px 3px rgba(0,0,0,.45); }


.sdb-home-hero {
  position:relative; display:flex; align-items:center; justify-content:flex-start;
  margin:-28px -30px 0; padding:0; overflow:hidden;
  min-height:clamp(330px,30vw,450px);
  background:#F8F0DD; border:none; border-radius:0; box-shadow:none;
}
.sdb-home-hero-media {
  position:absolute; top:0; right:0; bottom:0; width:62%;
  border:none; border-radius:0; box-shadow:inset 0 14px 26px -18px rgba(20,8,0,.30),inset 0 -18px 30px -16px rgba(20,8,0,.28);
  z-index:0; overflow:hidden;
}
.sdb-home-hero-media img { width:100%; height:100%; object-fit:cover; display:block; }
.sdb-home-hero-media::after {      /* the photo melts into the copy — one long, smooth transparent fade, no hard edge */
  content:''; position:absolute; inset:0; pointer-events:none;
  background:
    linear-gradient(90deg,
      #F8F0DD 0%,
      rgba(248,240,221,.92) 9%,
      rgba(243,231,199,.76) 18%,
      rgba(238,219,175,.56) 28%,
      rgba(232,204,150,.36) 38%,
      rgba(232,204,150,.18) 48%,
      rgba(232,204,150,.07) 57%,
      rgba(232,204,150,0) 66%
    ),
    linear-gradient(180deg,rgba(30,14,4,.14) 0%,rgba(30,14,4,0) 18%,rgba(30,14,4,0) 76%,rgba(24,10,2,.20) 100%);
}
.sdb-home-hero-text {
  position:relative; z-index:1; flex:0 1 640px; max-width:640px;
  padding:0 40px 54px 150px; text-align:left;
}
.sdb-home-hero-eyebrow {
  font-family:var(--font-sans); font-size:13px; font-weight:600; text-align:left;
  letter-spacing:.07em; text-transform:uppercase; color:var(--maroon-deep); margin-bottom:18px;
}
.sdb-home-hero-title {
  font-family:var(--font-hero); font-weight:700; letter-spacing:-.005em; text-align:left;
  font-size:clamp(28px,3.2vw,46px); line-height:1.14; color:var(--maroon-deep); margin-bottom:18px;
}
.sdb-home-hero-sub {
  font-family:var(--font-sans); font-size:14px; font-weight:500; line-height:1.55; text-align:left;
  color:var(--maroon); margin-bottom:28px; max-width:300px;
}
.sdb-home-hero-actions { display:flex; gap:12px; flex-wrap:wrap; }

/* ── stats strip — single ivory card that overlaps the hero's lower edge ── */
.sdb-home-stats-bar {
  position:relative; z-index:2; display:flex;
  margin:-48px 0 30px;
  background:linear-gradient(180deg,#FFFCF5 0%,#FBF3E3 100%);
  border:1px solid rgba(139,0,0,.10); border-radius:6px;
  overflow:hidden;
  box-shadow:0 6px 22px rgba(80,0,0,.10), inset 0 1px 0 rgba(255,255,255,.8);
}
.sdb-home-stat {
  position:relative; flex:1; display:flex; flex-direction:column; align-items:center;
  gap:11px; text-align:center; padding:26px 12px 24px;
  border-right:1px solid rgba(139,0,0,.10);
  --st-accent:#8B0000; --st-accent-soft:rgba(139,0,0,.09);
}
.sdb-home-stat:last-child { border-right:none; }
.sdb-home-stat-value {
  font-family:var(--font-hero); font-size:clamp(26px,2.4vw,34px); font-weight:700;
  color:var(--st-accent); line-height:1; letter-spacing:.01em;
  font-variant-numeric:tabular-nums; font-feature-settings:'tnum' 1;
}
.sdb-home-stat-num  { display:inline-block; }
.sdb-home-stat-dash { display:inline-block; animation:sdb-stat-breathe 1.4s ease-in-out infinite; }
.sdb-home-stat-label {
  font-family:var(--font-sans); font-size:12px; font-weight:600; letter-spacing:.07em;
  text-transform:uppercase; color:var(--maroon-deep); opacity:.78;
}
/* per-column accent colours */
.sdb-home-stat.st-borrowed  { --st-accent:#8B0000; --st-accent-soft:rgba(139,0,0,.09); }
.sdb-home-stat.st-returned  { --st-accent:#9A7A31; --st-accent-soft:rgba(201,168,76,.18); }
.sdb-home-stat.st-available { --st-accent:#2E6A4F; --st-accent-soft:rgba(46,106,79,.11); }
.sdb-home-stat.st-favorites { --st-accent:#A8324A; --st-accent-soft:rgba(168,50,74,.10); }

@keyframes sdb-stat-breathe { 0%,100%{opacity:.30} 50%{opacity:.62} }
@media (prefers-reduced-motion: reduce) {
  .sdb-home-stat-num, .sdb-home-stat-dash { animation:none; }
}


/* ── shared home-section header ── */
.sdb-home-section { margin-bottom:28px; }
.sdb-home-section-hdr { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
.sdb-home-eyebrow { font-family:var(--font-sans); font-size:10.5px; font-weight:700; letter-spacing:.20em; text-transform:uppercase; color:var(--maroon); margin-bottom:4px; text-align:left; }
.sdb-home-section-title { font-family:var(--font-hero); font-size:clamp(21px,1.9vw,26px); font-weight:700; color:var(--maroon-deep); letter-spacing:-.005em;text-align:left; }
.sdb-home-viewall {
  background:transparent; border:none; cursor:pointer;
  font-family:var(--font-sans); font-size:11.5px; font-weight:700; letter-spacing:.05em;
  text-transform:uppercase; color:var(--maroon); white-space:nowrap; padding:6px 2px;
  transition:color var(--ease);
}
.sdb-home-viewall:hover { color:var(--gold-dim); }

/* ── category rail — premium editorial cards
      photo + cinematic overlay + soft warm glow + line icon + white type ── */
.sdb-home-cat-rail {
  display:flex; gap:16px; overflow-x:auto; padding:6px 4px 14px;
  scroll-snap-type:x proximity; scroll-behavior:smooth; -webkit-overflow-scrolling:touch;
  scrollbar-width:thin; scrollbar-color:rgba(139,0,0,.25) transparent;
}
.sdb-home-cat-rail::-webkit-scrollbar { height:6px; }
.sdb-home-cat-rail::-webkit-scrollbar-track { background:transparent; }
.sdb-home-cat-rail::-webkit-scrollbar-thumb { background:rgba(139,0,0,.22); border-radius:99px; }

/* card — one integrated visual element: the photograph IS the card */
.sdb-home-cat-card {
  position:relative; display:block; -webkit-appearance:none; appearance:none;
  border:none; padding:0; margin:0; cursor:pointer; isolation:isolate;
  flex:1 1 204px; min-width:204px; max-width:246px;
  aspect-ratio:37/41;                 /* 244×270 at full width, same ratio at every size */
  border-radius:14px; overflow:hidden; scroll-snap-align:start;
  background:linear-gradient(145deg,#3A1512 0%,#1C0705 100%);  /* fallback if photo missing */
  box-shadow:0 8px 24px rgba(58,12,8,.16), 0 1px 3px rgba(58,12,8,.10);
  transition:transform .3s cubic-bezier(.4,0,.2,1), box-shadow .3s cubic-bezier(.4,0,.2,1);
}
.sdb-home-cat-card::after {           /* hairline edge keeps the corner crisp on ivory */
  content:''; position:absolute; inset:0; z-index:2; border-radius:inherit;
  pointer-events:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.10);
}
.sdb-home-cat-card img {
  position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;
  transform:scale(1.01); transform-origin:center;
  transition:transform .45s cubic-bezier(.22,.61,.36,1), opacity .2s ease;
}
.sdb-home-cat-card:hover { transform:translateY(-4px); box-shadow:0 16px 34px rgba(58,12,8,.26), 0 2px 5px rgba(58,12,8,.12); }
.sdb-home-cat-card:hover img { transform:scale(1.05); }
.sdb-home-cat-card:active { transform:translateY(-1px); }
.sdb-home-cat-card:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* dark overlay — layered gradient, never a flat black wash; bottom reads darkest */
.sdb-home-cat-overlay {
  position:absolute; inset:0; z-index:1;
  display:grid; grid-template-rows:1fr auto; justify-items:center;
  padding:7% 14px 15%; text-align:center;
  background:
    radial-gradient(118% 66% at 50% 33%, rgba(255,228,176,.12) 0%, rgba(0,0,0,0) 62%),
    linear-gradient(180deg, rgba(26,10,6,.20) 0%, rgba(24,9,6,.46) 52%, rgba(14,4,2,.74) 100%);
}

/* soft circular light behind the icon — warm photographic glow, never neon */
.sdb-home-cat-iconwrap { position:relative; align-self:center; display:grid; place-items:center; width:70px; height:70px; }
.sdb-home-cat-glow {
  position:absolute; left:50%; top:50%; width:154px; height:154px;
  transform:translate(-50%,-50%); border-radius:50%; pointer-events:none;
  filter:blur(11px); opacity:.92;
  background:radial-gradient(circle, rgba(255,245,220,.35) 0%, rgba(255,243,214,.13) 45%, rgba(255,240,210,0) 74%);
  transition:opacity .3s ease, transform .3s ease;
}
.sdb-home-cat-card:hover .sdb-home-cat-glow { opacity:1; transform:translate(-50%,-50%) scale(1.07); }
.sdb-home-cat-icon {
  position:relative; width:66px; height:66px; border-radius:50%;
  display:flex; align-items:center; justify-content:center; color:#FFF8EC;
  border:1.4px solid rgba(255,247,233,.55);
  background:radial-gradient(circle at 50% 42%, rgba(255,245,220,.16) 0%, rgba(255,245,220,.05) 62%, rgba(255,245,220,0) 100%);
  box-shadow:inset 0 0 18px rgba(255,240,205,.16), 0 0 16px rgba(255,236,196,.13);
  backdrop-filter:blur(.5px);
}
.sdb-home-cat-icon svg { display:block; width:30px; height:30px; }

/* typography sits ON the photograph */
.sdb-home-cat-text { align-self:end; display:flex; flex-direction:column; gap:5px; }
.sdb-home-cat-label {
  font-family:var(--font-sans); font-size:14.5px; font-weight:700; line-height:1.1;
  letter-spacing:.115em; text-transform:uppercase; color:#FFFFFF;
  text-shadow:0 1px 6px rgba(0,0,0,.55);
}
.sdb-home-cat-tag {
  font-family:var(--font-sans); font-size:11.5px; font-weight:400; line-height:1.25;
  letter-spacing:.015em; color:rgba(255,250,240,.78); text-shadow:0 1px 5px rgba(0,0,0,.5);
}
@media (prefers-reduced-motion:reduce) {
  .sdb-home-cat-card, .sdb-home-cat-card img, .sdb-home-cat-glow { transition:none; }
  .sdb-home-cat-card:hover { transform:none; }
  .sdb-home-cat-card:hover img { transform:scale(1.01); }
}


/* ── "Must Read" shelf ── */
.sdb-mr-hdr { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:22px; flex-wrap:wrap; }
.sdb-mr-eyebrow-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.sdb-mr-eyebrow-icon { display:flex; color:var(--maroon-deep); }
.sdb-mr-eyebrow-icon svg { width:19px; height:19px; }
.sdb-mr-eyebrow-text { font-family:var(--font-sans); font-size:11px; font-weight:700; letter-spacing:.20em; text-transform:uppercase; color:var(--maroon-deep); }
.sdb-mr-title { font-family:var(--font-hero); font-size:clamp(21px,1.9vw,26px); font-weight:700; color:var(--maroon-deep); letter-spacing:-.005em;text-align:left;}
.sdb-mr-title-dark   { color:#241611; }
.sdb-mr-title-accent { color:var(--maroon-deep); }
.sdb-mr-viewall {
    background:transparent; border:none; cursor:pointer;
  font-family:var(--font-sans); font-size:11.5px; font-weight:700; letter-spacing:.05em;
  text-transform:uppercase; color:var(--maroon); white-space:nowrap; padding:6px 2px;
  transition:color var(--ease)
}
.sdb-mr-viewall:hover { color:var(--gold-dim); border-color:var(--gold-dim); gap:9px; }

.sdb-mr-carousel { position:relative; }
.sdb-mr-arrow {
  position:absolute; top:calc(50% - 14px); transform:translateY(-50%);
  width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background:#FFFDF8; border:1px solid rgba(139,0,0,.14); box-shadow:0 6px 18px rgba(80,0,0,.16);
  color:var(--maroon-deep); cursor:pointer; z-index:3;
  transition:background .2s ease, color .2s ease, box-shadow .2s ease;
}
.sdb-mr-arrow svg { width:15px; height:15px; }
.sdb-mr-arrow:hover { background:var(--maroon-deep); color:#FFF6DF; box-shadow:0 8px 22px rgba(80,0,0,.26); }
.sdb-mr-arrow-left  { left:-20px; }
.sdb-mr-arrow-right { right:-20px; }

.sdb-home-book-grid {
  display:flex; gap:18px; overflow-x:auto; scroll-snap-type:x proximity;
  scrollbar-width:none; padding:4px 12px 8px;
}
.sdb-home-book-grid::-webkit-scrollbar { display:none; }
.sdb-home-book-card {
  position:relative; flex:0 0 calc((100% - 5 * 18px) / 6); scroll-snap-align:start;
  cursor:pointer; text-align:left; display:flex; flex-direction:column;
  background:var(--cream); border:1.5px solid rgba(139,0,0,.14); border-radius:var(--radius-md);
  overflow:hidden; box-shadow:0 4px 14px rgba(80,0,0,.08);
  transition:transform var(--ease), box-shadow var(--ease), border-color var(--ease);
}
.sdb-home-book-card:hover {
  transform:translateY(-4px); box-shadow:0 10px 24px rgba(80,0,0,.20);
  border-color:rgba(139,0,0,.32);
}
.sdb-mr-bookmark {
  position:absolute; top:12px; right:12px; z-index:4;
  width:29px; height:29px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background:var(--maroon-deep); color:#FFF6DF; border:1.5px solid rgba(255,255,255,.30);
  box-shadow:0 4px 10px rgba(0,0,0,.26); cursor:pointer;
  transition:transform .2s ease, background .2s ease;
}
.sdb-mr-bookmark svg { width:12px; height:12px; }
.sdb-mr-bookmark:hover { transform:scale(1.09); }
.sdb-mr-bookmark.on { background:var(--gold-dim); }
.sdb-book-cover-area-alt {
  width:100%; height:190px; flex-shrink:0; box-sizing:border-box;
  background:rgba(139,0,0,.05);
  border-bottom:1.5px solid rgba(139,0,0,.10);
  display:flex; align-items:center; justify-content:center;
  padding:12px; /* even inset on every side so covers of any aspect ratio sit framed the same way */
}
.sdb-book-cover-area-alt img,
.sdb-book-cover-area-alt > div {
  max-width:100% !important; max-height:100% !important;
  width:auto !important; height:auto !important; border-radius:4px !important;
  object-fit:contain !important; /* show the whole cover, uncropped, instead of cropping to fill */
  border:1.5px solid rgba(139,0,0,.16) !important; /* frame sits flush on the cover's own edges, not the padded box */
  box-shadow:0 2px 8px rgba(0,0,0,.18);
}
.sdb-home-book-body { padding:14px 16px 16px; display:flex; flex-direction:column; flex:1; }
.sdb-home-book-title {
  font-family:var(--font-sans); font-size:15px; font-weight:800;
  color:#241611; line-height:1.32;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  min-height:2.6em; /* reserves 2 lines so 1-line and 2-line titles keep every card the same height */
}
.sdb-home-book-author {
  font-family:var(--font-sans); font-weight:600; letter-spacing:.03em;
  font-size:11px; text-transform:uppercase; color:var(--text-muted); margin-top:6px; line-height:1.4;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.sdb-mr-underline { display:block; width:24px; height:2px; background:var(--maroon-deep); margin-top:10px; border-radius:2px; flex-shrink:0; }

/* ── promo / footer banner — diagonal maroon panel bleeding into the photo,
   thin gold seam at the cut, richer layered shadow ── */
.sdb-home-footer-banner {
  position:relative; display:block; border-radius:14px; overflow:hidden;
  height:clamp(190px,17.5vw,232px); min-height:0;
  border:1px solid rgba(201,168,76,.38);
  box-shadow:
    0 18px 40px rgba(40,8,8,.30),
    0 4px 12px rgba(40,8,8,.22),
    inset 0 1px 0 rgba(255,255,255,.06);
  margin-bottom:6px;
}
.sdb-home-footer-media { position:absolute; inset:0; z-index:0; overflow:hidden; }
.sdb-home-footer-media img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
/* warm colour-wash so the photograph reads as one palette with the maroon panel */
.sdb-home-footer-media::before {
  content:''; position:absolute; inset:0; z-index:1; pointer-events:none;
  background:
    linear-gradient(100deg,#4A0000 0%,rgba(74,0,0,.85) 30%,rgba(74,0,0,.30) 46%,rgba(74,0,0,0) 58%),
    linear-gradient(0deg,rgba(40,10,0,.22) 0%,rgba(40,10,0,0) 40%);
}
.sdb-home-footer-content {
  position:relative; z-index:2; height:100%; flex:none;
  width:min(56%,480px); display:flex; flex-direction:column; justify-content:center;
  align-items:flex-start; text-align:left;
  padding:0 30px 0 38px;
  background:linear-gradient(105deg,#4A0000 0%,#6E0000 66%,rgba(110,0,0,.35) 74%,rgba(110,0,0,0) 82%);
  clip-path:polygon(0 0,100% 0,74% 100%,0 100%);
}
.sdb-home-footer-eyebrow-row { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.sdb-home-footer-eyebrow-line { width:26px; height:1px; background:var(--gold-light); flex-shrink:0; }
.sdb-home-footer-title {
  font-family:var(--font-sans); font-size:11px; font-weight:600; letter-spacing:.14em;
  text-transform:uppercase; color:rgba(255,249,241,.88); margin:0;
}
.sdb-home-footer-sub {
  font-family:var(--font-hero); font-size:clamp(19px,2vw,26px); line-height:1.22; margin-bottom:20px;
}
.sdb-home-footer-sub-main { display:block; font-weight:700; color:#FFF9F1; }
.sdb-home-footer-sub-accent { display:block; font-style:italic; font-weight:600; color:var(--gold-light); }
.sdb-home-footer-actions { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.sdb-home-footer-btn {
  display:inline-flex; align-items:center; gap:8px; padding:12px 22px; border-radius:999px;
  font-family:var(--font-sans); font-size:11.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
  border:1.5px solid transparent; cursor:pointer; white-space:nowrap;
  transition:transform var(--ease),box-shadow var(--ease),background var(--ease),border-color var(--ease);
}
.sdb-home-footer-btn-gold {
  background:linear-gradient(135deg,var(--gold-light) 0%,var(--gold-dim) 100%);
  color:var(--maroon-deep); box-shadow:0 6px 16px rgba(0,0,0,.28);
}
.sdb-home-footer-btn-gold:hover { transform:translateY(-1px); box-shadow:0 9px 20px rgba(0,0,0,.34); }
.sdb-home-footer-btn-gold svg { width:14px; height:14px; transition:transform var(--ease); }
.sdb-home-footer-btn-gold:hover svg { transform:translateX(3px); }
.sdb-home-footer-btn-outline {
  background:rgba(255,255,255,.02); border-color:rgba(245,228,168,.55); color:#FFF6DF;
}
.sdb-home-footer-btn-outline:hover { background:rgba(245,228,168,.12); border-color:var(--gold-light); }

/* ── site footer — maroon band, same width and height as the top navbar ── */
.sdb-sitefoot {
  display:flex; align-items:center; justify-content:center; gap:24px;
  margin:20px 0 0; padding:8px 26px;            /* no side bleed → exactly the navbar's width */
  height:auto; min-height:var(--topbar-h);      /* same height as the navbar (grows only if the text wraps on phones) */
  background:linear-gradient(180deg,#6E0000 0%,var(--maroon-deep) 100%);
  border-top:2px solid rgba(201,168,76,.32);
}
.sdb-sitefoot-text {
  flex:1 1 auto; text-align:center;
  font-family:var(--font-display); font-weight:600; text-transform:uppercase;   /* Cinzel — formal inscriptional capitals */
  font-size:clamp(11px,1.1vw,15px); letter-spacing:.16em; line-height:1.5;
  color:#F3E3C4; opacity:.72; text-shadow:0 1px 2px rgba(0,0,0,.30);            /* 72% opacity (70–75%) */
}
.sdb-sitefoot-dot { color:var(--gold); margin:0 1em; font-size:.8em; vertical-align:.12em; }
@media (max-width:640px) {
  .sdb-sitefoot-text { letter-spacing:.08em; }
  .sdb-sitefoot-dot { margin:0 .55em; }
}

/* ── hero CTA buttons: rectangular, uppercase, matches reference ── */
.sdb-home-cta {
  text-transform:uppercase; letter-spacing:.08em; font-size:12px; font-weight:700;
  border-radius:6px; padding:12px 24px;
}

/* ── responsive ── */
@media (max-width:1100px) {
  .sdb-home-book-card { flex-basis:calc((100% - 2 * 18px) / 3); }
}
@media (max-width:900px) {
  .sdb-home-hero { flex-direction:column; align-items:stretch; padding:0; min-height:0; margin:-22px -20px 0; }
  .sdb-home-hero-media { position:relative; inset:auto; order:-1; width:100%; max-width:none; height:210px; }
  .sdb-home-hero-media::after { background:
    linear-gradient(180deg,rgba(248,240,221,0) 40%,rgba(240,220,175,.60) 64%,rgba(248,240,221,.92) 84%,#F8F0DD 100%),
    linear-gradient(0deg,rgba(24,10,2,.24) 0%,rgba(24,10,2,0) 14%); }
  .sdb-home-hero-text { flex:1 1 auto; max-width:none; padding:22px 22px 44px; text-align:left; }
  .sdb-home-hero-sub { max-width:none; }
  .sdb-home-stats-bar { flex-wrap:wrap; margin-top:-30px; }
  .sdb-home-stat { flex:1 1 50%; border-right:none; border-bottom:1px solid rgba(139,0,0,.12); padding:18px 10px; }
  .sdb-home-cat-card { flex:0 0 190px; min-width:190px; max-width:190px; }
  .sdb-home-cat-icon { width:60px; height:60px; }
  .sdb-home-cat-icon svg { width:27px; height:27px; }
  .sdb-home-footer-banner { display:flex; flex-direction:column; height:auto; }
  .sdb-home-footer-media { position:relative; inset:auto; height:170px; }
  .sdb-home-footer-content {
    position:relative; z-index:2; width:100%; height:auto; clip-path:none;
    background:linear-gradient(160deg,#4A0000 0%,#6E0000 100%);
    padding:22px 22px 26px; align-items:flex-start;
  }
}
@media (max-width:640px) {
  .sdb-home-cat-rail { gap:12px; }
  .sdb-home-cat-card { flex:0 0 164px; min-width:164px; max-width:164px; }
  .sdb-home-cat-icon { width:54px; height:54px; }
  .sdb-home-cat-icon svg { width:24px; height:24px; }
  .sdb-home-cat-glow { width:120px; height:120px; }
  .sdb-home-cat-label { font-size:13px; letter-spacing:.1em; }
  .sdb-home-cat-tag { font-size:10.5px; }
  .sdb-home-book-card { flex-basis:calc((100% - 1 * 18px) / 2); }
}

/* ════════ RESPONSIVE ════════ */
@media (max-width:1280px) { .sdb-stats-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:1024px) {
  .sdb-module { padding:22px 20px; }
  .sdb-home-hero { margin:-22px -20px 0; }
  .sdb-mr-carousel { margin:0 -20px; }
  .sdb-home-footer-banner { margin:0 -20px; border-radius:0; }
  .sdb-sitefoot { margin:18px 0 0; padding:8px 26px; }
  .sdb-navlinks { display:none; }
  .sdb-hamburger { display:flex; }
  .sdb-mobnav.open { display:flex; }
  .sdb-profile-field-grid { grid-template-columns:repeat(3,1fr) !important; }
}
@media (max-width:640px) {
  .sdb-profile-field-grid { grid-template-columns:repeat(2,1fr) !important; }
}
@media (max-width:400px) {
  .sdb-profile-field-grid { grid-template-columns:1fr !important; }
}
@media (min-width:1025px) { .sdb-mobnav { display:none !important; } }
@media (max-width:768px) {
  .sdb-brand-sub { display:none; }
  .sdb-profile-name,.sdb-profile-role { display:none; }
  .sdb-profile-chip { padding:5px; gap:0; }
  .sdb-chip-caret { display:none; }
  .sdb-stats-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
  .sdb-module { padding:14px 14px 28px; }
  .sdb-home-hero { margin:-14px -14px 0; }
  .sdb-mr-carousel { margin:0 -14px; }
  .sdb-home-footer-banner { margin:0 -14px; border-radius:0; }
  .sdb-sitefoot { margin:16px 0 0; padding:8px 14px; gap:14px; }
  .sdb-navbar { padding:0 14px; }
  .sdb-brand-title { font-size:14px; }
  .sdb-book-grid { grid-template-columns:repeat(2,1fr) !important; }
  .sdb-form-row { grid-template-columns:1fr; }
  .sdb-form-row-3 { grid-template-columns:1fr; }
  .sdb-page-hero-title { font-size:22px !important; }
}
@media (max-width:480px) {
  .sdb-stats-grid { grid-template-columns:1fr; }
  .sdb-book-grid  { grid-template-columns:repeat(2,1fr) !important; }
  .sdb-module { padding:10px 10px 24px; }
  .sdb-home-hero { margin:-10px -10px 0; }
  .sdb-mr-carousel { margin:0 -10px; }
  .sdb-home-footer-banner { margin:0 -10px; border-radius:0; }
  .sdb-sitefoot { margin:14px 0 0; padding:8px 10px; gap:10px; }
  .sdb-dropdown { width:200px; }
}
@media (max-width:360px) {
  .sdb-book-grid { grid-template-columns:1fr !important; }
}


.sdb-page-hero {
  
  position:relative; width:100%; margin:0 0 24px;
  overflow:hidden; min-height:clamp(112px,8.4vw,140px);
  background:var(--bg-base); border:none; border-radius:0; box-shadow:none;
}
.sdb-page-hero-inner {
  /* re-applies .sdb-module's own max-width+padding just for the text, so the
     title lines up with the search bar / cards below it. */
  position:relative; z-index:1; height:100%; max-width:1520px; margin:0 auto;
  padding:0 30px; display:flex; align-items:center; justify-content:flex-start;
}
.sdb-page-hero-media {
  position:absolute; top:0; right:0; bottom:0; width:62%;
  z-index:0; overflow:hidden;
}
.sdb-page-hero-media img {
  width:100%; height:100%; object-fit:cover; object-position:center; display:block;
  filter:blur(2.5px); transform:scale(1.05); /* soft focus; scale hides the blurred edges */
}
.sdb-page-hero-media::after {      /* the photo melts into the copy — same long, smooth fade as the Dashboard */
  content:''; position:absolute; inset:0; pointer-events:none;
  background:
    linear-gradient(90deg,
      #F8F0DD 0%,
      rgba(248,240,221,.92) 9%,
      rgba(243,231,199,.76) 18%,
      rgba(238,219,175,.56) 28%,
      rgba(232,204,150,.36) 38%,
      rgba(232,204,150,.18) 48%,
      rgba(232,204,150,.07) 57%,
      rgba(232,204,150,0) 66%
    );
}
.sdb-page-hero::after {            /* very light top/bottom shading, laid across the FULL width so there is no seam */
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:linear-gradient(180deg,rgba(30,14,4,.035) 0%,rgba(30,14,4,0) 14%,rgba(30,14,4,0) 80%,rgba(24,10,2,.05) 100%);
}
.sdb-page-hero-text {
  flex:0 1 720px; max-width:720px; padding:14px 0 16px 14px; text-align:left;
}
.sdb-page-hero-title {
  font-family:var(--font-hero); font-weight:700; letter-spacing:-.005em; text-align:left;
  font-size:clamp(26px,2.9vw,42px); line-height:1.12; color:var(--maroon-deep); margin:0 0 8px;
}
.sdb-page-hero-sub {
  font-family:var(--font-sans); font-size:clamp(13px,1.05vw,15.5px); font-weight:500; line-height:1.45;
  text-align:left; color:var(--maroon); margin:0;
}
/* the inner grid's own padding tracks .sdb-module's padding at every step —
   the 1024px step lines up with the navbar's own collapse into the
   hamburger/mobile-nav, so the whole page reflows together. */
@media (max-width:1024px) {
  .sdb-page-hero { margin-bottom:20px; }
  .sdb-page-hero-inner { padding:0 20px; }
  .sdb-page-hero-media { width:100%; }
  .sdb-page-hero-media::after {
    background:linear-gradient(90deg,var(--bg-base) 0%,rgba(248,240,221,.92) 40%,rgba(240,220,175,.55) 70%,rgba(232,204,150,.25) 100%);
  }
}
@media (max-width:768px) {
  .sdb-page-hero { margin-bottom:16px; min-height:auto; }
  .sdb-page-hero-inner { padding:0 14px; }
  .sdb-page-hero-text { padding:20px 0 20px 4px; }
}
@media (max-width:480px) {
  /* on the smallest screens the photo is dropped entirely so the banner
     is just flat page background — the seamless, no-shadow look the
     rest of the mobile UI (hamburger nav, stacked cards) already has */
  .sdb-page-hero { margin-bottom:14px; }
  .sdb-page-hero-inner { padding:0 10px; }
  .sdb-page-hero-media { display:none; }
  .sdb-page-hero-text { padding:16px 0; max-width:100%; }
}


.lm-notif-wrap {
  position: relative;
  overflow: visible;
}

.lm-notif-badge {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #E4C468, #C9A84C);
  color: #3A0000;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 800;
  font-family: var(--font-sans);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 1.5px solid var(--cream, #FAF6EE);
  line-height: 1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.28);
  animation: lm-badge-pop 0.28s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes lm-badge-pop {
  0%   { transform: scale(0.3); opacity: 0; }
  60%  { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1); }
}


.lm-notif-backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 1999;
}

.lm-notif-panel {
  
  position: fixed;
  top: 68px;
  right: 24px;
  width: 368px; /* keep in sync with NOTIF_PANEL_WIDTH in Dashboard.jsx */
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - var(--topbar-h, 72px) - 32px);
  background: var(--notif-cream);
  border: 1px solid var(--notif-border);
  border-radius: 16px;
  box-shadow: 0 18px 38px rgba(40,0,0,0.22), 0 4px 12px rgba(40,0,0,0.12), 0 0 0 1px rgba(139,0,0,0.05);
  z-index: 2000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform-origin: top right;
  animation: lm-notif-panel-in 0.2s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes lm-notif-panel-in {
  0%   { opacity: 0; transform: scale(0.96) translateY(-6px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}


.lm-notif-caret {
  position: fixed;
  top: 58px;
  width: 16px;
  height: 16px;
  background: var(--notif-maroon);
  border: none;
  border-radius: 3px 0 0 0;
  box-shadow: none;
  z-index: 2001;
  pointer-events: none;
  transform-origin: center;
  animation: lm-notif-caret-in 0.2s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes lm-notif-caret-in {
  0%   { opacity: 0; transform: rotate(45deg) scale(0.8); }
  100% { opacity: 1; transform: rotate(45deg) scale(1); }
}

.lm-notif-head {
  padding: 16px 20px 12px;
  background: linear-gradient(180deg, var(--notif-maroon) 0%, var(--notif-maroon-dark) 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}
.lm-notif-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.lm-notif-head-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--notif-header-text);
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.lm-notif-head-title svg { flex-shrink: 0; width: 14px; height: 14px; }
.lm-notif-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,248,237,0.45);
  font-family: var(--font-sans);
  white-space: nowrap;
  flex-shrink: 0;
}
.lm-notif-live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(245,228,168,0.35);
  flex-shrink: 0;
}
.lm-notif-live.is-live { color: #7CDB8A; }
.lm-notif-live.is-live .lm-notif-live-dot {
  background: #4CAF50;
  box-shadow: 0 0 6px rgba(76,175,80,0.85);
  animation: lm-pulse-dot 1.8s infinite;
}

.lm-notif-action-btn {
  background: rgba(201,168,76,0.14);
  border: 1px solid rgba(201,168,76,0.32);
  border-radius: 8px;
  cursor: pointer;
  font-size: 10.5px;
  color: var(--notif-header-text);
  font-family: var(--font-sans);
  font-weight: 600;
  padding: 5px 10px;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.lm-notif-action-btn:hover  { background: rgba(201,168,76,0.26); transform: translateY(-1px); }
.lm-notif-action-btn:active { transform: translateY(0) scale(0.97); }
.lm-notif-action-btn:focus-visible {
  outline: 2px solid var(--notif-gold);
  outline-offset: 2px;
}

/* Facebook-style All / Unread filter tabs. */
.lm-notif-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lm-notif-tab {
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(255,248,237,0.62);
  padding: 6px 14px;
  border-radius: 20px;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.lm-notif-tab:hover { background: rgba(255,248,237,0.08); color: var(--notif-header-text); }
.lm-notif-tab.active {
  background: var(--notif-gold);
  color: var(--notif-maroon-dark);
}
.lm-notif-tab:focus-visible {
  outline: 2px solid var(--notif-gold);
  outline-offset: 2px;
}


.lm-notif-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 6px;
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--notif-secondary);
  background: var(--notif-cream);
  position: sticky;
  top: 0;
  z-index: 1;
}
.lm-notif-see-all {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--notif-maroon);
  padding: 2px 4px;
  transition: color 0.15s;
}
.lm-notif-see-all:hover { color: var(--notif-gold); text-decoration: underline; }

.lm-notif-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(201,168,76,0.30) rgba(0,0,0,0.15);
}

.lm-notif-empty {
  padding: 40px 20px;
  text-align: center;
  font-family: var(--font-sans);
}
.lm-notif-empty-title {
  font-family: var(--font-display);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--notif-text);
  margin-bottom: 5px;
}
.lm-notif-empty-sub { font-size: 11px; color: var(--notif-secondary); max-width: 240px; margin: 0 auto; line-height: 1.55; }

.lm-notif-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 18px 13px 20px;
  border-bottom: 1px solid var(--notif-border);
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
  background: transparent;
  position: relative;
  animation: lm-notif-row-in 0.28s ease both;
}
@keyframes lm-notif-row-in {
  0%   { opacity: 0; transform: translateX(6px); }
  100% { opacity: 1; transform: translateX(0); }
}
.lm-notif-row.unread { background: var(--notif-unread); }
.lm-notif-row:hover  {
  background: rgba(139,0,0,0.05);
  box-shadow: inset 2px 0 0 rgba(139,0,0,0.18);
}
.lm-notif-row:active { transform: scale(0.995); }
.lm-notif-row:last-child { border-bottom: none; }
.lm-notif-row:focus-visible {
  outline: 2px solid var(--notif-gold);
  outline-offset: -2px;
}

/* Permanent, formal accent marker — full-strength color while unread,
   fades to a quiet tint once read, rather than appearing/disappearing.
   This is the only per-type visual cue now that the row icon is gone. */
.lm-notif-row-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  transition: background 0.2s ease;
}

.lm-notif-body { flex: 1; min-width: 0; }
.lm-notif-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}
.lm-notif-type {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  font-family: var(--font-sans);
}
.lm-notif-time {
  font-size: 9.5px;
  color: var(--notif-secondary);
  font-family: var(--font-sans);
  flex-shrink: 0;
}
.lm-notif-msg {
  font-size: 11.5px;
  font-family: var(--font-sans);
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--notif-secondary);
  font-weight: 400;
}
.lm-notif-msg.is-unread {
  color: var(--notif-text);
  font-weight: 600;
}
.lm-notif-unread-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
  animation: lm-pulse-dot 2s infinite;
}

.lm-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.lm-notif-foot {
  padding: 10px 16px;
  border-top: 1px solid var(--notif-border);
  background: rgba(139,0,0,0.035);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.lm-notif-settings-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  font-family: var(--font-sans);
  padding: 3px 4px;
  transition: color 0.15s;
  white-space: nowrap;
}
.lm-notif-settings-link:hover { color: var(--maroon-mid); }
.lm-notif-foot-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.lm-notif-foot-count {
  font-size: 10px;
  color: var(--text-dim);
  font-family: var(--font-sans);
  white-space: nowrap;
}
.lm-notif-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10.5px;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-weight: 500;
  padding: 3px 6px;
  border-radius: 6px;
  transition: color 0.15s;
  white-space: nowrap;
}
.lm-notif-clear-btn:hover { color: var(--maroon-mid); }


.lm-notif-row.unlinked { cursor: default; }
.lm-notif-row.unlinked:hover { background: transparent; }
.lm-notif-row.unlinked .lm-notif-icon { opacity: 0.7; }
.lm-notif-link-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 20px;
  font-family: var(--font-sans);
  white-space: nowrap;
}
.lm-notif-link-tag--area {
  color: var(--gold-dim);
  background: rgba(201,168,76,0.16);
  border: 1px solid rgba(201,168,76,0.35);
}
.lm-notif-link-tag--none {
  color: var(--text-dim);
  background: rgba(139,0,0,0.05);
  border: 1px solid rgba(139,0,0,0.12);
}


.lm-notif-hist-page .lm-module-header { align-items: center; }

.lm-notif-hist-panel {
  background: linear-gradient(175deg, #FFFDF9 0%, #FBF3DE 100%);
  border: 1px solid rgba(201,168,76,0.45);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}
.lm-notif-hist-panel .lm-panel-title {
  padding: 16px 22px;
  margin: 0;
  border-bottom: 1px solid rgba(201,168,76,0.35);
  background: linear-gradient(135deg, var(--maroon-mid), var(--maroon-deep));
  color: var(--gold-pale);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.lm-notif-hist-count {
  font-size: 10px;
  font-weight: 700;
  background: rgba(201,168,76,0.20);
  color: #F5E4A8;
  padding: 2px 9px;
  border-radius: 20px;
  text-transform: none;
  letter-spacing: 0.02em;
  margin-left: auto;
}
.lm-notif-hist-list {
  max-height: 560px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(201,168,76,0.30) rgba(139,0,0,0.05);
}
.lm-notif-hist-foot {
  padding: 12px 22px;
  border-top: 1px solid rgba(201,168,76,0.25);
  background: rgba(139,0,0,0.035);
  flex-shrink: 0;
}
.lm-notif-hist-foot-note {
  font-size: 10.5px;
  color: var(--text-dim);
  font-family: var(--font-sans);
}

/* Deep-link highlight used by BookManagement / UserManagement /
   AttendanceMonitoring when a notification is opened and scrolls a
   specific row into view. */
@keyframes lm-notif-target-glow {
  0%   { box-shadow: 0 0 0 0 rgba(201,168,76,0.55); }
  50%  { box-shadow: 0 0 0 6px rgba(201,168,76,0.16); }
  100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
}
.lm-notif-target {
  animation: lm-notif-target-glow 1.4s ease-out 2;
  outline: 2px solid rgba(201,168,76,0.55) !important;
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .lm-notif-hist-list { max-height: none; }
}


@media (max-width: 768px) {
  .lm-notif-panel { width: 340px; }
}


@media (max-width: 560px) {
  .lm-notif-panel {
    position: fixed;
    top: calc(var(--topbar-h, 60px) + 8px);
    bottom: auto;
    left: 10px;
    right: 10px;
    height: auto;
    width: auto;
    max-width: none;
    max-height: calc(100vh - var(--topbar-h, 60px) - 24px);
    border-radius: 18px;
    animation: lm-notif-panel-in-mobile 0.24s cubic-bezier(0.22,1,0.36,1) both;
  }
  @keyframes lm-notif-panel-in-mobile {
    0%   { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .lm-notif-list { max-height: calc(100vh - var(--topbar-h, 60px) - 180px); }
  .lm-notif-head { padding: 12px 14px 10px; gap: 10px; }
  .lm-notif-head-top { flex-wrap: wrap; row-gap: 6px; }
  .lm-notif-head-title { font-size: 13.5px; }
  .lm-notif-tabs { width: 100%; }
  .lm-notif-tab { flex: 1; text-align: center; padding: 6px 8px; }
  .lm-notif-section-head { padding: 8px 14px 6px; }
  .lm-notif-row { padding: 11px 14px; }
  .lm-notif-msg { -webkit-line-clamp: 3; line-clamp: 3; }
  .lm-notif-caret { display: none; }
}

@media (max-width: 360px) {
  .lm-notif-panel { left: 6px; right: 6px; }
  .lm-notif-foot { padding: 8px 12px; flex-direction: column; align-items: stretch; gap: 8px; }
  .lm-notif-foot-right { margin-left: 0; justify-content: space-between; }
}

/* -- Notification-history page shell (module header / stat cards / filters / search / select / buttons), ported 1:1 from Dashboard.css -- */
.lm-module-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.lm-module-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--maroon-deep);
  letter-spacing: 0.03em;
  line-height: 1.2;
}

.lm-module-subtitle {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 5px;
  line-height: 1.55;
}


.lm-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 22px;
}

.lm-stat-card {
  background: linear-gradient(145deg, #8B0000 0%, #680000 100%);
  border: 1px solid rgba(201,168,76,0.42);
  border-radius: var(--radius-lg);
  padding: 22px 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
  transition: transform var(--ease), box-shadow var(--ease), border-color var(--ease);
  box-shadow: var(--shadow-card);
  cursor: default;
}


.lm-stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--gold-dim), var(--gold-light), var(--gold));
}


.lm-stat-card::after {
  content: '';
  position: absolute;
  bottom: -20px; right: -20px;
  width: 80px; height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%);
  pointer-events: none;
}

.lm-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 32px rgba(40,0,0,0.45);
  border-color: rgba(201,168,76,0.60);
}

.lm-stat-icon {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
  border-radius: 11px;
  background: rgba(201,168,76,0.14);
  border: 1px solid rgba(201,168,76,0.25);
  color: var(--gold);
  margin-bottom: 4px;
  flex-shrink: 0;
  transition: background var(--ease), transform var(--ease);
}
.lm-stat-card:hover .lm-stat-icon {
  background: rgba(201,168,76,0.22);
  transform: scale(1.08);
}

.lm-stat-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(255,230,150,0.72);
  font-family: var(--font-sans);
}

.lm-stat-value {
  font-family: var(--font-display);
  font-size: 32px;
  color: #FFE97A;
  line-height: 1;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 10px rgba(0,0,0,0.35);
}

.lm-stat-sub {
  font-size: 11px;
  color: rgba(255,225,140,0.55);
  font-family: var(--font-sans);
  margin-top: 2px;
}
.lm-panel-title {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--gold);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(201,168,76,0.18);
  display: flex;
  align-items: center;
  gap: 8px;
}
.lm-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: var(--radius);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--ease);
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.lm-btn--primary {
  background: linear-gradient(135deg, var(--maroon-mid), var(--maroon-deep));
  color: var(--gold-pale);
  border-color: rgba(201,168,76,0.30);
  box-shadow: 0 2px 10px rgba(40,0,0,0.30);
}
.lm-btn--primary:hover {
  background: linear-gradient(135deg, var(--maroon-light), var(--maroon-mid));
  border-color: rgba(201,168,76,0.50);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(40,0,0,0.40);
}
.lm-btn--primary:active { transform: translateY(0); }

.lm-btn--ghost {
  background: transparent;
  color: var(--gold);
  border-color: rgba(201,168,76,0.38);
}
.lm-btn--ghost:hover {
  background: rgba(201,168,76,0.10);
  border-color: rgba(201,168,76,0.58);
  transform: translateY(-1px);
  color: var(--gold-light);
}

.lm-btn--danger {
  background: linear-gradient(135deg, rgba(139,0,0,0.5), rgba(80,0,0,0.5));
  color: #ef9a9a;
  border-color: rgba(239,154,154,0.25);
}
.lm-btn--danger:hover {
  background: linear-gradient(135deg, rgba(180,0,0,0.65), rgba(110,0,0,0.65));
  border-color: rgba(239,154,154,0.42);
  transform: translateY(-1px);
}


.lm-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.lm-search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.lm-search-icon {
  position: absolute;
  left: 12px; top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  display: flex;
  pointer-events: none;
}
.lm-search {
  width: 100%;
  padding: 9px 14px 9px 38px;
  border-radius: var(--radius);
  border: 1px solid rgba(139,0,0,0.22);
  background: var(--cream-light);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  outline: none;
  transition: border-color var(--ease), box-shadow var(--ease), background var(--ease);
}
.lm-search::placeholder { color: var(--text-dim); }
.lm-search:focus {
  border-color: rgba(139,0,0,0.45);
  box-shadow: 0 0 0 3px rgba(139,0,0,0.09);
  background: #F5ECD0;
}

.lm-select {
  padding: 8.5px 12px;
  border-radius: var(--radius);
  border: 1px solid rgba(139,0,0,0.22);
  background: var(--cream-light);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 12.5px;
  outline: none;
  cursor: pointer;
  transition: border-color var(--ease), box-shadow var(--ease);
}
.lm-select:focus {
  border-color: rgba(139,0,0,0.45);
  box-shadow: 0 0 0 3px rgba(139,0,0,0.09);
}
.lm-select--sm { padding: 8px 12px; font-size: 12px; }


`;


const STUDENT_NOTIF_MAX = 15;
const STUDENT_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // last 24h shown on first load, same as Dashboard.jsx


const STUDENT_NOTIF_TYPES = {
  BORROW_APPROVED:  { label: 'Approved',  color: '#3F6B4A' },
  BORROW_CANCELLED: { label: 'Rejected',  color: '#8B3A3A' },
  SYSTEM_ALERT:     { label: 'System',    color: '#9C5A2E' },
};

function buildStudentNotification({ id, type, title, message, createdAt, extra = {} }) {
  return { id, type, title, message, createdAt, extra, read: false };
}


function getStudentNotifTarget(n) {
  switch (n?.type) {
    case 'BORROW_APPROVED':
    case 'BORROW_CANCELLED':
      return { kind: 'area', tab: 'history' };
    default:
      return { kind: 'area', tab: 'home' }; // SYSTEM_ALERT and anything unrecognized
  }
}

function fmtNotifAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/* ═══════════════════════════════════════════════
   NAVIGATION CONFIG
═══════════════════════════════════════════════ */
/* Primary top-navbar tabs — Browse-only student dashboard (no borrowed-books tab) */
const NAV = [
  { id:'home',      label:'Dashboard',      icon:'dashboard' },
  { id:'catalog',   label:'Browse Catalog', icon:'catalog'   },
  { id:'history',   label:'History',        icon:'history'   },
  { id:'favorites', label:'Favorite',       icon:'heart'     },
];

/* Profile-dropdown-only tabs */
const PROFILE_MENU = [
  { id:'profile',  label:'My Profile', icon:'profile'  },
  { id:'settings', label:'Settings',   icon:'settings' },
];

const PAGE_TITLES = {
  home:'Student Dashboard', catalog:'Browse Catalog',
  favorites:'Favorite', history:'History',
  profile:'My Profile', settings:'Settings',
};

/* ═══════════════════════════════════════════════
   ICONS — same style as Admin Dashboard NavIcons
═══════════════════════════════════════════════ */
const Ic = {
  dashboard: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  catalog:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  borrowed:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  heart:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  heartFill: <svg width="15" height="15" viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  history:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
  profile:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  collapseL: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  menu:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  book:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  bookmark:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M6 2a2 2 0 0 0-2 2v18l8-5.2L20 22V4a2 2 0 0 0-2-2H6z"/></svg>,
  check:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  clock:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  return:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
  star:      <svg width="13" height="13" viewBox="0 0 24 24" fill="#C9A84C" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  starOff:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,.30)" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  trash:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  edit:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  save:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  lock:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  bell:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  shield:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  camera:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  eyeOn:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  chevDown:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>,
};

/* ═══════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════ */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', hour12:true });
}
function fmtFull(iso) {
  if (!iso) return '—';
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}
function relAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s/60)} min ago`;
  if (s < 86400) return `${Math.floor(s/3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month:'short', day:'numeric' });
}
function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}


function parseAbstractData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
   
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { heading: '', paragraphs: [String(parsed)], keywords: [] };
    }
    return parsed;
  } catch {
    // Not JSON at all — legacy plain-text abstracts fall back gracefully.
    return { heading: '', paragraphs: [raw], keywords: [] };
  }
}


function mergeFragmentedParagraphs(paragraphs = [], subheadings = []) {
  const merged = [];
  let buffer = '';
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const isSubhead = subheadings?.includes(para);
    if (isSubhead) {
      if (buffer.trim()) { merged.push(buffer.trim()); buffer = ''; }
      merged.push(para);
      continue;
    }
    const trimmed = para.trim();
    if (!trimmed) continue;
    buffer = buffer ? buffer + ' ' + trimmed : trimmed;
    const lastChar = buffer.trimEnd().slice(-1);
    if (/[.!?:]/.test(lastChar)) { merged.push(buffer.trim()); buffer = ''; }
  }
  if (buffer.trim()) merged.push(buffer.trim());
  return merged;
}


function AbstractBlock({ raw, fallbackTitle, authorName, compact = false, maxParagraphs = null, plain = false }) {
  const data = parseAbstractData(raw);
  if (!data) return null;


  const looksLikeByline = (text) => {
    if (!authorName) return false;
    const norm = (s) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
    const nameWords = new Set(norm(authorName));
    if (!nameWords.size) return false;
    const words = norm(text);
    if (!words.length || words.length > nameWords.size + 2) return false; // real sentences are longer
    const hits = words.filter(w => nameWords.has(w)).length;
    return hits / words.length >= 0.6;
  };

  const rawParagraphs = (data.paragraphs || []).filter(p => !looksLikeByline(p));
  const paragraphs = mergeFragmentedParagraphs(rawParagraphs, data.subheadings)
    .slice(0, maxParagraphs || undefined);
  if (!paragraphs.length) return null;
  const cleanKeywords = (data.keywords || []).filter(k => !looksLikeByline(k));

  return (
    <div>
      {(data.heading || fallbackTitle) && (
        <>
          <div style={plain ? {
            fontFamily: "'Playfair Display',var(--font-display),serif",
            fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 10, lineHeight: 1.25, textAlign: 'left',
          } : {
            fontFamily: '"Georgia","Times New Roman",serif',
            fontSize: compact ? 15 : 18, fontWeight: 700, color: '#5A0000',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 8, lineHeight: 1.3,
          }}>
            {data.heading || fallbackTitle}
          </div>
          {!plain && <div style={{
            width: 44, height: 2, marginBottom: 14,
            background: 'linear-gradient(90deg,#C9A84C,transparent)', borderRadius: 2,
          }} />}
        </>
      )}
      {paragraphs.map((para, i) => {
        const isSubhead = data.subheadings?.includes(para);
        if (isSubhead) {
          return (
            <div key={i} style={{
              fontSize: compact ? 12 : 13, fontWeight: 700, color: '#6B0000',
              fontFamily: '"Georgia",serif', letterSpacing: '0.05em',
              textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
              borderBottom: '1px solid rgba(139,0,0,.10)', paddingBottom: 5,
            }}>
              {para}
            </div>
          );
        }
        return (
          <p key={i} style={{
            fontSize: compact ? 12.5 : 13.5, color: 'var(--text-secondary)',
            fontFamily: plain ? 'var(--font-sans)' : '"Georgia","Times New Roman",serif',
            lineHeight: plain ? 1.75 : (compact ? 1.7 : 1.85), textAlign: plain ? 'left' : 'justify',
            textIndent: plain ? 0 : '1.6em', margin: '0 0 10px 0',
          }}>
            {para}
          </p>
        );
      })}
      {!compact && cleanKeywords.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(139,0,0,.10)' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
            Keywords
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cleanKeywords.map((kw, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '3px 11px', borderRadius: 14,
                background: 'rgba(139,0,0,.06)', border: '1px solid rgba(139,0,0,.16)',
                color: '#6B0000', fontFamily: 'var(--font-sans)', fontWeight: 500, fontStyle: 'italic',
              }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function normalizeStatus(status) {
  const s = status?.toLowerCase();
  return s === 'active' ? 'approved' : s;
}
function statusCfg(status) {
  const map = {
    returned: { label:'Returned',  color:'#1D6FA5', bg:'rgba(59,130,246,.12)',  border:'rgba(59,130,246,.28)'  },
    pending:  { label:'Pending',   color:'#B8912B', bg:'rgba(201,168,76,.14)',  border:'rgba(201,168,76,.32)'  },
    approved: { label:'Approved',  color:'#178A4C', bg:'rgba(34,197,94,.12)',   border:'rgba(34,197,94,.28)'   },
    rejected: { label:'Rejected',  color:'#B23A3A', bg:'rgba(178,58,58,.10)',   border:'rgba(178,58,58,.26)'   },
    overdue:  { label:'Overdue',   color:'#B23A3A', bg:'rgba(178,58,58,.10)',   border:'rgba(178,58,58,.26)'   },
    due_soon: { label:'Due Soon',  color:'#C97A1B', bg:'rgba(255,152,0,.12)',   border:'rgba(255,152,0,.28)'   },
  };
  return map[normalizeStatus(status)] || { label:status||'Unknown', color:'#7A3030', bg:'rgba(122,0,0,.07)', border:'rgba(122,0,0,.16)' };
}
function dueStatusCfg(dueDate) {
  if (!dueDate) return statusCfg('approved');
  const d = daysUntil(dueDate);
  if (d < 0)  return statusCfg('overdue');
  if (d <= 3) return statusCfg('due_soon');
  return statusCfg('approved');
}
function availCfg(copies) {
  const n = copies ?? 1;
  if (n > 0) return { label:'Available',   color:'#178A4C', bg:'rgba(34,197,94,.12)',  border:'rgba(34,197,94,.28)'  };
  return          { label:'Unavailable', color:'#B23A3A', bg:'rgba(178,58,58,.10)',  border:'rgba(178,58,58,.26)' };
}

/* ═══════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════ */

/* Toast */
function Toast({ msg, isError }) {
  if (!msg) return null;
  return (
    <div className="sdb-toast" style={{
      background: isError ? 'rgba(100,0,0,.96)' : 'rgba(30,0,0,.95)',
      border: `1px solid ${isError ? 'rgba(239,154,154,.40)' : 'rgba(201,168,76,.35)'}`,
      color: '#F5E4A8',
    }}>
      <span className="sdb-toast-dot" style={{ background: isError ? '#ef9a9a' : '#81c784' }} />
      {msg}
    </div>
  );
}

/* Badge */
function Badge({ label, color, bg, border }) {
  return (
    <span className="sdb-badge" style={{ color, background:bg, border:`1px solid ${border}` }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }} />
      {label}
    </span>
  );
}

/* Avatar — matches .lm-avatar */
function Avatar({ url, initials, size = 36 }) {
  const [err, setErr] = useState(false);
  const style = { width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 };
  if (url && !err) return <img src={url} alt="avatar" style={style} onError={() => setErr(true)} />;
  return (
    <div className="sdb-avatar" style={{ width:size, height:size, fontSize:Math.round(size*.35) }}>
      {initials || 'S'}
    </div>
  );
}

/* Book Cover Placeholder */
function BookCover({ src, title, width = 80, height = 110 }) {
  const [err, setErr] = useState(false);
  const palettes = ['#7B0000','#5A0000','#8B0000','#6B0000','#4A0000','#6E2000','#003366'];
  const bg = palettes[Math.abs(((title || 'X').charCodeAt(0)) % palettes.length)];
  if (src && !err) {
    return <img src={src} alt={title} onError={() => setErr(true)}
      style={{ width, height, objectFit:'cover', borderRadius:6, flexShrink:0, display:'block' }} />;
  }
  return (
    <div style={{
      width, height, borderRadius:6, flexShrink:0, display:'flex',
      flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
      background:`linear-gradient(150deg,${bg},#1A0000)`,
      border:'1px solid rgba(201,168,76,.22)',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,.55)" strokeWidth="1.4">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <span style={{ fontSize:8, color:'rgba(245,228,168,.40)', textAlign:'center', padding:'0 4px', lineHeight:1.3, fontFamily:'var(--font-sans)' }}>
        {(title||'').slice(0,22)}
      </span>
    </div>
  );
}


function PageHero({ title, sub }) {
  return (
    <div className="sdb-page-hero">
      <div className="sdb-page-hero-media">
        <img src="/HeroBanner.png" alt="" onError={e => { e.target.style.display = 'none'; }} />
      </div>
      <div className="sdb-page-hero-inner">
        <div className="sdb-page-hero-text">
          <h1 className="sdb-page-hero-title">{title}</h1>
          {sub && <p className="sdb-page-hero-sub">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

/* Loading spinner */
function Spinner() {
  return <div className="sdb-loading"><div className="sdb-spinner" /><span style={{ color:'var(--text-muted)', fontSize:13 }}>Loading…</span></div>;
}

/* Modal */
function Modal({ maxWidth = 520, onClose, children }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="sdb-modal-bg" onClick={onClose}>
      <div className="sdb-modal" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* useToast hook */
function useToast() {
  const [toast, setToast] = useState({ msg:'', isError:false });
  const ref = useRef(null);
  const show = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    clearTimeout(ref.current);
    ref.current = setTimeout(() => setToast({ msg:'', isError:false }), 3200);
  }, []);
  return { toast, show };
}


const CatIcon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const HOME_CATEGORIES = [
  { key: 'Fiction',     label: 'Fiction',     tag: 'Explore Stories',  img: '/Fiction.jpg',
    icon: <CatIcon><path d="M12 7v13" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></CatIcon> },
  { key: 'Non-Fiction', label: 'Non-Fiction', tag: 'Expand Knowledge', img: '/Non-Fiction.jpg',
    icon: <CatIcon><path d="M4 4v16" /><path d="M8.5 7v13" /><path d="M13 5.5v14.5" /><path d="m17.2 6.6 3.4 13.1" /></CatIcon> },
  { key: 'Science',     label: 'Science',     tag: 'Discover Truths',  img: '/Science.jpg',
    icon: <CatIcon><path d="M9 3h6" /><path d="M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3" /><path d="M7.5 15h9" /></CatIcon> },
  { key: 'Technology',  label: 'Technology',  tag: 'Shape Tomorrow',   img: '/technology.jpg',
    icon: <CatIcon><rect x="6" y="6" width="12" height="12" rx="1.6" /><rect x="10" y="10" width="4" height="4" rx=".6" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2 2M17.4 17.4l2 2M19.4 4.6l-2 2M6.6 17.4l-2 2" /></CatIcon> },
  { key: 'History',     label: 'History',     tag: 'Relive the Past',  img: '/History.jpg',
    icon: <CatIcon><path d="M3.5 21h17" /><path d="M6 21V9.5M10 21V9.5M14 21V9.5M18 21V9.5" /><path d="m3 8.5 9-5.2 9 5.2" /></CatIcon> },
  { key: 'Education',   label: 'Education',   tag: 'Empower Minds',    img: '/Education.jpg',
    icon: <CatIcon><path d="M2 9.5 12 5l10 4.5-10 4.5-10-4.5z" /><path d="M6 11.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5" /><path d="M21 9.5V15" /></CatIcon> },
];


function CountUp({ value, loading, duration = 2000 }) {
  const [shown, setShown] = useState(0);
  const startedRef = useRef(false);
  const rafRef  = useRef(null);

  useEffect(() => {
    if (loading || startedRef.current) return undefined;
    const target = Number(value) || 0;

    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { startedRef.current = true; setShown(target); return undefined; }

    startedRef.current = true;
    let t0 = null;
    const tick = (now) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / duration);
      setShown(Math.floor(p * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setShown(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, loading, duration]);

  if (loading) return <span className="sdb-home-stat-dash">—</span>;
  return <span className="sdb-home-stat-num">{shown}</span>;
}

function PageHome({ user, profile, onNavigate }) {
  const { toast, show: showToast } = useToast();
  const [stats,  setStats]  = useState({ borrowed:0, returned:0, available:0, favorites:0 });
  const [loadSt, setLoadSt] = useState(true);

  // "Must Read" shelf — top favorited titles (falls back to newest approved titles)
  const [mustRead, setMustRead] = useState([]);
  const [loadMR,   setLoadMR]   = useState(true);
  const [mrFavIds, setMrFavIds] = useState(new Set());
  const mrTrackRef = useRef(null);

  const firstName = profile?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Student';
  const lastName  = profile?.last_name  || user?.user_metadata?.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const course    = profile?.course     || '';
  const year      = profile?.year_level || '';
  const initials  = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'S';

  useEffect(() => {
    if (!user?.id) { setLoadSt(false); return; }
    (async () => {
      try {
        const [a, b, c, d] = await Promise.all([
          supabase.from('borrow_requests').select('id',{count:'exact',head:true}).eq('student_id',user.id).in('status',['active','approved']),
          supabase.from('borrow_requests').select('id',{count:'exact',head:true}).eq('student_id',user.id).eq('status','returned'),
          // "available_copies" isn't a stored column on books — availability lives on
          // book_copies.status, so count copies currently marked Available instead.
          supabase.from('book_copies').select('copy_id',{count:'exact',head:true}).eq('status','Available'),
          supabase.from('student_favorites').select('id',{count:'exact',head:true}).eq('student_id',user.id),
        ]);
        setStats({ borrowed:a.count||0, returned:b.count||0, available:c.count||0, favorites:d.count||0 });
      } catch(e){ console.error('[Home stats]',e); } finally { setLoadSt(false); }
    })();
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      try {
        const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: borrowRows, error: brErr } = await supabase
          .from('borrowings')
          .select('book_id, book_title')
          .gte('borrowed_at', THIRTY_DAYS_AGO);
        
        if (brErr) console.warn('[Home mustRead] borrowings query unavailable, falling back:', brErr.message);

        const idCount    = {}; // book_id -> { count, title }
        const titleCount = {}; // book_title -> count   (rows with no book_id)
        (borrowRows || []).forEach(r => {
          if (!r.book_id && !r.book_title) return;
          if (r.book_id) {
            const k = String(r.book_id);
            if (!idCount[k]) idCount[k] = { count: 0, title: r.book_title };
            idCount[k].count++;
          } else {
            titleCount[r.book_title] = (titleCount[r.book_title] || 0) + 1;
          }
        });
        const ranked = [
          ...Object.entries(idCount).map(([id, v]) => ({ id, title: v.title, count: v.count, byId: true })),
          ...Object.entries(titleCount).map(([title, count]) => ({ id: null, title, count, byId: false })),
        ].sort((a, b) => b.count - a.count);

        const norm = s => (s || '').trim().toLowerCase();

       
        const { data: approvedBooks, error: booksErr } = await (() => {
          let q = supabase
            .from('books')
            .select('*')
            .eq('registration_status', 'approved');
  
          if (profile?.campus_id) q = q.eq('campus_id', profile.campus_id);
          return q.order('created_at', { ascending: false }).limit(500);
        })();
        if (booksErr) console.warn('[Home mustRead] books lookup failed:', booksErr.message);

        const bookById    = {};
        const bookByTitle = {};
        (approvedBooks || []).forEach(b => {
          if (b.id)    bookById[String(b.id)] = b;
          if (b.title) bookByTitle[norm(b.title)] = b;
        });

        const list = [];
        const usedTitles = new Set();
        for (const entry of ranked) {
          if (list.length >= 6) break;
          const rec = (entry.byId ? bookById[entry.id] : null) || bookByTitle[norm(entry.title)];
          if (!rec) continue; // borrowed title no longer exists in the catalog
          const key = norm(rec.title);
          if (usedTitles.has(key)) continue; // same title already counted (once by id, once by legacy title-only rows)
          usedTitles.add(key);
          list.push(rec);
        }

        if (list.length < 6) {
         
          for (const b of (approvedBooks || [])) {
            if (list.length >= 6) break;
            const key = norm(b.title);
            if (usedTitles.has(key)) continue;
            usedTitles.add(key);
            list.push(b);
          }
        }
        setMustRead(list.slice(0, 6));
      } catch (e) { console.error('[Home mustRead] threw an exception:', e); }
      finally { setLoadMR(false); }
    })();
  }, [profile?.campus_id]);

  
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('student_favorites').select('book_id').eq('student_id', user.id);
        if (error) { console.warn('[Home mustRead favorites]', error.message); return; }
        setMrFavIds(new Set((data || []).map(r => r.book_id)));
      } catch (e) { console.warn('[Home mustRead favorites]', e); }
    })();
  }, [user?.id]);

  const toggleMrFav = async (e, bookId) => {
    e.stopPropagation();
    if (!user?.id || !bookId) return;
    const isOn = mrFavIds.has(bookId);
    try {
      if (isOn) {
        const { error } = await supabase.from('student_favorites')
          .delete().eq('student_id', user.id).eq('book_id', bookId);
        if (error) { console.error('[Home fav remove]', error); showToast(`Could not remove favorite: ${error.message}`, true); return; }
        setMrFavIds(prev => { const n = new Set(prev); n.delete(bookId); return n; });
        setStats(st => ({ ...st, favorites: Math.max(0, st.favorites - 1) }));
        showToast('Removed from favorites.');
      } else {
        const { error } = await supabase.from('student_favorites')
          .insert({ student_id: user.id, book_id: bookId });
        if (error) { console.error('[Home fav add]', error); showToast(`Could not add favorite: ${error.message}`, true); return; }
        setMrFavIds(prev => new Set(prev).add(bookId));
        setStats(st => ({ ...st, favorites: st.favorites + 1 }));
        showToast('Added to favorites \u2665');
      }
    } catch (err) { console.error('[Home fav toggle]', err); showToast('Could not update favorite.', true); }
  };

  const scrollMustRead = (dir) => {
    const track = mrTrackRef.current;
    if (!track) return;
    const card = track.querySelector('.sdb-home-book-card');
    const step = card ? card.getBoundingClientRect().width + 18 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <div className="sdb-module">
      {/* ═══ Hero ═══ */}
      <div className="sdb-home-hero">
        <div className="sdb-home-hero-text">
          <div className="sdb-home-hero-eyebrow">Welcome back, {firstName}</div>
          <h1 className="sdb-home-hero-title">Where knowledge<br />meets every mind.</h1>
          <p className="sdb-home-hero-sub">Your next favorite story is just a page away.</p>
          <div className="sdb-home-hero-actions">
            <button className="sdb-btn sdb-btn-primary sdb-home-cta" onClick={() => onNavigate('catalog')}>
              Browse Now
            </button>
            <button className="sdb-btn sdb-btn-ghost sdb-home-cta" onClick={() => onNavigate('history')}>
              History
            </button>
          </div>
        </div>
        <div className="sdb-home-hero-media">
          <img src="/DashboardCover.png" alt="" onError={e => { e.target.style.display = 'none'; }} />
        </div>
      </div>

      {/* ═══ Stats strip ═══ */}
      <div className="sdb-home-stats-bar">
        <div className="sdb-home-stat st-borrowed">
          <div className="sdb-home-stat-value"><CountUp value={stats.borrowed} loading={loadSt} /></div>
          <div className="sdb-home-stat-label">Book Borrowed</div>
        </div>
        <div className="sdb-home-stat st-returned">
          <div className="sdb-home-stat-value"><CountUp value={stats.returned} loading={loadSt} /></div>
          <div className="sdb-home-stat-label">Book Returned</div>
        </div>
        <div className="sdb-home-stat st-available">
          <div className="sdb-home-stat-value"><CountUp value={stats.available} loading={loadSt} /></div>
          <div className="sdb-home-stat-label">Available Now</div>
        </div>
        <div className="sdb-home-stat st-favorites">
          <div className="sdb-home-stat-value"><CountUp value={stats.favorites} loading={loadSt} /></div>
          <div className="sdb-home-stat-label">Favorites Saved</div>
        </div>
      </div>

      {/* ═══ Browse by Category ═══ */}
      <div className="sdb-home-section">
        <div className="sdb-home-section-hdr">
          <div>
            
            <div className="sdb-home-eyebrow">Browse by Category</div>
            <div className="sdb-home-section-title">Find Your Next Read</div>
          
          </div>
          <button className="sdb-home-viewall" onClick={() => onNavigate('catalog')}>View All Categories →</button>
        </div>
        <div className="sdb-home-cat-rail">
          {HOME_CATEGORIES.map(cat => (
            <button
              key={cat.key} type="button" className="sdb-home-cat-card"
              onClick={() => onNavigate('catalog', cat.key)} title={`Browse ${cat.label}`}
            >
              <img src={cat.img} alt="" loading="lazy" onError={e => { e.target.style.opacity = 0; }} />
              <span className="sdb-home-cat-overlay">
                <span className="sdb-home-cat-iconwrap">
                  <span className="sdb-home-cat-glow" aria-hidden="true" />
                  <span className="sdb-home-cat-icon">{cat.icon}</span>
                </span>
                <span className="sdb-home-cat-text">
                  <span className="sdb-home-cat-label">{cat.label}</span>
                  <span className="sdb-home-cat-tag">{cat.tag}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Must Read ═══ */}
      <div className="sdb-home-section">
        <div className="sdb-mr-hdr">
          <div>
            <div className="sdb-mr-eyebrow-row">
              <span className="sdb-mr-eyebrow-text">Must Read</span>
            </div>
            <h2 className="sdb-mr-title">
              <span className="sdb-mr-title-dark">Readers'</span>{' '}
              <span className="sdb-mr-title-accent">All-Time Favorites</span>
            </h2>
          </div>
          <button className="sdb-mr-viewall" onClick={() => onNavigate('catalog', '', profile?.campus_id ? String(profile.campus_id) : '')}>
            View All Books <span aria-hidden="true">→</span>
          </button>
        </div>
        {loadMR ? <Spinner /> : mustRead.length === 0 ? (
          <div className="sdb-empty">
            <div className="sdb-empty-icon">📖</div>
            <div className="sdb-empty-text">No borrowing activity in the last 30 days</div>
            <div className="sdb-empty-sub">Once students start borrowing books, the most-borrowed titles will show up here.</div>
          </div>
        ) : (
          <div className="sdb-mr-carousel">
            <div className="sdb-home-book-grid" ref={mrTrackRef}>
              {mustRead.map(b => {
                const isFav = mrFavIds.has(b.id);
                return (
                  <div key={b.id} className="sdb-bk-card sdb-mr-bk-card" onClick={() => onNavigate('catalog', '', profile?.campus_id ? String(profile.campus_id) : '')}>
                    <button
                      type="button"
                      className="sdb-bk-bookmark"
                      onClick={(e) => toggleMrFav(e, b.id)}
                      title={isFav ? 'Saved to Favorites' : 'Save to Favorites'}
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"><path d="M6 2a2 2 0 0 0-2 2v18l8-5.2L20 22V4a2 2 0 0 0-2-2H6z" /></svg>
                    </button>
                    <div className="sdb-bk-cover">
                      <BookCover src={b.cover_image_url || b.cover_url} title={b.title} width="100%" height="100%" />
                    </div>
                    <div className="sdb-bk-info">
                      <div className="sdb-bk-title">{b.title}</div>
                      <div className="sdb-bk-author">{b.author || b.authors || ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Promo banner — diagonal maroon panel over full-bleed photo ═══ */}
      <div className="sdb-home-footer-banner">
        <div className="sdb-home-footer-media">
          <img src="/FooterCover.jpg" alt="" onError={e => { e.target.style.display = 'none'; }} />
        </div>
        <div className="sdb-home-footer-content">
          <div className="sdb-home-footer-eyebrow-row">
            <span className="sdb-home-footer-eyebrow-line" />
            <div className="sdb-home-footer-title">Read something unforgettable today.</div>
          </div>
          <div className="sdb-home-footer-sub">
            <span className="sdb-home-footer-sub-main">There's always another</span>
            <span className="sdb-home-footer-sub-accent">story waiting for you.</span>
          </div>
          <div className="sdb-home-footer-actions">
            <button
              type="button"
              className="sdb-home-footer-btn sdb-home-footer-btn-gold"
              onClick={() => onNavigate('catalog')}
            >
              Browse Books
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              className="sdb-home-footer-btn sdb-home-footer-btn-outline"
              onClick={() => onNavigate('history')}
            >
              My History
            </button>
          </div>
        </div>
      </div>
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: BROWSE CATALOG
═══════════════════════════════════════════════════════ */
/* Icons + facts grid for the Book Details popup */
const bdSvg = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const BD_ICONS = {
  book:      bdSvg(<><path d="M2.5 5.6C5 4.6 8.4 4.7 12 6.6c3.6-1.9 7-2 9.5-1V19c-2.5-1-5.9-.9-9.5 1-3.6-1.9-7-2-9.5-1z" /><path d="M12 6.6V20" /></>),
  isbn:      bdSvg(<path d="M4.5 5v14M8 5v14M11 5v14M14 5v14M17 5v14M19.5 5v14" />),
  calendar:  bdSvg(<><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  grid:      bdSvg(<><rect x="4" y="4" width="7" height="7" rx="1.6" /><rect x="13" y="4" width="7" height="7" rx="1.6" /><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect x="13" y="13" width="7" height="7" rx="1.6" /></>),
  globe:     bdSvg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" /></>),
  pages:     bdSvg(<><path d="M7 3.5h7.5L19 8v12.5H7z" /><path d="M14 3.5V8.5h5M9.5 12.5h6M9.5 16h6" /></>),
  edition:   bdSvg(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 4v16M4 12h8" /></>),
  pin:       bdSvg(<><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>),
  publisher: bdSvg(<path d="M4 20V9l8-5 8 5v11M3 20h18M9.5 20v-6h5v6" />),
};
/* items = [[label, iconKey, value], …] — rows with no value are skipped */
function BdFacts({ items }) {
  return (
    <div className="sdb-bd-facts">
      {items.filter(([, , v]) => v !== undefined && v !== null && v !== '').map(([k, icon, v]) => (
        <div key={k} className="sdb-bd-fact">
          <span className="sdb-bd-fact-ico">{BD_ICONS[icon]}</span>
          <div className="sdb-bd-fact-txt">
            <div className="sdb-bd-fact-k">{k}</div>
            <div className="sdb-bd-fact-v">{v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* "Online Books" category — shows only Open Library (online) books. Open Library has millions of
   titles, so with an empty search box it lists a starter search (change the word below); typing in
   the search box narrows it to whatever the student is looking for. */
const ONLINE_CATEGORY = 'Online Books';
const ONLINE_BOOKS_DEFAULT_QUERY = 'textbook';

function PageCatalog({ user, initialCategory = '', initialCampus = '' }) {
  const [books,     setBooks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [catF,      setCatF]      = useState(initialCategory);
  const [availF,    setAvailF]    = useState('');
  const [campusF,   setCampusF]   = useState(initialCampus);
  const [campuses,  setCampuses]  = useState([]);
  const onlineOnly = catF === ONLINE_CATEGORY;   // "Online Books" selected → only Open Library books
  const [favIds,    setFavIds]    = useState(new Set());
  const [selected,  setSelected]  = useState(null);
  const { toast, show } = useToast();

  // ── Open Library (external) results — additive, never touches Supabase ──
  const [olResults, setOlResults] = useState([]);
  const [olLoading, setOlLoading] = useState(false);
  const [olError,   setOlError]   = useState(null);
  const olReqId = useRef(0);

  const fetchCatalog = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      // Only show books that have completed the registration/approval workflow —
      // titles still awaiting Super Admin approval must not appear to students.
      const { data, error } = await supabase.from('books')
        .select('*')
        .eq('registration_status', 'approved')
        .order('title');
      if (error) throw error;

      // available_copies isn't a stored column — it's derived from book_copies,
      // same as the Super Admin Books view.
      const ids = (data || []).map(b => b.id);
      let copyMap = {};
      if (ids.length) {
        const { data: copies } = await supabase.from('book_copies').select('book_id,status').in('book_id', ids);
        (copies || []).forEach(c => {
          if (!copyMap[c.book_id]) copyMap[c.book_id] = { total: 0, available: 0 };
          copyMap[c.book_id].total += 1;
          if (c.status === 'Available') copyMap[c.book_id].available += 1;
        });
      }
      const withCopies = (data || []).map(b => {
        const counts = copyMap[b.id];
        const total = counts ? counts.total : (parseInt(b.copies) || 0);
        return { ...b, copies: total, available_copies: counts ? counts.available : total };
      });

      setBooks(withCopies);

      // Campus names for the campus filter — books only store campus_id.
      try {
        const { data: allCampuses } = await supabase.from('campuses').select('id, campus_name').order('campus_name');
        let campusRows = allCampuses || [];
        if (!campusRows.length) {
          const campusIds = [...new Set(withCopies.map(b => b.campus_id).filter(Boolean))];
          if (campusIds.length) {
            const { data: byIds } = await supabase.from('campuses').select('id, campus_name').in('id', campusIds);
            campusRows = byIds || [];
          }
        }
        setCampuses(campusRows.filter(c => c.campus_name));
      } catch (e) { console.warn('[Catalog campuses]', e); }

      if (user?.id) {
        const { data:fv } = await supabase.from('student_favorites').select('book_id').eq('student_id',user.id);
        setFavIds(new Set((fv||[]).map(f=>f.book_id)));
      }
    } catch(e){ console.error('[Catalog]',e); show('Could not load books.',true); }
    finally { if (showSpinner) setLoading(false); }
  }, [user?.id]); // eslint-disable-line

  useEffect(() => { fetchCatalog(true); }, [fetchCatalog]);

  // Live refresh: the moment a Super Admin approves (or a librarian edits)
  // a title, `books` changes — re-fetch quietly so a newly-approved book
  // shows up here on its own, with no page reload needed.
  useEffect(() => {
    const silentRefresh = () => fetchCatalog(false);
    const ch = supabase
      .channel(`student-catalog-live-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_copies' }, silentRefresh)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchCatalog]);

  // Debounced Open Library search — fires ~500ms after typing stops, and
  // only once there's a real query, so we don't hit the API on every
  // keystroke or on the initial (empty-search) catalog load. A request-id
  // guard drops any response that's no longer the latest one in flight.
  useEffect(() => {
    const typed = search.trim();
    const q = typed.length >= 2 ? typed : (onlineOnly ? ONLINE_BOOKS_DEFAULT_QUERY : '');
    if (q.length < 2) { setOlResults([]); setOlError(null); setOlLoading(false); return; }

    setOlLoading(true);
    const myReqId = ++olReqId.current;
    const handle = setTimeout(async () => {
      const { results, error } = await searchOpenLibrary(q, { limit: onlineOnly ? 24 : 8 });
      if (myReqId !== olReqId.current) return; // a newer search superseded this one
      setOlResults(results);
      setOlError(error);
      setOlLoading(false);
    }, 500);

    return () => clearTimeout(handle);
  }, [search, onlineOnly]);

  // Standard genres (same list as the Home category rail) + "Others" + any other
  // category/genre found on the books themselves, de-duplicated ignoring case.
  const categories = (() => {
    const seen = new Map();
    [...HOME_CATEGORIES.map(c => c.key), 'Others', ...books.map(b => b.category || b.genre)]
      .filter(Boolean)
      .forEach(c => { const k = String(c).trim().toLowerCase(); if (k && !seen.has(k)) seen.set(k, String(c).trim()); });
    return [...seen.values()].sort((a, b) => {
      if (a.toLowerCase() === 'others') return 1;
      if (b.toLowerCase() === 'others') return -1;
      return a.localeCompare(b);
    });
  })();

  const filtered = books.filter(b => {
    const q  = search.toLowerCase();
    const ok = !q || [b.title,b.author,b.authors,b.isbn].some(v=>(v||'').toLowerCase().includes(q));
    const cat = b.category || b.genre || '';
    if (onlineOnly) return false;
    return ok && (!catF||cat.toLowerCase()===catF.toLowerCase()) && (!campusF||String(b.campus_id)===campusF) && (!availF||(availF==='available'?(b.available_copies??1)>0:(b.available_copies??1)<=0));
  });

  // Open Library results respect the same category/availability filters
  // where they meaningfully apply — "available" here means readable or
  // borrowable right now, since external copies don't have a copy count.
  const filteredOl = olResults.filter(b => {
    const cat = (b.category || '').toLowerCase();
    const matchesCat = onlineOnly || !catF || cat === catF.toLowerCase() || cat.includes(catF.toLowerCase());
    if (!matchesCat) return false;
    if (!availF) return true;
    const readableNow = b.availability.canRead || b.availability.canBorrow;
    return availF === 'available' ? readableNow : !readableNow;
  });

  const openExternal = (url) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

  const toggleFav = async (e, bookId) => {
    e && e.stopPropagation();
    if (!user?.id) { show('Please log in.',true); return; }
    // NOTE: errors from these calls were previously ignored, so the UI
    // showed "Added to favorites" even when the insert/delete silently
    // failed (e.g. a missing RLS policy on student_favorites) — that's
    // why nothing showed up on the Favorites page. Now we check the
    // error and only update the UI on actual success.
    if (favIds.has(bookId)) {
      const { error } = await supabase.from('student_favorites')
        .delete().eq('student_id',user.id).eq('book_id',bookId);
      if (error) { console.error('[Fav remove]',error); show(`Could not remove favorite: ${error.message}`,true); return; }
      setFavIds(p=>{ const n=new Set(p); n.delete(bookId); return n; });
      show('Removed from favorites.');
    } else {
      const { error } = await supabase.from('student_favorites')
        .insert({ student_id:user.id, book_id:bookId });
      if (error) { console.error('[Fav add]',error); show(`Could not add favorite: ${error.message}`,true); return; }
      setFavIds(p=>new Set([...p,bookId]));
      show('Added to favorites ♥');
    }
  };

  return (
    <>
      <PageHero title="Explore Our Collection" sub="Find the book and resources you need, all in one place." />
      <div className="sdb-module sdb-cat-module">
      <div className="sdb-cat-panel">
      {/* Filters */}
      <div className="sdb-cat-toolbar">
        <div className="sdb-cat-search">
          <span className="sdb-cat-search-icon">{Ic.search}</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title, author, or ISBN…" />
        </div>
        <select className="sdb-cat-pillselect" value={catF} onChange={e=>setCatF(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
          <option value={ONLINE_CATEGORY}>{ONLINE_CATEGORY}</option>
        </select>
        {campuses.length > 0 && (
          <select className="sdb-cat-pillselect" value={campusF} onChange={e=>setCampusF(e.target.value)}
            disabled={onlineOnly} title={onlineOnly ? 'Campus does not apply to online books' : undefined}
            style={onlineOnly ? { opacity:.5, cursor:'not-allowed' } : undefined}>
            <option value="">All Campuses</option>
            {campuses.map(c=><option key={c.id} value={String(c.id)}>{c.campus_name}</option>)}
          </select>
        )}
        <select className="sdb-cat-pillselect" value={availF} onChange={e=>setAvailF(e.target.value)}>
          <option value="">All Availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <div className="sdb-cat-count">
          {Ic.book}
          {onlineOnly
            ? (olLoading ? 'Loading…' : `${filteredOl.length} online book${filteredOl.length!==1?'s':''}`)
            : loading
            ? 'Loading…'
            : `${filtered.length} book${filtered.length!==1?'s':''}${filteredOl.length ? ` · ${filteredOl.length} from Open Library` : ''}`}
        </div>
      </div>

      <div className="sdb-cat-body">
      {/* Book grid */}
      {onlineOnly ? null : loading ? (
        <div className="sdb-book-grid">
          {Array.from({length:8}).map((_,i)=>(
            <div key={i} className="sdb-skeleton" style={{ height:280, borderRadius:'var(--radius-lg)' }} />
          ))}
        </div>
      ) : filtered.length===0 ? (
        <div className="sdb-empty"><div className="sdb-empty-icon">🔍</div><div className="sdb-empty-text">No books found</div><div className="sdb-empty-sub">Try different keywords or clear the filters.</div></div>
      ) : (
        <div className="sdb-book-grid sdb-bk-grid">
          {filtered.map(book=>{
            const isFav = favIds.has(book.id);
            return (
              <div key={book.id} className="sdb-bk-card" onClick={()=>setSelected(book)}>
                <button type="button" className="sdb-bk-bookmark" onClick={e=>toggleFav(e,book.id)} title={isFav?'Saved':'Save'} aria-label={isFav?'Remove from saved':'Save book'}>
                  <svg viewBox="0 0 24 24" fill={isFav?'currentColor':'none'} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"><path d="M6 2a2 2 0 0 0-2 2v18l8-5.2L20 22V4a2 2 0 0 0-2-2H6z"/></svg>
                </button>
                <div className="sdb-bk-cover">
                  <BookCover src={book.cover_image_url||book.cover_url} title={book.title} width="100%" height="100%" />
                </div>
                <div className="sdb-bk-info">
                  <div className="sdb-bk-title">{book.title}</div>
                  <div className="sdb-bk-author">{book.author||book.authors}</div>
                </div>
                <div className="sdb-bk-foot">
                  <button type="button" className="sdb-bk-btn" onClick={e=>{e.stopPropagation();setSelected(book);}}>View Details</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Open Library results — only appears once there's a real search term */}
      {(search.trim().length >= 2 || onlineOnly) && (
        <>
          <div className="sdb-ol-section-label">
            <span>From Open Library</span>
          </div>
          {olLoading ? (
            <div className="sdb-book-grid">
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} className="sdb-skeleton" style={{ height:280, borderRadius:'var(--radius-lg)' }} />
              ))}
            </div>
          ) : olError ? (
            <div className="sdb-ol-error">Open Library results unavailable right now — {olError}</div>
          ) : filteredOl.length === 0 ? (
            <div className="sdb-ol-error">No matching Open Library results for this search.</div>
          ) : (
            <div className="sdb-book-grid sdb-bk-grid">
              {filteredOl.map(book => (
                <div key={book.id} className="sdb-bk-card" onClick={()=>setSelected(book)}>
                  <span className="sdb-ol-tag">Open Library</span>
                  <div className="sdb-bk-cover">
                    <BookCover src={book.cover_image_url} title={book.title} width="100%" height="100%" />
                  </div>
                  <div className="sdb-bk-info">
                    <div className="sdb-bk-title">{book.title}</div>
                    <div className="sdb-bk-author">{book.author}{book.year ? ` · ${book.year}` : ''}</div>
                    <span className="sdb-ol-status">{book.availability.label}</span>
                  </div>
                  <div className="sdb-bk-foot sdb-bk-foot-row">
                    <button type="button" className="sdb-bk-btn" onClick={e=>{e.stopPropagation();setSelected(book);}}>View Details</button>
                    {(book.availability.canRead || book.availability.canBorrow) && (
                      <button
                        type="button"
                        className="sdb-bk-btn sdb-bk-btn-read"
                        onClick={e=>{ e.stopPropagation(); openExternal(book.availability.actionUrl); }}
                        title="Opens the official Open Library / Internet Archive page in a new tab"
                      >
                        {book.availability.canRead ? 'Read Free' : 'Borrow'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      </div>
      </div>

      {/* Book detail modal */}
      {selected && selected.source === 'openlibrary' ? (
        <Modal maxWidth={800} onClose={()=>setSelected(null)}>
          <div className="sdb-bd-hdr">
            <span className="sdb-bd-hdr-ico">{BD_ICONS.book}</span>
            <div className="sdb-bd-hdr-text">
              <div className="sdb-bd-hdr-title">Book Details</div>
              <div className="sdb-bd-hdr-sub">{selected.category || 'Open Library'}</div>
            </div>
            <button className="sdb-modal-close" onClick={()=>setSelected(null)}>{Ic.close}</button>
          </div>
          <div className="sdb-modal-body sdb-bd-body">
            <aside className="sdb-bd-side">
              <div className="sdb-bd-cover">
                <BookCover src={selected.cover_image_url_lg||selected.cover_image_url} title={selected.title} width="100%" height="100%" />
              </div>
              <span className="sdb-ol-tag" style={{ position:'static' }}>Open Library</span>
              <span className="sdb-ol-status" style={{ marginTop:0 }}>{selected.availability.label}</span>
              {selected.availability.canRead ? (
                <button className="sdb-bd-btn sdb-bd-btn-gold" onClick={()=>openExternal(selected.availability.actionUrl)}>Read Free</button>
              ) : selected.availability.canBorrow ? (
                <button className="sdb-bd-btn sdb-bd-btn-gold" onClick={()=>openExternal(selected.availability.actionUrl)}>Borrow on Open Library</button>
              ) : null}
              <button className="sdb-bd-btn sdb-bd-btn-ghost" onClick={()=>openExternal(selected.olUrl)}>View on Open Library</button>
            </aside>
            <section className="sdb-bd-main">
              <h2 className="sdb-bd-title">{selected.title}</h2>
              <div className="sdb-bd-by">by {selected.author||'—'}</div>
              <BdFacts items={[['ISBN','isbn',selected.isbn],['Published','calendar',selected.year],['Category','grid',selected.category]]} />
              <div className="sdb-bd-note">
                This title comes from Open Library, not the university library system. Reading and borrowing happen on Open Library / Internet Archive's own site — nothing is copied into this catalog.
              </div>
            </section>
          </div>
        </Modal>
      ) : selected && (
        <Modal maxWidth={800} onClose={()=>setSelected(null)}>
          <div className="sdb-bd-hdr">
            <span className="sdb-bd-hdr-ico">{BD_ICONS.book}</span>
            <div className="sdb-bd-hdr-text">
              <div className="sdb-bd-hdr-title">Book Details</div>
              <div className="sdb-bd-hdr-sub">{selected.category||selected.genre||'Library Catalog'}</div>
            </div>
            <button className="sdb-modal-close" onClick={()=>setSelected(null)}>{Ic.close}</button>
          </div>
          <div className="sdb-modal-body sdb-bd-body">
            <aside className="sdb-bd-side">
              <div className="sdb-bd-cover">
                <BookCover src={selected.cover_image_url||selected.cover_url} title={selected.title} width="100%" height="100%" />
              </div>
              <Badge {...availCfg(selected.available_copies??selected.copies??1)} />
              <div className="sdb-bd-copies">
                {selected.available_copies??selected.copies??1} cop{(selected.available_copies??selected.copies??1)===1?'y':'ies'} available
              </div>
              <button className="sdb-bd-btn sdb-bd-btn-fav" onClick={e=>toggleFav(e,selected.id)}>
                <span className="sdb-bd-btn-lbl">{BD_ICONS.book}{favIds.has(selected.id)?'Saved to Favorites':'Add to Favorites'}</span>
                {favIds.has(selected.id)?Ic.heartFill:Ic.heart}
              </button>
            </aside>
            <section className="sdb-bd-main">
              <h2 className="sdb-bd-title">{selected.title}</h2>
              <div className="sdb-bd-by">by {selected.author||selected.authors||'—'}</div>
              <BdFacts items={[
                ['ISBN','isbn',selected.isbn],
                ['Published','calendar',selected.year||selected.publication_year],
                ['Category','grid',selected.category||selected.genre],
                ['Language','globe',selected.language||'English'],
                ['Pages','pages',selected.pages],
                ['Edition','edition',selected.edition],
                ['Location','pin',selected.shelf_location],
                ['Publisher','publisher',selected.publisher],
              ]} />
              {(selected.abstract_text||selected.description) && (
                <>
                  <div className="sdb-bd-abs-hd">{BD_ICONS.book}<span>{selected.abstract_text?'Abstract':'Description'}</span></div>
                  {selected.abstract_text ? (
                    <AbstractBlock raw={selected.abstract_text} fallbackTitle={selected.title} authorName={selected.author||selected.authors} plain />
                  ) : (
                    <p className="sdb-bd-desc">{selected.description}</p>
                  )}
                </>
              )}
            </section>
          </div>
        </Modal>
      )}

      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: FAVORITES
═══════════════════════════════════════════════════════ */
function PageFavorites({ user, onNavigate }) {
  const [books,     setBooks]     = useState([]);
  const [campusMap, setCampusMap] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch favorite book_ids, then the books separately — a nested
      // `books(*)` embed depends on Supabase auto-detecting the FK
      // relationship, which fails silently if there's any ambiguity.
      // Two plain queries are far more reliable.
      const { data: favRows, error: favErr } = await supabase
        .from('student_favorites').select('book_id').eq('student_id', user.id);
      if (favErr) throw favErr;

      const ids = (favRows || []).map(r => r.book_id).filter(Boolean);
      if (!ids.length) { setBooks([]); return; }

      const { data: bookRows, error: bookErr } = await supabase
        .from('books').select('*').in('id', ids);
      if (bookErr) throw bookErr;

      const { data: copies } = await supabase.from('book_copies').select('book_id,status').in('book_id', ids);
      const copyMap = {};
      (copies || []).forEach(c => {
        if (!copyMap[c.book_id]) copyMap[c.book_id] = { total: 0, available: 0 };
        copyMap[c.book_id].total += 1;
        if (c.status === 'Available') copyMap[c.book_id].available += 1;
      });
      const withCopies = (bookRows || []).map(b => {
        const counts = copyMap[b.id];
        const total = counts ? counts.total : (parseInt(b.copies) || 0);
        return { ...b, copies: total, available_copies: counts ? counts.available : total };
      });

      // Campus name lookup — books only store campus_id, so resolve names
      // for display the same way the Admin Book Catalog does.
      const campusIds = [...new Set(withCopies.map(b => b.campus_id).filter(Boolean))];
      if (campusIds.length) {
        const { data: campusRows } = await supabase.from('campuses').select('id, campus_name').in('id', campusIds);
        setCampusMap(Object.fromEntries((campusRows || []).map(c => [c.id, c.campus_name])));
      }

      setBooks(withCopies);
    } catch(e){
      console.error('[Favorites]',e);
      show(e?.message ? `Could not load favorites: ${e.message}` : 'Could not load favorites.', true);
    }
    finally { setLoading(false); }
  }, [user?.id]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const removeFav = async (bookId) => {
    try {
      const { error } = await supabase.from('student_favorites')
        .delete().eq('student_id',user.id).eq('book_id',bookId);
      if (error) throw error;
      setBooks(p=>p.filter(b=>b.id!==bookId));
      if (selected?.id===bookId) setSelected(null);
      show('Removed from favorites.');
    } catch(e){ console.error('[Fav remove]',e); show(e?.message ? `Could not remove: ${e.message}` : 'Could not remove.',true); }
  };

  return (
    <>
      <PageHero title="My Favorites" sub="Books you saved, all in one place, ready when you need them." />
      <div className="sdb-module sdb-cat-module">

      <div className="sdb-cat-panel">
      <div className="sdb-hist-inner">
      {loading ? (
        <div className="sdb-table-wrap"><div style={{ padding:30 }}><Spinner /></div></div>
      ) : books.length===0 ? (
        <div className="sdb-panel">
          <div className="sdb-empty">
            <div className="sdb-empty-icon">♥</div>
            <div className="sdb-empty-text">No favorites yet</div>
            <div className="sdb-empty-sub">Tap the heart icon on any book in the catalog.</div>
            <div style={{ marginTop:16 }}><button className="sdb-btn sdb-btn-primary" style={{ fontSize:12 }} onClick={()=>onNavigate('catalog')}>Browse Catalog</button></div>
          </div>
        </div>
      ) : (
        <div className="sdb-table-wrap">
          <table>
            <thead><tr>
              <th>Book</th>
              <th>Campus</th>
              <th>ISBN</th>
              <th>Genre</th>
              <th>Copies</th>
              <th>Status</th>
              <th>Action</th>
            </tr></thead>
            <tbody>
              {books.map(book=>{
                const available = book.available_copies ?? book.copies ?? 1;
                const total     = book.copies ?? available;
                const campusName = campusMap[book.campus_id] || '—';
                return (
                  <tr key={book.id} onClick={()=>setSelected(book)} style={{ cursor:'pointer' }}>
                    <td>
                      <div className="sdb-rtbl-book">
                        <BookCover src={book.cover_image_url||book.cover_url} title={book.title} width={40} height={56} />
                        <div>
                          <div className="sdb-rtbl-book-title">{book.title}</div>
                          <div className="sdb-rtbl-book-author">{book.author||book.authors||'—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="sdb-rtbl-pill sdb-rtbl-pill-campus">{campusName}</span></td>
                    <td className="sdb-rtbl-isbn">{book.isbn||'—'}</td>
                    <td>{(book.category||book.genre) ? <span className="sdb-rtbl-pill sdb-rtbl-pill-genre">{book.category||book.genre}</span> : '—'}</td>
                    <td className="sdb-rtbl-copies">{available}/{total}</td>
                    <td><Badge {...availCfg(available)} /></td>
                    <td>
                      <button className="sdb-tbl-btn sdb-tbl-del" onClick={e=>{e.stopPropagation();removeFav(book.id);}} title="Remove favorite">{Ic.trash}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
      </div>

      {selected && (
        <Modal maxWidth={560} onClose={()=>setSelected(null)}>
          <div className="sdb-modal-hdr">
            <div><div className="sdb-modal-title">Book Details</div><div className="sdb-modal-sub">Saved to Favorites</div></div>
            <button className="sdb-modal-close" onClick={()=>setSelected(null)}>{Ic.close}</button>
          </div>
          <div className="sdb-modal-body" style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            <BookCover src={selected.cover_image_url||selected.cover_url} title={selected.title} width={90} height={128} />
            <div style={{ flex:1, minWidth:180 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>{selected.title}</h3>
              <div style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>by {selected.author||selected.authors||'—'}</div>
              <div style={{ marginBottom:14 }}><Badge {...availCfg(selected.available_copies??selected.copies??1)} /></div>
              {(selected.abstract_text||selected.description)&&(
                <div>
                  {selected.abstract_text ? (
                    <AbstractBlock raw={selected.abstract_text} fallbackTitle={selected.title} authorName={selected.author||selected.authors} compact maxParagraphs={2} />
                  ) : (
                    <p style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-secondary)', lineHeight:1.75, margin:0 }}>{(selected.description||'').slice(0,320)}{(selected.description||'').length>320?'…':''}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="sdb-modal-foot" style={{ justifyContent:'flex-start' }}>
            <button className="sdb-btn sdb-btn-danger" onClick={()=>removeFav(selected.id)}>{Ic.trash}&nbsp; Remove Favorite</button>
          </div>
        </Modal>
      )}
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: BORROWING HISTORY
═══════════════════════════════════════════════════════ */
function PageHistory({ user }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const { toast, show } = useToast();

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('borrow_requests')
          .select('*').eq('student_id',user.id).order('created_at',{ascending:false});
        if (error) throw error;

        // borrow_requests only stores book_id/book_title — it has no cover
        // column, so covers must be looked up from `books` separately.
        // NOTE: `books` only has `cover_image_url` (no `cover_url` column) —
        // requesting a non-existent column makes Postgrest reject the whole
        // query, which is why the previous attempt silently returned nothing.
        const bookIds = [...new Set((data||[]).map(r=>r.book_id).filter(Boolean))];
        let coverMap = {};
        if (bookIds.length) {
          const { data: bookRows, error: coverErr } = await supabase.from('books')
            .select('id,cover_image_url').in('id', bookIds);
          if (coverErr) console.error('[History cover lookup]', coverErr);
          (bookRows||[]).forEach(b => { coverMap[b.id] = b.cover_image_url || null; });
        }

        // Return/due dates also don't live on borrow_requests — there's no
        // due_date column anywhere in this schema. The real borrowed_at /
        // returned_at timestamps live on the separate `borrowings` table,
        // created once a request is approved. Match by book_id, and if a
        // student borrowed the same book more than once, prefer the
        // borrowing row closest in time to each request.
        const { data: borrowRows, error: borrowErr } = await supabase
          .from('borrowings').select('book_id,borrowed_at,returned_at')
          .eq('student_id', user.id);
        if (borrowErr) console.error('[History borrowings lookup]', borrowErr);
        const borrowingsByBook = {};
        (borrowRows||[]).forEach(b => {
          if (!borrowingsByBook[b.book_id]) borrowingsByBook[b.book_id] = [];
          borrowingsByBook[b.book_id].push(b);
        });

        // Match each approved/active/returned request to its own borrowing
        // record (not shared) by processing oldest-first and removing each
        // matched borrowing from the pool so a later request for the same
        // book can't accidentally reuse it.
        const pool = {};
        Object.keys(borrowingsByBook).forEach(k => { pool[k] = [...borrowingsByBook[k]]; });
        const matchByReqId = {};
        [...(data||[])]
          .sort((a,b)=> new Date(a.created_at) - new Date(b.created_at))
          .forEach(r => {
            const canHaveBorrowing = ['approved','active','returned'].includes(r.status);
            if (!canHaveBorrowing) return;
            const candidates = pool[r.book_id] || [];
            if (!candidates.length) return;
            const reqTime = new Date(r.created_at).getTime();
            let bestIdx = -1, bestDiff = Infinity;
            candidates.forEach((b, i) => {
              const bTime = new Date(b.borrowed_at).getTime();
              if (isNaN(bTime) || bTime < reqTime) return;
              const diff = bTime - reqTime;
              if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
            });
            if (bestIdx !== -1) {
              matchByReqId[r.id] = candidates[bestIdx];
              candidates.splice(bestIdx, 1);
            }
          });

        // NOTE: `status` on borrow_requests can say "approved" before the
        // librarian actually scans the book out in Book Management — that
        // scan is what creates the `borrowings` row. So an approved request
        // may legitimately have no match yet; that's "awaiting pickup",
        // not missing data, and the UI below says so instead of showing "—".
        const withCovers = (data||[]).map(r => {
          const match = matchByReqId[r.id] || null;
          return {
            ...r,
            cover_image_url: coverMap[r.book_id] || null,
            return_date: match?.returned_at || null,
            due_date: null, // no due-date concept in this schema
            _borrowed_at: match?.borrowed_at || null,
          };
        });

        setRows(withCovers);
      } catch(e){ console.error('[History]',e); show('Could not load history.',true); }
      finally { setLoading(false); }
    })();
  }, [user?.id]); // eslint-disable-line

  // Source of truth for "is this actually returned?" is the matched
  // `borrowings.returned_at` (r.return_date), not the raw borrow_requests
  // .status column — that column can be stale if a book was checked back in
  // through Book Management without the request status being synced. Use
  // the real return data whenever we have it so the badge always agrees
  // with the return date shown next to it.
  const effectiveStatus = (r) => r.return_date ? 'returned' : normalizeStatus(r.status);

  const filtered = rows.filter(r=>{
    const q = search.toLowerCase();
    return (!q||(r.book_title||'').toLowerCase().includes(q)) && (!statusF||effectiveStatus(r)===statusF);
  });

  return (
    <>
      <PageHero title="Borrowing History" sub="Track what you borrowed, due dates, and return status." />
      <div className="sdb-module sdb-cat-module">

      <div className="sdb-cat-panel">
      <div className="sdb-hist-inner">
      <div className="sdb-filters">
        <div className="sdb-search-wrap">
          <span className="sdb-search-icon">{Ic.search}</span>
          <input className="sdb-input" style={{ paddingLeft:36 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by book title…" />
        </div>
        <select className="sdb-select" value={statusF} onChange={e=>setStatusF(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending','approved','returned','rejected'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <div className="sdb-count">{filtered.length} record{filtered.length!==1?'s':''}</div>
      </div>

      <div className="sdb-table-wrap">
        <table>
          <thead><tr>
            <th>Book</th>
            <th>Date Requested</th>
            <th>Due / Return Date</th>
            <th>Status</th>
         
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}><Spinner /></td></tr>
            ) : filtered.length===0 ? (
              <tr><td colSpan={4} style={{ textAlign:'center', padding:50, color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>
                {rows.length===0?'No borrowing history yet.':'No records match your filters.'}
              </td></tr>
            ) : filtered.map(r=>(
              <tr key={r.id}>
                <td>
                  <div className="sdb-rtbl-book">
                    <BookCover src={r.cover_image_url} title={r.book_title} width={40} height={56} />
                    <div className="sdb-rtbl-book-title">{r.book_title||'—'}</div>
                  </div>
                </td>
                <td style={{ fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>
                  <div>{fmtDate(r.created_at)}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtTime(r.created_at)}</div>
                </td>
                <td style={{ fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>
                  {r.return_date ? (
                    <>
                      <div>{fmtDate(r.return_date)}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtTime(r.return_date)}</div>
                    </>
                  ) : r._borrowed_at ? (
                    <>
                      <div style={{ color:'var(--text-muted)' }}>Not yet returned</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>Borrowed {fmtFull(r._borrowed_at)}</div>
                    </>
                  ) : effectiveStatus(r) === 'approved' ? (
                    <span style={{ color:'var(--text-muted)' }}>Awaiting pickup</span>
                  ) : '—'}
                </td>
                <td><Badge {...statusCfg(effectiveStatus(r))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      </div>
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: PROFILE
═══════════════════════════════════════════════════════ */
function PageProfile({ user, profile, onProfileUpdate }) {
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const { toast, show } = useToast();

  // Field names below are mapped to the columns that actually exist on
  // `profiles`: first_name, last_name, student_number, program_id (a
  // foreign key into `programs`, not a free-text column — there is no
  // `program_legacy` column on this table; sending that key is what used
  // to make every save fail with "Could not find the 'program_legacy'
  // column of 'profiles' in the schema cache"). There is no `phone` column
  // yet, so it stays local-only (typeable, but not persisted) until that
  // column is added. `campus` and `course` are both resolved read-only
  // display labels for foreign keys (campus_id / program_id) — see the two
  // lookup effects below — and `middle_name` is a real, existing `profiles`
  // column so it's fully editable + saved.
  const [form, setForm] = useState({
    first_name:  profile?.first_name     || user?.user_metadata?.first_name || '',
    middle_name: profile?.middle_name    || user?.user_metadata?.middle_name || '',
    last_name:   profile?.last_name      || user?.user_metadata?.last_name  || '',
    student_id:  profile?.student_number || '',
    program_id:  profile?.program_id     || '',
    course:      '', // display name for program_id, resolved async below
    campus:      '',
    email:       user?.email             || '',
    phone:       profile?.phone          || '',
  });

  useEffect(() => {
    setForm(f => ({
      ...f,
      first_name:  profile?.first_name     || user?.user_metadata?.first_name || '',
      middle_name: profile?.middle_name    || user?.user_metadata?.middle_name || '',
      last_name:   profile?.last_name      || user?.user_metadata?.last_name  || '',
      student_id:  profile?.student_number || '',
      program_id:  profile?.program_id     || '',
      email:       user?.email             || '',
      phone:       profile?.phone          || '',
    }));
  }, [profile, user]);

  // Campus is a foreign key (profiles.campus_id -> campuses.id), so its
  // display name is resolved separately here (same pattern used for book
  // campus lookups elsewhere in this file) instead of living in the form
  // as free text. It is shown read-only — editing it would mean changing
  // campus_id via a picker, which is out of scope here.
  useEffect(() => {
    let cancelled = false;
    if (!profile?.campus_id) { setForm(f => ({ ...f, campus: '' })); return; }
    supabase.from('campuses').select('campus_name').eq('id', profile.campus_id).single()
      .then(({ data }) => { if (!cancelled) setForm(f => ({ ...f, campus: data?.campus_name || '' })); })
      .catch(() => { if (!cancelled) setForm(f => ({ ...f, campus: '' })); });
    return () => { cancelled = true; };
  }, [profile?.campus_id]);

  // Course / Program is also a foreign key (profiles.program_id ->
  // programs.id) — resolved to its display name the same way Campus is
  // above, so the read-only view always shows the real program name even
  // before the editable dropdown (below) has finished loading.
  useEffect(() => {
    let cancelled = false;
    if (!profile?.program_id) { setForm(f => ({ ...f, course: '' })); return; }
    supabase.from('programs').select('program_name').eq('id', profile.program_id).single()
      .then(({ data }) => { if (!cancelled) setForm(f => ({ ...f, course: data?.program_name || '' })); })
      .catch(() => { if (!cancelled) setForm(f => ({ ...f, course: '' })); });
    return () => { cancelled = true; };
  }, [profile?.program_id]);

  // Programs selectable in the edit dropdown, scoped to the student's own
  // campus only — `programs.college_id` links to `colleges.id`, and
  // `colleges.campus_id` links to the campus, so filtering on the joined
  // colleges.campus_id keeps the dropdown to "courses this campus actually
  // offers" instead of every program in the system.
  const [programs,        setPrograms]        = useState([]);
  const [loadingPrograms, setLoadingPrograms]  = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!profile?.campus_id) { setPrograms([]); return; }
    setLoadingPrograms(true);
    supabase
      .from('programs')
      .select('id, program_name, colleges!inner(campus_id)')
      .eq('colleges.campus_id', profile.campus_id)
      .order('program_name')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('[Profile] programs fetch error:', error.message); setPrograms([]); }
        else setPrograms((data || []).map(p => ({ id: p.id, name: p.program_name })));
        setLoadingPrograms(false);
      });
    return () => { cancelled = true; };
  }, [profile?.campus_id]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  // Derived straight from `profile`/`user` (not `form`) so the banner name
  // is correct on the very first paint — `form` only catches up a tick
  // later via the sync effect above, which was leaving this blank right
  // after navigating to the Profile tab. Same source pattern already used
  // by the working header higher up in this file.
  const heroFirst    = profile?.first_name || user?.user_metadata?.first_name || '';
  const heroLast     = profile?.last_name  || user?.user_metadata?.last_name  || '';
  const displayName  = `${heroFirst} ${heroLast}`.trim() || (user?.email ? user.email.split('@')[0] : 'Student');
  const initials     = [heroFirst[0], heroLast[0]].filter(Boolean).join('').toUpperCase() || 'S';
  const avatarUrl    = profile?.avatar_url || null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file||!user?.id) return;
    if (!file.type.startsWith('image/')) { show('Please select an image file.',true); return; }
    if (file.size>5*1024*1024) { show('Image must be under 5 MB.',true); return; }
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `avatars/${user.id}_${Date.now()}.${ext}`;
      const { error:upErr } = await supabase.storage.from('avatars').upload(path,file,{upsert:true});
      if (upErr) throw upErr;
      const { data:urlD } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error:dbErr } = await supabase.from('profiles').upsert({ id:user.id, avatar_url:urlD.publicUrl, updated_at:new Date().toISOString() });
      if (dbErr) throw dbErr;
      if (onProfileUpdate) onProfileUpdate({...profile, avatar_url:urlD.publicUrl});
      show('Profile photo updated!');
    } catch(e){ console.error('[Avatar upload]',e); show('Could not upload photo.',true); }
    finally { setUploading(false); e.target.value=''; }
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // IMPORTANT: only send columns that actually exist on `profiles`.
      // student_id -> student_number, course -> program_id (a foreign key,
      // not free text — see the note above the form's initial state).
      // phone has no column yet, so it's intentionally left out of the
      // payload — sending it causes Postgrest to reject the whole upsert
      // ("column not found in schema cache"), which is why saving used to
      // fail entirely. campus is a read-only lookup, not user-editable here,
      // so it's never sent either.
      const payload = {
        id:              user.id,
        first_name:      form.first_name,
        middle_name:     form.middle_name,
        last_name:       form.last_name,
        student_number:  form.student_id,
        program_id:      form.program_id || null,
        updated_at:      new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
      // Keep the read-only display name in sync immediately, rather than
      // waiting on the program-name lookup effect to re-fire off the
      // updated `profile` prop.
      const pickedName = programs.find(p => p.id === form.program_id)?.name || '';
      setForm(f => ({ ...f, course: pickedName }));
      if (onProfileUpdate) onProfileUpdate({...profile,...payload});
      setEditing(false);
      show('Profile updated successfully!');
    } catch(e){
      console.error('[Profile save]',e);
      show(e?.message ? `Could not save profile: ${e.message}` : 'Could not save profile.', true);
    }
    finally { setSaving(false); }
  };

  const Field = ({ label, fkey, type='text', readOnly=false }) => (
    <div className="sdb-form-group">
      <label className="sdb-label">{label}</label>
      {editing && !readOnly
        ? <input className="sdb-input" type={type} value={form[fkey]} onChange={e=>set(fkey,e.target.value)} />
        : <div style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-secondary)', padding:'9px 0', borderBottom:'1px solid rgba(139,0,0,.12)' }}>
            {form[fkey] || <span style={{ color:'var(--text-dim)', fontStyle:'italic' }}>Not set</span>}
          </div>
      }
    </div>
  );

  // Course / Program gets its own field: unlike the plain-text Fields
  // above, editing it must update `program_id` (the real FK column that
  // actually gets saved) rather than the free-text `course` label. The
  // dropdown is pre-scoped to the student's own campus by the `programs`
  // fetch effect above, so it only ever lists courses that campus offers.
  // Picking an option updates `course` in the same change so the banner
  // subtitle (which reads form.course) stays in sync immediately, not
  // just after Save resolves it from the `programs` list again.
  const CourseField = () => (
    <div className="sdb-form-group">
      <label className="sdb-label">Course / Program</label>
      {editing
        ? (
          <select
            className="sdb-input sdb-select"
            style={{ width:'100%' }}
            value={form.program_id}
            disabled={loadingPrograms || programs.length === 0}
            onChange={e => {
              const id = e.target.value;
              const name = programs.find(p => p.id === id)?.name || '';
              setForm(f => ({ ...f, program_id: id, course: name }));
            }}
          >
            <option value="">
              {loadingPrograms
                ? 'Loading courses…'
                : (programs.length ? 'Select a course' : 'No courses available for your campus')}
            </option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )
        : <div style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-secondary)', padding:'9px 0', borderBottom:'1px solid rgba(139,0,0,.12)' }}>
            {form.course || <span style={{ color:'var(--text-dim)', fontStyle:'italic' }}>Not set</span>}
          </div>
      }
    </div>
  );

  return (
    <div className="sdb-module">
      {/* Banner */}
      <div className="sdb-profile-banner">
        <div className="sdb-profile-cover" />
        <div className="sdb-profile-info">
          <div style={{ position:'relative', flexShrink:0 }}>
            <div className="sdb-profile-av-wrap">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width:'100%',height:'100%',objectFit:'cover' }} onError={e=>{e.target.style.display='none';}} />
                : <span style={{ fontFamily:'var(--font-display)',fontSize:32,fontWeight:700,color:'#F5E4A8' }}>{initials}</span>
              }
            </div>
            <button className="sdb-profile-upload-btn" onClick={()=>fileRef.current?.click()} disabled={uploading} title="Change photo">
              {uploading ? <div className="sdb-spinner" style={{ width:13,height:13,borderWidth:2 }} /> : Ic.camera}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarUpload} />
          </div>
          <div style={{ paddingBottom:6 }}>
          <div
  className="sdb-hero-name sdb-hero-name--onbanner"
  style={{
    fontFamily: 'var(--font-display)',
    textAlign: 'left',
    fontSize: '41px',
    fontWeight: 700,
    color: '#F5E4A8',
    letterSpacing: '.09em', 
    minHeight: '23px',
    lineHeight: '23px',
    opacity: 1,
    visibility: 'visible',
    display: 'block',
    position: 'relative',
    zIndex: 20,
    WebkitTextFillColor: '#F5E4A8',
    textShadow: '0 1px 2px rgba(0,0,0,.35)'
  }}
>
  {displayName || 'Student'}
</div>

<div
  style={{
    fontFamily: 'var(--font-sans)',
    fontSize: '12.5px',
    color: '#7A3030',
    marginTop: '3px'
  }}
>
              {[form.student_id?`ID: ${form.student_id}`:null,form.course,form.campus].filter(Boolean).join(' • ')}
            </div>
            <div style={{ fontFamily:'var(--font-sans)',fontSize:11.5,color:'var(--text-dim)',marginTop:2, textAlign:'left' }}>{form.email}</div>
          </div>
        </div>
      </div>

      {/* Information */}
      <div className="sdb-panel">
        <div className="sdb-panel-hdr">
          <span>Personal Information</span>
          {editing ? (
            <div style={{ display:'flex',gap:10 }}>
              <button className="sdb-tbl-btn sdb-tbl-edit" onClick={()=>setEditing(false)} disabled={saving}>Cancel</button>
              <button className="sdb-btn sdb-btn-primary" style={{ fontSize:11.5,padding:'6px 14px' }} onClick={save} disabled={saving}>
                {Ic.save}&nbsp;{saving?'Saving…':'Save Changes'}
              </button>
            </div>
          ) : (
            <button className="sdb-tbl-btn sdb-tbl-edit" onClick={()=>setEditing(true)}>
              {Ic.edit}&nbsp; Edit Profile
            </button>
          )}
        </div>
        <div className="sdb-profile-field-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'0 24px', padding:'0 0 6px' }}>
          <Field label="First Name"        fkey="first_name"  />
          <Field label="Middle Name"       fkey="middle_name" />
          <Field label="Last Name"         fkey="last_name"   />
          <Field label="Student ID"        fkey="student_id"  />
          <CourseField />
          <Field label="Campus"            fkey="campus"      readOnly />
          <Field label="Email Address"     fkey="email"  type="email" readOnly />
          <Field label="Contact Number"    fkey="phone"  type="tel"   />
        </div>
      </div>
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: SETTINGS
═══════════════════════════════════════════════════════ */
function PageSettings({ user, onSignOut }) {
  const [pwForm,   setPwForm]   = useState({ oldPw:'', newPw:'', confirm:'' });
  const [showPw,   setShowPw]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [notif,    setNotif]    = useState({ email:true, due_reminders:true, new_arrivals:false });
  const { toast, show } = useToast();

  // Real, persisted notification preferences (shared with the bell) —
  // separate from the `notif` state above, which only drives the three
  // unrelated email/reminder toggles further down this page.
  const [notifPrefs, setNotifPrefs] = useState(() => getNotifPrefs(user?.id));
  const [notifSound, setNotifSound] = useState(() => getNotifSoundEnabled(user?.id));
  const notifPrefTypes = getNotifPrefTypesForRole('student');
  const notifOnCount = notifPrefTypes.filter(t => notifPrefs[t.key] !== false).length;

  useEffect(() => {
    setNotifPrefs(getNotifPrefs(user?.id));
    setNotifSound(getNotifSoundEnabled(user?.id));
  }, [user?.id]);

  const handleNotifPrefToggle = (key, label) => {
    const next = notifPrefs[key] === false;
    setNotifPrefs(p => ({ ...p, [key]: next }));
    setNotifPref(user?.id, key, next);
    show(`${label} notifications ${next ? 'enabled' : 'turned off'}.`);
  };

  const handleNotifSoundToggle = () => {
    const next = !notifSound;
    setNotifSound(next);
    setNotifSoundEnabled(user?.id, next);
    show(`Notification sound ${next ? 'enabled' : 'turned off'}.`);
  };

  const enableAllNotifs = () => {
    setAllNotifPrefs(user?.id, true, 'student');
    setNotifPrefs(getNotifPrefs(user?.id));
    show('All notification types enabled.');
  };
  const disableAllNotifs = () => {
    setAllNotifPrefs(user?.id, false, 'student');
    setNotifPrefs(getNotifPrefs(user?.id));
    show('All notification types turned off.');
  };

  const changePw = async () => {
    if (!pwForm.oldPw)           { show('Enter your current password.',true); return; }
    if (!pwForm.newPw)           { show('Enter a new password.',true); return; }
    if (pwForm.newPw.length < 6) { show('Password must be at least 6 characters.',true); return; }
    if (pwForm.newPw !== pwForm.confirm) { show('Passwords do not match.',true); return; }
    setPwSaving(true);
    try {
      // Supabase's updateUser() will happily change the password without
      // knowing the old one — it only checks that the session is valid.
      // Re-authenticating with the old password first is what actually
      // enforces "you must know your current password to change it".
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user?.email, password: pwForm.oldPw,
      });
      if (verifyErr) { show('Current password is incorrect.', true); setPwSaving(false); return; }

      const { error } = await supabase.auth.updateUser({ password:pwForm.newPw });
      if (error) throw error;
      setPwForm({ oldPw:'', newPw:'', confirm:'' });
      show('Password updated successfully!');
    } catch(e){ console.error('[PW]',e); show(e.message||'Could not update password.',true); }
    finally { setPwSaving(false); }
  };

  const Toggle = ({ label, desc, value, onChange }) => (
    <div className="sdb-toggle-row">
      <div>
        <div style={{ fontFamily:'var(--font-sans)',fontSize:13.5,fontWeight:600,color:'var(--text-primary)' }}>{label}</div>
        {desc&&<div style={{ fontFamily:'var(--font-sans)',fontSize:12,color:'var(--text-muted)',marginTop:2 }}>{desc}</div>}
      </div>
      <button className="sdb-toggle-track"
        style={{ background:value?'linear-gradient(135deg,#8B0000,#5A0000)':'rgba(139,0,0,.16)' }}
        onClick={()=>onChange(!value)}>
        <div className="sdb-toggle-thumb" style={{ left:value?22:3 }} />
      </button>
    </div>
  );

  return (
    <div className="sdb-module">
      <div className="sdb-module-header">
        <div><div className="sdb-module-title">Settings</div></div>
      </div>

      {/* Change Password */}
      <div className="sdb-panel" style={{ marginBottom:18 }}>
        <div className="sdb-panel-hdr">
          {/* Icon + label kept in one flex group so panel-hdr's
              justify-content:space-between only splits this group from the
              button below, instead of splitting the icon from its own
              label across the whole row. Same fix applied to the
              Notifications and Privacy headers underneath. */}
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>{Ic.lock} Change Password</span>
          <button className="sdb-btn sdb-btn-primary" style={{ fontSize:11.5, padding:'6px 14px' }} onClick={changePw} disabled={pwSaving}>
            {Ic.lock}&nbsp;{pwSaving?'Updating…':'Update Password'}
          </button>
        </div>
        <div className="sdb-form-row-3">
          {[['Old Password','oldPw'],['New Password','newPw'],['Confirm Password','confirm']].map(([lbl,key])=>(
            <div key={key} className="sdb-form-group">
              <label className="sdb-label">{lbl}</label>
              <div className="sdb-pw-wrap">
                <input className="sdb-input" type={showPw?'text':'password'}
                  autoComplete={key==='oldPw' ? 'current-password' : 'new-password'}
                  value={pwForm[key]} onChange={e=>setPwForm(f=>({...f,[key]:e.target.value}))}
                  placeholder="••••••••" style={{ paddingRight:36 }} />
                <button className="sdb-pw-toggle" onClick={()=>setShowPw(v=>!v)} type="button">
                  {showPw?Ic.eyeOff:Ic.eyeOn}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="sdb-panel" style={{ marginBottom:18 }}>
        <div className="sdb-panel-hdr">
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>{Ic.bell} Notification Preferences</span>
        </div>

        <Toggle label="Email Notifications"  desc="Receive library updates via email"         value={notif.email}         onChange={v=>setNotif(p=>({...p,email:v}))} />
        <Toggle label="Due Date Reminders"   desc="Get reminded before your books are due"   value={notif.due_reminders} onChange={v=>setNotif(p=>({...p,due_reminders:v}))} />
        <Toggle label="New Arrivals"         desc="Notify me when new books are added"        value={notif.new_arrivals}  onChange={v=>setNotif(p=>({...p,new_arrivals:v}))} />

        <div style={{ height:1, background:'rgba(139,0,0,0.10)', margin:'14px 0' }} />

        {/* Notification sound — plays a short chime when a new alert arrives
            on this dashboard, matching the Librarian's Settings page. */}
        <Toggle
          label="Notification Sound"
          desc="Play a short chime whenever a new notification comes in"
          value={notifSound}
          onChange={handleNotifSoundToggle}
        />

        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:10, margin:'16px 0 8px', flexWrap:'wrap',
        }}>
          <span style={{
            fontFamily:'var(--font-sans)', fontSize:11, fontWeight:800,
            letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)',
          }}>
            Alert Types · {notifOnCount}/{notifPrefTypes.length} on
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button type="button" onClick={enableAllNotifs}
              style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 3px',
                fontFamily:'var(--font-sans)', fontSize:11.5, fontWeight:700, color:'var(--maroon,#8B0000)' }}>
              Enable all
            </button>
            <span style={{ color:'var(--border)', fontSize:11 }}>·</span>
            <button type="button" onClick={disableAllNotifs}
              style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 3px',
                fontFamily:'var(--font-sans)', fontSize:11.5, fontWeight:700, color:'var(--maroon,#8B0000)' }}>
              Turn all off
            </button>
          </div>
        </div>

        {/* Real, bell-connected preferences (Approved / Canceled-Rejected) */}
        {notifPrefTypes.map(t => (
          <Toggle
            key={t.key}
            label={t.label}
            desc={t.desc}
            value={notifPrefs[t.key] !== false}
            onChange={() => handleNotifPrefToggle(t.key, t.label)}
          />
        ))}
      </div>

      {/* Privacy */}
      <div className="sdb-panel" style={{ marginBottom:18 }}>
        <div className="sdb-panel-hdr">
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>{Ic.shield} Privacy</span>
        </div>
        <div style={{ fontFamily:'var(--font-sans)',fontSize:13,color:'var(--text-secondary)',lineHeight:1.75 }}>
          Your personal information is used exclusively for library management within the PSU Library System and is not shared with third parties.
        </div>
      </div>

      {/* Account */}

      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════ */
const STUDENT_TAB_IDS = ['home', 'catalog', 'favorites', 'history', 'profile', 'settings'];

function getStudentTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  return STUDENT_TAB_IDS.includes(hash) ? hash : 'home';
}

export default function StudentDashboard({ user, onSignOut }) {
  const [activeTab,   setActiveTab]   = useState(getStudentTabFromHash);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [profile,     setProfile]     = useState(null);
  const [catalogCategory, setCatalogCategory] = useState(''); // category to pre-filter Browse Catalog with, set via navigate('catalog', key)
  const [catalogCampus, setCatalogCampus] = useState(''); // campus_id to pre-filter Browse Catalog with, set via navigate('catalog', category, campusId)
  const profileMenuRef = useRef(null);

  /* ═══════════════ NOTIFICATIONS ═══════════════
     Mirrors Dashboard.jsx's architecture: live bell list (max 15, in
     state) backed by a fuller persisted history (localStorage, via
     notificationHistory.js) for "See all". The only notification type a
     student currently receives is a canceled/rejected (or approved) borrow
     request, synthesized the same way Dashboard.jsx synthesizes the
     Librarian's equivalent — from a realtime UPDATE on borrow_requests —
     just filtered to this student's own requests instead of a campus. */
  const [notifications, setNotifications] = useState([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifTab,      setNotifTab]      = useState('all'); // 'all' | 'unread'
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');

  const [notifHistory, setNotifHistory] = useState(() => getNotifHistory(user?.id));
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  const notifBtnRef = useRef(null);
  const [notifPanelPos, setNotifPanelPos] = useState(null);
  const NOTIF_PANEL_WIDTH = 368;
  const NOTIF_PANEL_EDGE_GAP = 24;

  const computeNotifPanelPos = useCallback(() => {
    if (!notifBtnRef.current) return null;
    if (window.innerWidth <= 560) return null; // mobile sheet handled entirely by CSS
    const r = notifBtnRef.current.getBoundingClientRect();
    const right = NOTIF_PANEL_EDGE_GAP;
    const bellCenterX = r.left + r.width / 2;
    const rawArrowRight = (window.innerWidth - bellCenterX) - 8;
    const arrowRight = Math.min(
      right + NOTIF_PANEL_WIDTH - 34,
      Math.max(right + 18, rawArrowRight)
    );
    return { top: r.bottom + 14, right, arrowRight };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const onReposition = () => setNotifPanelPos(computeNotifPanelPos());
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [notifOpen, computeNotifPanelPos]);

  const seenNotifIdsRef = useRef(new Set());
  const seenNotifIdsInStateRef = useRef(new Set());
  const isFirstNotifLoad = useRef(true);

  const notifPrefsRef = useRef(getNotifPrefs(user?.id));
  const notifSoundRef = useRef(getNotifSoundEnabled(user?.id));
  // Bumped on every prefs change so memoized lists derived from
  // notifPrefsRef (a plain ref — mutating it doesn't itself trigger a
  // re-render) recompute immediately instead of waiting for unrelated
  // state to change first.
  const [prefsVersion, setPrefsVersion] = useState(0);

  useEffect(() => {
    const syncNotifPrefs = () => {
      notifPrefsRef.current = getNotifPrefs(user?.id);
      notifSoundRef.current = getNotifSoundEnabled(user?.id);
      setPrefsVersion(v => v + 1);
    };
    syncNotifPrefs();
    window.addEventListener(NOTIF_PREFS_EVENT, syncNotifPrefs);
    window.addEventListener('storage', syncNotifPrefs);
    return () => {
      window.removeEventListener(NOTIF_PREFS_EVENT, syncNotifPrefs);
      window.removeEventListener('storage', syncNotifPrefs);
    };
  }, [user?.id]);

  useEffect(() => {
    setNotifHistory(getNotifHistory(user?.id));
  }, [user?.id]);

  const playStudentNotifSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (freq, start, dur, vol = 0.18) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      beep(880, 0, 0.12);
      beep(1100, 0.14, 0.12);
      beep(1320, 0.28, 0.22);
    } catch { }
  }, []);

  const addStudentNotifications = useCallback((incoming, isRealtime = false) => {
    if (!incoming.length) return;
    // Strict opt-in ("=== true"): a type absent from prefs — disabled, or
    // a retired/legacy type with no toggle at all — must never pass.
    const allowed = incoming.filter(n => notifPrefsRef.current[n.type] === true);

    if (allowed.length) {
      const existingIds = new Set(seenNotifIdsInStateRef.current);
      const fresh = allowed.filter(n => !existingIds.has(n.id));
      if (fresh.length) {
        fresh.forEach(n => seenNotifIdsInStateRef.current.add(n.id));
        setNotifications(prev => [...fresh, ...prev].slice(0, STUDENT_NOTIF_MAX));
        if (isRealtime && !isFirstNotifLoad.current && notifSoundRef.current) {
          playStudentNotifSound();
        }
      }
      setNotifHistory(addNotifHistory(user?.id, allowed));
    }

    incoming.forEach(n => seenNotifIdsRef.current.add(n.id));
    isFirstNotifLoad.current = false;
  }, [playStudentNotifSound, user?.id]);

  const showInitialStudentBatch = useCallback((notifs) => {
    if (!notifs.length) return;
    const allowed = notifs.filter(n => notifPrefsRef.current[n.type] === true);
    if (!allowed.length) return;

    const readIds = new Set(getNotifHistory(user?.id).filter(h => h.read).map(h => h.id));
    const withReadState = allowed.map(n => (readIds.has(n.id) ? { ...n, read: true } : n));

    const existingIds = new Set(seenNotifIdsInStateRef.current);
    const fresh = withReadState.filter(n => !existingIds.has(n.id));
    if (fresh.length) {
      fresh.forEach(n => seenNotifIdsInStateRef.current.add(n.id));
      setNotifications(prev =>
        [...fresh, ...prev]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, STUDENT_NOTIF_MAX)
      );
    }
    setNotifHistory(addNotifHistory(user?.id, allowed));
  }, [user?.id]);

  // Recent decisions (approved/rejected) on THIS student's own borrow
  // requests. Same query shape as Dashboard.jsx's fetchRecentDecisions,
  // just scoped by student_id instead of campus_id.
  const isFirstStudentDecisionLoad = useRef(true);
  const fetchStudentRequestDecisions = useCallback(async (isRealtime = false) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('borrow_requests')
      .select('id, book_title, created_at, reviewed_at, status')
      .eq('student_id', user.id)
      .in('status', ['approved', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(STUDENT_NOTIF_MAX);

    if (error) { console.error('[StudentDashboard] decisions fetch error:', error.message); return; }

    const rows = data || [];

    if (isFirstStudentDecisionLoad.current) {
      rows.forEach(r => seenNotifIdsRef.current.add(`borrow_dec_${r.id}_${r.status}`));
      isFirstStudentDecisionLoad.current = false;
      const recent = rows.filter(r => Date.now() - new Date(r.reviewed_at || r.created_at).getTime() <= STUDENT_RECENT_WINDOW_MS);
      const recentNotifs = recent.map(r => buildStudentNotification({
        id:        `borrow_dec_${r.id}_${r.status}`,
        type:      r.status === 'approved' ? 'BORROW_APPROVED' : 'BORROW_CANCELLED',
        title:     r.status === 'approved' ? 'Request Approved' : 'Request Rejected',
        message:   r.status === 'approved'
          ? `Your request for "${r.book_title || 'a book'}" has been approved and is ready for pickup.`
          : `Your request for "${r.book_title || 'a book'}" has been rejected.`,
        createdAt: r.reviewed_at || r.created_at,
        extra:     { borrowId: r.id },
      }));
      showInitialStudentBatch(recentNotifs);
      return;
    }

    const newRows = rows.filter(r => !seenNotifIdsRef.current.has(`borrow_dec_${r.id}_${r.status}`));
    if (!newRows.length) return;

    const newNotifs = newRows.map(r => buildStudentNotification({
      id:        `borrow_dec_${r.id}_${r.status}`,
      type:      r.status === 'approved' ? 'BORROW_APPROVED' : 'BORROW_CANCELLED',
      title:     r.status === 'approved' ? 'Request Approved' : 'Request Rejected',
      message:   r.status === 'approved'
        ? `Your request for "${r.book_title || 'a book'}" has been approved and is ready for pickup.`
        : `Your request for "${r.book_title || 'a book'}" has been rejected.`,
      createdAt: r.reviewed_at || r.created_at,
      extra:     { borrowId: r.id },
    }));

    addStudentNotifications(newNotifs, isRealtime);
  }, [addStudentNotifications, showInitialStudentBatch, user?.id]);

  const studentNotifChannelRef = useRef(`student-notif-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let resubscribeTimer = null;
    let ch = null;

    const load = () => { fetchStudentRequestDecisions(false); };
    load();

    const subscribe = () => {
      ch = supabase
        .channel(studentNotifChannelRef.current)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'borrow_requests',
          filter: `student_id=eq.${user.id}`,
        }, (payload) => {
          const r = payload?.new;
          if (r && (r.status === 'approved' || r.status === 'rejected')) {
            addStudentNotifications([buildStudentNotification({
              id:        `borrow_dec_${r.id}_${r.status}`,
              type:      r.status === 'approved' ? 'BORROW_APPROVED' : 'BORROW_CANCELLED',
              title:     r.status === 'approved' ? 'Request Approved' : 'Request Rejected',
              message:   r.status === 'approved'
                ? `Your request for "${r.book_title || 'a book'}" has been approved and is ready for pickup.`
                : `Your request for "${r.book_title || 'a book'}" has been rejected.`,
              createdAt: r.reviewed_at || r.created_at,
              extra:     { borrowId: r.id },
            })], true);
          }
          fetchStudentRequestDecisions(true);
        })
        .subscribe((status) => {
          if (cancelled) return;
          setRealtimeStatus(status);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            supabase.removeChannel(ch);
            resubscribeTimer = setTimeout(() => { if (!cancelled) subscribe(); }, 2000);
          }
        });
    };
    subscribe();

    // Safety-net poll — same reasoning as Dashboard.jsx: guarantees new
    // activity still shows up even if Realtime replication happens to be
    // switched off for this table on this Supabase project.
    const pollId = setInterval(() => { fetchStudentRequestDecisions(true); }, 15000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      if (resubscribeTimer) clearTimeout(resubscribeTimer);
      if (ch) supabase.removeChannel(ch);
    };
  }, [user?.id, fetchStudentRequestDecisions, addStudentNotifications]);

  const unreadNotifCount = useMemo(
    () => notifications.reduce((n, item) => (item.read ? n : n + 1), 0),
    [notifications]
  );

  const NOTIF_NEW_WINDOW_MS = 3 * 60 * 60 * 1000;
  const visibleNotifications = useMemo(() => {
    // Strict opt-in: only types currently enabled in Settings →
    // Notifications are shown. A type absent from prefs (disabled, or a
    // retired/legacy type with no toggle at all) is excluded by default.
    const prefs = notifPrefsRef.current;
    const enabled = notifications.filter(n => prefs[n.type] === true);
    return notifTab === 'unread' ? enabled.filter(n => !n.read) : enabled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, notifTab, prefsVersion]);
  const notifNewGroup = useMemo(
    () => visibleNotifications.filter(n => Date.now() - new Date(n.createdAt).getTime() <= NOTIF_NEW_WINDOW_MS),
    [visibleNotifications]
  );
  const notifEarlierGroup = useMemo(
    () => visibleNotifications.filter(n => Date.now() - new Date(n.createdAt).getTime() > NOTIF_NEW_WINDOW_MS),
    [visibleNotifications]
  );

  const markStudentNotifRead = (id) => {
    const prevSnapshot = notifications;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      setNotifHistory(markNotifHistoryRead(user?.id, id));
    } catch (err) {
      console.error('[StudentDashboard] failed to persist mark-read:', err);
      setNotifications(prevSnapshot);
    }
  };

  const markAllStudentNotifRead = () => {
    const prevSnapshot = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      setNotifHistory(markAllNotifHistoryRead(user?.id));
    } catch (err) {
      console.error('[StudentDashboard] failed to persist mark-all-read:', err);
      setNotifications(prevSnapshot);
    }
  };

  const dismissAllStudentNotif = () => {
    setNotifications([]);
    seenNotifIdsInStateRef.current = new Set();
    setNotifOpen(false);
  };

  const clearStudentNotifHistory = () => {
    setNotifHistory(clearNotifHistory(user?.id));
  };

  const openStudentNotification = (n) => {
    markStudentNotifRead(n.id);
    const target = getStudentNotifTarget(n);
    if (!target) return;
    navigate(target.tab);
    setNotifOpen(false);
    setHistoryOpen(false);
  };

  const handleBellClick = () => {
    setNotifOpen(o => {
      const next = !o;
      if (next) setNotifPanelPos(computeNotifPanelPos());
      return next;
    });
  };

  const renderStudentNotifRow = (n) => {
    const typeInfo = STUDENT_NOTIF_TYPES[n.type] || STUDENT_NOTIF_TYPES.SYSTEM_ALERT;
    const isUnread = !n.read;
    const target   = getStudentNotifTarget(n);
    const canOpen  = !!target;

    return (
      <div
        key={n.id}
        className={`lm-notif-row${isUnread ? ' unread' : ''}${canOpen ? '' : ' unlinked'}`}
        onClick={canOpen ? () => openStudentNotification(n) : () => markStudentNotifRead(n.id)}
        style={canOpen ? undefined : { cursor: 'default' }}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            canOpen ? openStudentNotification(n) : markStudentNotifRead(n.id);
          }
        }}
      >
        <div
          className="lm-notif-row-bar"
          style={{ background: isUnread ? typeInfo.color : `${typeInfo.color}55` }}
        />
        <div className="lm-notif-body">
          <div className="lm-notif-row-top">
            <span className="lm-notif-type" style={{ color: isUnread ? typeInfo.color : 'var(--notif-secondary)' }}>
              {typeInfo.label}
            </span>
            <span className="lm-notif-time">{fmtNotifAgo(n.createdAt)}</span>
          </div>
          <div className={`lm-notif-msg${isUnread ? ' is-unread' : ''}`}>
            {n.message}
          </div>
        </div>
        {isUnread && (
          <div
            className="lm-notif-unread-dot"
            style={{ background: typeInfo.color, boxShadow: `0 0 8px ${typeInfo.color}99` }}
          />
        )}
      </div>
    );
  };

  const renderStudentNotifHistoryPage = () => {
    // Read fresh, and filter the persisted history down to currently
    // enabled types before anything else touches it — this is what hides
    // old entries whose type has since been disabled or retired, not just
    // what stops new ones from being added.
    const currentPrefs = getNotifPrefs(user?.id);
    const enabledHistory = notifHistory.filter(n => currentPrefs[n.type] === true);

    const q = historySearch.trim().toLowerCase();
    const rows = enabledHistory.filter(n => {
      const matchType = historyTypeFilter === 'all' || n.type === historyTypeFilter;
      const matchQ = !q || n.message?.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q);
      return matchType && matchQ;
    });
    const unreadTotal = enabledHistory.filter(n => !n.read).length;
    const todayTotal = enabledHistory.filter(n => {
      const d = new Date(n.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;

    return (
      <div className="lm-module lm-notif-hist-page">
        <div className="lm-module-header">
          <div>
            <div className="lm-module-title">Notification History</div>
            <div className="lm-module-subtitle">Every notification the bell has shown, kept locally on this device.</div>
          </div>
          <button className="sdb-btn sdb-btn-ghost" onClick={() => setHistoryOpen(false)}>
            Back to Dashboard
          </button>
        </div>

        <div className="lm-stats-grid">
          <div className="lm-stat-card">
            <div className="lm-stat-label">Total Logged</div>
            <div className="lm-stat-value">{enabledHistory.length}</div>
            <div className="lm-stat-sub">Up to 300 kept</div>
          </div>
          <div className="lm-stat-card">
            <div className="lm-stat-label">Unread</div>
            <div className="lm-stat-value">{unreadTotal}</div>
            <div className="lm-stat-sub">Awaiting review</div>
          </div>
          <div className="lm-stat-card">
            <div className="lm-stat-label">Today</div>
            <div className="lm-stat-value">{todayTotal}</div>
            <div className="lm-stat-sub">Since midnight</div>
          </div>
          <div className="lm-stat-card">
            <div className="lm-stat-label">Showing</div>
            <div className="lm-stat-value">{rows.length}</div>
            <div className="lm-stat-sub">Matches current filter</div>
          </div>
        </div>

        <div className="lm-filters">
          <div className="lm-search-wrap">
            <input
              type="text"
              className="lm-search"
              placeholder="Search notifications…"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              style={{ paddingLeft: 14 }}
            />
          </div>
          <select
            className="lm-select"
            value={historyTypeFilter}
            onChange={e => setHistoryTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {Object.entries(STUDENT_NOTIF_TYPES)
              .filter(([key]) => currentPrefs[key] === true)
              .map(([key, t]) => (
                <option key={key} value={key}>{t.label}</option>
              ))}
          </select>
          {notifHistory.length > 0 && (
            // Gated on the raw store so it stays available even when
            // everything currently in it is hidden above (disabled/retired
            // types) — it wipes the whole on-device log, not just what's
            // currently visible.
            <button className="lm-btn lm-btn--danger" onClick={clearStudentNotifHistory}>Clear history</button>
          )}
        </div>

        <div className="lm-notif-hist-panel">
          <div className="lm-panel-title">
            Activity Log
            <span className="lm-notif-hist-count">{rows.length}</span>
          </div>
          <div className="lm-notif-hist-list">
            {rows.length === 0 ? (
              <div className="lm-notif-empty">
                <div className="lm-notif-empty-title">
                  {enabledHistory.length === 0 ? 'No notifications yet' : 'No matches'}
                </div>
                <div className="lm-notif-empty-sub">
                  {enabledHistory.length === 0
                    ? 'Everything that comes in will be kept here, even after it scrolls out of the bell.'
                    : 'Try a different search term or type filter.'}
                </div>
              </div>
            ) : (
              rows.map((n, i) => {
                const typeInfo = STUDENT_NOTIF_TYPES[n.type] || STUDENT_NOTIF_TYPES.SYSTEM_ALERT;
                const isUnread = !n.read;
                const target   = getStudentNotifTarget(n);
                const canOpen  = !!target;
                return (
                  <div
                    key={n.id || i}
                    className={`lm-notif-row${isUnread ? ' unread' : ''}${canOpen ? '' : ' unlinked'}`}
                    onClick={canOpen ? () => openStudentNotification(n) : () => markStudentNotifRead(n.id)}
                    style={canOpen ? undefined : { cursor: 'default' }}
                  >
                    <div
                      className="lm-notif-row-bar"
                      style={{ background: isUnread ? typeInfo.color : `${typeInfo.color}55` }}
                    />
                    <div className="lm-notif-body">
                      <div className="lm-notif-row-top">
                        <span className="lm-notif-type" style={{ color: isUnread ? typeInfo.color : 'var(--notif-secondary)' }}>
                          {typeInfo.label}
                        </span>
                        <span className="lm-notif-time">{fmtNotifAgo(n.createdAt)}</span>
                      </div>
                      <div className={`lm-notif-msg${isUnread ? ' is-unread' : ''}`}>{n.message}</div>
                    </div>
                    {isUnread && (
                      <div
                        className="lm-notif-unread-dot"
                        style={{ background: typeInfo.color, boxShadow: `0 0 8px ${typeInfo.color}99` }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };



  /* Load profile */
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('*').eq('id',user.id).single()
      .then(({data}) => setProfile(data||null))
      .catch(e => console.warn('[Profile fetch]',e?.message));
  }, [user?.id]);

  /* Close the profile dropdown on outside click / Escape */
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e) => { if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileOpen(false); };
    const onEsc   = (e) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onEsc); };
  }, [profileOpen]);

  const navigate = useCallback((tab, category = '', campus = '') => {
    setActiveTab(tab);
    setMobileOpen(false);
    setProfileOpen(false);
    if (tab === 'catalog') { setCatalogCategory(category); setCatalogCampus(campus); }
    if (window.location.hash !== `#${tab}`) window.location.hash = tab;
  }, []);

  // Keep activeTab in sync with the URL hash (back/forward buttons, direct links, manual edits)
  useEffect(() => {
    const onHashChange = () => setActiveTab(getStudentTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const firstName   = profile?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Student';
  const lastName    = profile?.last_name  || user?.user_metadata?.last_name  || '';
  const displayName = `${firstName} ${lastName}`.trim();
  const initials    = [firstName[0],lastName[0]].filter(Boolean).join('').toUpperCase()||'S';
  const avatarUrl   = profile?.avatar_url || null;

  const content = () => {
    switch(activeTab) {
      case 'home':      return <PageHome      user={user} profile={profile} onNavigate={navigate} />;
      case 'catalog':   return <PageCatalog   user={user} initialCategory={catalogCategory} initialCampus={catalogCampus} />;
      case 'favorites': return <PageFavorites user={user} onNavigate={navigate} />;
      case 'history':   return <PageHistory   user={user} />;
      case 'profile':   return <PageProfile   user={user} profile={profile} onProfileUpdate={setProfile} />;
      case 'settings':  return <PageSettings  user={user} onSignOut={()=>setShowLogout(true)} />;
      default:          return <PageHome      user={user} profile={profile} onNavigate={navigate} />;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="sdb-shell">

        {/* ═══ TOP NAVBAR ═══ */}
        <header className="sdb-navbar">
          <div className="sdb-brand">
            <div className="sdb-brand-logo">
              <img src="/LibraryLogo.png" alt="LibraScan" onError={e=>{e.target.style.display='none';}} />
            </div>
            <div className="sdb-brand-text">
              <div className="sdb-brand-title">LIBRASCAN</div>
              <div className="sdb-brand-sub">Pampanga State University</div>
            </div>
          </div>

          {/* Primary links (desktop) */}
          <nav className="sdb-navlinks">
            {NAV.map(item => (
              <button key={item.id} className={`sdb-navlink${activeTab===item.id?' active':''}`} onClick={()=>navigate(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sdb-nav-right">
            {/* Hamburger (tablet/mobile) */}
            <button className="sdb-hamburger" onClick={()=>setMobileOpen(v=>!v)} title="Menu">{Ic.menu}</button>

            {/* Bell */}
            <div className="lm-notif-wrap">
              <button
                ref={notifBtnRef}
                className="sdb-bell-btn"
                onClick={handleBellClick}
                title="Notifications"
                aria-label="Notifications"
              >
                {Ic.bell}
                {unreadNotifCount > 0 && (
                  <span className="lm-notif-badge" aria-hidden="true">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
                {unreadNotifCount > 0 && (
                  <span className="lm-sr-only">{unreadNotifCount} unread notification{unreadNotifCount === 1 ? '' : 's'}</span>
                )}
              </button>

              {notifOpen && createPortal(
                <>
                  <div className="lm-notif-backdrop" onClick={() => setNotifOpen(false)} />
                  {notifPanelPos && (
                    <div className="lm-notif-caret" style={{ right: notifPanelPos.arrowRight, top: notifPanelPos.top - 8 }} />
                  )}
                  <div
                    className="lm-notif-panel"
                    style={notifPanelPos ? { top: notifPanelPos.top, right: notifPanelPos.right } : undefined}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="lm-notif-head">
                      <div className="lm-notif-head-top">
                        <div className="lm-notif-head-title">
                          Notifications
                          <span
                            className={`lm-notif-live${realtimeStatus === 'SUBSCRIBED' ? ' is-live' : ''}`}
                            title={realtimeStatus === 'SUBSCRIBED' ? 'Live — updates instantly' : 'Reconnecting…'}
                          >
                            <i className="lm-notif-live-dot" />
                            {realtimeStatus === 'SUBSCRIBED' ? 'Live' : 'Syncing'}
                          </span>
                        </div>
                        {unreadNotifCount > 0 && (
                          <button
                            className="lm-notif-action-btn"
                            onClick={markAllStudentNotifRead}
                            title="Mark all as read"
                            aria-label="Mark all notifications as read"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="lm-notif-tabs" role="tablist" aria-label="Filter notifications">
                        <button
                          type="button" role="tab" aria-selected={notifTab === 'all'}
                          className={`lm-notif-tab${notifTab === 'all' ? ' active' : ''}`}
                          onClick={() => setNotifTab('all')}
                        >All</button>
                        <button
                          type="button" role="tab" aria-selected={notifTab === 'unread'}
                          className={`lm-notif-tab${notifTab === 'unread' ? ' active' : ''}`}
                          onClick={() => setNotifTab('unread')}
                        >
                          Unread{unreadNotifCount > 0 ? ` (${unreadNotifCount > 99 ? '99+' : unreadNotifCount})` : ''}
                        </button>
                      </div>
                    </div>

                    <div className="lm-notif-list">
                      {visibleNotifications.length === 0 ? (
                        <div className="lm-notif-empty">
                          <div className="lm-notif-empty-title">
                            {notifTab === 'unread' ? "You're all caught up" : 'No notifications yet'}
                          </div>
                          <div className="lm-notif-empty-sub">
                            {notifTab === 'unread'
                              ? 'No unread notifications right now.'
                              : "New activity will appear here instantly — no refresh needed."}
                          </div>
                        </div>
                      ) : (
                        <>
                          {notifNewGroup.length > 0 && (
                            <>
                              <div className="lm-notif-section-head">
                                <span>New</span>
                                <button
                                  type="button" className="lm-notif-see-all"
                                  onClick={() => { setNotifOpen(false); setHistoryOpen(true); }}
                                >See all →</button>
                              </div>
                              {notifNewGroup.map(renderStudentNotifRow)}
                            </>
                          )}
                          {notifEarlierGroup.length > 0 && (
                            <>
                              <div className="lm-notif-section-head">
                                <span>Earlier</span>
                                {notifNewGroup.length === 0 && (
                                  <button
                                    type="button" className="lm-notif-see-all"
                                    onClick={() => { setNotifOpen(false); setHistoryOpen(true); }}
                                  >See all →</button>
                                )}
                              </div>
                              {notifEarlierGroup.map(renderStudentNotifRow)}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <div className="lm-notif-foot">
                      <button
                        type="button" className="lm-notif-settings-link"
                        onClick={() => { navigate('settings'); setNotifOpen(false); setHistoryOpen(false); }}
                        title="Manage notification preferences"
                      >Preferences</button>
                      <div className="lm-notif-foot-right">
                        {notifications.length > 0 && (
                          <>
                            <span className="lm-notif-foot-count">{notifications.length} of {STUDENT_NOTIF_MAX} max</span>
                            <button className="lm-notif-clear-btn" onClick={dismissAllStudentNotif} title="Clears this dropdown only — full history stays in See all">Clear all</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>

            {/* Profile chip + dropdown */}
            <div ref={profileMenuRef} style={{ position:'relative' }}>
              <div className={`sdb-profile-chip${profileOpen?' open':''}`} onClick={()=>setProfileOpen(v=>!v)} title="Account menu">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="sdb-avatar" style={{ padding:0 }} onError={e=>{e.target.style.display='none';}} />
                  : <div className="sdb-avatar">{initials}</div>
                }
                <div>
                  <div className="sdb-profile-name">{displayName}</div>
                  <div className="sdb-profile-role">Student</div>
                </div>
                <span className="sdb-chip-caret">{Ic.chevDown}</span>
              </div>

              {profileOpen && (
                <div className="sdb-dropdown">
                  {PROFILE_MENU.map(item => (
                    <button key={item.id} className="sdb-dropdown-item" onClick={()=>navigate(item.id)}>
                      {Ic[item.icon]} {item.label}
                    </button>
                  ))}

                  <div className="sdb-dropdown-sep" />
                  <button className="sdb-dropdown-item danger" onClick={()=>{setProfileOpen(false);setShowLogout(true);}}>
                    {Ic.logout} Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ═══ MOBILE NAV PANEL ═══ */}
        <nav className={`sdb-mobnav${mobileOpen?' open':''}`}>
          {NAV.map(item => (
            <button key={item.id} className={`sdb-mobnav-item${activeTab===item.id?' active':''}`} onClick={()=>navigate(item.id)}>
              <span style={{ display:'flex' }}>{Ic[item.icon]}</span>{item.label}
            </button>
          ))}
        </nav>

        {/* ═══ MAIN ═══ */}
        <div className="sdb-main">
          <main className="sdb-content">
            {historyOpen ? renderStudentNotifHistoryPage() : content()}

            {!historyOpen && activeTab === 'home' && (
              <footer className="sdb-sitefoot">
                <div className="sdb-sitefoot-text">
                  Pampanga State University<span className="sdb-sitefoot-dot">•</span>Librascan System<span className="sdb-sitefoot-dot">•</span>2026
                </div>
              </footer>
            )}
          </main>
        </div>
      </div>

      {/* ═══ LOGOUT CONFIRM ═══ */}
      {showLogout && (
        <div className="sdb-modal-bg" onClick={()=>setShowLogout(false)}>
          <div className="sdb-modal" style={{ maxWidth:440 }} onClick={e=>e.stopPropagation()}>
            <div className="sdb-modal-hdr">
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:34,height:34,borderRadius:'50%',background:'rgba(245,228,168,.10)',border:'1.5px solid rgba(245,228,168,.20)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  {Ic.logout}
                </div>
                <div>
                  <div className="sdb-modal-title">Sign Out</div>
                  <div className="sdb-modal-sub">This will end your current session</div>
                </div>
              </div>
              <button className="sdb-modal-close" onClick={()=>setShowLogout(false)}>{Ic.close}</button>
            </div>
            <div className="sdb-modal-body">
              <div style={{ background:'rgba(139,0,0,.08)',border:'1px solid rgba(139,0,0,.18)',borderRadius:10,padding:'16px 20px',textAlign:'center',marginBottom:22 }}>
                <div style={{ fontFamily:'var(--font-display)',fontSize:14,fontWeight:600,color:'var(--text-primary)',letterSpacing:'.03em' }}>Are you sure you want to sign out?</div>
                <div style={{ fontFamily:'var(--font-sans)',fontSize:12,color:'var(--text-muted)',marginTop:4 }}>of the PSU Library System</div>
              </div>
            </div>
            <div className="sdb-modal-foot">
              <button className="sdb-btn sdb-btn-ghost" onClick={()=>setShowLogout(false)}>Cancel</button>
              <button className="sdb-btn sdb-btn-primary" onClick={onSignOut}>{Ic.logout}&nbsp; Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}