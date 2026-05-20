import { createClient } from '@supabase/supabase-js';

const supabaseUrl         = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon        = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const url  = supabaseUrl  || 'https://placeholder.supabase.co';
const anon = supabaseAnon || 'placeholder-anon-key';


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


export const ADMIN_EMAILS = [
  'admin@pampangastateu.edu.ph',
  'librarian@pampangastateu.edu.ph',
  
];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}