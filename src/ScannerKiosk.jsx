// src/ScannerKiosk.jsx
// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE SCANNER KIOSK — open this in its own small browser window.
// It connects directly to Supabase and saves attendance independently of
// whatever the librarian is doing in the main dashboard tab.
//
// How to use:
//   1. Add a route in your router: <Route path="/kiosk" element={<ScannerKiosk />} />
//   2. Librarian opens: http://localhost:5173/kiosk  (or your deployed URL/kiosk)
//   3. Right-click the URL bar → "Open in new window" → resize to ~400×300px
//   4. Leave it in the corner of the screen — it will always capture scans.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

const today   = () => new Date().toISOString().split('T')[0];
const fmtTime = (d) => new Intl.DateTimeFormat('en-PH', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
}).format(new Date(d));

function parseQR(raw) {
  if (!raw?.trim()) return null;
  const flat = raw.trim().replace(/\r?\n/g, '');
  const idNoMatch     = flat.match(/IDNo\s*:\s*(.+?)(?=Full Name\s*:|Program\s*:|$)/i);
  const fullNameMatch = flat.match(/Full Name\s*:\s*(.+?)(?=IDNo\s*:|Program\s*:|$)/i);
  const programMatch  = flat.match(/Program\s*:\s*(.+?)(?=IDNo\s*:|Full Name\s*:|$)/i);
  const id_no     = idNoMatch?.[1]?.trim()     || '';
  const full_name = fullNameMatch?.[1]?.trim() || '';
  const program   = programMatch?.[1]?.trim()  || '';
  if (!id_no && !full_name) return null;
  return { id_no, full_name, program };
}

