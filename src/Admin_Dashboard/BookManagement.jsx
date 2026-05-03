// src/Admin_Dashboard/BookManagement.jsx
// ─────────────────────────────────────────────────────────────────────────────
// BOOK MANAGEMENT — Borrow & Return via QR Scanning
//
// ✅ Fixed borrow/return logic — copies count adjusts in books table
// ✅ Correct status: borrowed_at ≠ returned_at, returned_at only set on return
// ✅ Mobile confirmation popup before saving + success/error sounds
// ✅ Borrow limit (configurable) enforced on both desktop & mobile
// ✅ Student account credentials saved in transaction
// ✅ Maroon + Cream table, Maroon + Gold cards design
//
// Supabase tables:
//   • books       — id, title, isbn, authors, cover_image_url, copies, status
//   • book_copies — copy_id (uuid), book_id (uuid), copy_number, qr_code_url, status
//   • borrowings  — id, student_id, student_name, student_program,
//                   book_id, book_title, copy_label (stores copy_id UUID),
//                   status, borrowed_at, returned_at, date
//   • profiles    — id, first_name, last_name, middle_name, username, email, role, program
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';

// ─── Config ───────────────────────────────────────────────────────────────────
const BORROW_LIMIT = 3; // max books a student can borrow at a time

// ─── Design tokens ────────────────────────────────────────────────────────────
const G   = '#C9A84C';
const GP  = '#F5E4A8';
const MAR = '#8B0000';
const MAR2 = '#6B0000';
const CREAM = '#FAF6EE';
const CREAM2 = '#F3EBD8';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today   = () => new Date().toISOString().split('T')[0];
const nowISO  = () => new Date().toISOString();
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '—';
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', hour12:true }) : '—';
const fmtFull = (iso) => iso ? `${fmtDate(iso)} · ${fmtTime(iso)}` : '—';

// ─── Sound helpers (Web Audio API) ───────────────────────────────────────────
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.18, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(660, 0,    0.12);
    beep(880, 0.13, 0.18);
  } catch { /* silent fail */ }
}

function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 220;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* silent fail */ }
}

// ─── QR Parsers ───────────────────────────────────────────────────────────────
function parseStudentQR(raw) {
  const flat = (raw || '').trim().replace(/\r?\n/g, '');
  const id_no     = flat.match(/IDNo\s*:\s*([^|]+?)(?=Full Name|Program|$)/i)?.[1]?.trim();
  const full_name = flat.match(/Full Name\s*:\s*([^|]+?)(?=IDNo|Program|$)/i)?.[1]?.trim();
  const program   = flat.match(/Program\s*:\s*([^|]+?)(?=IDNo|Full Name|$)/i)?.[1]?.trim();
  if (!id_no && !full_name) return null;
  return { id_no: id_no || '', full_name: full_name || '', program: program || '' };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBookQR(raw) {
  const s = (raw || '').trim();
  if (!s) return null;

  // New format: raw UUID = copy_id from book_copies table
  if (UUID_RE.test(s)) {
    return { isCopyId: true, copy_id: s, base: s, copyNum: null, copyLabel: null, raw: s };
  }

  // Legacy format: ISBN-COPY001
  const copyMatch = s.match(/^(.+)-COPY(\d+)$/i);
  if (copyMatch) return {
    isCopyId: false,
    base: copyMatch[1].trim(), copyNum: parseInt(copyMatch[2], 10),
    copyLabel: s, raw: s,
  };

  return { isCopyId: false, base: s, copyNum: null, copyLabel: null, raw: s };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  qr:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="16" width="3" height="3" fill="currentColor"/><rect x="5" y="16" width="3" height="3" fill="currentColor"/></svg>,
  user:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  book:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  check:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>,
  close:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  warn:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  phone:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  limit:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const key = (status || '').toLowerCase();
  const cfg = {
    borrowed: { bg:'rgba(139,0,0,0.13)', color:'#c0564e', border:'rgba(139,0,0,0.25)', dot:'#c0564e' },
    returned: { bg:'rgba(46,125,50,0.10)', color:'#4a8e4c', border:'rgba(90,158,92,0.25)', dot:'#5a9e5c' },
  }[key] || { bg:'rgba(201,168,76,0.10)', color:G, border:'rgba(201,168,76,0.25)', dot:G };
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
      fontFamily:'var(--font-sans)', letterSpacing:'0.04em',
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const isErr = type === 'error';
  return (
    <div style={{
      position:'fixed', bottom:28, right:28, zIndex:9999,
      background: isErr ? 'rgba(80,0,0,0.97)' : 'rgba(15,35,15,0.97)',
      border:`1px solid ${isErr ? 'rgba(220,100,100,0.4)' : 'rgba(90,158,92,0.4)'}`,
      borderRadius:14, padding:'14px 22px',
      display:'flex', alignItems:'center', gap:12,
      fontFamily:'var(--font-sans)', fontSize:13.5, color:'#fff',
      boxShadow:'0 12px 40px rgba(0,0,0,0.5)',
      animation:'bm-slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      maxWidth:380,
    }}>
      <span style={{
        width:8, height:8, borderRadius:'50%', flexShrink:0,
        background: isErr ? '#ef9a9a' : '#81c784',
        boxShadow: `0 0 8px ${isErr ? '#ef9a9a' : '#81c784'}`,
      }} />
      {msg}
    </div>
  );
}

// ─── Confirmation Popup (Mobile) ──────────────────────────────────────────────
function ConfirmPopup({ data, onConfirm, onCancel }) {
  if (!data) return null;
  const isBorrow = data.action === 'Borrowed';
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:2000,
      background:'rgba(10,0,0,0.78)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
      animation:'bm-fadeIn 0.2s ease',
    }}>
      <div style={{
        background: CREAM,
        borderRadius:20, width:'100%', maxWidth:400,
        border:`2px solid rgba(201,168,76,0.35)`,
        boxShadow:'0 24px 64px rgba(0,0,0,0.55)',
        animation:'bm-slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
          padding:'18px 24px',
          borderBottom:`2px solid rgba(201,168,76,0.3)`,
        }}>
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            fontFamily:"'Cinzel', serif", fontSize:15, color:GP, fontWeight:700,
          }}>
            <span style={{ fontSize:20 }}>{isBorrow ? '📚' : '↩'}</span>
            Confirm {isBorrow ? 'Borrow' : 'Return'}
          </div>
          <div style={{ fontSize:12, color:'rgba(245,228,168,0.6)', marginTop:4, fontFamily:'var(--font-sans)' }}>
            Please verify the details before proceeding
          </div>
        </div>

        {/* Details */}
        <div style={{ padding:'20px 24px' }}>
          {/* Action banner */}
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'10px 14px', borderRadius:10, marginBottom:16,
            background: isBorrow ? 'rgba(139,0,0,0.07)' : 'rgba(46,125,50,0.07)',
            border: `1px solid ${isBorrow ? 'rgba(139,0,0,0.18)' : 'rgba(46,125,50,0.2)'}`,
          }}>
            <span style={{
              fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
              color: isBorrow ? MAR : '#3a7c3c', fontFamily:'var(--font-sans)',
            }}>
              Action: {data.action}
            </span>
          </div>

          {/* Student */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:MAR, letterSpacing:'0.09em', textTransform:'uppercase', fontFamily:'var(--font-sans)', marginBottom:6 }}>Student</div>
            <div style={{ fontSize:14.5, fontWeight:700, color:'#1a0000', fontFamily:'var(--font-sans)' }}>{data.student_name}</div>
            <div style={{ fontSize:12, color:'#6b4040', fontFamily:'var(--font-sans)' }}>{data.student_id} {data.student_program ? `· ${data.student_program}` : ''}</div>
          </div>

          {/* Book */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:MAR, letterSpacing:'0.09em', textTransform:'uppercase', fontFamily:'var(--font-sans)', marginBottom:6 }}>Book</div>
            <div style={{ fontSize:14.5, fontWeight:700, color:'#1a0000', fontFamily:'var(--font-sans)', lineHeight:1.4 }}>{data.book_title}</div>
            {data.copy_label && <div style={{ fontSize:11.5, fontFamily:'monospace', color:'#7a5050', marginTop:3 }}>Copy: {data.copy_label}</div>}
          </div>

          {/* Buttons */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button onClick={onCancel} style={{
              padding:'12px', borderRadius:10, border:`1.5px solid rgba(139,0,0,0.2)`,
              background:'transparent', cursor:'pointer',
              fontFamily:'var(--font-sans)', fontSize:13.5, fontWeight:600,
              color:MAR, transition:'all 0.18s',
            }}>
              Cancel
            </button>
            <button onClick={onConfirm} style={{
              padding:'12px', borderRadius:10, border:'none',
              background:`linear-gradient(135deg, ${MAR}, ${MAR2})`,
              cursor:'pointer',
              fontFamily:'var(--font-sans)', fontSize:13.5, fontWeight:700,
              color:GP, boxShadow:'0 4px 14px rgba(139,0,0,0.3)',
              transition:'all 0.18s',
            }}>
              {isBorrow ? '✓ Confirm Borrow' : '↩ Confirm Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Dot ─────────────────────────────────────────────────────────────────
function StepDot({ n, active, done, label }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{
        width:44, height:44, borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, fontWeight:800, fontFamily:'var(--font-sans)',
        transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        background: done
          ? 'linear-gradient(135deg,#2e7d32,#1b5e20)'
          : active
          ? `linear-gradient(135deg,${MAR},${MAR2})`
          : 'rgba(139,0,0,0.05)',
        border: done  ? '2px solid rgba(90,158,92,0.6)' :
                active ? `2.5px solid ${G}` :
                         '2px solid rgba(139,0,0,0.12)',
        color: done ? '#a5d6a7' : active ? GP : 'var(--text-dim)',
        boxShadow: active
          ? `0 0 0 6px rgba(139,0,0,0.08), 0 4px 20px rgba(139,0,0,0.35)`
          : done ? '0 4px 14px rgba(46,125,50,0.25)' : 'none',
        position:'relative',
      }}>
        {done
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><polyline points="20 6 9 17 4 12"/></svg>
          : <span>{n}</span>
        }
        {active && <div style={{
          position:'absolute', inset:-6, borderRadius:'50%',
          border:`1.5px solid rgba(201,168,76,0.25)`,
          animation:'bm-pulse 2s ease-in-out infinite',
          pointerEvents:'none',
        }}/>}
      </div>
      <span style={{
        fontSize:9.5, fontFamily:'var(--font-sans)', letterSpacing:'0.11em',
        textTransform:'uppercase', fontWeight:700,
        color: active ? G : done ? '#5a9e5c' : 'var(--text-dim)',
        transition:'color 0.3s',
      }}>{label}</span>
    </div>
  );
}

