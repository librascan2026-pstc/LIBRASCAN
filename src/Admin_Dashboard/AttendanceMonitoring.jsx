// src/Admin_Dashboard/AttendanceMonitoring.jsx
// QR-based Library Attendance System — Teklead T-D4 compatible (HID/keyboard emulation)

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d, opts) => new Intl.DateTimeFormat('en-PH', opts).format(d);
const fmtTime  = (d) => fmt(new Date(d), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const fmtDate  = (d) => fmt(new Date(d), { month: 'short', day: 'numeric', year: 'numeric' });
const fmtFull  = (d) => fmt(new Date(d), { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

const today = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Parse QR payload from Teklead T-D4.
//
// The T-D4 outputs QR data as a FLAT single-line string (no newlines).
// Example raw input:
//   "IDNo: 2023313830Full Name: XANDRU C. BONDOCProgram: Bachelor of Science in Information Technology"
//
// Strategy: use regex to extract each labelled field, stopping before the next known label.
// Labels are: "IDNo:", "Full Name:", "Program:"
// We match each label and capture everything up to (but not including) the next label or end-of-string.
function parseQR(raw) {
  if (!raw || !raw.trim()) return null;

  const str = raw.trim();

  // Normalize: if the string has real newlines, join them (safety net)
  const flat = str.replace(/\r?\n/g, '');

  // Regex: capture value after each known label, up to the next label keyword or end
  // Labels in order of appearance: IDNo, Full Name, Program
  const idNoMatch    = flat.match(/IDNo\s*:\s*(.+?)(?=Full Name\s*:|Program\s*:|$)/i);
  const fullNameMatch = flat.match(/Full Name\s*:\s*(.+?)(?=IDNo\s*:|Program\s*:|$)/i);
  const programMatch  = flat.match(/Program\s*:\s*(.+?)(?=IDNo\s*:|Full Name\s*:|$)/i);

  const id_no    = idNoMatch?.[1]?.trim()    || '';
  const full_name = fullNameMatch?.[1]?.trim() || '';
  const program  = programMatch?.[1]?.trim()  || '';

  // Must have at least one meaningful field
  if (!id_no && !full_name) return null;

  return { id_no, full_name, program };
}

// Status pill colors
const STATUS_COLOR = {
  'time-in':  { bg: 'rgba(39,122,73,0.2)',  border: 'rgba(39,122,73,0.5)',  text: '#4caf87' },
  'time-out': { bg: 'rgba(139,0,0,0.2)',    border: 'rgba(201,168,76,0.25)', text: '#ef9a9a' },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  scan:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  check:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  clock:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  users:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  search:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-3.26"/></svg>,
  id:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  trash:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  warn:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  filter:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'var(--gold)' }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 22px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold-pale)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sub}</div>}
    </div>
  );
}

