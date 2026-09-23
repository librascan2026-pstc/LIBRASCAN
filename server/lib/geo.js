// ============================================================================
// LibraScan — best-effort IP -> "City, Region, Country" lookup.
//
// Uses ip-api.com's free JSON endpoint (no API key, no signup, generous
// enough rate limit for a library's login volume: 45 requests/minute). If
// you outgrow that or want HTTPS to the geo provider itself, swap the fetch
// URL below for a paid/keyed provider (ipinfo.io, ipapi.co, MaxMind, etc.) —
// everything that calls locateIp() just consumes { city, region, country }.
// ============================================================================

const FIELDS = 'status,message,city,regionName,country,query';

/** True for loopback/private ranges — geolocation is meaningless for these. */
function isLocalIp(ip) {
  if (!ip) return true;
  const v = ip.replace('::ffff:', '');
  return (
    v === '::1' ||
    v === '127.0.0.1' ||
    v.startsWith('10.') ||
    v.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(v)
  );
}

/**
 * Resolves an IP to { city, region, country, ip }. Never throws — on any
 * failure (offline, rate-limited, private IP, etc.) it resolves to nulls so
 * callers can always render "Unknown location" instead of breaking the
 * request that needed it (a login, or the sessions list).
 */
export async function locateIp(ip) {
  const clean = (ip || '').replace('::ffff:', '');
  if (isLocalIp(clean)) {
    return { ip: clean || null, city: null, region: null, country: null, label: 'Local network' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(clean)}?fields=${FIELDS}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = await res.json();
    if (json.status !== 'success') {
      return { ip: clean, city: null, region: null, country: null, label: 'Unknown location' };
    }
    const label = [json.city, json.regionName, json.country].filter(Boolean).join(', ') || 'Unknown location';
    return { ip: clean, city: json.city || null, region: json.regionName || null, country: json.country || null, label };
  } catch (err) {
    console.warn('[geo] lookup failed:', err.message);
    return { ip: clean, city: null, region: null, country: null, label: 'Unknown location' };
  }
}

/** Turns a User-Agent string into a short "Chrome on Windows" style label. */
export function describeDevice(userAgent) {
  const ua = userAgent || '';
  let browser = 'Unknown browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  let os = 'Unknown device';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
}

export function isMobileUA(userAgent) {
  return /iphone|ipad|android|mobile/i.test(userAgent || '');
}

/** Same "City, Region, Country" join used internally by locateIp(), exposed for rows already stored (e.g. login_confirmations) instead of re-hitting the geo API. */
export function formatLocation({ city, region, country } = {}) {
  return [city, region, country].filter(Boolean).join(', ') || 'Unknown location';
}