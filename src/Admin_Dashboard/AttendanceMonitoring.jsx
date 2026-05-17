import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const fmt      = (d, opts) => new Intl.DateTimeFormat('en-PH', opts).format(d);
const fmtTime  = (d) => fmt(new Date(d), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const fmtDate  = (d) => fmt(new Date(d), { month: 'short', day: 'numeric', year: 'numeric' });
const fmtFull  = (d) => `${fmtDate(d)} · ${fmtTime(d)}`;
const today    = () => new Date().toISOString().split('T')[0];

function parseQR(raw) {
  if (!raw?.trim()) return null;
  const flat = raw.trim().replace(/\r?\n/g, '');
  const idNoMatch     = flat.match(/IDNo\s*:\s*(.+?)(?=Full Name\s*:|Program\s*:|$)/i);
  const fullNameMatch = flat.match(/Full Name\s*:\s*(.+?)(?=IDNo\s*:|Program\s*:|$)/i);
  const programMatch  = flat.match(/Program\s*:\s*(.+?)(?=IDNo\s*:|Full Name\s*:|$)/i);
  const id_no    = idNoMatch?.[1]?.trim()    || '';
  const full_name = fullNameMatch?.[1]?.trim() || '';
  const program  = programMatch?.[1]?.trim()  || '';
  if (!id_no && !full_name) return null;
  return { id_no, full_name, program };
}

const MAR  = '#8B0000';
const MAR2 = '#6B0000';
const G    = '#C9A84C';
const GP   = '#F5E4A8';
const CREAM = '#FAF6EE';

const Ic = {
  users:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  id:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  clock:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>,
  warn:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  search:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  trash:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  qr: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
      </svg>,
  history: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
             <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
             <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
           </svg>,
};

const TAB_CSS = `
  .am-tabs {
    display: flex;
    border-bottom: 1px solid rgba(139,0,0,0.18);
    margin-bottom: 24px;
    gap: 0;
  }
  .am-tab {
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
  .am-tab:hover { color: var(--text-secondary, #5A1010); }
  .am-tab.am-on {
    font-weight: 700;
    color: #8B0000;
    border-bottom-color: #8B0000;
  }
  .am-tab-badge {
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
  .am-tab.am-on .am-tab-badge {
    background: rgba(139,0,0,0.15);
    color: #8B0000;
  }
  @keyframes am-slideUp {
    from { opacity:0; transform:translateY(10px) scale(0.99); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes am-fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes am-pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes am-shimmer-bar {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes am-blink {
    0%, 100% { opacity:1; }
    50%       { opacity:0.35; }
  }
  @media (max-width: 480px) {
    .am-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      flex-wrap: nowrap;
    }
    .am-tab {
      padding: 10px 16px;
      font-size: 12px;
      flex-shrink: 0;
    }
  }
`;

function StatCard({ icon, label, value, sub, accentColor = '#C9A84C' }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
      border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: 14, padding: '16px 18px',
      boxShadow: '0 4px 16px rgba(139,0,0,0.2)',
    }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: GP, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(245,228,168,0.55)', fontFamily: 'var(--font-sans)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function useScannerCapture(onScan) {
  const inputRef   = useRef(null);
  const bufRef     = useRef('');
  const timerRef   = useRef(null);
  const refocusRef = useRef(null);
  const [receiving, setReceiving] = useState(false);
  const [pulse,     setPulse]     = useState(false);
  const [focused,   setFocused]   = useState(true);

  const refocusIfSafe = useCallback(() => {
    clearTimeout(refocusRef.current);
    refocusRef.current = setTimeout(() => {
      const active = document.activeElement;
      const tag    = active?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (active?.isContentEditable) return;
      inputRef.current?.focus({ preventScroll: true });
    }, 80);
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const poll = setInterval(refocusIfSafe, 2000);
    return () => { clearInterval(poll); clearTimeout(refocusRef.current); clearTimeout(timerRef.current); };
  }, [refocusIfSafe]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') {
      const raw = bufRef.current.trim();
      bufRef.current = ''; setReceiving(false); clearTimeout(timerRef.current);
      if (raw.length > 4) {
        setPulse(true); setTimeout(() => setPulse(false), 700); onScan(raw);
      }
    } else if (e.key.length === 1) {
      bufRef.current += e.key; setReceiving(true); clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { bufRef.current = ''; setReceiving(false); }, 2000);
    }
  }, [onScan]);

  const handleBlur  = useCallback(() => { setFocused(false); refocusIfSafe(); }, [refocusIfSafe]);
  const handleFocus = useCallback(() => setFocused(true), []);

  const inputEl = (
    <input ref={inputRef} onKeyDown={handleKeyDown} onBlur={handleBlur} onFocus={handleFocus}
      readOnly aria-hidden="true" tabIndex={-1}
      style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1, border: 'none', outline: 'none', background: 'transparent' }} />
  );
  return { inputEl, receiving, pulse, focused };
}

