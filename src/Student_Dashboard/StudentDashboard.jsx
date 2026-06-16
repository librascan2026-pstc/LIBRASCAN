// src/Student_Dashboard/StudentDashboard.jsx
// ─── 100% Visual-consistent with Admin Dashboard (Dashboard.css / Dashboard.jsx) ───
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

/* ═══════════════════════════════════════════════════════════════
   INLINE STYLES  — mirrors every token in Dashboard.css exactly
═══════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

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
  --bg-base:           #FDF8F0;
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
}

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
button { cursor:pointer; }

/* ════════ KEYFRAMES ════════ */
@keyframes lm-fade-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
@keyframes lm-modal-in   { from{opacity:0;transform:scale(.93) translateY(-12px)} to{opacity:1;transform:none} }
@keyframes lm-spin       { to{transform:rotate(360deg)} }
@keyframes lm-toast-in   { from{opacity:0;transform:translateY(12px) scale(.96)} to{opacity:1;transform:none} }
@keyframes lm-pulse-dot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:.8} }
@keyframes sdb-slide-in  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }

/* ════════ SHELL ════════ */
.sdb-shell {
  display:flex; min-height:100vh; width:100%;
  background:var(--bg-base); color:var(--text-primary);
  font-family:var(--font-sans); font-size:14px; line-height:1.5;
  overflow:hidden;
}

/* ════════ SIDEBAR — matches .lm-sidebar exactly ════════ */
.sdb-sidebar {
  width:var(--sidebar-w); min-height:100vh;
  background-color:var(--maroon-deep);
  display:flex; flex-direction:column;
  position:fixed; top:0; left:0; bottom:0; z-index:100;
  overflow:hidden;
  box-shadow:var(--shadow-sidebar);
  transition:width 0.32s cubic-bezier(.4,0,.2,1);
}
.sdb-sidebar.collapsed { width:var(--sidebar-collapsed-w); }

/* Dark overlay layer */
.sdb-sidebar::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(180deg,rgba(40,0,0,.55) 0%,rgba(60,0,0,.50) 30%,rgba(50,0,0,.52) 70%,rgba(30,0,0,.62) 100%);
  pointer-events:none; z-index:0;
}
/* Gold top stripe */
.sdb-sidebar::after {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--maroon-deep) 0%,var(--gold-dim) 25%,var(--gold) 50%,var(--gold-light) 60%,var(--gold) 75%,var(--maroon-deep) 100%);
  z-index:3;
}
.sdb-sidebar > * { position:relative; z-index:1; }

/* ── Logo block — matches .lm-sidebar-logo ── */
.sdb-logo-wrap {
  padding:22px 16px 18px;
  border-bottom:2px solid rgba(201,168,76,.30);
  display:flex; flex-direction:column; align-items:center; gap:10px;
  background-color:rgba(30,0,0,.50);
  flex-shrink:0; overflow:hidden; position:relative;
}
.sdb-logo-wrap::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(180deg,rgba(126,3,3,.5) 0%,rgba(103,2,2,.45) 50%,rgba(124,5,5,.55) 100%);
  z-index:0;
}
.sdb-logo-wrap::after {
  content:''; position:absolute; bottom:0; left:10%; right:10%; height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.55),transparent);
  z-index:2;
}
.sdb-logo-wrap > * { position:relative; z-index:1; }

.sdb-logo-icon {
  width:110px; height:110px; border-radius:50%;
  background:transparent; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; border:2.5px solid rgba(201,168,76,.65); overflow:hidden;
  box-shadow:0 6px 28px rgba(0,0,0,.65),inset 0 1px 0 rgba(201,168,76,.25),0 0 0 6px rgba(201,168,76,.10);
  transition:box-shadow var(--ease),transform var(--ease);
}
.sdb-logo-icon:hover { transform:scale(1.05); }
.sdb-logo-icon img { width:100%; height:100%; object-fit:contain; padding:4px; filter:drop-shadow(0 2px 6px rgba(201,168,76,.30)); }
.sdb-logo-text {
  font-family:var(--font-display); font-size:19px; font-weight:700;
  color:#FFE97A; letter-spacing:.18em; text-align:center; text-transform:uppercase;
  text-shadow:0 2px 10px rgba(0,0,0,.80),0 0 20px rgba(201,168,76,.30);
  transition:opacity .18s;
}
.sdb-logo-sub {
  font-family:var(--font-sans); font-size:7px; color:rgba(255,232,160,.85);
  letter-spacing:.08em; text-transform:uppercase; text-align:center; line-height:1.6;
  padding:0 8px; text-shadow:0 1px 6px rgba(0,0,0,.70); transition:opacity .18s;
}

/* Collapsed logo */
.sdb-sidebar.collapsed .sdb-logo-icon { width:42px; height:42px; }
.sdb-sidebar.collapsed .sdb-logo-text,
.sdb-sidebar.collapsed .sdb-logo-sub { opacity:0; width:0; overflow:hidden; pointer-events:none; }
.sdb-sidebar.collapsed .sdb-logo-wrap { padding:14px 8px; gap:0; }

