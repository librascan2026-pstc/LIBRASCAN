import { useState, useEffect, useRef } from 'react';
import { confirmLoginDevice, pingLoginConfirmationWaiters } from '../utils/mfaClient';

// LibraScan - public landing page for the "Yes, it's me" / "No, secure my
// account" email buttons (/confirm-login?token=...&action=yes|no).
// Confirms/denies automatically on load, then shows the result. No auth
// guard: the email may be opened on a different device than the login tab.
const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@600&display=swap');";

const S = (p, v) => '<svg viewBox="' + (v || '0 0 24 24') + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const ICONS = {
  head:'<svg class="ls-hbg" viewBox="0 0 460 76" preserveAspectRatio="none" aria-hidden="true"><path d="M300 0Q420 8 460 60V0z" fill="#fff" fill-opacity=".07"/><path d="M0 76V70H290Q400 68 460 52V76z" fill="#FFFDF8"/><path d="M290 70Q400 68 460 52" fill="none" stroke="#C9A84C" stroke-width="1.5"/></svg>',
  book:S('<path d="M16 5c-3-2.5-8-3-13-2v17c5-1 10-.5 13 2 3-2.5 8-3 13-2V3c-5-1-10-.5-13 2z"/><path d="M16 5v17"/>','0 0 32 24'),
  laptop:S('<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/>'),
  pin:S('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  arrow:S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  check:'<svg viewBox="0 0 160 100" aria-hidden="true"><circle cx="80" cy="50" r="42" fill="#E1F0E4"/><path d="M62 51l12 12 24-26" fill="none" stroke="#2E8B57" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><g stroke="#9CC9AB" stroke-width="2.5" stroke-linecap="round"><path d="M20 50h9M28 26l7 6M28 74l7-6M140 50h-9M132 26l-7 6M132 74l-7-6"/></g></svg>',
  shield:S('<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>'),
  clock:S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  info:S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  spin:'<span class="ls-spin"></span>'
};
const STATES = {
  checking:{tone:'wait',icon:'spin',title:'Confirming your sign-in\u2026',body:()=>'This only takes a moment.'},
  confirmed:{tone:'ok',icon:'check',title:'Sign-in confirmed',body:n=>'Thanks'+(n?', '+n:'')+'. Go back to the LibraScan login tab \u2014 it will sign you in within a few seconds. You can close this tab.'},
  denied:{tone:'bad',icon:'shield',title:'Sign-in blocked',body:n=>'Good call'+(n?', '+n:'')+'. That attempt was rejected and every trusted device on your account was removed.',note:'Change your password now to keep your account safe.',cta:'forgot',ctaLabel:'Change my password'},
  expired:{tone:'warn',icon:'clock',title:'This link has expired',body:()=>'This confirmation link is no longer valid. If you still need to sign in, go back to the login page to get a new one.',cta:'login',ctaLabel:'Back to login'},
  invalid:{tone:'warn',icon:'info',title:'Link not valid',body:()=>'We couldn\u2019t match this link to a pending sign-in. It may already have been used.',cta:'login',ctaLabel:'Back to login'},
  error:{tone:'warn',icon:'info',title:'Something went wrong',body:()=>'We couldn\u2019t reach the server. Please open the link again in a moment.',cta:'login',ctaLabel:'Back to login'}
};
const FOOT = 'Part of LibraScan\u2019s two-step sign-in. We will never ask for your password here.';

const CSS = `
:root{--mar:#7A1A24;--mar-d:#5E1119;--gold:#C9A84C;--ink:#4A1A1E;--txt:#6B6460;--line:#EADFC8}
*{box-sizing:border-box}
.ls-page{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;background:linear-gradient(160deg,#FFFCF5,#F7EEDD);font-family:'Inter',system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:var(--ink)}
.ls-card{position:relative;z-index:1;width:100%;max-width:460px;overflow:hidden;background:linear-gradient(180deg,#FFFDF8,#FBF5EA);border:1px solid var(--line);border-radius:28px;box-shadow:0 18px 50px rgba(90,40,20,.14)}
.ls-head{position:relative;height:76px;display:flex;align-items:center;padding:0 30px;background:linear-gradient(120deg,#7E1C26,#561017)}
.ls-hbg{position:absolute;inset:0;width:100%;height:100%}
.ls-brand{position:relative;display:flex;align-items:center;gap:14px;font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:#F3E6CF}
.ls-book{display:flex;width:34px;color:#E3C77A}
.ls-logo{display:block;height:34px;width:auto}
.ls-bar{width:1px;height:24px;background:var(--gold)}
.ls-body{position:relative;padding:26px 30px 24px;text-align:center}
.ls-ic{width:84px;height:84px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#F3E1DC;color:var(--mar)}
.ls-ic svg{width:38px;height:38px}
.ls-ok .ls-ic{width:160px;height:100px;margin-bottom:6px;border-radius:0;background:none}
.ls-ok .ls-ic svg{width:100%;height:100%}
.ls-warn .ls-ic{background:#FFF0D6;color:#9A5B00}
.ls-card h1{font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.2;font-weight:600;color:var(--ink);margin:0 0 12px}
.ls-card p{font-size:15.5px;line-height:1.6;color:var(--txt);margin:0}
.ls-meta{margin:22px 0 0;padding:4px 20px;text-align:left;background:#FBF6EC;border:1px solid var(--line);border-radius:16px}
.ls-meta div{display:grid;grid-template-columns:28px 104px 1fr;align-items:center;padding:13px 0;border-bottom:1px solid var(--line);font-size:15px}
.ls-meta div:last-child{border:0}
.ls-meta i{display:flex;width:20px;color:var(--mar)}
.ls-meta i svg{width:20px;height:20px}
.ls-meta dt{color:#7A726C}
.ls-meta dd{margin:0;font-weight:600;color:#2E2321}
.ls-note{margin-top:16px;padding:12px 14px;border-radius:12px;background:#FBEAEA;color:var(--mar);font-size:14.5px;font-weight:600}
.ls-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:54px;margin-top:22px;border:0;border-radius:14px;background:linear-gradient(180deg,#8A1E28,#651119);color:#fff;font:600 16px 'Inter',system-ui,sans-serif;text-decoration:none;cursor:pointer;box-shadow:0 4px 12px rgba(122,26,36,.25)}
.ls-btn svg{width:18px;height:18px}
.ls-btn:focus-visible{outline:3px solid var(--gold);outline-offset:3px}
.ls-div{display:flex;align-items:center;gap:14px;margin:26px 0 14px;color:var(--gold)}
.ls-div span{flex:1;height:1px;background:var(--line)}
.ls-div b{display:flex;width:24px}
.ls-foot{position:relative;font-size:12px!important;color:#8C837C!important}
.ls-spin{width:32px;height:32px;border-radius:50%;border:3px solid rgba(122,26,36,.2);border-top-color:var(--mar);animation:ls-r .8s linear infinite}
@keyframes ls-r{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.ls-spin{animation:none}}
@media (max-width:420px){.ls-body{padding:22px 20px 20px}.ls-card h1{font-size:25px}}
`;

export default function ConfirmLoginPage({ onGoForgot, onGoLogin }) {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const action = params.get('action');
  const valid  = !!token && (action === 'yes' || action === 'no');

  const [state, setState] = useState(valid ? 'checking' : 'invalid');
  const [info, setInfo]   = useState({ firstName: '', device: '', location: '' });
  const fired = useRef(false); // token is single-use: block StrictMode double-firee

  useEffect(() => {
    if (!valid || fired.current) return;
    fired.current = true;
    (async () => {
      try {
        const res = await confirmLoginDevice(token, action);
        setInfo({ firstName: res.firstName || '', device: res.device || '', location: res.location || '' });
        setState(['confirmed', 'denied', 'expired'].includes(res.status) ? res.status : 'invalid');
        pingLoginConfirmationWaiters();
      } catch { setState('error'); }
    })();
  }, [valid, token, action]);

  const s  = STATES[state];
  const go = s.cta === 'forgot' ? onGoForgot : onGoLogin;
  const showMeta = state !== 'checking' && state !== 'error' && (info.device || info.location);
  const html = (h) => ({ __html: h });

  return (
    <div className="ls-page">
      <style>{FONTS + CSS}</style>
      <main className="ls-card">
        <header className="ls-head">
          <span dangerouslySetInnerHTML={html(ICONS.head)} />
          <div className="ls-brand"><img className="ls-logo" src="/LibraryLogo.png" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><i className="ls-bar" />LibraScan</div>
        </header>
        <div className={`ls-body ls-${s.tone}`} aria-live="polite" aria-busy={state === 'checking'}>
          <div className="ls-ic" dangerouslySetInnerHTML={html(ICONS[s.icon])} />
          <h1>{s.title}</h1>
          <p>{s.body(info.firstName)}</p>
          {showMeta && (
            <dl className="ls-meta">
              <div><i dangerouslySetInnerHTML={html(ICONS.laptop)} /><dt>Device</dt><dd>{info.device || 'Unknown device'}</dd></div>
              <div><i dangerouslySetInnerHTML={html(ICONS.pin)} /><dt>Location</dt><dd>{info.location || 'Unknown location'}</dd></div>
            </dl>
          )}
          {s.note && <div className="ls-note">{s.note}</div>}
          {s.cta && go && <button type="button" className="ls-btn" onClick={go}>{s.ctaLabel}<span dangerouslySetInnerHTML={html(ICONS.arrow)} /></button>}
          <div className="ls-div"><span /><b dangerouslySetInnerHTML={html(ICONS.book)} /><span /></div>
          <p className="ls-foot">{FOOT}</p>
        </div>
      </main>
    </div>
  );
}