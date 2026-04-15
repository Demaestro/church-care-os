/**
 * Device Fingerprinting for Session Security
 *
 * On unstable 3G networks in Nigeria, IP addresses can rotate mid-session
 * (MTN, Airtel, etc. reassign IPs frequently). Pinning sessions to IP would
 * log members out constantly. Instead we pin to a "device fingerprint" derived
 * from stable browser characteristics (User-Agent + Accept headers).
 *
 * This is not a perfect fingerprint, but it:
 *   - Survives IP rotation → no forced logouts on 3G
 *   - Detects entirely new devices/browsers → triggers security notification
 *   - Costs zero external service calls
 *
 * The fingerprint is stored as a short HMAC-SHA256 hex string (16 bytes = 32 hex
 * chars) so it's cheap to store and compare.
 */

import "server-only";

import { createHmac, createHash } from "node:crypto";
import { headers } from "next/headers";

// Use CARE_ENCRYPTION_KEY as the HMAC secret so fingerprints are scoped to
// this deployment (a leaked DB can't be replayed against a different server).
function getHmacSecret() {
  return process.env.CARE_ENCRYPTION_KEY || "church-os-fp-dev-2026";
}

/**
 * Compute a device fingerprint from the current request headers.
 * Call this inside a Server Action or Route Handler where `headers()` is available.
 *
 * Returns a 32-char lowercase hex string.
 */
export async function computeDeviceFingerprint() {
  const headerList = await headers();

  const ua       = headerList.get("user-agent")       || "unknown";
  const accept   = headerList.get("accept")            || "unknown";
  const lang     = headerList.get("accept-language")   || "unknown";
  const encoding = headerList.get("accept-encoding")   || "unknown";

  // Stable components only — no IP, no session token, no timestamp
  const raw = `ua:${ua}|accept:${accept}|lang:${lang}|enc:${encoding}`;

  return createHmac("sha256", getHmacSecret())
    .update(raw)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Compare two fingerprints in constant time to prevent timing attacks.
 */
export function fingerprintMatches(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  // Use a hash comparison so timing is O(hash) not O(string-length)
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return ha.compare(hb) === 0;
}