/* ── Collapse button — matches .lm-collapse-btn ── */
.sdb-collapse-btn {
  display:flex; align-items:center; gap:8px;
  padding:8px 14px; margin:4px 12px 0;
  border-radius:var(--radius); background:transparent;
  border:1px solid rgba(201,168,76,.18);
  color:rgba(255,220,130,.65);
  font-family:var(--font-sans); font-size:11px; font-weight:500;
  letter-spacing:.06em; text-transform:uppercase;
  cursor:pointer; white-space:nowrap; overflow:hidden; flex-shrink:0;
  transition:background var(--ease),color var(--ease),border-color var(--ease);
}
.sdb-collapse-btn:hover { background:rgba(201,168,76,.12); color:#FFE97A; border-color:rgba(201,168,76,.32); }
.sdb-collapse-btn svg { flex-shrink:0; transition:transform .32s cubic-bezier(.4,0,.2,1); }
.sdb-sidebar.collapsed .sdb-collapse-btn svg { transform:rotate(180deg); }
.sdb-sidebar.collapsed .sdb-collapse-btn { justify-content:center; }
.sdb-sidebar.collapsed .sdb-collapse-label { display:none; }

/* ── Nav — matches .lm-nav / .lm-nav-item ── */
.sdb-nav { padding:10px 12px; flex:1; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(201,168,76,.15) transparent; }
.sdb-nav::-webkit-scrollbar { width:3px; }
.sdb-nav::-webkit-scrollbar-thumb { background:rgba(201,168,76,.20); border-radius:4px; }

.sdb-nav-sep {
  height:1px; background:rgba(201,168,76,.15); margin:8px 8px 4px;
}
.sdb-sidebar.collapsed .sdb-nav-sep { width:36px; margin:8px auto 4px; }

.sdb-nav-item {
  display:flex; align-items:center; gap:12px;
  padding:11px 14px; margin-bottom:3px;
  cursor:pointer; color:rgba(255,232,160,.92);
  border-radius:var(--radius); background:transparent;
  border:1px solid transparent; text-align:left; width:100%;
  font-family:var(--font-sans); font-size:13.5px; font-weight:500;
  letter-spacing:.01em; white-space:nowrap; overflow:hidden;
  text-shadow:0 1px 4px rgba(0,0,0,.60); position:relative;
  transition:background var(--ease),color var(--ease),border-color var(--ease),transform var(--ease);
}
.sdb-nav-item::before {
  content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
  background:linear-gradient(180deg,var(--gold-light),var(--gold));
  border-radius:0 3px 3px 0; opacity:0; transition:opacity var(--ease);
}
.sdb-nav-item:hover::before { opacity:.6; }
.sdb-nav-item.active::before { opacity:1; }
.sdb-nav-item:hover {
  background:rgba(201,168,76,.15); color:#FFE97A;
  border-color:rgba(201,168,76,.25); transform:translateX(3px);
}
.sdb-nav-item.active {
  background:rgba(201,168,76,.20); color:#FFE97A;
  border-color:rgba(201,168,76,.40); font-weight:600;
  box-shadow:inset 0 1px 0 rgba(201,168,76,.15),0 2px 10px rgba(0,0,0,.25);
}
.sdb-nav-icon {
  width:22px; display:flex; align-items:center; justify-content:center;
  color:rgba(255,215,100,.75); flex-shrink:0; transition:color var(--ease);
}
.sdb-nav-item:hover .sdb-nav-icon,
.sdb-nav-item.active .sdb-nav-icon { color:var(--gold); }
.sdb-nav-label { flex:1; transition:opacity .18s; overflow:hidden; }
.sdb-sidebar.collapsed .sdb-nav-label { opacity:0; width:0; pointer-events:none; }
.sdb-sidebar.collapsed .sdb-nav-item { padding:11px; justify-content:center; gap:0; transform:none !important; }
.sdb-sidebar.collapsed .sdb-nav-icon { width:auto; margin:0; }

/* Collapsed tooltip */
.sdb-sidebar.collapsed .sdb-nav-item[data-tip]:hover::after {
  content:attr(data-tip); position:absolute;
  left:calc(var(--sidebar-collapsed-w) - 4px); top:50%; transform:translateY(-50%);
  background:var(--maroon-deep); color:var(--gold-pale);
  font-family:var(--font-sans); font-size:12px; font-weight:500;
  padding:6px 12px; border-radius:8px;
  border:1px solid rgba(201,168,76,.35); white-space:nowrap; z-index:200;
  box-shadow:4px 4px 16px rgba(0,0,0,.40); pointer-events:none;
}

/* Sidebar footer */
.sdb-sidebar-footer {
  padding:14px 14px 22px; flex-shrink:0;
  border-top:1px solid rgba(201,168,76,.22);
}
.sdb-sidebar.collapsed .sdb-sidebar-footer { padding:14px 8px 22px; }

/* ════════ MAIN ════════ */
.sdb-main {
  margin-left:var(--sidebar-w); flex:1; display:flex; flex-direction:column;
  min-height:100vh; background:var(--bg-base);
  transition:margin-left .32s cubic-bezier(.4,0,.2,1);
}
.sdb-main.collapsed { margin-left:var(--sidebar-collapsed-w); }

/* ════════ TOPBAR — matches .lm-topbar exactly ════════ */
.sdb-topbar {
  height:var(--topbar-h); background-color:#F5E4A8;
  border-bottom:2px solid rgba(139,0,0,.30);
  display:flex; align-items:center; justify-content:space-between;
  padding:0 30px; position:sticky; top:0; z-index:90;
  box-shadow:0 2px 16px rgba(80,0,0,.18); overflow:visible;
}
.sdb-topbar::before {
  content:''; position:absolute; inset:0; background:#FDF8F0;
  z-index:0; pointer-events:none; overflow:hidden;
}
.sdb-topbar::after {
  content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px;
  background:linear-gradient(90deg,transparent 0%,rgba(139,0,0,.35) 20%,var(--gold) 50%,rgba(139,0,0,.35) 80%,transparent 100%);
  z-index:2;
}
.sdb-topbar > * { position:relative; z-index:1; }

.sdb-topbar-left { display:flex; flex-direction:column; gap:2px; }
.sdb-topbar-title {
  font-family:var(--font-display); font-size:22px; font-weight:700;
  color:#4A0000; letter-spacing:.03em; line-height:1.1;
  text-shadow:0 1px 3px rgba(255,255,255,.30);
}
.sdb-breadcrumb { font-size:11.5px; color:#7A2020; font-family:var(--font-sans); font-weight:500; }
.sdb-topbar-right { display:flex; align-items:center; gap:14px; overflow:visible; position:relative; z-index:100; }

/* Profile chip — matches .lm-profile-chip */
.sdb-profile-chip {
  display:flex; align-items:center; gap:10px;
  padding:6px 16px 6px 6px; border-radius:40px;
  background:linear-gradient(135deg,var(--maroon-deep),var(--maroon-mid));
  border:1.5px solid rgba(201,168,76,.35); cursor:pointer;
  box-shadow:0 3px 14px rgba(40,0,0,.30);
  transition:background var(--ease),border-color var(--ease),transform var(--ease),box-shadow var(--ease);
}
.sdb-profile-chip:hover {
  background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-light));
  border-color:rgba(201,168,76,.55); transform:translateY(-1px);
  box-shadow:0 5px 20px rgba(40,0,0,.40);
}
.sdb-profile-name {
  font-family:var(--font-display); font-size:12.5px; font-weight:600;
  color:var(--gold-pale); letter-spacing:.04em; line-height:1.2; white-space:nowrap;
}
.sdb-profile-role { font-size:10px; color:rgba(245,228,168,.55); font-family:var(--font-sans); white-space:nowrap; }

/* Avatar — matches .lm-avatar */
.sdb-avatar {
  width:36px; height:36px; border-radius:50%;
  background:linear-gradient(135deg,var(--gold-dim),var(--gold));
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-display); font-size:12px; font-weight:700;
  color:var(--maroon-deep); border:2px solid rgba(201,168,76,.40);
  flex-shrink:0; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.25);
}

/* Hamburger (mobile) */
.sdb-hamburger {
  display:none; align-items:center; justify-content:center;
  width:40px; height:40px; border-radius:var(--radius);
  background:rgba(139,0,0,.10); border:1.5px solid rgba(139,0,0,.28);
  color:var(--maroon-deep); cursor:pointer; flex-shrink:0;
  transition:background var(--ease),border-color var(--ease);
}
.sdb-hamburger:hover { background:rgba(139,0,0,.18); border-color:rgba(139,0,0,.48); }

/* Mobile sidebar overlay */
.sdb-mob-overlay {
  display:none; position:fixed; inset:0;
  background:rgba(0,0,0,.45); z-index:299; backdrop-filter:blur(2px);
  animation:lm-fade-in .2s ease;
}

/* ════════ CONTENT — matches .lm-content ════════ */
.sdb-content {
  flex:1; padding:28px 30px; overflow-y:auto; background:var(--bg-base);
  scrollbar-width:thin; scrollbar-color:rgba(139,0,0,.20) transparent;
}
.sdb-content::-webkit-scrollbar { width:5px; }
.sdb-content::-webkit-scrollbar-thumb { background:rgba(139,0,0,.20); border-radius:10px; }

/* ════════ MODULE ════════ */
.sdb-module { animation:lm-fade-in .32s ease; }
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
  background:linear-gradient(145deg,#8B0000 0%,#680000 100%);
  border:1px solid rgba(201,168,76,.42); border-radius:var(--radius-lg);
  padding:22px 22px 20px; display:flex; flex-direction:column; gap:6px;
  position:relative; overflow:hidden;
  box-shadow:var(--shadow-card); cursor:default;
  transition:transform var(--ease),box-shadow var(--ease),border-color var(--ease);
}
.sdb-stat-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--gold-dim),var(--gold-light),var(--gold));
}
.sdb-stat-card::after {
  content:''; position:absolute; bottom:-20px; right:-20px;
  width:80px; height:80px; border-radius:50%;
  background:radial-gradient(circle,rgba(201,168,76,.08) 0%,transparent 70%);
  pointer-events:none;
}
.sdb-stat-card:hover { transform:translateY(-4px); box-shadow:0 10px 32px rgba(40,0,0,.45); border-color:rgba(201,168,76,.60); }
.sdb-stat-icon {
  display:flex; align-items:center; justify-content:center;
  width:40px; height:40px; border-radius:11px;
  background:rgba(201,168,76,.14); border:1px solid rgba(201,168,76,.25);
  color:var(--gold); margin-bottom:4px; flex-shrink:0;
  transition:background var(--ease),transform var(--ease);
}
.sdb-stat-card:hover .sdb-stat-icon { background:rgba(201,168,76,.22); transform:scale(1.08); }
.sdb-stat-label {
  font-size:10px; font-weight:600; letter-spacing:.11em; text-transform:uppercase;
  color:rgba(255,230,150,.72); font-family:var(--font-sans);
}
.sdb-stat-value {
  font-family:var(--font-display); font-size:32px; color:#FFE97A;
  line-height:1; letter-spacing:.02em; text-shadow:0 2px 10px rgba(0,0,0,.35);
}
.sdb-stat-sub { font-size:11px; color:rgba(255,225,140,.55); font-family:var(--font-sans); margin-top:2px; }

