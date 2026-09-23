import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabaseAdmin] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — ' +
    'copy server/.env.example to server/.env and fill them in.'
  );
}

// Service-role client — bypasses RLS. Used ONLY here on the server, never
// sent to the browser. This is the same pattern your existing
// src/supabaseClient.js already uses for admin operations.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
