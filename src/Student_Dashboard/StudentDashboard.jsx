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
  display:flex; flex-direction:column; min-height:100vh; width:100%;
  background:var(--bg-base); color:var(--text-primary);
  font-family:var(--font-sans); font-size:14px; line-height:1.5;
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
  font-size:9px; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
  color:rgba(245,228,168,.72); white-space:nowrap;
 
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
  position:absolute; top:calc(100% + 12px); right:0; width:230px;
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
.sdb-main { flex:1; display:flex; flex-direction:column; min-height:0; width:100%; }
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
  display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:18px;
}
/* Book card — matches .lm-book-card */
.sdb-book-card {
  background:linear-gradient(160deg,#FDF6EC 0%,#FAF0E4 100%);
  border:1px solid rgba(139,0,0,.14); border-radius:var(--radius-lg);
  overflow:hidden; cursor:pointer;
  transition:border-color var(--ease),transform var(--ease),box-shadow var(--ease);
  box-shadow:0 2px 8px rgba(80,0,0,.07),0 6px 24px rgba(80,0,0,.05); display:flex; flex-direction:column;
}
.sdb-book-card:hover {
  border-color:rgba(139,0,0,.30); transform:translateY(-6px);
  box-shadow:0 16px 34px rgba(80,0,0,.16);
}
.sdb-book-cover-area {
  height:120px; display:flex; align-items:center; justify-content:center;
  background:linear-gradient(145deg,rgba(122,0,0,.06) 0%,rgba(122,0,0,.12) 100%);
  border-bottom:1px solid rgba(139,0,0,.12); position:relative; overflow:hidden;
}
.sdb-book-cover-area img { height:100%; width:100%; object-fit:cover; transition:transform .28s ease; }
.sdb-book-card:hover .sdb-book-cover-area img { transform:scale(1.06); filter:brightness(1.05); }
.sdb-fav-btn {
  position:absolute; top:7px; right:7px;
  background:rgba(255,255,255,.85); border:1px solid rgba(139,0,0,.18);
  border-radius:8px; padding:5px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .18s; backdrop-filter:blur(4px);
}
.sdb-fav-btn:hover { background:#fff; transform:scale(1.12); }
.sdb-book-body { padding:14px; flex:1; display:flex; flex-direction:column; }
.sdb-book-title {
  font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:3px;
  line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.sdb-book-author { font-size:11px; color:var(--text-muted); margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sdb-book-genre {
  display:inline-block; padding:2px 9px; border-radius:12px;
  font-size:10px; font-family:var(--font-sans);
  background:rgba(122,0,0,.07); color:var(--maroon); border:1px solid rgba(122,0,0,.16);
}
.sdb-book-actions { display:flex; gap:6px; margin-top:10px; }

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
.sdb-table-wrap tbody td { padding:12px 16px; font-size:13px; color:var(--text-secondary); vertical-align:middle; }

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

/* ════════ DARK MODE ════════ */
.sdb-shell {
  --dd-bg:#ffffff; --dd-border:rgba(139,0,0,.14); --dd-head-bg:rgba(139,0,0,.04); --dd-hover:rgba(139,0,0,.06);
}
.sdb-shell.sdb-dark {
  --bg-base:#170A0A; --cream:#22100F; --text-primary:#F5E4A8; --text-secondary:#E7D3B0;
  --text-muted:#C7AD8C; --text-dim:rgba(245,228,168,.55);
  --dd-bg:#2A1412; --dd-border:rgba(201,168,76,.22); --dd-head-bg:rgba(201,168,76,.06); --dd-hover:rgba(201,168,76,.10);
}
.sdb-dark .sdb-content { background:var(--bg-base); }
.sdb-dark .sdb-module-title,
.sdb-dark .sdb-profile-banner .sdb-module-title { color:#F5D67A; }
.sdb-dark .sdb-module-sub,
.sdb-dark .sdb-breadcrumb { color:var(--text-muted); }
.sdb-dark .sdb-input,
.sdb-dark .sdb-select {
  background:var(--cream); color:var(--text-primary);
  border-color:rgba(201,168,76,.30);
}
.sdb-dark .sdb-select { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23E7D3B0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); }
.sdb-dark .sdb-input::placeholder { color:var(--text-dim); }
.sdb-dark .sdb-input:focus { background:#2A1412; box-shadow:0 0 0 3px rgba(201,168,76,.14); }
.sdb-dark .sdb-count { background:rgba(201,168,76,.08); border-color:rgba(201,168,76,.18); color:var(--text-muted); }
.sdb-dark .sdb-empty-text { color:#F0C773; }
.sdb-dark .sdb-empty-sub { color:var(--text-muted); }
.sdb-dark .sdb-modal { background:var(--cream); border-color:rgba(201,168,76,.24); }
.sdb-dark .sdb-modal-body { background:var(--cream); }
.sdb-dark .sdb-modal-foot { background:rgba(201,168,76,.05); border-top-color:rgba(201,168,76,.16); }
.sdb-dark .sdb-label { color:var(--text-dim); }
.sdb-dark .sdb-info-row,
.sdb-dark .sdb-form-group div[style*="border-bottom"] { border-color:rgba(201,168,76,.12); }
/* Dark-mode card surfaces (stat cards, panels, book cards, table, welcome hero, profile banner) */
.sdb-dark .sdb-stat-card,
.sdb-dark .sdb-panel,
.sdb-dark .sdb-book-card,
.sdb-dark .sdb-table-wrap,
.sdb-dark .sdb-profile-banner {
  background:linear-gradient(160deg,#2A1412 0%,#22100F 100%);
  border-color:rgba(201,168,76,.22);
  box-shadow:0 4px 18px rgba(0,0,0,.35);
}
.sdb-dark .sdb-welcome-card {
  background:linear-gradient(135deg,#2A1412 0%,#1B0D0C 100%);
  border-color:rgba(201,168,76,.28);
}
.sdb-dark .sdb-stat-label,
.sdb-dark .sdb-stat-sub,
.sdb-dark .sdb-book-author,
.sdb-dark .sdb-activity-time,
.sdb-dark .sdb-info-key { color:var(--text-muted); }
.sdb-dark .sdb-stat-value { color:#F0C773; }
.sdb-dark .sdb-book-title,
.sdb-dark .sdb-activity-text,
.sdb-dark .sdb-info-val,
.sdb-dark .sdb-table-wrap tbody td { color:var(--text-secondary); }
.sdb-dark .sdb-table-wrap thead th { color:#F5E4A8; }
.sdb-dark .sdb-panel-hdr,
.sdb-dark .sdb-tbl-edit,
.sdb-dark .sdb-btn-ghost { color:var(--gold); }
.sdb-dark .sdb-table-wrap tbody tr:hover,
.sdb-dark .sdb-activity-item:hover { background:rgba(201,168,76,.06); }
.sdb-dark .sdb-btn-ghost { border-color:rgba(201,168,76,.38); }
.sdb-dark .sdb-btn-ghost:hover:not(:disabled) { background:rgba(201,168,76,.10); border-color:rgba(201,168,76,.58); color:var(--gold-light); }
.sdb-dark .sdb-tabs { border-bottom-color:rgba(201,168,76,.20); }
.sdb-dark .sdb-tab { color:var(--text-muted); }
.sdb-dark .sdb-tab.on { color:var(--gold); border-bottom-color:var(--gold); }
.sdb-dark .sdb-profile-cover::after { background:linear-gradient(90deg,transparent,rgba(201,168,76,.30),transparent); }
.sdb-dark .sdb-hero-name {  color: transparent; }
.sdb-hero-name--onbanner { color:#F5E4A8 !important; text-shadow:0 1px 3px rgba(0,0,0,.45); }
.sdb-dark .sdb-hero-name--onbanner { color: transparent; }
.sdb-dark .sdb-navbar { border-bottom-color:var(--gold-dim); }
.sdb-dark .sdb-profile-chip { background:rgba(255,255,255,.92); }
.sdb-dark .sdb-dropdown-item.danger { color:#e28a8a; }
.sdb-dark .sdb-dropdown-item.danger svg { color:#e28a8a; }

/* ════════ RESPONSIVE ════════ */
@media (max-width:1280px) { .sdb-stats-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:1024px) {
  .sdb-content { padding:22px 20px; }
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
  .sdb-content { padding:14px 14px 28px; }
  .sdb-navbar { padding:0 14px; }
  .sdb-brand-title { font-size:14px; }
  .sdb-book-grid { grid-template-columns:repeat(2,1fr) !important; }
  .sdb-form-row { grid-template-columns:1fr; }
  .sdb-form-row-3 { grid-template-columns:1fr; }
  .sdb-catalog-hero-title { font-size:22px !important; }
}
@media (max-width:480px) {
  .sdb-stats-grid { grid-template-columns:1fr; }
  .sdb-book-grid  { grid-template-columns:repeat(2,1fr) !important; }
  .sdb-content { padding:10px 10px 24px; }
  .sdb-dropdown { width:200px; }
}
@media (max-width:360px) {
  .sdb-book-grid { grid-template-columns:1fr !important; }
}
`;

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
  moon:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  sun:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
};

/* ═══════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════ */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
}
// Matches BookManagement.jsx's fmtTime/fmtFull exactly, so the timestamps a
// student sees in their History tab always agree with what the librarian
// sees in Book Management → Transaction History for the same borrowing
// (same locale, same 12hr time format).
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

/* ═══════════════════════════════════════════════
   ABSTRACT PARSING
   `books.abstract_text` is stored as a JSON string produced by the OCR
   pipeline (Book Management → upload abstract image), shaped like
   { heading, paragraphs: [...], subheadings: [...], keywords: [...] }.
   It must be parsed before display — rendering it as-is shows the raw
   JSON to the student. Mirrors Book_Catalog.jsx's parseAbstractData /
   mergeFragmentedParagraphs so the same stored data reads identically
   in both the librarian and student views.
═══════════════════════════════════════════════ */
function parseAbstractData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    // Guard against a JSON value that isn't the expected shape (e.g. a
    // plain JSON-encoded string or number) — treat it as plain text.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { heading: '', paragraphs: [String(parsed)], keywords: [] };
    }
    return parsed;
  } catch {
    // Not JSON at all — legacy plain-text abstracts fall back gracefully.
    return { heading: '', paragraphs: [raw], keywords: [] };
  }
}

/**
 * Merges paragraph fragments that were split mid-sentence by OCR.
 * A fragment is considered "incomplete" if it does not end with
 * sentence-terminating punctuation (. ! ? :) — those get joined
 * with the next fragment using a single space.
 */
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

/* Elegant "book page" rendering of a parsed abstract — heading, gold rule,
   justified serif paragraphs with subheadings, and a keyword row. Used
   anywhere a student can view a book's abstract, so it never shows raw
   JSON or an unformatted text blob again. */
function AbstractBlock({ raw, fallbackTitle, authorName, compact = false, maxParagraphs = null }) {
  const data = parseAbstractData(raw);
  if (!data) return null;

  // OCR sometimes picks up a byline/credit line from the scanned page (e.g.
  // "Eloisa M. Macalinao III") as if it were a real paragraph of the
  // abstract. It isn't — it's noise that duplicates the author already
  // shown at the top of the card, so filter fragments that are clearly
  // just the author's name before rendering.
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
          <div style={{
            fontFamily: '"Georgia","Times New Roman",serif',
            fontSize: compact ? 15 : 18, fontWeight: 700, color: '#5A0000',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 8, lineHeight: 1.3,
          }}>
            {data.heading || fallbackTitle}
          </div>
          <div style={{
            width: 44, height: 2, marginBottom: 14,
            background: 'linear-gradient(90deg,#C9A84C,transparent)', borderRadius: 2,
          }} />
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
            fontFamily: '"Georgia","Times New Roman",serif',
            lineHeight: compact ? 1.7 : 1.85, textAlign: 'justify',
            textIndent: '1.6em', margin: '0 0 10px 0',
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

/* Status badge config
   NOTE: 'active' is a legacy status value some older `borrow_requests` rows
   still carry (meaning "borrowed, not yet returned"). We no longer treat it
   as its own state in the UI — normalizeStatus() below folds it into
   'approved' everywhere, so a borrowed-but-not-returned book just reads
   "Approved" like any other approved request. */
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
          // "available_copies" isn't a stored column on books — availability lives on
          // book_copies.status, so count copies currently marked Available instead.
          supabase.from('book_copies').select('copy_id',{count:'exact',head:true}).eq('status','Available'),
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
    if (s==='approved' || s==='active') return { color:'#81c784', dot:'#81c784', label:'Approved',  icon:Ic.check  };
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
            <div style={{ fontSize:12, letterSpacing:'.22em', textTransform:'uppercase', color:'#B8912B', fontFamily:'var(--font-display)', marginBottom:4,textAlign: 'left' }}>Welcome back</div>
            <div className="sdb-hero-name" style={{ fontFamily:'var(--font-display)', fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:'var(--maroon-deep)', letterSpacing:'.04em' }}>{fullName || 'Student'}</div>
            <div style={{ fontFamily:'var(--font-sans)', fontSize:12.5, color:'var(--text-muted)', marginTop:2,textAlign: 'left' }}>
              {[course, year].filter(Boolean).join(' • ') || 'PSU Library Member'}
            </div>
          </div>
        </div>
        <button className="sdb-btn sdb-btn-primary" onClick={() => onNavigate('catalog')} style={{ fontSize:12.5 }}>
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
                <span style={{ color:'var(--maroon)', fontWeight:700, fontSize:10, marginRight:6 }}>{c.label}</span>
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
  const { toast, show } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
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
    <div className="sdb-module">
      {/* Header */}
      <div className="sdb-module-header">
        <div>
          <div className="sdb-module-title sdb-catalog-hero-title" style={{ fontSize:26, textAlign:'left' }}>My Book Catalog</div>
          <div className="sdb-module-sub">Find the book and resources you need, all in one place.</div>
        </div>
      </div>

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
                <div style={{ borderTop:'1px solid rgba(139,0,0,.12)', paddingTop:16 }}>
                  <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', color:'var(--text-dim)', marginBottom:10 }}>
                    {selected.abstract_text?'Abstract':'Description'}
                  </div>
                  {selected.abstract_text ? (
                    <AbstractBlock raw={selected.abstract_text} fallbackTitle={selected.title} authorName={selected.author||selected.authors} />
                  ) : (
                    <p style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-secondary)', lineHeight:1.75, margin:0 }}>{selected.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Footer stays pinned below the scrollable content, so the CTA
              never ends up crammed against the tail end of a long abstract. */}
          <div className="sdb-modal-foot" style={{ justifyContent:'flex-start' }}>
            <button className="sdb-btn sdb-btn-primary" onClick={e=>toggleFav(e,selected.id)}>
              {favIds.has(selected.id)?Ic.heartFill:Ic.heart}&nbsp;{favIds.has(selected.id)?'Saved to Favorites':'Add to Favorites'}
            </button>
          </div>
        </Modal>
      )}

      {toast.msg && <Toast msg={toast.msg} isError={toast.isError} />}
    </div>
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
    <div className="sdb-module">
      <div className="sdb-module-header">
        <div>
          <div className="sdb-module-title">Favorites</div>
         
        </div>
      </div>

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
              <th></th>
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
    <div className="sdb-module">
      <div className="sdb-module-header">
        <div>
          <div className="sdb-module-title">Borrowing History</div>
          
        </div>
      </div>

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

  // Field names below are mapped to the columns that actually exist on
  // `profiles`: first_name, last_name, student_number, program_legacy.
  // There is no `phone` column yet, so it stays local-only (typeable, but
  // not persisted) until that column is added. `campus` is resolved
  // read-only from campus_id (see effect below), and `middle_name` is a
  // real, existing `profiles` column so it's fully editable + saved.
  const [form, setForm] = useState({
    first_name:  profile?.first_name     || user?.user_metadata?.first_name || '',
    middle_name: profile?.middle_name    || user?.user_metadata?.middle_name || '',
    last_name:   profile?.last_name      || user?.user_metadata?.last_name  || '',
    student_id:  profile?.student_number || '',
    course:      profile?.program_legacy || '',
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
      course:      profile?.program_legacy || '',
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
      // student_id -> student_number, course -> program_legacy.
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
        program_legacy:  form.course,
        updated_at:      new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
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
          <Field label="Course / Program"  fkey="course"      />
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
  const [darkMode,    setDarkMode]    = useState(() => {
    try { return localStorage.getItem('sdb-theme') === 'dark'; } catch { return false; }
  });
  const profileMenuRef = useRef(null);

  /* Load profile */
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('*').eq('id',user.id).single()
      .then(({data}) => setProfile(data||null))
      .catch(e => console.warn('[Profile fetch]',e?.message));
  }, [user?.id]);

  /* Persist theme choice */
  useEffect(() => {
    try { localStorage.setItem('sdb-theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  /* Close the profile dropdown on outside click / Escape */
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e) => { if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileOpen(false); };
    const onEsc   = (e) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onEsc); };
  }, [profileOpen]);

  const navigate = useCallback((tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
    setProfileOpen(false);
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
      case 'catalog':   return <PageCatalog   user={user} />;
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
      <div className={`sdb-shell${darkMode?' sdb-dark':''}`}>

        {/* ═══ TOP NAVBAR ═══ */}
        <header className="sdb-navbar">
          <div className="sdb-brand">
            <div className="sdb-brand-logo">
              <img src="/LibraryLogo.png" alt="LibraScan" onError={e=>{e.target.style.display='none';}} />
            </div>
            <div className="sdb-brand-text">
              <div className="sdb-brand-title">LIBRASCAN</div>
              <div className="sdb-brand-sub"> Pampanga State University</div>
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
            <button className="sdb-bell-btn" onClick={()=>navigate('history')} title="Notifications">
              {Ic.bell}
              <span className="sdb-bell-dot" />
            </button>

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
                  <div className="sdb-dropdown-user">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="sdb-avatar" style={{ padding:0 }} onError={e=>{e.target.style.display='none';}} />
                      : <div className="sdb-avatar">{initials}</div>
                    }
                    <div>
                      <div className="sdb-dropdown-user-name">{displayName}</div>
                      <div className="sdb-dropdown-user-role">Student</div>
                    </div>
                  </div>

                  {PROFILE_MENU.map(item => (
                    <button key={item.id} className="sdb-dropdown-item" onClick={()=>navigate(item.id)}>
                      {Ic[item.icon]} {item.label}
                    </button>
                  ))}

                  <div className="sdb-dropdown-toggle-wrap">
                    <span className="sdb-dropdown-toggle-label">{darkMode?Ic.moon:Ic.sun} Dark Mode</span>
                    <button className="sdb-toggle-track" type="button"
                      style={{ background:darkMode?'linear-gradient(135deg,#8B0000,#5A0000)':'rgba(139,0,0,.18)' }}
                      onClick={()=>setDarkMode(v=>!v)} title="Toggle dark mode">
                      <div className="sdb-toggle-thumb" style={{ left:darkMode?22:3 }} />
                    </button>
                  </div>

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