// server/routes/googleAuth.js
// Mounted in app.js:  app.use('/api/auth/google', googleAuthRouter);
//
// Uses the SAME server-side service-role client as app.js (lib/supabaseAdmin.js).
// Optional env: ALLOWED_EMAIL_DOMAIN (default pampangastateu.edu.ph),
//               GOOGLE_EMPLOYEE_ROLE (default 'employee')

import express from 'express';
import { supabaseAdmin as admin } from '../lib/supabaseAdmin.js';

const router = express.Router();

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'pampangastateu.edu.ph').toLowerCase();

// Roles a user can end up with through this flow. Must match profiles.role
// values used by /api/auth/signup. NOT client-selectable: derived from email.
const ROLE_STUDENT  = 'student';
// Your DB only has 'student' and 'library_manager' today (app.js signup always
// writes 'student'). Set GOOGLE_EMPLOYEE_ROLE to whatever your portal routing
// uses for staff/employees (e.g. 'staff'), and make sure profiles.role allows it.
const ROLE_EMPLOYEE = process.env.GOOGLE_EMPLOYEE_ROLE || 'employee';

// Existing accounts with these roles are never touched by profile setup.
const PRIVILEGED_ROLES = ['super_admin', 'superadmin', 'admin', 'librarian', 'library_manager'];

// Same rules as /api/auth/signup: student numbers are 10+ digits, and the
// student's email is exactly <studentNumber>@domain. Employees: 5+ digits.
const STUDENT_NO_REGEX  = /^\d{10,}$/;
const EMPLOYEE_NO_REGEX = /^\d{5,}$/;

// ── helpers ──────────────────────────────────────────────────────────────────
const isAllowedEmail = (email) => {
  const parts = String(email || '').trim().toLowerCase().split('@');
  return parts.length === 2 && /^[a-z0-9._%+-]+$/.test(parts[0]) && parts[1] === ALLOWED_DOMAIN;
};

// Student emails are <studentNumber>@domain (same rule SignupPage uses to
// auto-generate them); everything else is an employee. The user never picks.
const accountTypeFor = (email) =>
  STUDENT_NO_REGEX.test(email.split('@')[0]) ? 'student' : 'employee';

const isProfileComplete = (p) =>
  !!p && (PRIVILEGED_ROLES.includes(p.role) ||
    (!!p.role && !!p.campus_id && !!(p.student_number || p.employee_number)));

const googleNames = (user) => {
  const m = user.user_metadata || {};
  const full = (m.full_name || m.name || '').trim().replace(/\s+/g, ' ');
  const avatarUrl = m.avatar_url || m.picture || null;

  // Handles Google names saved as "Last, First M."  (e.g. "Canlas, Danica T.")
  // -> lastName "Canlas", firstName "Danica", middleName "T."
  const commaAt = full.indexOf(',');
  if (commaAt > 0) {
    const last   = full.slice(0, commaAt).trim();
    const tokens = full.slice(commaAt + 1).trim().split(' ').filter(Boolean);
    if (last && tokens.length) {
      let middle = '';
      // A trailing single letter ("T" or "T.") is treated as the middle initial.
      if (tokens.length > 1 && /^[A-Za-z]\.?$/.test(tokens[tokens.length - 1])) {
        middle = tokens.pop();
      }
      return { firstName: tokens.join(' '), middleName: middle, lastName: last, avatarUrl };
    }
  }

  // Normal "First Last" names (unchanged behavior)
  const [first, ...rest] = full.split(/\s+/);
  return {
    firstName:  (m.given_name  || first || '').trim(),
    middleName: '',
    lastName:   (m.family_name || rest.join(' ') || '').trim(),
    avatarUrl,
  };
};

async function uniqueUsername(email) {
  const base = (email.split('@')[0].replace(/[^A-Za-z0-9_-]/g, '') || 'user').slice(0, 24);
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await admin.from('profiles').select('id').eq('username', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

// ── auth guard: verifies the JWT with Supabase + enforces the domain ─────────
async function requireGoogleUser(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ code: 'NO_TOKEN', error: 'Not signed in.' });

    const { data, error } = await admin.auth.getUser(token);
    const user = data?.user;
    if (error || !user) return res.status(401).json({ code: 'BAD_TOKEN', error: 'Session is invalid or expired.' });

    const identity = (user.identities || []).find((i) => i.provider === 'google');
    if (!identity) return res.status(403).json({ code: 'NOT_GOOGLE', error: 'This is not a Google sign-in.' });

    // Check BOTH the auth user's email and the email Google itself asserted.
    const userEmail   = String(user.email || '').toLowerCase();
    const googleEmail = String(identity.identity_data?.email || '').toLowerCase();
    const verified    = identity.identity_data?.email_verified === true;

    if (!verified || !isAllowedEmail(userEmail) || !isAllowedEmail(googleEmail) || userEmail !== googleEmail) {
      // Remove throw-away accounts that exist only because of this attempt.
      const { data: prof } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
      const onlyGoogle = (user.identities || []).every((i) => i.provider === 'google');
      if (!prof && onlyGoogle) await admin.auth.admin.deleteUser(user.id).catch(() => {});
      else await admin.auth.admin.signOut(token, 'local').catch(() => {});
      return res.status(403).json({
        code: 'DOMAIN_NOT_ALLOWED',
        error: `Only verified @${ALLOWED_DOMAIN} Google accounts can sign in.`,
      });
    }

    req.gUser = { ...user, email: userEmail };
    next();
  } catch (err) {
    console.error('[googleAuth] guard error:', err);
    res.status(500).json({ code: 'SERVER', error: 'Could not verify your Google account.' });
  }
}

