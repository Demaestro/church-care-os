import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/database";
import { shouldUseSecureTransport } from "@/lib/deployment-environment";
import { roleLandingPages } from "@/lib/policies";
import { safeEqualValue, signValue } from "@/lib/auth-crypto";

const sessionCookieName = "care_session";
const pendingSessionCookieName = "care_pending_session";
const sessionDurationSeconds = 60 * 60 * 12;
const pendingSessionDurationSeconds = 60 * 10;

export function shouldUseSecureCookies() {
  const explicit = String(process.env.CARE_SECURE_COOKIES || "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(explicit)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(explicit)) {
    return false;
  }

  return shouldUseSecureTransport();
}

function getSessionSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }

  return "church-care-os-dev-session-secret";
}

function encodeSession(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload, getSessionSecret());
  return `${encodedPayload}.${signature}`;
}

function decodeSession(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = signValue(encodedPayload, getSessionSecret());

  if (!safeEqualValue(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );

    if (!payload?.userId || !payload?.role || !payload?.exp) {
      return null;
    }

    if (Number(payload.exp) <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const getOptionalSession = cache(async function getOptionalSession() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  const session = decodeSession(token);

  if (!session?.sessionId) {
    return session;
  }

  const revoked = getDatabase()
    .prepare(`
      SELECT 1 AS revoked
      FROM session_revocations
      WHERE session_id = ?
      LIMIT 1
    `)
    .get(session.sessionId);

  return revoked?.revoked === 1 ? null : session;
});

export async function createSession(user) {
  const expiresAt = Date.now() + sessionDurationSeconds * 1000;
  const token = encodeSession({
    sessionId: randomUUID(),
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    lane: user.lane || "",
    volunteerName: user.volunteerName || "",
    organizationId: user.organizationId || "",
    branchId: user.branchId || "",
    accessScope: user.accessScope || "branch",
    managedBranchIds: user.managedBranchIds || [],
    sessionVersion: Number(user.sessionVersion || 1),
    exp: expiresAt,
  });

  (await cookies()).set(sessionCookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookies(),
    maxAge: sessionDurationSeconds,
  });
}

export async function createPendingSession(user, purpose = "mfa") {
  const expiresAt = Date.now() + pendingSessionDurationSeconds * 1000;
  const token = encodeSession({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId || "",
    branchId: user.branchId || "",
    purpose,
    exp: expiresAt,
  });

  (await cookies()).set(pendingSessionCookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookies(),
    maxAge: pendingSessionDurationSeconds,
  });
}

export async function destroySession() {
  (await cookies()).set(sessionCookieName, "", {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookies(),
    maxAge: 0,
  });
}

export async function destroyPendingSession() {
  (await cookies()).set(pendingSessionCookieName, "", {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookies(),
    maxAge: 0,
  });
}

export const getPendingSession = cache(async function getPendingSession() {
  const token = (await cookies()).get(pendingSessionCookieName)?.value;
  return decodeSession(token);
});

export async function requireSession() {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles) {
  const session = await requireSession();

  if (!roles.includes(session.role)) {
    redirect(getRoleLandingPage(session.role));
  }

  return session;
}

export function getRoleLandingPage(role) {
  if (role === "member") {
    return "/";
  }

  return roleLandingPages[role] || "/login";
}

export function revokeSessionEntry(session) {
  if (!session?.sessionId) {
    return;
  }

  const expiresAt = Number(session.exp || 0) > Date.now()
    ? new Date(Number(session.exp)).toISOString()
    : new Date(Date.now() + sessionDurationSeconds * 1000).toISOString();

  getDatabase()
    .prepare(`
      INSERT OR REPLACE INTO session_revocations (
        session_id,
        user_id,
        revoked_at,
        expires_at
      ) VALUES (?, ?, ?, ?)
    `)
    .run(
      session.sessionId,
      session.userId || null,
      new Date().toISOString(),
      expiresAt
    );
}
