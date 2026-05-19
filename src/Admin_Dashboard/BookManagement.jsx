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

function playBellSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0,    0.15);
    beep(1100, 0.18, 0.2);
    beep(880, 0.40, 0.25);
  } catch { /* silent fail */ }
}

// ─── Safe books sync helper ───────────────────────────────────────────────────
// Updates books.copies, books.status (and books.available_copies if the column exists).
// Always uses book_copies rows as the source of truth so the catalog stays in sync.
async function syncBooksFromCopies(bookId) {
  const { data: allCopies } = await supabaseAdmin
    .from('book_copies').select('status').eq('book_id', bookId);
  const total     = (allCopies || []).length;
  const available = (allCopies || []).filter(c => c.status === 'Available').length;
  const newStatus = available === 0 ? 'Borrowed' : 'Available';

  // Try full update (with available_copies column)
  const { error: fullErr } = await supabaseAdmin.from('books').update({
    copies:           total,
    available_copies: available,
    status:           newStatus,
  }).eq('id', bookId);

  // If available_copies column doesn't exist, retry without it
  if (fullErr && (fullErr.code === '42703' || fullErr.message?.includes('available_copies') || fullErr.message?.includes('column'))) {
    console.warn('[syncBooksFromCopies] available_copies column missing — syncing without it');
    await supabaseAdmin.from('books').update({
      copies: total,
      status: newStatus,
    }).eq('id', bookId);
  } else if (fullErr) {
    console.warn('[syncBooksFromCopies] update error:', fullErr.message);
  }

  return { total, available };
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
// Removed — confirmation is shown inline via ScanResultCard only.
function Toast({ msg, type }) { return null; }

// ─── Confirmation Popup (Mobile) ──────────────────────────────────────────────
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
        ? `linear-gradient(150deg, #5A0000 0%, #8B0000 45%, #6B0000 100%)`
        : 'rgba(139,0,0,0.04)',
      border: active
        ? `2px solid rgba(201,168,76,0.55)`
        : '1.5px solid rgba(139,0,0,0.12)',
      borderRadius:18, padding:'28px 22px', textAlign:'center',
      transition:'all 0.3s ease', cursor:'pointer',
      opacity: active ? 1 : 0.55,
      position:'relative', overflow:'hidden',
      boxShadow: active
        ? '0 12px 40px rgba(80,0,0,0.30), inset 0 1px 0 rgba(245,228,168,0.12)'
        : 'none',
    }}>
      {/* Decorative shimmer stripe at top when active */}
      {active && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg, transparent, ${G}, rgba(201,168,76,0.4), transparent)`,
          animation:'bm-shimmer 2.5s ease-in-out infinite',
          borderRadius:'18px 18px 0 0',
        }}/>
      )}

      {/* Corner accent */}
      {active && <>
        <div style={{ position:'absolute', top:0, left:0, width:50, height:50,
          background:'linear-gradient(135deg, rgba(201,168,76,0.15), transparent)',
          borderRadius:'18px 0 50px 0', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, right:0, width:70, height:70,
          background:'linear-gradient(315deg, rgba(0,0,0,0.15), transparent)',
          borderRadius:'50px 0 18px 0', pointerEvents:'none' }} />
      </>}

      {/* Step badge */}
      <div style={{
        position:'absolute', top:12, right:14,
        fontSize:9, fontWeight:800, letterSpacing:'0.12em',
        color: active ? 'rgba(245,228,168,0.55)' : 'rgba(139,0,0,0.25)',
        fontFamily:'var(--font-sans)', textTransform:'uppercase',
      }}>STEP {stepNum}</div>

      {/* Icon orb */}
      <div style={{
        width:72, height:72, borderRadius:'50%', margin:'0 auto 18px',
        background: active
          ? `radial-gradient(circle at 35% 35%, rgba(245,228,168,0.22), rgba(0,0,0,0.25))`
          : 'rgba(139,0,0,0.06)',
        border: active
          ? `2px solid rgba(201,168,76,0.50)`
          : '1.5px solid rgba(139,0,0,0.10)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color: active ? '#F5E4A8' : 'rgba(139,0,0,0.35)',
        boxShadow: active && focused
          ? `0 0 0 8px rgba(201,168,76,0.10), 0 0 28px rgba(201,168,76,0.22)`
          : active ? '0 6px 22px rgba(0,0,0,0.25)' : 'none',
        transition:'all 0.35s ease',
        position:'relative',
      }}>
        {icon}
        {scanning && (
          <div style={{
            position:'absolute', inset:-5, borderRadius:'50%',
            border:`2.5px solid rgba(201,168,76,0.65)`,
            animation:'bm-spin-ring 0.9s linear infinite',
          }}/>
        )}
      </div>

      {/* Status row */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:8 }}>
        {scanning && (
          <span style={{
            width:8, height:8, borderRadius:'50%', background:'#C9A84C',
            display:'inline-block', animation:'bm-blink 0.7s ease-in-out infinite', flexShrink:0,
          }}/>
        )}
        <div style={{
          fontFamily:"'Cinzel', serif", fontSize:14,
          color: active ? '#F5E4A8' : 'rgba(80,0,0,0.50)',
          fontWeight: active ? 700 : 500,
          letterSpacing:'0.05em',
          textShadow: active ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
        }}>
          {scanning ? 'Reading…' : title}
        </div>
      </div>

      <div style={{
        fontSize:11.5,
        color: active ? 'rgba(245,228,168,0.70)' : 'rgba(80,0,0,0.35)',
        lineHeight:1.7, fontFamily:'var(--font-sans)',
        maxWidth:190, margin:'0 auto',
        fontWeight: active ? 500 : 400,
      }}>{hint}</div>

      {/* Active bottom glow bar */}
      {active && (
        <div style={{
          position:'absolute', bottom:0, left:'15%', right:'15%', height:2,
          background:`linear-gradient(90deg, transparent, ${G}, transparent)`,
          borderRadius:2, animation:'bm-shimmer 2s ease-in-out infinite',
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

  // Muted teal/cream palette — matches Attendance Log card style
  const cfg = ok
    ? isBorrow
      ? {
          bg:'rgba(245,235,235,0.97)',
          border:'rgba(160,60,60,0.30)',
          accent:'#6b1a1a',
          accentDim:'rgba(107,26,26,0.75)',
          label:'BORROWED',
          labelColor:'#8b2020',
          dot:'#c07070',
          timeColor:'rgba(107,26,26,0.65)',
          innerBg:'rgba(255,255,255,0.55)',
          innerBorder:'rgba(160,60,60,0.18)',
          nameColor:'#4a1010',
          copyColor:'rgba(107,26,26,0.55)',
          copyBg:'rgba(160,60,60,0.08)',
          icon:null,
          timeLabel:'Borrowed at',
        }
      : {
          bg:'rgba(232,242,235,0.97)',
          border:'rgba(100,160,110,0.35)',
          accent:'#2d5a35',
          accentDim:'rgba(45,90,53,0.75)',
          label:'RETURNED',
          labelColor:'#2d6b3a',
          dot:'#6aaa78',
          timeColor:'rgba(45,90,53,0.65)',
          innerBg:'rgba(255,255,255,0.55)',
          innerBorder:'rgba(100,160,110,0.20)',
          nameColor:'#1e3d24',
          copyColor:'rgba(45,90,53,0.55)',
          copyBg:'rgba(100,160,110,0.10)',
          icon:null,
          timeLabel:'Returned at',
        }
    : {
        bg:'rgba(245,235,235,0.97)',
        border:'rgba(180,100,100,0.30)',
        accent:'#7a2a2a',
        accentDim:'rgba(122,42,42,0.75)',
        label:'FAILED',
        labelColor:'#8b3030',
        dot:'#c07070',
        timeColor:null,
        innerBg:'rgba(255,255,255,0.50)',
        innerBorder:'rgba(180,100,100,0.18)',
        nameColor:null,
        copyColor:null,
        copyBg:null,
        icon:null,
        timeLabel:null,
      };


  return (
    <div style={{
      borderRadius:14, overflow:'hidden',
      border:`1.5px solid ${cfg.border}`,
      background: cfg.bg,
      boxShadow:'0 4px 20px rgba(0,0,0,0.10)',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px', borderBottom:`1px solid ${cfg.innerBorder}` }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: cfg.labelColor, fontFamily:'var(--font-sans)' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
          {cfg.label}
        </span>
        {ok && result.data && (
          <span style={{ fontSize:11, color: cfg.timeColor, fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>
            {cfg.timeLabel}: {isBorrow ? fmtTime(result.data?.borrowed_at) : fmtTime(result.data?.returned_at)}
          </span>
        )}
      </div>
      {ok && result.data && (
        <div style={{ padding:'14px 18px' }}>
          <div style={{ background: cfg.innerBg, borderRadius:11, padding:'13px 16px', border:`1px solid ${cfg.innerBorder}` }}>
            <div style={{ fontSize:15, color: cfg.accent, fontWeight:700, fontFamily:"'Cinzel', serif", letterSpacing:'0.04em', lineHeight:1.45, textAlign:'center', marginBottom:10 }}>
              {result.data.book_title}
            </div>
            <div style={{ height:1, background: cfg.innerBorder, marginBottom:10 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12.5, color: cfg.nameColor, fontFamily:'var(--font-sans)', fontWeight:600 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {(result.data.student_name || '').replace(/\s*\[.*?\]\s*$/, '')}
              </span>
              {result.data.copy_label && (
                <span style={{ fontSize:10.5, fontFamily:'monospace', color: cfg.copyColor, background: cfg.copyBg, padding:'3px 9px', borderRadius:6 }}>
                  Copy: {String(result.data.copy_label).slice(0, 8)}…
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {!ok && (
        <div style={{ padding:'14px 18px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'11px 14px', borderRadius:10, background:'rgba(180,80,80,0.08)', border:`1px solid ${cfg.innerBorder}` }}>
            <span style={{ color:'#8b3030', fontSize:14, flexShrink:0 }}>✕</span>
            <span style={{ fontSize:13, color:'#7a2a2a', fontFamily:'var(--font-sans)', lineHeight:1.65, fontWeight:500 }}>{result.message || 'Unknown error'}</span>
          </div>
        </div>
      )}
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
            <DRow label="Student No."   value={(() => {
              const embedded = String(tx.student_name || '').match(/\[([^\]]+)\]$/)?.[1]?.trim() || null;
              const fromId = tx.student_id && !UUID_RE.test(String(tx.student_id).trim()) ? String(tx.student_id).trim() : null;
              return embedded || fromId || '—';
            })()} mono />
            <DRow label="Name"     value={(tx.student_name || '').replace(/\s*\[.*?\]\s*$/, '') || '—'} />
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
        background: hov ? '#FFFFFF' : CREAM,
        borderBottom:'1px solid rgba(139,0,0,0.07)',
        cursor:'pointer',
        transition:'background 0.18s, box-shadow 0.18s',
        boxShadow: hov ? 'inset 3px 0 0 0 #C9A84C, 0 2px 12px rgba(139,0,0,0.07)' : 'inset 3px 0 0 0 transparent',
      }}
    >
      <td style={{ padding:'11px 14px' }}>
        {(() => {
          // student_number is embedded in student_name as "NAME [2023-12345]"
          // Also check student_id in case it's a readable number (not UUID)
          const nameField = String(tx.student_name || '');
          const embedded = nameField.match(/\[([^\]]+)\]$/)?.[1]?.trim() || null;
          const fromId = tx.student_id && !UUID_RE.test(String(tx.student_id).trim())
            ? String(tx.student_id).trim() : null;
          const displayId = embedded || fromId || null;
          return displayId
            ? <span style={{ fontSize:12, fontFamily:'monospace', color:'#7a4040', letterSpacing:'0.04em', fontWeight:600 }}>{displayId}</span>
            : <span style={{ fontSize:11.5, color:'#b08080', fontFamily:'var(--font-sans)', fontStyle:'italic' }}>no ID recorded</span>;
        })()}
      </td>
      <td style={{ padding:'11px 14px' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#1a0000', fontFamily:'var(--font-sans)' }}>{(tx.student_name || '—').replace(/\s*\[.*?\]\s*$/, '')}</span>
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
            border:`1.5px solid ${delHov ? 'rgba(139,0,0,0.4)' : 'rgba(139,0,0,0.18)'}`,
            background: delHov ? 'rgba(139,0,0,0.08)' : 'transparent',
            transition:'all 0.18s',
            fontFamily:'var(--font-sans)', fontSize:11, fontWeight:700,
            color: delHov ? MAR : '#9a7070',
            letterSpacing:'0.04em',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={delHov ? MAR : '#9a7070'} strokeWidth="2.2">
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
      showToast('Student Number not found in system', 'error');
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

      // Update books table from book_copies
      await syncBooksFromCopies(bookData.id);

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
          <div style={{ fontSize:10.5, fontWeight:700, color:G, letterSpacing:'0.09em', textTransform:'uppercase', fontFamily:'var(--font-sans)', marginBottom:6 }}>Student Number</div>
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

// ─── Tab CSS (scoped with "bm-tab-" prefix) ───────────────────────────────────
const TAB_CSS = `
  .bm-tabs {
    display: flex;
    border-bottom: 1px solid rgba(139,0,0,0.18);
    margin-bottom: 24px;
    gap: 0;
  }
  .bm-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 24px;
    border: none;
    border-bottom: 2.5px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted, #7A3030);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    user-select: none;
  }
  .bm-tab:hover  { color: var(--text-secondary, #5A1010); }
  .bm-tab.bm-on  {
    font-weight: 700;
    color: #8B0000;
    border-bottom-color: #8B0000;
  }
  .bm-tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    font-size: 10px;
    font-weight: 800;
    font-family: var(--font-sans);
    line-height: 1;
    background: rgba(139,0,0,0.10);
    color: #8B0000;
    border: 1px solid rgba(139,0,0,0.18);
    transition: background 0.15s, color 0.15s;
  }
  .bm-tab.bm-on .bm-tab-badge {
    background: rgba(139,0,0,0.15);
    color: #8B0000;
  }
  @media (max-width: 480px) {
    .bm-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      flex-wrap: nowrap;
    }
    .bm-tab {
      padding: 10px 16px;
      font-size: 12px;
      flex-shrink: 0;
    }
  }
