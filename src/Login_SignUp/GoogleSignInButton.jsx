import { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FONT_SANS = "'Josefin Sans', sans-serif";

// Google's own limits for a rendered button.
const GIS_MIN = 200;
const GIS_MAX = 400;

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let el = document.querySelector('script[data-gsi]');
    if (!el) {
      el = document.createElement('script');
      el.src = 'https://accounts.google.com/gsi/client';
      el.async = true;
      el.dataset.gsi = '1';
      document.head.appendChild(el);
    }
    el.addEventListener('load', resolve);
    el.addEventListener('error', reject);
  });
}

// Google gets the SHA-256 hash of the nonce; Supabase gets the raw one.
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

const GoogleG = () => (
  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
  </svg>
);

/**
 * Looks like the rest of the login form (cream pill, maroon hover, Josefin
 * caps) but the real Google button sits invisibly on top of it, so the click
 * is a genuine Google Identity Services click (required for ID tokens).
 * Re-renders on resize, so it always fills the form column (max 400px).
 */
export default function GoogleSignInButton({ onCredential, onError, disabled, loading }) {
  const wrapRef = useRef(null);
  const gisRef  = useRef(null);
  const cbRef   = useRef({ onCredential, onError });
  cbRef.current = { onCredential, onError };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer = null;
    let timer = null;
    let lastWidth = 0;

    const renderGis = () => {
      const box = gisRef.current;
      const wrap = wrapRef.current;
      if (!box || !wrap || !window.google?.accounts?.id) return;
      const width = Math.round(Math.min(GIS_MAX, Math.max(GIS_MIN, wrap.clientWidth)));
      if (width === lastWidth) return;
      lastWidth = width;
      box.innerHTML = '';
      window.google.accounts.id.renderButton(box, {
        type: 'standard', theme: 'outline', size: 'large',
        shape: 'pill', text: 'continue_with', width,
      });
    };

    (async () => {
      try {
        if (!GOOGLE_CLIENT_ID) throw new Error('Missing VITE_GOOGLE_CLIENT_ID');
        await loadGsi();
        const { raw, hashed } = await makeNonce();
        if (cancelled || !gisRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          callback: (res) => cbRef.current.onCredential(res.credential, raw),
        });
        renderGis();
        setReady(true);

        observer = new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(renderGis, 150);
        });
        observer.observe(wrapRef.current);
      } catch (err) {
        console.warn('[Login] Google init failed:', err);
        cbRef.current.onError?.('Could not load Google sign-in. Check your connection and try again.');
      }
    })();

    return () => { cancelled = true; clearTimeout(timer); observer?.disconnect(); };
  }, []);

  const off = disabled || loading;

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 2 }}>
      <style>{`
        .lm-gbtn { position: relative; width: 100%; max-width: ${GIS_MAX}px; height: 42px;
          border-radius: 22px; overflow: hidden; transition: opacity .2s; }
        .lm-gbtn-face { position: absolute; inset: 0; display: flex; align-items: center;
          justify-content: center; gap: 10px; box-sizing: border-box;
          background: #F4E6C2; border: 1.5px solid rgba(139,70,20,0.28); border-radius: 22px;
          color: #5a2800; font-family: ${FONT_SANS}; font-size: 11.5px; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase; white-space: nowrap;
          transition: border-color .16s, box-shadow .16s, background .16s; }
        .lm-gbtn:hover .lm-gbtn-face { border-color: #8B0000; background: #F8EDCD;
          box-shadow: 0 0 0 3px rgba(139,0,0,0.08); }
        .lm-gbtn-gis { position: absolute; inset: 0; display: flex; justify-content: center;
          align-items: center; opacity: 0.01; cursor: pointer; }
        .lm-gbtn-gis > div { width: 100%; }
        @media (max-width: 380px) { .lm-gbtn-face { font-size: 10.5px; letter-spacing: .06em; } }
      `}</style>
      <div
        ref={wrapRef}
        className="lm-gbtn"
        style={{ opacity: off ? 0.55 : 1, pointerEvents: off ? 'none' : 'auto' }}
      >
        <div className="lm-gbtn-face" aria-hidden="true">
          <GoogleG />
          <span>{loading ? 'Checking account…' : 'Continue with Google'}</span>
        </div>
        <div ref={gisRef} className="lm-gbtn-gis" aria-label="Continue with Google" />
        {!ready && <span style={{ position: 'absolute', inset: 0 }} />}
      </div>
    </div>
  );
}