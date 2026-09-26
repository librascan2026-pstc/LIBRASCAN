// This is the file Vercel actually runs. Everything under /api/ becomes a
// serverless function — Vercel's Node runtime accepts an Express app
// directly as the default export (an Express app is just a function with
// the (req, res) signature Vercel expects), so this file is only a thin
// pass-through to the real app logic in ../app.js.
import app from '../app.js';

export default app;