export default function ScannerKiosk() {
  const inputRef   = useRef(null);
  const bufRef     = useRef('');
  const timerRef   = useRef(null);
  const refocusRef = useRef(null);

  const [clock,    setClock]    = useState(new Date());
  const [last,     setLast]     = useState(null);   // last scan result
  const [count,    setCount]    = useState(0);      // today's count
  const [scanning, setScanning] = useState(false);  // receiving keystrokes
  const [focused,  setFocused]  = useState(true);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load today's count on mount
  useEffect(() => {
    supabase
      .from('attendance_logs')
      .select('id', { count: 'exact', head: true })
      .eq('date', today())
      .then(({ count: c }) => setCount(c || 0));
  }, []);

  // Refocus helper — won't steal focus from real inputs
  const refocusIfSafe = useCallback(() => {
    clearTimeout(refocusRef.current);
    refocusRef.current = setTimeout(() => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (document.activeElement?.isContentEditable) return;
      inputRef.current?.focus({ preventScroll: true });
    }, 80);
  }, []);

  // Auto-focus + poll
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const poll = setInterval(refocusIfSafe, 1500);
    return () => { clearInterval(poll); clearTimeout(refocusRef.current); clearTimeout(timerRef.current); };
  }, [refocusIfSafe]);

  // Save attendance to Supabase
  const saveAttendance = useCallback(async (parsed) => {
    const now = new Date();
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{
        id_no:     parsed.id_no,
        full_name: parsed.full_name,
        program:   parsed.program,
        time_in:   now.toISOString(),
        date:      today(),
        status:    'time-in',
      }])
      .select()
      .single();

    if (error) {
      setLast({ type: 'error', student: parsed, time: now });
    } else {
      setLast({ type: 'success', student: parsed, time: now });
      setCount(c => c + 1);
    }
  }, []);

  // Keyboard handler on the hidden input
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') {
      const raw = bufRef.current.trim();
      bufRef.current = '';
      setScanning(false);
      clearTimeout(timerRef.current);
      if (raw.length > 4) {
        const parsed = parseQR(raw);
        if (parsed) saveAttendance(parsed);
        else setLast({ type: 'error', student: null, time: new Date() });
      }
    } else if (e.key.length === 1) {
      bufRef.current += e.key;
      setScanning(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufRef.current = '';
        setScanning(false);
      }, 2000);
    }
  }, [saveAttendance]);

  const fmt = (d, opts) => new Intl.DateTimeFormat('en-PH', opts).format(d);

  const isSuccess = last?.type === 'success';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: 24,
      gap: 20,
      userSelect: 'none',
    }}>
      {/* Hidden capture input */}
      <input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        onBlur={() => { setFocused(false); refocusIfSafe(); }}
        onFocus={() => setFocused(true)}
        readOnly
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 1, height: 1, opacity: 0,
          pointerEvents: 'none', zIndex: -1,
          border: 'none', outline: 'none', background: 'transparent',
        }}
      />

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 13,
          letterSpacing: '0.15em',
          color: '#C9A84C',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          QR Library · PSU
        </div>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 28,
          color: '#F5E4A8',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}>
          {fmt(clock, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(245,228,168,0.4)', marginTop: 4 }}>
          {fmt(clock, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Scanner zone */}
      <div style={{
        width: '100%',
        maxWidth: 340,
        background: scanning ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${scanning ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
        borderRadius: 16,
        padding: '28px 20px',
        textAlign: 'center',
        transition: 'all 0.25s ease',
      }}>
        {/* QR icon */}
        <div style={{
          width: 72, height: 72,
          margin: '0 auto 16px',
          borderRadius: 16,
          background: focused ? 'rgba(39,122,73,0.12)' : 'rgba(201,168,76,0.08)',
          border: `1px solid ${focused ? 'rgba(39,122,73,0.35)' : 'rgba(201,168,76,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: focused ? '#4caf87' : '#C9A84C',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
            <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
            <rect x="16" y="16" width="3" height="3" fill="currentColor"/>
            <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
          </svg>
        </div>

        <div style={{ fontSize: 14, color: '#F5E4A8', fontFamily: "'Cinzel', serif", marginBottom: 6 }}>
          {scanning ? 'Reading…' : 'Scan Your ID'}
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.45)', lineHeight: 1.6 }}>
          {scanning
            ? 'Hold still — receiving QR data'
            : 'Hold your school ID in front of the\nTeklead T-D4 scanner'
          }
        </div>

        {/* Focus lost warning */}
        {!focused && (
          <div style={{
            marginTop: 12,
            padding: '6px 12px',
            borderRadius: 20,
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            fontSize: 11, color: '#C9A84C',
          }}>
            ⚠ Click this window to restore scanner
          </div>
        )}
      </div>

      {/* Last scan result */}
      {last && (
        <div style={{
          width: '100%',
          maxWidth: 340,
          background: isSuccess ? 'rgba(39,122,73,0.1)' : 'rgba(139,0,0,0.15)',
          border: `1px solid ${isSuccess ? 'rgba(39,122,73,0.35)' : 'rgba(239,154,154,0.3)'}`,
          borderRadius: 12,
          padding: '14px 18px',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isSuccess ? '#4caf87' : '#ef9a9a',
            marginBottom: 6,
          }}>
            {isSuccess ? '✓ Attendance Logged' : '✗ Scan Failed'}
          </div>
          {last.student && (
            <>
              <div style={{ fontSize: 14, color: '#F5E4A8', fontWeight: 500 }}>{last.student.full_name}</div>
              {last.student.id_no && <div style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.5)', marginTop: 2 }}>ID No: {last.student.id_no}</div>}
              {last.student.program && <div style={{ fontSize: 11, color: 'rgba(245,228,168,0.4)', marginTop: 1 }}>{last.student.program}</div>}
            </>
          )}
          <div style={{ fontSize: 10.5, color: 'rgba(245,228,168,0.3)', marginTop: 6 }}>{fmtTime(last.time)}</div>
        </div>
      )}

      {/* Today count */}
      <div style={{
        fontSize: 11, color: 'rgba(245,228,168,0.3)',
        letterSpacing: '0.06em',
      }}>
        {count} student{count !== 1 ? 's' : ''} logged today
      </div>

      {/* Status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: focused ? '#4caf87' : '#E8C97A',
          boxShadow: focused ? '0 0 5px #4caf8788' : 'none',
        }} />
        <span style={{ fontSize: 10, color: 'rgba(245,228,168,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {focused ? 'Scanner active' : 'Click window to activate'}
        </span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0000; }
      `}</style>
    </div>
  );
}