// src/Dashboard/Reports_Analytics.jsx
// LibraScan — Reports & Analytics v3 (schema-accurate)
//
// Tables used (exact column names verified against BorrowRequests.jsx,
// AttendanceMonitoring.jsx, UserManagement.jsx, BookManagement.jsx):
//
//  borrow_requests : id, student_id, student_number, student_name, student_program,
//                    student_email, book_id, book_title, copy_label, status,
//                    created_at
//                    status values: 'pending' | 'approved' | 'rejected'
//
//  borrowings      : id, student_id, student_number, student_name, student_program,
//                    student_email, book_id, book_title, copy_label, status,
//                    borrowed_at, returned_at, date
//                    status values: 'Borrowed' | 'Returned'
//
//  books           : id, title, genre, available_copies, copies,
//                    cover_image_url, status
//
//  book_copies     : copy_id, book_id, status  ('Available' | 'Borrowed' …)
//
//  attendance_logs : id, id_no, full_name, program, time_in, date, status
//
//  profiles        : id, role, first_name, last_name, username, email, …
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const RA_STYLES = `
  @keyframes ra-fade-in  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ra-bar-grow { from{width:0} to{width:var(--bw,0%)} }
  @keyframes ra-spin     { to{transform:rotate(360deg)} }
  @keyframes ra-shimmer  { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  @keyframes ra-count    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ra-pop      { from{opacity:0;transform:scale(.90)} to{opacity:1;transform:scale(1)} }

  .ra-root { animation:ra-fade-in .38s ease both; }

  .ra-two-col   { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px; }
  .ra-three-col { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:20px; }
  .ra-full { margin-bottom:20px; }

  .ra-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
  .ra-sh-title { font-family:var(--font-display); font-size:12.5px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--maroon-deep); display:flex; align-items:center; gap:8px; }
  .ra-sh-title::before { content:''; width:3px; height:13px; border-radius:2px; flex-shrink:0; background:linear-gradient(180deg,var(--maroon-light),var(--maroon-deep)); }
  .ra-sh-meta { font-family:var(--font-sans); font-size:11px; color:var(--text-dim); }

  .ra-stat-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-bottom:22px; }
  @media(max-width:900px){ .ra-stat-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media(max-width:600px){ .ra-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  .ra-stat { background:var(--cream-light); border:1px solid rgba(139,0,0,0.12); border-radius:var(--radius-md); padding:12px 14px; position:relative; overflow:hidden; transition:box-shadow var(--ease),transform var(--ease),border-color var(--ease); animation:ra-count .38s ease both; min-width:0; box-sizing:border-box; }
  .ra-stat:hover { box-shadow:0 6px 22px rgba(50,0,0,0.12); transform:translateY(-2px); border-color:rgba(139,0,0,0.24); }
  .ra-stat::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; border-radius:0 0 var(--radius-md) var(--radius-md); background:var(--ra-ac,#8B0000); opacity:.60; }
  .ra-stat-lbl { font-family:var(--font-sans); font-size:9.5px; font-weight:700; letter-spacing:.11em; text-transform:uppercase; color:var(--text-dim); margin-bottom:7px; }
  .ra-stat-val { font-family:var(--font-display); font-size:clamp(20px,2.2vw,28px); font-weight:700; color:var(--maroon-deep); line-height:1; margin-bottom:5px; }
  .ra-stat-sub { font-family:var(--font-sans); font-size:10px; color:var(--text-muted); }
  .ra-stat-ico { position:absolute; right:12px; top:12px; opacity:.08; color:var(--maroon-mid); }
  .ra-alert-stat { background:linear-gradient(135deg,rgba(139,0,0,0.08),rgba(139,0,0,0.04)); border-color:rgba(139,0,0,0.22) !important; }
  .ra-alert-stat .ra-stat-val { color:#8B0000; }

  .ra-panel { background:var(--cream-light); border:1px solid rgba(139,0,0,0.12); border-radius:var(--radius-md); overflow:hidden; }
  .ra-panel-hd { background:linear-gradient(135deg,#8B0000,#6B0000); border-bottom:2px solid rgba(201,168,76,0.35); padding:11px 16px; display:flex; align-items:center; justify-content:space-between; }
  .ra-panel-title { font-family:var(--font-display); font-size:11px; font-weight:700; letter-spacing:.10em; text-transform:uppercase; color:rgba(245,228,168,.92); }
  .ra-panel-sub { font-family:var(--font-sans); font-size:10px; color:rgba(245,228,168,.48); }
  .ra-panel-body { padding:16px; }

  .ra-sk { border-radius:5px; background:linear-gradient(90deg,rgba(139,0,0,0.06) 25%,rgba(139,0,0,0.10) 50%,rgba(139,0,0,0.06) 75%); background-size:1200px 100%; animation:ra-shimmer 1.4s infinite linear; }

  .ra-hbars { display:flex; flex-direction:column; gap:9px; }
  .ra-hbar-row { display:flex; align-items:center; gap:9px; }
  .ra-hbar-rank { font-family:var(--font-display); font-size:10px; font-weight:700; color:var(--text-dim); min-width:18px; text-align:right; flex-shrink:0; }
  .ra-hbar-label { font-family:var(--font-sans); font-size:11px; color:var(--text-secondary); min-width:80px; max-width:140px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ra-hbar-track { flex:1; height:14px; background:rgba(139,0,0,0.07); border-radius:99px; overflow:hidden; position:relative; }
  .ra-hbar-fill { height:100%; border-radius:99px; width:var(--bw,0%); animation:ra-bar-grow .65s cubic-bezier(.4,0,.2,1) both; }
  .ra-hbar-fill.gold   { background:linear-gradient(90deg,#C9A84C,#E0BE72); }
  .ra-hbar-fill.maroon { background:linear-gradient(90deg,#8B0000,#C00000); }
  .ra-hbar-fill.blue   { background:linear-gradient(90deg,#1A4DA0,#2E6DC8); }
  .ra-hbar-fill.teal   { background:linear-gradient(90deg,#0D7377,#14A085); }
  .ra-hbar-fill.purple { background:linear-gradient(90deg,#5B2C8D,#8E44AD); }
  .ra-hbar-val { font-family:var(--font-sans); font-size:10.5px; color:var(--text-dim); min-width:32px; text-align:left; flex-shrink:0; font-weight:600; }
  .ra-hbar-pct { font-family:var(--font-sans); font-size:9.5px; color:var(--text-dim); min-width:36px; flex-shrink:0; }

  .ra-donut-wrap { display:flex; align-items:center; gap:20px; flex-wrap:wrap; justify-content:center; }
  .ra-legend { display:flex; flex-direction:column; gap:7px; flex:1; min-width:120px; }
  .ra-legend-row { display:flex; align-items:center; gap:7px; }
  .ra-legend-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
  .ra-legend-lbl { font-family:var(--font-sans); font-size:11.5px; color:var(--text-secondary); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ra-legend-num { font-family:var(--font-sans); font-size:11px; color:var(--text-dim); font-weight:700; min-width:28px; text-align:right; flex-shrink:0; }
  .ra-legend-pct { font-family:var(--font-sans); font-size:10px; color:var(--text-dim); min-width:34px; text-align:right; flex-shrink:0; }

  .ra-spark-wrap { position:relative; }
  .ra-spark-wrap svg { overflow:visible; display:block; width:100%; }
  .ra-spark-tip { position:absolute; pointer-events:none; z-index:20; background:rgba(20,0,0,.90); border:1px solid rgba(201,168,76,.48); border-radius:7px; padding:6px 10px; font-family:var(--font-sans); font-size:11px; color:rgba(245,228,168,.92); white-space:nowrap; box-shadow:0 4px 14px rgba(0,0,0,.36); transition:opacity .10s; }

  /* ── Horizontal book strip ── */
  .ra-book-strip-wrap { position:relative; margin-bottom:20px; }
  .ra-book-strip-outer {
    background:rgba(139,0,0,0.025);
    border:1px solid rgba(139,0,0,0.10);
    border-radius:var(--radius-md);
    padding:14px 12px 10px;
  }
  .ra-book-strip {
    display:flex;
    gap:16px;
    overflow-x:scroll;
    padding:4px 4px 12px;
    scroll-snap-type:x mandatory;
    -webkit-overflow-scrolling:touch;
    scrollbar-width:thin;
    scrollbar-color:rgba(139,0,0,0.45) rgba(139,0,0,0.08);
  }
  .ra-book-strip::-webkit-scrollbar { height:8px; }
  .ra-book-strip::-webkit-scrollbar-track {
    background:rgba(139,0,0,0.08);
    border-radius:99px;
    margin:0 2px;
  }
  .ra-book-strip::-webkit-scrollbar-thumb {
    background:linear-gradient(90deg,#8B0000,#C00000);
    border-radius:99px;
    border:2px solid rgba(250,246,238,0.6);
  }
  .ra-book-strip::-webkit-scrollbar-thumb:hover { background:linear-gradient(90deg,#6B0000,#9B0000); }

  .ra-book-strip-hint {
    text-align:center;
    font-family:var(--font-sans);
    font-size:11px;
    color:var(--text-dim);
    padding:6px 0 2px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:6px;
    opacity:0.75;
  }
  .ra-book-strip-arrow { font-size:13px; color:rgba(139,0,0,0.45); }

  .ra-scroll-btns { display:flex; gap:5px; }
  .ra-scroll-btn {
    width:28px; height:28px; border-radius:50%;
    border:1px solid rgba(139,0,0,0.22);
    background:var(--cream-light); color:var(--maroon-mid);
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all var(--ease); flex-shrink:0;
  }
  .ra-scroll-btn:hover { background:rgba(139,0,0,0.10); border-color:rgba(139,0,0,0.36); transform:translateY(-1px); }

  /* Card outer shell */
  .ra-book-card {
    background:#fff;
    border:1px solid rgba(139,0,0,0.13);
    border-radius:18px;
    overflow:hidden;
    cursor:pointer;
    transition:box-shadow .20s,transform .20s,border-color .20s;
    animation:ra-pop .35s ease both;
    display:flex;
    flex-direction:column;
    flex-shrink:0;
    width:152px;
    scroll-snap-align:start;
    box-shadow:0 4px 18px rgba(30,0,0,0.10);
  }
  .ra-book-card:hover { box-shadow:0 12px 36px rgba(50,0,0,0.20); transform:translateY(-6px); border-color:rgba(139,0,0,0.30); }

  /* Cover thumbnail — deep maroon background with padded cover image */
  .ra-book-thumb {
    height:160px;
    background:linear-gradient(160deg,#7A0000 0%,#4A0000 100%);
    display:flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
    position:relative;
    overflow:hidden;
    padding:14px 18px;
  }
  .ra-book-thumb img {
    width:auto;
    height:100%;
    max-width:100%;
    object-fit:contain;
    border-radius:4px;
    box-shadow:0 6px 20px rgba(0,0,0,0.45);
    transition:transform .28s;
  }
  .ra-book-card:hover .ra-book-thumb img { transform:scale(1.05); }

  /* Rank badge — gold circle, top-left */
  .ra-book-rank {
    position:absolute;
    top:9px;
    left:9px;
    width:28px;
    height:28px;
    border-radius:50%;
    background:rgba(201,168,76,0.95);
    color:#3A0000;
    font-family:var(--font-display);
    font-size:10.5px;
    font-weight:800;
    display:flex;
    align-items:center;
    justify-content:center;
    letter-spacing:.02em;
    box-shadow:0 2px 8px rgba(0,0,0,0.32);
  }

  /* Info panel below cover */
  .ra-book-info {
    padding:11px 12px 13px;
    flex:1;
    display:flex;
    flex-direction:column;
    gap:4px;
    background:#fff;
    border-top:2px solid rgba(139,0,0,0.07);
  }

  /* Title: bold maroon */
  .ra-book-title {
    font-family:var(--font-sans);
    font-size:12px;
    font-weight:700;
    color:#8B0000;
    line-height:1.35;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
    text-align:center;
  }

  /* Borrow count row */
  .ra-book-count {
    font-family:var(--font-sans);
    font-size:11px;
    color:#888;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:5px;
    margin-top:auto;
    padding-top:5px;
  }
  .ra-book-count-dot { width:8px; height:8px; border-radius:50%; background:#C9A84C; flex-shrink:0; }

  /* ── Book detail modal — Full-screen Immersive Carousel ── */
  @keyframes ra-modal-beam { 0%{opacity:0.4} 50%{opacity:0.75} 100%{opacity:0.4} }
  @keyframes ra-slide-in-right { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ra-slide-in-left  { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ra-slide-fade-in  { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
  @keyframes ra-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

  .ra-book-modal-overlay {
    position:fixed; inset:0; z-index:4000;
    background:rgba(0,0,0,0.0);
    display:flex; align-items:center; justify-content:center;
    animation:ra-fade-in .25s ease both;
  }

  /* Full-screen modal shell */
  .ra-book-modal {
    position:fixed; inset:0; z-index:4000;
    width:100vw; height:100vh;
    overflow:hidden;
    animation:ra-slide-fade-in .30s cubic-bezier(.22,1,.36,1) both;
    display:flex; flex-direction:column;
  }

  /* Library background — LoginBG.png with dark overlay */
  .ra-lp-bg {
    position:absolute; inset:0;
    background:
      linear-gradient(180deg, rgba(6,1,1,0.80) 0%, rgba(14,3,3,0.70) 50%, rgba(6,1,1,0.85) 100%),
      url('/LoginBG.png') center/cover no-repeat;
    z-index:0;
    filter:saturate(0.80);
  }

  /* Gold spotlight beam */
  .ra-lp-spotlight {
    position:absolute;
    top:0; left:50%; transform:translateX(-50%);
    width:50%; height:100%;
    background:radial-gradient(ellipse 50% 65% at 50% 0%, rgba(201,168,76,0.16) 0%, rgba(201,168,76,0.05) 45%, transparent 70%);
    z-index:1; pointer-events:none;
    animation:ra-modal-beam 4s ease-in-out infinite;
  }

  /* Close button */
  .ra-lp-close {
    position:absolute; top:20px; right:20px; z-index:30;
    width:36px; height:36px; border-radius:50%;
    background:rgba(0,0,0,0.60); border:1.5px solid rgba(201,168,76,0.40);
    color:rgba(245,228,168,0.90); font-size:18px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:background .18s, transform .18s, box-shadow .18s;
    box-shadow:0 2px 12px rgba(0,0,0,0.40);
  }
  .ra-lp-close:hover { background:rgba(139,0,0,0.80); transform:scale(1.10); box-shadow:0 4px 18px rgba(0,0,0,0.55); }

  /* Full-screen content — centered layout */
  .ra-lp-content {
    position:relative; z-index:2;
    display:flex; flex-direction:row; align-items:center; justify-content:center;
    width:100%; height:100%;
    overflow-y:auto;
    padding:40px 60px 60px;
    gap:52px;
    scrollbar-width:thin; scrollbar-color:rgba(201,168,76,0.30) transparent;
    box-sizing:border-box;
  }
  .ra-lp-content::-webkit-scrollbar { width:5px; }
  .ra-lp-content::-webkit-scrollbar-track { background:transparent; }
  .ra-lp-content::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.30); border-radius:99px; }

  /* Left panel — book cover hero */
  .ra-lp-left {
    flex-shrink:0; width:340px;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    position:relative; gap:0;
  }

  /* Floating side-books — ghost books beside main cover */
  .ra-lp-side-books {
    position:absolute; left:-100px; top:50%; transform:translateY(-50%);
    display:flex; flex-direction:column; gap:8px;
    opacity:0.55; filter:blur(1.5px);
    pointer-events:none;
    width:80px;
  }
  .ra-lp-side-books-right {
    position:absolute; right:-100px; top:50%; transform:translateY(-50%);
    display:flex; flex-direction:column; gap:8px;
    opacity:0.45; filter:blur(2px);
    pointer-events:none;
    width:75px;
  }
  .ra-lp-side-book {
    height:110px; border-radius:3px 6px 6px 3px;
    box-shadow:-3px 0 0 rgba(0,0,0,0.50), 0 4px 14px rgba(0,0,0,0.60);
    overflow:hidden;
  }
  .ra-lp-side-book img { width:100%; height:100%; object-fit:cover; }
  .ra-lp-side-book-ph { width:100%; height:100%; background:rgba(60,10,10,0.70); }

  /* Glow halo around book */
  .ra-lp-halo {
    position:absolute;
    width:280px; height:320px;
    border-radius:50%;
    background:radial-gradient(circle, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.08) 45%, transparent 70%);
    filter:blur(28px);
    pointer-events:none; z-index:0;
    animation:ra-modal-beam 4s ease-in-out infinite;
  }

  /* Book cover image */
  .ra-lp-cover-wrap {
    position:relative; z-index:1;
    width:220px;
    filter:drop-shadow(0 24px 60px rgba(0,0,0,0.80)) drop-shadow(0 6px 20px rgba(201,168,76,0.32));
    transition:transform .40s cubic-bezier(.22,1,.36,1);
    animation:ra-float 5s ease-in-out infinite;
  }
  .ra-lp-cover-wrap:hover { transform:scale(1.04) translateY(-6px); animation:none; }
  .ra-lp-cover-wrap img {
    width:100%; height:auto; display:block;
    border-radius:4px 10px 10px 4px;
    box-shadow:
      -8px 0 0 rgba(0,0,0,0.65),
      -3px 0 6px rgba(0,0,0,0.50),
      0 0 0 1px rgba(255,255,255,0.06);
  }

  /* Rank badge on cover */
  .ra-lp-rank-badge {
    position:absolute; top:-16px; left:-16px; z-index:3;
    width:58px; height:58px; border-radius:50%;
    background:linear-gradient(135deg,#FFE066,#D4A017,#9A7020);
    border:3px solid rgba(255,255,255,0.28);
    box-shadow:0 6px 22px rgba(0,0,0,0.55), 0 0 0 5px rgba(201,168,76,0.22), 0 0 30px rgba(201,168,76,0.30);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    color:#2A0E00; font-family:var(--font-display); line-height:1;
  }
  .ra-lp-rank-badge-num { font-size:20px; font-weight:900; letter-spacing:-.02em; }
  .ra-lp-rank-badge-lbl { font-size:7px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-top:-2px; }

  /* Cover placeholder */
  .ra-lp-cover-ph {
    width:220px; height:290px; border-radius:4px 10px 10px 4px;
    background:rgba(80,10,10,0.40); border:1px solid rgba(201,168,76,0.18);
    display:flex; align-items:center; justify-content:center;
  }

  /* Borrow count tag below cover */
  .ra-lp-borrow-tag {
    margin-top:22px; z-index:1;
    background:rgba(201,168,76,0.18); border:1.5px solid rgba(201,168,76,0.38);
    border-radius:99px; padding:7px 22px;
    font-family:var(--font-sans); font-size:12px; font-weight:700;
    color:rgba(245,228,168,0.94); letter-spacing:.05em;
    display:flex; align-items:center; gap:7px;
    box-shadow:0 2px 12px rgba(0,0,0,0.30);
  }
  .ra-lp-borrow-dot { width:8px; height:8px; border-radius:50%; background:#E0BE60; flex-shrink:0; box-shadow:0 0 8px rgba(201,168,76,0.70); }

  /* Right panel — info cards (parchment poster) */
  .ra-lp-right {
    flex:1; max-width:560px;
    display:flex; flex-direction:column;
    min-width:0;
    background:linear-gradient(160deg, rgba(245,228,168,0.14) 0%, rgba(220,195,130,0.09) 60%, rgba(180,148,70,0.06) 100%);
    border:1px solid rgba(201,168,76,0.30);
    border-radius:16px;
    padding:24px 26px 20px;
    backdrop-filter:blur(6px);
    box-shadow:0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(245,228,168,0.12);
    position:relative; overflow:hidden;
  }
  /* parchment texture lines */
  .ra-lp-right::before {
    content:''; position:absolute; inset:0; border-radius:16px;
    background:repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(201,168,76,0.04) 29px);
    pointer-events:none;
  }

  /* Parchment title card */
  .ra-lp-title-card {
    background:linear-gradient(135deg, rgba(245,228,168,0.18) 0%, rgba(220,195,130,0.10) 100%);
    border:1px solid rgba(201,168,76,0.35);
    border-radius:10px;
    padding:14px 18px 12px;
    margin-bottom:14px;
    position:relative; overflow:hidden;
    box-shadow:0 2px 10px rgba(0,0,0,0.20);
  }
  .ra-lp-title-card::before {
    content:''; position:absolute; inset:0;
    background:repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(201,168,76,0.05) 21px);
    pointer-events:none;
  }
  .ra-lp-rank-label {
    font-family:var(--font-sans); font-size:9.5px; font-weight:700; letter-spacing:.20em;
    text-transform:uppercase; color:rgba(201,168,76,0.75); margin-bottom:5px;
  }
  .ra-lp-book-name {
    font-family:var(--font-display); font-size:22px; font-weight:800;
    color:rgba(245,228,168,0.97); line-height:1.2; letter-spacing:.02em;
    text-transform:uppercase;
  }

  /* Info cards grid — 2 cols matching screenshot */
  .ra-lp-cards {
    display:grid; grid-template-columns:1fr 1fr; gap:8px;
    flex:1;
  }

  /* Single info card — parchment note style */
  .ra-lp-card {
    background:linear-gradient(135deg, rgba(240,220,155,0.12) 0%, rgba(220,195,120,0.07) 100%);
    border:1px solid rgba(201,168,76,0.28);
    border-radius:9px;
    padding:10px 13px;
    position:relative; overflow:hidden;
    transition:border-color .20s, background .20s, transform .20s;
  }
  .ra-lp-card:hover { border-color:rgba(201,168,76,0.50); background:rgba(245,228,168,0.16); transform:translateY(-1px); }
  /* torn-paper top edge */
  .ra-lp-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.20) 20%, rgba(201,168,76,0.50) 50%, rgba(201,168,76,0.20) 80%, transparent 100%);
  }
  .ra-lp-card-lbl {
    font-family:var(--font-sans); font-size:8px; font-weight:700; letter-spacing:.16em;
    text-transform:uppercase; color:rgba(201,168,76,0.70); margin-bottom:4px;
    display:flex; align-items:center; gap:5px;
  }
  .ra-lp-card-val {
    font-family:var(--font-sans); font-size:12.5px; font-weight:600;
    color:rgba(245,228,168,0.92); line-height:1.35;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .ra-lp-card-val.small { font-size:11.5px; }

  /* Date added — full width at bottom */
  .ra-lp-card.full { grid-column:1 / -1; }

  /* Period badge */
  .ra-lp-period-pill {
    margin-top:12px; align-self:flex-start;
    background:rgba(100,0,0,0.45); border:1px solid rgba(201,168,76,0.28);
    border-radius:99px; padding:5px 14px;
    font-family:var(--font-sans); font-size:9px; font-weight:700; letter-spacing:.10em;
    color:rgba(245,228,168,0.70); text-transform:uppercase;
    display:flex; align-items:center; gap:6px;
  }

  /* Slide animation key */
  .ra-lp-slide-enter { animation:ra-slide-in-right .35s cubic-bezier(.22,1,.36,1) both; }
  .ra-lp-slide-enter-left { animation:ra-slide-in-left .35s cubic-bezier(.22,1,.36,1) both; }

  /* ─── Responsive ─── */
  @media(max-width:1100px){
    .ra-lp-content { padding:40px 40px 60px; gap:36px; }
    .ra-lp-cover-wrap { width:190px; }
    .ra-lp-right { max-width:480px; }
    .ra-lp-book-name { font-size:19px; }
  }
  @media(max-width:820px){
    .ra-lp-content { flex-direction:column; align-items:center; padding:70px 24px 60px; gap:24px; }
    .ra-lp-left { width:100%; align-items:center; flex-direction:row; gap:24px; justify-content:center; }
    .ra-lp-right { max-width:100%; width:100%; }
    .ra-lp-cover-wrap { width:160px; animation:none; }
    .ra-lp-halo { width:180px; height:200px; }
    .ra-lp-borrow-tag { margin-top:0; align-self:center; }
    .ra-lp-side-books, .ra-lp-side-books-right { display:none; }
    .ra-lp-book-name { font-size:17px; }
  }
  @media(max-width:520px){
    .ra-lp-cards { grid-template-columns:1fr 1fr; gap:6px; }
    .ra-lp-cover-wrap { width:130px; }
    .ra-lp-rank-badge { width:44px; height:44px; top:-10px; left:-10px; font-size:15px; }
    .ra-lp-book-name { font-size:15px; }
    .ra-lp-card-val { font-size:11px; }
    .ra-lp-content { padding:60px 16px 50px; gap:18px; }
  }

  /* legacy grid kept for fallback – not used now */
  .ra-book-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:12px; }

  .ra-leader { display:flex; flex-direction:column; gap:6px; }
  .ra-leader-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:var(--radius-sm); border:1px solid rgba(139,0,0,0.08); background:rgba(139,0,0,0.025); transition:background var(--ease),border-color var(--ease); }
  .ra-leader-row:hover { background:rgba(139,0,0,0.06); border-color:rgba(139,0,0,0.16); }
  .ra-leader-rank { font-family:var(--font-display); font-size:13px; font-weight:800; color:var(--text-dim); min-width:22px; text-align:center; flex-shrink:0; }
  .ra-leader-rank.top1 { color:#C9A84C; }
  .ra-leader-rank.top2 { color:#A0A0A0; }
  .ra-leader-rank.top3 { color:#B87333; }
  .ra-leader-avatar { width:30px; height:30px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep)); border:1.5px solid rgba(201,168,76,0.30); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:11px; font-weight:700; color:rgba(245,228,168,.85); overflow:hidden; }
  .ra-leader-name { font-family:var(--font-sans); font-size:12px; font-weight:600; color:var(--text-secondary); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ra-leader-sub  { font-family:var(--font-sans); font-size:10px; color:var(--text-dim); }
  .ra-leader-badge { font-family:var(--font-sans); font-size:10.5px; font-weight:700; color:var(--maroon-mid); background:rgba(139,0,0,0.08); padding:2px 8px; border-radius:99px; flex-shrink:0; }

  .ra-pill { display:inline-flex; align-items:center; padding:2px 8px; border-radius:99px; white-space:nowrap; font-family:var(--font-sans); font-size:10.5px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; }
  .ra-pill.green  { background:rgba(34,107,60,0.12);  color:#1B6B3A; border:1px solid rgba(34,107,60,0.22); }
  .ra-pill.amber  { background:rgba(180,100,0,0.12);  color:#9A5500; border:1px solid rgba(180,100,0,0.22); }
  .ra-pill.red    { background:rgba(139,0,0,0.12);    color:#7B0000; border:1px solid rgba(139,0,0,0.22); }
  .ra-pill.blue   { background:rgba(30,80,160,0.10);  color:#1A4DA0; border:1px solid rgba(30,80,160,0.20); }
  .ra-pill.purple { background:rgba(91,44,141,0.10);  color:#5B2C8D; border:1px solid rgba(91,44,141,0.20); }
  .ra-pill.grey   { background:rgba(100,100,100,0.09);color:#555;    border:1px solid rgba(100,100,100,0.18); }

  .ra-toolbar { padding:10px 14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; border-bottom:1px solid rgba(139,0,0,0.09); background:rgba(139,0,0,0.02); }
  .ra-search { display:flex; align-items:center; gap:6px; background:var(--cream-light); border:1px solid rgba(139,0,0,0.18); border-radius:var(--radius-sm); padding:6px 10px; flex:1; min-width:160px; max-width:260px; transition:border-color var(--ease); }
  .ra-search:focus-within { border-color:rgba(139,0,0,0.38); }
  .ra-search input { flex:1; border:none; outline:none; background:transparent; font-family:var(--font-sans); font-size:12px; color:var(--text-primary); }
  .ra-search input::placeholder { color:var(--text-dim); }
  .ra-fsel { border:1px solid rgba(139,0,0,0.18); border-radius:var(--radius-sm); padding:6px 9px; background:var(--cream-light); font-family:var(--font-sans); font-size:11.5px; color:var(--text-secondary); cursor:pointer; outline:none; transition:border-color var(--ease); }
  .ra-fsel:focus { border-color:rgba(139,0,0,0.36); }
  .ra-sp { flex:1; }
  .ra-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:var(--radius-sm); border:1px solid rgba(139,0,0,0.20); background:var(--cream-light); font-family:var(--font-sans); font-size:11px; font-weight:500; color:var(--text-secondary); cursor:pointer; transition:all var(--ease); white-space:nowrap; }
  .ra-btn:hover { background:rgba(139,0,0,0.07); border-color:rgba(139,0,0,0.34); color:var(--maroon-mid); transform:translateY(-1px); }
  .ra-btn.primary { background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep)); color:var(--gold-pale); border-color:rgba(201,168,76,0.26); }
  .ra-btn.primary:hover { background:linear-gradient(135deg,#7B0000,#4A0000); box-shadow:0 4px 14px rgba(80,0,0,0.28); }

  .ra-table { width:100%; border-collapse:collapse; min-width:500px; font-family:var(--font-sans); font-size:12px; }
  .ra-table thead tr { background:linear-gradient(135deg,#8B0000,#6B0000); border-bottom:2px solid rgba(201,168,76,0.35); }
  .ra-table thead th { padding:10px 13px; text-align:left; font-family:var(--font-display); font-size:9.5px; font-weight:700; letter-spacing:.10em; text-transform:uppercase; color:rgba(245,228,168,.86); cursor:pointer; user-select:none; white-space:nowrap; transition:color .18s; }
  .ra-table thead th:hover { color:rgba(245,228,168,1); }
  .ra-table thead th.sorted { color:#F5E4A8; }
  .ra-table tbody tr { border-bottom:1px solid rgba(139,0,0,0.07); transition:background var(--ease); }
  .ra-table tbody tr:hover { background:rgba(139,0,0,0.04); }
  .ra-table tbody td { padding:9px 13px; color:var(--text-secondary); vertical-align:middle; }
  .ra-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .ra-table-wrap::-webkit-scrollbar { height:4px; }
  .ra-table-wrap::-webkit-scrollbar-track { background:rgba(139,0,0,0.04); }
  .ra-table-wrap::-webkit-scrollbar-thumb { background:rgba(139,0,0,0.20); border-radius:99px; }

  .ra-pg { padding:9px 13px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:7px; border-top:1px solid rgba(139,0,0,0.09); background:rgba(139,0,0,0.02); font-family:var(--font-sans); font-size:11px; }
  .ra-pg-info { color:var(--text-dim); }
  .ra-pg-btns { display:flex; gap:3px; }
  .ra-pg-btn { min-width:28px; height:28px; padding:0 7px; border-radius:6px; border:1px solid rgba(139,0,0,0.16); background:var(--cream-light); color:var(--text-muted); font-family:var(--font-sans); font-size:11.5px; cursor:pointer; transition:all var(--ease); display:flex; align-items:center; justify-content:center; }
  .ra-pg-btn:hover:not(:disabled) { background:rgba(139,0,0,0.08); color:var(--maroon-mid); border-color:rgba(139,0,0,0.30); transform:translateY(-1px); }
  .ra-pg-btn.active { background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep)); color:var(--gold-pale); border-color:rgba(201,168,76,0.26); font-weight:600; }
  .ra-pg-btn:disabled { opacity:.30; cursor:not-allowed; }

  .ra-nav-tabs { display:flex; gap:2px; border-bottom:2px solid rgba(139,0,0,0.10); margin-bottom:20px; overflow-x:auto; }
  .ra-nav-tab { padding:9px 18px; background:transparent; border:none; border-bottom:2px solid transparent; font-family:var(--font-sans); font-size:12px; font-weight:500; color:var(--text-muted); cursor:pointer; white-space:nowrap; transition:all var(--ease); margin-bottom:-2px; display:flex; align-items:center; gap:6px; }
  .ra-nav-tab:hover { color:var(--maroon-mid); }
  .ra-nav-tab.active { color:var(--maroon-deep); border-bottom-color:var(--maroon-mid); font-weight:700; }

  .ra-period { display:flex; gap:5px; }
  .ra-p-btn { padding:4px 11px; border-radius:99px; border:1px solid rgba(139,0,0,0.18); background:transparent; font-family:var(--font-sans); font-size:11px; font-weight:500; color:var(--text-muted); cursor:pointer; transition:all var(--ease); }
  .ra-p-btn.active { background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep)); color:var(--gold-pale); border-color:rgba(201,168,76,0.26); }
  .ra-p-btn:hover:not(.active) { background:rgba(139,0,0,0.08); border-color:rgba(139,0,0,0.28); color:var(--maroon-mid); }

  .ra-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 20px; gap:8px; text-align:center; font-family:var(--font-sans); }
  .ra-empty svg { opacity:.20; color:var(--maroon-mid); }
  .ra-empty-h { font-size:13.5px; font-weight:600; color:var(--text-secondary); }
  .ra-empty-s { font-size:11.5px; color:var(--text-dim); max-width:230px; }

  .ra-spinner { width:30px; height:30px; border-radius:50%; border:3px solid rgba(139,0,0,0.14); border-top-color:var(--maroon-mid); animation:ra-spin .7s linear infinite; }

  .ra-mod-hd { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:22px; }
  .ra-mod-title-row { display:flex; align-items:center; gap:10px; }
  .ra-mod-icon { width:38px; height:38px; border-radius:var(--radius-sm); flex-shrink:0; background:linear-gradient(135deg,var(--maroon-mid),var(--maroon-deep)); border:1px solid rgba(201,168,76,0.28); display:flex; align-items:center; justify-content:center; color:var(--gold-pale); }
  .ra-mod-title { font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--maroon-deep); letter-spacing:.04em; line-height:1.1; }
  .ra-mod-sub { font-family:var(--font-sans); font-size:11px; color:var(--text-dim); margin-top:3px; }
  .ra-mod-controls { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

  @media(max-width:1200px) {
    .ra-stat-grid { grid-template-columns:repeat(3,1fr); }
    .ra-two-col   { grid-template-columns:1fr; }
    .ra-three-col { grid-template-columns:1fr 1fr; }
    .ra-book-grid { grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); }
    .ra-book-card { width:138px; }
    .ra-book-thumb { height:148px; }
  }
  @media(max-width:768px) {
    .ra-stat-grid { grid-template-columns:repeat(2,1fr); }
    .ra-three-col { grid-template-columns:1fr; }
    .ra-toolbar   { flex-direction:column; align-items:stretch; }
    .ra-search    { max-width:100%; }
    .ra-sp        { display:none; }
    .ra-hbar-label{ min-width:62px; max-width:90px; font-size:10px; }
    .ra-mod-hd    { flex-direction:column; }
    .ra-book-card { width:128px; border-radius:14px; }
    .ra-book-thumb { height:136px; padding:10px 14px; }
    .ra-book-title { font-size:11px; }
    .ra-book-count { font-size:10px; }
    .ra-book-rank  { width:24px; height:24px; font-size:9.5px; top:7px; left:7px; }
    .ra-book-strip { gap:10px; padding:4px 2px 12px; }
    .ra-book-modal { border-radius:16px; }
    .ra-mod-controls { flex-wrap:wrap; gap:6px; }
    .ra-nav-tab { padding:8px 12px; font-size:11px; }
  }
  @media(max-width:480px) {
    .ra-stat-grid { grid-template-columns:1fr 1fr; }
    .ra-stat-val  { font-size:22px; }
    .ra-book-grid { grid-template-columns:repeat(2,1fr); }
    .ra-pg        { flex-direction:column; align-items:flex-start; }
    .ra-book-card { width:112px; border-radius:12px; }
    .ra-book-thumb { height:118px; padding:8px 10px; }
    .ra-book-title { font-size:10.5px; }
    .ra-book-count { font-size:9.5px; gap:4px; }
    .ra-book-count-dot { width:6px; height:6px; }
    .ra-book-rank  { width:22px; height:22px; font-size:9px; top:6px; left:6px; }
    .ra-book-strip { gap:8px; }
    .ra-book-info  { padding:8px 9px 10px; }
    .ra-book-modal-overlay { padding:12px; }
    .ra-sh-title   { font-size:11px; }
    .ra-mod-title  { font-size:16px; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#8B0000','#C9A84C','#1A4DA0','#0D7377','#5B2C8D',
  '#B87333','#277A3C','#C0392B','#2E4057','#A04000',
];
const FILL_CLASSES = ['maroon','gold','blue','teal','purple','maroon','teal','blue','purple','gold'];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const fmtNum   = n  => n == null ? '—' : Number(n).toLocaleString();
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtShort = iso => iso ? new Date(iso).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : '—';
const fmtTime  = iso => iso ? new Date(iso).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—';
const initials = name => (name||'?').split(' ').map(p=>p[0]||'').join('').toUpperCase().slice(0,2);
const pct      = (v,t) => t > 0 ? Math.round((v/t)*100) : 0;

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Ic = {
  bars:     (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  books:    (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  borrowed: (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  pending:  (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  alert:    (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  users:    (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  category: (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  trend:    (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  attend:   (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>,
  search:   (s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  dl:       (s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  print:    (s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  refresh:  (s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  prev:     (s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="15 18 9 12 15 6"/></svg>,
  next:     (s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="9 18 15 12 9 6"/></svg>,
  empty:    (s=34)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  return:   (s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Donut({ data=[], size=120 }) {
  const total = data.reduce((s,d)=>s+d.value,0)||1;
  const R=42, cx=size/2, cy=size/2, sw=15, circ=2*Math.PI*R;
  let off=0;
  const slices = data.map((d,i)=>{
    const dash=(d.value/total)*circ, gap=circ-dash;
    const el=(
      <circle key={i} cx={cx} cy={cy} r={R} fill="none"
        stroke={d.color} strokeWidth={sw}
        strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off}
        style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%',transition:'stroke-dasharray .5s ease'}}/>
    );
    off+=dash; return el;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(139,0,0,0.07)" strokeWidth={sw}/>
      {slices}
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
        style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:700,fill:'var(--maroon-deep)'}}>
        {fmtNum(total)}
      </text>
      <text x={cx} y={cy+15} textAnchor="middle" dominantBaseline="middle"
        style={{fontFamily:'var(--font-sans)',fontSize:8,fill:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'.06em'}}>
        total
      </text>
    </svg>
  );
}

// ── Full Pie Chart with external labels + legend (like reference image) ──
function PieChart({ data=[], size=300 }) {
  const [hov, setHov] = useState(null);
  const total = data.reduce((s,d)=>s+d.value,0)||1;

  // Large padding so all external labels are inside the viewBox (no clipping)
  const PAD = 90;
  const VW  = size + PAD*2;
  const VH  = size + PAD*2;
  const cx  = VW/2;
  const cy  = VH/2;
  const R   = size*0.40;   // pie radius
  const RL  = R + 12;     // connector dot radius
  const RLO = R + 36;     // connector line end
  const RT  = R + 52;     // label text start

  let angle = -Math.PI/2;
  const isSingle = data.length === 1;
  const slices = data.map((d,i)=>{
    const sweep = isSingle ? Math.PI*2 - 0.0001 : (d.value/total)*Math.PI*2;
    const mid   = angle + sweep/2;
    const x1=cx+R*Math.cos(angle),       y1=cy+R*Math.sin(angle);
    const x2=cx+R*Math.cos(angle+sweep), y2=cy+R*Math.sin(angle+sweep);
    const lf = sweep>Math.PI?1:0;
    const lx1=cx+RL*Math.cos(mid),  ly1=cy+RL*Math.sin(mid);
    const lx2=cx+RLO*Math.cos(mid), ly2=cy+RLO*Math.sin(mid);
    const tx =cx+RT*Math.cos(mid),  ty =cy+RT*Math.sin(mid);
    const rawC = Math.cos(mid);
    const anchor = rawC>0.15?'start':rawC<-0.15?'end':'middle';
    const pctVal = Math.round((d.value/total)*100);
    const slice = {...d,i,angle,sweep,mid,x1,y1,x2,y2,lf,lx1,ly1,lx2,ly2,tx,ty,anchor,pctVal};
    angle += sweep;
    return slice;
  });

  return (
    <div style={{
      display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',gap:14,width:'100%',
    }}>
      <svg viewBox={`0 0 ${VW} ${VH}`}
        style={{width:'100%',maxWidth:VW,height:'auto',display:'block'}}>
        <defs>
          <filter id="pshadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.13)"/>
          </filter>
        </defs>

        {/* Slices */}
        {slices.map((s,i)=>{
          const isH = hov===i;
          const dx = isH?Math.cos(s.mid)*8:0, dy=isH?Math.sin(s.mid)*8:0;
          const op = hov!==null&&!isH?0.6:1;
          if(isSingle){
            return (
              <g key={i} style={{cursor:'pointer'}}
                onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
                <circle cx={cx+dx} cy={cy+dy} r={R}
                  fill={s.color} stroke="#fff" strokeWidth="3"
                  filter="url(#pshadow)" opacity={op}
                  style={{transition:'opacity .18s,cx .18s,cy .18s'}}/>
              </g>
            );
          }
          return (
            <g key={i} style={{cursor:'pointer'}}
              onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
              <path
                d={`M${cx},${cy} L${s.x1},${s.y1} A${R},${R} 0 ${s.lf},1 ${s.x2},${s.y2} Z`}
                fill={s.color} stroke="#fff" strokeWidth="3"
                filter="url(#pshadow)" opacity={op}
                style={{
                  transform:`translate(${dx}px,${dy}px)`,
                  transition:'opacity .18s,transform .18s',
                }}/>
            </g>
          );
        })}

        {/* Labels with connector lines */}
        {slices.map((s,i)=>{
          const op = hov!==null&&hov!==i?0.3:1;
          // single-slice: put label straight up
          const lx1_=isSingle?cx:s.lx1,   ly1_=isSingle?cy-R:s.ly1;
          const lx2_=isSingle?cx:s.lx2,   ly2_=isSingle?cy-R-24:s.ly2;
          const tx_ =isSingle?cx:s.tx,     ty_ =isSingle?cy-R-40:s.ty;
          const anc_=isSingle?'middle':s.anchor;
          return (
            <g key={`L${i}`} opacity={op} style={{transition:'opacity .18s'}}>
              <circle cx={lx1_} cy={ly1_} r="4" fill={s.color}/>
              <line x1={lx1_} y1={ly1_} x2={lx2_} y2={ly2_}
                stroke={s.color} strokeWidth="1.6"/>
              <text x={tx_} y={ty_-9} textAnchor={anc_}
                style={{fontSize:13,fontWeight:800,fill:s.color,
                  fontFamily:'var(--font-display,serif)'}}>
                {s.pctVal}%
              </text>
              <text x={tx_} y={ty_+8} textAnchor={anc_}
                style={{fontSize:10,fill:'#7a6b5a',
                  fontFamily:'var(--font-sans,sans-serif)'}}>
                {(s.label||'').length>15?(s.label).slice(0,14)+'\u2026':(s.label||'')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'7px 20px',
        justifyContent:'center',padding:'0 12px'}}>
        {slices.map((s,i)=>(
          <div key={i}
            onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
            style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',
              opacity:hov!==null&&hov!==i?0.4:1,transition:'opacity .15s'}}>
            <div style={{width:12,height:12,borderRadius:3,
              background:s.color,flexShrink:0}}/>
            <span style={{fontSize:12,color:'var(--text-secondary,#6b5a4e)',
              fontFamily:'var(--font-sans,sans-serif)',whiteSpace:'nowrap'}}>
              {(s.label||'N/A').length>22?s.label.slice(0,21)+'\u2026':(s.label||'N/A')}
            </span>
            <span style={{fontSize:12,fontWeight:700,
              color:'var(--maroon-mid,#8B0000)',
              fontFamily:'var(--font-sans,sans-serif)'}}>
              {fmtNum(s.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function LineChart({ data=[], color='#8B0000', h=140, id='lc' }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  const [hovIdx, setHovIdx] = useState(null);

  if (!data.length) return (
    <div className="ra-empty" style={{padding:24}}>
      <div className="ra-empty-s">No data for this period</div>
    </div>
  );

  // Layout constants
  const PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 36;
  const VW = 560, VH = h + PAD_T + PAD_B;
  const CW = VW - PAD_L - PAD_R;
  const CH = h;

  const maxV = Math.max(...data.map(d => d.value), 1);

  // Y-axis ticks (4 lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    v: Math.round(maxV * f),
    y: PAD_T + CH - f * CH,
  }));

  // Plot points
  const pts = data.map((d, i) => ({
    x: PAD_L + (i / Math.max(data.length - 1, 1)) * CW,
    y: PAD_T + CH - (d.value / maxV) * CH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `M${pts[0].x},${PAD_T + CH} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${PAD_T+CH} Z`;

  // Decide which x labels to show (avoid crowding)
  const maxLabels = data.length <= 7 ? data.length : data.length <= 12 ? Math.ceil(data.length / 2) : 7;
  const labelStep = Math.max(1, Math.round(data.length / maxLabels));
  const showLabel = i => i === 0 || i === data.length - 1 || i % labelStep === 0;

  return (
    <div className="ra-spark-wrap" ref={ref} style={{userSelect:'none'}}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{width:'100%', height: VH, display:'block'}}
        onMouseLeave={() => { setTip(null); setHovIdx(null); }}
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".18"/>
            <stop offset="85%" stopColor={color} stopOpacity=".02"/>
          </linearGradient>
          <clipPath id={`clip-${id}`}>
            <rect x={PAD_L} y={PAD_T} width={CW} height={CH}/>
          </clipPath>
        </defs>

        {/* Y-axis grid lines + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L} y1={t.y} x2={PAD_L + CW} y2={t.y}
              stroke="rgba(139,0,0,0.07)" strokeWidth="1"
              strokeDasharray={i === 0 ? 'none' : '3,4'}
            />
            <text
              x={PAD_L - 5} y={t.y + 1}
              textAnchor="end" dominantBaseline="middle"
              style={{fontFamily:'var(--font-sans)',fontSize:8,fill:'rgba(80,0,0,0.38)',fontWeight:500}}
            >
              {t.v}
            </text>
          </g>
        ))}

        {/* X-axis baseline */}
        <line
          x1={PAD_L} y1={PAD_T + CH} x2={PAD_L + CW} y2={PAD_T + CH}
          stroke="rgba(139,0,0,0.15)" strokeWidth="1.2"
        />
        {/* Y-axis left line */}
        <line
          x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CH}
          stroke="rgba(139,0,0,0.10)" strokeWidth="1"
        />

        {/* Area fill */}
        <path d={areaPath} fill={`url(#grad-${id})`} clipPath={`url(#clip-${id})`}/>

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#clip-${id})`}/>

        {/* Hover vertical rule */}
        {hovIdx !== null && (
          <line
            x1={pts[hovIdx].x} y1={PAD_T}
            x2={pts[hovIdx].x} y2={PAD_T + CH}
            stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
          />
        )}

        {/* Data points */}
        {pts.map((p, i) => (
          <g key={i}>
            {/* Invisible wide hit area */}
            <rect
              x={p.x - (CW / data.length / 2)} y={PAD_T}
              width={CW / data.length} height={CH}
              fill="transparent"
              style={{cursor:'pointer'}}
              onMouseEnter={e => {
                const r = ref.current?.getBoundingClientRect();
                if (r) setTip({x: e.clientX - r.left, y: e.clientY - r.top, l: p.label, v: p.value});
                setHovIdx(i);
              }}
            />
            <circle
              cx={p.x} cy={p.y} r={hovIdx === i ? 4.5 : 3}
              fill={hovIdx === i ? '#fff' : color}
              stroke={color}
              strokeWidth={hovIdx === i ? 2.2 : 0}
              style={{transition:'r .12s, fill .12s', cursor:'pointer'}}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {pts.map((p, i) => showLabel(i) && (
          <text
            key={i}
            x={p.x} y={PAD_T + CH + 14}
            textAnchor="middle"
            style={{
              fontFamily:'var(--font-sans)',
              fontSize: data.length > 20 ? 7 : 8.5,
              fill: hovIdx === i ? color : 'rgba(80,0,0,0.45)',
              fontWeight: hovIdx === i ? 700 : 400,
              transition:'fill .12s',
            }}
          >
            {p.label}
          </text>
        ))}

        {/* Tick marks on x axis */}
        {pts.map((p, i) => showLabel(i) && (
          <line key={`tk-${i}`}
            x1={p.x} y1={PAD_T + CH} x2={p.x} y2={PAD_T + CH + 4}
            stroke="rgba(139,0,0,0.20)" strokeWidth="1"
          />
        ))}
      </svg>

      {/* Tooltip */}
      {tip && (
        <div className="ra-spark-tip" style={{left: Math.min(tip.x + 12, 240), top: Math.max(tip.y - 42, 0)}}>
          <strong>{tip.l}</strong>&ensp;{fmtNum(tip.v)}
        </div>
      )}
    </div>
  );
}

function SkelRows({cols,rows=5}){
  return Array.from({length:rows}).map((_,i)=>(
    <tr key={i}>{Array.from({length:cols}).map((__,j)=>(
      <td key={j} style={{padding:'10px 13px'}}><div className="ra-sk" style={{height:11,width:`${50+Math.random()*40}%`}}/></td>
    ))}</tr>
  ));
}

function RaTable({ cols, rows=[], loading, pageSize=8, searchable=true, filterable=null, exportable=true, title='' }) {
  const [q,setQ]=useState('');
  const [fil,setFil]=useState('all');
  const [sk,setSk]=useState(null);
  const [sd,setSd]=useState('asc');
  const [pg,setPg]=useState(1);
  const sort=key=>{ if(sk===key)setSd(d=>d==='asc'?'desc':'asc'); else{setSk(key);setSd('asc');} setPg(1); };
  const filtered=useMemo(()=>{
    let r=rows;
    if(q){const lq=q.toLowerCase(); r=r.filter(row=>cols.some(c=>String(row[c.key]??'').toLowerCase().includes(lq)));}
    if(fil!=='all'&&filterable) r=r.filter(row=>row[filterable.key]===fil);
    if(sk) r=[...r].sort((a,b)=>{ const cmp=String(a[sk]??'').localeCompare(String(b[sk]??''),undefined,{numeric:true}); return sd==='asc'?cmp:-cmp; });
    return r;
  },[rows,q,fil,sk,sd,filterable,cols]);
  useEffect(()=>setPg(1),[q,fil]);
  const total=Math.max(1,Math.ceil(filtered.length/pageSize));
  const paged=filtered.slice((pg-1)*pageSize,pg*pageSize);

  const exportCSV=()=>{
    const h=cols.map(c=>c.label).join(',');
    const b=filtered.map(r=>cols.map(c=>`"${r[c.key]??''}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([h+'\n'+b],{type:'text/csv'}));
    a.download=`${title||'report'}.csv`; a.click();
  };
  const doPrint=()=>{
    const win=window.open('','_blank');
    const thead=cols.map(c=>`<th>${c.label}</th>`).join('');
    const tbody=filtered.map(row=>`<tr>${cols.map(c=>`<td>${row[c.key]??'—'}</td>`).join('')}</tr>`).join('');
    win.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;font-size:12px}h2{color:#7B0000}table{width:100%;border-collapse:collapse}th{background:#7B0000;color:#F5E4A8;padding:8px;text-align:left;font-size:10px;text-transform:uppercase}td{padding:7px 8px;border-bottom:1px solid #eee}@media print{@page{margin:1.2cm}}</style></head><body><h2>${title}</h2><p style="color:#888;font-size:11px">${filtered.length} records · ${new Date().toLocaleString('en-PH')}</p><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="ra-panel">
      <div className="ra-toolbar">
        {searchable&&<div className="ra-search">{Ic.search()}<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…"/>{q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>×</button>}</div>}
        {filterable&&<select className="ra-fsel" value={fil} onChange={e=>setFil(e.target.value)}><option value="all">All {filterable.label}</option>{filterable.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}
        <div className="ra-sp"/>
        {exportable&&<><button className="ra-btn" onClick={exportCSV}>{Ic.dl()} CSV</button><button className="ra-btn" onClick={doPrint}>{Ic.print()} Print</button></>}
      </div>
      <div className="ra-table-wrap">
        <table className="ra-table">
          <thead><tr>{cols.map(c=>(
            <th key={c.key} className={sk===c.key?'sorted':''} onClick={()=>sort(c.key)} style={{width:c.width}}>
              {c.label} <span style={{opacity:.6,fontSize:9}}>{sk===c.key?(sd==='asc'?'↑':'↓'):'↕'}</span>
            </th>
          ))}</tr></thead>
          <tbody>
            {loading?<SkelRows cols={cols.length} rows={pageSize}/>
              :paged.length
                ?paged.map((row,i)=><tr key={i}>{cols.map(c=><td key={c.key}>{c.render?c.render(row[c.key],row):(row[c.key]??'—')}</td>)}</tr>)
                :<tr><td colSpan={cols.length}><div className="ra-empty">{Ic.empty()}<div className="ra-empty-h">No records</div><div className="ra-empty-s">Try adjusting your search or filters.</div></div></td></tr>
            }
          </tbody>
        </table>
      </div>
      <div className="ra-pg">
        <span className="ra-pg-info">{loading?'…':`${filtered.length===0?0:(pg-1)*pageSize+1}–${Math.min(pg*pageSize,filtered.length)} of ${filtered.length}`}</span>
        <div className="ra-pg-btns">
          <button className="ra-pg-btn" onClick={()=>setPg(1)} disabled={pg===1||loading}>{Ic.prev()}{Ic.prev()}</button>
          <button className="ra-pg-btn" onClick={()=>setPg(p=>p-1)} disabled={pg===1||loading}>{Ic.prev()}</button>
          {Array.from({length:Math.min(5,total)},(_,i)=>{
            let p=i+1;
            if(total>5){if(pg<=3)p=i+1; else if(pg>=total-2)p=total-4+i; else p=pg-2+i;}
            return <button key={p} className={`ra-pg-btn${pg===p?' active':''}`} onClick={()=>setPg(p)} disabled={loading}>{p}</button>;
          })}
          <button className="ra-pg-btn" onClick={()=>setPg(p=>p+1)} disabled={pg===total||loading}>{Ic.next()}</button>
          <button className="ra-pg-btn" onClick={()=>setPg(total)} disabled={pg===total||loading}>{Ic.next()}{Ic.next()}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB VIEWS
// ─────────────────────────────────────────────────────────────────────────────

// ── BookCard: fetches its own cover directly from Supabase ──
function BookCard({ book, rank, delay, onClick }) {
  const [coverUrl, setCoverUrl] = useState(book.cover_image_url || null);
  const [imgErr,   setImgErr]   = useState(false);

  // If cover_image_url didn't come through the pipeline, fetch it by book_id (exact), then by exact title
  useEffect(() => {
    if (coverUrl) return;
    const fetchByTitle = () => {
      if (!book.title) return;
      supabase.from('books').select('cover_image_url').eq('title', book.title.trim())
        .not('cover_image_url', 'is', null).limit(1).single()
        .then(({ data }) => { if (data?.cover_image_url) setCoverUrl(data.cover_image_url); });
    };
    if (book.book_id) {
      supabase.from('books').select('cover_image_url').eq('id', book.book_id)
        .not('cover_image_url', 'is', null).limit(1).single()
        .then(({ data }) => {
          if (data?.cover_image_url) setCoverUrl(data.cover_image_url);
          else fetchByTitle();
        });
    } else {
      fetchByTitle();
    }
  }, [book.book_id, book.title]);

  const hasImg = coverUrl && !imgErr;
  return (
    <div
      className="ra-book-card"
      style={{animationDelay:`${delay}s`}}
      onClick={onClick}
      title={`Click to view details for "${book.title}"`}
    >
      <div className="ra-book-thumb">
        {hasImg
          ? <img
              src={coverUrl}
              alt={book.title}
              onError={()=>setImgErr(true)}
              style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform .25s'}}
            />
          : <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(245,228,168,0.30)" strokeWidth="1.3">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
        }
        <span className="ra-book-rank">#{rank}</span>
      </div>
      <div className="ra-book-info">
        <div className="ra-book-title" title={book.title}>{book.title}</div>
        <div className="ra-book-count">
          <span className="ra-book-count-dot"/>
          {fmtNum(book.count)} {book.count===1?'borrow':'borrows'}
        </div>
      </div>
    </div>
  );
}

// ── Icons for info cards ──
const LP_ICONS = {
  title:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  author:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  year:     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  isbn:     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M7 8h2M7 12h2M7 16h2M14 8h3M14 12h3M14 16h3"/></svg>,
  pages:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  shelf:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/></svg>,
  genre:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  copies:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  color:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
  date:     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  borrows:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

const RANK_SUFFIXES = ['st','nd','rd','th','th','th','th','th','th','th'];

// ── Single slide in the carousel — fetches its own details ──
function BookModalSlide({ book, rank, period, isActive }) {
  const [coverUrl, setCoverUrl] = useState(book?.cover_image_url || null);
  const [imgErr,   setImgErr]   = useState(false);
  const [details,  setDetails]  = useState(null);

  useEffect(() => {
    if (!book || !isActive) return;
    // Reset for new book
    setCoverUrl(book.cover_image_url || null);
    setImgErr(false);
    setDetails(null);
  }, [book?.book_id, book?.title, isActive]);

  useEffect(() => {
    if (!book || !isActive) return;
    const fetchByTitle = () => {
      if (!book.title) return;
      supabase.from('books').select('cover_image_url').eq('title', (book.title||'').trim())
        .not('cover_image_url', 'is', null).limit(1).single()
        .then(({ data }) => { if (data?.cover_image_url) setCoverUrl(data.cover_image_url); });
    };
    if (!coverUrl) {
      if (book.book_id) {
        supabase.from('books').select('cover_image_url').eq('id', book.book_id)
          .not('cover_image_url', 'is', null).limit(1).single()
          .then(({ data }) => {
            if (data?.cover_image_url) setCoverUrl(data.cover_image_url);
            else fetchByTitle();
          });
      } else {
        fetchByTitle();
      }
    }
  }, [book?.book_id, book?.title, isActive]);

  useEffect(() => {
    if (!book || !isActive) return;
    const fetchDetails = async () => {
      let row = null;
      if (book.book_id) {
        const { data } = await supabase.from('books')
          .select('id,title,author,authors,year_published,isbn,total_pages,pages,shelf_location,genre,copies,available_copies,color,colors,date_added,created_at,cover_image_url,publisher,edition')
          .eq('id', book.book_id).limit(1).single();
        row = data;
      }
      if (!row && book.title) {
        const { data } = await supabase.from('books')
          .select('id,title,author,authors,year_published,isbn,total_pages,pages,shelf_location,genre,copies,available_copies,color,colors,date_added,created_at,cover_image_url,publisher,edition')
          .eq('title', (book.title||'').trim()).limit(1).single();
        row = data;
      }
      if (row) {
        if (row.cover_image_url && !coverUrl) setCoverUrl(row.cover_image_url);
        setDetails(row);
      }
    };
    fetchDetails();
  }, [book?.book_id, book?.title, isActive]);

  const hasImg = coverUrl && !imgErr;
  const d = details || {};
  const author      = d.author || d.authors || book.author || '—';
  const yearPub     = d.year_published || d.year || '—';
  const isbn        = d.isbn || '—';
  const totalPages  = d.total_pages || d.pages || '—';
  const shelfLoc    = d.shelf_location || d.shelf || '—';
  const genre       = d.genre || book.genre || '—';
  const copies      = d.copies != null ? d.copies : (book.copies != null ? book.copies : '—');
  const availCopies = d.available_copies != null ? d.available_copies : (book.available_copies != null ? book.available_copies : '—');
  const colorVal    = d.color || d.colors || '—';
  const dateAdded   = (d.date_added || d.created_at) ? fmtDate(d.date_added || d.created_at) : '—';
  const periodLabel = period==='7d' ? 'Last 7 Days' : period==='30d' ? 'Last 30 Days' : 'Last 1 Year';
  const suffix      = RANK_SUFFIXES[(rank-1) % 10] || 'th';

  const CARDS = [
    { lbl:'Author',         val: author,     icon: LP_ICONS.author },
    { lbl:'Year Published', val: yearPub,    icon: LP_ICONS.year   },
    { lbl:'ISBN',           val: isbn,       icon: LP_ICONS.isbn, small:true },
    { lbl:'Total Pages',    val: totalPages !== '—' ? fmtNum(Number(totalPages)||0) : '—', icon: LP_ICONS.pages },
    { lbl:'Shelf Location', val: shelfLoc,   icon: LP_ICONS.shelf  },
    { lbl:'Genre',          val: genre,      icon: LP_ICONS.genre  },
    { lbl:'Total Copies',   val: copies !== '—' ? `${copies} (${availCopies} avail.)` : '—', icon: LP_ICONS.copies, small:true },
    { lbl:'Book Color',     val: colorVal,   icon: LP_ICONS.color  },
    { lbl:'Total Borrows',  val: `${fmtNum(book.count)} ${book.count===1?'borrow':'borrows'}`, icon: LP_ICONS.borrows },
    { lbl:'Date Added',     val: dateAdded,  icon: LP_ICONS.date, full:true },
  ];

  return (
    <div className="ra-lp-content">
      {/* ── Left: cover panel ── */}
      <div className="ra-lp-left">
        <div className="ra-lp-halo"/>
        <div className="ra-lp-cover-wrap">
          {hasImg
            ? <img src={coverUrl} alt={book.title} onError={()=>setImgErr(true)}/>
            : <div className="ra-lp-cover-ph">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(245,228,168,0.30)" strokeWidth="1.2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
          }
          <div className="ra-lp-rank-badge">
            <span className="ra-lp-rank-badge-num">#{rank}</span>
            <span className="ra-lp-rank-badge-lbl">{rank}{suffix}</span>
          </div>
        </div>
        <div className="ra-lp-borrow-tag">
          <span className="ra-lp-borrow-dot"/>
          {fmtNum(book.count)} borrows
        </div>
      </div>

      {/* ── Right: info panel ── */}
      <div className="ra-lp-right">
        <div className="ra-lp-title-card">
          <div className="ra-lp-rank-label">#{rank} Most Borrowed · {periodLabel}</div>
          <div className="ra-lp-book-name">{book.title}</div>
        </div>
        <div className="ra-lp-cards">
          {CARDS.map((c,i)=>(
            <div key={i} className={`ra-lp-card${c.full?' full':''}`}>
              <div className="ra-lp-card-lbl">{c.icon}&nbsp;{c.lbl}</div>
              <div className={`ra-lp-card-val${c.small?' small':''}`} title={String(c.val)}>{c.val || '—'}</div>
            </div>
          ))}
        </div>
        <div className="ra-lp-period-pill">📊 Popularity data: {periodLabel}</div>
      </div>
    </div>
  );
}

// ── Carousel modal wrapping all top-10 books ──
function BookModal({ book, rank, onClose, period, allBooks }) {
  // currentIdx: index into allBooks array
  const [currentIdx, setCurrentIdx] = useState(
    allBooks ? allBooks.findIndex(b => b === book || b.book_id === book?.book_id || b.title === book?.title) : 0
  );

  const safeIdx   = Math.max(0, Math.min(currentIdx, (allBooks?.length||1) - 1));
  const curBook   = allBooks?.[safeIdx] || book;
  const curRank   = safeIdx + 1;
  const total     = allBooks?.length || 1;

  const goPrev = (e) => { e.stopPropagation(); setCurrentIdx(i => Math.max(0, i-1)); };
  const goNext = (e) => { e.stopPropagation(); setCurrentIdx(i => Math.min(total-1, i+1)); };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setCurrentIdx(i => Math.max(0, i-1));
      if (e.key === 'ArrowRight') setCurrentIdx(i => Math.min(total-1, i+1));
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total, onClose]);

  if (!curBook) return null;

  return (
    <div className="ra-book-modal-overlay" onClick={onClose}>
      <div className="ra-book-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:900}}>
        {/* Library background */}
        <div className="ra-lp-bg"/>
        <div className="ra-lp-spotlight"/>

        {/* Close */}
        <button className="ra-lp-close" onClick={onClose}>✕</button>

        {/* ── Carousel prev button ── */}
        {safeIdx > 0 && (
          <button
            onClick={goPrev}
            title="Previous book"
            style={{
              position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
              zIndex:25, width:36, height:36, borderRadius:'50%',
              background:'rgba(0,0,0,0.60)', border:'1px solid rgba(201,168,76,0.40)',
              color:'rgba(245,228,168,0.90)', fontSize:18, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background .15s, transform .15s',
              backdropFilter:'blur(4px)',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(139,0,0,0.75)';e.currentTarget.style.transform='translateY(-50%) scale(1.08)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0.60)';e.currentTarget.style.transform='translateY(-50%) scale(1)';}}
          >‹</button>
        )}

        {/* ── Carousel next button ── */}
        {safeIdx < total - 1 && (
          <button
            onClick={goNext}
            title="Next book"
            style={{
              position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
              zIndex:25, width:36, height:36, borderRadius:'50%',
              background:'rgba(0,0,0,0.60)', border:'1px solid rgba(201,168,76,0.40)',
              color:'rgba(245,228,168,0.90)', fontSize:18, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background .15s, transform .15s',
              backdropFilter:'blur(4px)',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(139,0,0,0.75)';e.currentTarget.style.transform='translateY(-50%) scale(1.08)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0.60)';e.currentTarget.style.transform='translateY(-50%) scale(1)';}}
          >›</button>
        )}

        {/* ── Dot pagination indicator ── */}
        <div style={{
          position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
          zIndex:25, display:'flex', gap:5, alignItems:'center',
        }}>
          {Array.from({length:total}).map((_,i)=>(
            <button
              key={i}
              onClick={e=>{e.stopPropagation();setCurrentIdx(i);}}
              title={`Book #${i+1}`}
              style={{
                width: i===safeIdx ? 20 : 7,
                height:7, borderRadius:99, border:'none', cursor:'pointer', padding:0,
                background: i===safeIdx ? 'rgba(201,168,76,0.90)' : 'rgba(245,228,168,0.30)',
                transition:'all .22s',
              }}
            />
          ))}
        </div>

        {/* ── Slide content — key forces re-mount & re-fetch on change ── */}
        <BookModalSlide
          key={`${curBook.book_id||curBook.title}-${safeIdx}`}
          book={curBook}
          rank={curRank}
          period={period}
          isActive={true}
        />
      </div>
    </div>
  );
}

// ── Tab: Book Popularity ──
function TabBooks({ data, loading, period }) {
  const { topBooks=[], categoryBorrows=[] } = data;
  const maxB = topBooks[0]?.count || 1;
  const [selectedBook, setSelectedBook] = useState(null);
  const periodLabel = period==='7d'?'Last 7 Days':period==='30d'?'Last 30 Days':'Last 1 Year';
  const totalBorrows = topBooks.reduce((s,b)=>s+b.count,0);

  // ── Drag-to-scroll refs ──
  const stripRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const didDrag = useRef(false);

  // Custom scrollbar state
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(30);
  const trackRef = useRef(null);
  const thumbDragging = useRef(false);
  const thumbStartX = useRef(0);
  const thumbStartScroll = useRef(0);

  const updateThumb = () => {
    const el = stripRef.current;
    if (!el) return;
    const ratio = el.clientWidth / el.scrollWidth;
    const w = Math.max(ratio * 100, 8);
    const left = (el.scrollLeft / el.scrollWidth) * 100;
    setThumbWidth(w);
    setThumbLeft(left);
  };

  // Strip mouse drag handlers
  const onStripMouseDown = (e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    didDrag.current = false;
    startX.current = e.pageX - stripRef.current.offsetLeft;
    scrollLeft.current = stripRef.current.scrollLeft;
    stripRef.current.style.cursor = 'grabbing';
    stripRef.current.style.userSelect = 'none';
  };
  const onStripMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - stripRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    if (Math.abs(walk) > 4) didDrag.current = true;
    stripRef.current.scrollLeft = scrollLeft.current - walk;
    updateThumb();
  };
  const onStripMouseUp = () => {
    isDragging.current = false;
    if (stripRef.current) {
      stripRef.current.style.cursor = 'grab';
      stripRef.current.style.userSelect = '';
    }
  };

  // Thumb drag handlers
  const onThumbMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    thumbDragging.current = true;
    thumbStartX.current = e.clientX;
    thumbStartScroll.current = stripRef.current.scrollLeft;
    document.addEventListener('mousemove', onThumbMouseMove);
    document.addEventListener('mouseup', onThumbMouseUp);
  };
  const onThumbMouseMove = (e) => {
    if (!thumbDragging.current || !trackRef.current || !stripRef.current) return;
    const trackW = trackRef.current.offsetWidth;
    const el = stripRef.current;
    const scrollRatio = el.scrollWidth / trackW;
    const dx = e.clientX - thumbStartX.current;
    el.scrollLeft = thumbStartScroll.current + dx * scrollRatio;
    updateThumb();
  };
  const onThumbMouseUp = () => {
    thumbDragging.current = false;
    document.removeEventListener('mousemove', onThumbMouseMove);
    document.removeEventListener('mouseup', onThumbMouseUp);
  };

  // Arrow buttons
  const scrollBy = (dir) => {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    setTimeout(updateThumb, 320);
  };

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    updateThumb();
    el.addEventListener('scroll', updateThumb);
    window.addEventListener('resize', updateThumb);
    return () => { el.removeEventListener('scroll', updateThumb); window.removeEventListener('resize', updateThumb); };
  }, [topBooks]);

  return (
    <>
      {selectedBook && (
        <BookModal book={selectedBook.book} rank={selectedBook.rank}
          onClose={()=>setSelectedBook(null)} period={period} allBooks={topBooks}/>
      )}



      {/* ── Book cards strip ── */}
      <div className="ra-sh">
        <span className="ra-sh-title">Top 10 Most Borrowed · {periodLabel}</span>
        <span className="ra-sh-meta">Click a book to view details</span>
      </div>

      {/* Strip container */}
      <div style={{
        background:'rgba(139,0,0,0.025)',
        border:'1px solid rgba(139,0,0,0.10)',
        borderRadius:'var(--radius-md)',
        padding:'14px 12px 10px',
        marginBottom:20,
        position:'relative',
      }}>
        {/* Arrow buttons */}
        <div style={{position:'absolute', top:'50%', left:6, transform:'translateY(-60%)', zIndex:10}}>
          <button onClick={()=>scrollBy(-1)} style={{
            width:26, height:26, borderRadius:'50%', border:'1px solid rgba(139,0,0,0.22)',
            background:'var(--cream-light)', color:'var(--maroon-mid)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
            boxShadow:'0 2px 6px rgba(0,0,0,0.10)',
          }}>‹</button>
        </div>
        <div style={{position:'absolute', top:'50%', right:6, transform:'translateY(-60%)', zIndex:10}}>
          <button onClick={()=>scrollBy(1)} style={{
            width:26, height:26, borderRadius:'50%', border:'1px solid rgba(139,0,0,0.22)',
            background:'var(--cream-light)', color:'var(--maroon-mid)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
            boxShadow:'0 2px 6px rgba(0,0,0,0.10)',
          }}>›</button>
        </div>

        {/* Scrollable strip */}
        <div
          ref={stripRef}
          onMouseDown={onStripMouseDown}
          onMouseMove={onStripMouseMove}
          onMouseUp={onStripMouseUp}
          onMouseLeave={onStripMouseUp}
          style={{
            display:'flex',
            gap:16,
            overflowX:'hidden',
            padding:'4px 30px 8px',
            cursor:'grab',
            scrollSnapType:'x mandatory',
            WebkitOverflowScrolling:'touch',
          }}
        >
          {loading
            ? Array.from({length:8}).map((_,i)=>(
                <div key={i} className="ra-book-card" style={{pointerEvents:'none'}}>
                  <div className="ra-sk" style={{height:110,borderRadius:'14px 14px 0 0'}}/>
                  <div style={{padding:'9px 10px',display:'flex',flexDirection:'column',gap:6}}>
                    <div className="ra-sk" style={{height:10,width:'90%',borderRadius:4}}/>
                    <div className="ra-sk" style={{height:10,width:'55%',borderRadius:4}}/>
                  </div>
                </div>
              ))
            : topBooks.length
              ? topBooks.map((b,i)=>(
                  <div key={i} style={{flexShrink:0}} onClick={()=>{ if(!didDrag.current) setSelectedBook({book:b,rank:i+1}); }}>
                    <BookCard book={b} rank={i+1} delay={i*0.05} onClick={()=>{}}/>
                  </div>
                ))
              : <div className="ra-empty" style={{width:'100%'}}>{Ic.empty()}<div className="ra-empty-h">No borrow data</div></div>
          }
        </div>

        {/* Custom drag scrollbar */}
        <div
          ref={trackRef}
          style={{
            margin:'4px 30px 2px',
            height:10,
            background:'rgba(139,0,0,0.08)',
            borderRadius:99,
            position:'relative',
            cursor:'pointer',
          }}
          onClick={(e) => {
            if (thumbDragging.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const clickPct = (e.clientX - rect.left) / rect.width;
            const el = stripRef.current;
            el.scrollLeft = clickPct * el.scrollWidth - el.clientWidth / 2;
            updateThumb();
          }}
        >
          <div
            onMouseDown={onThumbMouseDown}
            style={{
              position:'absolute',
              top:0, bottom:0,
              left:`${thumbLeft}%`,
              width:`${thumbWidth}%`,
              background:'linear-gradient(90deg,#8B0000,#C00000)',
              borderRadius:99,
              cursor:'grab',
              transition:'width 0.1s',
              boxShadow:'0 1px 4px rgba(139,0,0,0.25)',
            }}
          />
        </div>
        <div style={{
          textAlign:'center', fontSize:10.5, color:'var(--text-dim)',
          fontFamily:'var(--font-sans)', marginTop:4, opacity:0.65,
        }}>
          ← drag to scroll →
        </div>
      </div>

      {/* ── Borrow Frequency — full width expanded bar chart ── */}
      <div className="ra-sh"><span className="ra-sh-title">Borrow Frequency</span><span className="ra-sh-meta">{periodLabel}</span></div>
      <div className="ra-panel ra-full" style={{marginBottom:20}}>
        <div className="ra-panel-hd"><span className="ra-panel-title">Top Books Ranking</span><span className="ra-panel-sub">by borrow count</span></div>
        <div className="ra-panel-body" style={{padding:'16px 20px'}}>
          {loading
            ? <div className="ra-sk" style={{height:280,borderRadius:8}}/>
            : topBooks.length
              ? <div className="ra-hbars">
                  {topBooks.map((b,i)=>(
                    <div key={i} className="ra-hbar-row" style={{padding:'7px 0',minHeight:34}}>
                      <span className="ra-hbar-rank" style={{width:32,fontSize:11}}>#{i+1}</span>
                      <span className="ra-hbar-label" style={{width:160,fontSize:12}} title={b.title}>
                        {b.title?.length>22?b.title.slice(0,21)+'…':b.title}
                      </span>
                      <div className="ra-hbar-track" style={{flex:1,height:18,borderRadius:6}}>
                        <div className={`ra-hbar-fill ${FILL_CLASSES[i%FILL_CLASSES.length]}`}
                          style={{'--bw':`${pct(b.count,maxB)}%`,height:'100%',borderRadius:6,animationDelay:`${i*0.05}s`}}/>
                      </div>
                      <span className="ra-hbar-val" style={{width:32,textAlign:'right',fontSize:13,fontWeight:700}}>{fmtNum(b.count)}</span>
                      <span className="ra-hbar-pct" style={{width:44,textAlign:'right',fontSize:11}}>{pct(b.count,maxB)}%</span>
                    </div>
                  ))}
                </div>
              : <div className="ra-empty">{Ic.empty()}<div className="ra-empty-s">No data</div></div>
          }
        </div>
      </div>
    </>
  );
}

