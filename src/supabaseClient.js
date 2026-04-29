// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl         = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon        = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error(
    '[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Create a .env.local file in your project ROOT with:\n' +
    '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    '  VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n' +
    'Then restart: npm run dev'
  );
}

const url         = supabaseUrl         || 'https://placeholder.supabase.co';
const anon        = supabaseAnon        || 'placeholder-anon-key';
const serviceRole = supabaseServiceRole || anon; // falls back to anon (admin calls will fail gracefully)

// ─── Standard client (anon key) — used everywhere for normal DB queries ───────
export const supabase = createClient(url, anon, {
  auth: {
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  true,
  },
});

// ─── Admin client (service-role key) — used ONLY for auth.admin.* calls ───────
// Required for: createUser without email confirm, deleteUser, updateUserById.
// NEVER expose this client to end-users; keep it inside admin-only components.
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: {
    autoRefreshToken:   false,
    persistSession:     false,   // no session storage — this is a server-style client
    detectSessionInUrl: false,
  },
});

// ─── Admin / Librarian emails ─────────────────────────────────────────────────
// Used as a fallback check. In production rely on the `role` column in profiles.
export const ADMIN_EMAILS = [
  'admin@pampangastateu.edu.ph',
  'librarian@pampangastateu.edu.ph',
];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// ─── Profiles table schema (matches Supabase) ─────────────────────────────────
// id            uuid  PRIMARY KEY  references auth.users(id)  ← id IS the auth uid
// first_name    text
// last_name     text
// middle_name   text
// username      text
// email         text
// role          text  ('student' | 'library_manager')
// avatar_url    text
// created_at    timestamptz
// updated_at    timestamptz