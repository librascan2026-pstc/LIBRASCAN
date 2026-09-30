import { useEffect, useRef, useState, useCallback } from 'react';

// Mixed-case pools. Letters that look the same in both cases (c/C, s/S,
// v/V, w/W, x/X, z/Z, k/K, m/M, o/O, p/P, u/U) only appear in UPPERCASE, and
// look-alikes (I, l, 1, O, 0) are left out, so people never have to guess.
const UPPER  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LOWER  = 'abdefghnqrty';
const LENGTH = 6;

// true  = "aBc" and "abc" are different (real CAPTCHA behaviour)
// false = case is ignored when checking the answer
const CASE_SENSITIVE = true;

const FONT_SANS = "'Josefin Sans', sans-serif";
// Font for the typed text, so upper/lower case is easy to tell apart.
const FONT_CODE = "'Courier New', Courier, monospace";

function generateCode() {
  let code = '';
  // Keep going until the code really has both a capital and a small letter.
  while (!(/[a-z]/.test(code) && /[A-Z]/.test(code))) {
    code = '';
    for (let i = 0; i < LENGTH; i++) {
      const pool = Math.random() < 0.45 ? LOWER : UPPER;
      code += pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return code;
}

function drawCaptcha(canvas, code) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fdf6e3');
  bg.addColorStop(1, '#f5e8c5');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

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

  const charW = W / (LENGTH + 1);
  const fonts = [
    "'Courier New', monospace",
    "'Trebuchet MS', sans-serif",
    "Verdana, sans-serif",
    "Georgia, serif",
  ];

  for (let i = 0; i < code.length; i++) {
    const x = charW * (i + 0.8) + (Math.random() * 8 - 4);
    const y = H / 2 + (Math.random() * 10 - 5);
    const angle = (Math.random() * 0.5 - 0.25);
    const size = H * 0.44 + Math.random() * H * 0.14;
    const font = fonts[Math.floor(Math.random() * fonts.length)];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.shadowColor = 'rgba(80,20,0,0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

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


export default function AuthCaptcha({ onVerify, onReset }) {
  const canvasRef  = useRef(null);
  const [code, setCode]       = useState('');
  const [input, setInput]     = useState('');
  const [status, setStatus]   = useState('idle'); 

  const refresh = useCallback(() => {
    const newCode = generateCode();
    setCode(newCode);
    setInput('');
    setStatus('idle');
    onReset?.();
    setTimeout(() => {
      if (canvasRef.current) drawCaptcha(canvasRef.current, newCode);
    }, 0);
  }, [onReset]);

  useEffect(() => {
    refresh();
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.slice(0, LENGTH);
    setInput(val);
    if (val.length === LENGTH) {
      const match = CASE_SENSITIVE ? val === code : val.toLowerCase() === code.toLowerCase();
      if (match) {
        setStatus('ok');
        onVerify?.(true);
      } else {
        setStatus('error');
        onVerify?.(false);
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

  const [focused, setFocused] = useState(false);

  // Verified stays neutral (no green) — only a wrong code turns red.
  const borderColor =
    status === 'error' ? 'rgba(192,57,43,0.75)' : 'rgba(139,70,20,0.28)';
  const fieldBorder = status === 'idle' && focused ? '#8B0000' : borderColor;

  const labelColor = status === 'error' ? '#c0392b' : '#5E1119';

  const labelText =
    status === 'ok'    ? 'CAPTCHA Verified' :
    status === 'error' ? 'Incorrect — Try Again' :
    'Security Verification';

  // Code image and input share the exact same width, border and radius.
  // They now stretch to fill the whole card instead of a fixed 210px.
  const FIELD_RADIUS = 9;

  return (
    <div
      style={{
        background: 'rgba(248,238,212,0.8)',
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: 12,
        padding: 14,
        boxShadow: '0 2px 8px rgba(139,70,20,0.07)',
        fontFamily: FONT_SANS,
      }}
    >
      <style>{`
        .lm-captcha-input::placeholder {
          font-family: ${FONT_SANS}; font-size: 12px; font-weight: 400;
          letter-spacing: 0.02em; color: #9a8466;
        }
      `}</style>

      {/* Header row: status label on the left, "New code" on the right */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: labelColor,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
          }}
        >
          {labelText}
        </div>

        <button
          type="button"
          onClick={refresh}
          title="Get a new code"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', padding: '2px 0',
            color: '#8B0000', cursor: 'pointer',
            fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 700,
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          New code
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={420}
        height={64}
        style={{
          display: 'block',
          margin: '0 0 10px',
          width: '100%',
          height: 'auto',
          borderRadius: FIELD_RADIUS,
          border: `1.25px solid ${fieldBorder}`,
          boxSizing: 'border-box',
          userSelect: 'none',
          background: '#fdf6e3',
          transition: 'border-color 0.2s',
        }}
      />

      <input
        className="lm-captcha-input"
        type="text"
        value={input}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={`Type the ${LENGTH} characters`}
        maxLength={LENGTH}
        disabled={status === 'ok'}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          display: 'block',
          margin: 0,
          width: '100%',
          height: 44,
          padding: '0 14px',
          borderRadius: FIELD_RADIUS,
          border: `1.25px solid ${fieldBorder}`,
          background: 'rgba(250,242,218,0.9)',
          boxShadow: status === 'idle' && focused ? '0 0 0 2px rgba(139,0,0,0.10)' : 'none',
          color: '#5E1119',
          fontSize: 17,
          fontWeight: 700,
          fontFamily: FONT_CODE,
          letterSpacing: '0.3em',
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      />

      {status === 'error' && (
        <p style={{ margin: '8px 0 0', fontFamily: FONT_SANS, fontSize: 11, color: '#c0392b', textAlign: 'center' }}>
          Characters didn&rsquo;t match — a new puzzle has been generated.
        </p>
      )}
    </div>
  );
}