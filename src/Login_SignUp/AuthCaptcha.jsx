// src/Login_SignUp/AuthCaptcha.jsx
// Self-contained CAPTCHA — no external scripts, no CDN links.
// Renders a distorted canvas image with random alphanumeric characters.
// User must type what they see to pass verification.

import { useEffect, useRef, useState, useCallback } from 'react';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 6;

function generateCode() {
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function drawCaptcha(canvas, code) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fdf6e3');
  bg.addColorStop(1, '#f5e8c5');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Noise dots
  for (let i = 0; i < 80; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * W,
      Math.random() * H,
      Math.random() * 1.5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(${100 + Math.random() * 80},${40 + Math.random() * 40},${10 + Math.random() * 20},${0.25 + Math.random() * 0.35})`;
    ctx.fill();
  }

  // Random wavy lines (interference)
  for (let l = 0; l < 5; l++) {
    ctx.beginPath();
    ctx.moveTo(0, Math.random() * H);
    for (let x = 0; x < W; x += 10) {
      ctx.lineTo(x, Math.random() * H);
    }
    ctx.strokeStyle = `rgba(139,0,0,${0.07 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.8 + Math.random();
    ctx.stroke();
  }

  // Draw each character with random tilt, size, color shift
  const charW = W / (LENGTH + 1);
  const fonts = ["'Georgia', serif", "'Times New Roman', serif", "serif"];

  for (let i = 0; i < code.length; i++) {
    const x = charW * (i + 0.8) + (Math.random() * 8 - 4);
    const y = H / 2 + (Math.random() * 10 - 5);
    const angle = (Math.random() * 0.5 - 0.25);
    const size = 22 + Math.random() * 8;
    const font = fonts[Math.floor(Math.random() * fonts.length)];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow for depth
    ctx.shadowColor = 'rgba(80,20,0,0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Alternate dark red / dark brown tones
    const r = 100 + Math.floor(Math.random() * 60);
    const g = Math.floor(Math.random() * 30);
    const b = Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.font = `bold ${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code[i], 0, 0);

    ctx.restore();
  }

  // Overlay sine-wave stripe to blur readability slightly
  for (let x = 0; x < W; x += 2) {
    const y = H / 2 + Math.sin(x * 0.08) * (H * 0.18);
    ctx.beginPath();
    ctx.moveTo(x, y - 1);
    ctx.lineTo(x, y + 1);
    ctx.strokeStyle = 'rgba(139,80,20,0.06)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/**
 * AuthCaptcha
 * Props:
 *   onVerify(bool)  — called with true when user types correct code, false on mismatch
 *   onReset()       — called when CAPTCHA is refreshed (clears verified state in parent)
 */
export default function AuthCaptcha({ onVerify, onReset }) {
  const canvasRef  = useRef(null);
  const [code, setCode]       = useState('');
  const [input, setInput]     = useState('');
  const [status, setStatus]   = useState('idle'); // 'idle' | 'error' | 'ok'

  const refresh = useCallback(() => {
    const newCode = generateCode();
    setCode(newCode);
    setInput('');
    setStatus('idle');
    onReset?.();
    // Draw after state flush
    setTimeout(() => {
      if (canvasRef.current) drawCaptcha(canvasRef.current, newCode);
    }, 0);
  }, [onReset]);

  // Initial draw
  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase().slice(0, LENGTH);
    setInput(val);
    if (val.length === LENGTH) {
      if (val === code) {
        setStatus('ok');
        onVerify?.(true);
      } else {
        setStatus('error');
        onVerify?.(false);
        // Auto-refresh after short delay on wrong answer
        setTimeout(() => {
          refresh();
        }, 900);
      }
    } else {
      if (status !== 'idle') {
        setStatus('idle');
        onVerify?.(false);
      }
    }
  };

  const borderColor =
    status === 'ok'    ? 'rgba(46,125,50,0.7)'  :
    status === 'error' ? 'rgba(192,57,43,0.75)' :
    'rgba(139,70,20,0.3)';

  const labelColor =
    status === 'ok'    ? '#2e7d32' :
    status === 'error' ? '#c0392b' :
    '#5a3010';

  const labelText =
    status === 'ok'    ? 'CAPTCHA Verified ✓' :
    status === 'error' ? 'Incorrect — Try Again' :
    'Security Verification';

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: labelColor,
          marginBottom: 6,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          transition: 'color 0.2s',
        }}
      >
        {labelText}
      </div>

      {/* Canvas + Refresh button row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <canvas
          ref={canvasRef}
          width={210}
          height={56}
          style={{
            borderRadius: 10,
            border: `1.5px solid ${borderColor}`,
            display: 'block',
            userSelect: 'none',
            background: '#fdf6e3',
            transition: 'border-color 0.2s',
            flexShrink: 0,
          }}
        />
        {/* Refresh button */}
        <button
          type="button"
          onClick={refresh}
          title="Refresh CAPTCHA"
          style={{
            background: 'rgba(139,0,0,0.08)',
            border: '1.5px solid rgba(139,0,0,0.22)',
            borderRadius: 10,
            padding: '8px 10px',
            cursor: 'pointer',
            color: '#8B0000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,0,0,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(139,0,0,0.08)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={handleChange}
        placeholder={`Enter the ${LENGTH} characters above`}
        maxLength={LENGTH}
        disabled={status === 'ok'}
        style={{
          width: '100%',
          padding: '8px 14px',
          borderRadius: 22,
          border: `1.5px solid ${borderColor}`,
          background: status === 'ok' ? 'rgba(46,125,50,0.06)' : 'rgba(255,250,238,0.9)',
          color: '#3d1f00',
          fontSize: 13,
          fontFamily: "'Crimson Text', Georgia, serif",
          letterSpacing: '0.18em',
          outline: 'none',
          boxSizing: 'border-box',
          textTransform: "'uppercase', lowercase'",
          transition: 'border-color 0.2s, background 0.2s',
        }}
      />

      {status === 'error' && (
        <p style={{ margin: '3px 0 0 6px', fontSize: 10, color: '#c0392b', fontStyle: 'italic' }}>
          Characters didn't match — a new puzzle has been generated.
        </p>
      )}
    </div>
  );
}