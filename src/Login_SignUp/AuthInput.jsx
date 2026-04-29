// src/Login_SignUp/AuthInput.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FONT_SANS = "'Josefin Sans', sans-serif";
const FONT_BODY = "'Crimson Pro', Georgia, serif";

const EyeOpen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function AuthInput({ label, type = 'text', value, onChange, placeholder, error, disabled, autoComplete }) {
  const [show,    setShow]    = useState(false);
  const [focused, setFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;
  const hasError   = Boolean(error);

  return (
    <div style={{ marginBottom: 9 }}>
      {label && (
        <motion.label
          animate={{ color: hasError ? '#b03020' : '#5a2800' }}
          transition={{ duration: 0.18 }}
          style={{
            display: 'block', fontSize: 9.5, fontWeight: 700,
            fontFamily: FONT_SANS, marginBottom: 4,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'default',
          }}
        >
          {hasError ? `${label} — Invalid` : label}
        </motion.label>
      )}

      <div style={{ position: 'relative' }}>
        <motion.input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          animate={{
            borderColor: hasError ? 'rgba(176,48,32,0.75)' : focused ? '#8B0000' : 'rgba(139,70,20,0.28)',
            boxShadow: focused
              ? hasError ? '0 0 0 3px rgba(176,48,32,0.12)' : '0 0 0 3px rgba(139,0,0,0.08)'
              : '0 0 0 0px transparent',
          }}
          transition={{ duration: 0.16 }}
          style={{
            width: '100%',
            padding: isPassword ? '8px 36px 8px 13px' : '8px 13px',
            borderRadius: 20, border: '1.5px solid rgba(139,70,20,0.28)',
            background: disabled ? 'rgba(230,215,190,0.5)' : 'rgba(255,252,242,0.92)',
            color: '#2d1000', fontSize: 12.5,
            fontFamily: FONT_BODY, outline: 'none',
            boxSizing: 'border-box',
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'background 0.18s',
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1} style={{
            position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: hasError ? '#b03020' : '#8B4513',
            display: 'flex', alignItems: 'center', padding: 0, opacity: 0.72,
          }}>
            {show ? <EyeOpen /> : <EyeClosed />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {hasError && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -3, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            style={{
              margin: '3px 0 0 5px', fontSize: 10,
              fontFamily: FONT_BODY, color: '#b03020',
              fontStyle: 'italic', overflow: 'hidden',
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}