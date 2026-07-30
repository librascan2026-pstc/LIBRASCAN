import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage          from './LoginPage';
import SignupPage         from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage  from './ResetPasswordPage';

const variants = {
  enter: (dir) => ({
    opacity: 0,
    x: dir > 0 ? 32 : -32,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (dir) => ({
    opacity: 0,
    x: dir > 0 ? -32 : 32,
  }),
};

const PAGE_ORDER = ['login', 'signup', 'forgot-password', 'reset-password'];

// URL <-> page mapping, same pattern as SuperAdminLayout: gives each auth
// screen a real, addressable, bookmarkable/back-buttonable browser URL
// (/login, /signup, /forgot-password, /reset-password) via the native
// History API — no router dependency required.
const PATH_BY_PAGE = {
  'login':            '/login',
  'signup':           '/signup',
  'forgot-password':  '/forgot-password',
  'reset-password':   '/reset-password',
};
const PAGE_BY_PATH = Object.fromEntries(
  Object.entries(PATH_BY_PAGE).map(([key, path]) => [path, key])
);

function pageFromCurrentPath(fallback) {
  return PAGE_BY_PATH[window.location.pathname] || fallback;
}

export default function AuthRouter({ initialPage = 'login', onLoginSuccess, onGoLanding }) {
  const [page, setPage] = useState(() => {
    if (window.location.hash.includes('type=recovery')) return 'forgot-password';
    return pageFromCurrentPath(initialPage);
  });
  const [dir, setDir] = useState(1);

  // Normalize the address bar to match whichever auth screen is showing if
  // we landed on an unmapped path (e.g. the parent just switched into auth
  // mode from "/").
  useEffect(() => {
    const targetPath = PATH_BY_PAGE[page];
    if (targetPath && window.location.pathname !== targetPath) {
      window.history.replaceState({ page }, '', targetPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = () => {
      if (window.location.hash.includes('type=recovery')) { setPage('forgot-password'); return; }
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  // Keep the screen in sync with browser Back/Forward navigation between
  // /login, /signup, /forgot-password and /reset-password.
  useEffect(() => {
    const onPopState = () => {
      const next = pageFromCurrentPath(null);
      if (next) {
        const currentIdx = PAGE_ORDER.indexOf(page);
        const nextIdx    = PAGE_ORDER.indexOf(next);
        setDir(nextIdx >= currentIdx ? 1 : -1);
        setPage(next);
      } else {
        // Navigated back past the first auth screen (e.g. to "/") — hand
        // control back to whatever the parent renders for that URL.
        onGoLanding?.();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Use this instead of setPage() wherever the screen changes, so the URL
  // always stays in sync with what's on screen.
  const go = (nextPage) => {
    const currentIdx = PAGE_ORDER.indexOf(page);
    const nextIdx    = PAGE_ORDER.indexOf(nextPage);
    setDir(nextIdx >= currentIdx ? 1 : -1);
    const targetPath = PATH_BY_PAGE[nextPage];
    if (targetPath && window.location.pathname !== targetPath) {
      window.history.pushState({ page: nextPage }, '', targetPath);
    }
    setPage(nextPage);
  };

  const handleGoLanding = onGoLanding || (() => { window.location.href = '/'; });

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={page}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.32, 0, 0.18, 1] }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {page === 'login' && (
            <LoginPage
              onGoSignup={() => go('signup')}
              onGoForgot={() => go('forgot-password')}
              onLoginSuccess={onLoginSuccess}
              onGoLanding={handleGoLanding}
            />
          )}
          {page === 'signup' && (
            <SignupPage
              onGoLogin={() => go('login')}
              onGoLanding={handleGoLanding}
            />
          )}
          {page === 'forgot-password' && (
            <ForgotPasswordPage
              onGoLogin={() => go('login')}
              onGoLanding={handleGoLanding}
            />
          )}
          {page === 'reset-password' && (
            <ResetPasswordPage
              onGoLogin={() => go('login')}
              onResetSuccess={() => go('login')}
              onGoLanding={handleGoLanding}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}