// ─── useScannerCapture hook ───────────────────────────────────────────────────
// Uses a HIDDEN INPUT that aggressively keeps focus so the scanner works even
// when the librarian is typing/clicking elsewhere in the same browser tab.
// The input is 1×1px, opacity-0, pointer-events-none — invisible but real.
// Every time it loses focus it refocuses itself after 50 ms (debounced so we
// don't fight legitimate form inputs the librarian is actively typing in).
function useScannerCapture(onScan) {
  const inputRef  = useRef(null);
  const bufRef    = useRef('');
  const timerRef  = useRef(null);   // keystroke timeout (stray-input guard)
  const refocusRef = useRef(null);  // refocus debounce timer
  const [receiving, setReceiving] = useState(false);
  const [pulse,     setPulse]     = useState(false);
  const [focused,   setFocused]   = useState(true);

  // Keep the hidden input focused unless the user is actively in a real input/textarea/select
  const refocusIfSafe = useCallback(() => {
    clearTimeout(refocusRef.current);
    refocusRef.current = setTimeout(() => {
      const active = document.activeElement;
      const tag    = active?.tagName?.toLowerCase();
      // Don't steal focus from real interactive elements the librarian is using
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (active?.isContentEditable) return;
      inputRef.current?.focus({ preventScroll: true });
    }, 80);
  }, []);

  // Initial focus + refocus on mount
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    // Poll every 2 s — catches cases where focus drifts without a blur event
    const poll = setInterval(refocusIfSafe, 2000);
    return () => { clearInterval(poll); clearTimeout(refocusRef.current); clearTimeout(timerRef.current); };
  }, [refocusIfSafe]);

  const handleKeyDown = useCallback((e) => {
    // Let normal modifier combos (Ctrl+C etc.) pass through
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Enter') {
      const raw = bufRef.current.trim();
      bufRef.current = '';
      setReceiving(false);
      clearTimeout(timerRef.current);
      if (raw.length > 4) {
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
        onScan(raw);
      }
    } else if (e.key.length === 1) {
      bufRef.current += e.key;
      setReceiving(true);
      clearTimeout(timerRef.current);
      // Clear stale buffer after 2 s of silence (guard against stray keystrokes)
      timerRef.current = setTimeout(() => {
        bufRef.current = '';
        setReceiving(false);
      }, 2000);
    }
  }, [onScan]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    refocusIfSafe();
  }, [refocusIfSafe]);

  const handleFocus = useCallback(() => setFocused(true), []);

  // The invisible input element to render
  const inputEl = (
    <input
      ref={inputRef}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onFocus={handleFocus}
      readOnly
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: 1, height: 1,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
        border: 'none', outline: 'none',
        background: 'transparent',
      }}
    />
  );

  return { inputEl, receiving, pulse, focused };
}

// ─── ScannerInput UI ──────────────────────────────────────────────────────────
function ScannerInput({ onScan, scannerReady }) {
  const { inputEl, receiving, pulse, focused } = useScannerCapture(onScan);

  const statusColor  = focused ? '#4caf87' : '#E8C97A';
  const statusLabel  = focused ? 'Capturing' : 'Click page to restore';
  const borderColor  = pulse   ? 'rgba(201,168,76,0.65)'
                     : focused ? 'rgba(39,122,73,0.35)'
                     :           'rgba(201,168,76,0.2)';

  return (
    <>
      {/* Hidden always-focused capture input */}
      {inputEl}

      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px 26px',
        display: 'flex', alignItems: 'center', gap: 20,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: pulse ? '0 0 24px rgba(201,168,76,0.12)' : 'none',
      }}>

        {/* QR icon */}
        <div style={{
          width: 60, height: 60,
          borderRadius: 14,
          background: scannerReady ? 'rgba(39,122,73,0.12)' : 'rgba(139,0,0,0.12)',
          border: `1px solid ${scannerReady ? 'rgba(39,122,73,0.3)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: scannerReady ? '#4caf87' : 'var(--gold)',
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
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--gold-pale)', marginBottom: 4 }}>
            QR Code Scanner
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {!scannerReady
              ? 'Scanner not detected — connect the Teklead T-D4 via USB and refresh'
              : receiving
              ? 'Reading QR code data…'
              : 'Ready — student can scan ID at any time, even while librarian is working'
            }
          </div>
          {/* Focus-loss warning */}
          {!focused && (
            <div style={{
              marginTop: 6,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.25)',
              color: 'var(--gold)',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Scanner capture paused — click anywhere on this page to restore
            </div>
          )}
        </div>

        {/* Status dot */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: statusColor,
            boxShadow: focused ? `0 0 6px ${statusColor}88` : 'none',
            animation: focused && scannerReady ? 'lm-pulse-dot 2s ease infinite' : 'none',
          }} />
          <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', maxWidth: 64 }}>
            {statusLabel}
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

  return (
    <div style={{
      background: isSuccess ? 'rgba(39,122,73,0.1)' : isWarn ? 'rgba(201,168,76,0.08)' : 'rgba(139,0,0,0.15)',
      border: `1px solid ${isSuccess ? 'rgba(39,122,73,0.35)' : isWarn ? 'rgba(201,168,76,0.3)' : 'rgba(239,154,154,0.3)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '18px 22px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
      animation: 'lm-fade-in 0.3s ease',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: isSuccess ? 'rgba(39,122,73,0.2)' : isWarn ? 'rgba(201,168,76,0.15)' : 'rgba(139,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        color: isSuccess ? '#4caf87' : isWarn ? 'var(--gold)' : '#ef9a9a',
      }}>
        {isSuccess ? Ic.check : isWarn ? Ic.warn : Ic.warn}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 14,
          color: isSuccess ? '#4caf87' : isWarn ? 'var(--gold-pale)' : '#ef9a9a',
          marginBottom: 4,
        }}>
          {result.title}
        </div>
        {result.student && (
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{result.student.full_name}</strong>
            {result.student.id_no ? ` · ID ${result.student.id_no}` : ''}
            {result.student.program ? ` · ${result.student.program}` : ''}
          </div>
        )}
        {result.message && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{result.message}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', fontSize: 16,
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', padding: 0,
        }}
      >×</button>
    </div>
  );
}

