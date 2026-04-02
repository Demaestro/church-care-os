import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { safeEqualValue } from "@/lib/auth-crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TIME_STEP_SECONDS = 30;
const DIGITS = 6;

function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(secret) {
  const normalized = String(secret || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      continue;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function formatCounter(counter) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

function normalizeCode(code) {
  return String(code || "").replace(/[^\d]/g, "").slice(0, DIGITS);
}

export function generateTotpSecret(length = 20) {
  return encodeBase32(randomBytes(length));
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = createHash("sha256")
      .update(randomBytes(16))
      .digest("base64url")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 10);

    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}

export function hashBackupCode(code) {
  return createHash("sha256")
    .update(String(code || "").trim().toUpperCase())
    .digest("hex");
}

export function generateTotpCode(secret, now = Date.now()) {
  const counter = Math.floor(now / 1000 / TIME_STEP_SECONDS);
  const key = decodeBase32(secret);
  const hmac = createHmac("sha1", key).update(formatCounter(counter)).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function verifyTotpCode(secret, code, window = 1, now = Date.now()) {
  const normalized = normalizeCode(code);
  if (!secret || normalized.length !== DIGITS) {
    return false;
  }

  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = generateTotpCode(
      secret,
      now + offset * TIME_STEP_SECONDS * 1000
    );
    if (safeEqualValue(candidate, normalized)) {
      return true;
    }
  }

  return false;
}

export function buildTotpProvisioningUri({
  secret,
  accountName,
  issuer = "Church Care OS",
}) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const issuerQuery = encodeURIComponent(issuer);
  const secretQuery = encodeURIComponent(secret);
  return `otpauth://totp/${label}?secret=${secretQuery}&issuer=${issuerQuery}&algorithm=SHA1&digits=${DIGITS}&period=${TIME_STEP_SECONDS}`;
}

export function consumeBackupCode(backupCodeHashes, code) {
  const codeHash = hashBackupCode(code);
  const nextHashes = (backupCodeHashes || []).filter((hash) => hash !== codeHash);

  return {
    matched: nextHashes.length !== (backupCodeHashes || []).length,
    nextHashes,
  };
}
