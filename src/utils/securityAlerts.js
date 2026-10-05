
import { supabase } from '../supabaseClient';

const TABLE = 'security_alerts';

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;


export function describeThisDevice() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  let browser = 'Unknown browser';
  if (/Edg\//i.test(ua))                          browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua))               browser = 'Opera';
  else if (/Firefox\//i.test(ua))                 browser = 'Firefox';
  else if (/Chrome\/|CriOS\//i.test(ua))          browser = 'Chrome';
  else if (/Safari\//i.test(ua))                  browser = 'Safari';

  let os = 'Unknown device';
  if (/Windows/i.test(ua))                        os = 'Windows';
  else if (/Android/i.test(ua))                   os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua))          os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua))        os = 'macOS';
  else if (/CrOS/i.test(ua))                      os = 'ChromeOS';
  else if (/Linux/i.test(ua))                     os = 'Linux';

  return `${browser} on ${os}`;
}


export async function recordUntrustedLoginAlert(userId) {
  if (!userId) return;
  try {
    const device = describeThisDevice();

    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: recent, error: recentErr } = await supabase
      .from(TABLE)
      .select('id')
      .eq('user_id', userId)
      .eq('device', device)
      .gte('created_at', since)
      .limit(1);
    if (!recentErr && recent && recent.length) return;

    const { error } = await supabase.from(TABLE).insert({
      user_id:    userId,
      device,
      user_agent: (navigator.userAgent || '').slice(0, 300),
    });
    if (error) throw error;
  } catch (err) {
    console.warn('[securityAlerts] could not record sign-in alert:', err?.message || err);
  }
}


export async function fetchSecurityAlerts(userId, limit = 100) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, device, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[securityAlerts] fetch error:', error.message);
    return null;
  }
  return data || [];
}


export function securityAlertMessage(row) {
  const device = row?.device || 'an unknown device';
  return `A sign-in to your account was attempted from an unrecognized device (${device}). If this wasn't you, change your password right away.`;
}