function ScannerPanel({ onScan, scannerReady }) {
  const { inputEl, receiving, pulse, focused } = useScannerCapture(onScan);

  return (
    <>
      {inputEl}
      <div style={{
        borderRadius: 20,
        border: '1.5px solid rgba(139,0,0,0.14)',
        background: 'linear-gradient(160deg, rgba(253,248,240,0.9) 0%, rgba(250,244,232,0.95) 100%)',
        boxShadow: '0 8px 40px rgba(80,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
        marginBottom: 0, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${MAR2}, ${MAR}, ${G}, ${MAR}, ${MAR2})`,
          backgroundSize: '200% 100%',
          animation: 'am-shimmer-bar 3s ease-in-out infinite',
        }} />

        <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700,
              color: 'var(--maroon-deep)', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: G,
                boxShadow: '0 3px 12px rgba(139,0,0,0.3)', flexShrink: 0,
              }}>
                {Ic.qr}
              </div>
              QR Scanner
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', marginTop: 3, letterSpacing: '0.04em' }}>
              {receiving
                ? 'Reading QR code data…'
                : !scannerReady
                ? 'Scanner not detected — connect the Teklead T-D4 via USB'
                : 'Ready — student can scan ID at any time'}
            </div>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 20,
            background: focused ? 'rgba(46,125,50,0.10)' : 'rgba(201,168,76,0.09)',
            border: `1.5px solid ${focused ? 'rgba(90,158,92,0.35)' : 'rgba(201,168,76,0.25)'}`,
            fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 700,
            color: focused ? '#3d8c40' : '#b08000',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            transition: 'all 0.3s',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: focused ? '#4caf50' : G,
              boxShadow: focused ? '0 0 0 3px rgba(76,175,80,0.25)' : 'none',
              animation: focused ? 'am-blink 2s ease-in-out infinite' : 'none',
              transition: 'all 0.3s',
            }} />
            {receiving ? 'Reading…' : focused ? 'Input Ready' : 'Click to Activate'}
          </div>
        </div>

        {!focused && (
          <div style={{ padding: '12px 28px 0' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, fontSize: 11.5,
              background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.22)',
              color: G, fontFamily: 'var(--font-sans)',
            }}>
              {Ic.warn} Scanner capture paused — click anywhere to restore
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '14px 28px',
          background: 'rgba(139,0,0,0.03)',
          borderTop: '1px solid rgba(139,0,0,0.08)',
          marginTop: 20,
        }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
            Scan student ID to log attendance
          </div>
        </div>
      </div>
    </>
  );
}

function ScanResult({ result, onDismiss }) {
  if (!result) return null;
  const isSuccess = result.type === 'success';
  const isWarn    = result.type === 'warn';
  const colors = {
    bg:     isSuccess ? 'rgba(39,122,73,0.12)' : isWarn ? 'rgba(201,168,76,0.08)' : 'rgba(139,0,0,0.15)',
    border: isSuccess ? 'rgba(39,122,73,0.38)'  : isWarn ? 'rgba(201,168,76,0.28)' : 'rgba(239,154,154,0.30)',
    icon:   isSuccess ? '#4caf87' : isWarn ? '#C9A84C' : '#ef9a9a',
    iconBg: isSuccess ? 'rgba(39,122,73,0.22)' : isWarn ? 'rgba(201,168,76,0.14)' : 'rgba(139,0,0,0.22)',
    title:  isSuccess ? '#4caf87' : isWarn ? '#F5E4A8' : '#ef9a9a',
  };
  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
      animation: 'am-slideUp 0.3s ease',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: colors.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: colors.icon,
      }}>
        {isSuccess ? Ic.check : Ic.warn}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: colors.title, marginBottom: 4, letterSpacing: '0.03em' }}>
          {result.title}
        </div>
        {result.student && (
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{result.student.full_name}</strong>
            {result.student.id_no ? ` · ID ${result.student.id_no}` : ''}
            {result.student.program ? ` · ${result.student.program}` : ''}
          </div>
        )}
        {result.message && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{result.message}</div>
        )}
      </div>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-dim)', fontSize: 18,
        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', padding: 0, transition: 'color 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
      >×</button>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = status === 'time-in'
    ? { bg: 'rgba(46,125,50,0.10)', color: '#4a8e4c', border: 'rgba(90,158,92,0.25)', dot: '#5a9e5c', label: 'Time In' }
    : { bg: 'rgba(139,0,0,0.13)',   color: '#c0564e', border: 'rgba(139,0,0,0.25)',   dot: '#c0564e', label: 'Time Out' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--font-sans)', letterSpacing: '0.04em',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function TodayTable({ records, loading, onDelete, onFocusChange }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [hovRow, setHovRow] = useState(null);
  const [delHov, setDelHov] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.full_name?.toLowerCase().includes(q) || r.id_no?.toLowerCase().includes(q) || r.program?.toLowerCase().includes(q);
    const matchF = filter === 'all' || r.status === filter;
    return matchQ && matchF;
  });

  return (
    <>
    <div className="lm-panel" style={{ marginBottom: 0, padding: 0, overflow: 'visible', borderRadius: 14, border: '1.5px solid rgba(139,0,0,0.14)' }}>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(232,222,222,0.04), rgba(201,168,76,0.02))',
        borderBottom: '1.5px solid rgba(139,0,0,0.1)',
        borderRadius: '14px 14px 0 0',
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: 'var(--text-cream)', fontWeight: 700 }}>
          Attendance Log — {fmtDate(new Date())}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>{Ic.search}</span>
            <input
              type="text" placeholder="Search student…"
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => onFocusChange?.(false)}
              onBlur={() => onFocusChange?.(true)}
              style={{
                paddingLeft: 32, paddingRight: 10, height: 35,
                background: 'var(--cream-light)', border: '1.5px solid rgba(139,0,0,0.15)',
                borderRadius: 9, fontSize: 12.5, color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)', outline: 'none', width: 210,
              }}
            />
          </div>
          <select
            value={filter} onChange={e => setFilter(e.target.value)}
            onFocus={() => onFocusChange?.(false)}
            onBlur={() => onFocusChange?.(true)}
            style={{
              height: 35, padding: '0 10px', background: 'var(--cream-light)',
              border: '1.5px solid rgba(139,0,0,0.15)', borderRadius: 9,
              fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
              outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="time-in">Time In</option>

          </select>

        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', background: CREAM }}>
          <div className="lm-spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>Loading records…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: CREAM }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>No attendance records found</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
            {search ? 'Try a different search term.' : 'Scan a student ID to log attendance.'}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${MAR}, ${MAR2})` }}>
                {['Student ID', 'Full Name', 'Program', 'Time In', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '13px 16px', textAlign: 'left',
                    fontFamily: 'var(--font-sans)', fontSize: 10.5,
                    fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: GP, whiteSpace: 'nowrap',
                    borderBottom: `2.5px solid rgba(201,168,76,0.4)`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}
                  onMouseEnter={() => setHovRow(r.id)}
                  onMouseLeave={() => setHovRow(null)}
                  style={{
                    background: hovRow === r.id ? '#FFFFFF' : CREAM,
                    borderBottom: '1px solid rgba(139,0,0,0.07)',
                    transition: 'background 0.18s, box-shadow 0.18s',
                    boxShadow: hovRow === r.id ? 'inset 3px 0 0 0 #C9A84C, 0 2px 12px rgba(139,0,0,0.07)' : 'inset 3px 0 0 0 transparent',
                  }}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#7a4040', letterSpacing: '0.04em', fontWeight: 600 }}>
                      {r.id_no || <span style={{ fontSize: 11.5, color: '#b08080', fontStyle: 'italic' }}>no ID</span>}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a0000', fontFamily: 'var(--font-sans)' }}>{r.full_name || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 16px', maxWidth: 200 }}>
                    <span style={{ fontSize: 12, color: '#5a3030', fontFamily: 'var(--font-sans)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.program || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontSize: 12, color: '#5a3030', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>{fmtDate(r.time_in)}</div>
                    <div style={{ fontSize: 11, color: '#9a7070', fontFamily: 'var(--font-sans)' }}>{fmtTime(r.time_in)}</div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <button
                      onMouseEnter={() => setDelHov(r.id)}
                      onMouseLeave={() => setDelHov(null)}
                      onClick={() => setDelConfirm(r)}
                      title="Delete record"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${delHov === r.id ? 'rgba(139,0,0,0.4)' : 'rgba(139,0,0,0.18)'}`,
                        background: delHov === r.id ? 'rgba(139,0,0,0.08)' : 'transparent',
                        transition: 'all 0.18s',
                        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                        color: delHov === r.id ? MAR : '#9a7070', letterSpacing: '0.04em',
                      }}
                    >
                      {Ic.trash} Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

      {delConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(10,0,0,0.78)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          animation: 'am-fadeIn 0.2s ease',
        }}>
          <div style={{
            background: CREAM, borderRadius: 20, width: '100%', maxWidth: 380,
            border: '2px solid rgba(201,168,76,0.35)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
            animation: 'am-slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
              padding: '18px 24px', borderBottom: '2px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: GP, fontWeight: 700 }}>Delete Record</div>
                <div style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.6)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>This action cannot be undone</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 18,
                background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a0000', fontFamily: 'var(--font-sans)', marginBottom: 3 }}>{delConfirm.full_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#6b4040', fontFamily: 'var(--font-sans)' }}>{delConfirm.id_no} · {fmtDate(delConfirm.time_in)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => setDelConfirm(null)} style={{
                  padding: '12px', borderRadius: 10, border: '1.5px solid rgba(139,0,0,0.2)',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: MAR,
                }}>Cancel</button>
                <button onClick={() => { onDelete(delConfirm.id); setDelConfirm(null); }} style={{
                  padding: '12px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: GP,
                  boxShadow: '0 4px 14px rgba(139,0,0,0.3)',
                }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function VisitorHistoryTable({ onFocusChange }) {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [hovRow,   setHovRow]   = useState(null);
  const [delHov,   setDelHov]   = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_logs').select('*')
        .order('time_in', { ascending: false }).limit(500);
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('[VisitorHistory] Load error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const ch = supabase.channel('visitor-history-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, (payload) => {
        setRecords(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'attendance_logs' }, (payload) => {
        setRecords(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const handleDelete = useCallback(async () => {
    const rec = delConfirm;
    if (!rec) return;
    setDelConfirm(null);
    const { error } = await supabase.from('attendance_logs').delete().eq('id', rec.id);
    if (!error) setRecords(prev => prev.filter(r => r.id !== rec.id));
  }, [delConfirm]);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.full_name?.toLowerCase().includes(q) || r.id_no?.toLowerCase().includes(q) || r.program?.toLowerCase().includes(q);
    const matchF = filter === 'all' || r.status === filter;
    return matchQ && matchF;
  });

  return (
    <>
      <div className="lm-panel" style={{ marginBottom: 0, padding: 0, overflow: 'visible', borderRadius: 14, border: '1.5px solid rgba(139,0,0,0.14)' }}>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(232,222,222,0.04), rgba(201,168,76,0.02))',
          borderBottom: '1.5px solid rgba(139,0,0,0.1)',
          borderRadius: '14px 14px 0 0',
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: 'var(--text-cream)', fontWeight: 700 }}>
            Visitor History
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>{Ic.search}</span>
              <input
                type="text" placeholder="Search student or book…"
                value={search} onChange={e => setSearch(e.target.value)}
                onFocus={() => onFocusChange?.(false)}
                onBlur={() => onFocusChange?.(true)}
                style={{
                  paddingLeft: 32, paddingRight: 10, height: 35,
                  background: 'var(--cream-light)', border: '1.5px solid rgba(139,0,0,0.15)',
                  borderRadius: 9, fontSize: 12.5, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)', outline: 'none', width: 210,
                }}
              />
            </div>
            <select
              value={filter} onChange={e => setFilter(e.target.value)}
              onFocus={() => onFocusChange?.(false)}
              onBlur={() => onFocusChange?.(true)}
              style={{
                height: 35, padding: '0 10px', background: 'var(--cream-light)',
                border: '1.5px solid rgba(139,0,0,0.15)', borderRadius: 9,
                fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="time-in">Time In</option>
              <option value="time-out">Time Out</option>
            </select>

          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', background: CREAM }}>
            <div className="lm-spinner" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>Loading visitor history…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: CREAM }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>No visitor records found</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
              {search ? 'Try a different search term.' : 'Attendance logs will appear here.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${MAR}, ${MAR2})` }}>
                  {['Student ID', 'Full Name', 'Program', 'Date', 'Time In', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '13px 16px', textAlign: 'left',
                      fontFamily: 'var(--font-sans)', fontSize: 10.5,
                      fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: GP, whiteSpace: 'nowrap',
                      borderBottom: `2.5px solid rgba(201,168,76,0.4)`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}
                    onMouseEnter={() => setHovRow(r.id)}
                    onMouseLeave={() => setHovRow(null)}
                    style={{
                      background: hovRow === r.id ? '#FFFFFF' : CREAM,
                      borderBottom: '1px solid rgba(139,0,0,0.07)',
                      transition: 'background 0.18s, box-shadow 0.18s',
                      boxShadow: hovRow === r.id ? 'inset 3px 0 0 0 #C9A84C, 0 2px 12px rgba(139,0,0,0.07)' : 'inset 3px 0 0 0 transparent',
                    }}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#7a4040', letterSpacing: '0.04em', fontWeight: 600 }}>
                        {r.id_no || <span style={{ fontSize: 11.5, color: '#b08080', fontStyle: 'italic' }}>no ID</span>}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a0000', fontFamily: 'var(--font-sans)' }}>{r.full_name || '—'}</span>
                    </td>
                    <td style={{ padding: '11px 16px', maxWidth: 200 }}>
                      <span style={{ fontSize: 12, color: '#5a3030', fontFamily: 'var(--font-sans)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.program || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 12, color: '#5a3030', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.time_in)}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 12, color: '#5a3030', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                        {fmtTime(r.time_in)}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <button
                        onMouseEnter={() => setDelHov(r.id)}
                        onMouseLeave={() => setDelHov(null)}
                        onClick={() => setDelConfirm(r)}
                        title="Delete record"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
                          border: `1.5px solid ${delHov === r.id ? 'rgba(139,0,0,0.4)' : 'rgba(139,0,0,0.18)'}`,
                          background: delHov === r.id ? 'rgba(139,0,0,0.08)' : 'transparent',
                          transition: 'all 0.18s',
                          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                          color: delHov === r.id ? MAR : '#9a7070', letterSpacing: '0.04em',
                        }}
                      >
                        {Ic.trash} Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {delConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(10,0,0,0.78)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          animation: 'am-fadeIn 0.2s ease',
        }}>
          <div style={{
            background: CREAM, borderRadius: 20, width: '100%', maxWidth: 380,
            border: '2px solid rgba(201,168,76,0.35)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
            animation: 'am-slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
              padding: '18px 24px', borderBottom: '2px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: GP, fontWeight: 700 }}>Delete Record</div>
                <div style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.6)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>This action cannot be undone</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 18,
                background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a0000', fontFamily: 'var(--font-sans)', marginBottom: 3 }}>{delConfirm.full_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#6b4040', fontFamily: 'var(--font-sans)' }}>{delConfirm.id_no} · {fmtDate(delConfirm.time_in)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => setDelConfirm(null)} style={{
                  padding: '12px', borderRadius: 10, border: '1.5px solid rgba(139,0,0,0.2)',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: MAR,
                }}>Cancel</button>
                <button onClick={handleDelete} style={{
                  padding: '12px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(135deg, ${MAR}, ${MAR2})`,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: GP,
                  boxShadow: '0 4px 14px rgba(139,0,0,0.3)',
                }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AttendanceMonitoring() {
  const [activeTab,   setActiveTab]   = useState('scanner');
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [scanResult,  setScanResult]  = useState(null);
  const [scannerReady]                = useState(true);
  const [stats,       setStats]       = useState({ today: 0, unique: 0, lastHour: 0 });
  const [scannerFocused, setScannerFocused] = useState(true);
  const [delConfirm,  setDelConfirm]  = useState(null);
  const resultTimer                   = useRef(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_logs').select('*')
        .eq('date', today()).order('time_in', { ascending: false });
      if (error) throw error;
      const now        = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const uniqueIds  = new Set((data || []).map(r => r.id_no).filter(Boolean));
      const lastHour   = (data || []).filter(r => r.time_in >= oneHourAgo).length;
      setRecords(data || []);
      setStats({ today: (data || []).length, unique: uniqueIds.size, lastHour });
    } catch (err) {
      console.error('[Attendance] Load error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    const channel = supabase.channel('attendance-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, (payload) => {
        const rec = payload.new;
        if (rec.date !== today()) return;
        setRecords(prev => prev.some(r => r.id === rec.id) ? prev : [rec, ...prev]);
        setStats(s => ({ today: s.today + 1, unique: s.unique + (rec.id_no ? 1 : 0), lastHour: s.lastHour + 1 }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'attendance_logs' }, (payload) => {
        setRecords(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleScan = useCallback(async (raw) => {
    const parsed = parseQR(raw);
    if (!parsed) {
      setScanResult({ type: 'error', title: 'Invalid QR Code', message: 'Could not parse student data. Ensure the correct QR format is used.' });
      clearTimeout(resultTimer.current);
      resultTimer.current = setTimeout(() => setScanResult(null), 5000);
      return;
    }
    const now    = new Date();
    const record = { id_no: parsed.id_no, full_name: parsed.full_name, program: parsed.program, time_in: now.toISOString(), date: today(), status: 'time-in' };
    try {
      const { data, error } = await supabase.from('attendance_logs').insert([record]).select().single();
      if (error) throw error;
      setRecords(prev => [data, ...prev]);
      setStats(s => ({ today: s.today + 1, unique: s.unique + (data.id_no ? 1 : 0), lastHour: s.lastHour + 1 }));
      setScanResult({ type: 'success', title: `Attendance Logged — ${fmtTime(now)}`, student: parsed, message: `Time-in recorded at ${fmtTime(now)}` });
    } catch (err) {
      setScanResult({ type: 'error', title: 'Database Error', message: `Could not save record. ${err.message || ''}`, student: parsed });
    }
    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setScanResult(null), 6000);
  }, []);

  const handleDelete = useCallback(async (id) => {
    const { error } = await supabase.from('attendance_logs').delete().eq('id', id);
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setStats(s => ({ ...s, today: Math.max(0, s.today - 1) }));
    }
  }, []);

  return (
    <div className="lm-module">
      <style>{TAB_CSS}</style>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Today's Visitors" value={stats.today}    sub="Total scans today" />
        <StatCard label="Unique Students"  value={stats.unique}   sub="Distinct IDs scanned" />
        <StatCard label="Last Hour"        value={stats.lastHour} sub="Entries in past 60 min" />
      </div>

      <div className="am-tabs">
        <button
          className={`am-tab${activeTab === 'scanner' ? ' am-on' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          {Ic.qr}
          QR Scanner
        </button>
        <button
          className={`am-tab${activeTab === 'history' ? ' am-on' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          {Ic.history}
          Visitor History
          {records.length > 0 && (
            <span className="am-tab-badge">{records.length}</span>
          )}
        </button>
      </div>

      
      {activeTab === 'scanner' && <>

        <div style={{ marginBottom: 16 }}>
          <ScannerPanel onScan={handleScan} scannerReady={scannerReady} />
        </div>

        {scanResult && (
          <div style={{ marginBottom: 16 }}>
            <ScanResult result={scanResult} onDismiss={() => setScanResult(null)} />
          </div>
        )}

        <TodayTable
          records={records}
          loading={loading}
          onDelete={handleDelete}
          onFocusChange={setScannerFocused}
        />

      </>}

      
      {activeTab === 'history' && <>

        <VisitorHistoryTable onFocusChange={setScannerFocused} />

      </>}

    </div>
  );
}