// ── GET /status ──────────────────────────────────────────────────────────────
// existing     -> log in, role comes from the profiles table
// needs_profile-> first login, show the profile-completion form
router.get('/status', requireGoogleUser, async (req, res) => {
  const user = req.gUser;
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, role, campus_id, student_number, employee_number')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ code: 'DB', error: 'Could not load your profile.' });

  if (isProfileComplete(profile)) return res.json({ status: 'existing', role: profile.role });

  const names = googleNames(user);
  res.json({
    status: 'needs_profile',
    accountType: accountTypeFor(user.email),
    prefill: { email: user.email, ...names },
  });
});

// ── POST /complete-profile ───────────────────────────────────────────────────
router.post('/complete-profile', requireGoogleUser, async (req, res) => {
  const user = req.gUser;
  const b = req.body || {};
  const bad = (msg, code = 'VALIDATION') => res.status(400).json({ code, error: msg });

  // `role` in the body is IGNORED on purpose.
  const { data: existing } = await admin
    .from('profiles').select('id, role, username, campus_id, student_number, employee_number')
    .eq('id', user.id).maybeSingle();
  if (isProfileComplete(existing)) {
    return res.status(409).json({ code: 'ALREADY_COMPLETE', error: 'Profile already set up.' });
  }

  const type = accountTypeFor(user.email);
  const role = type === 'student' ? ROLE_STUDENT : ROLE_EMPLOYEE;

  const g = googleNames(user);
  const firstName = (g.firstName || String(b.firstName || '')).trim();
  const lastName  = (g.lastName  || String(b.lastName  || '')).trim();
  if (firstName.length < 2) return bad('First name is required.');
  if (lastName.length  < 2) return bad('Last name is required.');

  if (!b.campusId) return bad('Please select your campus.');
  const { data: campus } = await admin.from('campuses').select('id').eq('id', b.campusId).eq('is_active', true).maybeSingle();
  if (!campus) return bad('Invalid campus.');

  const row = {
    updated_at: new Date().toISOString(),
    id: user.id, email: user.email, first_name: firstName, last_name: lastName,
    middle_name: g.middleName || null, role, avatar_url: g.avatarUrl, campus_id: campus.id,
    student_number: null, employee_number: null,
    college_id: null, program_id: null, major_id: null, department_id: null,
  };

  if (type === 'student') {
    const sn = String(b.studentNumber || '').trim();
    if (!STUDENT_NO_REGEX.test(sn)) return bad('Student number must be at least 10 digits.');
    if (sn !== user.email.split('@')[0]) return bad('Student number must match your PSU email.');

    const { data: college } = await admin.from('colleges').select('id')
      .eq('id', b.collegeId || '').eq('campus_id', campus.id).maybeSingle();
    if (!college) return bad('Please select a valid college for your campus.');

    const { data: program } = await admin.from('programs').select('id')
      .eq('id', b.programId || '').eq('college_id', college.id).maybeSingle();
    if (!program) return bad('Please select a valid course for your college.');

    let majorId = null;
    if (b.majorId) {
      const { data: major } = await admin.from('majors').select('id')
        .eq('id', b.majorId).eq('program_id', program.id).maybeSingle();
      if (!major) return bad('Invalid major for the selected course.');
      majorId = major.id;
    } else {
      const { count } = await admin.from('majors').select('id', { count: 'exact', head: true })
        .eq('program_id', program.id);
      if (count > 0) return bad('Please select your major.');
    }

    const { data: dup } = await admin.from('profiles').select('id')
      .eq('student_number', sn).neq('id', user.id).maybeSingle();
    if (dup) return res.status(409).json({ code: 'ID_TAKEN', error: 'This Student Number is already registered.' });

    Object.assign(row, { student_number: sn, college_id: college.id, program_id: program.id, major_id: majorId });
  } else {
    const en = String(b.employeeNumber || '').trim();
    if (!EMPLOYEE_NO_REGEX.test(en)) return bad('Employee number must be at least 5 digits.');

    const { data: dept } = await admin.from('departments').select('id')
      .eq('id', b.departmentId || '').eq('campus_id', campus.id).maybeSingle();
    if (!dept) return bad('Please select a valid department for your campus.');

    const { data: dup } = await admin.from('profiles').select('id')
      .eq('employee_number', en).neq('id', user.id).maybeSingle();
    if (dup) return res.status(409).json({ code: 'ID_TAKEN', error: 'This Employee Number is already registered.' });

    Object.assign(row, { employee_number: en, department_id: dept.id });
  }

  row.username = existing?.username || (await uniqueUsername(user.email));

  const { error } = await admin.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ code: 'ID_TAKEN', error: 'That ID or username is already registered.' });
    console.error('[googleAuth] profile upsert failed:', error);
    return res.status(500).json({ code: 'DB', error: 'Could not save your profile. Please try again.' });
  }

  res.json({ status: 'existing', role });
});

export default router;