function AttendanceTable({ records, loading, onDelete }) {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      r.full_name?.toLowerCase().includes(q) ||
      r.id_no?.toLowerCase().includes(q) ||
      r.program?.toLowerCase().includes(q);
    const matchF = filter === 'all' || r.status === filter;
    return matchQ && matchF;
  });

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Table Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--gold-pale)', flex: 1 }}>
          Attendance Log — {fmtDate(new Date())}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-dim)',
          }}>{Ic.search}</span>
          <input
            className="lm-input"
            style={{ paddingLeft: 30, width: 200, height: 34, fontSize: 12 }}
            placeholder="Search student…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter */}
        <select
          className="lm-select lm-select--sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
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
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['#', 'Student ID', 'Full Name', 'Program', 'Time In', 'Status', ''].map((h, i) => (
                <th key={i} style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-dim)',
                  background: 'rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                <div className="lm-loading"><div className="lm-spinner" /><span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Loading records…</span></div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '50px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-display)' }}>No attendance records found</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {search ? 'Try a different search term' : 'Scan a student ID to log attendance'}
                </div>
              </td></tr>
            ) : (
              filtered.map((r, i) => {
                const sc = STATUS_COLOR[r.status] || STATUS_COLOR['time-in'];
                return (
                  <tr key={r.id} style={{
                    borderBottom: '1px solid rgba(201,168,76,0.05)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-dim)' }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-sans)', letterSpacing: '0.03em' }}>{r.id_no || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{r.full_name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 11.5, color: 'var(--text-muted)', maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.program || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <div>{fmtTime(r.time_in)}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                        background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.text }} />
                        {r.status === 'time-in' ? 'Time In' : 'Time Out'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => onDelete(r.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-dim)', padding: 4,
                          borderRadius: 4,
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef9a9a'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                        title="Delete record"
                      >
                        {Ic.trash}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-dim)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''} shown</span>
          <span>{records.length} total today</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendanceMonitoring() {
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [scanResult, setScanResult]   = useState(null);
  const [scannerReady, setScannerReady] = useState(true); // T-D4 is plug-and-play USB HID
  const [clock, setClock]             = useState(new Date());
  const [stats, setStats]             = useState({ today: 0, unique: 0, lastHour: 0 });
  const resultTimer = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load today's attendance
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('date', today())
        .order('time_in', { ascending: false });

      if (error) throw error;
      setRecords(data || []);

      // Compute stats
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const uniqueIds  = new Set((data || []).map(r => r.id_no).filter(Boolean));
      const lastHour   = (data || []).filter(r => r.time_in >= oneHourAgo).length;
      setStats({ today: (data || []).length, unique: uniqueIds.size, lastHour });
    } catch (err) {
      console.error('[Attendance] Load error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // Real-time subscription — catches inserts from OTHER sessions/devices.
  // No row-level filter (not supported reliably on free tier).
  // Duplicate guard uses record id so optimistic inserts aren't doubled.
  useEffect(() => {
    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_logs',
      }, (payload) => {
        const rec = payload.new;
        if (rec.date !== today()) return;
        setRecords(prev => {
          if (prev.some(r => r.id === rec.id)) return prev;
          return [rec, ...prev];
        });
        setStats(s => ({
          today:    s.today + 1,
          unique:   s.unique + (rec.id_no ? 1 : 0),
          lastHour: s.lastHour + 1,
        }));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'attendance_logs',
      }, (payload) => {
        setRecords(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Handle QR scan
  const handleScan = useCallback(async (raw) => {
    const parsed = parseQR(raw);
    if (!parsed) {
      setScanResult({ type: 'error', title: 'Invalid QR Code', message: 'Could not parse student data. Ensure the QR format is correct.' });
      clearTimeout(resultTimer.current);
      resultTimer.current = setTimeout(() => setScanResult(null), 5000);
      return;
    }

    const now = new Date();
    const record = {
      id_no:     parsed.id_no,
      full_name: parsed.full_name,
      program:   parsed.program,
      time_in:   now.toISOString(),
      date:      today(),
      status:    'time-in',
    };

    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      // ── Instantly update local state — don't wait for realtime ──
      setRecords(prev => [data, ...prev]);
      setStats(s => {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        return {
          today:    s.today + 1,
          unique:   s.unique + (data.id_no ? 1 : 0),
          lastHour: data.time_in >= oneHourAgo ? s.lastHour + 1 : s.lastHour,
        };
      });

      setScanResult({
        type: 'success',
        title: `Attendance Logged — ${fmtTime(now)}`,
        student: parsed,
        message: `Successfully recorded time-in at ${fmtTime(now)}`,
      });
    } catch (err) {
      console.error('[Attendance] Insert error:', err);
      setScanResult({
        type: 'error',
        title: 'Database Error',
        message: `Could not save attendance record. ${err.message || ''}`,
        student: parsed,
      });
    }

    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setScanResult(null), 6000);
  }, []);

  // Delete record
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
      {/* ── Header ── */}
      <div className="lm-module-header">
        <div>
          <h2 className="lm-module-title">Attendance Monitoring</h2>
          <p className="lm-module-subtitle">QR-based library entry logging via Teklead T-D4 scanner</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--gold-pale)',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}>
            {fmt(clock, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
              {fmt(clock, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 1 }}>Philippine Standard Time</div>
          </div>
          <button
            className="lm-btn lm-btn--ghost"
            style={{ gap: 6, fontSize: 12, padding: '8px 14px' }}
            onClick={loadRecords}
          >
            {Ic.refresh} Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 20,
      }}>
        <StatCard icon={Ic.users} label="Today's Visitors" value={stats.today} sub="Total scans today" />
        <StatCard icon={Ic.id}    label="Unique Students"  value={stats.unique} sub="Distinct IDs scanned" color="#4caf87" />
        <StatCard icon={Ic.clock} label="Last Hour"        value={stats.lastHour} sub="Entries in past 60 min" color="#64b5f6" />
      </div>

      {/* ── Scanner Input ── */}
      <div style={{ marginBottom: 16 }}>
        <ScannerInput onScan={handleScan} scannerReady={scannerReady} />
      </div>

      {/* ── Scan Result Flash ── */}
      {scanResult && (
        <div style={{ marginBottom: 16 }}>
          <ScanResult result={scanResult} onDismiss={() => setScanResult(null)} />
        </div>
      )}

      {/* ── Attendance Table ── */}
      <AttendanceTable records={records} loading={loading} onDelete={handleDelete} />

      {/* ── Pulse animation ── */}
      <style>{`
        @keyframes lm-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}