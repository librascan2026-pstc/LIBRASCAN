// Local / traditional-host entry point.
// All routes (MFA, /api/auth/signup, /api/auth/resend-verification,
// /verify-email, ...) live in app.js. On Vercel, api/index.js imports app.js
// directly, so this file is ONLY used when you run `node index.js` locally.
import app from './app.js';

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`[librascan-server] listening on http://localhost:${port}`));