// ─── Scan Zone ────────────────────────────────────────────────────────────────
function ScanZone({ scanning, focused, onFocus, hint, title, icon, active, stepNum }) {
  return (
    <div onClick={onFocus} style={{
      background: active
        ? `linear-gradient(145deg, rgba(139,0,0,0.10) 0%, rgba(90,0,0,0.06) 50%, rgba(201,168,76,0.05) 100%)`
        : 'rgba(139,0,0,0.02)',
      border: `1.5px solid ${active ? 'rgba(201,168,76,0.45)' : 'rgba(139,0,0,0.09)'}`,
      borderRadius:18, padding:'28px 22px', textAlign:'center',
      transition:'all 0.3s ease', cursor:'pointer',
      opacity: active ? 1 : 0.5,
      position:'relative', overflow:'hidden',
      boxShadow: active ? '0 8px 32px rgba(139,0,0,0.12), inset 0 1px 0 rgba(245,228,168,0.08)' : 'none',
    }}>
      {/* Corner accent */}
      {active && <>
        <div style={{ position:'absolute', top:0, left:0, width:40, height:40,
          background:'linear-gradient(135deg, rgba(201,168,76,0.18), transparent)',
          borderRadius:'18px 0 40px 0', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, right:0, width:60, height:60,
          background:'linear-gradient(315deg, rgba(139,0,0,0.10), transparent)',
          borderRadius:'40px 0 18px 0', pointerEvents:'none' }} />
      </>}

      {/* Step badge */}
      <div style={{
        position:'absolute', top:12, right:14,
        fontSize:9, fontWeight:800, letterSpacing:'0.1em',
        color: active ? 'rgba(201,168,76,0.5)' : 'rgba(139,0,0,0.2)',
        fontFamily:'var(--font-sans)', textTransform:'uppercase',
      }}>STEP {stepNum}</div>

      {/* Icon orb */}
      <div style={{
        width:68, height:68, borderRadius:'50%', margin:'0 auto 16px',
        background: active
          ? `radial-gradient(circle at 35% 35%, rgba(201,168,76,0.15), rgba(139,0,0,0.18))`
          : 'rgba(139,0,0,0.04)',
        border: `1.5px solid ${active ? 'rgba(201,168,76,0.35)' : 'rgba(139,0,0,0.08)'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color: active ? G : 'var(--text-dim)',
        boxShadow: active && focused
          ? `0 0 0 8px rgba(201,168,76,0.06), 0 0 24px rgba(201,168,76,0.18)`
          : active ? '0 4px 18px rgba(139,0,0,0.15)' : 'none',
        transition:'all 0.35s ease',
        position:'relative',
      }}>
        {icon}
        {scanning && (
          <div style={{
            position:'absolute', inset:-4, borderRadius:'50%',
            border:`2px solid rgba(201,168,76,0.5)`,
            animation:'bm-spin-ring 1s linear infinite',
          }}/>
        )}
      </div>

      {/* Status line */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:6,
        marginBottom:8,
      }}>
        {scanning && (
          <span style={{
            width:7, height:7, borderRadius:'50%',
            background:'#C9A84C',
            display:'inline-block',
            animation:'bm-blink 0.8s ease-in-out infinite',
          }}/>
        )}
        <div style={{
          fontFamily:"'Cinzel', serif", fontSize:13.5,
          color: active ? GP : 'var(--text-dim)',
          fontWeight: active ? 700 : 400,
          letterSpacing:'0.04em',
        }}>
          {scanning ? 'Reading…' : title}
        </div>
      </div>

      <div style={{
        fontSize:11, color: active ? 'rgba(245,228,168,0.45)' : 'rgba(139,0,0,0.25)',
        lineHeight:1.7, fontFamily:'var(--font-sans)',
        maxWidth:180, margin:'0 auto',
      }}>{hint}</div>

      {/* Active bottom bar */}
      {active && (
        <div style={{
          position:'absolute', bottom:0, left:'20%', right:'20%', height:2,
          background:`linear-gradient(90deg, transparent, ${G}, transparent)`,
          borderRadius:2,
          animation:'bm-shimmer 2s ease-in-out infinite',
        }}/>
      )}
    </div>
  );
}

// ─── Scan Result Card ─────────────────────────────────────────────────────────
function ScanResultCard({ result }) {
  if (!result) return null;
  const ok = result.type === 'success';
  const isBorrow = result.action === 'borrowed';
  const isReturn = result.action === 'returned';

  const cfg = ok
    ? isBorrow
      ? { bg:'rgba(139,0,0,0.10)', border:'rgba(201,168,76,0.35)', accent:G, label:'BORROWED', emoji:'📤', timeLabel:'Borrowed at' }
      : { bg:'rgba(30,80,30,0.12)', border:'rgba(90,158,92,0.38)', accent:'#5a9e5c', label:'RETURNED', emoji:'📥', timeLabel:'Returned at' }
    : { bg:'rgba(120,0,0,0.14)', border:'rgba(239,154,154,0.32)', accent:'#ef9a9a', label:'FAILED', emoji:'⚠', timeLabel:null };

  return (
    <div style={{
      borderRadius:14, overflow:'hidden',
      border:`1.5px solid ${cfg.border}`,
      background: cfg.bg,
      animation:'bm-slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      boxShadow: ok ? '0 4px 20px rgba(0,0,0,0.08)' : '0 4px 20px rgba(120,0,0,0.12)',
    }}>
      {/* Top accent stripe */}
      <div style={{
        height:3,
        background: ok
          ? `linear-gradient(90deg, transparent, ${cfg.accent}, transparent)`
          : 'linear-gradient(90deg, transparent, #ef9a9a, transparent)',
      }}/>

      <div style={{ padding:'14px 18px' }}>
        {/* Status row */}
        <div style={{
          display:'flex', alignItems:'center', gap:8, marginBottom: ok && result.data ? 12 : 0,
        }}>
          <span style={{ fontSize:16 }}>{cfg.emoji}</span>
          <span style={{
            fontSize:10.5, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase',
            color: cfg.accent, fontFamily:'var(--font-sans)',
          }}>{cfg.label}</span>
          {ok && (
            <span style={{
              marginLeft:'auto', fontSize:10, color:'rgba(245,228,168,0.35)',
              fontFamily:'var(--font-sans)',
            }}>
              {cfg.timeLabel}: {isBorrow ? fmtTime(result.data?.borrowed_at) : fmtTime(result.data?.returned_at)}
            </span>
          )}
        </div>

        {ok && result.data && (
          <div style={{
            background:'rgba(0,0,0,0.06)', borderRadius:10,
            padding:'12px 14px',
            border:'1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              fontSize:14, color:GP, fontWeight:700,
              fontFamily:"'Cinzel', serif", marginBottom:6,
              letterSpacing:'0.02em', lineHeight:1.4,
            }}>{result.data.book_title}</div>
            <div style={{
              display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
            }}>
              <span style={{
                display:'inline-flex', alignItems:'center', gap:5,
                fontSize:11.5, color:'rgba(245,228,168,0.55)',
                fontFamily:'var(--font-sans)',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {result.data.student_name}
              </span>
              {result.data.copy_label && (
                <span style={{
                  fontSize:10, fontFamily:'monospace',
                  color:'rgba(245,228,168,0.3)',
                  background:'rgba(0,0,0,0.15)', padding:'2px 7px', borderRadius:4,
                }}>
                  {String(result.data.copy_label).slice(0,12)}…
                </span>
              )}
            </div>
          </div>
        )}

        {!ok && (
          <div style={{
            display:'flex', alignItems:'flex-start', gap:8, marginTop:6,
            padding:'10px 12px', borderRadius:8,
            background:'rgba(120,0,0,0.12)', border:'1px solid rgba(239,154,154,0.18)',
          }}>
            <span style={{ color:'#ef9a9a', fontSize:13, flexShrink:0 }}>✕</span>
            <span style={{ fontSize:12.5, color:'rgba(239,154,154,0.85)', fontFamily:'var(--font-sans)', lineHeight:1.65 }}>
              {result.message || 'Unknown error'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DRow({ label, value, mono, highlight }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      gap:16, padding:'9px 0', borderBottom:'1px solid rgba(139,0,0,0.07)',
    }}>
      <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9a7070', fontFamily:'var(--font-sans)', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, color: highlight ? MAR : '#2a0000', fontFamily: mono ? 'monospace' : 'var(--font-sans)', fontWeight:500, textAlign:'right' }}>{value || '—'}</span>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ tx, onClose }) {
  if (!tx) return null;
  const isBorrowed = tx.status?.toLowerCase() === 'borrowed';
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(10,0,0,0.72)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: CREAM, borderRadius:20,
        border:'1.5px solid rgba(201,168,76,0.25)',
        width:'100%', maxWidth:480,
        boxShadow:'0 24px 60px rgba(0,0,0,0.5)',
        animation:'bm-slideUp 0.25s ease',
        maxHeight:'90vh', overflowY:'auto',
      }}>
        <div style={{
          padding:'18px 24px',
          borderBottom:'1.5px solid rgba(139,0,0,0.1)',
          background:`linear-gradient(135deg,${MAR},${MAR2})`,
          borderRadius:'20px 20px 0 0',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontFamily:"'Cinzel', serif", fontSize:15, color:GP, fontWeight:700 }}>Transaction Details</div>
            <div style={{ fontSize:11.5, color:'hsla(47, 79.40%, 81.00%, 0.55)', fontFamily:'var(--font-sans)', marginTop:2 }}>Full record information</div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.1)', border:'1px solid rgba(245,228,168,0.2)',
            borderRadius:8, width:34, height:34, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', color:GP,
          }}>{Ic.close}</button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
          {/* Status banner */}
          <div style={{
            padding:'10px 16px', borderRadius:10,
            background: isBorrowed ? 'rgba(139,0,0,0.08)' : 'rgba(46,125,50,0.08)',
            border:`1px solid ${isBorrowed ? 'rgba(139,0,0,0.18)' : 'rgba(46,125,50,0.2)'}`,
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#9a7070', fontFamily:'var(--font-sans)', letterSpacing:'0.07em', textTransform:'uppercase' }}>Transaction Status</span>
            <Badge status={tx.status} />
          </div>

          {/* Student */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, paddingBottom:6, borderBottom:'1px solid rgba(201,168,76,0.15)' }}>
              <span style={{ color:MAR }}>{Ic.user}</span>
              <span style={{ fontFamily:"'Cinzel', serif", fontSize:12, color:MAR, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700 }}>Student Information</span>
            </div>
            <DRow label="ID No."   value={tx.student_id}      mono />
            <DRow label="Name"     value={tx.student_name} />
            <DRow label="Program"  value={tx.student_program} />
            {tx.student_email && <DRow label="Email" value={tx.student_email} mono />}
          </div>

          {/* Book */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, paddingBottom:6, borderBottom:'1px solid rgba(201,168,76,0.15)' }}>
              <span style={{ color:MAR }}>{Ic.book}</span>
              <span style={{ fontFamily:"'Cinzel', serif", fontSize:12, color:MAR, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700 }}>Book Information</span>
            </div>
            <DRow label="Title"      value={tx.book_title} />
            <DRow label="Copy Label" value={tx.copy_label} mono />
          </div>

          {/* Timestamps */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, paddingBottom:6, borderBottom:'1px solid rgba(201,168,76,0.15)' }}>
              <span style={{ color:MAR, fontSize:15 }}>📅</span>
              <span style={{ fontFamily:"'Cinzel', serif", fontSize:12, color:MAR, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700 }}>Timestamps</span>
            </div>
            <DRow label="Borrowed At" value={fmtFull(tx.borrowed_at)} />
            <DRow label="Returned At" value={tx.returned_at ? fmtFull(tx.returned_at) : 'Not yet returned'} highlight={!tx.returned_at && isBorrowed} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ tx, onClick, onDelete }) {
  const [hov, setHov] = useState(false);
  const [delHov, setDelHov] = useState(false);
  const isBorrowed = tx.status?.toLowerCase() === 'borrowed';
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        background: hov ? 'rgba(139,0,0,0.05)' : CREAM,
        borderBottom:'1px solid rgba(139,0,0,0.07)',
        cursor:'pointer', transition:'background 0.14s',
      }}
    >
      <td style={{ padding:'11px 14px' }}>
        <span style={{ fontSize:12, fontFamily:'monospace', color:'#7a4040', letterSpacing:'0.04em', fontWeight:600 }}>{tx.student_id || '—'}</span>
      </td>
      <td style={{ padding:'11px 14px' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#1a0000', fontFamily:'var(--font-sans)' }}>{tx.student_name || '—'}</span>
        {tx.student_program && <div style={{ fontSize:10.5, color:'#9a7070', fontFamily:'var(--font-sans)', marginTop:1 }}>{tx.student_program}</div>}
      </td>
      <td style={{ padding:'11px 14px', maxWidth:190 }}>
        <span style={{ fontSize:13, color:'#2a0a0a', fontFamily:'var(--font-sans)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.book_title || '—'}</span>
        {tx.copy_label && <div style={{ fontSize:10.5, fontFamily:'monospace', color:'#9a7070', marginTop:1 }}>{tx.copy_label}</div>}
      </td>
      <td style={{ padding:'11px 14px' }}>
        <Badge status={tx.status} />
      </td>
      <td style={{ padding:'11px 14px' }}>
        <div style={{ fontSize:12, color:'#5a3030', fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>{fmtDate(tx.borrowed_at)}</div>
        <div style={{ fontSize:11, color:'#9a7070', fontFamily:'var(--font-sans)' }}>{fmtTime(tx.borrowed_at)}</div>
      </td>
      <td style={{ padding:'11px 14px' }}>
        {tx.returned_at ? (
          <>
            <div style={{ fontSize:12, color:'#3a6e3a', fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>{fmtDate(tx.returned_at)}</div>
            <div style={{ fontSize:11, color:'#5a9e5c', fontFamily:'var(--font-sans)' }}>{fmtTime(tx.returned_at)}</div>
          </>
        ) : (
          <span style={{ fontSize:11.5, color: isBorrowed ? '#c0564e' : '#9a7070', fontFamily:'var(--font-sans)', fontStyle:'italic' }}>
            {isBorrowed ? 'Still out' : '—'}
          </span>
        )}
      </td>
      <td style={{ padding:'11px 14px', textAlign:'center' }} onClick={e => e.stopPropagation()}>
        <button
          onMouseEnter={() => setDelHov(true)}
          onMouseLeave={() => setDelHov(false)}
          onClick={() => onDelete?.(tx)}
          title="Delete transaction"
          style={{
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'5px 11px', borderRadius:8, cursor:'pointer',
            border:`1.5px solid ${delHov ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.25)'}`,
            background: delHov ? 'rgba(139,0,0,0.12)' : 'rgba(139,0,0,0.05)',
            transition:'all 0.18s',
            fontFamily:'var(--font-sans)', fontSize:11, fontWeight:700,
            color: G,
            letterSpacing:'0.04em',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Delete
        </button>
      </td>
    </tr>
  );
}

// ─── [Mobile borrow is handled through the student's own app account] ─────────
// No admin-side manual entry — students borrow via their mobile account directly.
// Those transactions appear in the table automatically via realtime subscription.

function _UNUSED_MobileBorrowForm({ onTransactionComplete, showToast }) {
  const [studentIdInput, setStudentIdInput] = useState('');
  const [bookIdInput, setBookIdInput] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState('');
  const [confirmData, setConfirmData] = useState(null);

  const lookupStudent = async () => {
    if (!studentIdInput.trim()) return;
    setLookingUp('student');
    const { data } = await supabase.from('profiles').select('*').eq('id_no', studentIdInput.trim()).maybeSingle();
    setLookingUp('');
    if (data) {
      setStudentData(data);
      showToast(`Found: ${data.full_name}`, 'success');
    } else {
      showToast('Student ID not found in system', 'error');
      setStudentData(null);
    }
  };

  const lookupBook = async () => {
    const q = bookIdInput.trim();
    if (!q) return;
    setLookingUp('book');
    const parsed = parseBookQR(q);
    let record = null;
    const { data: byIsbn } = await supabase.from('books').select('*').eq('isbn', parsed.base).maybeSingle();
    record = byIsbn;
    if (!record) {
      const { data: rows } = await supabase.from('books').select('*').ilike('title', `%${parsed.base}%`);
      record = rows?.[0] || null;
    }
    setLookingUp('');
    if (record) {
      setBookData({ ...record, parsed });
      showToast(`Found: ${record.title}`, 'success');
    } else {
      showToast('Book not found in catalog', 'error');
      setBookData(null);
    }
  };

  const initiate = () => {
    if (!studentData || !bookData) return;
    const isBorrow = (bookData.available_copies ?? bookData.copies ?? 1) > 0;
    setConfirmData({
      action: isBorrow ? 'Borrowed' : 'Returned',
      student_id: studentData.id_no,
      student_name: studentData.full_name,
      student_program: studentData.program,
      book_title: bookData.title,
      copy_label: bookData.parsed?.copyLabel || bookData.parsed?.base,
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    const isBorrow = confirmData.action === 'Borrowed';
    const now = nowISO();
    try {
      // Check borrow limit
      if (isBorrow) {
        const { count } = await supabase
          .from('borrowings').select('*', { count:'exact', head:true })
          .eq('student_id', studentData.id_no).eq('status', 'Borrowed');
        if ((count || 0) >= BORROW_LIMIT) {
          playErrorSound();
          showToast(`Borrow limit reached (max ${BORROW_LIMIT} books)`, 'error');
          setConfirmData(null); setLoading(false); return;
        }
      }

      const copyLabel = bookData.parsed?.copyLabel || bookData.parsed?.base;

      if (!isBorrow) {
        await supabaseAdmin.from('borrowings')
          .update({ status:'Returned', returned_at: now })
          .eq('book_id', String(bookData.id))
          .eq('student_id', studentData.id_no)
          .eq('status', 'Borrowed');
      }

      // Update available_copies
      const delta = isBorrow ? -1 : 1;
      const current = bookData.available_copies ?? bookData.copies ?? 0;
      const newCount = Math.max(0, current + delta);
      await supabaseAdmin.from('books').update({
        available_copies: newCount,
        status: newCount <= 0 ? 'Borrowed' : 'Available',
      }).eq('id', bookData.id);

      const txPayload = {
        student_id:       studentData.id_no,
        student_name:     studentData.full_name,
        student_program:  studentData.program || '',
        student_email:    studentData.email || null,
        student_profile_id: studentData.id || null,
        book_id:          String(bookData.id),
        book_title:       bookData.title,
        copy_label:       copyLabel,
        status:           confirmData.action,
        borrowed_at:      isBorrow ? now : (bookData._borrow_time || now),
        returned_at:      isBorrow ? null : now,
        date:             today(),
      };

      const { error: txErr } = await supabaseAdmin.from('borrowings').insert([txPayload]);
      if (txErr) throw new Error(txErr.message);

      playSuccessSound();
      showToast(`${confirmData.action}: "${bookData.title}"`, 'success');
      onTransactionComplete?.();
      // reset
      setStudentIdInput(''); setBookIdInput(''); setStudentData(null); setBookData(null);
    } catch (err) {
      playErrorSound();
      showToast(`Error: ${err.message}`, 'error');
    }
    setConfirmData(null);
    setLoading(false);
  };

  const fieldStyle = {
    width:'100%', padding:'10px 14px', borderRadius:10,
    border:'1.5px solid rgba(139,0,0,0.18)', background:CREAM,
    fontFamily:'var(--font-sans)', fontSize:13.5, color:'#1a0000',
    outline:'none', boxSizing:'border-box',
  };
  const btnSmall = {
    padding:'10px 16px', borderRadius:10, border:'none', cursor:'pointer',
    background:`linear-gradient(135deg,${MAR},${MAR2})`,
    fontFamily:'var(--font-sans)', fontSize:12.5, fontWeight:700,
    color:GP, whiteSpace:'nowrap', flexShrink:0,
    boxShadow:'0 3px 10px rgba(139,0,0,0.25)',
  };

  return (
    <>
      {confirmData && (
        <ConfirmPopup
          data={confirmData}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}

      <div style={{
        background:`linear-gradient(135deg, rgba(139,0,0,0.05), rgba(201,168,76,0.025))`,
        border:'1.5px solid rgba(201,168,76,0.2)',
        borderRadius:16, padding:'20px 22px', marginBottom:24,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{
            width:34, height:34, borderRadius:10,
            background:`linear-gradient(135deg,${MAR},${MAR2})`,
            display:'flex', alignItems:'center', justifyContent:'center', color:GP,
          }}>{Ic.phone}</div>
          <div>
            <div style={{ fontFamily:"'Cinzel', serif", fontSize:13.5, color:GP, fontWeight:700 }}>Mobile Manual Entry</div>
            <div style={{ fontSize:11, color:'rgba(245,228,168,0.5)', fontFamily:'var(--font-sans)' }}>For student app / account-based transactions</div>
          </div>
        </div>

        {/* Student lookup */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10.5, fontWeight:700, color:G, letterSpacing:'0.09em', textTransform:'uppercase', fontFamily:'var(--font-sans)', marginBottom:6 }}>Student ID Number</div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              style={fieldStyle}
              placeholder="e.g. 2024-12345"
              value={studentIdInput}
              onChange={e => { setStudentIdInput(e.target.value); setStudentData(null); }}
              onKeyDown={e => e.key === 'Enter' && lookupStudent()}
            />
            <button style={btnSmall} onClick={lookupStudent} disabled={lookingUp === 'student'}>
              {lookingUp === 'student' ? '…' : 'Find'}
            </button>
          </div>
          {studentData && (
            <div style={{
              marginTop:8, padding:'8px 12px', borderRadius:8,
              background:'rgba(46,125,50,0.08)', border:'1px solid rgba(90,158,92,0.22)',
              fontSize:12.5, color:GP, fontFamily:'var(--font-sans)',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{ color:'#5a9e5c' }}>{Ic.check}</span>
              <div>
                <strong>{studentData.full_name}</strong>
                <span style={{ color:'rgba(245,228,168,0.5)', marginLeft:8 }}>{studentData.program}</span>
              </div>
            </div>
          )}
        </div>

        {/* Book lookup */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10.5, fontWeight:700, color:G, letterSpacing:'0.09em', textTransform:'uppercase', fontFamily:'var(--font-sans)', marginBottom:6 }}>Book ISBN or Title</div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              style={fieldStyle}
              placeholder="e.g. 978-971-1234-5678 or Clean Code"
              value={bookIdInput}
              onChange={e => { setBookIdInput(e.target.value); setBookData(null); }}
              onKeyDown={e => e.key === 'Enter' && lookupBook()}
            />
            <button style={btnSmall} onClick={lookupBook} disabled={lookingUp === 'book'}>
              {lookingUp === 'book' ? '…' : 'Find'}
            </button>
          </div>
          {bookData && (
            <div style={{
              marginTop:8, padding:'8px 12px', borderRadius:8,
              background:'rgba(46,125,50,0.08)', border:'1px solid rgba(90,158,92,0.22)',
              fontSize:12.5, color:GP, fontFamily:'var(--font-sans)',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{ color:'#5a9e5c' }}>{Ic.check}</span>
              <div>
                <strong>{bookData.title}</strong>
                <span style={{ color:'rgba(245,228,168,0.45)', marginLeft:8 }}>
                  {(bookData.available_copies ?? bookData.copies ?? 0)} available
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={initiate}
          disabled={!studentData || !bookData || loading}
          style={{
            width:'100%', padding:'13px', borderRadius:11,
            background: studentData && bookData
              ? `linear-gradient(135deg,${MAR},${MAR2})`
              : 'rgba(139,0,0,0.18)',
            border:'none', cursor: studentData && bookData ? 'pointer' : 'not-allowed',
            fontFamily:'var(--font-sans)', fontSize:14, fontWeight:700, color:GP,
            boxShadow: studentData && bookData ? '0 4px 16px rgba(139,0,0,0.3)' : 'none',
            transition:'all 0.2s',
          }}
        >
          {loading ? 'Processing…' : studentData && bookData
            ? `Proceed with ${(bookData.available_copies ?? bookData.copies ?? 0) > 0 ? 'Borrow' : 'Return'}`
            : 'Look up student and book first'}
        </button>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookManagement() {
  const [step,         setStep]         = useState(0);
  const [student,      setStudent]      = useState(null);
  const [scanning,     setScanning]     = useState(false);
  const [focused,      setFocused]      = useState(true);
  const [lastResult,   setLastResult]   = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [loadingTx,    setLoadingTx]    = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTx,   setSelectedTx]  = useState(null);


  const [toast,        setToast]        = useState({ msg:'', type:'success' });

  const inputRef   = useRef(null);
  const bufRef      = useRef('');
  const timerRef    = useRef(null);
  const refocusRef  = useRef(null);
  const processingRef = useRef(false); // lock to prevent double-scan

  const showToast = useCallback((msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'success' }), 3800);
  }, []);

  // ── Load transactions ────────────────────────────────────────────────────
  const loadTransactions = useCallback(async () => {
    setLoadingTx(true);
    const { data, error } = await supabaseAdmin
      .from('borrowings').select('*')
      .order('borrowed_at', { ascending: false }).limit(300);
    if (error) console.error('[BookManagement] load error:', error.message);
    if (data) setTransactions(data);
    setLoadingTx(false);
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  useEffect(() => {
    const ch = supabase.channel('borrowings-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'borrowings' }, loadTransactions)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadTransactions]);

  // ── Scanner focus management ─────────────────────────────────────────────
  const refocusIfSafe = useCallback(() => {
    clearTimeout(refocusRef.current);
    refocusRef.current = setTimeout(() => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (['input','textarea','select'].includes(tag)) return;
      if (document.activeElement?.isContentEditable) return;
      inputRef.current?.focus({ preventScroll:true });
    }, 80);
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll:true });
    const poll = setInterval(refocusIfSafe, 1500);
    return () => { clearInterval(poll); clearTimeout(refocusRef.current); clearTimeout(timerRef.current); };
  }, [refocusIfSafe]);

  // ── Process student scan ─────────────────────────────────────────────────
  const processStudentScan = useCallback(async (raw) => {
    const parsed = parseStudentQR(raw);
    if (!parsed) {
      playErrorSound();
      showToast('Invalid student QR — scan a valid school ID.', 'error');
      setLastResult({ type:'error', message:'Invalid student QR code', time: new Date() });
      return;
    }

    // profiles schema: first_name, last_name, username (no id_no column)
    // Try to match by username = id_no, or by first+last name as fallback
    let profile = null;
    if (parsed.id_no) {
      const { data: byUsername } = await supabase
        .from('profiles').select('*')
        .eq('username', parsed.id_no).maybeSingle();
      profile = byUsername;
    }
    if (!profile && parsed.full_name) {
      const parts = parsed.full_name.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName  = parts[parts.length - 1] || '';
      const { data: byName } = await supabase
        .from('profiles').select('*')
        .ilike('first_name', firstName + '%')
        .ilike('last_name',  lastName  + '%')
        .maybeSingle();
      profile = byName;
    }

    // Normalise: always expose id_no and full_name regardless of source
    const studentData = profile
      ? {
          ...profile,
          id_no:     profile.username || parsed.id_no || profile.id,
          full_name: [profile.first_name, profile.middle_name, profile.last_name]
                       .filter(Boolean).join(' ').trim() || parsed.full_name,
          program:   profile.program || parsed.program || '',
        }
      : parsed; // fallback: use QR-parsed values directly

    setStudent(studentData);
    setStep(1);
    showToast(`Student: ${studentData.full_name}`, 'success');
  }, [showToast]);

  // ── Process book scan ────────────────────────────────────────────────────
  const processBookScan = useCallback(async (raw) => {
    if (!student) { setStep(0); return; }
    const parsed = parseBookQR(raw);
    if (!parsed) {
      playErrorSound();
      showToast('Invalid book QR code.', 'error');
      setLastResult({ type:'error', message:'Invalid book QR code', time: new Date() });
      setStep(0); setStudent(null); return;
    }

    // ── Prevent double-scan / re-entrant processing ────────────────────────
    if (processingRef.current) return;
    processingRef.current = true;
    setStep(2);

    try {
      // ── Book lookup cascade ──────────────────────────────────────────────
      let bookRecord = null;
      let resolvedCopyId   = null;   // UUID from book_copies (if found)
      let resolvedCopyNum  = null;   // copy_number from book_copies

      if (parsed.isCopyId) {
        // ── NEW: QR encodes a copy_id UUID → look up book_copies first ────
        // Always use supabaseAdmin to bypass RLS on book_copies table
        const { data: copyRow } = await supabaseAdmin
          .from('book_copies')
          .select('copy_id, copy_number, book_id, status')
          .eq('copy_id', parsed.copy_id)
          .maybeSingle();

        if (copyRow) {
          resolvedCopyId  = copyRow.copy_id;
          resolvedCopyNum = copyRow.copy_number;
          const { data: bookByFk } = await supabaseAdmin
            .from('books').select('*').eq('id', copyRow.book_id).maybeSingle();
          bookRecord = bookByFk;
        }
      }

      if (!bookRecord && !parsed.isCopyId) {
        // ── LEGACY: try ISBN match ──────────────────────────────────────
        const { data: byIsbn } = await supabaseAdmin.from('books').select('*').eq('isbn', parsed.base).maybeSingle();
        bookRecord = byIsbn;
      }
      if (!bookRecord && !parsed.isCopyId) {
        // ── LEGACY: try books.id UUID match ────────────────────────────
        if (UUID_RE.test(parsed.base)) {
          const { data: byId } = await supabaseAdmin.from('books').select('*').eq('id', parsed.base).maybeSingle();
          bookRecord = byId;
        }
      }
      if (!bookRecord && !parsed.isCopyId) {
        const { data: rows } = await supabaseAdmin.from('books').select('*').ilike('title', parsed.base);
        bookRecord = rows?.[0] || null;
      }
      if (!bookRecord && !parsed.isCopyId) {
        const { data: rows } = await supabaseAdmin.from('books').select('*').ilike('title', `%${parsed.base}%`);
        bookRecord = rows?.[0] || null;
      }
      if (!bookRecord) {
        playErrorSound();
        showToast('Book not found in catalog.', 'error');
        setLastResult({ type:'error', message:`No book matched "${parsed.raw}"`, time: new Date() });
        setStep(0); setStudent(null); processingRef.current = false; return;
      }

      const bookId    = String(bookRecord.id);
      const bookTitle = bookRecord.title;
      // copy_label: store the copy_id UUID directly for new-format QRs (clean, unambiguous)
      // For legacy QRs, fall back to the old label or base string
      const copyLabel = resolvedCopyId
        ? resolvedCopyId
        : (parsed.copyLabel || parsed.base);

      // ── Find any open borrow for this exact physical copy ─────────────────
      // CRITICAL: use supabaseAdmin to bypass RLS — without this, the query
      // always returns empty and every scan is treated as a new borrow.
      // We query by copy_label (copy_id UUID) only, then match the student
      // client-side to handle all possible student_id formats.
      const { data: openBorrowRows } = await supabaseAdmin
        .from('borrowings')
        .select('id, borrowed_at, book_id, copy_label, student_id, student_name')
        .eq('copy_label', copyLabel)
        .eq('status', 'Borrowed')
        .order('borrowed_at', { ascending: true })
        .limit(10);

      // Match student by any identifier stored in profiles
      const studentIdentifiers = [student.id_no, student.id, student.username]
        .filter(Boolean).map(String);

      const openBorrow = (openBorrowRows || []).find(row =>
        studentIdentifiers.includes(String(row.student_id))
      ) ?? null;

      // Guard: copy is already borrowed by a DIFFERENT student
      const borrowedByOther = !openBorrow && (openBorrowRows || []).length > 0
        ? openBorrowRows[0] : null;
      if (borrowedByOther) {
        playErrorSound();
        showToast(`Copy already borrowed by ${borrowedByOther.student_name || 'another student'}.`, 'error');
        setLastResult({ type:'error', message:`Copy already out — borrowed by ${borrowedByOther.student_name}`, time: new Date() });
        setStep(0); setStudent(null); processingRef.current = false; return;
      }

      const existingBorrow = openBorrow;
      const isBorrow = !existingBorrow; // no open record → borrow; has open record → return
      const action   = isBorrow ? 'borrowed' : 'returned';

      // Inform admin what action is about to happen
      if (!isBorrow) {
        showToast(`Returning: "${bookTitle}" — open borrow found, processing return…`, 'success');
      }

      // ── Hard guard: same QR already borrowed → must return first ─────────
      // This is the single-scan-per-state rule:
      //   Scan 1 (no open record) → Borrow
      //   Scan 2 (open record exists) → Return
      //   Scan 3 after return → new Borrow again (clean state)
      if (!isBorrow && !existingBorrow) {
        // Should never reach here, but safety net
        playErrorSound();
        showToast('No open borrow found for this copy.', 'error');
        setStep(0); setStudent(null); processingRef.current = false; return;
      }

      // ── Borrow limit check ───────────────────────────────────────────────
      if (isBorrow) {
        // Use supabaseAdmin + in() to match any possible student identifier format
        const { data: borrowedRows } = await supabaseAdmin
          .from('borrowings')
          .select('id', { count:'exact' })
          .in('student_id', studentIdentifiers)
          .eq('status', 'Borrowed');
        const borrowCount = (borrowedRows || []).length;
        if (borrowCount >= BORROW_LIMIT) {
          playErrorSound();
          showToast(`Borrow limit reached — max ${BORROW_LIMIT} books allowed.`, 'error');
          setLastResult({ type:'error', message:`Borrow limit of ${BORROW_LIMIT} books reached.`, time: new Date() });
          setStep(0); setStudent(null); processingRef.current = false; return;
        }
        // Also check copies available — re-fetch fresh count to avoid stale data
        const { data: freshBook } = await supabaseAdmin
          .from('books').select('copies').eq('id', bookRecord.id).maybeSingle();
        const freshCopies = freshBook?.copies ?? bookRecord.copies ?? 0;
        if (freshCopies <= 0) {
          playErrorSound();
          showToast('No copies available for this book.', 'error');
          setLastResult({ type:'error', message:'No copies available.', time: new Date() });
          setStep(0); setStudent(null); processingRef.current = false; return;
        }
        // Update bookRecord with fresh copy count
        bookRecord = { ...bookRecord, copies: freshCopies };
      }

      // ── Update book copies count ─────────────────────────────────────────
      // Uses `copies` column (matches your schema)
      const currentCopies = bookRecord.copies ?? 0;
      const newCopies = isBorrow
        ? Math.max(0, currentCopies - 1)
        : currentCopies + 1;

      const { error: bookUpdateErr } = await supabaseAdmin
        .from('books')
        .update({
          copies: newCopies,
          status: newCopies <= 0 ? 'Borrowed' : 'Available',
        })
        .eq('id', bookRecord.id);

      if (bookUpdateErr) {
        playErrorSound();
        showToast(`Failed to update book copies: ${bookUpdateErr.message}`, 'error');
        setStep(0); setStudent(null); processingRef.current = false; return;
      }

      // ── Also update the individual book_copies row status ────────────────
      if (resolvedCopyId) {
        await supabaseAdmin
          .from('book_copies')
          .update({ status: isBorrow ? 'Borrowed' : 'Available' })
          .eq('copy_id', resolvedCopyId);
      }

      if (isBorrow) {
        // ── INSERT new borrowing record ──────────────────────────────────
        const borrowedAt = nowISO();
        const txPayload = {
          student_id:      student.id_no,
          student_name:    student.full_name,
          student_program: student.program || '',
          book_id:         bookId,
          book_title:      bookTitle,
          copy_label:      copyLabel,
          status:          'Borrowed',
          borrowed_at:     borrowedAt,
          returned_at:     null,          // ← NOT set on borrow
          date:            today(),
        };

        const { data: newTx, error: txErr } = await supabaseAdmin
          .from('borrowings').insert([txPayload]).select().single();

        if (txErr) {
          // Rollback copies change
          await supabaseAdmin.from('books').update({ copies: currentCopies }).eq('id', bookRecord.id);
          playErrorSound();
          showToast(`DB error: ${txErr.message}`, 'error');
          setLastResult({ type:'error', message: txErr.message, time: new Date() });
          setStep(0); setStudent(null); processingRef.current = false; return;
        }

        playSuccessSound();
        const result = { ...txPayload, id: newTx?.id };
        setLastResult({ type:'success', action:'borrowed', data: result, time: new Date() });
        showToast(`Borrowed: "${bookTitle}" — ${student.full_name}`, 'success');
        setTransactions(prev => [result, ...prev]);

      } else {
        // ── UPDATE existing borrowing record to returned ─────────────────
        const returnedAt = nowISO(); // ← separate timestamp from borrowed_at

        // Update ONLY the specific borrowing row by its primary key — most precise possible
        const { error: retErr } = await supabaseAdmin
          .from('borrowings')
          .update({
            status:      'Returned',
            returned_at: returnedAt,
          })
          .eq('id', existingBorrow.id);  // ← target exact row by PK

        if (retErr) {
          // Rollback copies change
          await supabaseAdmin.from('books').update({ copies: currentCopies }).eq('id', bookRecord.id);
          playErrorSound();
          showToast(`DB error: ${retErr.message}`, 'error');
          setLastResult({ type:'error', message: retErr.message, time: new Date() });
          setStep(0); setStudent(null); processingRef.current = false; return;
        }

        playSuccessSound();
        const result = {
          id:              existingBorrow.id,
          student_id:      student.id_no,
          student_name:    student.full_name,
          student_program: student.program || '',
          book_id:         bookId,
          book_title:      bookTitle,
          copy_label:      copyLabel,
          status:          'Returned',
          borrowed_at:     existingBorrow.borrowed_at,  // ← original borrow time preserved
          returned_at:     returnedAt,
          date:            today(),
        };
        setLastResult({ type:'success', action:'returned', data: result, time: new Date() });
        showToast(`Returned: "${bookTitle}" — ${student.full_name}`, 'success');
      }

      loadTransactions();

    } catch (err) {
      playErrorSound();
      showToast(`Error: ${err.message}`, 'error');
      setLastResult({ type:'error', message: err.message, time: new Date() });
    }

    setStep(0); setStudent(null);
    processingRef.current = false;
  }, [student, showToast, loadTransactions]);

  // ── Keyboard handler ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') {
      const raw = bufRef.current.trim();
      bufRef.current = ''; setScanning(false); clearTimeout(timerRef.current);
      if (raw.length < 3) return;
      if (step === 0) processStudentScan(raw);
      else if (step === 1) processBookScan(raw);
    } else if (e.key.length === 1) {
      bufRef.current += e.key; setScanning(true); clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { bufRef.current = ''; setScanning(false); }, 2500);
    }
  }, [step, processStudentScan, processBookScan]);

  const resetScan = () => {
    setStep(0); setStudent(null); bufRef.current = ''; setScanning(false);
    inputRef.current?.focus({ preventScroll:true });
  };

  // ── Delete transaction ──────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(null); // holds tx to delete

  const handleDeleteTx = useCallback((tx) => {
    setDeleteConfirm(tx);
  }, []);

  const confirmDeleteTx = useCallback(async () => {
    const tx = deleteConfirm;
    if (!tx) return;
    setDeleteConfirm(null);
    try {
      const { error } = await supabaseAdmin.from('borrowings').delete().eq('id', tx.id);
      if (error) { showToast(`Delete failed: ${error.message}`, 'error'); return; }
      setTransactions(prev => prev.filter(t => t.id !== tx.id));
      showToast('Transaction deleted.', 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  }, [deleteConfirm, showToast]);

  // ── Filtered transactions ────────────────────────────────────────────────
  const filtered = transactions.filter(tx => {
    const q = search.toLowerCase();
    const matchQ = !q || [tx.student_name, tx.student_id, tx.book_title, tx.copy_label].some(v => v?.toLowerCase().includes(q));
    const matchS = statusFilter === 'all' || tx.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchQ && matchS;
  });

  const borrowedCount = transactions.filter(t => t.status?.toLowerCase() === 'borrowed').length;
  const returnedToday = transactions.filter(t => t.status?.toLowerCase() === 'returned' && t.date === today()).length;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="lm-module" style={{ userSelect:'none' }}>

      {/* Hidden keyboard capture */}
      <input
        ref={inputRef} onKeyDown={handleKeyDown}
        onBlur={() => { setFocused(false); refocusIfSafe(); }}
        onFocus={() => setFocused(true)}
        readOnly aria-hidden="true" tabIndex={-1}
        style={{ position:'fixed', top:0, left:0, width:1, height:1, opacity:0, pointerEvents:'none', zIndex:-1, border:'none', outline:'none', background:'transparent' }}
      />

      {/* ── Summary stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Transactions', value: transactions.length, color: MAR, icon:'📋' },
          { label:'Currently Borrowed', value: borrowedCount, color:'#c0564e', icon:'📤' },
          { label:'Returned Today',     value: returnedToday, color:'#4a8e4c', icon:'📥' },
          { label:'Borrow Limit',       value: `${BORROW_LIMIT} books`, color: G, icon:'⚠' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background:`linear-gradient(135deg, ${MAR}, ${MAR2})`,
            border:`1px solid rgba(201,168,76,0.3)`,
            borderRadius:14, padding:'16px 18px',
            boxShadow:'0 4px 16px rgba(139,0,0,0.2)',
          }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
            <div style={{ fontFamily:"'Cinzel', serif", fontSize:22, color:GP, fontWeight:700 }}>{value}</div>
            <div style={{ fontSize:11, color:'rgba(245,228,168,0.55)', fontFamily:'var(--font-sans)', marginTop:3, letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Scanner Panel ── */}
      <div style={{
        borderRadius:20,
        border:'1.5px solid rgba(139,0,0,0.14)',
        background:'linear-gradient(160deg, rgba(253,248,240,0.9) 0%, rgba(250,244,232,0.95) 100%)',
        boxShadow:'0 8px 40px rgba(80,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
        marginBottom:24, overflow:'hidden',
        position:'relative',
      }}>
        {/* Decorative top bar */}
        <div style={{
          height:4,
          background:`linear-gradient(90deg, ${MAR2}, ${MAR}, ${G}, ${MAR}, ${MAR2})`,
          backgroundSize:'200% 100%',
          animation:'bm-shimmer-bar 3s ease-in-out infinite',
        }}/>

        {/* Header */}
        <div style={{
          padding:'20px 28px 0',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{
              fontFamily:"'Cinzel', serif", fontSize:15, fontWeight:700,
              color:'var(--maroon-deep)', letterSpacing:'0.06em',
              display:'flex', alignItems:'center', gap:10,
            }}>
              <div style={{
                width:32, height:32, borderRadius:9,
                background:`linear-gradient(135deg,${MAR},${MAR2})`,
                display:'flex', alignItems:'center', justifyContent:'center', color:G,
                boxShadow:'0 3px 12px rgba(139,0,0,0.3)',
                flexShrink:0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
                </svg>
              </div>
              QR Scanner
            </div>
            <div style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'var(--font-sans)', marginTop:3, letterSpacing:'0.04em' }}>
              Scan student ID then book QR to borrow or return
            </div>
          </div>

          {/* Focus indicator pill */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'5px 12px', borderRadius:20,
            background: focused ? 'rgba(46,125,50,0.09)' : 'rgba(201,168,76,0.09)',
            border:`1px solid ${focused ? 'rgba(90,158,92,0.3)' : 'rgba(201,168,76,0.3)'}`,
            fontSize:10.5, fontFamily:'var(--font-sans)', fontWeight:600,
            color: focused ? '#5a9e5c' : G,
            letterSpacing:'0.06em', textTransform:'uppercase',
            cursor: focused ? 'default' : 'pointer',
            transition:'all 0.3s',
          }} onClick={() => inputRef.current?.focus({ preventScroll:true })}>
            <span style={{
              width:6, height:6, borderRadius:'50%',
              background: focused ? '#5a9e5c' : G,
              animation: focused ? 'bm-blink 2s ease-in-out infinite' : 'none',
              flexShrink:0,
            }}/>
            {focused ? 'Scanner Active' : 'Click to Activate'}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ padding:'22px 28px 0', display:'flex', alignItems:'center', justifyContent:'center', gap:0 }}>
          <StepDot n={1} active={step === 0} done={step > 0} label="Scan ID" />
          <div style={{
            flex:1, maxWidth:80, height:2, margin:'0 6px', marginBottom:20,
            borderRadius:2,
            background: step > 0
              ? 'linear-gradient(90deg,rgba(90,158,92,0.5),rgba(90,158,92,0.3))'
              : 'rgba(139,0,0,0.08)',
            transition:'background 0.5s',
            position:'relative', overflow:'hidden',
          }}>
            {step > 0 && <div style={{
              position:'absolute', inset:0,
              background:'linear-gradient(90deg,transparent,rgba(90,158,92,0.5),transparent)',
              animation:'bm-scan-line 1.5s ease-in-out',
            }}/>}
          </div>
          <StepDot n={2} active={step === 1} done={step === 2} label="Scan Book" />
          <div style={{
            flex:1, maxWidth:80, height:2, margin:'0 6px', marginBottom:20,
            borderRadius:2,
            background: step === 2
              ? 'linear-gradient(90deg,rgba(90,158,92,0.5),rgba(90,158,92,0.3))'
              : 'rgba(139,0,0,0.08)',
            transition:'background 0.5s',
          }}/>
          <StepDot n={3} active={step === 2} done={false} label="Process" />
        </div>

        {/* Scan zones */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:'16px 28px' }}>
          <ScanZone
            stepNum={1}
            active={step === 0} scanning={step === 0 && scanning} focused={step === 0 && focused}
            onFocus={() => inputRef.current?.focus({ preventScroll:true })}
            title="Scan Student ID" hint="Point the scanner at your school ID QR code"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          />
          <ScanZone
            stepNum={2}
            active={step === 1} scanning={step === 1 && scanning} focused={step === 1 && focused}
            onFocus={() => inputRef.current?.focus({ preventScroll:true })}
            title="Scan Book QR" hint={step === 0 ? 'Waiting for student ID…' : 'Scan the QR label on the book'}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
          />
        </div>

        {/* Student chip — shown when student scanned */}
        {student && (
          <div style={{ padding:'0 28px 16px' }}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'linear-gradient(135deg,rgba(139,0,0,0.07),rgba(90,0,0,0.04))',
              border:'1.5px solid rgba(201,168,76,0.28)',
              borderRadius:14, padding:'13px 16px',
              animation:'bm-slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow:'0 4px 18px rgba(139,0,0,0.08)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:13 }}>
                <div style={{
                  width:40, height:40, borderRadius:'50%',
                  background:`linear-gradient(135deg,${MAR},${MAR2})`,
                  display:'flex', alignItems:'center', justifyContent:'center', color:G,
                  boxShadow:'0 4px 14px rgba(139,0,0,0.3)',
                  fontSize:16,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--maroon-deep)', fontFamily:"'Cinzel', serif", letterSpacing:'0.03em' }}>
                    {student.full_name}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'var(--font-sans)', marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'monospace', background:'rgba(139,0,0,0.07)', padding:'1px 6px', borderRadius:4 }}>{student.id_no}</span>
                    {student.program && <span>{student.program}</span>}
                  </div>
                </div>
              </div>
              <button onClick={resetScan} style={{
                background:'rgba(139,0,0,0.07)', border:'1px solid rgba(139,0,0,0.18)',
                borderRadius:9, padding:'7px 13px', cursor:'pointer',
                fontSize:11.5, color:'var(--text-muted)', fontFamily:'var(--font-sans)',
                display:'flex', alignItems:'center', gap:6, fontWeight:600,
                transition:'all 0.18s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(139,0,0,0.14)'; e.currentTarget.style.color='var(--maroon-mid)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(139,0,0,0.07)'; e.currentTarget.style.color='var(--text-muted)'; }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Processing state */}
        {step === 2 && (
          <div style={{ padding:'0 28px 16px' }}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:12,
              padding:'14px', borderRadius:12,
              background:'rgba(139,0,0,0.05)', border:'1px solid rgba(139,0,0,0.12)',
            }}>
              <div className="lm-spinner" />
              <span style={{ fontSize:13, color:'var(--maroon-mid)', fontFamily:'var(--font-sans)', fontWeight:600 }}>
                Processing transaction…
              </span>
            </div>
          </div>
        )}

        {/* Last result */}
        {lastResult && (
          <div style={{ padding:'0 28px 20px' }}>
            <ScanResultCard result={lastResult} />
          </div>
        )}

        {/* Footer bar */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'11px 28px',
          background:'rgba(139,0,0,0.03)',
          borderTop:'1px solid rgba(139,0,0,0.08)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ color:G, flexShrink:0 }}>{Ic.limit}</span>
            <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'var(--font-sans)' }}>
              Borrow limit: <strong style={{ color:G }}>{BORROW_LIMIT} books</strong> per student
            </span>
          </div>
          <div style={{
            fontSize:10.5, color:'var(--text-dim)', fontFamily:'var(--font-sans)',
            letterSpacing:'0.04em',
          }}>
            Scan once = Borrow · Scan again = Return
          </div>
        </div>
      </div>

      {/* ── Transaction Table ── */}
      <div className="lm-panel" style={{ marginBottom:0, padding:0, overflow:'hidden', borderRadius:14, border:'1.5px solid rgba(139,0,0,0.14)' }}>

        {/* Table header bar */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
          padding:'16px 20px',
          background:`linear-gradient(135deg, rgba(139,0,0,0.04), rgba(201,168,76,0.02))`,
          borderBottom:'1.5px solid rgba(139,0,0,0.1)',
        }}>
          <div style={{ fontFamily:"'Cinzel', serif", fontSize:15, color:'var(--text-cream)', fontWeight:700 }}>
            Transaction History
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)', pointerEvents:'none' }}>{Ic.search}</span>
              <input
                type="text" placeholder="Search student or book…"
                value={search} onChange={e => setSearch(e.target.value)}
                onFocus={() => setFocused(false)}
                onBlur={() => { setFocused(true); refocusIfSafe(); }}
                style={{
                  paddingLeft:32, paddingRight:10, height:35,
                  background:'var(--cream-light)', border:'1.5px solid rgba(139,0,0,0.15)',
                  borderRadius:9, fontSize:12.5, color:'var(--text-primary)',
                  fontFamily:'var(--font-sans)', outline:'none', width:210,
                }}
              />
            </div>
            <select
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              onFocus={() => setFocused(false)}
              onBlur={() => { setFocused(true); refocusIfSafe(); }}
              style={{
                height:35, padding:'0 10px', background:'var(--cream-light)',
                border:'1.5px solid rgba(139,0,0,0.15)', borderRadius:9,
                fontSize:12.5, color:'var(--text-primary)', fontFamily:'var(--font-sans)',
                outline:'none', cursor:'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="borrowed">Borrowed</option>
              <option value="returned">Returned</option>
            </select>
            <span style={{ fontSize:11.5, color:'var(--text-dim)', fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loadingTx ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'48px 0', background: CREAM }}>
            <div className="lm-spinner" />
            <span style={{ color:'var(--text-muted)', fontSize:13, fontFamily:'var(--font-sans)' }}>Loading transactions…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px', background: CREAM }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
            <div style={{ fontFamily:"'Cinzel', serif", fontSize:14, color:'var(--text-primary)', marginBottom:6 }}>No transactions found</div>
            <div style={{ fontSize:12.5, color:'var(--text-dim)', fontFamily:'var(--font-sans)' }}>{search ? 'Try a different search term.' : 'Start scanning to log borrowing activity.'}</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
              <thead>
                <tr style={{ background:`linear-gradient(135deg, ${MAR}, ${MAR2})` }}>
                  {['Student ID','Student Name','Book Title','Status','Borrowed At','Returned At','Actions'].map(h => (
                    <th key={h} style={{
                      padding:'13px 16px', textAlign:'left',
                      fontFamily:'var(--font-sans)', fontSize:10.5,
                      fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase',
                      color: GP, whiteSpace:'nowrap',
                      borderBottom:`2.5px solid rgba(201,168,76,0.4)`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => (
                  <TxRow key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} onDelete={handleDeleteTx} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTx && <DetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div style={{
          position:'fixed', inset:0, zIndex:3000,
          background:'rgba(10,0,0,0.78)', backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:20,
          animation:'bm-fadeIn 0.2s ease',
        }}>
          <div style={{
            background: CREAM, borderRadius:20, width:'100%', maxWidth:380,
            border:`2px solid rgba(201,168,76,0.35)`,
            boxShadow:'0 24px 64px rgba(0,0,0,0.55)',
            animation:'bm-slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            overflow:'hidden',
          }}>
            <div style={{
              background:`linear-gradient(135deg, ${MAR}, ${MAR2})`,
              padding:'18px 24px',
              borderBottom:`2px solid rgba(201,168,76,0.3)`,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <span style={{ fontSize:20 }}>🗑</span>
              <div>
                <div style={{ fontFamily:"'Cinzel', serif", fontSize:15, color:GP, fontWeight:700 }}>Delete Transaction</div>
                <div style={{ fontSize:11.5, color:'rgba(245,228,168,0.6)', fontFamily:'var(--font-sans)', marginTop:2 }}>This action cannot be undone</div>
              </div>
            </div>
            <div style={{ padding:'20px 24px' }}>
              <div style={{
                padding:'12px 14px', borderRadius:10, marginBottom:18,
                background:'rgba(139,0,0,0.06)', border:'1px solid rgba(139,0,0,0.15)',
              }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#1a0000', fontFamily:'var(--font-sans)', marginBottom:3 }}>{deleteConfirm.book_title}</div>
                <div style={{ fontSize:12, color:'#6b4040', fontFamily:'var(--font-sans)' }}>{deleteConfirm.student_name} · {deleteConfirm.student_id}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{
                  padding:'12px', borderRadius:10, border:`1.5px solid rgba(139,0,0,0.2)`,
                  background:'transparent', cursor:'pointer',
                  fontFamily:'var(--font-sans)', fontSize:13.5, fontWeight:600, color:MAR,
                }}>Cancel</button>
                <button onClick={confirmDeleteTx} style={{
                  padding:'12px', borderRadius:10, border:'none',
                  background:`linear-gradient(135deg, ${MAR}, ${MAR2})`,
                  cursor:'pointer',
                  fontFamily:'var(--font-sans)', fontSize:13.5, fontWeight:700, color:GP,
                  boxShadow:'0 4px 14px rgba(139,0,0,0.3)',
                }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toast msg={toast.msg} type={toast.type} />

      <style>{`
        @keyframes bm-slideUp {
          from { opacity:0; transform:translateY(14px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes bm-fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes bm-pulse {
          0%, 100% { opacity:0.4; transform:scale(1); }
          50%       { opacity:0.9; transform:scale(1.06); }
        }
        @keyframes bm-blink {
          0%, 100% { opacity:1; }
          50%       { opacity:0.35; }
        }
        @keyframes bm-spin-ring {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes bm-shimmer {
          0%, 100% { opacity:0.4; left:20%; right:20%; }
          50%       { opacity:1;   left:10%; right:10%; }
        }
        @keyframes bm-shimmer-bar {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes bm-scan-line {
          from { transform:translateX(-100%); }
          to   { transform:translateX(100%); }
        }
      `}</style>
    </div>
  );
}