import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, signValue } from "@/lib/auth-crypto";
import { getDatabase, withTransaction } from "@/lib/database";

const resetLinkLifetimeMs = 1000 * 60 * 60;

function getPasswordResetSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }

  return "church-care-os-dev-reset-secret";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hashResetToken(token) {
  return signValue(`password-reset:${token}`, getPasswordResetSecret());
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.account_id || row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
  };
}

function readTokenRow(token) {
  if (!token) {
    return null;
  }

  return getDatabase()
    .prepare(`
      SELECT
        tokens.id,
        tokens.user_id,
        tokens.requested_at,
        tokens.expires_at,
        tokens.consumed_at,
        users.id AS account_id,
        users.name,
        users.email,
        users.role,
        users.active
      FROM password_reset_tokens AS tokens
      INNER JOIN users ON users.id = tokens.user_id
      WHERE tokens.token_hash = ?
      LIMIT 1
    `)
    .get(hashResetToken(token));
}

export function createPasswordResetTokenEntry(email, options = {}) {
  const user = getDatabase()
    .prepare(`
      SELECT id, name, email, role, active
      FROM users
      WHERE email = ?
      LIMIT 1
    `)
    .get(normalizeEmail(email));

  if (!user || user.active !== 1) {
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const requestedAt = now.toISOString();
  const expiresAt = new Date(
    now.valueOf() + (options.ttlMs ?? resetLinkLifetimeMs)
  ).toISOString();

  withTransaction((db) => {
    db.prepare(`
      DELETE FROM password_reset_tokens
      WHERE user_id = ?
    `).run(user.id);

    db.prepare(`
      INSERT INTO password_reset_tokens (
        id,
        user_id,
        token_hash,
        requested_at,
        expires_at,
        consumed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      user.id,
      hashResetToken(token),
      requestedAt,
      expiresAt,
      null
    );
  });

  return {
    token,
    expiresAt,
    user: mapUser(user),
  };
}

export function getPasswordResetTokenEntry(token) {
  const row = readTokenRow(token);

  if (!row) {
    return {
      status: "invalid",
      user: null,
      expiresAt: "",
      requestedAt: "",
    };
  }

  if (row.consumed_at) {
    return {
      status: "used",
      user: mapUser(row),
      expiresAt: row.expires_at,
      requestedAt: row.requested_at,
    };
  }

  if (new Date(row.expires_at).valueOf() <= Date.now()) {
    return {
      status: "expired",
      user: mapUser(row),
      expiresAt: row.expires_at,
      requestedAt: row.requested_at,
    };
  }

  return {
    status: "valid",
    user: mapUser(row),
    expiresAt: row.expires_at,
    requestedAt: row.requested_at,
  };
}

export function consumePasswordResetTokenEntry(token, password) {
  const tokenState = getPasswordResetTokenEntry(token);

  if (tokenState.status === "used") {
    throw new Error("This reset link has already been used.");
  }

  if (tokenState.status === "expired") {
    throw new Error("This reset link has expired.");
  }

  if (tokenState.status !== "valid" || !tokenState.user) {
    throw new Error("This reset link is not valid.");
  }

  const tokenHash = hashResetToken(token);
  const now = new Date().toISOString();

  withTransaction((db) => {
    db.prepare(`
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
    `).run(hashPassword(password), tokenState.user.id);

    db.prepare(`
      UPDATE password_reset_tokens
      SET consumed_at = ?
      WHERE token_hash = ?
    `).run(now, tokenHash);

    db.prepare(`
      DELETE FROM password_reset_tokens
      WHERE user_id = ? AND token_hash != ?
    `).run(tokenState.user.id, tokenHash);
  });

  return {
    ...tokenState.user,
    consumedAt: now,
  };
}

export function invalidatePasswordResetTokensForUser(userId) {
  if (!userId) {
    return;
  }

  getDatabase()
    .prepare(`
      DELETE FROM password_reset_tokens
      WHERE user_id = ?
    `)
    .run(userId);
}
