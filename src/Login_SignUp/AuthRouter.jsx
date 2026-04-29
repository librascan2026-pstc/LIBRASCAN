// src/Login_SignUp/AuthRouter.jsx
// ── Clean page transitions — no curtain overlay bug ────────────────────────────
// Uses framer-motion AnimatePresence with a smooth slide+fade.
// The PageTransition curtain is removed from AuthRouter entirely —
// it was causing the blank cream screen because the curtain stayed mounted
// while the underlying page already changed.

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage          from './LoginPage';
import SignupPage         from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage  from './ResetPasswordPage';

// Direction-aware slide variants
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

/**
 * Props:
 *   initialPage     — 'login' | 'signup' | 'forgot-password' | 'reset-password'
 *   onLoginSuccess  — called with user after captcha passes
 *   onGoLanding     — called when user clicks X/exit
 */
export default function AuthRouter({ initialPage = 'login', onLoginSuccess, onGoLanding }) {
  const [page, setPage] = useState(() => {
    if (window.location.hash.includes('type=recovery')) return 'forgot-password';
    return initialPage;
  });
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const handle = () => {
      if (window.location.hash.includes('type=recovery')) setPage('forgot-password');
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  const go = (nextPage) => {
    const currentIdx = PAGE_ORDER.indexOf(page);
    const nextIdx    = PAGE_ORDER.indexOf(nextPage);
    setDir(nextIdx >= currentIdx ? 1 : -1);
    setPage(nextPage);
  };

  const handleGoLanding = onGoLanding || (() => { window.location.href = '/'; });

  return (
    // Outer wrapper — fixed, full-screen, clips the slide animation
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