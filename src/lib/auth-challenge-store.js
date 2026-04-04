import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { signValue } from "@/lib/auth-crypto";
import { getDatabase, parseJson, serializeJson, withTransaction } from "@/lib/database";

const defaultChallengeLifetimes = {
  "email-verification": 1000 * 60 * 60 * 24,
  "account-unlock": 1000 * 60 * 60 * 8,
};

function getAuthChallengeSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }

  return "church-care-os-dev-auth-challenge-secret";
}

function hashChallengeToken(token) {
  return signValue(`auth-challenge:${token}`, getAuthChallengeSecret());
}

function mapChallengeRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    purpose: row.purpose,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at || "",
    metadata: parseJson(row.metadata_json, {}),
    user: {
      id: row.account_id || row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      active: row.active === 1,
      emailVerifiedAt: row.email_verified_at || "",
      organizationId: row.organization_id || "",
      branchId: row.branch_id || "",
      memberType: row.member_type || "member",
      gender: row.gender || "unspecified",
      birthday: row.birthday || "",
    },
  };
}

function readChallengeRow(token, purpose = "") {
  if (!token) {
    return null;
  }

  const tokenHash = hashChallengeToken(token);
  const purposeClause = purpose ? "AND challenges.purpose = ?" : "";

  return getDatabase()
    .prepare(`
      SELECT
        challenges.id,
        challenges.user_id,
        challenges.purpose,
        challenges.created_at,
        challenges.expires_at,
        challenges.consumed_at,
        challenges.metadata_json,
        users.id AS account_id,
        users.name,
        users.email,
        users.role,
        users.active,
        users.email_verified_at,
        users.organization_id,
        users.branch_id,
        users.member_type,
        users.gender,
        users.birthday
      FROM auth_challenges AS challenges
      INNER JOIN users ON users.id = challenges.user_id
      WHERE challenges.token_hash = ?
      ${purposeClause}
      LIMIT 1
    `)
    .get(...(purpose ? [tokenHash, purpose] : [tokenHash]));
}

export function issueAuthChallengeEntry(input) {
  const userId = String(input.userId || "").trim();
  const purpose = String(input.purpose || "").trim();

  if (!userId || !purpose) {
    throw new Error("A user and challenge purpose are required.");
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const ttlMs = input.ttlMs || defaultChallengeLifetimes[purpose] || 1000 * 60 * 60;
  const expiresAt = new Date(now.valueOf() + ttlMs).toISOString();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashChallengeToken(token);

  withTransaction((db) => {
    db.prepare(`
      DELETE FROM auth_challenges
      WHERE user_id = ?
        AND purpose = ?
        AND consumed_at IS NULL
    `).run(userId, purpose);

    db.prepare(`
      INSERT INTO auth_challenges (
        id,
        user_id,
        purpose,
        token_hash,
        metadata_json,
        created_at,
        expires_at,
        consumed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      userId,
      purpose,
      tokenHash,
      serializeJson(input.metadata || {}),
      createdAt,
      expiresAt,
      null
    );
  });

  return {
    token,
    expiresAt,
    createdAt,
  };
}

export function getAuthChallengeEntry(token, purpose = "") {
  const row = readChallengeRow(token, purpose);

  if (!row) {
    return {
      status: "invalid",
      challenge: null,
    };
  }

  if (row.consumed_at) {
    return {
      status: "used",
      challenge: mapChallengeRow(row),
    };
  }

  if (new Date(row.expires_at).valueOf() <= Date.now()) {
    return {
      status: "expired",
      challenge: mapChallengeRow(row),
    };
  }

  return {
    status: "valid",
    challenge: mapChallengeRow(row),
  };
}

export function consumeAuthChallengeEntry(token, purpose = "") {
  const state = getAuthChallengeEntry(token, purpose);

  if (state.status === "used") {
    throw new Error("This link has already been used.");
  }

  if (state.status === "expired") {
    throw new Error("This link has expired.");
  }

  if (state.status !== "valid" || !state.challenge) {
    throw new Error("This link is not valid.");
  }

  const consumedAt = new Date().toISOString();

  getDatabase()
    .prepare(`
      UPDATE auth_challenges
      SET consumed_at = ?
      WHERE id = ?
    `)
    .run(consumedAt, state.challenge.id);

  return {
    ...state.challenge,
    consumedAt,
  };
}
