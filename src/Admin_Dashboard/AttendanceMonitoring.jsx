// src/Admin_Dashboard/AttendanceMonitoring.jsx
// QR-based Library Attendance System — Teklead T-D4 compatible (HID/keyboard emulation)

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt      = (d, opts) => new Intl.DateTimeFormat('en-PH', opts).format(d);
const fmtTime  = (d) => fmt(new Date(d), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const fmtDate  = (d) => fmt(new Date(d), { month: 'short', day: 'numeric', year: 'numeric' });
const today    = () => new Date().toISOString().split('T')[0];

// Parse QR payload from Teklead T-D4 (flat single-line string, no real newlines).
// Example: "IDNo: 2023313830Full Name: XANDRU C. BONDOCProgram: BSIT"
function parseQR(raw) {
  if (!raw?.trim()) return null;
  const flat = raw.trim().replace(/\r?\n/g, '');
  const idNoMatch    = flat.match(/IDNo\s*:\s*(.+?)(?=Full Name\s*:|Program\s*:|$)/i);
  const fullNameMatch = flat.match(/Full Name\s*:\s*(.+?)(?=IDNo\s*:|Program\s*:|$)/i);
  const programMatch  = flat.match(/Program\s*:\s*(.+?)(?=IDNo\s*:|Full Name\s*:|$)/i);
  const id_no    = idNoMatch?.[1]?.trim()    || '';
  const full_name = fullNameMatch?.[1]?.trim() || '';
  const program  = programMatch?.[1]?.trim()  || '';
  if (!id_no && !full_name) return null;
  return { id_no, full_name, program };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  users:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  id:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  clock:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>,
  warn:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  search:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-3.26"/></svg>,
  trash:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
};

// ─── Stat Card — matches lm-stat-card style ───────────────────────────────────
function StatCard({ icon, label, value, sub, accentColor = '#C9A84C' }) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, #8B0000 0%, #680000 100%)',
      border: '1px solid rgba(201,168,76,0.42)',
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 18px rgba(40,0,0,0.30)',
      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(40,0,0,0.45)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.60)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(40,0,0,0.30)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.42)'; }}
    >
      {/* Top gold stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg,#9E7D35,#E0BE72,#C9A84C)' }} />
      {/* Corner glow */}
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,76,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: 'rgba(201,168,76,0.14)', border: '1px solid rgba(201,168,76,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor,
        }}>{icon}</div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(255,230,150,0.72)', fontFamily: 'var(--font-sans)' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: '#FFE97A', lineHeight: 1, letterSpacing: '0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,225,140,0.55)', fontFamily: 'var(--font-sans)' }}>{sub}</div>}
    </div>
  );
}

// ─── useScannerCapture hook ───────────────────────────────────────────────────
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

