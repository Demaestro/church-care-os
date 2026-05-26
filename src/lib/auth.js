import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserByEmail, findUserById } from "@/lib/auth-store";
import { verifyPassword } from "@/lib/auth-crypto";
import { getOptionalSession, getRoleLandingPage } from "@/lib/session";
import {
  mfaRequiredRoles,
  normalizeInternalRole,
  normalizeInternalRoles,
} from "@/lib/policies";

export async function authenticateCredentials(email, password) {
  const user = findUserByEmail(email);

  if (!user || !user.active) {
    return null;
  }

  if (user.lockedAt) {
    return null;
  }

  if (user.role === "member" && !user.emailVerifiedAt) {
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

  if (user.lockedAt) {
    return null;
  }

  if (user.role === "member" && !user.emailVerifiedAt) {
    return null;
  }

  return sanitizeUser(user);
});

export async function requireCurrentUser(roles, options = {}) {
  const session = await getOptionalSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = normalizeInternalRoles(roles);

  if (!allowedRoles.includes(normalizeInternalRole(user.role))) {
    redirect(getRoleLandingPage(user.role));
  }

  if (!options.allowMfaSetup && requiresMfaSetup(user)) {
    redirect("/security?mfa_required=1");
  }

  return user;
}

function requiresMfaSetup(user) {
  return (
    mfaRequiredRoles.includes(normalizeInternalRole(user?.role)) &&
    !user?.mfaConfigured
  );
}

export function getRoleLabel(role) {
  switch (normalizeInternalRole(role)) {
    case "owner":
      return "Church admin";
    case "pastor":
      return "Pastor";
    case "leader":
      return "Leader";
    case "volunteer":
      return "Volunteer";
    case "member":
      return "Member";
    default:
      return "Guest";
  }
}

export function getUserLandingPage(user) {
  return getRoleLandingPage(user?.role);
}

function sanitizeUser(user) {
  const mfaConfigured = Boolean(user.mfaEnabled && user.mfaSecret);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    title: user.title || "",
    organizationId: user.organizationId || "",
    branchId: user.branchId || "",
    accessScope: user.accessScope || "branch",
    managedBranchIds: Array.isArray(user.managedBranchIds)
      ? user.managedBranchIds
      : [],
    lane: user.lane || "",
    volunteerName: user.volunteerName || "",
    phone: user.phone || "",
    mfaEnabled: Boolean(user.mfaEnabled),
    mfaConfigured,
    mfaSetupInProgress: Boolean(user.mfaSecret && !user.mfaEnabled),
    mfaMode: user.mfaMode || "off",
    emailVerifiedAt: user.emailVerifiedAt || "",
    failedLoginAttempts: Number(user.failedLoginAttempts || 0),
    lockedAt: user.lockedAt || "",
    birthday: user.birthday || "",
    gender: user.gender || "unspecified",
    memberType: user.memberType || "member",
    active: user.active,
    sessionVersion: Number(user.sessionVersion || 1),
    lastLoginAt: user.lastLoginAt || "",
  };
}
