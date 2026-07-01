import { createClient } from '@supabase/supabase-js';

const supabaseUrl         = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon        = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const url  = supabaseUrl  || 'https://placeholder.supabase.co';
const anon = supabaseAnon || 'placeholder-anon-key';

// Standard anon client — RLS is enforced for all user-facing queries
export const supabase = createClient(url, anon, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
  },
});

if (!supabaseServiceRole) {
  console.warn(
    '[supabaseClient] VITE_SUPABASE_SERVICE_ROLE_KEY is missing!\n' +
    'Add it to your .env.local:\n' +
    '  VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...\n' +
    'Find it in: Supabase → Project Settings → API → service_role key\n' +
    'Then restart: npm run dev'
  );
}

// Service-role admin client — bypasses RLS
// Used only for: profile fetching at login, Super Admin operations,
// creating librarian accounts, cross-campus queries
export const supabaseAdmin = createClient(url, supabaseServiceRole || anon, {
  auth: {
    autoRefreshToken:   false,
    persistSession:     false,
    detectSessionInUrl: false,
  },
  global: {
    headers: supabaseServiceRole
      ? { Authorization: `Bearer ${supabaseServiceRole}` }
      : {},
  },
});

// DEPRECATED — role detection is now fully DB-driven via profiles.role
// Kept only so existing import statements don't break during migration.
// isAdminEmail always returns false — remove usages when convenient.
export const ADMIN_EMAILS = [];
export function isAdminEmail(_email) {
  return false;
}