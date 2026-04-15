/**
 * Field-Level AES-256-GCM Encryption
 *
 * Protects highly sensitive pastoral content (counseling notes, confession
 * summaries, domestic-situation details) at the column level. Even if the
 * SQLite file is extracted, these fields read as opaque ciphertext.
 *
 * Configuration:
 *   CARE_ENCRYPTION_KEY — 32-byte (64 hex chars) or base64-encoded secret.
 *   If missing, the module falls back to a dev-only key with a console warning.
 *   Set a strong value in production via environment variables.
 *
 * Storage format (stored as a single string in the DB column):
 *   "v1:{iv_base64}:{ciphertext_base64}:{authTag_base64}"
 *
 * Versioning prefix ("v1:") allows future algorithm rotation without breaking
 * existing data — you can detect old format and decrypt with the old key.
 */

import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION_PREFIX = "v1:";
const DEV_KEY_WARNING_SHOWN = new Set();

function resolveKey() {
  const raw = process.env.CARE_ENCRYPTION_KEY;

  if (!raw) {
    if (!DEV_KEY_WARNING_SHOWN.has("missing")) {
      DEV_KEY_WARNING_SHOWN.add("missing");
      console.warn(
        "[field-encryption] CARE_ENCRYPTION_KEY is not set. " +
        "Using a deterministic dev-only key. Set this in production!"
      );
    }
    // Deterministic dev fallback derived from the app name — never use in prod
    return createHash("sha256").update("church-os-dev-key-2026").digest();
  }

  // Accept 64-char hex or base64-encoded 32-byte key
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;

  // Derive 32 bytes from any other string via SHA-256
  return createHash("sha256").update(raw).digest();
}

/**
 * Encrypt a plaintext string.
 * Returns the versioned ciphertext string to store in the database.
 * Returns null/undefined unchanged so nullable columns stay nullable.
 */
export function encrypt(plaintext) {
  if (plaintext == null || plaintext === "") return plaintext;
  if (typeof plaintext !== "string") {
    throw new TypeError("encrypt() expects a string");
  }

  const key = resolveKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return (
    VERSION_PREFIX +
    iv.toString("base64") + ":" +
    ciphertext.toString("base64") + ":" +
    authTag.toString("base64")
  );
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * Returns the original plaintext.
 * Returns null/undefined/non-encrypted strings unchanged (graceful degradation
 * for columns that were unencrypted before migration).
 */
export function decrypt(ciphertext) {
  if (ciphertext == null || ciphertext === "") return ciphertext;
  if (typeof ciphertext !== "string") return ciphertext;

  // Passthrough for legacy unencrypted values (before field encryption was added)
  if (!ciphertext.startsWith(VERSION_PREFIX)) {
    return ciphertext;
  }

  try {
    const [, ivB64, dataB64, tagB64] = ciphertext.split(":");
    const key = resolveKey();
    const iv = Buffer.from(ivB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(data) + decipher.final("utf8");
  } catch {
    // Decryption failure — return a sentinel rather than crashing the whole page
    return "[encrypted — decryption failed]";
  }
}

/**
 * Convenience: encrypt only if value is a non-empty string, else return as-is.
 */
export function encryptIfPresent(value) {
  return value ? encrypt(String(value)) : value;
}

/**
 * Convenience: decrypt only if value looks like our ciphertext format.
 */
export function decryptIfPresent(value) {
  if (typeof value === "string" && value.startsWith(VERSION_PREFIX)) {
    return decrypt(value);
  }
  return value;
}

/**
 * Check whether a stored value is encrypted with our scheme.
 */
export function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(VERSION_PREFIX);
}