`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookManagement({ initialTab }) {
  const [activeTab,    setActiveTab]    = useState(initialTab || 'scanner');

  // ── Pending Requests state ───────────────────────────────────────────────
  const [pendingRequests,    setPendingRequests]    = useState([]);
  const [loadingPending,     setLoadingPending]     = useState(false);
  const [processingPendingId, setProcessingPendingId] = useState(null);
  const [newPendingAlert,    setNewPendingAlert]    = useState(null);
  const [pendingError,       setPendingError]       = useState(null);

  const [step,         setStep]         = useState(0);
  const [student,      setStudent]      = useState(null);
  const [scanning,     setScanning]     = useState(false);
  const [focused,      setFocused]      = useState(true);
  const [lastResult,   setLastResult]   = useState(null);
  const [resultVisible, setResultVisible] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [loadingTx,    setLoadingTx]    = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTx,   setSelectedTx]  = useState(null);

  // Scanner hardware state — updated by Web USB connect/disconnect events
  const [scannerConnected, setScannerConnected] = useState(false);

  // ── Real USB scanner plug/unplug detection ───────────────────────────────
  // Uses the Web USB API's connect/disconnect events. QR scanners enumerate as
  // USB HID devices. When one connects the badge goes green; when it disconnects
  // it goes red. Falls back gracefully if the API is unavailable (Firefox, etc.).
  useEffect(() => {
    if (!navigator.usb) return; // API not supported — badge stays "Unplugged"

    const handleConnect    = () => setScannerConnected(true);
    const handleDisconnect = () => setScannerConnected(false);

    // Check if any USB device is already connected on mount
    navigator.usb.getDevices().then(devices => {
      if (devices.length > 0) setScannerConnected(true);
    }).catch(() => {});

    navigator.usb.addEventListener('connect',    handleConnect);
    navigator.usb.addEventListener('disconnect', handleDisconnect);

    return () => {
      navigator.usb.removeEventListener('connect',    handleConnect);
      navigator.usb.removeEventListener('disconnect', handleDisconnect);
    };
  }, []);

  const [toast,        setToast]        = useState({ msg:'', type:'success' });

  const inputRef   = useRef(null);
  const bufRef      = useRef('');
  const timerRef    = useRef(null);
  const refocusRef  = useRef(null);
  const processingRef = useRef(false); // lock to prevent double-scan
  const resultTimerRef = useRef(null); // auto-dismiss timer for ScanResultCard

  const showToast = useCallback((msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'success' }), 3800);
  }, []);

  const showResult = useCallback((result) => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    setLastResult(result);
    setResultVisible(true);
    resultTimerRef.current = setTimeout(() => {
      setResultVisible(false);
      setTimeout(() => setLastResult(null), 600);
    }, 3400);
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

  // ── Load pending borrow requests (from mobile scanner) ──────────────────
  const loadPendingRequests = useCallback(async () => {
    setLoadingPending(true);
    const { data, error } = await supabaseAdmin
      .from('borrow_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) console.error('[BookManagement] pending load error:', error.message);
    if (data) setPendingRequests(data);
    setLoadingPending(false);
  }, []);

  // ── Approve Pending Request ──────────────────────────────────────────────
  const confirmPendingRequest = useCallback(async (pendingReq) => {
    try {
      setProcessingPendingId(pendingReq.id);
      setPendingError(null);

      // Use ONLY the core columns that have always existed in borrowings.
      // student_number / student_program / student_email / book_id were added
      // later and are not yet in PostgREST's schema cache → PGRST204 errors.
      // Those columns can be added back after running: Supabase → API → Reload schema.
      const txPayload = {
        student_id:   pendingReq.student_id   || null,
        student_name: pendingReq.student_name  || null,
        book_title:   pendingReq.book_title    || null,
        copy_label:   pendingReq.copy_label    || null,
        status:       'Borrowed',
        borrowed_at:  new Date().toISOString(),
        returned_at:  null,
        date:         new Date().toISOString().split('T')[0],
      };
      console.log('[Approve] payload:', txPayload);

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('borrowings')
        .insert([txPayload])
        .select();

      if (insertErr) {
        console.error('[Approve] insert error:', insertErr);
        throw new Error(`Insert failed: ${insertErr.message} (${insertErr.code})`);
      }
      console.log('[Approve] success:', inserted);

      // ── Update book_copies → resolve copy and mark Borrowed ─────────────
      // borrow_requests may store: copy_id in copy_label, book UUID in book_id,
      // or even a copy UUID as the book_title (depends on mobile app version).
      // We try every possible field to find the right book_copies row.
      console.log('[Approve] pendingReq fields:', {
        book_id: pendingReq.book_id,
        copy_label: pendingReq.copy_label,
        book_title: pendingReq.book_title,
      });

      let resolvedBookId = null;
      let usedCopyId     = null;

      // Step 1: Try copy_label as a copy_id directly
      if (pendingReq.copy_label) {
        const { data: byCopyLabel } = await supabaseAdmin
          .from('book_copies').select('copy_id, book_id, status')
          .eq('copy_id', pendingReq.copy_label).maybeSingle();
        if (byCopyLabel) {
          resolvedBookId = byCopyLabel.book_id;
          if (byCopyLabel.status === 'Available') usedCopyId = byCopyLabel.copy_id;
          console.log('[Approve] Step1 copy_label match:', byCopyLabel);
        }
      }

      // Step 2: Try book_id field as book UUID → find first available copy
      if (!resolvedBookId && pendingReq.book_id) {
        const { data: byBookId } = await supabaseAdmin
          .from('book_copies').select('copy_id, book_id, status')
          .eq('book_id', pendingReq.book_id)
          .eq('status', 'Available').limit(1).maybeSingle();
        if (byBookId) {
          resolvedBookId = byBookId.book_id;
          usedCopyId     = byBookId.copy_id;
          console.log('[Approve] Step2 book_id match:', byBookId);
        }
      }

      // Step 3: Try book_title as a copy_id (mobile stores copy UUID in title field)
      if (!resolvedBookId && pendingReq.book_title) {
        const UUID_RE2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_RE2.test(pendingReq.book_title)) {
          const { data: byTitle } = await supabaseAdmin
            .from('book_copies').select('copy_id, book_id, status')
            .eq('copy_id', pendingReq.book_title).maybeSingle();
          if (byTitle) {
            resolvedBookId = byTitle.book_id;
            if (byTitle.status === 'Available') usedCopyId = byTitle.copy_id;
            console.log('[Approve] Step3 book_title-as-copy_id match:', byTitle);
          }
          // Also try as book_id
          if (!resolvedBookId) {
            const { data: byTitleAsBook } = await supabaseAdmin
              .from('book_copies').select('copy_id, book_id, status')
              .eq('book_id', pendingReq.book_title)
              .eq('status', 'Available').limit(1).maybeSingle();
            if (byTitleAsBook) {
              resolvedBookId = byTitleAsBook.book_id;
              usedCopyId     = byTitleAsBook.copy_id;
              console.log('[Approve] Step3b book_title-as-book_id match:', byTitleAsBook);
            }
          }
        }
      }

      console.log('[Approve] resolved → bookId:', resolvedBookId, '| copyId:', usedCopyId);

      // Step 4: Mark the copy as Borrowed
      if (usedCopyId) {
        const { error: copyErr } = await supabaseAdmin
          .from('book_copies').update({ status: 'Borrowed' }).eq('copy_id', usedCopyId);
        if (copyErr) console.warn('[Approve] book_copies update error:', copyErr.message);
        else console.log('[Approve] ✅ book_copies marked Borrowed:', usedCopyId);
      } else {
        console.warn('[Approve] ⚠️ Could not find an available copy to mark Borrowed');
      }

      // Step 5: Sync books table so catalog count updates
      if (resolvedBookId) {
        await syncBooksFromCopies(resolvedBookId);
        console.log('[Approve] ✅ books table synced for bookId:', resolvedBookId);
      }

      // Mark request approved (non-fatal if it fails)
      const { error: updateErr } = await supabaseAdmin
        .from('borrow_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', pendingReq.id);
      if (updateErr) console.warn('[Approve] could not mark approved:', updateErr.message);

      playSuccessSound();
      await loadPendingRequests();
      loadTransactions();
      setProcessingPendingId(null);
    } catch (err) {
      console.error('[Approve] caught error:', err);
      setPendingError(`Approve failed: ${err.message}`);
      setProcessingPendingId(null);
    }
  }, [loadPendingRequests, loadTransactions]);

  // ── Reject Pending Request ───────────────────────────────────────────────
  const rejectPendingRequest = useCallback(async (pendingReq) => {
    try {
      setProcessingPendingId(pendingReq.id);

      const { error } = await supabaseAdmin
        .from('borrow_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', pendingReq.id);

      if (error) throw error;

      showToast(`❌ Rejected: "${pendingReq.book_title}" request from ${pendingReq.student_name}`, 'success');
      playErrorSound();

      await loadPendingRequests();

      setProcessingPendingId(null);
    } catch (err) {
      console.error('Error rejecting request:', err);
      showToast(`Error: ${err.message}`, 'error');
      setProcessingPendingId(null);
    }
  }, [loadPendingRequests, showToast]);

  // ── Sync copy statuses from active borrowings (repair stale data) ──────────
  // Runs once on mount. Fixes copies that show "Borrowed" in book_copies but
  // have no active borrowing row — e.g. after a failed scan or manual DB edit.
  const syncCopyStatuses = useCallback(async () => {
    try {
      // Get all book_copies rows
      const { data: allCopies } = await supabaseAdmin
        .from('book_copies').select('copy_id, book_id, status');
      if (!allCopies?.length) return;

      // Get all currently active borrowings (status = 'Borrowed')
      const { data: activeBorrowings } = await supabaseAdmin
        .from('borrowings').select('copy_label').eq('status', 'Borrowed');
      const activeCopyIds = new Set((activeBorrowings || []).map(b => b.copy_label).filter(Boolean));

      // Find copies marked Borrowed but with no active borrowing — reset them
      const stale = allCopies.filter(c => c.status === 'Borrowed' && !activeCopyIds.has(c.copy_id));
      for (const copy of stale) {
        await supabaseAdmin.from('book_copies')
          .update({ status: 'Available' }).eq('copy_id', copy.copy_id);
        console.log('[sync] Reset stale copy to Available:', copy.copy_id);
      }

      // Also resync books.copies (total) and books.status for all affected books
      const affectedBookIds = [...new Set([...allCopies.map(c => c.book_id)])];
      for (const bookId of affectedBookIds) {
        await syncBooksFromCopies(bookId);
      }
    } catch (e) {
      console.warn('[syncCopyStatuses] error:', e.message);
    }
  }, []);

  useEffect(() => { loadTransactions(); loadPendingRequests(); syncCopyStatuses(); }, [loadTransactions, loadPendingRequests, syncCopyStatuses]);

  useEffect(() => {
    const ch = supabase.channel('borrow-requests-rt')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'borrow_requests' }, (payload) => {
        if (payload.new?.status === 'pending') {
          playBellSound();
          setNewPendingAlert(prev => ({
            count: (prev?.count || 0) + 1,
            latest: payload.new,
          }));
          setTimeout(() => setNewPendingAlert(null), 12000);
          loadPendingRequests();
        }
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'borrowings' }, () => {
        loadTransactions();
        loadPendingRequests();
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadTransactions, loadPendingRequests]);

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
      showResult({ type:'error', message:'Invalid student QR code', time: new Date() });
      return;
    }

    // profiles schema: first_name, last_name, middle_name, username, student_number, program
    // Try to match by student_number first, then username, then name fallback
    let profile = null;
    if (parsed.id_no) {
      // 1. Try student_number column (the dedicated human-readable ID field)
      const { data: byStudentNo } = await supabaseAdmin
        .from('profiles').select('*')
        .eq('student_number', parsed.id_no).maybeSingle();
      profile = byStudentNo;

      // 2. Fallback: try username column (some setups store student ID there)
      if (!profile) {
        const { data: byUsername } = await supabaseAdmin
          .from('profiles').select('*')
          .eq('username', parsed.id_no).maybeSingle();
        profile = byUsername;
      }
    }
    if (!profile && parsed.full_name) {
      const parts = parsed.full_name.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName  = parts[parts.length - 1] || '';
      const { data: byName } = await supabaseAdmin
        .from('profiles').select('*')
        .ilike('first_name', firstName + '%')
        .ilike('last_name',  lastName  + '%')
        .maybeSingle();
      profile = byName;
    }

    // Normalise: always expose id_no and full_name regardless of source
    // id_no must be the human-readable student number (never a UUID)
    const studentData = profile
      ? {
          ...profile,
          // Priority: student_number column → username (if not UUID) → QR-parsed id_no
          id_no: (() => {
            if (profile.student_number && !UUID_RE.test(String(profile.student_number))) return String(profile.student_number).trim();
            if (profile.username && !UUID_RE.test(String(profile.username))) return String(profile.username).trim();
            if (parsed.id_no && !UUID_RE.test(String(parsed.id_no))) return String(parsed.id_no).trim();
            return ''; // no readable number available
          })(),
          full_name: [profile.first_name, profile.middle_name, profile.last_name]
                       .filter(Boolean).join(' ').trim() || parsed.full_name,
          program:   profile.program || parsed.program || '',
        }
      : { ...parsed, id_no: parsed.id_no || '' }; // fallback: use QR-parsed values directly

    setStudent(studentData);
    setStep(1);
    showToast(`Student: ${studentData.full_name}`, 'success');
  }, [showToast]);

  // ── Process book scan ────────────────────────────────────────────────────
  // FIX: Complete rewrite of borrow/return detection and student_number saving
  const processBookScan = useCallback(async (raw) => {
    if (!student) { setStep(0); return; }
    const parsed = parseBookQR(raw);
    if (!parsed) {
      playErrorSound();
      showToast('Invalid book QR code.', 'error');
      showResult({ type:'error', message:'Invalid book QR code', time: new Date() });
      setStep(0); setStudent(null); return;
    }

    // ── Prevent double-scan / re-entrant processing ────────────────────────
    if (processingRef.current) return;
    processingRef.current = true;
    setStep(2);

    try {
      // ── Book lookup cascade ──────────────────────────────────────────────
      let bookRecord = null;
      let resolvedCopyId  = null;
      let resolvedCopyNum = null;

      if (parsed.isCopyId) {
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
        const { data: byIsbn } = await supabaseAdmin.from('books').select('*').eq('isbn', parsed.base).maybeSingle();
        bookRecord = byIsbn;
      }
      if (!bookRecord && !parsed.isCopyId) {
        if (UUID_RE.test(parsed.base)) {
          const { data: byId } = await supabaseAdmin.from('books').select('*').eq('id', parsed.base).maybeSingle();
          bookRecord = byId;
        }
      }
      if (!bookRecord && !parsed.isCopyId) {
        const { data: rows } = await supabaseAdmin.from('books').select('*').ilike('title', `%${parsed.base}%`);
        bookRecord = rows?.[0] || null;
      }
      if (!bookRecord) {
        playErrorSound();
        showToast('Book not found in catalog.', 'error');
        showResult({ type:'error', message:`No book matched "${parsed.raw}"`, time: new Date() });
        setStep(0); setStudent(null); processingRef.current = false; return;
      }

      const bookId    = String(bookRecord.id);
      const bookTitle = bookRecord.title;
      const copyLabel = resolvedCopyId ? resolvedCopyId : (parsed.copyLabel || parsed.base);

      // ── FIX #1: Resolve the readable student number ─────────────────────
      // Priority: profiles.student_number → QR-parsed id_no → profiles.username
      // NEVER store a UUID as student_number.
      const readableStudentNo = (() => {
        const candidates = [
          student.student_number,
          student.id_no,
          student.username,
        ];
        for (const c of candidates) {
          const s = String(c || '').trim();
          if (s && !UUID_RE.test(s)) return s;
        }
        return '';
      })();

      // The profile UUID — used as the foreign key in borrowings.student_id_no
      const studentUUID = (student.id && UUID_RE.test(String(student.id)))
        ? String(student.id).trim()
        : null;

      console.log('[BookScan] copy_label:', copyLabel);
      console.log('[BookScan] studentUUID:', studentUUID, '| studentNumber:', readableStudentNo, '| name:', student.full_name);

      // ── FIX #2: Find open borrows for this EXACT copy ──────────────────
      // DB column is student_id (uuid FK to profiles.id), NOT student_id_no.
      // student_number is stored inside student_name as a prefix — see insert payload.
      const { data: openBorrowRows, error: openBorrowErr } = await supabaseAdmin
        .from('borrowings')
        .select('id, borrowed_at, book_id, copy_label, student_id, student_name, student_program')
        .eq('copy_label', copyLabel)
        .eq('status', 'Borrowed')
        .order('borrowed_at', { ascending: true })
        .limit(10);

      if (openBorrowErr) {
        console.warn('[BookScan] openBorrowRows error:', openBorrowErr.message);
      }

      const allOpenRows = openBorrowRows || [];
      console.log('[BookScan] open borrows for this copy:', allOpenRows.length, allOpenRows);

      // ── FIX #3: Multi-strategy student matching ─────────────────────────
      // Tries every possible identifier so return always triggers correctly.
      const studentNameNorm = (student.full_name || '').trim().toLowerCase();

      const existingBorrow = allOpenRows.find(row => {
        // Strategy 1: Match by profile UUID in student_id column (most reliable)
        if (studentUUID && UUID_RE.test(studentUUID)) {
          const rowId = String(row.student_id || '').trim();
          if (rowId === studentUUID) return true;
        }
        // Strategy 2: Match by readable student number embedded in student_name
        // Format saved: "JUAN DELA CRUZ [2023-12345]"
        if (readableStudentNo && row.student_name) {
          if (row.student_name.includes(`[${readableStudentNo}]`)) return true;
        }
        // Strategy 3: Match by full name (unregistered students / QR-only)
        if (studentNameNorm && row.student_name) {
          const rowNameBase = row.student_name.replace(/\s*\[.*?\]\s*$/, '').trim().toLowerCase();
          if (rowNameBase === studentNameNorm) return true;
        }
        return false;
      }) ?? null;

      console.log('[BookScan] existingBorrow:', existingBorrow);

      // Guard: copy borrowed by a DIFFERENT student
      if (!existingBorrow && allOpenRows.length > 0) {
        const other = allOpenRows[0];
        playErrorSound();
        showToast(`Copy already borrowed by ${other.student_name || 'another student'}.`, 'error');
        showResult({ type:'error', message:`Copy already out — borrowed by ${other.student_name}`, time: new Date() });
        setStep(0); setStudent(null); processingRef.current = false; return;
      }

      // Decision: no open record → Borrow; has open record → Return
      const isBorrow = !existingBorrow;
      console.log('[BookScan] action:', isBorrow ? 'BORROW' : 'RETURN');

      if (!isBorrow) {
        showToast(`Returning: "${bookTitle}" — processing…`, 'success');
      }

      // ── Borrow limit check ───────────────────────────────────────────────
      if (isBorrow) {
        let borrowedRows = [];
        // Check by UUID using correct column name: student_id
        if (studentUUID) {
          const { data: byId } = await supabaseAdmin
            .from('borrowings').select('id')
            .eq('student_id', studentUUID).eq('status', 'Borrowed');
          borrowedRows = byId || [];
        }
        // Also check by name match (catches unregistered students or UUID mismatch)
        if (student.full_name) {
          const { data: byName } = await supabaseAdmin
            .from('borrowings').select('id')
            .ilike('student_name', `${student.full_name.trim()}%`).eq('status', 'Borrowed');
          const byNameRows = byName || [];
          const seen = new Set(borrowedRows.map(r => r.id));
          byNameRows.forEach(r => { if (!seen.has(r.id)) borrowedRows.push(r); });
        }

        if (borrowedRows.length >= BORROW_LIMIT) {
          playErrorSound();
          showToast(`Borrow limit reached — max ${BORROW_LIMIT} books allowed.`, 'error');
          showResult({ type:'error', message:`Borrow limit of ${BORROW_LIMIT} books reached.`, time: new Date() });
          setStep(0); setStudent(null); processingRef.current = false; return;
        }

        // Check this specific copy is actually Available (skip check if returning)
        if (resolvedCopyId) {
          const { data: thisCopy } = await supabaseAdmin
            .from('book_copies').select('status').eq('copy_id', resolvedCopyId).maybeSingle();
          if (thisCopy?.status === 'Borrowed') {
            playErrorSound();
            showToast('This copy is already borrowed. Scan a different copy.', 'error');
            showResult({ type:'error', message:'Copy is already borrowed.', time: new Date() });
            setStep(0); setStudent(null); processingRef.current = false; return;
          }
        }
      }

      // ── FIX #4: Update the specific book_copies row status ──────────────
      if (resolvedCopyId) {
        const { error: copyUpdateErr } = await supabaseAdmin
          .from('book_copies')
          .update({ status: isBorrow ? 'Borrowed' : 'Available' })
          .eq('copy_id', resolvedCopyId);
        if (copyUpdateErr) {
          playErrorSound();
          showToast(`Failed to update copy status: ${copyUpdateErr.message}`, 'error');
          setStep(0); setStudent(null); processingRef.current = false; return;
        }
        console.log('[BookScan] Updated book_copies status to:', isBorrow ? 'Borrowed' : 'Available');
      }

      // ── FIX #5: Recompute books table from book_copies (keeps catalog in sync) ──
      {
        const { total, available } = await syncBooksFromCopies(bookRecord.id);
        console.log('[BookScan] books table synced — total:', total, '| available:', available);
      }

      if (isBorrow) {
        // ── INSERT new borrowing record ──────────────────────────────────
        const borrowedAt = nowISO();

        // FIX: Use ACTUAL column names from borrowings schema.
        // student_id = UUID FK (profiles.id)
        // student_name stores "FULL NAME [student_number]" so we can display both
        const studentNameWithNo = readableStudentNo
          ? `${student.full_name} [${readableStudentNo}]`
          : student.full_name;

        const txPayload = {
          ...(studentUUID ? { student_id: studentUUID } : {}),
          student_name:    studentNameWithNo,
          student_program: student.program || '',
          book_id:         bookId,
          book_title:      bookTitle,
          copy_label:      copyLabel,
          status:          'Borrowed',
          borrowed_at:     borrowedAt,
          returned_at:     null,
          date:            today(),
        };

        console.log('[BookScan] Inserting borrowing:', txPayload);

        const { data: newTx, error: txErr } = await supabaseAdmin
          .from('borrowings').insert([txPayload]).select().single();

        if (txErr) {
          console.error('[BookScan] Insert error:', txErr);

          // Rollback book_copies
          if (resolvedCopyId) {
            await supabaseAdmin.from('book_copies')
              .update({ status: 'Available' }).eq('copy_id', resolvedCopyId);
          }
          await syncBooksFromCopies(bookRecord.id);

          // FIX: If column doesn't exist yet, retry without unknown columns
          // This lets the system work even before you run the SQL migration
          const isColError = txErr.code === '42703' ||
            txErr.message?.includes('column') ||
            txErr.message?.includes('student_number') ||
            txErr.message?.includes('student_id_no') ||
            txErr.message?.includes('student_program');

          if (isColError) {
            console.warn('[BookScan] Column error — retrying with minimal payload');
            // Retry with only columns guaranteed to exist in your schema
            const minimalPayload = {
              student_id:      studentUUID || undefined,
              student_name:    studentNameWithNo,
              student_program: student.program || '',
              book_id:         bookId,
              book_title:      bookTitle,
              copy_label:      copyLabel,
              status:          'Borrowed',
              borrowed_at:     borrowedAt,
              returned_at:     null,
              date:            today(),
            };
            // Remove undefined keys
            Object.keys(minimalPayload).forEach(k => minimalPayload[k] === undefined && delete minimalPayload[k]);
            const { data: retryTx, error: retryErr } = await supabaseAdmin
              .from('borrowings').insert([minimalPayload]).select().single();
            if (!retryErr) {
              playSuccessSound();
              const result = { ...minimalPayload, id: retryTx?.id };
              showResult({ type:'success', action:'borrowed', data: result, time: new Date() });
              showToast(`Borrowed: "${bookTitle}" — ${student.full_name}`, 'success');
              setTransactions(prev => [result, ...prev]);
              setStep(0); setStudent(null); processingRef.current = false;
              loadTransactions(); return;
            }
            console.error('[BookScan] Retry also failed:', retryErr);
          }

          playErrorSound();
          showToast(`DB error: ${txErr.message}`, 'error');
          showResult({ type:'error', message: txErr.message, time: new Date() });
          setStep(0); setStudent(null); processingRef.current = false; return;
        }

        playSuccessSound();
        const result = { ...txPayload, id: newTx?.id };
        showResult({ type:'success', action:'borrowed', data: result, time: new Date() });
        showToast(`Borrowed: "${bookTitle}" — ${student.full_name}`, 'success');
        setTransactions(prev => [result, ...prev]);

      } else {
        // ── UPDATE existing borrowing record to returned ─────────────────
        const returnedAt = nowISO();

        const { error: retErr } = await supabaseAdmin
          .from('borrowings')
          .update({ status: 'Returned', returned_at: returnedAt })
          .eq('id', existingBorrow.id);  // ← exact row by primary key

        if (retErr) {
          console.error('[BookScan] Return update error:', retErr);
          // Rollback book_copies
          if (resolvedCopyId) {
            await supabaseAdmin.from('book_copies')
              .update({ status: 'Borrowed' }).eq('copy_id', resolvedCopyId);
          }
          await syncBooksFromCopies(bookRecord.id);
          playErrorSound();
          showToast(`DB error: ${retErr.message}`, 'error');
          showResult({ type:'error', message: retErr.message, time: new Date() });
          setStep(0); setStudent(null); processingRef.current = false; return;
        }

        playSuccessSound();
        const result = {
          id:              existingBorrow.id,
          student_id:      existingBorrow.student_id,
          student_name:    existingBorrow.student_name, // keep original with [number] intact
          student_program: student.program || existingBorrow.student_program || '',
          book_id:         bookId,
          book_title:      bookTitle,
          copy_label:      copyLabel,
          status:          'Returned',
          borrowed_at:     existingBorrow.borrowed_at,
          returned_at:     returnedAt,
          date:            today(),
        };
        showResult({ type:'success', action:'returned', data: result, time: new Date() });
        showToast(`Returned: "${bookTitle}" — ${student.full_name}`, 'success');
        setTransactions(prev => prev.map(t => t.id === existingBorrow.id ? { ...t, ...result } : t));
      }

      loadTransactions();

    } catch (err) {
      console.error('[BookScan] Unexpected error:', err);
      playErrorSound();
      showToast(`Error: ${err.message}`, 'error');
      showResult({ type:'error', message: err.message, time: new Date() });
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
    const studentNoEmbedded = String(tx.student_name || '').match(/\[([^\]]+)\]$/)?.[1]?.trim() || '';
    const matchQ = !q || [tx.student_name, studentNoEmbedded, tx.book_title, tx.copy_label].some(v => v?.toLowerCase().includes(q));
    const matchS = statusFilter === 'all' || tx.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchQ && matchS;
  });

  const borrowedCount = transactions.filter(t => t.status?.toLowerCase() === 'borrowed').length;
  const returnedToday = transactions.filter(t => t.status?.toLowerCase() === 'returned' && t.date === today()).length;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="lm-module" style={{ userSelect:'none' }}>
      <style>{TAB_CSS}</style>

      {/* Hidden keyboard capture — always mounted so scanner works on both tabs */}
      <input
        ref={inputRef} onKeyDown={handleKeyDown}
        onBlur={() => { setFocused(false); refocusIfSafe(); }}
        onFocus={() => setFocused(true)}
        readOnly aria-hidden="true" tabIndex={-1}
        style={{ position:'fixed', top:0, left:0, width:1, height:1, opacity:0, pointerEvents:'none', zIndex:-1, border:'none', outline:'none', background:'transparent' }}
      />

      {/* ── Summary stat cards — always visible above tabs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Transactions', value: transactions.length },
          { label:'Currently Borrowed', value: borrowedCount },
          { label:'Returned Today',     value: returnedToday },
          { label:'Borrow Limit',       value: `${BORROW_LIMIT} books` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background:`linear-gradient(135deg, ${MAR}, ${MAR2})`,
            border:`1px solid rgba(201,168,76,0.3)`,
            borderRadius:14, padding:'16px 18px',
            boxShadow:'0 4px 16px rgba(139,0,0,0.2)',
          }}>
            <div style={{ fontFamily:"'Cinzel', serif", fontSize:22, color:GP, fontWeight:700 }}>{value}</div>
            <div style={{ fontSize:11, color:'rgba(245,228,168,0.55)', fontFamily:'var(--font-sans)', marginTop:3, letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="bm-tabs">
        <button
          className={`bm-tab${activeTab === 'scanner' ? ' bm-on' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
          </svg>
          QR Scanner
          {step > 0 && (
            <span className="bm-tab-badge" style={{ background:'rgba(139,0,0,0.15)', color:'#8B0000' }}>
              Step {step + 1}
            </span>
          )}
        </button>
        <button
          className={`bm-tab${activeTab === 'pending' ? ' bm-on' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Pending Requests
          {pendingRequests.length > 0 && (
            <span className="bm-tab-badge">{pendingRequests.length}</span>
          )}
        </button>
        <button
          className={`bm-tab${activeTab === 'history' ? ' bm-on' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Transaction History
          {transactions.length > 0 && (
            <span className="bm-tab-badge">{transactions.length}</span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SCANNER TAB
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'scanner' && <>

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

          {/* Focus indicator only */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'6px 14px', borderRadius:20,
              background: focused ? 'rgba(46,125,50,0.10)' : 'rgba(201,168,76,0.09)',
              border:`1.5px solid ${focused ? 'rgba(90,158,92,0.35)' : 'rgba(201,168,76,0.25)'}`,
              fontSize:11, fontFamily:'var(--font-sans)', fontWeight:700,
              color: focused ? '#3d8c40' : '#b08000',
              letterSpacing:'0.07em', textTransform:'uppercase',
              cursor: focused ? 'default' : 'pointer',
              transition:'all 0.3s',
            }} onClick={() => inputRef.current?.focus({ preventScroll:true })}>
              <span style={{
                width:7, height:7, borderRadius:'50%', flexShrink:0,
                background: focused ? '#4caf50' : G,
                boxShadow: focused ? '0 0 0 3px rgba(76,175,80,0.25)' : 'none',
                animation: focused ? 'bm-blink 2s ease-in-out infinite' : 'none',
                transition:'all 0.3s',
              }}/>
              {focused ? 'Input Ready' : 'Click to Activate'}
            </div>
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

        {/* Last result — fades in on scan, fades out and disappears after ~4 s */}
        {lastResult && (
          <div
            key={lastResult.time?.getTime?.() ?? Math.random()}
            style={{
              padding:'0 28px 20px',
              opacity: resultVisible ? 1 : 0,
              transform: resultVisible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.99)',
              transition: resultVisible
                ? 'opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)'
                : 'opacity 0.55s ease, transform 0.55s ease',
            }}
          >
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

      </>}{/* end scanner tab */}


      {/* ══════════════════════════════════════════════════════════
          PENDING REQUESTS TAB
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && <>

        {/* ── Section header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{
              fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 700,
              color: 'var(--maroon-deep)', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `linear-gradient(135deg,${MAR},${MAR2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 12px rgba(139,0,0,0.3)', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GP} strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              Pending Borrow Requests
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', marginTop: 3, marginLeft: 44 }}>
              {pendingRequests.length > 0
                ? `${pendingRequests.length} request${pendingRequests.length > 1 ? 's' : ''} awaiting your review`
                : 'No pending requests at this time'}
            </div>
          </div>
          {pendingRequests.length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: 'rgba(201,168,76,0.10)',
              border: '1.5px solid rgba(201,168,76,0.3)',
              fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-sans)',
              color: '#8B6914', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: G, boxShadow: `0 0 0 3px rgba(201,168,76,0.25)`,
                animation: 'bm-blink 2s ease-in-out infinite',
              }}/>
              Live
            </div>
          )}
        </div>

        {/* ── New request alert banner ── */}
        {newPendingAlert && (
          <div style={{
            marginBottom: 18,
            background: `linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.06))`,
            border: `1.5px solid rgba(201,168,76,0.4)`,
            borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 4px 20px rgba(201,168,76,0.12)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${G}, #a87c2a)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(201,168,76,0.35)',
              animation: 'bm-pulse 1.5s ease-in-out infinite',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6B4E00', fontFamily: 'var(--font-sans)' }}>
                New Request Incoming
              </div>
              <div style={{ fontSize: 11.5, color: '#8B6914', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                {newPendingAlert.latest?.student_name} wants to borrow <em>{newPendingAlert.latest?.book_title}</em>
              </div>
            </div>
          </div>
        )}

        {/* ── Error banner ── */}
        {pendingError && (
          <div style={{
            marginBottom: 16, padding: '13px 16px',
            background: 'rgba(139,0,0,0.06)',
            border: `1.5px solid rgba(139,0,0,0.25)`,
            borderRadius: 12, fontSize: 12.5,
            color: MAR, fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MAR} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700 }}>Approve failed</span> — {pendingError}
              <div style={{ marginTop: 3, fontSize: 11, opacity: 0.7 }}>Open F12 → Console for full details.</div>
            </div>
            <button onClick={() => setPendingError(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: MAR, fontSize: 16, lineHeight: 1, padding: 2, flexShrink: 0,
            }}>✕</button>
          </div>
        )}

        {/* ── Loading ── */}
        {loadingPending ? (
          <div style={{
            borderRadius: 16, border: `1.5px solid rgba(139,0,0,0.12)`,
            background: CREAM, padding: '56px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <div className="lm-spinner" />
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
              Loading pending requests…
            </div>
          </div>

        ) : pendingRequests.length === 0 ? (
          /* ── Empty state ── */
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            border: `1.5px solid rgba(139,0,0,0.12)`,
            background: CREAM,
          }}>
            <div style={{
              height: 4,
              background: `linear-gradient(90deg, ${MAR2}, ${MAR}, ${G}, ${MAR}, ${MAR2})`,
              backgroundSize: '200% 100%',
              animation: 'bm-shimmer-bar 3s ease-in-out infinite',
            }}/>
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px',
                background: `linear-gradient(135deg, rgba(46,125,50,0.12), rgba(46,125,50,0.06))`,
                border: '1.5px solid rgba(46,125,50,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3d8c40" strokeWidth="1.8">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 6 }}>
                All Caught Up!
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', maxWidth: 280, margin: '0 auto' }}>
                No pending borrow requests right now. New requests from the mobile app will appear here automatically.
              </div>
            </div>
          </div>

        ) : (
          /* ── Request cards ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingRequests.map((req, idx) => {
              const isProcessing = processingPendingId === req.id;
              const reqTime = req.created_at ? new Date(req.created_at) : null;
              const timeAgo = reqTime ? (() => {
                const diff = Math.floor((Date.now() - reqTime.getTime()) / 1000);
                if (diff < 60)  return `${diff}s ago`;
                if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
                if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
                return reqTime.toLocaleDateString('en-PH', { month:'short', day:'numeric' });
              })() : '—';

              return (
                <div key={req.id} style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: `1.5px solid rgba(139,0,0,0.14)`,
                  background: isProcessing
                    ? `linear-gradient(135deg, rgba(201,168,76,0.07), rgba(201,168,76,0.03))`
                    : 'linear-gradient(160deg, rgba(253,248,240,0.95) 0%, rgba(250,244,232,0.98) 100%)',
                  boxShadow: '0 2px 12px rgba(80,0,0,0.06)',
                  transition: 'all 0.2s ease',
                  opacity: isProcessing ? 0.85 : 1,
                }}>
                  {/* Card top accent */}
                  <div style={{
                    height: 3,
                    background: `linear-gradient(90deg, ${MAR2}, ${MAR}, ${G})`,
                  }}/>

                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                    {/* Index badge */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 3px 10px rgba(139,0,0,0.25)',
                    }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: GP, fontWeight: 700 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Student info */}
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700,
                        color: 'var(--maroon-deep)', letterSpacing: '0.03em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {req.student_name || 'Unknown Student'}
                      </div>
                      {req.student_number && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginTop: 2, fontWeight: 600, letterSpacing: '0.04em' }}>
                          ID: {req.student_number}
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, height: 36, background: 'rgba(139,0,0,0.12)', flexShrink: 0, display: 'none' }} className="pr-divider"/>

                    {/* Book info */}
                    <div style={{ flex: '2 1 200px', minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)',
                        display: 'flex', alignItems: 'flex-start', gap: 6,
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MAR} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.book_title || 'Unknown Book'}
                        </span>
                      </div>
                      {req.copy_label && (
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 3, letterSpacing: '0.04em' }}>
                          Copy: {String(req.copy_label).slice(0, 12)}…
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 64 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                        {timeAgo}
                      </div>
                      {reqTime && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginTop: 2, opacity: 0.7 }}>
                          {reqTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => confirmPendingRequest(req)}
                        disabled={isProcessing}
                        style={{
                          padding: '9px 16px', borderRadius: 9,
                          background: isProcessing ? 'rgba(46,125,50,0.15)' : 'linear-gradient(135deg, #2e7d32, #1b5e20)',
                          color: isProcessing ? '#3d8c40' : 'white',
                          border: `1.5px solid ${isProcessing ? 'rgba(46,125,50,0.3)' : 'transparent'}`,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 700,
                          fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', gap: 5,
                          boxShadow: isProcessing ? 'none' : '0 3px 10px rgba(46,125,50,0.3)',
                          transition: 'all 0.15s',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {isProcessing ? (
                          <><div className="lm-spinner" style={{ width: 11, height: 11, borderWidth: 2 }}/> Processing…</>
                        ) : (
                          <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Approve</>
                        )}
                      </button>
                      <button
                        onClick={() => rejectPendingRequest(req)}
                        disabled={isProcessing}
                        style={{
                          padding: '9px 14px', borderRadius: 9,
                          background: 'transparent',
                          color: isProcessing ? 'var(--text-muted)' : MAR,
                          border: `1.5px solid ${isProcessing ? 'rgba(139,0,0,0.1)' : 'rgba(139,0,0,0.3)'}`,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 700,
                          fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'all 0.15s',
                          letterSpacing: '0.03em',
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Reject
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>}{/* end pending tab */}


      {/* ══════════════════════════════════════════════════════════
          TRANSACTION HISTORY TAB
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && <>

      {/* ── Transaction Table ── */}
      <div className="lm-panel" style={{ marginBottom:0, padding:0, overflow:'visible', borderRadius:14, border:'1.5px solid rgba(139,0,0,0.14)' }}>

        {/* Table header bar */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
          padding:'16px 20px',
          background:`linear-gradient(135deg, rgba(232, 222, 222, 0.04), rgba(201,168,76,0.02))`,
          borderBottom:'1.5px solid rgba(139,0,0,0.1)',
          borderRadius:'14px 14px 0 0',
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
                  {['Student Number','Student Name','Book Title','Status','Borrowed At','Returned At','Actions'].map(h => (
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
                <div style={{ fontSize:12, color:'#6b4040', fontFamily:'var(--font-sans)' }}>{(deleteConfirm.student_name || '').replace(/\s*\[.*?\]\s*$/, '') || deleteConfirm.student_name}</div>
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

      </>}
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