// ── Tab: Student Activity ──
function TabStudents({ data, loading, period }) {
  const { topStudents=[], byProgram=[] } = data;
  const periodLabel = period==='7d'?'Last 7 days':period==='30d'?'Last 30 days':'Last 12 months';
  const totalBorrows = topStudents.reduce((s,b)=>s+b.borrows,0);
  const totalReturned = topStudents.reduce((s,b)=>s+b.returned,0);

  const cols = [
    { key:'rank',          label:'Rank',    width:54,   render:v=><span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--maroon-deep)'}}>{v}</span> },
    { key:'student_name',  label:'Student' },
    { key:'student_number',label:'ID No.',  width:110,  render:v=><span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-dim)'}}>{v||'—'}</span> },
    { key:'program',       label:'Program', render:v=><span className="ra-pill blue">{v||'N/A'}</span> },
    { key:'borrows',       label:'Borrows', render:v=><strong style={{color:'var(--maroon-deep)'}}>{v}</strong> },
    { key:'returned',      label:'Returned',render:v=><strong style={{color:'#277A3C'}}>{v}</strong> },
  ];

  return (
    <>
      

      {/* ── Leaderboard + Pie ── */}
      <div className="ra-sh"><span className="ra-sh-title">Most Active Borrowers</span><span className="ra-sh-meta">{periodLabel} · From borrowings history</span></div>
      <div className="ra-two-col" style={{marginBottom:20,alignItems:'stretch'}}>
        <div className="ra-panel" style={{display:'flex',flexDirection:'column'}}>
          <div className="ra-panel-hd"><span className="ra-panel-title">Student Leaderboard</span><span className="ra-panel-sub">Top 10</span></div>
          <div className="ra-panel-body" style={{flex:1,padding:'10px 12px'}}>
            {loading
              ? <div className="ra-sk" style={{height:300,borderRadius:8}}/>
              : topStudents.length
                ? <div className="ra-leader">
                    {topStudents.slice(0,10).map((s,i)=>(
                      <div key={i} className="ra-leader-row">
                        <span className={`ra-leader-rank${i===0?' top1':i===1?' top2':i===2?' top3':''}`}>
                          {i<3?['🥇','🥈','🥉'][i]:`#${i+1}`}
                        </span>
                        <div className="ra-leader-avatar">{initials(s.student_name)}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="ra-leader-name">{s.student_name||'Unknown'}</div>
                          <div className="ra-leader-sub">{s.program||''}</div>
                        </div>
                        <span className="ra-leader-badge">{fmtNum(s.borrows)}</span>
                      </div>
                    ))}
                  </div>
                : <div className="ra-empty">{Ic.empty()}<div className="ra-empty-s">No borrowing history yet</div></div>
            }
          </div>
        </div>

        <div className="ra-panel" style={{display:'flex',flexDirection:'column'}}>
          <div className="ra-panel-hd"><span className="ra-panel-title">By Program / Course</span><span className="ra-panel-sub">borrow distribution</span></div>
          <div className="ra-panel-body" style={{
            flex:1,padding:'20px 16px',minHeight:380,
            display:'flex',alignItems:'center',justifyContent:'center',
          }}>
            {loading
              ? <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:320}}><div className="ra-sk" style={{height:260,width:260,borderRadius:'50%'}}/></div>
              : byProgram.length
                ? <PieChart
                    data={byProgram.slice(0,6).map((p,i)=>({label:p.program||'N/A',value:p.count,color:CATEGORY_COLORS[i%CATEGORY_COLORS.length]}))}
                    size={300}
                  />
                : <div className="ra-empty">{Ic.empty()}<div className="ra-empty-s">No program data</div></div>
            }
          </div>
        </div>
      </div>

      {/* ── Full table ── */}
      <div className="ra-sh"><span className="ra-sh-title">Full Student Borrow Report</span></div>
      <RaTable title="Student Activity" cols={cols} rows={topStudents} loading={loading} pageSize={10} exportable/>
    </>
  );
}