// ─── Scanner Panel ────────────────────────────────────────────────────────────
function ScannerPanel({ onScan, scannerReady }) {
  const { inputEl, receiving, pulse, focused } = useScannerCapture(onScan);
  const borderColor = pulse   ? 'rgba(201,168,76,0.65)'
                    : focused ? 'rgba(39,122,73,0.40)'
                    :           'rgba(201,168,76,0.22)';
  return (
    <>
      {inputEl}
      <div style={{
        background: 'linear-gradient(145deg,#8B0000 0%,#680000 100%)',
        border: `1px solid ${borderColor}`,
        borderRadius: 14, padding: '20px 26px',
        display: 'flex', alignItems: 'center', gap: 20,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: pulse ? '0 0 24px rgba(201,168,76,0.14)' : '0 4px 18px rgba(40,0,0,0.28)',
      }}>
        {/* QR Icon */}
        <div style={{
          width: 58, height: 58, borderRadius: 14, flexShrink: 0,
          background: focused ? 'rgba(39,122,73,0.16)' : 'rgba(201,168,76,0.10)',
          border: `1px solid ${focused ? 'rgba(39,122,73,0.35)' : 'rgba(201,168,76,0.22)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: focused ? '#4caf87' : '#C9A84C',
          transition: 'all 0.3s',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
            <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
            <rect x="16" y="16" width="3" height="3" fill="currentColor"/>
            <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#F5E4A8', marginBottom: 5, letterSpacing: '0.04em' }}>
            QR Code Scanner
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,225,140,0.70)', lineHeight: 1.6 }}>
            {receiving
              ? 'Reading QR code data…'
              : !scannerReady
              ? 'Scanner not detected — connect the Teklead T-D4 via USB and refresh'
              : 'Ready — student can scan ID at any time, even while librarian is working'}
          </div>
          {!focused && (
            <div style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20, fontSize: 11,
              background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)',
              color: '#C9A84C',
            }}>
              {Ic.warn} Scanner capture paused — click anywhere to restore
            </div>
          )}
        </div>

        {/* Status dot */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: focused ? '#4caf87' : '#E8C97A',
            boxShadow: focused ? '0 0 8px #4caf8788' : 'none',
            animation: focused && scannerReady ? 'lm-pulse-dot 2s ease infinite' : 'none',
          }} />
          <div style={{ fontSize: 9, color: 'rgba(255,225,140,0.55)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', maxWidth: 60 }}>
            {focused ? 'Capturing' : 'Paused'}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Scan Result Banner ───────────────────────────────────────────────────────
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
      animation: 'lm-fade-in 0.3s ease',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: colors.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: colors.icon,
      }}>
        {isSuccess ? Ic.check : Ic.warn}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: colors.title, marginBottom: 4, letterSpacing: '0.03em' }}>
          {result.title}
        </div>
        {result.student && (
          <div style={{ fontSize: 12.5, color: 'rgba(255,225,140,0.80)', lineHeight: 1.6 }}>
            <strong style={{ color: '#F5E4A8' }}>{result.student.full_name}</strong>
            {result.student.id_no ? ` · ID ${result.student.id_no}` : ''}
            {result.student.program ? ` · ${result.student.program}` : ''}
          </div>
        )}
        {result.message && (
          <div style={{ fontSize: 12, color: 'rgba(255,225,140,0.55)', marginTop: 3 }}>{result.message}</div>
        )}
      </div>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(255,225,140,0.45)', fontSize: 18,
        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', padding: 0, transition: 'color 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = '#F5E4A8'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,225,140,0.45)'}
      >×</button>
    </div>
  );
}

// ─── Attendance Table ─────────────────────────────────────────────────────────
function AttendanceTable({ records, loading, onDelete }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.full_name?.toLowerCase().includes(q) || r.id_no?.toLowerCase().includes(q) || r.program?.toLowerCase().includes(q);
    const matchF = filter === 'all' || r.status === filter;
    return matchQ && matchF;
  });

  const STATUS_STYLE = {
    'time-in':  { bg: 'rgba(39,122,73,0.18)',  border: 'rgba(39,122,73,0.40)',  text: '#4caf87' },
    'time-out': { bg: 'rgba(239,154,154,0.12)', border: 'rgba(239,154,154,0.28)', text: '#ef9a9a' },
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg,#880000 0%,#6A0000 100%)',
      border: '1px solid rgba(201,168,76,0.38)',
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 4px 18px rgba(40,0,0,0.30)',
    }}>
      {/* Table header bar */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid rgba(201,168,76,0.15)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, color: '#F5E4A8', flex: 1, letterSpacing: '0.04em' }}>
          Attendance Log — {fmtDate(new Date())}
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,225,140,0.45)', pointerEvents: 'none' }}>
            {Ic.search}
          </span>
          <input
            style={{
              paddingLeft: 30, width: 200, height: 34, fontSize: 12,
              background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(201,168,76,0.20)',
              borderRadius: 8, color: '#F5E4A8', fontFamily: 'var(--font-sans)',
              outline: 'none', boxSizing: 'border-box',
            }}
            placeholder="Search student…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Filter */}
        <select
          value={filter} onChange={e => setFilter(e.target.value)}
          style={{
            padding: '7px 12px', height: 34, borderRadius: 8, fontSize: 12,
            background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(201,168,76,0.20)',
            color: '#F5E4A8', fontFamily: 'var(--font-sans)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">All Status</option>
          <option value="time-in">Time In</option>
          <option value="time-out">Time Out</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.12)', background: 'rgba(0,0,0,0.12)' }}>
              {['#', 'Student ID', 'Full Name', 'Program', 'Time In', 'Status', ''].map((h, i) => (
                <th key={i} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)',
                  fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '50px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <div className="lm-spinner" style={{ borderColor: 'rgba(201,168,76,0.20)', borderTopColor: '#C9A84C' }} />
                  <span style={{ color: 'rgba(255,225,140,0.55)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>Loading records…</span>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'rgba(255,225,140,0.45)', marginBottom: 6 }}>
                  No attendance records found
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,225,140,0.30)', fontFamily: 'var(--font-sans)' }}>
                  {search ? 'Try a different search term' : 'Scan a student ID to log attendance'}
                </div>
              </td></tr>
            ) : (
              filtered.map((r, i) => {
                const sc = STATUS_STYLE[r.status] || STATUS_STYLE['time-in'];
                return (
                  <AttendanceRow key={r.id} record={r} idx={i} statusStyle={sc} onDelete={onDelete} />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <div style={{
          padding: '10px 20px', borderTop: '1px solid rgba(201,168,76,0.10)',
          fontSize: 11, color: 'rgba(255,225,140,0.45)', fontFamily: 'var(--font-sans)',
          display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.10)',
        }}>
          <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''} shown</span>
          <span>{records.length} total today</span>
        </div>
      )}
    </div>
  );
}

function AttendanceRow({ record: r, idx, statusStyle: sc, onDelete }) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderBottom: '1px solid rgba(201,168,76,0.06)',
        background: hov ? 'rgba(245,228,168,0.05)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,225,140,0.40)' }}>{idx + 1}</td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: '#C9A84C', fontFamily: 'var(--font-sans)', letterSpacing: '0.03em' }}>{r.id_no || '—'}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: '#F5E4A8', fontWeight: 500 }}>{r.full_name || '—'}</td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,225,140,0.60)', maxWidth: 220 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.program || '—'}</div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,225,140,0.60)', whiteSpace: 'nowrap' }}>
        {fmtTime(r.time_in)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20,
          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
          {r.status === 'time-in' ? 'Time In' : 'Time Out'}
        </span>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <button onClick={() => onDelete(r.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,225,140,0.30)', padding: '4px 6px', borderRadius: 6,
          display: 'flex', alignItems: 'center', transition: 'color 0.15s, background 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef9a9a'; e.currentTarget.style.background = 'rgba(239,154,154,0.10)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,225,140,0.30)'; e.currentTarget.style.background = 'none'; }}
          title="Remove record"
        >
          {Ic.trash}
        </button>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendanceMonitoring() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [scannerReady]              = useState(true);
  const [clock, setClock]           = useState(new Date());
  const [stats, setStats]           = useState({ today: 0, unique: 0, lastHour: 0 });
  const resultTimer                 = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load records
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

  // Realtime
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

  // Handle scan
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

  // Delete
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Remove this attendance record?')) return;
    const { error } = await supabase.from('attendance_logs').delete().eq('id', id);
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setStats(s => ({ ...s, today: Math.max(0, s.today - 1) }));
    }
  }, []);

  return (
    <div className="lm-module">
      {/* ── Header Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--maroon-deep)', letterSpacing: '0.04em', lineHeight: 1 }}>
              {fmt(clock, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginTop: 3 }}>
              {fmt(clock, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 1 }}>Philippine Standard Time</div>
          </div>
          <button className="lm-btn lm-btn--ghost" style={{ gap: 6, fontSize: 12, padding: '8px 14px' }} onClick={loadRecords}>
            {Ic.refresh} Refresh
          </button>
        </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard icon={Ic.users} label="Today's Visitors" value={stats.today}    sub="Total scans today"        accentColor="#C9A84C" />
        <StatCard icon={Ic.id}    label="Unique Students"  value={stats.unique}   sub="Distinct IDs scanned"     accentColor="#4caf87" />
        <StatCard icon={Ic.clock} label="Last Hour"        value={stats.lastHour} sub="Entries in past 60 min"   accentColor="#64b5f6" />
      </div>

      {/* ── Scanner Panel ── */}
      <div style={{ marginBottom: 16 }}>
        <ScannerPanel onScan={handleScan} scannerReady={scannerReady} />
      </div>

      {/* ── Scan Result ── */}
      {scanResult && (
        <div style={{ marginBottom: 16 }}>
          <ScanResult result={scanResult} onDismiss={() => setScanResult(null)} />
        </div>
      )}

      {/* ── Table ── */}
      <AttendanceTable records={records} loading={loading} onDelete={handleDelete} />

      <style>{`
        @keyframes lm-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}