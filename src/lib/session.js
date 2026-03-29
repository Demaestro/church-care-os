import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleLandingPages } from "@/lib/policies";
import { safeEqualValue, signValue } from "@/lib/auth-crypto";

const sessionCookieName = "care_session";
const sessionDurationSeconds = 60 * 60 * 12;

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
  return decodeSession(token);
});

export async function createSession(user) {
  const expiresAt = Date.now() + sessionDurationSeconds * 1000;
  const token = encodeSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
      lane: user.lane || "",
      volunteerName: user.volunteerName || "",
      sessionVersion: Number(user.sessionVersion || 1),
      exp: expiresAt,
    });

  (await cookies()).set(sessionCookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionDurationSeconds,
  });
}

export async function destroySession() {
  (await cookies()).set(sessionCookieName, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

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
  return roleLandingPages[role] || "/login";
}