// ── Tab: Trends ──
// ── Monotone cubic Bézier path helper ────────────────────────────────────────
function monotoneCurvePath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  const n = pts.length;
  const dx = [], dy = [], slope = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i]    = pts[i+1].x - pts[i].x;
    dy[i]    = pts[i+1].y - pts[i].y;
    slope[i] = dy[i] / dx[i];
  }
  m[0] = slope[0];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i-1] * slope[i] <= 0 ? 0 : (slope[i-1] + slope[i]) / 2;
  }
  m[n-1] = slope[n-2];
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = m[i+1] = 0; continue; }
    const a = m[i] / slope[i], b = m[i+1] / slope[i], s = a*a + b*b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t*a*slope[i]; m[i+1] = t*b*slope[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    d += ` C${pts[i].x+h/3},${pts[i].y+m[i]*h/3} ${pts[i+1].x-h/3},${pts[i+1].y-m[i+1]*h/3} ${pts[i+1].x},${pts[i+1].y}`;
  }
  return d;
}

// ── Multi-Line Borrowing Activity Trend Chart ─────────────────────────────────
function BorrowingActivityTrendChart({ reqData=[], borrData=[], retData=[], loading, selectedSeries, onSeriesSelect }) {
  const wrapRef = useRef(null);
  const [hovIdx, setHovIdx] = useState(null);

  // Align all series on shared labels
  const allLabels = (() => {
    const seen = new Set(), out = [];
    [...reqData, ...borrData, ...retData].forEach(d => { if (!seen.has(d.label)) { seen.add(d.label); out.push(d.label); } });
    return out;
  })();

  const SERIES = [
    { key:'borr', label:'Borrowed', color:'#C0152A', data: borrData },
    { key:'ret',  label:'Returned', color:'#F5A623', data: retData  },
    { key:'req',  label:'Request',  color:'#22C5C5', data: reqData  },
  ];

  const lookup = {};
  SERIES.forEach(s => { lookup[s.key] = {}; s.data.forEach(d => { lookup[s.key][d.label] = d.value; }); });

  // SVG layout
  const PAD_L=62, PAD_R=24, PAD_T=30, PAD_B=52;
  const VW=880, CH=220, VH=CH+PAD_T+PAD_B;
  const CW=VW-PAD_L-PAD_R;

  const allVals = SERIES.flatMap(s => s.data.map(d => d.value));
  const rawMax  = allVals.length ? Math.max(...allVals) : 4;
  const yStep   = rawMax <= 10 ? 1 : rawMax <= 30 ? 5 : rawMax <= 60 ? 10 : Math.ceil(rawMax/6/5)*5;
  const yMax    = Math.max(Math.ceil(rawMax/yStep)*yStep + yStep, 4);

  const xOf = i => PAD_L + (allLabels.length <= 1 ? CW/2 : (i/(allLabels.length-1))*CW);
  const yOf = v => PAD_T + CH - (v/yMax)*CH;

  // Y ticks — evenly spaced
  const yTickCount = Math.min(7, Math.floor(yMax/yStep)+1);
  const yTicks = Array.from({length: yTickCount}, (_,i) => {
    const v = Math.round((yMax / (yTickCount-1)) * i);
    return { v, y: yOf(v) };
  });

  // Per-series points
  const seriesPts = SERIES.map(s => ({
    ...s,
    pts: allLabels.map((lbl,i) => ({ x: xOf(i), y: yOf(lookup[s.key][lbl]??0), value: lookup[s.key][lbl]??0, lbl, i })),
  }));

  // Hover hit zones: one vertical band per x
  const bandW = allLabels.length > 1 ? CW/(allLabels.length-1) : CW;

  if (loading) return <div className="ra-sk" style={{height:320,borderRadius:8}}/>;
  if (!allLabels.length) return (
    <div className="ra-empty" style={{padding:32,textAlign:'center'}}>
      <div className="ra-empty-s">No data for this period</div>
    </div>
  );

  const hasSelection = selectedSeries !== null;

  return (
    <div ref={wrapRef} style={{userSelect:'none', position:'relative', background:'var(--cream-light)', borderRadius:'0 0 var(--radius-md) var(--radius-md)'}}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{width:'100%', height:'auto', display:'block', overflow:'visible'}}
        onMouseLeave={() => setHovIdx(null)}
      >
        <defs>
          {/* Subtle area gradient for selected line */}
          {SERIES.map(s => (
            <linearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18"/>
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01"/>
            </linearGradient>
          ))}
        </defs>

        {/* Y grid lines + labels */}
        {yTicks.map(({v,y}) => (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={PAD_L+CW} y2={y}
              stroke={v===0 ? 'rgba(139,0,0,0.18)' : 'rgba(0,0,0,0.065)'}
              strokeWidth={v===0 ? 1.2 : 1}
              strokeDasharray={v===0 ? 'none' : '5,5'}
            />
            <text x={PAD_L-10} y={y} textAnchor="end" dominantBaseline="middle"
              style={{fontFamily:'var(--font-sans)',fontSize:9.5,fill:'rgba(80,0,0,0.45)',fontWeight:500}}>
              {v}
            </text>
          </g>
        ))}

        {/* Y-axis left border */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T+CH} stroke="rgba(139,0,0,0.15)" strokeWidth="1.2"/>

        {/* Y-axis rotated label */}
        <text x={13} y={PAD_T+CH/2} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90,13,${PAD_T+CH/2})`}
          style={{fontFamily:'var(--font-sans)',fontSize:9.5,fill:'rgba(80,0,0,0.50)',fontWeight:600,letterSpacing:'0.04em'}}>
          Number of Books
        </text>

        {/* Hover vertical rule */}
        {hovIdx !== null && (
          <line x1={xOf(hovIdx)} y1={PAD_T} x2={xOf(hovIdx)} y2={PAD_T+CH}
            stroke="rgba(0,0,0,0.14)" strokeWidth="1.2" strokeDasharray="3,3"/>
        )}

        {/* Area fill for selected series (rendered below lines) */}
        {hasSelection && seriesPts.filter(s => s.key === selectedSeries).map(s => {
          const areaPath = monotoneCurvePath(s.pts)
            + ` L${s.pts[s.pts.length-1].x},${PAD_T+CH} L${s.pts[0].x},${PAD_T+CH} Z`;
          return (
            <path key={`area-${s.key}`}
              d={areaPath}
              fill={`url(#grad-${s.key})`}
              stroke="none"
            />
          );
        })}

        {/* Lines — blurred when another is selected */}
        {seriesPts.map(s => {
          const isSelected = selectedSeries === s.key;
          const isBlurred  = hasSelection && !isSelected;
          return (
            <path key={s.key}
              d={monotoneCurvePath(s.pts)}
              fill="none"
              stroke={isBlurred ? s.color : s.color}
              strokeWidth={isSelected ? 3 : isBlurred ? 1.8 : 2.4}
              strokeOpacity={isBlurred ? 0.22 : 1}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{transition:'stroke-opacity 0.25s, stroke-width 0.25s'}}
            />
          );
        })}

        {/* Markers + value labels */}
        {seriesPts.map((s) => {
          const isSelected = selectedSeries === s.key;
          const isBlurred  = hasSelection && !isSelected;
          return s.pts.map((p,i) => {
            const isHov = hovIdx === i;
            const rBase = isSelected ? 5 : isBlurred ? 3.5 : 4.5;
            const r     = isHov ? rBase + 1.5 : rBase;
            return (
              <g key={`${s.key}-${i}`} style={{transition:'opacity 0.25s'}} opacity={isBlurred ? 0.25 : 1}>
                {isHov && !isBlurred && (
                  <circle cx={p.x} cy={p.y} r={r+5} fill={s.color} opacity={0.12}/>
                )}
                <circle cx={p.x} cy={p.y} r={r}
                  fill={s.color} stroke="#fff" strokeWidth={isSelected ? 2.5 : 1.8}
                  style={{transition:'r 0.15s'}}
                />
                {/* Value label — show on hover or if selected */}
                {(isHov || isSelected) && !isBlurred && (
                  <text x={p.x} y={p.y - r - 6} textAnchor="middle"
                    style={{fontFamily:'var(--font-sans)',fontSize:isSelected?10.5:10,fontWeight:700,fill:s.color}}>
                    {p.value}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* X-axis ticks + labels */}
        {allLabels.map((lbl,i) => {
          const x = xOf(i);
          const skip = allLabels.length > 12 ? Math.ceil(allLabels.length/8) : 1;
          if (i % skip !== 0 && i !== allLabels.length-1) return null;
          return (
            <g key={lbl}>
              <line x1={x} y1={PAD_T+CH} x2={x} y2={PAD_T+CH+5}
                stroke="rgba(139,0,0,0.20)" strokeWidth="1"/>
              <text x={x} y={PAD_T+CH+17} textAnchor="middle"
                style={{fontFamily:'var(--font-sans)',fontSize:9,
                  fill: hovIdx===i ? 'rgba(80,0,0,0.85)' : 'rgba(80,0,0,0.45)',
                  fontWeight: hovIdx===i ? 700 : 400}}>
                {lbl}
              </text>
            </g>
          );
        })}

        {/* X-axis label */}
        <text x={PAD_L+CW/2} y={VH-3} textAnchor="middle"
          style={{fontFamily:'var(--font-sans)',fontSize:10,fill:'rgba(80,0,0,0.52)',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase'}}>
          DATE
        </text>

        {/* Invisible hover bands */}
        {allLabels.map((_,i) => (
          <rect key={`hb-${i}`}
            x={xOf(i) - bandW/2} y={PAD_T}
            width={bandW} height={CH}
            fill="transparent"
            style={{cursor:'crosshair'}}
            onMouseEnter={() => setHovIdx(i)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hovIdx !== null && (() => {
        const pctX = (xOf(hovIdx)/VW)*100;
        const tipSeries = hasSelection
          ? SERIES.filter(s => s.key === selectedSeries)
          : SERIES;
        return (
          <div className="ra-spark-tip" style={{
            position:'absolute', top:10, pointerEvents:'none', zIndex:20,
            left:`${pctX}%`,
            transform: pctX>72 ? 'translateX(-110%)' : pctX<18 ? 'translateX(6%)' : 'translateX(-50%)',
            minWidth:160,
          }}>
            <div style={{fontFamily:'var(--font-sans)',fontSize:11,color:'rgba(245,228,168,0.90)',marginBottom:7,fontWeight:700,borderBottom:'1px solid rgba(255,255,255,0.12)',paddingBottom:5}}>
              📅 {allLabels[hovIdx]}
            </div>
            {tipSeries.map(s => (
              <div key={s.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,marginBottom:4}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:9,height:9,borderRadius:'50%',background:s.color,flexShrink:0,boxShadow:`0 0 4px ${s.color}`}}/>
                  <span style={{fontFamily:'var(--font-sans)',fontSize:10.5,color:'rgba(245,228,168,0.75)'}}>{s.label}</span>
                </div>
                <span style={{fontFamily:'var(--font-sans)',fontSize:12,fontWeight:800,color:s.color,textShadow:`0 0 8px ${s.color}55`}}>
                  {lookup[s.key][allLabels[hovIdx]]??0}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function TabTrends({ data, loading, period, setPeriod }) {
  const [selectedSeries, setSelectedSeries] = useState(null);
  const trendData  = data[`req_${period}`]    || [];
  const borrowData = data[`borrow_${period}`] || [];
  const returnData = data[`return_${period}`] || [];
  const periodLabel = period==='7d'?'Daily — last 7 days':period==='30d'?'Weekly — last 30 days':'Monthly — last 12 months';

  const peakReq  = trendData.length  ? trendData.reduce((a,b)=>b.value>a.value?b:a,trendData[0])   : null;
  const totalReq  = trendData.reduce((s,d)=>s+d.value,0);
  const totalBorr = borrowData.reduce((s,d)=>s+d.value,0);
  const totalRet  = returnData.reduce((s,d)=>s+d.value,0);

  return (
    <>
      {/* Section header + period switcher */}
      <div className="ra-sh" style={{marginBottom:18}}>
        <span className="ra-sh-title">Borrowing Trends</span>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontFamily:'var(--font-sans)',fontSize:11,color:'var(--text-dim)'}}>{periodLabel}</span>
          <div className="ra-period">
            {[['7d','Daily (7d)'],['30d','Weekly (30d)'],['1y','Monthly (1y)']].map(([v,l])=>(
              <button key={v} className={`ra-p-btn${period===v?' active':''}`} onClick={()=>setPeriod(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary mini-stats */}
      {!loading && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
          {[
            {label:'Peak Request Period', val:peakReq?.label||'—',   sub:`${fmtNum(peakReq?.value||0)} requests`,   ac:'#8B0000', ic:Ic.trend},
            {label:'Total Requests',      val:fmtNum(totalReq),      sub:'borrow requests in period',               ac:'#9A5500', ic:Ic.borrowed},
            {label:'Total Returns',       val:fmtNum(totalRet),      sub:'books returned in period',                ac:'#277A3C', ic:Ic.return},
          ].map((c,i)=>(
            <div key={i} className="ra-stat" style={{'--ra-ac':c.ac,animationDelay:`${i*0.06}s`}}>
              <div className="ra-stat-ico">{c.ic(34)}</div>
              <div className="ra-stat-lbl">{c.label}</div>
              <div className="ra-stat-val" style={{fontSize:i===0?18:26,letterSpacing:i===0?'0':'inherit'}}>{c.val}</div>
              <div className="ra-stat-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── BORROWING ACTIVITY TREND — combined multi-line chart ── */}
      <div className="ra-panel ra-full">
        <div className="ra-panel-hd" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div>
            <span className="ra-panel-title">Borrowing Activity Trend</span>
            <span className="ra-panel-sub" style={{marginLeft:10}}>Compare requests, borrowed, and returned over time.</span>
          </div>
        </div>
        <div className="ra-panel-body" style={{paddingBottom:8,background:'var(--cream-light)',position:'relative'}}>
          {/* Floating legend toggles — centered at top of chart, matching screenshot */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,flexWrap:'wrap',marginBottom:8}}>
            {[
              {key:'borr', label:'Borrowed', color:'#C0152A'},
              {key:'ret',  label:'Returned', color:'#F5A623'},
              {key:'req',  label:'Request',  color:'#22C5C5'},
            ].map(l => {
              const isActive = selectedSeries === l.key;
              const isNone   = selectedSeries === null;
              const dimmed   = !isNone && !isActive;
              return (
                <button
                  key={l.key}
                  onClick={() => setSelectedSeries(isActive ? null : l.key)}
                  style={{
                    display:'flex', alignItems:'center', gap:7,
                    padding:'5px 14px', borderRadius:99,
                    border: `1.5px solid ${isActive ? l.color : 'rgba(139,0,0,0.18)'}`,
                    background: isActive ? `${l.color}14` : 'rgba(255,255,255,0.80)',
                    cursor:'pointer', transition:'all 0.18s',
                    opacity: dimmed ? 0.38 : 1,
                    outline:'none',
                    boxShadow: isActive ? `0 2px 8px ${l.color}28` : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <svg width="20" height="10" style={{flexShrink:0}}>
                    <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth={isActive?2.5:2}/>
                    <circle cx="10" cy="5" r={isActive?4:3.5} fill={l.color}/>
                  </svg>
                  <span style={{
                    fontFamily:'var(--font-sans)', fontSize:11.5, fontWeight: isActive ? 700 : 500,
                    color: isActive ? l.color : '#555',
                    whiteSpace:'nowrap',
                  }}>{l.label}</span>
                </button>
              );
            })}
          </div>
          <BorrowingActivityTrendChart
            reqData={trendData}
            borrData={borrowData}
            retData={returnData}
            loading={loading}
            selectedSeries={selectedSeries}
            onSeriesSelect={setSelectedSeries}
          />
        </div>
      </div>
    </>
  );
}

// ── Tab: Unreturned ──
function TabOverdue({ data, loading }) {
  const { overdueList=[], byGenre=[] } = data;
  const maxO = byGenre[0]?.count || 1;
  const longestOut = overdueList.length ? Math.max(...overdueList.map(o=>o.days_out||0)) : 0;

  const cols = [
    { key:'student_name',   label:'Student',     width:'22%' },
    { key:'student_number', label:'ID No.',      width:'12%', render:v=><span style={{fontFamily:'monospace',fontSize:11}}>{v||'—'}</span> },
    { key:'book_title',     label:'Book',        width:'28%' },
    { key:'genre',          label:'Genre',       width:'13%', render:v=>v?<span className="ra-pill purple">{v}</span>:'—' },
    { key:'borrowed_date',  label:'Borrowed On' },
    { key:'days_out',       label:'Days Out',    render:v=><span style={{color:v>14?'#8B0000':'#9A5500',fontWeight:700}}>{v}</span> },
    { key:'status_badge',   label:'Status',      render:(_,row)=>row.days_out>14?<span className="ra-pill red">Long Overdue</span>:<span className="ra-pill amber">Unreturned</span> },
  ];

  return (
    <>
      {/* Stats */}
      <div className="ra-stat-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:20}}>
        {[
          {label:'Unreturned Books',    val:fmtNum(overdueList.length),                                    sub:'currently not returned',  ac:'#8B0000', ic:Ic.alert},
          {label:'Students with Books', val:fmtNum(new Set(overdueList.map(o=>o.student_name)).size),      sub:'unique borrowers',        ac:'#9A5500', ic:Ic.users},
          {label:'Longest Overdue',     val:overdueList.length?`${longestOut} days`:'—',                   sub:'days since borrow date',  ac:'#7B0000', ic:Ic.pending},
        ].map((c,i)=>(
          <div key={i} className="ra-stat ra-alert-stat" style={{'--ra-ac':c.ac}}>
            <div className="ra-stat-ico">{c.ic(36)}</div>
            <div className="ra-stat-lbl">{c.label}</div>
            <div className="ra-stat-val">{loading?<div className="ra-sk" style={{height:26,width:60}}/>:c.val}</div>
            <div className="ra-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="ra-sh"><span className="ra-sh-title">Unreturned Analysis</span></div>
      <div className="ra-two-col" style={{marginBottom:20}}>
        <div className="ra-panel">
          <div className="ra-panel-hd"><span className="ra-panel-title">Unreturned by Genre</span><span className="ra-panel-sub">count per genre</span></div>
          <div className="ra-panel-body">
            {loading
              ? <div className="ra-sk" style={{height:160,borderRadius:8}}/>
              : byGenre.length
                ? <div className="ra-hbars">
                    {byGenre.map((c,i)=>(
                      <div key={i} className="ra-hbar-row">
                        <span className="ra-hbar-label">{(c.genre||'Unknown').slice(0,16)}</span>
                        <div className="ra-hbar-track">
                          <div className="ra-hbar-fill" style={{'--bw':`${pct(c.count,maxO)}%`,background:CATEGORY_COLORS[i%CATEGORY_COLORS.length]}}/>
                        </div>
                        <span className="ra-hbar-val">{fmtNum(c.count)}</span>
                      </div>
                    ))}
                  </div>
                : <div className="ra-empty">{Ic.empty()}<div className="ra-empty-s">No unreturned books</div></div>
            }
          </div>
        </div>
        <div className="ra-panel">
          <div className="ra-panel-hd"><span className="ra-panel-title">Genre Distribution</span><span className="ra-panel-sub">pie view</span></div>
          <div className="ra-panel-body" style={{padding:'20px 16px',minHeight:280,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {loading
              ? <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:220}}><div className="ra-sk" style={{height:200,width:200,borderRadius:'50%'}}/></div>
              : byGenre.length
                ? <PieChart
                    data={byGenre.slice(0,6).map((c,i)=>({label:c.genre||'Unknown',value:c.count,color:CATEGORY_COLORS[i%CATEGORY_COLORS.length]}))}
                    size={240}
                  />
                : <div className="ra-empty">{Ic.empty()}<div className="ra-empty-s">All books returned</div></div>
            }
          </div>
        </div>
      </div>

      <div className="ra-sh"><span className="ra-sh-title">Unreturned Books Detail</span></div>
      <RaTable title="Unreturned Books" cols={cols} rows={overdueList} loading={loading} pageSize={8} exportable/>
    </>
  );
}

// ── Tab: Availability ──
function TabAvailability({ data, loading }) {
  const { availability=[], allBooks=[] } = data;
  const total = availability.reduce((s,d)=>s+d.value,0)||1;

  const cols = [
    { key:'title',            label:'Book Title',   width:'36%' },
    { key:'genre',            label:'Genre',        render:v=>v?<span className="ra-pill purple">{v}</span>:'—' },
    { key:'available_copies', label:'Available',    render:v=><strong style={{color:'#277A3C'}}>{v??0}</strong> },
    { key:'total_copies',     label:'Total Copies', render:v=><strong>{v??0}</strong> },
    { key:'status_label',     label:'Status',
      render:(_,row)=>{
        const a=row.available_copies??0,t=row.total_copies??0;
        if(a===0&&t>0) return <span className="ra-pill red">All Out</span>;
        if(a===t)      return <span className="ra-pill green">All In</span>;
        return <span className="ra-pill amber">Partial</span>;
      }
    },
  ];

  const statusRows = [
    {label:'All In',    val:allBooks.filter(b=>(b.available_copies??0)===b.total_copies&&b.total_copies>0).length, color:'#277A3C', pill:'green'},
    {label:'Partial',   val:allBooks.filter(b=>(b.available_copies??0)>0&&(b.available_copies??0)<b.total_copies).length, color:'#9A5500', pill:'amber'},
    {label:'All Out',   val:allBooks.filter(b=>(b.available_copies??0)===0&&b.total_copies>0).length, color:'#8B0000', pill:'red'},
    {label:'No Copies', val:allBooks.filter(b=>b.total_copies===0).length, color:'#555', pill:'grey'},
  ];
  const availRate = pct(availability[0]?.value||0, total);

  return (
    <>
      {/* Quick summary stats */}
      <div className="ra-stat-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:20}}>
        {statusRows.map((r,i)=>(
          <div key={i} className="ra-stat" style={{'--ra-ac':r.color}}>
            <div className="ra-stat-ico">{Ic.books(34)}</div>
            <div className="ra-stat-lbl">{r.label}</div>
            <div className="ra-stat-val">{loading?<div className="ra-sk" style={{height:26,width:40}}/>:fmtNum(r.val)}</div>
            <div className="ra-stat-sub">titles</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="ra-sh"><span className="ra-sh-title">Collection Status Overview</span></div>
      <div className="ra-two-col" style={{marginBottom:20,alignItems:'stretch'}}>
        <div className="ra-panel" style={{display:'flex',flexDirection:'column'}}>
          <div className="ra-panel-hd"><span className="ra-panel-title">Availability Breakdown</span><span className="ra-panel-sub">pie view</span></div>
          <div className="ra-panel-body" style={{flex:1,padding:'20px 16px',minHeight:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {loading
              ? <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:260}}><div className="ra-sk" style={{height:220,width:220,borderRadius:'50%'}}/></div>
              : availability.length
                ? <PieChart data={availability} size={260}/>
                : <div className="ra-empty">{Ic.empty()}<div className="ra-empty-s">No book data</div></div>
            }
          </div>
        </div>
        <div className="ra-panel" style={{display:'flex',flexDirection:'column'}}>
          <div className="ra-panel-hd"><span className="ra-panel-title">Quick Status Summary</span><span className="ra-panel-sub">{fmtNum(allBooks.length)} total titles</span></div>
          <div className="ra-panel-body" style={{flex:1}}>
            {loading
              ? <div className="ra-sk" style={{height:160,borderRadius:8}}/>
              : <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {statusRows.map((r,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'10px 14px',borderRadius:8,
                      background:'rgba(139,0,0,0.03)',border:'1px solid rgba(139,0,0,0.08)'}}>
                      <span className={`ra-pill ${r.pill}`}>{r.label}</span>
                      <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:22,color:r.color}}>{fmtNum(r.val)}</span>
                    </div>
                  ))}
                  <div style={{marginTop:6,padding:'8px 14px',borderRadius:8,background:'rgba(139,0,0,0.06)',
                    fontFamily:'var(--font-sans)',fontSize:12,color:'var(--text-dim)',textAlign:'center',fontWeight:600}}>
                    {availRate}% availability rate across catalogue
                  </div>
                </div>
            }
          </div>
        </div>
      </div>

      <div className="ra-sh"><span className="ra-sh-title">Book Availability Detail</span></div>
      <RaTable
        title="Book Availability" cols={cols} rows={allBooks}
        loading={loading} pageSize={10}
        filterable={{key:'status_key',label:'Status',options:[
          {value:'available',label:'Available'},{value:'out',label:'All Out'},{value:'partial',label:'Partial'}
        ]}}
        exportable
      />
    </>
  );
}

// ── Tab: Transactions ──
function TabTransactions({ data, loading }) {
  const { transactions=[] } = data;
  const borrowed  = transactions.filter(t=>t.status==='Borrowed').length;
  const returned  = transactions.filter(t=>t.status==='Returned').length;
  const pending   = transactions.filter(t=>t.status==='pending').length;

  const cols = [
    { key:'student_name',   label:'Student',  width:'20%' },
    { key:'student_number', label:'ID No.',   width:'11%', render:v=><span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-dim)'}}>{v||'—'}</span> },
    { key:'book_title',     label:'Book',     width:'28%' },
    { key:'genre',          label:'Genre',    width:'12%', render:v=>v?<span className="ra-pill purple" style={{fontSize:9.5}}>{v}</span>:'—' },
    { key:'date_display',   label:'Date' },
    { key:'source',         label:'Source',   width:'10%', render:v=><span className="ra-pill grey" style={{fontSize:9}}>{v}</span> },
    { key:'status',         label:'Status',
      render:v=>{
        const m={Borrowed:'amber',Returned:'green',approved:'blue',pending:'amber',rejected:'red'};
        return <span className={`ra-pill ${m[v]||'grey'}`}>{v}</span>;
      }
    },
  ];

  return (
    <>
      {/* Quick stats */}
      <div className="ra-stat-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:20}}>
        {[
          {label:'Total Transactions', val:fmtNum(transactions.length), sub:'all records combined',          ac:'#8B0000', ic:Ic.trend},
          {label:'Currently Borrowed', val:fmtNum(borrowed),            sub:'active unreturned check-outs', ac:'#9A5500', ic:Ic.borrowed},
          {label:'Pending Requests',   val:fmtNum(pending),             sub:'awaiting approval',            ac:'#C9A84C', ic:Ic.pending},
        ].map((c,i)=>(
          <div key={i} className="ra-stat" style={{'--ra-ac':c.ac}}>
            <div className="ra-stat-ico">{c.ic(34)}</div>
            <div className="ra-stat-lbl">{c.label}</div>
            <div className="ra-stat-val">{loading?<div className="ra-sk" style={{height:26,width:60}}/>:c.val}</div>
            <div className="ra-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="ra-sh">
        <span className="ra-sh-title">All Transactions</span>
        <span className="ra-sh-meta">{fmtNum(transactions.length)} records · borrowings + requests</span>
      </div>
      <RaTable
        title="Transactions" cols={cols} rows={transactions}
        loading={loading} pageSize={10}
        filterable={{key:'status',label:'Status',options:[
          {value:'Borrowed', label:'Borrowed'},
          {value:'Returned', label:'Returned'},
          {value:'approved', label:'Approved (request)'},
          {value:'pending',  label:'Pending (request)'},
          {value:'rejected', label:'Rejected (request)'},
        ]}}
        exportable
      />
    </>
  );
}

// ── Tab: Attendance ──
function DailyVisitReportChart({ data=[], period='30d' }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  const [hovIdx, setHovIdx] = useState(null);

  if (!data.length) return (
    <div className="ra-empty" style={{padding:32,textAlign:'center',color:'#666'}}>
      No attendance data for this period
    </div>
  );

  // Layout
  const PAD_L = 64, PAD_R = 48, PAD_T = 32, PAD_B = 44;
  const VW = 1100, VH = 220 + PAD_T + PAD_B;
  const CW = VW - PAD_L - PAD_R;
  const CH = 220;

  const maxV = Math.max(...data.map(d => d.value), 1);

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({length: yTickCount + 1}, (_, i) => {
    const f = i / yTickCount;
    return { v: Math.round(maxV * f), y: PAD_T + CH - f * CH };
  });

  // Plot points
  const pts = data.map((d, i) => ({
    x: PAD_L + (i / Math.max(data.length - 1, 1)) * CW,
    y: PAD_T + CH - (d.value / maxV) * CH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  // Light fill area
  const areaPath = `M${pts[0].x.toFixed(2)},${(PAD_T+CH).toFixed(2)} ` +
    pts.map(p => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') +
    ` L${pts[pts.length-1].x.toFixed(2)},${(PAD_T+CH).toFixed(2)} Z`;

  // Decide which x-axis labels to show
  const maxXLabels = data.length <= 7 ? data.length : 7;
  const labelStep = Math.max(1, Math.floor((data.length - 1) / (maxXLabels - 1)));
  const showXLabel = i => i === 0 || i === data.length - 1 || i % labelStep === 0;

  // Decide which data point labels to show (peak + zero crossings + notable)
  const peakIdx = data.reduce((best, d, i) => d.value > data[best].value ? i : best, 0);
  const shouldShowLabel = (d, i) => {
    if (d.value === 0) return false;
    if (i === peakIdx) return true;
    if (i === 0 || i === data.length - 1) return d.value > 0;
    // Show if local max among neighbors
    const prev = data[i-1]?.value ?? -1;
    const next = data[i+1]?.value ?? -1;
    if (d.value > prev && d.value > next && d.value >= 2) return true;
    return false;
  };

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VW;
    const relX = svgX - PAD_L;
    const idx = Math.round((relX / CW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setHovIdx(clamped);
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, d: data[clamped] });
  };

  return (
    <div style={{position:'relative', userSelect:'none', width:'100%'}} ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setTip(null); setHovIdx(null); }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:'100%', height:'auto', display:'block', minHeight:200}}>
        <defs>
          <linearGradient id="dvt-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B0000" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#8B0000" stopOpacity="0.01"/>
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x={PAD_L} y={PAD_T} width={CW} height={CH} fill="rgba(250,246,238,0.6)"/>

        {/* Horizontal dashed grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L} y1={t.y} x2={PAD_L + CW} y2={t.y}
              stroke={i === 0 ? '#bbb' : '#ddd'}
              strokeWidth={i === 0 ? 1.2 : 1}
              strokeDasharray={i === 0 ? 'none' : '4,5'}
            />
            <text
              x={PAD_L - 8} y={t.y}
              textAnchor="end" dominantBaseline="middle"
              style={{fontFamily:'Georgia,serif', fontSize:10, fill:'#555', fontWeight:400}}
            >
              {t.v}
            </text>
          </g>
        ))}

        {/* Y-axis left border */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T+CH} stroke="#999" strokeWidth="1.2"/>

        {/* Y-axis label */}
        <text
          x={14} y={PAD_T + CH/2}
          textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90, 14, ${PAD_T + CH/2})`}
          style={{fontFamily:'Georgia,serif', fontSize:9.5, fill:'#444', letterSpacing:'0.08em', fontWeight:600}}
        >
          Y-AXIS: VISITORS
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#dvt-area-grad)"/>

        {/* Line */}
        <path d={linePath} fill="none" stroke="#8B0000" strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* Data point circles + value labels */}
        {pts.map((p, i) => {
          const isHov = hovIdx === i;
          const showLbl = shouldShowLabel(data[i], i);
          return (
            <g key={i}>
              {/* Circle marker */}
              <circle cx={p.x} cy={p.y} r={isHov ? 6 : 4}
                fill={isHov ? '#8B0000' : '#fff'}
                stroke="#8B0000" strokeWidth={isHov ? 2.5 : 2}
              />
              {/* Value label above notable points */}
              {showLbl && (
                <text x={p.x} y={p.y - 10}
                  textAnchor="middle" dominantBaseline="auto"
                  style={{fontFamily:'Georgia,serif', fontSize:11, fill:'#8B0000', fontWeight:700}}
                >
                  {data[i].value}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover vertical rule */}
        {hovIdx !== null && (
          <line
            x1={pts[hovIdx].x} y1={PAD_T}
            x2={pts[hovIdx].x} y2={PAD_T+CH}
            stroke="rgba(139,0,0,0.25)" strokeWidth="1" strokeDasharray="3,3"
          />
        )}

        {/* X-axis labels */}
        {pts.map((p, i) => showXLabel(i) && (
          <text key={i} x={p.x} y={PAD_T + CH + 14}
            textAnchor="middle" dominantBaseline="hanging"
            style={{fontFamily:'Georgia,serif', fontSize:9, fill:'#555'}}
          >
            {data[i].label}
          </text>
        ))}

        {/* X-axis label */}
        <text
          x={PAD_L + CW / 2} y={VH - 6}
          textAnchor="middle" dominantBaseline="auto"
          style={{fontFamily:'Georgia,serif', fontSize:9.5, fill:'#444', letterSpacing:'0.08em', fontWeight:600}}
        >
          X-AXIS: DATE
        </text>

        {/* Chart border */}
        <rect x={PAD_L} y={PAD_T} width={CW} height={CH}
          fill="none" stroke="#ccc" strokeWidth="1"/>
      </svg>

      {/* Tooltip — flips left when near right edge */}
      {tip && (() => {
        const containerWidth = ref.current ? ref.current.offsetWidth : 600;
        const nearRight = tip.x > containerWidth * 0.72;
        return (
          <div style={{
            position:'absolute', pointerEvents:'none', zIndex:20,
            left: nearRight ? 'auto' : tip.x + 14,
            right: nearRight ? (containerWidth - tip.x + 8) : 'auto',
            top: Math.max(4, tip.y - 18),
            background:'rgba(20,10,10,0.92)',
            border:'1px solid rgba(201,168,76,0.5)',
            borderRadius:5, padding:'5px 10px',
            fontFamily:'Georgia,serif', fontSize:11.5,
            color:'rgba(245,228,168,0.95)',
            boxShadow:'0 4px 14px rgba(0,0,0,0.35)',
            whiteSpace:'nowrap',
          }}>
            <strong>{tip.d.label}</strong>: {tip.d.value} visitor{tip.d.value !== 1 ? 's' : ''}
          </div>
        );
      })()}
    </div>
  );
}

function generateAttendanceInsights(dailyCounts) {
  if (!dailyCounts.length) return [];
  const insights = [];
  const maxV = Math.max(...dailyCounts.map(d => d.value));
  const peakPt = dailyCounts.find(d => d.value === maxV);

  // Peak insight
  if (peakPt) {
    insights.push(`The peak of attendance was on <strong>${peakPt.label}</strong> with <strong>${peakPt.value} visitor${peakPt.value !== 1 ? 's' : ''}</strong>.`);
  }

  // Find stretches of low/zero attendance
  const low = dailyCounts.filter(d => d.value <= 1);
  if (low.length >= 3) {
    const first = low[0].label;
    const last = low[low.length - 1].label;
    if (first !== last) {
      insights.push(`Consistent low attendance was observed between <strong>${first}</strong> and <strong>${last}</strong>, averaging under 1 visit per day.`);
    }
  }

  // Recent uptick: check last 3 days vs prior stretch
  const recent = dailyCounts.slice(-3);
  const recentAvg = recent.reduce((s,d)=>s+d.value,0) / recent.length;
  const priorAvg = dailyCounts.slice(0, -3).reduce((s,d)=>s+d.value,0) / Math.max(dailyCounts.length-3,1);
  if (recentAvg > priorAvg * 1.5 && recentAvg >= 2) {
    const lastFew = recent.map(d=>d.label);
    insights.push(`A noticeable increase in visitors is observable in the last few days (<strong>${lastFew[0]}–${lastFew[lastFew.length-1]}</strong>).`);
  }

  // Total visits
  const total = dailyCounts.reduce((s,d)=>s+d.value,0);
  insights.push(`Total of <strong>${total} visit${total !== 1 ? 's' : ''}</strong> recorded across this period.`);

  return insights;
}

function TabAttendance({ data, loading, period }) {
  const { logs=[], logsAll=[], byProgram=[], dailyCounts=[], periodAttendLabel='' } = data;
  const periodLabel = periodAttendLabel||(period==='7d'?'Last 7 Days':period==='30d'?'Last 30 Days':'Last 1 Year');
  const peakDay = dailyCounts.length ? dailyCounts.reduce((a,b)=>b.value>a.value?b:a,dailyCounts[0]) : null;
  const uniqueStudents = new Set(logs.map(l=>l.id_no).filter(Boolean)).size;
  const insights = generateAttendanceInsights(dailyCounts);

  const cols = [
    { key:'full_name', label:'Name',    width:'26%' },
    { key:'id_no',     label:'ID No.',  width:'13%', render:v=><span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-dim)'}}>{v||'—'}</span> },
    { key:'program',   label:'Program', width:'18%', render:v=>v?<span className="ra-pill blue">{v}</span>:'—' },
    { key:'date',      label:'Date',    width:'12%' },
    { key:'time_in',   label:'Time In', render:v=><span style={{fontFamily:'monospace',fontSize:11}}>{fmtTime(v)}</span> },
    { key:'status',    label:'Status',  render:v=><span className="ra-pill green">{v||'time-in'}</span> },
  ];

  return (
    <>
      {/* Stats */}
      <div className="ra-stat-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:20}}>
        {[
          {label:'Total Visits',    val:fmtNum(logs.length),         sub:`${periodLabel} attendance logs`,     ac:'#1A4DA0', ic:Ic.attend},
          {label:'Unique Students', val:fmtNum(uniqueStudents),      sub:'distinct student IDs',               ac:'#0D7377', ic:Ic.users},
          {label:'Peak Day',        val:peakDay?.label||'—',         sub:`${fmtNum(peakDay?.value||0)} visits`,ac:'#5B2C8D', ic:Ic.trend},
        ].map((c,i)=>(
          <div key={i} className="ra-stat" style={{'--ra-ac':c.ac}}>
            <div className="ra-stat-ico">{c.ic(36)}</div>
            <div className="ra-stat-lbl">{c.label}</div>
            <div className="ra-stat-val" style={{fontSize:i===2?18:28}}>
              {loading?<div className="ra-sk" style={{height:26,width:60}}/>:c.val}
            </div>
            <div className="ra-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ATTENDANCE OVERVIEW label ── */}
      <div className="ra-sh" style={{marginBottom:10}}>
        <span className="ra-sh-title">Attendance Overview</span>
        <span className="ra-sh-meta">{periodLabel}</span>
      </div>

      {/* ── TWO-PANEL ROW: Line Chart + Pie Chart ── */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20, alignItems:'stretch'}}>

        {/* LEFT: Daily Visit Trend panel */}
        <div className="ra-panel" style={{display:'flex', flexDirection:'column'}}>
          {/* Maroon header */}
          <div className="ra-panel-hd">
            <span className="ra-panel-title">Daily Visit Trend</span>
            <span className="ra-panel-sub">{periodLabel}</span>
          </div>
          {/* Chart */}
          <div style={{flex:1, padding:'16px 10px', background:'var(--cream-light)', display:'flex', alignItems:'center', justifyContent:'center', width:'100%'}}>
            {loading
              ? <div className="ra-sk" style={{height:180, width:'100%', borderRadius:6}}/>
              : <div style={{width:'100%'}}><DailyVisitReportChart data={dailyCounts} period={period}/></div>
            }
          </div>
          {/* Key Insights */}
          <div style={{padding:'10px 16px 14px', background:'var(--cream-light)', flexShrink:0}}>
            <div style={{
              fontFamily:'Georgia,"Times New Roman",serif',
              fontSize:11, fontWeight:700, letterSpacing:'0.06em',
              color:'var(--maroon-deep)', textTransform:'uppercase', marginBottom:7,
              textAlign:'left',
            }}>
              Key Insights
            </div>
            {loading
              ? <div className="ra-sk" style={{height:50, borderRadius:4}}/>
              : insights.length
                ? <ul style={{margin:0, padding:'0 0 0 16px', listStyle:'disc', textAlign:'left'}}>
                    {insights.map((ins, i) => (
                      <li key={i} style={{
                        fontFamily:'Georgia,"Times New Roman",serif',
                        fontSize:11, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:2,
                        textAlign:'left',
                      }} dangerouslySetInnerHTML={{__html: ins}}/>
                    ))}
                  </ul>
                : <p style={{fontFamily:'Georgia,serif',fontSize:11,color:'var(--text-dim)',margin:0,textAlign:'left'}}>No attendance data.</p>
            }
          </div>
        </div>

        {/* RIGHT: Visits by Program panel */}
        <div className="ra-panel" style={{display:'flex', flexDirection:'column'}}>
          {/* Maroon header */}
          <div className="ra-panel-hd">
            <span className="ra-panel-title">Visits by Program</span>
            <span className="ra-panel-sub">distribution</span>
          </div>
          {/* Pie chart */}
          <div style={{flex:1, padding:'16px', display:'flex', alignItems:'center', justifyContent:'center', minHeight:300}}>
            {loading
              ? <div className="ra-sk" style={{height:220,width:220,borderRadius:'50%'}}/>
              : byProgram.length
                ? <PieChart
                    data={byProgram.slice(0,6).map((p,i)=>({label:p.program||'Unknown',value:p.count,color:CATEGORY_COLORS[i%CATEGORY_COLORS.length]}))}
                    size={280}
                  />
                : <div className="ra-empty">{Ic.empty()}<div className="ra-empty-s">No attendance data</div></div>
            }
          </div>
        </div>

      </div>

      <div className="ra-sh"><span className="ra-sh-title">Attendance Log</span><span className="ra-sh-meta">{periodLabel}</span></div>
      <RaTable title="Attendance" cols={cols} rows={logs} loading={loading} pageSize={12} exportable/>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ReportsAnalytics() {
  const [tab,    setTab]    = useState('books');
  const [period, setPeriod] = useState('30d');
  const [statsLoading, setStatsLoading] = useState(true);
  const [dataLoading,  setDataLoading]  = useState(true);

  const [stats, setStats] = useState({
    totalBooks:0, borrowedCount:0, pendingCount:0, returnedCount:0, studentCount:0,
  });

  const [bookData,    setBookData]    = useState({ topBooks:[], categoryBorrows:[] });
  const [stuData,     setStuData]     = useState({ topStudents:[], byProgram:[] });
  const [trendData,   setTrendData]   = useState({});
  const [overdueData, setOverdueData] = useState({ overdueList:[], byGenre:[] });
  const [availData,   setAvailData]   = useState({ availability:[], allBooks:[] });
  const [txData,      setTxData]      = useState({ transactions:[] });
  const [attendData,  setAttendData]  = useState({ logs:[], byProgram:[], dailyCounts:[] });

  // ── Stat counters ──
  // borrow_requests: pending count
  // borrowings: currently borrowed (returned_at IS NULL)
  // borrowings: returned (returned_at IS NOT NULL)
  // books: total titles
  // profiles: registered students
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [
        { count: totalBooks },
        { count: borrowedCount },
        { count: pendingCount },
        { count: returnedCount },
        { count: studentCount },
      ] = await Promise.all([
        supabase.from('books').select('*',{count:'exact',head:true}),
        supabase.from('borrowings').select('*',{count:'exact',head:true}).eq('status','Borrowed').is('returned_at',null),
        supabase.from('borrow_requests').select('*',{count:'exact',head:true}).eq('status','pending'),
        supabase.from('borrowings').select('*',{count:'exact',head:true}).not('returned_at','is',null),
        supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','student'),
      ]);
      setStats({ totalBooks, borrowedCount, pendingCount, returnedCount, studentCount });
    } catch(e) { console.error('[RA] stats error:', e); }
    finally { setStatsLoading(false); }
  }, []);

  // ── Rich analytics ──
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const periodDays = period==='7d'?7:period==='30d'?30:365;
      const since = new Date(Date.now() - periodDays * 86400000).toISOString();

      // Fetch all data sources in parallel
      const [
        { data: borrowings    },   // borrowings history (all time; popularity is filtered to `period` below)
        { data: borrowingsPeriod }, // borrowings in period (for trends)
        { data: booksRaw      },   // books catalogue
        { data: reqPeriod     },   // borrow_requests in period (for request trend)
        { data: reqAll        },   // borrow_requests all (for transactions)
        { data: attendRaw     },   // attendance_logs
      ] = await Promise.all([
        // All borrowings for book popularity & student activity
        supabase.from('borrowings')
          .select('id,student_id,student_number,student_name,student_program,book_id,book_title,status,borrowed_at,returned_at,date')
          .order('borrowed_at',{ascending:false})
          .limit(2000),

        // Borrowings within selected period for trend
        supabase.from('borrowings')
          .select('id,student_name,book_title,borrowed_at,returned_at,status')
          .gte('borrowed_at', since)
          .order('borrowed_at'),

        // Full book catalogue
        supabase.from('books')
          .select('id,title,genre,available_copies,copies,cover_image_url,status')
          .order('title'),

        // Borrow requests within period
        supabase.from('borrow_requests')
          .select('id,student_name,book_title,status,created_at')
          .gte('created_at', since)
          .order('created_at'),

        // All borrow_requests for transactions tab (recent 500)
        supabase.from('borrow_requests')
          .select('id,student_name,student_number,book_title,status,created_at')
          .order('created_at',{ascending:false})
          .limit(500),

        // Attendance logs — recent 30 days for trend, all for table
        supabase.from('attendance_logs')
          .select('id,id_no,full_name,program,time_in,date,status')
          .order('time_in',{ascending:false})
          .limit(2000),
      ]);

      // ── Build book lookup from books table ──
      // Primary key: book_id (most reliable).
      // Fallback: normalised title string for books without an id match.
      const bookById   = {};   // id  -> book record
      const bookByTitle= {};   // normalised title -> book record
      const norm = s => (s||'').trim().toLowerCase();
      (booksRaw||[]).forEach(b=>{
        if(b.id)    bookById[String(b.id)] = b;
        if(b.title) bookByTitle[norm(b.title)] = b;
      });
      // Resolve a borrowing row to the matching books record
      const resolveBook = (bRow) => {
        if(bRow.book_id) {
          const r = bookById[String(bRow.book_id)];
          if(r) return r;
        }
        return bookByTitle[norm(bRow.book_title)] || null;
      };
      const getGenre   = title => (bookByTitle[norm(title)]||{}).genre||'';
      const getCover   = title => (bookByTitle[norm(title)]||{}).cover_image_url||null;
      const getBookRec = title => bookByTitle[norm(title)] || {};

      // ──────────────────────────────────────────────────
      // BOOK POPULARITY
      // Only count borrows whose borrowed_at falls within the selected
      // period (7d / 30d / 1y) so "Top 10 Most Borrowed" matches the
      // 7 Days / 30 Days / 1 Year toggle above.
      const sinceTime = new Date(since).getTime();
      const periodBorrowings = (borrowings||[]).filter(
        b => b.borrowed_at && new Date(b.borrowed_at).getTime() >= sinceTime
      );

      // ── Count borrows per book_id (most accurate), fall back to title ──
      const idCount    = {};  // book_id -> {count, title, sampleRow}
      const titleCount2= {};  // for books without book_id
      periodBorrowings.forEach(b=>{
        if(!b.book_title) return;
        if(b.book_id){
          const k = String(b.book_id);
          if(!idCount[k]) idCount[k] = {count:0, title:b.book_title, sampleRow:b};
          idCount[k].count++;
        } else {
          titleCount2[b.book_title] = (titleCount2[b.book_title]||0)+1;
        }
      });

      // Merge id-based and title-based counts into topBooks
      const allEntries = [
        ...Object.entries(idCount).map(([id,v])=>({
          key:id, byId:true, title:v.title, count:v.count, sampleRow:v.sampleRow
        })),
        ...Object.entries(titleCount2).map(([title,count])=>({
          key:title, byId:false, title, count, sampleRow:{book_title:title}
        })),
      ];
      const topBooks = allEntries
        .sort((a,b)=>b.count-a.count).slice(0,10)
        .map(entry=>{
          // Try book_id match first, then title match
          let bookRec = entry.byId ? bookById[entry.key] : null;
          if(!bookRec || !bookRec.cover_image_url) {
            // fallback: search by normalised title across all books
            bookRec = bookByTitle[norm(entry.title)] || bookRec || {};
          }
          console.log('[RA]', entry.title, '| book_id:', entry.key, '| cover:', bookRec.cover_image_url||'NULL');
          return {
            title: bookRec.title || entry.title,
            count: entry.count,
            genre: bookRec.genre||'',
            cover_image_url: bookRec.cover_image_url||null,
            available_copies: bookRec.available_copies??null,
            copies: bookRec.copies??null,
            book_id: entry.byId ? entry.key : (bookRec.id ? String(bookRec.id) : null),
          };
        });
      console.log('[RA] booksRaw IDs:', (booksRaw||[]).map(b=>b.id+':'+b.title.slice(0,20)));

      const genreCount = {};
      periodBorrowings.forEach(b=>{
        const g = getGenre(b.book_title);
        if(g) genreCount[g]=(genreCount[g]||0)+1;
      });
      const categoryBorrows = Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).map(([genre,count])=>({genre,count}));
      setBookData({ topBooks, categoryBorrows });

      // ──────────────────────────────────────────────────
      // STUDENT ACTIVITY  (from borrowings — filtered to selected period)
      // ──────────────────────────────────────────────────
      const periodBorrowingsForStudents = (borrowings||[]).filter(
        b => b.borrowed_at && new Date(b.borrowed_at).getTime() >= sinceTime
      );
      const stuBorrows  = {};
      const stuReturned = {};
      const stuMeta     = {};
      periodBorrowingsForStudents.forEach(b=>{
        if(!b.student_name) return;
        stuBorrows[b.student_name]  = (stuBorrows[b.student_name]||0)+1;
        if(b.returned_at) stuReturned[b.student_name] = (stuReturned[b.student_name]||0)+1;
        if(!stuMeta[b.student_name]) stuMeta[b.student_name]={ student_number: b.student_number||'', program: b.student_program||'' };
      });
      const topStudents = Object.entries(stuBorrows)
        .sort((a,b)=>b[1]-a[1]).slice(0,50)
        .map(([name,borrows],i)=>({
          student_name: name,
          borrows,
          returned: stuReturned[name]||0,
          student_number: stuMeta[name]?.student_number||'',
          program: stuMeta[name]?.program||'',
          rank: i+1,
        }));
      const progCount = {};
      periodBorrowingsForStudents.forEach(b=>{
        const p = b.student_program||'';
        if(p) progCount[p]=(progCount[p]||0)+1;
      });
      const byProgram = Object.entries(progCount).sort((a,b)=>b[1]-a[1]).map(([program,count])=>({program,count}));
      setStuData({ topStudents, byProgram });

      // ──────────────────────────────────────────────────
      // TRENDS
      // req_  = borrow_requests count by period
      // borrow_ = borrowings.borrowed_at by period
      // return_ = borrowings.returned_at by period
      // ──────────────────────────────────────────────────
      const buildTimeline = (rows, dateField, pts, stepDays) => {
        const now = new Date();
        const buckets = Array.from({length:pts},(_,i)=>{
          const d = new Date(now);
          d.setDate(d.getDate() - (pts-1-i)*stepDays);
          const label = stepDays===1
            ? d.toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric'})
            : stepDays<=7
            ? d.toLocaleDateString('en-PH',{month:'short',day:'numeric'})
            : d.toLocaleDateString('en-PH',{month:'short',year:'2-digit'});
          return { label, value:0, date: new Date(d) };
        });
        (rows||[]).forEach(r=>{
          const rd = new Date(r[dateField]);
          if(isNaN(rd)) return;
          let best=0, bestDiff=Infinity;
          buckets.forEach((t,i)=>{ const diff=Math.abs(rd-t.date); if(diff<bestDiff){bestDiff=diff;best=i;} });
          buckets[best].value++;
        });
        return buckets;
      };

      const pts7d  = 7,  step7d  = 1;
      const pts30d = 8,  step30d = 4;
      const pts1y  = 12, step1y  = 30;

      const [pts, step] = period==='7d'?[pts7d,step7d]:period==='30d'?[pts30d,step30d]:[pts1y,step1y];

      const reqAll30d     = (reqPeriod||[]);
      const borrowPeriodR = (borrowingsPeriod||[]);
      const returnPeriodR = (borrowingsPeriod||[]).filter(b=>b.returned_at);

      setTrendData({
        [`req_${period}`]:    buildTimeline(reqAll30d,    'created_at',  pts, step),
        [`borrow_${period}`]: buildTimeline(borrowPeriodR,'borrowed_at', pts, step),
        [`return_${period}`]: buildTimeline(returnPeriodR,'returned_at', pts, step),
      });

      // ──────────────────────────────────────────────────
      // UNRETURNED BOOKS
      // borrowings WHERE returned_at IS NULL
      // ──────────────────────────────────────────────────
      const now = new Date();
      const overdueList = (borrowings||[])
        .filter(b => b.status==='Borrowed' && !b.returned_at)
        .map(b => {
          const borrowedDate = b.borrowed_at ? new Date(b.borrowed_at) : null;
          const daysOut = borrowedDate ? Math.floor((now - borrowedDate)/(1000*60*60*24)) : 0;
          return {
            ...b,
            genre:        getGenre(b.book_title),
            borrowed_date: fmtShort(b.borrowed_at),
            days_out:     daysOut,
          };
        })
        .sort((a,b)=>b.days_out - a.days_out);

      const genreOver = {};
      overdueList.forEach(b=>{ const g=b.genre||'Unknown'; genreOver[g]=(genreOver[g]||0)+1; });
      const byGenre = Object.entries(genreOver).sort((a,b)=>b[1]-a[1]).map(([genre,count])=>({genre,count}));
      setOverdueData({ overdueList, byGenre });

      // ──────────────────────────────────────────────────
      // AVAILABILITY  (from books table directly)
      // ──────────────────────────────────────────────────
      const allBooks = (booksRaw||[]).map(b=>({
        ...b,
        total_copies: b.copies ?? 0,
        status_key: (b.available_copies??0)===0&&(b.copies??0)>0?'out'
                  : (b.available_copies??0)<(b.copies??0)?'partial':'available',
      }));
      const availCopies  = allBooks.reduce((s,b)=>s+(b.available_copies??0),0);
      const onLoanCopies = allBooks.reduce((s,b)=>s+Math.max(0,(b.copies??0)-(b.available_copies??0)),0);
      setAvailData({
        availability:[
          {label:'Available', value:availCopies,  color:'#277A3C'},
          {label:'On Loan',   value:onLoanCopies, color:'#8B0000'},
        ],
        allBooks,
      });

      // ──────────────────────────────────────────────────
      // TRANSACTIONS
      // Merge: borrowings (Borrowed/Returned) + borrow_requests (pending/rejected)
      // borrow_requests that are 'approved' are already in borrowings, skip them
      // ──────────────────────────────────────────────────
      const txFromBorrowings = (borrowings||[]).map(b=>({
        student_name:   b.student_name||'—',
        student_number: b.student_number||'',
        book_title:     b.book_title||'—',
        genre:          getGenre(b.book_title),
        status:         b.returned_at ? 'Returned' : 'Borrowed',
        date_display:   fmtShort(b.borrowed_at),
        _ts:            b.borrowed_at,
        source:         'borrowing',
      }));
      const txFromRequests = (reqAll||[])
        .filter(r=>r.status==='pending'||r.status==='rejected')
        .map(r=>({
          student_name:   r.student_name||'—',
          student_number: r.student_number||'',
          book_title:     r.book_title||'—',
          genre:          getGenre(r.book_title),
          status:         r.status,
          date_display:   fmtShort(r.created_at),
          _ts:            r.created_at,
          source:         'request',
        }));
      const transactions = [...txFromBorrowings, ...txFromRequests]
        .sort((a,b)=>new Date(b._ts)-new Date(a._ts))
        .slice(0, 600);
      setTxData({ transactions });

      // ──────────────────────────────────────────────────
      // ATTENDANCE
      // attendance_logs: id_no, full_name, program, time_in, date, status
      // Filtered to the selected period (7d / 30d / 1y)
      // ──────────────────────────────────────────────────
      const logsAll = (attendRaw||[]);
      const logsFiltered = logsAll.filter(l => l.time_in && new Date(l.time_in).getTime() >= sinceTime);

      const progAttend = {};
      logsFiltered.forEach(l=>{ const p=l.program||'Unknown'; progAttend[p]=(progAttend[p]||0)+1; });
      const attendByProgram = Object.entries(progAttend).sort((a,b)=>b[1]-a[1]).map(([program,count])=>({program,count}));

      // Timeline buckets match the selected period
      const [attendPts, attendStep] = period==='7d'?[7,1]:period==='30d'?[30,1]:[12,30];
      const dailyCounts = buildTimeline(logsFiltered,'time_in',attendPts,attendStep);

      const periodAttendLabel = period==='7d'?'Last 7 days':period==='30d'?'Last 30 days':'Last 12 months';

      setAttendData({ logs: logsFiltered, logsAll, byProgram: attendByProgram, dailyCounts, periodAttendLabel });

    } catch(e) { console.error('[RA] fetchData error:', e); }
    finally { setDataLoading(false); }
  }, [period]);

  useEffect(()=>{ fetchStats(); }, [fetchStats]);
  useEffect(()=>{ fetchData();  }, [fetchData]);

  // Real-time subscriptions
  useEffect(()=>{
    const ch = supabase.channel('ra3-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'borrow_requests'},()=>{ fetchStats(); fetchData(); })
      .on('postgres_changes',{event:'*',schema:'public',table:'borrowings'},     ()=>{ fetchStats(); fetchData(); })
      .on('postgres_changes',{event:'*',schema:'public',table:'books'},          ()=>{ fetchStats(); fetchData(); })
      .on('postgres_changes',{event:'*',schema:'public',table:'attendance_logs'},()=>{ fetchData(); })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[fetchStats,fetchData]);

  const TABS=[
    {id:'books',       label:'Book Popularity',  icon:Ic.books   },
    {id:'students',    label:'Student Activity', icon:Ic.users   },
    {id:'trends',      label:'Borrowing Trends', icon:Ic.trend   },
    {id:'unreturned',  label:'Unreturned',       icon:Ic.alert   },
    {id:'availability',label:'Availability',     icon:Ic.category},
    {id:'transactions',label:'Transactions',     icon:Ic.bars    },
    {id:'attendance',  label:'Attendance',       icon:Ic.attend  },
  ];

  const STAT_CARDS=[
    {key:'totalBooks',    label:'Total Books',     ac:'#8B0000', sub:'titles in catalogue', ic:Ic.books   },
    {key:'borrowedCount', label:'Currently Out',   ac:'#C9A84C', sub:'unreturned borrows',  ic:Ic.borrowed},
    {key:'pendingCount',  label:'Pending Requests',ac:'#9A5500', sub:'awaiting approval',   ic:Ic.pending },
    {key:'returnedCount', label:'Total Returned',  ac:'#277A3C', sub:'completed returns',   ic:Ic.return  },
    {key:'studentCount',  label:'Students',        ac:'#1A4DA0', sub:'registered profiles', ic:Ic.users   },
  ];

  return (
    <>
      <style>{RA_STYLES}</style>
      <div className="lm-module ra-root">

        {/* Module header */}
        <div className="ra-mod-hd">

          <div className="ra-mod-controls">
            <div className="ra-period">
              {[['7d','7 Days'],['30d','30 Days'],['1y','1 Year']].map(([v,l])=>(
                <button key={v} className={`ra-p-btn${period===v?' active':''}`} onClick={()=>setPeriod(v)}>{l}</button>
              ))}
            </div>
            <button className="ra-btn" onClick={()=>{fetchStats();fetchData();}}>{Ic.refresh()} Refresh</button>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="ra-stat-grid">
          {STAT_CARDS.map((c,i)=>(
            <div key={c.key} className="ra-stat" style={{'--ra-ac':c.ac,animationDelay:`${i*0.06}s`}}>
              <div className="ra-stat-ico">{c.ic(38)}</div>
              <div className="ra-stat-lbl">{c.label}</div>
              <div className="ra-stat-val">
                {statsLoading?<div className="ra-sk" style={{height:26,width:64}}/>:fmtNum(stats[c.key]??0)}
              </div>
              <div className="ra-stat-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="ra-nav-tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`ra-nav-tab${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
              {t.icon(14)}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab==='books'        && <TabBooks        data={bookData}    loading={dataLoading} period={period}/>}
        {tab==='students'     && <TabStudents     data={stuData}     loading={dataLoading} period={period}/>}
        {tab==='trends'       && <TabTrends       data={trendData}   loading={dataLoading} period={period} setPeriod={setPeriod}/>}
        {tab==='unreturned'   && <TabOverdue      data={overdueData} loading={dataLoading}/>}
        {tab==='availability' && <TabAvailability data={availData}   loading={dataLoading}/>}
        {tab==='transactions' && <TabTransactions data={txData}      loading={dataLoading}/>}
        {tab==='attendance'   && <TabAttendance   data={attendData}  loading={dataLoading} period={period}/>}

      </div>
    </>
  );
}