/* ════════ PANEL — matches .lm-panel ════════ */
.sdb-panel {
  background:linear-gradient(145deg,#850000 0%,#6E0000 100%);
  border:1px solid rgba(201,168,76,.38); border-radius:var(--radius-lg);
  padding:20px 22px; margin-bottom:16px; box-shadow:var(--shadow-card);
  overflow:hidden;
}
.sdb-panel-hdr {
  font-family:var(--font-display); font-size:12px; font-weight:600;
  color:var(--gold); letter-spacing:.10em; text-transform:uppercase;
  margin-bottom:14px; padding-bottom:10px;
  border-bottom:1px solid rgba(201,168,76,.18);
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}

/* ════════ WELCOME CARD (student-specific, dark) ════════ */
.sdb-welcome-card {
  background:linear-gradient(145deg,#8B0000 0%,#6B0000 100%);
  border:1px solid rgba(201,168,76,.42); border-radius:var(--radius-lg);
  padding:24px 26px; margin-bottom:20px;
  display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:18px;
  box-shadow:var(--shadow-card); position:relative; overflow:hidden;
}
.sdb-welcome-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--gold-dim),var(--gold-light),var(--gold));
}

/* ════════ CATALOG GRID ════════ */
.sdb-book-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:18px;
}
/* Book card — matches .lm-book-card */
.sdb-book-card {
  background:linear-gradient(145deg,#880000 0%,#6B0000 100%);
  border:1px solid rgba(201,168,76,.38); border-radius:var(--radius-lg);
  overflow:hidden; cursor:pointer;
  transition:border-color var(--ease),transform var(--ease),box-shadow var(--ease);
  box-shadow:var(--shadow-card); display:flex; flex-direction:column;
}
.sdb-book-card:hover {
  border-color:rgba(201,168,76,.62); transform:translateY(-6px);
  box-shadow:0 16px 40px rgba(40,0,0,.48),0 0 0 1px rgba(201,168,76,.14);
}
.sdb-book-cover-area {
  height:120px; display:flex; align-items:center; justify-content:center;
  background:linear-gradient(145deg,rgba(80,0,0,.70) 0%,rgba(20,0,0,.90) 100%);
  border-bottom:1px solid rgba(201,168,76,.18); position:relative; overflow:hidden;
}
.sdb-book-cover-area img { height:100%; width:100%; object-fit:cover; transition:transform .28s ease; }
.sdb-book-card:hover .sdb-book-cover-area img { transform:scale(1.06); filter:brightness(1.1); }
.sdb-fav-btn {
  position:absolute; top:7px; right:7px;
  background:rgba(20,0,0,.65); border:1px solid rgba(201,168,76,.30);
  border-radius:8px; padding:5px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .18s; backdrop-filter:blur(4px);
}
.sdb-fav-btn:hover { background:rgba(20,0,0,.90); transform:scale(1.12); }
.sdb-book-body { padding:14px; flex:1; display:flex; flex-direction:column; }
.sdb-book-title {
  font-size:13px; font-weight:600; color:var(--gold-pale); margin-bottom:3px;
  line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.sdb-book-author { font-size:11px; color:rgba(245,228,168,.55); margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sdb-book-genre {
  display:inline-block; padding:2px 9px; border-radius:12px;
  font-size:10px; font-family:var(--font-sans);
  background:rgba(201,168,76,.10); color:var(--gold); border:1px solid rgba(201,168,76,.22);
}
.sdb-book-actions { display:flex; gap:6px; margin-top:10px; }

/* ════════ TABLE — matches .lm-table-wrap ════════ */
.sdb-table-wrap {
  background:linear-gradient(145deg,#880000 0%,#6A0000 100%);
  border:1px solid rgba(201,168,76,.38); border-radius:var(--radius-lg);
  overflow:hidden; overflow-x:auto; -webkit-overflow-scrolling:touch;
  box-shadow:var(--shadow-card);
}
.sdb-table-wrap table { width:100%; min-width:560px; border-collapse:collapse; }
.sdb-table-wrap thead tr { background:rgba(30,0,0,.35); border-bottom:1px solid rgba(201,168,76,.20); }
.sdb-table-wrap thead th {
  padding:12px 16px; text-align:left; font-family:var(--font-sans);
  font-size:10px; font-weight:600; letter-spacing:.12em; text-transform:uppercase;
  color:rgba(201,168,76,.75);
}
.sdb-table-wrap tbody tr { border-bottom:1px solid rgba(201,168,76,.07); transition:background var(--ease); }
.sdb-table-wrap tbody tr:last-child { border-bottom:none; }
.sdb-table-wrap tbody tr:hover { background:rgba(245,228,168,.06); }
.sdb-table-wrap tbody td { padding:12px 16px; font-size:13px; color:rgba(245,228,168,.78); vertical-align:middle; }

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
  background:transparent; color:var(--gold); border-color:rgba(201,168,76,.38);
}
.sdb-btn-ghost:hover:not(:disabled) {
  background:rgba(201,168,76,.10); border-color:rgba(201,168,76,.58);
  transform:translateY(-1px); color:var(--gold-light);
}
.sdb-btn-ghost:disabled { opacity:.50; cursor:not-allowed; }
.sdb-btn-danger {
  background:linear-gradient(135deg,rgba(139,0,0,.5),rgba(80,0,0,.5));
  color:#ef9a9a; border-color:rgba(239,154,154,.25);
}
.sdb-btn-danger:hover { background:linear-gradient(135deg,rgba(180,0,0,.65),rgba(110,0,0,.65)); border-color:rgba(239,154,154,.42); transform:translateY(-1px); }

/* Table action btns */
.sdb-tbl-btn {
  display:inline-flex; align-items:center; gap:5px;
  padding:5px 12px; border-radius:7px;
  font-family:var(--font-sans); font-size:11.5px; font-weight:500;
  cursor:pointer; border:1px solid transparent; transition:all var(--ease);
}
.sdb-tbl-edit { background:rgba(201,168,76,.11); color:var(--gold); border-color:rgba(201,168,76,.22); }
.sdb-tbl-edit:hover { background:rgba(201,168,76,.22); border-color:rgba(201,168,76,.42); transform:translateY(-1px); }
.sdb-tbl-del { background:rgba(239,154,154,.09); color:#ef9a9a; border-color:rgba(239,154,154,.16); }
.sdb-tbl-del:hover { background:rgba(239,154,154,.20); border-color:rgba(239,154,154,.32); transform:translateY(-1px); }

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
.sdb-activity-item:hover { background:rgba(245,228,168,.05); padding-left:8px; }
.sdb-activity-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; box-shadow:0 0 6px currentColor; }
.sdb-activity-text { flex:1; font-size:12.5px; color:rgba(255,232,160,.88); line-height:1.45; }
.sdb-activity-time { font-size:10.5px; color:rgba(255,220,130,.55); white-space:nowrap; flex-shrink:0; }

/* ════════ PROFILE HEADER ════════ */
.sdb-profile-banner {
  background:linear-gradient(145deg,#8B0000 0%,#5A0000 100%);
  border:1px solid rgba(201,168,76,.38); border-radius:var(--radius-lg);
  overflow:hidden; margin-bottom:18px; box-shadow:var(--shadow-card);
}
.sdb-profile-cover {
  height:90px; position:relative;
  background:linear-gradient(90deg,rgba(201,168,76,.12),rgba(201,168,76,.06),transparent);
}
.sdb-profile-cover::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.40),transparent);
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
.sdb-info-key { font-size:11px; font-weight:600; letter-spacing:.09em; text-transform:uppercase; color:rgba(255,220,130,.55); font-family:var(--font-sans); }
.sdb-info-val { font-size:13px; color:rgba(245,228,168,.85); font-family:var(--font-sans); text-align:right; }

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
.sdb-tabs { display:flex; border-bottom:1px solid rgba(201,168,76,.20); margin-bottom:18px; gap:0; }
.sdb-tab {
  display:inline-flex; align-items:center; gap:7px; padding:10px 20px;
  border:none; border-bottom:2.5px solid transparent; margin-bottom:-1px;
  background:transparent; font-family:var(--font-sans); font-size:13px; font-weight:500;
  color:rgba(255,220,130,.60); cursor:pointer; white-space:nowrap;
  transition:color .15s,border-color .15s;
}
.sdb-tab:hover { color:rgba(255,230,150,.85); }
.sdb-tab.on { font-weight:700; color:#FFE97A; border-bottom-color:var(--gold); }

/* ════════ RESPONSIVE ════════ */
@media (max-width:1280px) { .sdb-stats-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:1024px) { .sdb-content { padding:22px 20px; } }
@media (max-width:768px) {
  .sdb-sidebar {
    transform:translateX(-100%);
    transition:transform .30s cubic-bezier(.4,0,.2,1),width .30s;
    z-index:300; width:var(--sidebar-w) !important;
  }
  .sdb-sidebar.mob-open { transform:translateX(0); }
  .sdb-mob-overlay { display:block; }
  .sdb-main,.sdb-main.collapsed { margin-left:0 !important; }
  .sdb-hamburger { display:flex !important; }
  .sdb-collapse-btn { display:none !important; }
  .sdb-profile-name,.sdb-profile-role { display:none; }
  .sdb-profile-chip { padding:5px; gap:0; }
  .sdb-stats-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
  .sdb-content { padding:14px 14px 28px; }
  .sdb-topbar { padding:0 14px; }
  .sdb-topbar-title { font-size:18px; }
  .sdb-book-grid { grid-template-columns:repeat(2,1fr) !important; }
  .sdb-form-row { grid-template-columns:1fr; }
}
@media (max-width:480px) {
  .sdb-stats-grid { grid-template-columns:1fr; }
  .sdb-book-grid  { grid-template-columns:repeat(2,1fr) !important; }
  .sdb-content { padding:10px 10px 24px; }
  .sdb-topbar-title { font-size:16px; }
}
@media (max-width:360px) {
  .sdb-book-grid { grid-template-columns:1fr !important; }
}
`;

/* ═══════════════════════════════════════════════
   NAVIGATION CONFIG
═══════════════════════════════════════════════ */
const NAV = [
  { id:'home',      label:'Dashboard',         icon:'dashboard' },
  { id:'catalog',   label:'Browse Catalog',    icon:'catalog'   },
  { id:'borrowed',  label:'My Borrowed Books', icon:'borrowed'  },
  { id:'favorites', label:'Favorites',         icon:'heart'     },
  { id:'history',   label:'Borrowing History', icon:'history'   },
  { id:'profile',   label:'Profile',           icon:'profile'   },
  { id:'settings',  label:'Settings',          icon:'settings'  },
];

const PAGE_TITLES = {
  home:'Student Dashboard', catalog:'Browse Catalog',
  borrowed:'My Borrowed Books', favorites:'Favorites',
  history:'Borrowing History', profile:'My Profile', settings:'Settings',
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
};

/* ═══════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════ */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
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

/* Status badge config */
function statusCfg(status) {
  const map = {
    active:   { label:'Active',    color:'#81c784', bg:'rgba(76,175,80,.15)',   border:'rgba(76,175,80,.30)'   },
    returned: { label:'Returned',  color:'#64b5f6', bg:'rgba(66,165,245,.15)',  border:'rgba(66,165,245,.30)'  },
    pending:  { label:'Pending',   color:'#C9A84C', bg:'rgba(201,168,76,.14)',  border:'rgba(201,168,76,.30)'  },
    approved: { label:'Approved',  color:'#81c784', bg:'rgba(76,175,80,.15)',   border:'rgba(76,175,80,.30)'   },
    rejected: { label:'Rejected',  color:'#ef9a9a', bg:'rgba(239,154,154,.13)', border:'rgba(239,154,154,.28)' },
    overdue:  { label:'Overdue',   color:'#ef9a9a', bg:'rgba(239,154,154,.13)', border:'rgba(239,154,154,.28)' },
    due_soon: { label:'Due Soon',  color:'#ffb74d', bg:'rgba(255,152,0,.13)',   border:'rgba(255,152,0,.28)'   },
  };
  return map[status?.toLowerCase()] || { label:status||'Unknown', color:'rgba(255,230,150,.55)', bg:'rgba(0,0,0,.08)', border:'rgba(0,0,0,.15)' };
}
function dueStatusCfg(dueDate) {
  if (!dueDate) return statusCfg('active');
  const d = daysUntil(dueDate);
  if (d < 0)  return statusCfg('overdue');
  if (d <= 3) return statusCfg('due_soon');
  return statusCfg('active');
}
function availCfg(copies) {
  const n = copies ?? 1;
  if (n > 0) return { label:'Available',   color:'#81c784', bg:'rgba(76,175,80,.15)',   border:'rgba(76,175,80,.30)'  };
  return          { label:'Unavailable', color:'#ef9a9a', bg:'rgba(239,154,154,.13)', border:'rgba(239,154,154,.28)' };
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

/* Loading spinner */
function Spinner() {
  return <div className="sdb-loading"><div className="sdb-spinner" /><span style={{ color:'rgba(255,230,150,.55)', fontSize:13 }}>Loading…</span></div>;
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

/* ═══════════════════════════════════════════════════════
   PAGE: DASHBOARD HOME
═══════════════════════════════════════════════════════ */
function PageHome({ user, profile, onNavigate }) {
  const [stats,  setStats]  = useState({ borrowed:0, returned:0, available:0, favorites:0 });
  const [acts,   setActs]   = useState([]);
  const [loadSt, setLoadSt] = useState(true);
  const [loadAc, setLoadAc] = useState(true);

  const firstName = profile?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Student';
  const lastName  = profile?.last_name  || user?.user_metadata?.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const course    = profile?.course     || '';
  const year      = profile?.year_level || '';
  const initials  = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'S';

  useEffect(() => {
    if (!user?.id) { setLoadSt(false); setLoadAc(false); return; }
    (async () => {
      try {
        const [a, b, c, d] = await Promise.all([
          supabase.from('borrow_requests').select('id',{count:'exact',head:true}).eq('student_id',user.id).in('status',['active','approved']),
          supabase.from('borrow_requests').select('id',{count:'exact',head:true}).eq('student_id',user.id).eq('status','returned'),
          supabase.from('books').select('id',{count:'exact',head:true}).gt('available_copies',0),
          supabase.from('student_favorites').select('id',{count:'exact',head:true}).eq('student_id',user.id),
        ]);
        setStats({ borrowed:a.count||0, returned:b.count||0, available:c.count||0, favorites:d.count||0 });
      } catch(e){ console.error('[Home stats]',e); } finally { setLoadSt(false); }

      try {
        const { data } = await supabase.from('borrow_requests')
          .select('id,book_title,status,created_at,updated_at')
          .eq('student_id',user.id)
          .order('updated_at',{ascending:false,nullsFirst:false}).limit(8);
        setActs(data || []);
      } catch(e){ console.error('[Home acts]',e); } finally { setLoadAc(false); }
    })();
  }, [user?.id]);

  const actIcon = (s) => {
    if (s==='returned') return { color:'#64b5f6', dot:'#64b5f6', label:'Returned',  icon:Ic.return };
    if (s==='active')   return { color:'#C9A84C', dot:'#C9A84C', label:'Borrowed',  icon:Ic.book   };
    if (s==='approved') return { color:'#81c784', dot:'#81c784', label:'Approved',  icon:Ic.check  };
    if (s==='rejected') return { color:'#ef9a9a', dot:'#ef9a9a', label:'Rejected',  icon:Ic.close  };
    return                     { color:'#C9A84C', dot:'#C9A84C', label:'Pending',   icon:Ic.clock  };
  };

  const StatCard = ({ icon, label, value, loading }) => (
    <div className="sdb-stat-card">
      <div className="sdb-stat-icon">{icon}</div>
      <div className="sdb-stat-label">{label}</div>
      <div className="sdb-stat-value">{loading ? '—' : value}</div>
    </div>
  );

  return (
    <div className="sdb-module">
      {/* Welcome */}
      <div className="sdb-welcome-card">
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', border:'2.5px solid rgba(201,168,76,.60)', overflow:'hidden', background:'linear-gradient(135deg,#8B0000,#5A0000)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 14px rgba(0,0,0,.45)' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="av" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none';}} />
              : <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'#F5E4A8' }}>{initials}</span>
            }
          </div>
          <div>
            <div style={{ fontSize:10, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(201,168,76,.65)', fontFamily:'var(--font-display)', marginBottom:4 }}>Welcome back</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:'#FFE97A', letterSpacing:'.04em' }}>{fullName || 'Student'}</div>
            <div style={{ fontFamily:'var(--font-sans)', fontSize:12.5, color:'rgba(255,225,140,.60)', marginTop:2 }}>
              {[course, year].filter(Boolean).join(' • ') || 'PSU Library Member'}
            </div>
          </div>
        </div>
        <button className="sdb-btn sdb-btn-ghost" onClick={() => onNavigate('catalog')} style={{ fontSize:12.5 }}>
          {Ic.catalog}&nbsp; Browse Catalog
        </button>
      </div>

      {/* Stats */}
      <div className="sdb-stats-grid">
        <StatCard icon={Ic.book}    label="Books Borrowed"  value={stats.borrowed}  loading={loadSt} />
        <StatCard icon={Ic.check}   label="Books Returned"  value={stats.returned}  loading={loadSt} />
        <StatCard icon={Ic.catalog} label="Available Now"   value={stats.available} loading={loadSt} />
        <StatCard icon={Ic.heart}   label="Favorites Saved" value={stats.favorites} loading={loadSt} />
      </div>

      {/* Recent Activity */}
      <div className="sdb-panel">
        <div className="sdb-panel-hdr">
          <span>Recent Activity</span>
          <button className="sdb-btn sdb-btn-ghost" style={{ fontSize:11, padding:'5px 12px' }} onClick={() => onNavigate('history')}>View All</button>
        </div>
        {loadAc ? <Spinner /> : acts.length === 0 ? (
          <div className="sdb-empty">
            <div className="sdb-empty-icon">📚</div>
            <div className="sdb-empty-text">No activity yet</div>
            <div className="sdb-empty-sub">Start browsing the catalog to borrow books.</div>
            <div style={{ marginTop:16 }}>
              <button className="sdb-btn sdb-btn-primary" style={{ fontSize:12 }} onClick={() => onNavigate('catalog')}>Browse Books</button>
            </div>
          </div>
        ) : acts.map(a => {
          const c = actIcon(a.status);
          return (
            <div key={a.id} className="sdb-activity-item">
              <span className="sdb-activity-dot" style={{ color:c.dot, background:c.dot }} />
              <div className="sdb-activity-text">
                <span style={{ color:'rgba(255,230,150,.70)', fontSize:10, marginRight:6 }}>{c.label}</span>
                {a.book_title || 'Book'}
              </div>
              <span className="sdb-activity-time">{relAgo(a.updated_at||a.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: BROWSE CATALOG
═══════════════════════════════════════════════════════ */
function PageCatalog({ user }) {
  const [books,     setBooks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [catF,      setCatF]      = useState('');
  const [availF,    setAvailF]    = useState('');
  const [favIds,    setFavIds]    = useState(new Set());
  const [selected,  setSelected]  = useState(null);
  const [borrowMd,  setBorrowMd]  = useState(null);
  const [busy,      setBusy]      = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('books').select('*').order('title');
        if (error) throw error;
        setBooks(data || []);
        if (user?.id) {
          const { data:fv } = await supabase.from('student_favorites').select('book_id').eq('student_id',user.id);
          setFavIds(new Set((fv||[]).map(f=>f.book_id)));
        }
      } catch(e){ console.error('[Catalog]',e); show('Could not load books.',true); }
      finally { setLoading(false); }
    })();
  }, [user?.id]); // eslint-disable-line

  const categories = [...new Set(books.map(b=>b.category||b.genre).filter(Boolean))].sort();

  const filtered = books.filter(b => {
    const q  = search.toLowerCase();
    const ok = !q || [b.title,b.author,b.authors,b.isbn].some(v=>(v||'').toLowerCase().includes(q));
    const cat = b.category || b.genre || '';
    return ok && (!catF||cat===catF) && (!availF||(availF==='available'?(b.available_copies??1)>0:(b.available_copies??1)<=0));
  });

  const toggleFav = async (e, bookId) => {
    e && e.stopPropagation();
    if (!user?.id) { show('Please log in.',true); return; }
    if (favIds.has(bookId)) {
      await supabase.from('student_favorites').delete().eq('student_id',user.id).eq('book_id',bookId);
      setFavIds(p=>{ const n=new Set(p); n.delete(bookId); return n; });
      show('Removed from favorites.');
    } else {
      await supabase.from('student_favorites').insert({ student_id:user.id, book_id:bookId });
      setFavIds(p=>new Set([...p,bookId]));
      show('Added to favorites ♥');
    }
  };

  const handleBorrow = async () => {
    if (!borrowMd||!user?.id) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('borrow_requests').insert({
        student_id:   user.id,
        book_id:      borrowMd.id,
        book_title:   borrowMd.title,
        student_name: [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ') || user.email,
        status:       'pending',
        created_at:   new Date().toISOString(),
      });
      if (error) throw error;
      show('Borrow request submitted! Await librarian approval.');
      setBorrowMd(null); setSelected(null);
    } catch(e){ console.error('[Borrow]',e); show('Could not submit request.',true); }
    finally { setBusy(false); }
  };

  return (
    <div className="sdb-module">
      {/* Filters */}
      <div className="sdb-filters">
        <div className="sdb-search-wrap">
          <span className="sdb-search-icon">{Ic.search}</span>
          <input className="sdb-input" style={{ paddingLeft:36 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title, author, or ISBN…" />
        </div>
        <select className="sdb-select" value={catF} onChange={e=>setCatF(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="sdb-select" value={availF} onChange={e=>setAvailF(e.target.value)}>
          <option value="">All Availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        {(search||catF||availF) && <button className="sdb-btn sdb-btn-ghost" style={{ fontSize:12,padding:'8px 14px' }} onClick={()=>{setSearch('');setCatF('');setAvailF('');}}>Clear</button>}
        <div className="sdb-count">{loading?'Loading…':`${filtered.length} book${filtered.length!==1?'s':''}`}</div>
      </div>

      {/* Book grid */}
      {loading ? (
        <div className="sdb-book-grid">
          {Array.from({length:8}).map((_,i)=>(
            <div key={i} className="sdb-skeleton" style={{ height:280, borderRadius:'var(--radius-lg)' }} />
          ))}
        </div>
      ) : filtered.length===0 ? (
        <div className="sdb-empty"><div className="sdb-empty-icon">🔍</div><div className="sdb-empty-text">No books found</div><div className="sdb-empty-sub">Try different keywords or clear the filters.</div></div>
      ) : (
        <div className="sdb-book-grid">
          {filtered.map(book=>{
            const isFav = favIds.has(book.id);
            const copies = book.available_copies ?? book.copies ?? 1;
            const ab = availCfg(copies);
            return (
              <div key={book.id} className="sdb-book-card" onClick={()=>setSelected(book)}>
                <div className="sdb-book-cover-area">
                  <BookCover src={book.cover_image_url||book.cover_url} title={book.title} width="100%" height={120} />
                  <button className="sdb-fav-btn" style={{ color:isFav?'#C9A84C':'rgba(201,168,76,.55)' }}
                    onClick={e=>toggleFav(e,book.id)} title={isFav?'Remove from favorites':'Add to favorites'}>
                    {isFav ? Ic.heartFill : Ic.heart}
                  </button>
                </div>
                <div className="sdb-book-body">
                  <div className="sdb-book-title">{book.title}</div>
                  <div className="sdb-book-author">{book.author||book.authors}</div>
                  {(book.category||book.genre)&&<span className="sdb-book-genre">{book.category||book.genre}</span>}
                  <div style={{ marginTop:8 }}><Badge {...ab} /></div>
                  <div className="sdb-book-actions">
                    <button className="sdb-btn sdb-btn-primary" style={{ flex:1,fontSize:11,padding:'6px 10px' }} onClick={e=>{e.stopPropagation();setSelected(book);}}>View Details</button>
                    <button className="sdb-tbl-btn sdb-tbl-edit" style={{ padding:'6px 9px' }} onClick={e=>toggleFav(e,book.id)} title={isFav?'Saved':'Save'}>
                      {isFav ? Ic.heartFill : Ic.heart}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Book detail modal */}
      {selected && (
        <Modal maxWidth={800} onClose={()=>setSelected(null)}>
          <div className="sdb-modal-hdr">
            <div><div className="sdb-modal-title">Book Details</div><div className="sdb-modal-sub">{selected.category||selected.genre||'Library Catalog'}</div></div>
            <button className="sdb-modal-close" onClick={()=>setSelected(null)}>{Ic.close}</button>
          </div>
          <div className="sdb-modal-body" style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {/* Left */}
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12,flexShrink:0 }}>
              <BookCover src={selected.cover_image_url||selected.cover_url} title={selected.title} width={120} height={170} />
              <Badge {...availCfg(selected.available_copies??selected.copies??1)} />
              <div style={{ display:'flex', gap:2 }}>{[1,2,3,4,5].map(s=><span key={s}>{s<=(selected.rating||4)?Ic.star:Ic.starOff}</span>)}</div>
              <div style={{ fontFamily:'var(--font-sans)', fontSize:11.5, color:'var(--text-muted)', textAlign:'center' }}>
                {selected.available_copies??selected.copies??1} cop{(selected.available_copies??selected.copies??1)===1?'y':'ies'} available
              </div>
            </div>
            {/* Right */}
            <div style={{ flex:1, minWidth:200 }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:700, color:'var(--text-primary)', letterSpacing:'.03em', margin:'0 0 5px' }}>{selected.title}</h2>
              <div style={{ fontFamily:'var(--font-sans)', fontSize:14, color:'var(--text-secondary)', marginBottom:18 }}>by {selected.author||selected.authors||'—'}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px 22px', marginBottom:18 }}>
                {[['ISBN',selected.isbn],['Publisher',selected.publisher],['Published',selected.year||selected.publication_year],['Category',selected.category||selected.genre],['Language',selected.language||'English'],['Pages',selected.pages],['Edition',selected.edition],['Location',selected.shelf_location]].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', color:'var(--text-dim)', marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {(selected.abstract_text||selected.description) && (
                <div style={{ borderTop:'1px solid rgba(139,0,0,.12)', paddingTop:14, marginBottom:18 }}>
                  <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', color:'var(--text-dim)', marginBottom:8 }}>
                    {selected.abstract_text?'Abstract':'Description'}
                  </div>
                  <p style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-secondary)', lineHeight:1.75, margin:0 }}>{selected.abstract_text||selected.description}</p>
                </div>
              )}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button className="sdb-btn sdb-btn-primary" disabled={(selected.available_copies??selected.copies??1)<=0} onClick={()=>setBorrowMd(selected)}>
                  {Ic.book}&nbsp; Borrow Book
                </button>
                <button className="sdb-btn sdb-btn-ghost" onClick={e=>toggleFav(e,selected.id)}>
                  {favIds.has(selected.id)?Ic.heartFill:Ic.heart}&nbsp;{favIds.has(selected.id)?'Saved':'Add to Favorites'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Borrow confirm */}
      {borrowMd && (
        <Modal maxWidth={440} onClose={()=>{if(!busy)setBorrowMd(null);}}>
          <div className="sdb-modal-hdr">
            <div><div className="sdb-modal-title">Confirm Borrow Request</div><div className="sdb-modal-sub">Submit request to the librarian</div></div>
            <button className="sdb-modal-close" onClick={()=>{if(!busy)setBorrowMd(null);}}>{Ic.close}</button>
          </div>
          <div className="sdb-modal-body">
            <div style={{ display:'flex', gap:14, alignItems:'center', background:'rgba(139,0,0,.07)', border:'1px solid rgba(139,0,0,.16)', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
              <BookCover src={borrowMd.cover_image_url||borrowMd.cover_url} title={borrowMd.title} width={52} height={72} />
              <div>
                <div style={{ fontFamily:'var(--font-sans)', fontWeight:600, fontSize:14, color:'var(--text-primary)' }}>{borrowMd.title}</div>
                <div style={{ fontFamily:'var(--font-sans)', fontSize:12.5, color:'var(--text-muted)', marginTop:2 }}>by {borrowMd.author||borrowMd.authors||'—'}</div>
                <div style={{ marginTop:7 }}><Badge {...availCfg(borrowMd.available_copies??borrowMd.copies??1)} /></div>
              </div>
            </div>
            <p style={{ fontFamily:'var(--font-sans)', fontSize:12.5, color:'var(--text-muted)', marginBottom:22, lineHeight:1.65 }}>
              Your request will be reviewed by the librarian. You will be notified once approved.
            </p>
          </div>
          <div className="sdb-modal-foot">
            <button className="sdb-btn sdb-btn-ghost" onClick={()=>{if(!busy)setBorrowMd(null);}} disabled={busy}>Cancel</button>
            <button className="sdb-btn sdb-btn-primary" onClick={handleBorrow} disabled={busy}>{busy?'Submitting…':'Submit Request'}</button>
          </div>
        </Modal>
      )}

      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: MY BORROWED BOOKS
═══════════════════════════════════════════════════════ */
function PageBorrowed({ user }) {
  const [books,   setBooks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [renewing,setRenew]   = useState(null);
  const { toast, show } = useToast();

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('borrow_requests')
          .select('*').eq('student_id',user.id)
          .in('status',['active','approved','pending'])
          .order('created_at',{ascending:false});
        if (error) throw error;
        setBooks(data||[]);
      } catch(e){ console.error('[Borrowed]',e); show('Could not load borrowed books.',true); }
      finally { setLoading(false); }
    })();
  }, [user?.id]); // eslint-disable-line

  const renew = async (id) => {
    setRenew(id);
    try {
      const { error } = await supabase.from('borrow_requests')
        .update({ renew_requested:true, renew_requested_at:new Date().toISOString() }).eq('id',id);
      if (error) throw error;
      show('Renewal request submitted!');
      setBooks(prev=>prev.map(b=>b.id===id?{...b,renew_requested:true}:b));
    } catch(e){ console.error('[Renew]',e); show('Could not submit renewal.',true); }
    finally { setRenew(null); }
  };

  return (
    <div className="sdb-module">
      <div className="sdb-module-header">
        <div>
          <div className="sdb-module-title">My Borrowed Books</div>
          <div className="sdb-module-sub">{books.length} active loan{books.length!==1?'s':''}</div>
        </div>
      </div>

      {loading ? <Spinner /> : books.length===0 ? (
        <div className="sdb-panel"><div className="sdb-empty"><div className="sdb-empty-icon">📖</div><div className="sdb-empty-text">No active loans</div><div className="sdb-empty-sub">You have no currently borrowed books.</div></div></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {books.map(bk => {
            const due   = bk.due_date ? daysUntil(bk.due_date) : null;
            const dSt   = dueStatusCfg(bk.due_date);
            const rSt   = statusCfg(bk.status);
            return (
              <div key={bk.id} className="sdb-panel" style={{ padding:'18px 20px' }}>
                <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                  <BookCover src={bk.cover_image_url||bk.cover_url} title={bk.book_title} width={52} height={72} />
                  <div style={{ flex:1, minWidth:180 }}>
                    <div style={{ fontFamily:'var(--font-sans)', fontWeight:600, fontSize:14, color:'rgba(255,232,160,.90)', marginBottom:5 }}>
                      {bk.book_title||'Book'}
                    </div>
                    <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-sans)', fontSize:11.5, color:'rgba(255,220,130,.55)' }}>
                        Requested: <span style={{ color:'rgba(255,230,150,.78)' }}>{fmtDate(bk.created_at)}</span>
                      </span>
                      {bk.due_date && (
                        <span style={{ fontFamily:'var(--font-sans)', fontSize:11.5, color:'rgba(255,220,130,.55)' }}>
                          Due: <span style={{ color:due<0?'#ef9a9a':due<=3?'#ffb74d':'rgba(255,230,150,.78)', fontWeight:600 }}>{fmtDate(bk.due_date)}</span>
                        </span>
                      )}
                    </div>
                    {due!==null && due<0 && <div style={{ fontFamily:'var(--font-sans)', fontSize:11, color:'#ef9a9a', marginTop:4, fontWeight:600 }}>{Math.abs(due)} day{Math.abs(due)!==1?'s':''} overdue — please return immediately.</div>}
                    {due!==null && due>=0 && due<=3 && <div style={{ fontFamily:'var(--font-sans)', fontSize:11, color:'#ffb74d', marginTop:4, fontWeight:600 }}>Due in {due} day{due!==1?'s':''}.</div>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <Badge {...rSt} />
                    {bk.due_date && <Badge {...dSt} />}
                    {bk.status==='active' && (
                      <button className="sdb-tbl-btn sdb-tbl-edit" onClick={()=>renew(bk.id)}
                        disabled={renewing===bk.id||bk.renew_requested}>
                        {Ic.return}&nbsp;{renewing===bk.id?'Sending…':bk.renew_requested?'Sent':'Renew'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: FAVORITES
═══════════════════════════════════════════════════════ */
function PageFavorites({ user, onNavigate }) {
  const [books,    setBooks]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('student_favorites')
        .select('book_id,books(*)').eq('student_id',user.id);
      if (error) throw error;
      setBooks((data||[]).map(r=>r.books).filter(Boolean));
    } catch(e){ console.error('[Favorites]',e); show('Could not load favorites.',true); }
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
    } catch(e){ console.error('[Fav remove]',e); show('Could not remove.',true); }
  };

  return (
    <div className="sdb-module">
      <div className="sdb-module-header">
        <div>
          <div className="sdb-module-title">Favorites</div>
          <div className="sdb-module-sub">{books.length} saved book{books.length!==1?'s':''}</div>
        </div>
      </div>

      {loading ? (
        <div className="sdb-book-grid">{Array.from({length:6}).map((_,i)=><div key={i} className="sdb-skeleton" style={{ height:280, borderRadius:'var(--radius-lg)' }}/>)}</div>
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
        <div className="sdb-book-grid">
          {books.map(book=>{
            const copies = book.available_copies??book.copies??1;
            return (
              <div key={book.id} className="sdb-book-card" onClick={()=>setSelected(book)}>
                <div className="sdb-book-cover-area">
                  <BookCover src={book.cover_image_url||book.cover_url} title={book.title} width="100%" height={120} />
                  <button className="sdb-fav-btn" style={{ color:'#ef9a9a' }} onClick={e=>{e.stopPropagation();removeFav(book.id);}} title="Remove">
                    {Ic.trash}
                  </button>
                </div>
                <div className="sdb-book-body">
                  <div className="sdb-book-title">{book.title}</div>
                  <div className="sdb-book-author">{book.author||book.authors}</div>
                  {(book.category||book.genre)&&<span className="sdb-book-genre">{book.category||book.genre}</span>}
                  <div style={{ marginTop:8 }}><Badge {...availCfg(copies)} /></div>
                  <div className="sdb-book-actions">
                    <button className="sdb-btn sdb-btn-primary" style={{ flex:1,fontSize:11,padding:'6px 10px' }} onClick={e=>{e.stopPropagation();setSelected(book);}}>View Details</button>
                    <button className="sdb-tbl-btn sdb-tbl-del" style={{ padding:'6px 9px' }} onClick={e=>{e.stopPropagation();removeFav(book.id);}}>{Ic.trash}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              {(selected.abstract_text||selected.description)&&<p style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-secondary)', lineHeight:1.75, marginBottom:18 }}>{(selected.abstract_text||selected.description||'').slice(0,320)}{(selected.abstract_text||selected.description||'').length>320?'…':''}</p>}
              <button className="sdb-btn sdb-btn-danger" onClick={()=>removeFav(selected.id)}>{Ic.trash}&nbsp; Remove Favorite</button>
            </div>
          </div>
        </Modal>
      )}
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
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
        setRows(data||[]);
      } catch(e){ console.error('[History]',e); show('Could not load history.',true); }
      finally { setLoading(false); }
    })();
  }, [user?.id]); // eslint-disable-line

  const filtered = rows.filter(r=>{
    const q = search.toLowerCase();
    return (!q||(r.book_title||'').toLowerCase().includes(q)) && (!statusF||r.status===statusF);
  });

  return (
    <div className="sdb-module">
      <div className="sdb-module-header">
        <div>
          <div className="sdb-module-title">Borrowing History</div>
          <div className="sdb-module-sub">{rows.length} total record{rows.length!==1?'s':''}</div>
        </div>
      </div>

      <div className="sdb-filters">
        <div className="sdb-search-wrap">
          <span className="sdb-search-icon">{Ic.search}</span>
          <input className="sdb-input" style={{ paddingLeft:36 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by book title…" />
        </div>
        <select className="sdb-select" value={statusF} onChange={e=>setStatusF(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending','approved','active','returned','rejected'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        {(search||statusF)&&<button className="sdb-btn sdb-btn-ghost" style={{ fontSize:12,padding:'7px 14px' }} onClick={()=>{setSearch('');setStatusF('');}}>Clear</button>}
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
              <tr><td colSpan={4} style={{ textAlign:'center', padding:50, color:'rgba(255,220,130,.45)', fontFamily:'var(--font-sans)' }}>
                {rows.length===0?'No borrowing history yet.':'No records match your filters.'}
              </td></tr>
            ) : filtered.map(r=>(
              <tr key={r.id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <BookCover src={r.cover_image_url||r.cover_url} title={r.book_title} width={36} height={50} />
                    <span style={{ fontFamily:'var(--font-sans)', fontWeight:500 }}>{r.book_title||'—'}</span>
                  </div>
                </td>
                <td style={{ fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>{fmtDate(r.created_at)}</td>
                <td style={{ fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>{r.return_date?fmtDate(r.return_date):r.due_date?fmtDate(r.due_date):'—'}</td>
                <td><Badge {...statusCfg(r.status)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
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

  const [form, setForm] = useState({
    first_name: profile?.first_name || user?.user_metadata?.first_name || '',
    last_name:  profile?.last_name  || user?.user_metadata?.last_name  || '',
    student_id: profile?.student_id || '',
    course:     profile?.course     || '',
    year_level: profile?.year_level || '',
    email:      user?.email         || '',
    phone:      profile?.phone      || '',
  });

  useEffect(() => {
    setForm({
      first_name: profile?.first_name || user?.user_metadata?.first_name || '',
      last_name:  profile?.last_name  || user?.user_metadata?.last_name  || '',
      student_id: profile?.student_id || '',
      course:     profile?.course     || '',
      year_level: profile?.year_level || '',
      email:      user?.email         || '',
      phone:      profile?.phone      || '',
    });
  }, [profile, user]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const displayName = `${form.first_name} ${form.last_name}`.trim() || 'Student';
  const initials    = [form.first_name[0],form.last_name[0]].filter(Boolean).join('').toUpperCase()||'S';
  const avatarUrl   = profile?.avatar_url||null;

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
      const payload = { id:user.id, first_name:form.first_name, last_name:form.last_name, student_id:form.student_id, course:form.course, year_level:form.year_level, phone:form.phone, updated_at:new Date().toISOString() };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate({...profile,...payload});
      setEditing(false);
      show('Profile updated successfully!');
    } catch(e){ console.error('[Profile save]',e); show('Could not save profile.',true); }
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
            <div style={{ fontFamily:'var(--font-display)',fontSize:19,fontWeight:700,color:'#FFE97A',letterSpacing:'.04em' }}>{displayName}</div>
            <div style={{ fontFamily:'var(--font-sans)',fontSize:12.5,color:'rgba(245,228,168,.55)',marginTop:3 }}>
              {[form.student_id?`ID: ${form.student_id}`:null,form.course,form.year_level].filter(Boolean).join(' • ')}
            </div>
            <div style={{ fontFamily:'var(--font-sans)',fontSize:11.5,color:'rgba(245,228,168,.38)',marginTop:2 }}>{form.email}</div>
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'0 28px', padding:'0 0 6px' }}>
          <Field label="First Name"        fkey="first_name"  />
          <Field label="Last Name"         fkey="last_name"   />
          <Field label="Student ID"        fkey="student_id"  />
          <Field label="Course / Program"  fkey="course"      />
          <Field label="Year Level"        fkey="year_level"  />
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
  const [pwForm,   setPwForm]   = useState({ newPw:'', confirm:'' });
  const [showPw,   setShowPw]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [notif,    setNotif]    = useState({ email:true, due_reminders:true, new_arrivals:false });
  const { toast, show } = useToast();

  const changePw = async () => {
    if (!pwForm.newPw)           { show('Enter a new password.',true); return; }
    if (pwForm.newPw.length < 6) { show('Password must be at least 6 characters.',true); return; }
    if (pwForm.newPw !== pwForm.confirm) { show('Passwords do not match.',true); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password:pwForm.newPw });
      if (error) throw error;
      setPwForm({ newPw:'', confirm:'' });
      show('Password updated successfully!');
    } catch(e){ console.error('[PW]',e); show(e.message||'Could not update password.',true); }
    finally { setPwSaving(false); }
  };

  const Toggle = ({ label, desc, value, onChange }) => (
    <div className="sdb-toggle-row">
      <div>
        <div style={{ fontFamily:'var(--font-sans)',fontSize:13.5,fontWeight:500,color:'rgba(255,232,160,.88)' }}>{label}</div>
        {desc&&<div style={{ fontFamily:'var(--font-sans)',fontSize:12,color:'rgba(255,220,130,.50)',marginTop:2 }}>{desc}</div>}
      </div>
      <button className="sdb-toggle-track"
        style={{ background:value?'linear-gradient(135deg,#8B0000,#5A0000)':'rgba(201,168,76,.15)' }}
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
        <div className="sdb-panel-hdr">{Ic.lock}&nbsp; Change Password</div>
        <div className="sdb-form-row">
          {[['New Password','newPw'],['Confirm Password','confirm']].map(([lbl,key])=>(
            <div key={key} className="sdb-form-group">
              <label className="sdb-label">{lbl}</label>
              <div className="sdb-pw-wrap">
                <input className="sdb-input" type={showPw?'text':'password'}
                  value={pwForm[key]} onChange={e=>setPwForm(f=>({...f,[key]:e.target.value}))}
                  placeholder="••••••••" style={{ paddingRight:36 }} />
                <button className="sdb-pw-toggle" onClick={()=>setShowPw(v=>!v)} type="button">
                  {showPw?Ic.eyeOff:Ic.eyeOn}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="sdb-btn sdb-btn-primary" style={{ fontSize:12.5 }} onClick={changePw} disabled={pwSaving}>
          {Ic.lock}&nbsp;{pwSaving?'Updating…':'Update Password'}
        </button>
      </div>

      {/* Notifications */}
      <div className="sdb-panel" style={{ marginBottom:18 }}>
        <div className="sdb-panel-hdr">{Ic.bell}&nbsp; Notification Preferences</div>
        <Toggle label="Email Notifications"  desc="Receive library updates via email"         value={notif.email}         onChange={v=>setNotif(p=>({...p,email:v}))} />
        <Toggle label="Due Date Reminders"   desc="Get reminded before your books are due"   value={notif.due_reminders} onChange={v=>setNotif(p=>({...p,due_reminders:v}))} />
        <Toggle label="New Arrivals"         desc="Notify me when new books are added"        value={notif.new_arrivals}  onChange={v=>setNotif(p=>({...p,new_arrivals:v}))} />
      </div>

      {/* Privacy */}
      <div className="sdb-panel" style={{ marginBottom:18 }}>
        <div className="sdb-panel-hdr">{Ic.shield}&nbsp; Privacy</div>
        <div style={{ fontFamily:'var(--font-sans)',fontSize:13,color:'rgba(255,220,130,.65)',lineHeight:1.75 }}>
          Your personal information is used exclusively for library management within the PSU Library System and is not shared with third parties.
        </div>
      </div>

      {/* Account */}
      <div className="sdb-panel">
        <div className="sdb-panel-hdr">Account</div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14 }}>
          <div>
            <div style={{ fontFamily:'var(--font-sans)',fontSize:13.5,fontWeight:500,color:'rgba(255,232,160,.88)' }}>Sign Out</div>
            <div style={{ fontFamily:'var(--font-sans)',fontSize:12,color:'rgba(255,220,130,.50)',marginTop:2 }}>{user?.email} — End your current session</div>
          </div>
          <button className="sdb-btn sdb-btn-primary" onClick={onSignOut}>{Ic.logout}&nbsp; Sign Out</button>
        </div>
      </div>
      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════ */
export default function StudentDashboard({ user, onSignOut }) {
  const [activeTab,        setActiveTab]        = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [showLogout,       setShowLogout]        = useState(false);
  const [profile,          setProfile]          = useState(null);

  /* Load profile */
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('*').eq('id',user.id).single()
      .then(({data}) => setProfile(data||null))
      .catch(e => console.warn('[Profile fetch]',e?.message));
  }, [user?.id]);

  const navigate = useCallback((tab) => { setActiveTab(tab); setMobileOpen(false); }, []);

  const firstName   = profile?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Student';
  const lastName    = profile?.last_name  || user?.user_metadata?.last_name  || '';
  const displayName = `${firstName} ${lastName}`.trim();
  const initials    = [firstName[0],lastName[0]].filter(Boolean).join('').toUpperCase()||'S';
  const avatarUrl   = profile?.avatar_url || null;

  const content = () => {
    switch(activeTab) {
      case 'home':      return <PageHome      user={user} profile={profile} onNavigate={navigate} />;
      case 'catalog':   return <PageCatalog   user={user} />;
      case 'borrowed':  return <PageBorrowed  user={user} />;
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

        {/* Mobile overlay */}
        {mobileOpen && <div className="sdb-mob-overlay" onClick={()=>setMobileOpen(false)} />}

        {/* ═══ SIDEBAR ═══ */}
        <aside className={`sdb-sidebar${sidebarCollapsed?' collapsed':''}${mobileOpen?' mob-open':''}`}>

          {/* Logo */}
          <div className="sdb-logo-wrap">
            <div className="sdb-logo-icon">
              <img src="/LibraryLogo.png" alt="LibraScan" onError={e=>{e.target.style.display='none';}} />
            </div>
            <div className="sdb-logo-text">LIBRASCAN</div>
            <div className="sdb-logo-sub">QR Code Based Library Management System</div>
          </div>

          {/* Collapse */}
          <button className="sdb-collapse-btn" onClick={()=>setSidebarCollapsed(v=>!v)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform:sidebarCollapsed?'rotate(180deg)':'none', transition:'transform .32s cubic-bezier(.4,0,.2,1)', flexShrink:0 }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span className="sdb-collapse-label">Collapse</span>
          </button>

          {/* Nav */}
          <nav className="sdb-nav">
            {NAV.map((item,idx) => (
              <div key={item.id}>
                {idx===5 && <div className="sdb-nav-sep" />}
                <button
                  className={`sdb-nav-item${activeTab===item.id?' active':''}`}
                  onClick={()=>navigate(item.id)}
                  data-tip={sidebarCollapsed?item.label:undefined}
                  title={sidebarCollapsed?item.label:undefined}
                >
                  <span className="sdb-nav-icon">{Ic[item.icon]}</span>
                  <span className="sdb-nav-label">{item.label}</span>
                </button>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="sdb-sidebar-footer">
            <button className="sdb-nav-item" onClick={()=>setShowLogout(true)}
              data-tip={sidebarCollapsed?'Sign Out':undefined} title={sidebarCollapsed?'Sign Out':undefined}>
              <span className="sdb-nav-icon">{Ic.logout}</span>
              <span className="sdb-nav-label">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ═══ MAIN ═══ */}
        <div className={`sdb-main${sidebarCollapsed?' collapsed':''}`}>

          {/* Topbar */}
          <header className="sdb-topbar">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button className="sdb-hamburger" onClick={()=>setMobileOpen(v=>!v)}>{Ic.menu}</button>
              <div className="sdb-topbar-left">
                <div className="sdb-topbar-title">{PAGE_TITLES[activeTab]}</div>
                <div className="sdb-breadcrumb">PSU Library System • Student Portal</div>
              </div>
            </div>

            <div className="sdb-topbar-right">
              <div className="sdb-profile-chip" onClick={()=>navigate('profile')} title="My Profile">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="sdb-avatar" style={{ padding:0 }} onError={e=>{e.target.style.display='none';}} />
                  : <div className="sdb-avatar">{initials}</div>
                }
                <div>
                  <div className="sdb-profile-name">{displayName}</div>
                  <div className="sdb-profile-role">Student</div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="sdb-content">{content()}</main>
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