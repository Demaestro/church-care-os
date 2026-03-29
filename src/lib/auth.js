import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserByEmail, findUserById } from "@/lib/auth-store";
import { verifyPassword } from "@/lib/auth-crypto";
import { getOptionalSession, getRoleLandingPage } from "@/lib/session";

export async function authenticateCredentials(email, password) {
  const user = findUserByEmail(email);

  if (!user || !user.active) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return sanitizeUser(user);
}

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getOptionalSession();
  if (!session?.userId) {
    return null;
  }

  const user = findUserById(session.userId);
  if (!user || !user.active) {
    return null;
  }

  if (Number(session.sessionVersion || 1) !== Number(user.sessionVersion || 1)) {
    return null;
  }

  return sanitizeUser(user);
});

export async function requireCurrentUser(roles) {
  const session = await getOptionalSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!roles.includes(user.role)) {
    redirect(getRoleLandingPage(user.role));
  }

  return user;
}

export function getRoleLabel(role) {
  switch (role) {
    case "owner":
      return "Owner";
    case "pastor":
      return "Pastor";
    case "leader":
      return "Leader";
    case "volunteer":
      return "Volunteer";
    default:
      return "Guest";
  }
}

export function getUserLandingPage(user) {
  return getRoleLandingPage(user?.role);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    lane: user.lane || "",
    volunteerName: user.volunteerName || "",
    active: user.active,
    sessionVersion: Number(user.sessionVersion || 1),
    lastLoginAt: user.lastLoginAt || "",
  };
}
