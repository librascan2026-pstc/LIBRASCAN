import crypto from 'crypto';

const HASH_SECRET = process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'librascan-fallback-secret';

/** A random 6-digit code as a zero-padded string, e.g. "042917". */
export function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

/** Salted HMAC of the code — this is what actually gets stored, never the raw code. */
export function hashOtp(code) {
  return crypto.createHmac('sha256', HASH_SECRET).update(code).digest('hex');
}

/** A long random token for "trust this device". */
export function generateDeviceToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Plain SHA-256 of the device token, for the same never-store-the-raw-secret reason. */
export function hashDeviceToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Constant-time string compare, to avoid timing attacks on hash comparisons. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
