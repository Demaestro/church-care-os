'use server';

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DISPLAY_MODE_COOKIE,
  LANGUAGE_COOKIE,
  THEME_COOKIE,
  getPreferenceCookieOptions,
  normalizeDisplayMode,
  normalizeLanguage,
  normalizeTheme,
} from "@/lib/app-preferences";
import {
  authenticateCredentials,
  getUserLandingPage,
  requireCurrentUser,
} from "@/lib/auth";
import {
  bumpUserSessionVersionEntry,
  createUserEntry,
  findUserByEmail,
  findUserById,
  setUserMfaEntry,
  setUserPasswordEntry,
  touchUserLoginEntry,
  toggleUserActiveEntry,
  updateUserEntry,
} from "@/lib/auth-store";
import { formatDateTime } from "@/lib/care-format";
import {
  createPendingSession,
  createSession,
  destroyPendingSession,
  destroySession,
  getPendingSession,
  shouldUseSecureCookies,
} from "@/lib/session";
import {
  addHouseholdNoteEntry,
  addVolunteerTaskNoteEntry,
  declineVolunteerTaskEntry,
  assignRequestVolunteerEntry,
  closeCareRequestEntry,
  completeVolunteerTaskEntry,
  consumeRateLimit,
  createCareRequestEntry,
  escalateRequestToPastorEntry,
  getMemberRequestStatusByTrackingCode,
  recordAuditLog,
  saveFollowUpPlanEntry,
  updateMemberContactProfileEntry,
  updateHouseholdSnapshotEntry,
  acceptVolunteerTaskEntry,
} from "@/lib/care-store";
import {
  createNotifications,
  markAllNotificationsReadEntry,
  markNotificationReadEntry,
} from "@/lib/notifications-store";
import {
  isValidEmailAddress,
  sendEmailToAddress,
  sendEmailToRoles,
  sendEmailToVolunteer,
} from "@/lib/email-service";
import {
  isValidMessagingPhone,
  normalizePhoneNumber,
  sendMessageToPhone,
  sendMessageToRoles,
  sendMessageToVolunteer,
} from "@/lib/message-service";
import {
  createMinistryTeamEntry,
  createBranchEntry,
  createRegionEntry,
  getBranchSettings,
  getBranchOverview,
  createRecoveryRequestEntry,
  getChurchSettings,
  getEffectiveChurchSettings,
  getPublicWorkspaceCatalog,
  getWorkspaceContext,
  listRegions,
  listMinistryTeams,
  listRecoveryRequests,
  resolveRecoveryRequestEntry,
  updateBranchSettingsEntry,
  updateBranchEntry,
  updateChurchSettingsEntry,
  updateMinistryTeamEntry,
  updateRegionEntry,
} from "@/lib/organization-store";
import { getCopy } from "@/lib/i18n";
import {
  createPasswordResetTokenEntry,
  consumePasswordResetTokenEntry,
  getPasswordResetTokenEntry,
  invalidatePasswordResetTokensForUser,
} from "@/lib/password-reset-store";
import {
  buildTotpProvisioningUri,
  consumeBackupCode,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  verifyTotpCode,
} from "@/lib/totp";
import {
  completeMemberTransferEntry,
  createMemberTransferEntry,
} from "@/lib/member-transfer-store";
import { saveHouseholdAttachment } from "@/lib/attachment-store";
import {
  PUBLIC_BRANCH_COOKIE,
  PUBLIC_ORGANIZATION_COOKIE,
  WORKSPACE_BRANCH_COOKIE,
  getUserManagedBranchIds,
  isOrganizationScopedUser,
  normalizeAccessScope,
  normalizeManagedBranchIds,
  resolveUserBranchId,
  resolveUserOrganizationId,
} from "@/lib/workspace-scope";
import {
  defaultPrimaryBranchId,
  defaultPrimaryOrganizationId,
} from "@/lib/organization-defaults";
import { mfaRequiredRoles } from "@/lib/policies";

function getString(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData, key) {
  return formData.get(key) === "on";
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function buildPathWithParams(path, values = {}) {
  const [pathname, existingQuery = ""] = String(path || "").split("?");
  const params = new URLSearchParams(existingQuery);

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function redirectWithNotice(path, notice, values = {}) {
  redirect(buildPathWithParams(path, { ...values, notice }));
}

function redirectWithError(path, error, values = {}) {
  redirect(buildPathWithParams(path, { ...values, error }));
}

function getActionErrorMessage(error, fallback) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("UNIQUE constraint failed: users.email")) {
    return "That email address is already tied to another account.";
  }

  if (message.includes("UNIQUE constraint failed: teams.name")) {
    return "A ministry team with that name already exists.";
  }

  if (message.includes("UNIQUE constraint failed: teams.lane")) {
    return "That lane name is already being used by another team.";
  }

  return message || fallback;
}

const MFA_SETUP_PREVIEW_COOKIE = "cco-mfa-preview-codes";

function shouldRequireMfa(user) {
  return Boolean(user?.mfaEnabled && user?.mfaSecret);
}

/**
 * Returns true when the user's role mandates MFA but they have not yet
 * completed MFA setup.  Used to gate workspace access and prompt setup.
 */
function isMfaSetupRequired(user) {
  if (!user?.role) return false;
  if (user?.mfaEnabled && user?.mfaSecret) return false; // already enrolled
  return mfaRequiredRoles.includes(user.role);
}

async function setMfaPreviewCodes(codes = []) {
  (await cookies()).set(MFA_SETUP_PREVIEW_COOKIE, JSON.stringify(codes), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    maxAge: 60 * 10,
  });
}

async function clearMfaPreviewCodes() {
  (await cookies()).set(MFA_SETUP_PREVIEW_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    maxAge: 0,
  });
}

function buildHouseholdHref(householdSlug) {
  return householdSlug ? `/households/${householdSlug}` : "/";
}

function buildMemberStatusPath(trackingCode) {
  return trackingCode
    ? `/requests/status?code=${encodeURIComponent(trackingCode)}`
    : "/requests/status";
}

function buildMemberPortalPath(trackingCode, contactValue = "") {
  return buildPathWithParams("/member", {
    code: trackingCode,
    contact: contactValue,
  });
}

function buildResetPasswordPath(token) {
  return token
    ? `/reset-password?token=${encodeURIComponent(token)}`
    : "/reset-password";
}

function notifyRoles(roles, input) {
  createNotifications({
    roles,
    ...input,
  });
}

function notifyVolunteer(volunteerName, input) {
  createNotifications({
    volunteerName,
    ...input,
  });
}

async function emailRoles(roles, templateKey, context, options = {}) {
  await sendEmailToRoles(roles, templateKey, context, options);
}

async function emailVolunteer(volunteerName, templateKey, context, options = {}) {
  await sendEmailToVolunteer(volunteerName, templateKey, context, options);
}

async function emailAddress(email, templateKey, context, options = {}) {
  await sendEmailToAddress(email, templateKey, context, options);
}

async function messageRoles(roles, channel, templateKey, context, options = {}) {
  await sendMessageToRoles(roles, channel, templateKey, context, options);
}

async function messageVolunteer(volunteerName, channel, templateKey, context, options = {}) {
  await sendMessageToVolunteer(volunteerName, channel, templateKey, context, options);
}

async function messagePhone(phone, channel, templateKey, context, options = {}) {
  await sendMessageToPhone(phone, channel, templateKey, context, options);
}

function buildVolunteerRedirect(volunteerName, tab = "assigned") {
  return `/volunteer?volunteer=${encodeURIComponent(volunteerName)}&tab=${tab}`;
}

function normalizeRisk(value) {
  return ["urgent", "watch", "steady"].includes(value) ? value : "watch";
}

function normalizeStage(value) {
  return [
    "Assign",
    "Stabilize",
    "Support",
    "Review",
    "Escalate",
    "Comfort",
  ].includes(value)
    ? value
    : "Assign";
}

function isValidDateTime(value) {
  return value && !Number.isNaN(new Date(value).valueOf());
}

function addHours(date, hours) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next.toISOString();
}

function resolveResponseWindow(windowValue) {
  const now = new Date();

  switch (windowValue) {
    case "today":
      return {
        risk: "urgent",
        dueAt: addHours(now, 12),
      };
    case "48-hours":
      return {
        risk: "watch",
        dueAt: addHours(now, 48),
      };
    case "this-week":
      return {
        risk: "steady",
        dueAt: addHours(now, 120),
      };
    default:
      return {
        risk: "steady",
        dueAt: addHours(now, 168),
      };
  }
}

function revalidateCarePaths(householdSlug = "") {
  revalidatePath("/");
  revalidatePath("/member");
  revalidatePath("/branches");
  revalidatePath("/regions");
  revalidatePath("/transfers");
  revalidatePath("/security");
  revalidatePath("/schedule");
  revalidatePath("/teams");
  revalidatePath("/admin/users");
  revalidatePath("/reports");
  revalidatePath("/settings");
  revalidatePath("/notifications");
  revalidatePath("/leader");
  revalidatePath("/households");
  revalidatePath("/volunteer");
  revalidatePath("/audit");
  revalidatePath("/requests/new");
  revalidatePath("/requests/status");
  revalidatePath("/account-recovery");

  if (householdSlug) {
    revalidatePath(`/households/${householdSlug}`);
  }
}

function buildActorLog(user, scope = {}) {
  return {
    actorUserId: user.id,
    actorName: user.name,
    actorRole: user.role,
    organizationId:
      scope.organizationId || user.organizationId || defaultPrimaryOrganizationId,
    branchId:
      scope.branchId !== undefined
        ? scope.branchId
        : user.accessScope === "organization"
          ? null
          : user.branchId || defaultPrimaryBranchId,
  };
}

function getScopedPath(pathname, branchId = "") {
  return buildPathWithParams(pathname, branchId ? { branch: branchId } : {});
}

async function getWorkspaceSelection(user) {
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);

  return {
    workspace,
    preferredBranchId: workspace.activeBranch?.id || "",
    organizationId: workspace.organization.id,
    branchId: workspace.activeBranch?.id || user.branchId || defaultPrimaryBranchId,
  };
}

function canManageRole(actorRole, role) {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "overseer") {
    return ["pastor", "leader", "volunteer"].includes(role);
  }

  if (actorRole === "pastor") {
    return ["leader", "volunteer"].includes(role);
  }

  return false;
}

function canActorManageScope(actor, organizationId, branchId = "") {
  if (resolveUserOrganizationId(actor) !== organizationId) {
    return false;
  }

  if (isOrganizationScopedUser(actor)) {
    const managedBranchIds = getUserManagedBranchIds(actor);
    return managedBranchIds.length === 0 || managedBranchIds.includes(branchId);
  }

  return resolveUserBranchId(actor) === branchId;
}

function assertScopedUserManagement(
  actor,
  targetScope,
  targetUser = null,
  nextRole = targetUser?.role
) {
  const organizationId = targetScope.organizationId || resolveUserOrganizationId(targetUser);
  const branchId = targetScope.branchId || resolveUserBranchId(targetUser);
  const currentRole = targetUser?.role || nextRole;

  if (!canManageRole(actor.role, currentRole) || !canManageRole(actor.role, nextRole)) {
    throw new Error("You do not have permission to manage that account.");
  }

  if (!canActorManageScope(actor, organizationId, branchId)) {
    throw new Error("You can only manage people inside your allowed branch scope.");
  }

  if (targetUser?.id === actor.id && nextRole !== actor.role) {
    throw new Error("You cannot change your own role from this screen.");
  }
}

function resolveManagedScopeFromForm(actor, formData, role) {
  const organizationId = resolveUserOrganizationId(actor);
  const requestedBranchId =
    getString(formData, "branchId") ||
    getString(formData, "managedBranchIds").split(",")[0] ||
    resolveUserBranchId(actor);
  const branchId = isOrganizationScopedUser(actor)
    ? requestedBranchId || resolveUserBranchId(actor)
    : resolveUserBranchId(actor);
  const managedBranchIds =
    role === "owner"
      ? []
      : role === "overseer"
        ? normalizeManagedBranchIds(
            getString(formData, "managedBranchIds"),
            branchId
          )
        : [branchId];
  const accessScope =
    role === "owner" || role === "overseer"
      ? normalizeAccessScope(getString(formData, "accessScope") || "organization")
      : "branch";

  return {
    organizationId,
    branchId,
    accessScope,
    managedBranchIds:
      accessScope === "organization" ? managedBranchIds : [branchId],
  };
}

async function getPublicSelection() {
  const cookieStore = await cookies();
  const catalog = getPublicWorkspaceCatalog();
  const organizationId =
    cookieStore.get(PUBLIC_ORGANIZATION_COOKIE)?.value || defaultPrimaryOrganizationId;
  const organization =
    catalog.find((item) => item.id === organizationId) || catalog[0];
  const branchId = cookieStore.get(PUBLIC_BRANCH_COOKIE)?.value || "";
  const branch =
    organization?.branches.find((item) => item.id === branchId) ||
    organization?.branches[0] ||
    null;

  return {
    organizationId: organization?.id || defaultPrimaryOrganizationId,
    branchId: branch?.id || defaultPrimaryBranchId,
  };
}

async function getRequestFingerprint() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const realIp = headerList.get("x-real-ip");
  const userAgent = headerList.get("user-agent") || "unknown-agent";
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    "unknown-ip";

  return `${ip}:${userAgent.slice(0, 96)}`;
}

function resolveVolunteerIdentity(user) {
  return user.volunteerName || user.name;
}

async function getRequestCopy() {
  const cookieStore = await cookies();
  return getCopy(normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value));
}

export async function login(prevState, formData) {
  void prevState;
  const copy = await getRequestCopy();
  const loginCopy = copy.loginForm;

  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const errors = {};

  if (!email) {
    errors.email = loginCopy.actionMessages.emailRequired;
  }

  if (!password) {
    errors.password = loginCopy.actionMessages.passwordRequired;
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: loginCopy.actionMessages.fixFields,
      errors,
    };
  }

  const user = await authenticateCredentials(email, password);
  if (!user) {
    return {
      message: loginCopy.actionMessages.invalidCredentials,
      errors: {
        email: loginCopy.actionMessages.retryHint,
      },
    };
  }

  if (shouldRequireMfa(user)) {
    await createPendingSession(user, "mfa");
    recordAuditLog({
      ...buildActorLog(user),
      action: "auth.mfa_challenge_started",
      targetType: "session",
      targetId: user.id,
      summary: `${user.name} passed password verification and is completing sign-in with MFA.`,
    });
    redirect("/login/verify");
  }

  touchUserLoginEntry(user.id);
  await createSession(user);

  // If this role requires MFA but setup is incomplete, send to security page
  if (isMfaSetupRequired(user)) {
    recordAuditLog({
      ...buildActorLog(user),
      action: "auth.mfa_setup_required",
      targetType: "session",
      targetId: user.id,
      summary: `${user.name} signed in; MFA setup required for role "${user.role}".`,
    });
    redirect("/security?mfa_required=1");
  }
  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.login",
    targetType: "session",
    targetId: user.id,
    summary: `${user.name} signed in.`,
  });

  redirect(getUserLandingPage(user));
}

export async function verifyLoginChallenge(prevState, formData) {
  void prevState;
  const pending = await getPendingSession();

  if (!pending?.userId) {
    return {
      message: "Your verification session expired. Please sign in again.",
    };
  }

  const user = findUserById(pending.userId);
  if (!user || !user.active || !user.mfaEnabled || !user.mfaSecret) {
    await destroyPendingSession();
    return {
      message: "We could not continue this sign-in challenge. Please sign in again.",
    };
  }

  const code = getString(formData, "code");
  const backupCode = getString(formData, "backupCode").toUpperCase();
  let verified = false;

  if (code) {
    verified = verifyTotpCode(user.mfaSecret, code);
  } else if (backupCode) {
    const backupResult = consumeBackupCode(user.mfaBackupCodes || [], backupCode);
    if (backupResult.matched) {
      verified = true;
      setUserMfaEntry(user.id, {
        enabled: true,
        mode: user.mfaMode || "totp",
        secret: user.mfaSecret,
        backupCodes: backupResult.nextHashes,
      });
    }
  }

  if (!verified) {
    return {
      message:
        "That verification code was not accepted. Try the current authenticator code or one unused backup code.",
    };
  }

  touchUserLoginEntry(user.id);
  await createSession(user);
  await destroyPendingSession();

  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.mfa_verified",
    targetType: "session",
    targetId: user.id,
    summary: `${user.name} completed MFA and signed in.`,
  });

  redirect(getUserLandingPage(user));
}

export async function quickDemoLogin(formData) {
  if (process.env.NODE_ENV === "production") {
    redirectWithError("/login", "Demo workspace access is only available locally.");
  }

  const email = normalizeEmail(getString(formData, "email"));
  const user = findUserByEmail(email);

  if (!user || !user.active) {
    redirectWithError(
      "/login?switch=1",
      "That demo workspace is not available right now."
    );
  }

  touchUserLoginEntry(user.id);
  await createSession(user);

  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.demo_login",
    targetType: "session",
    targetId: user.id,
    summary: `${user.name} opened a local demo workspace.`,
  });

  redirect(getUserLandingPage(user));
}

export async function logout() {
  const user = await requireCurrentUser([
    "owner",
    "overseer",
    "pastor",
    "leader",
    "volunteer",
  ]);

  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.logout",
    targetType: "session",
    targetId: user.id,
    summary: `${user.name} signed out.`,
  });

  await destroySession();
  redirect("/login");
}

export async function startMfaEnrollment() {
  const user = await requireCurrentUser([
    "owner",
    "overseer",
    "pastor",
    "leader",
    "volunteer",
  ]);

  const secret = generateTotpSecret();
  const backupCodes = generateBackupCodes();
  setUserMfaEntry(user.id, {
    enabled: false,
    mode: "totp",
    secret,
    backupCodes: backupCodes.map(hashBackupCode),
  });
  await setMfaPreviewCodes(backupCodes);

  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.mfa_setup_started",
    targetType: "user",
    targetId: user.id,
    summary: `${user.name} started MFA setup.`,
  });

  revalidateCarePaths();
  redirectWithNotice("/security", "Authenticator setup started. Add the secret below, then confirm a code.");
}

export async function completeMfaEnrollment(prevState, formData) {
  void prevState;
  const user = await requireCurrentUser([
    "owner",
    "overseer",
    "pastor",
    "leader",
    "volunteer",
  ]);
  const code = getString(formData, "code");
  const freshUser = findUserById(user.id);

  if (!freshUser?.mfaSecret) {
    return {
      message: "Start MFA setup first so we can generate a secret for your account.",
    };
  }

  if (!verifyTotpCode(freshUser.mfaSecret, code)) {
    return {
      message: "That code did not match the authenticator secret. Try the latest 6-digit code.",
    };
  }

  setUserMfaEntry(user.id, {
    enabled: true,
    mode: "totp",
    secret: freshUser.mfaSecret,
    backupCodes: freshUser.mfaBackupCodes,
  });
  bumpUserSessionVersionEntry(user.id);

  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.mfa_enabled",
    targetType: "user",
    targetId: user.id,
    summary: `${user.name} enabled authenticator-based MFA.`,
  });

  revalidateCarePaths();
  redirectWithNotice("/security", "Authenticator-based MFA is now active for your account.");
}

export async function disableMfaEnrollment() {
  const user = await requireCurrentUser([
    "owner",
    "overseer",
    "pastor",
    "leader",
    "volunteer",
  ]);

  setUserMfaEntry(user.id, {
    enabled: false,
    mode: "off",
    secret: "",
    backupCodes: [],
  });
  bumpUserSessionVersionEntry(user.id);
  await clearMfaPreviewCodes();

  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.mfa_disabled",
    targetType: "user",
    targetId: user.id,
    summary: `${user.name} disabled MFA for their account.`,
  });

  revalidateCarePaths();
  redirectWithNotice("/security", "MFA has been disabled for this account.");
}

export async function createCareRequest(prevState, formData) {
  void prevState;
  const copy = await getRequestCopy();
  const intakeCopy = copy.intakeForm;

  const responseWindow = getString(formData, "responseWindow") || "48-hours";
  const responsePlan = resolveResponseWindow(responseWindow);
  const keepNamePrivate = getBoolean(formData, "keepNamePrivate");
  const markSensitive = getBoolean(formData, "markSensitive");
  const allowContact = getBoolean(formData, "allowContact");
  const submittedBy = getString(formData, "submittedBy");
  const rawContactEmail = normalizeEmail(getString(formData, "contactEmail"));
  const rawContactPhone = normalizePhoneNumber(getString(formData, "contactPhone"));
  const contactEmail = allowContact ? rawContactEmail : "";
  const contactPhone = allowContact ? rawContactPhone : "";
  const preferredContact = getString(formData, "preferredContact");
  const summary = getString(formData, "summary");
  const need = getString(formData, "need");
  const honeypot = getString(formData, "website");
  const privacyLevel =
    keepNamePrivate || markSensitive
      ? "pastors-only"
      : "pastors-and-assigned-leads";

  const values = {
    submittedBy,
    preferredContact,
    requestFor: getString(formData, "requestFor") || "self",
    need,
    summary,
    responseWindow,
    keepNamePrivate,
    markSensitive,
    allowContact,
    contactEmail: rawContactEmail,
    contactPhone: rawContactPhone,
  };
  const publicSelection = await getPublicSelection();
  const settings = getChurchSettings(publicSelection.organizationId);
  const confirmationMessage =
    settings?.intakeConfirmationText ||
    "Your request has been received. A pastor or assigned care leader will review it and follow up using the contact method you provided.";

  const errors = {};

  if (!need) {
    errors.need = intakeCopy.needError;
  }

  if (allowContact && rawContactEmail && !isValidEmailAddress(rawContactEmail)) {
    errors.contactEmail = copy.recoveryForm.actionMessages.emailInvalid;
  }

  if (allowContact && rawContactPhone && !isValidMessagingPhone(rawContactPhone)) {
    errors.contactPhone = intakeCopy.phoneError;
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: copy.recoveryForm.actionMessages.fixFields,
      errors,
      values,
      submitted: false,
    };
  }

  if (honeypot) {
    return {
      message: confirmationMessage,
      errors: {},
      values: {},
      submitted: true,
      trackingCode: "",
    };
  }

  const rateLimit = consumeRateLimit(await getRequestFingerprint());
  if (!rateLimit.allowed) {
      return {
        message: intakeCopy.rateLimited,
        errors: {},
        values,
        submitted: false,
    };
  }

  const anonymousSuffix = String(Date.now()).slice(-6);
  const safeSubmittedBy = submittedBy || "Private member";
  const safeHouseholdName =
    getString(formData, "householdName") ||
    submittedBy ||
    `Private care request ${anonymousSuffix}`;
  const safePreferredContact =
    preferredContact ||
    (contactEmail ? `Email ${contactEmail}` : "") ||
    (contactPhone ? `Phone ${contactPhone}` : "") ||
    (allowContact ? "Follow up through church office" : "No direct contact requested");
  const safeSummary =
    summary || "Member asked for support and chose to share more detail later.";

  const { householdSlug, trackingCode } = await createCareRequestEntry({
    organizationId: publicSelection.organizationId,
    branchId: publicSelection.branchId,
    householdName: safeHouseholdName,
    submittedBy: safeSubmittedBy,
    contactEmail,
    contactPhone,
    preferredContact: safePreferredContact,
    requestFor: values.requestFor,
    need,
    summary: safeSummary,
    dueAt: responsePlan.dueAt,
    risk: responsePlan.risk,
    stage: "Assign",
    owner: "Unassigned",
    source: "Member care form",
    tags: "",
    intakeNote: `Submitted by ${safeSubmittedBy}. Preferred contact: ${safePreferredContact}.`,
    privacyLevel,
    shareWithVolunteers: !(keepNamePrivate || markSensitive),
    allowTextUpdates: allowContact,
  });

  recordAuditLog({
    organizationId: publicSelection.organizationId,
    branchId: publicSelection.branchId,
    actorName: "Public intake",
    actorRole: "public",
    action: "care.request_created",
    targetType: "request",
    targetId: trackingCode,
    summary: `New care request submitted for ${safeHouseholdName}.`,
    metadata: {
      householdSlug,
      trackingCode,
      privacyLevel,
      allowContact,
      keepNamePrivate,
      markSensitive,
    },
  });
  notifyRoles(["pastor", "owner"], {
    organizationId: publicSelection.organizationId,
    branchId: publicSelection.branchId,
    kind: "care-request",
    title: "New care request submitted",
    body: `${safeHouseholdName} submitted a ${need.toLowerCase()} request. Tracking code ${trackingCode}.`,
    href: buildHouseholdHref(householdSlug),
    metadata: {
      trackingCode,
      householdSlug,
      need,
    },
  });
  await emailRoles(
    ["pastor", "owner"],
    "care-request-alert",
    {
      householdName: safeHouseholdName,
      need,
      summary: safeSummary,
      trackingCode,
      householdPath: buildHouseholdHref(householdSlug),
    },
    {
      organizationId: publicSelection.organizationId,
      branchId: publicSelection.branchId,
      metadata: {
        trackingCode,
        householdSlug,
      },
    }
  );
  await messageRoles(
    ["pastor", "owner"],
    "whatsapp",
    "care-request-alert",
    {
      householdName: safeHouseholdName,
      need,
      trackingCode,
      householdPath: buildHouseholdHref(householdSlug),
    },
    {
      organizationId: publicSelection.organizationId,
      branchId: publicSelection.branchId,
      metadata: {
        trackingCode,
        householdSlug,
      },
    }
  );

  if (allowContact && contactEmail) {
    await emailAddress(
      contactEmail,
      "request-received",
      {
        trackingCode,
        need,
        allowContact,
        privacyLabel:
          privacyLevel === "pastors-only"
            ? "Visible only to pastor until they choose the next safe handoff."
            : "Visible to pastor and assigned care leads.",
        statusPath: buildMemberStatusPath(trackingCode),
      },
      {
        recipientName: safeSubmittedBy,
        organizationId: publicSelection.organizationId,
        branchId: publicSelection.branchId,
        metadata: {
          trackingCode,
          householdSlug,
        },
      }
    );
  }

  if (allowContact && contactPhone) {
    await messagePhone(
      contactPhone,
      "sms",
      "request-received",
      {
        trackingCode,
        need,
        allowContact,
        statusPath: buildMemberStatusPath(trackingCode),
      },
      {
        recipientName: safeSubmittedBy,
        organizationId: publicSelection.organizationId,
        branchId: publicSelection.branchId,
        metadata: {
          trackingCode,
          householdSlug,
        },
      }
    );
  }

  revalidateCarePaths(householdSlug);

  return {
    message: confirmationMessage,
    errors: {},
    values: {},
    submitted: true,
    trackingCode,
  };
}

export async function updateHouseholdSnapshot(householdSlug, formData) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const scope = await getWorkspaceSelection(user);
  const nextTouchpoint = getString(formData, "nextTouchpoint");

  await updateHouseholdSnapshotEntry(householdSlug, {
    stage: normalizeStage(getString(formData, "stage")),
    risk: normalizeRisk(getString(formData, "risk")),
    owner: getString(formData, "owner"),
    nextTouchpoint: isValidDateTime(nextTouchpoint) ? nextTouchpoint : "",
    situation: getString(formData, "situation"),
    summaryNote: getString(formData, "summaryNote"),
    tags: getString(formData, "tags"),
  }, user, scope.preferredBranchId);

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "household.snapshot_updated",
    targetType: "household",
    targetId: householdSlug,
    summary: `${user.name} updated the household snapshot.`,
  });

  revalidateCarePaths(householdSlug);
  redirect(`/households/${householdSlug}`);
}

export async function addHouseholdNote(householdSlug, formData) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const scope = await getWorkspaceSelection(user);
  const body = getString(formData, "body");

  if (!body) {
    redirect(`/households/${householdSlug}`);
  }

  await addHouseholdNoteEntry(householdSlug, {
    author: getString(formData, "author") || user.name,
    kind: getString(formData, "kind"),
    body,
  }, user, scope.preferredBranchId);

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "household.note_added",
    targetType: "household",
    targetId: householdSlug,
    summary: `${user.name} added a timeline note.`,
  });

  revalidateCarePaths(householdSlug);
  redirect(`/households/${householdSlug}`);
}

export async function closeCareRequest(requestId, householdSlug) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const scope = await getWorkspaceSelection(user);
  await closeCareRequestEntry(requestId, householdSlug, user, scope.preferredBranchId);

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "care.request_closed",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} closed a care request.`,
  });

  revalidateCarePaths(householdSlug);
  redirect(`/households/${householdSlug}`);
}

export async function assignRequestVolunteer(requestId, householdSlug, formData) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const scope = await getWorkspaceSelection(user);
  const volunteerName = getString(formData, "volunteerName");
  const householdName = getString(formData, "householdName") || "Care household";
  const need = getString(formData, "need") || "Care follow-up";
  const volunteerBrief =
    getString(formData, "volunteerBrief") ||
    "Follow the leader brief and route questions back to the care lead.";
  const laneOwner =
    getString(formData, "laneOwner") || user.lane || "Mercy & welfare lane";

  await assignRequestVolunteerEntry(requestId, householdSlug, {
    volunteerName,
    volunteerBrief,
    assignedBy: user.name,
    laneOwner,
  }, user, scope.preferredBranchId);

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "care.volunteer_assigned",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} assigned ${volunteerName} to a care request.`,
    metadata: {
      volunteerName,
    },
  });
  notifyVolunteer(volunteerName, {
    organizationId: scope.organizationId,
    branchId: scope.branchId,
    kind: "task",
    title: "New care task assigned",
    body: `${user.name} routed a care follow-up to you in ${laneOwner}.`,
    href: buildVolunteerRedirect(volunteerName),
    metadata: {
      requestId,
      householdSlug,
      volunteerBrief,
    },
  });
  await emailVolunteer(
    volunteerName,
    "task-assigned",
    {
      householdName,
      need,
      laneOwner,
      assignedBy: user.name,
      volunteerBrief,
      volunteerPath: buildVolunteerRedirect(volunteerName),
    },
    {
      organizationId: scope.organizationId,
      branchId: scope.branchId,
      metadata: {
        requestId,
        householdSlug,
      },
    }
  );
  await messageVolunteer(
    volunteerName,
    "whatsapp",
    "task-assigned",
    {
      householdName,
      need,
      laneOwner,
      assignedBy: user.name,
      volunteerBrief,
      volunteerPath: buildVolunteerRedirect(volunteerName),
    },
    {
      organizationId: scope.organizationId,
      branchId: scope.branchId,
      metadata: {
        requestId,
        householdSlug,
      },
    }
  );

  revalidateCarePaths(householdSlug);
  redirect("/leader");
}

export async function escalateRequestToPastor(requestId, householdSlug, formData) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const scope = await getWorkspaceSelection(user);
  const reason = getString(formData, "reason");
  const householdName = getString(formData, "householdName") || "Care household";
  const need = getString(formData, "need") || "Care follow-up";

  await escalateRequestToPastorEntry(requestId, householdSlug, {
    reason,
    nextStep: getString(formData, "nextStep"),
    escalatedBy: user.name,
  }, user, scope.preferredBranchId);

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "care.request_escalated",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} escalated a request back to pastoral review.`,
    metadata: {
      reason,
    },
  });
  notifyRoles(["pastor", "owner"], {
    organizationId: scope.organizationId,
    branchId: scope.branchId,
    kind: "escalation",
    title: "Request escalated to pastor",
    body: `${user.name} escalated a request for renewed pastoral review. ${reason}`,
    href: buildHouseholdHref(householdSlug),
    metadata: {
      requestId,
      householdSlug,
      reason,
    },
  });
  await emailRoles(
    ["pastor", "owner"],
    "request-escalated",
    {
      householdName,
      need,
      reason,
      escalatedBy: user.name,
      householdPath: buildHouseholdHref(householdSlug),
    },
    {
      organizationId: scope.organizationId,
      branchId: scope.branchId,
      metadata: {
        requestId,
        householdSlug,
      },
    }
  );
  await messageRoles(
    ["pastor", "owner"],
    "whatsapp",
    "request-escalated",
    {
      householdName,
      need,
      reason,
      escalatedBy: user.name,
      householdPath: buildHouseholdHref(householdSlug),
    },
    {
      organizationId: scope.organizationId,
      branchId: scope.branchId,
      metadata: {
        requestId,
        householdSlug,
      },
    }
  );

  revalidateCarePaths(householdSlug);
  redirect("/leader");
}

export async function acceptVolunteerTask(requestId, householdSlug, volunteerName) {
  const user = await requireCurrentUser(["volunteer"]);
  const scope = await getWorkspaceSelection(user);
  const actorVolunteerName = resolveVolunteerIdentity(user);

  if (volunteerName !== actorVolunteerName) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  await acceptVolunteerTaskEntry(
    requestId,
    householdSlug,
    actorVolunteerName,
    user,
    scope.preferredBranchId
  );

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "care.volunteer_task_accepted",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} accepted a volunteer task.`,
  });
  notifyRoles(["leader", "pastor", "owner"], {
    organizationId: scope.organizationId,
    branchId: scope.branchId,
    kind: "task",
    title: "Volunteer accepted a task",
    body: `${user.name} accepted an assigned care follow-up.`,
    href: buildHouseholdHref(householdSlug),
    metadata: {
      requestId,
      householdSlug,
      volunteerName: actorVolunteerName,
    },
  });

  revalidateCarePaths(householdSlug);
  redirect(buildVolunteerRedirect(actorVolunteerName));
}

export async function declineVolunteerTask(
  requestId,
  householdSlug,
  volunteerName,
  formData
) {
  const user = await requireCurrentUser(["volunteer"]);
  const scope = await getWorkspaceSelection(user);
  const actorVolunteerName = resolveVolunteerIdentity(user);
  const reason = getString(formData, "reason");

  if (!reason) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  if (volunteerName !== actorVolunteerName) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  await declineVolunteerTaskEntry(requestId, householdSlug, {
    volunteerName: actorVolunteerName,
    reason,
    laneOwner: user.lane || "Ministry leader",
    actor: user,
    preferredBranchId: scope.preferredBranchId,
  });

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "care.volunteer_task_declined",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} declined a volunteer task for re-routing.`,
    metadata: {
      reason,
    },
  });
  notifyRoles(["leader", "pastor", "owner"], {
    organizationId: scope.organizationId,
    branchId: scope.branchId,
    kind: "task",
    title: "Volunteer declined a task",
    body: `${user.name} asked for a care task to be re-routed. Reason: ${reason}`,
    href: buildHouseholdHref(householdSlug),
    metadata: {
      requestId,
      householdSlug,
      volunteerName: actorVolunteerName,
      reason,
    },
  });

  revalidateCarePaths(householdSlug);
  redirect(buildVolunteerRedirect(actorVolunteerName));
}

export async function completeVolunteerTask(requestId, householdSlug, volunteerName) {
  const user = await requireCurrentUser(["volunteer"]);
  const scope = await getWorkspaceSelection(user);
  const actorVolunteerName = resolveVolunteerIdentity(user);

  if (volunteerName !== actorVolunteerName) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  await completeVolunteerTaskEntry(
    requestId,
    householdSlug,
    actorVolunteerName,
    user,
    scope.preferredBranchId
  );

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "care.volunteer_task_completed",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} completed a volunteer task.`,
  });
  notifyRoles(["leader", "pastor", "owner"], {
    organizationId: scope.organizationId,
    branchId: scope.branchId,
    kind: "task",
    title: "Volunteer completed a task",
    body: `${user.name} marked a care follow-up complete.`,
    href: buildHouseholdHref(householdSlug),
    metadata: {
      requestId,
      householdSlug,
      volunteerName: actorVolunteerName,
    },
  });

  revalidateCarePaths(householdSlug);
  redirect(buildVolunteerRedirect(actorVolunteerName, "completed"));
}

export async function addVolunteerTaskNote(
  requestId,
  householdSlug,
  volunteerName,
  formData
) {
  const user = await requireCurrentUser(["volunteer"]);
  const scope = await getWorkspaceSelection(user);
  const actorVolunteerName = resolveVolunteerIdentity(user);
  const body = getString(formData, "body");

  if (!body) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  if (volunteerName !== actorVolunteerName) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  await addVolunteerTaskNoteEntry(requestId, householdSlug, {
    volunteerName: actorVolunteerName,
    body,
  }, user, scope.preferredBranchId);

  recordAuditLog({
    ...buildActorLog(user, scope),
    action: "care.volunteer_note_added",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} added a volunteer note.`,
  });
  notifyRoles(["leader", "pastor", "owner"], {
    kind: "task-note",
    title: "Volunteer added a note",
    body: `${user.name} added a new note to a care follow-up.`,
    href: buildHouseholdHref(householdSlug),
    metadata: {
      requestId,
      householdSlug,
      volunteerName: actorVolunteerName,
    },
  });

  revalidateCarePaths(householdSlug);
  redirect(buildVolunteerRedirect(actorVolunteerName));
}

export async function lookupRequestStatus(prevState, formData) {
  void prevState;
  const copy = await getRequestCopy();
  const statusCopy = copy.requestStatusLookup;

  const trackingCode = getString(formData, "trackingCode").toUpperCase();

  if (!trackingCode) {
    return {
      message: statusCopy.actionMessages.enterCode,
      errors: {
        trackingCode: statusCopy.actionMessages.trackingRequired,
      },
      lookupCode: "",
      result: null,
    };
  }

  const result = await getMemberRequestStatusByTrackingCode(trackingCode);

  if (!result) {
    return {
      message: statusCopy.actionMessages.notFound,
      errors: {
        trackingCode: statusCopy.actionMessages.notFoundField,
      },
      lookupCode: trackingCode,
      result: null,
    };
  }

  return {
    message: statusCopy.foundMessage,
    errors: {},
    lookupCode: trackingCode,
    result,
  };
}

export async function requestAccountRecovery(prevState, formData) {
  void prevState;
  const copy = await getRequestCopy();
  const recoveryCopy = copy.recoveryForm;

  const email = normalizeEmail(getString(formData, "email"));
  const requesterName = getString(formData, "requesterName");
  const note = getString(formData, "note");
  const honeypot = getString(formData, "website");
  const errors = {};

  if (!email) {
    errors.email = recoveryCopy.actionMessages.emailRequired;
  } else if (!isValidEmailAddress(email)) {
    errors.email = recoveryCopy.actionMessages.emailInvalid;
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: recoveryCopy.actionMessages.fixFields,
      errors,
      values: {
        email,
        requesterName,
        note,
      },
      submitted: false,
    };
  }

  if (honeypot) {
    return {
      message: recoveryCopy.actionMessages.logged,
      errors: {},
      values: {},
      submitted: true,
    };
  }

  const rateLimit = consumeRateLimit(`recovery:${await getRequestFingerprint()}`);
  if (!rateLimit.allowed) {
    return {
      message: recoveryCopy.actionMessages.rateLimited,
      errors: {},
      values: {
        email,
        requesterName,
        note,
      },
      submitted: false,
    };
  }

  const matchedUser = findUserByEmail(email);
  const needsManualReview = !matchedUser?.active || Boolean(note);
  let recoveryRequestId = "";

  if (needsManualReview) {
    recoveryRequestId = createRecoveryRequestEntry({
      email,
      requesterName,
      note,
    });
  }

  if (matchedUser?.active) {
    const resetToken = createPasswordResetTokenEntry(email);

    if (resetToken) {
      if (recoveryRequestId) {
        resolveRecoveryRequestEntry(recoveryRequestId, {
          status: "issued",
          handledBy: "Self-service reset",
          resolutionNote: "Secure reset link sent automatically.",
        });
      }

      recordAuditLog({
        actorName: requesterName || "Public recovery form",
        actorRole: "public",
        action: "auth.password_reset_link_requested",
        targetType: "user",
        targetId: matchedUser.id,
        summary: `Password reset link requested for ${email}.`,
      });
      createNotifications({
        userIds: [matchedUser.id],
        kind: "account",
        title: "Password reset link sent",
        body:
          "A one-time password reset link was sent to the email address on your care account.",
        href: "/login",
        metadata: {
          recoveryRequestId,
        },
      });
      await emailAddress(
        email,
        "password-reset-link",
        {
          email,
          expiresLabel: formatDateTime(resetToken.expiresAt),
          resetPath: buildResetPasswordPath(resetToken.token),
        },
        {
          recipientName: matchedUser.name || requesterName,
          metadata: {
            recoveryRequestId,
            userId: matchedUser.id,
          },
        }
      );
      if (matchedUser.phone) {
        await messagePhone(
          matchedUser.phone,
          "sms",
          "password-reset-link",
          {
            email,
            expiresLabel: formatDateTime(resetToken.expiresAt),
            resetPath: buildResetPasswordPath(resetToken.token),
          },
          {
            recipientName: matchedUser.name || requesterName,
            metadata: {
              recoveryRequestId,
              userId: matchedUser.id,
            },
          }
        );
      }
    }
  } else {
    recordAuditLog({
      actorName: requesterName || "Public recovery form",
      actorRole: "public",
      action: "auth.recovery_requested",
      targetType: "recovery_request",
      targetId: email,
      summary: `Manual recovery review requested for ${email}.`,
    });
    notifyRoles(["pastor", "owner"], {
      kind: "recovery-request",
      title: "Manual recovery follow-up requested",
      body: `${requesterName || "A team member"} asked for recovery help for ${email}.`,
      href: "/admin/users",
      metadata: {
        email,
        recoveryRequestId,
      },
    });
    await emailRoles(
      ["pastor", "owner"],
      "recovery-request-alert",
      {
        email,
        requesterName,
        note,
      },
      {
        metadata: {
          email,
          recoveryRequestId,
        },
      }
    );
    await messageRoles(
      ["pastor", "owner"],
      "whatsapp",
      "recovery-request-alert",
      {
        email,
        requesterName,
        note,
      },
      {
        metadata: {
          email,
          recoveryRequestId,
        },
      }
    );
  }

  revalidateCarePaths();

  return {
    message: recoveryCopy.actionMessages.logged,
    errors: {},
    values: {},
    submitted: true,
  };
}

export async function completePasswordReset(prevState, formData) {
  void prevState;
  const copy = await getRequestCopy();
  const resetCopy = copy.resetPasswordForm;
  const token = getString(formData, "token");
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");
  const errors = {};
  const tokenState = getPasswordResetTokenEntry(token);

  if (!password) {
    errors.password = resetCopy.actionMessages.passwordRequired;
  } else if (password.length < 8) {
    errors.password = resetCopy.actionMessages.minimumLength;
  }

  if (!confirmPassword) {
    errors.confirmPassword = resetCopy.actionMessages.confirmPasswordRequired;
  } else if (password && password !== confirmPassword) {
    errors.confirmPassword = resetCopy.actionMessages.mismatch;
  }

  if (tokenState.status === "invalid") {
    errors.password = resetCopy.actionMessages.invalidLink;
  } else if (tokenState.status === "expired") {
    errors.password = resetCopy.actionMessages.expiredLink;
  } else if (tokenState.status === "used") {
    errors.password = resetCopy.actionMessages.usedLink;
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: resetCopy.actionMessages.fixFields,
      errors,
      submitted: false,
    };
  }

  try {
    const updatedUser = consumePasswordResetTokenEntry(token, password);
    bumpUserSessionVersionEntry(updatedUser.id);

    recordAuditLog({
      actorUserId: updatedUser.id,
      actorName: updatedUser.name,
      actorRole: updatedUser.role,
      action: "auth.password_reset_completed",
      targetType: "user",
      targetId: updatedUser.id,
      summary: `${updatedUser.name} completed a self-service password reset.`,
    });
    createNotifications({
      userIds: [updatedUser.id],
      kind: "account",
      title: "Password updated successfully",
      body: "Your care account password was changed through a secure reset link.",
      href: "/login",
      metadata: {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      message: resetCopy.actionMessages.fixFields,
      errors: {
        password: message || resetCopy.actionMessages.invalidLink,
      },
      submitted: false,
    };
  }

  revalidateCarePaths();

  return {
    message: resetCopy.actionMessages.saved,
    errors: {},
    submitted: true,
  };
}

export async function saveDisplayPreferences(formData) {
  const cookieStore = await cookies();
  const language = normalizeLanguage(getString(formData, "language"));
  const displayMode = normalizeDisplayMode(getString(formData, "displayMode"));
  const theme = normalizeTheme(getString(formData, "theme"));
  const redirectTo = getString(formData, "redirectTo") || "/";
  const cookieOptions = getPreferenceCookieOptions();

  cookieStore.set(LANGUAGE_COOKIE, language, cookieOptions);
  cookieStore.set(DISPLAY_MODE_COOKIE, displayMode, cookieOptions);
  cookieStore.set(THEME_COOKIE, theme, cookieOptions);

  redirect(redirectTo);
}

export async function toggleThemePreference(formData) {
  const cookieStore = await cookies();
  const theme = normalizeTheme(getString(formData, "theme"));
  const redirectTo = getString(formData, "redirectTo") || "/";
  const cookieOptions = getPreferenceCookieOptions();

  cookieStore.set(THEME_COOKIE, theme, cookieOptions);

  redirect(redirectTo);
}

export async function switchWorkspaceBranch(formData) {
  const user = await requireCurrentUser(["leader", "pastor", "overseer", "owner"]);
  const cookieStore = await cookies();
  const requestedBranchId = getString(formData, "branchId");
  const redirectTo = getString(formData, "redirectTo") || getUserLandingPage(user);
  const workspace = getWorkspaceContext(user, requestedBranchId);

  if (!isOrganizationScopedUser(user) || !workspace.canSwitchBranches) {
    redirect(redirectTo);
  }

  if (workspace.activeBranch?.id) {
    cookieStore.set(
      WORKSPACE_BRANCH_COOKIE,
      workspace.activeBranch.id,
      getPreferenceCookieOptions()
    );
  } else {
    cookieStore.delete(WORKSPACE_BRANCH_COOKIE);
  }

  redirect(redirectTo);
}

export async function switchPublicBranch(formData) {
  const cookieStore = await cookies();
  const organizationId = getString(formData, "organizationId") || defaultPrimaryOrganizationId;
  const branchId = getString(formData, "branchId");
  const redirectTo = getString(formData, "redirectTo") || "/";
  const catalog = getPublicWorkspaceCatalog();
  const organization =
    catalog.find((item) => item.id === organizationId) || catalog[0];
  const branch =
    organization?.branches.find((item) => item.id === branchId) ||
    organization?.branches[0] ||
    null;
  const cookieOptions = getPreferenceCookieOptions();

  if (organization?.id) {
    cookieStore.set(PUBLIC_ORGANIZATION_COOKIE, organization.id, cookieOptions);
  }

  if (branch?.id) {
    cookieStore.set(PUBLIC_BRANCH_COOKIE, branch.id, cookieOptions);
  }

  redirect(redirectTo);
}

export async function createUserAccount(formData) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const name = getString(formData, "name");
  const email = normalizeEmail(getString(formData, "email"));
  const phone = normalizePhoneNumber(getString(formData, "phone"));
  const role = getString(formData, "role");
  const lane = getString(formData, "lane");
  const password = getString(formData, "password");
  const volunteerName = getString(formData, "volunteerName") || name;
  const title = getString(formData, "title");
  const active = getBoolean(formData, "active");
  const userScope = resolveManagedScopeFromForm(actor, formData, role);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);

  if (!name || !email || !role || !password) {
    redirectWithError(redirectPath, "Complete the required user fields first.");
  }

  if (!isValidEmailAddress(email)) {
    redirectWithError(redirectPath, "Enter a valid email address for the new account.");
  }

  if (phone && !isValidMessagingPhone(phone)) {
    redirectWithError(
      redirectPath,
      "Enter a phone number in international format, like +2348012345678."
    );
  }

  if (password.length < 8) {
    redirectWithError(redirectPath, "Passwords should be at least 8 characters.");
  }

  if (!["owner", "overseer", "pastor", "leader", "volunteer"].includes(role)) {
    redirectWithError(redirectPath, "Select a valid role for the new account.");
  }

  try {
    assertScopedUserManagement(actor, userScope, null, role);

    const createdUserId = createUserEntry({
      name,
      email,
      phone,
      role,
      title,
      lane,
      password,
      volunteerName: role === "volunteer" ? volunteerName : "",
      active,
      organizationId: userScope.organizationId,
      branchId: userScope.branchId,
      accessScope: userScope.accessScope,
      managedBranchIds: userScope.managedBranchIds,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.user_created",
      targetType: "user",
      targetId: email,
      summary: `${actor.name} created a ${role} account for ${name}.`,
      metadata: {
        role,
        active,
        branchId: userScope.branchId,
        accessScope: userScope.accessScope,
      },
    });

    createNotifications({
      userIds: [createdUserId],
      organizationId: userScope.organizationId,
      branchId: userScope.branchId,
      kind: "account",
      title: "Your care account is ready",
      body: `${actor.name} created your ${role} account. Sign in with the temporary password they shared and update it after first use.`,
      href: getUserLandingPage({ role }),
      metadata: {
        email,
        role,
      },
    });
    await emailAddress(
      email,
      "account-created",
      {
        email,
        role,
        createdBy: actor.name,
      },
      {
        recipientName: name,
        organizationId: userScope.organizationId,
        branchId: userScope.branchId,
        metadata: {
          role,
        },
      }
    );
    if (phone) {
      await messagePhone(
        phone,
        "whatsapp",
        "account-created",
        {
          email,
          role,
          createdBy: actor.name,
        },
        {
          recipientName: name,
          organizationId: userScope.organizationId,
          branchId: userScope.branchId,
          metadata: {
            role,
          },
        }
      );
    }
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not create that user account.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Created a new ${role} account for ${name}.`);
}

export async function updateUserAccess(userId, formData) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const targetUser = findUserById(userId);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);

  if (!targetUser) {
    redirectWithError(redirectPath, "That account no longer exists.");
  }

  const name = getString(formData, "name");
  const email = normalizeEmail(getString(formData, "email"));
  const phone = normalizePhoneNumber(getString(formData, "phone"));
  const role = getString(formData, "role");
  const lane = getString(formData, "lane");
  const volunteerName = getString(formData, "volunteerName") || name;
  const title = getString(formData, "title");
  const active = getBoolean(formData, "active");
  const userScope = resolveManagedScopeFromForm(actor, formData, role);

  if (!name || !email || !role) {
    redirectWithError(redirectPath, "Name, email, and role are required.");
  }

  if (!["owner", "overseer", "pastor", "leader", "volunteer"].includes(role)) {
    redirectWithError(redirectPath, "Select a valid role for that account.");
  }

  if (phone && !isValidMessagingPhone(phone)) {
    redirectWithError(
      redirectPath,
      "Enter a phone number in international format, like +2348012345678."
    );
  }

  if (targetUser.id === actor.id && !active) {
    redirectWithError(redirectPath, "You cannot deactivate your own account.");
  }

  try {
    assertScopedUserManagement(actor, userScope, targetUser, role);

    updateUserEntry(userId, {
      name,
      email,
      phone,
      role,
      title,
      lane,
      volunteerName: role === "volunteer" ? volunteerName : "",
      active,
      organizationId: userScope.organizationId,
      branchId: userScope.branchId,
      accessScope: userScope.accessScope,
      managedBranchIds: userScope.managedBranchIds,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.user_updated",
      targetType: "user",
      targetId: userId,
      summary: `${actor.name} updated access for ${name}.`,
      metadata: {
        previousRole: targetUser.role,
        role,
        active,
        branchId: userScope.branchId,
        accessScope: userScope.accessScope,
      },
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not update that account.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Updated access for ${name}.`);
}

export async function resetUserPassword(userId, formData) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const targetUser = findUserById(userId);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);

  if (!targetUser) {
    redirectWithError(redirectPath, "That account no longer exists.");
  }

  const password = getString(formData, "password");
  const recoveryRequestId = getString(formData, "recoveryRequestId");
  const resolutionNote = getString(formData, "resolutionNote");

  if (!password) {
    redirectWithError(redirectPath, "Enter a new password before you reset it.");
  }

  if (password.length < 8) {
    redirectWithError(redirectPath, "Passwords should be at least 8 characters.");
  }

  try {
    assertScopedUserManagement(
      actor,
      {
        organizationId: targetUser.organizationId,
        branchId: targetUser.branchId,
      },
      targetUser,
      targetUser.role
    );
    setUserPasswordEntry(userId, password);
    bumpUserSessionVersionEntry(userId);
    invalidatePasswordResetTokensForUser(userId);

    if (recoveryRequestId) {
      resolveRecoveryRequestEntry(recoveryRequestId, {
        status: "issued",
        handledBy: actor.name,
        resolutionNote:
          resolutionNote || `Password reset issued for ${targetUser.email}.`,
      });
    }

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.user_password_reset",
      targetType: "user",
      targetId: userId,
      summary: `${actor.name} reset the password for ${targetUser.name}.`,
      metadata: {
        recoveryRequestId,
      },
    });

    createNotifications({
      userIds: [targetUser.id],
      organizationId: targetUser.organizationId,
      branchId: targetUser.branchId,
      kind: "account",
      title: "Your care password was reset",
      body: `${actor.name} issued a new password for your care account. Use the password they shared with you the next time you sign in.`,
      href: getUserLandingPage(targetUser),
      metadata: {
        recoveryRequestId,
      },
    });
    await emailAddress(
      targetUser.email,
      "password-reset",
      {
        email: targetUser.email,
        handledBy: actor.name,
      },
      {
        recipientName: targetUser.name,
        organizationId: targetUser.organizationId,
        branchId: targetUser.branchId,
        metadata: {
          recoveryRequestId,
        },
      }
    );
    if (targetUser.phone) {
      await messagePhone(
        targetUser.phone,
        "sms",
        "password-reset",
        {
          email: targetUser.email,
          handledBy: actor.name,
        },
        {
          recipientName: targetUser.name,
          organizationId: targetUser.organizationId,
          branchId: targetUser.branchId,
          metadata: {
            recoveryRequestId,
          },
        }
      );
    }
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not reset that password.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Password updated for ${targetUser.name}.`);
}

export async function sendAccountInviteLink(userId) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const targetUser = findUserById(userId);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);

  if (!targetUser) {
    redirectWithError(redirectPath, "That account no longer exists.");
  }

  try {
    assertScopedUserManagement(
      actor,
      {
        organizationId: targetUser.organizationId,
        branchId: targetUser.branchId,
      },
      targetUser,
      targetUser.role
    );
    const resetToken = createPasswordResetTokenEntry(targetUser.email);

    if (!resetToken) {
      throw new Error("We could not create a sign-in link for that account.");
    }

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.user_invite_sent",
      targetType: "user",
      targetId: targetUser.id,
      summary: `${actor.name} sent a sign-in link to ${targetUser.name}.`,
    });

    createNotifications({
      userIds: [targetUser.id],
      organizationId: targetUser.organizationId,
      branchId: targetUser.branchId,
      kind: "account",
      title: "Sign-in link sent",
      body: `${actor.name} sent you a secure one-time link so you can finish setting up your password.`,
      href: "/login",
      metadata: {},
    });

    await emailAddress(
      targetUser.email,
      "password-reset-link",
      {
        email: targetUser.email,
        expiresLabel: formatDateTime(resetToken.expiresAt),
        resetPath: buildResetPasswordPath(resetToken.token),
      },
      {
        recipientName: targetUser.name,
        organizationId: targetUser.organizationId,
        branchId: targetUser.branchId,
        metadata: {
          invitedBy: actor.name,
          userId: targetUser.id,
        },
      }
    );

    if (targetUser.phone) {
      await messagePhone(
        targetUser.phone,
        "sms",
        "password-reset-link",
        {
          email: targetUser.email,
          expiresLabel: formatDateTime(resetToken.expiresAt),
          resetPath: buildResetPasswordPath(resetToken.token),
        },
        {
          recipientName: targetUser.name,
          organizationId: targetUser.organizationId,
          branchId: targetUser.branchId,
          metadata: {
            invitedBy: actor.name,
            userId: targetUser.id,
          },
        }
      );
    }
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not send that sign-in link.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Sent a sign-in link to ${targetUser.name}.`);
}

export async function revokeUserSessions(userId) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const targetUser = findUserById(userId);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);

  if (!targetUser) {
    redirectWithError(redirectPath, "That account no longer exists.");
  }

  try {
    assertScopedUserManagement(
      actor,
      {
        organizationId: targetUser.organizationId,
        branchId: targetUser.branchId,
      },
      targetUser,
      targetUser.role
    );
    bumpUserSessionVersionEntry(userId);

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.user_sessions_revoked",
      targetType: "user",
      targetId: userId,
      summary: `${actor.name} signed ${targetUser.name} out from every active session.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not revoke those sessions.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Signed ${targetUser.name} out everywhere.`);
}

export async function lockUserAccount(userId) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const targetUser = findUserById(userId);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);

  if (!targetUser) {
    redirectWithError(redirectPath, "That account no longer exists.");
  }

  if (targetUser.id === actor.id) {
    redirectWithError(redirectPath, "You cannot lock your own account.");
  }

  try {
    assertScopedUserManagement(
      actor,
      {
        organizationId: targetUser.organizationId,
        branchId: targetUser.branchId,
      },
      targetUser,
      targetUser.role
    );
    toggleUserActiveEntry(userId, false);
    bumpUserSessionVersionEntry(userId);

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.user_locked",
      targetType: "user",
      targetId: userId,
      summary: `${actor.name} locked ${targetUser.name}'s account.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not lock that account.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Locked ${targetUser.name}'s account.`);
}

export async function unlockUserAccount(userId) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const targetUser = findUserById(userId);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);

  if (!targetUser) {
    redirectWithError(redirectPath, "That account no longer exists.");
  }

  try {
    assertScopedUserManagement(
      actor,
      {
        organizationId: targetUser.organizationId,
        branchId: targetUser.branchId,
      },
      targetUser,
      targetUser.role
    );
    toggleUserActiveEntry(userId, true);

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.user_unlocked",
      targetType: "user",
      targetId: userId,
      summary: `${actor.name} unlocked ${targetUser.name}'s account.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not unlock that account.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Unlocked ${targetUser.name}'s account.`);
}

export async function markNotificationRead(notificationId, href = "") {
  const user = await requireCurrentUser(["volunteer", "leader", "pastor", "overseer", "owner"]);

  markNotificationReadEntry(notificationId, user.id);
  revalidateCarePaths();

  redirect(href || "/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireCurrentUser(["volunteer", "leader", "pastor", "overseer", "owner"]);

  markAllNotificationsReadEntry(user.id);
  revalidateCarePaths();

  redirect("/notifications");
}

export async function resolveRecoveryRequest(requestId, formData) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const redirectPath = getScopedPath("/admin/users", scope.preferredBranchId);
  const status = getString(formData, "status") || "resolved";
  const resolutionNote = getString(formData, "resolutionNote");
  const request = listRecoveryRequests(actor, scope.preferredBranchId).find(
    (entry) => entry.id === requestId
  );

  if (!request) {
    redirectWithError(
      redirectPath,
      "That recovery request is outside your current branch scope."
    );
  }

  try {
    resolveRecoveryRequestEntry(requestId, {
      status,
      handledBy: actor.name,
      resolutionNote,
    });

    recordAuditLog({
      ...buildActorLog(actor, {
        organizationId: request.organizationId,
        branchId: request.branchId || null,
      }),
      action: "admin.recovery_request_resolved",
      targetType: "recovery_request",
      targetId: requestId,
      summary: `${actor.name} marked a recovery request as ${status}.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not update that recovery request.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, "Recovery request updated.");
}

export async function createMinistryTeam(formData) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const name = getString(formData, "name");
  const lane = getString(formData, "lane");
  const description = getString(formData, "description");
  const leadName = getString(formData, "leadName") || actor.name;
  const contactEmail = normalizeEmail(getString(formData, "contactEmail"));
  const branchId = getString(formData, "branchId") || scope.branchId;
  const active = getBoolean(formData, "active");
  const redirectPath = getScopedPath("/teams", scope.preferredBranchId);

  if (!name || !lane || !description) {
    redirectWithError(redirectPath, "Name, lane, and description are required.");
  }

  if (!branchId || !canActorManageScope(actor, scope.organizationId, branchId)) {
    redirectWithError(
      redirectPath,
      "Choose a branch that sits inside your allowed oversight scope."
    );
  }

  try {
    createMinistryTeamEntry({
      organizationId: scope.organizationId,
      branchId,
      name,
      lane,
      description,
      leadName,
      contactEmail,
      active,
      capabilities: splitList(getString(formData, "capabilities")),
    });

    recordAuditLog({
      ...buildActorLog(actor, {
        organizationId: scope.organizationId,
        branchId,
      }),
      action: "admin.team_created",
      targetType: "team",
      targetId: lane,
      summary: `${actor.name} created the ${name}.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not create that ministry team.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Created the ${name}.`);
}

export async function updateMinistryTeam(teamId, formData) {
  const actor = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const name = getString(formData, "name");
  const lane = getString(formData, "lane");
  const description = getString(formData, "description");
  const leadName = getString(formData, "leadName");
  const contactEmail = normalizeEmail(getString(formData, "contactEmail"));
  const nextBranchId = getString(formData, "branchId") || "";
  const active = getBoolean(formData, "active");
  const redirectPath = getScopedPath("/teams", scope.preferredBranchId);
  const existingTeam = listMinistryTeams(actor, scope.preferredBranchId).find(
    (team) => team.id === teamId
  );

  if (!name || !lane || !description || !leadName) {
    redirectWithError(redirectPath, "Name, lane, lead, and description are required.");
  }

  if (!existingTeam) {
    redirectWithError(
      redirectPath,
      "That ministry team is outside your current branch scope."
    );
  }

  const branchId = nextBranchId || existingTeam.branchId;

  if (!branchId || !canActorManageScope(actor, existingTeam.organizationId, branchId)) {
    redirectWithError(
      redirectPath,
      "Choose a branch that sits inside your allowed oversight scope."
    );
  }

  try {
    updateMinistryTeamEntry(teamId, {
      name,
      lane,
      description,
      leadName,
      contactEmail,
      active,
      branchId,
      capabilities: splitList(getString(formData, "capabilities")),
    });

    recordAuditLog({
      ...buildActorLog(actor, {
        organizationId: existingTeam.organizationId,
        branchId,
      }),
      action: "admin.team_updated",
      targetType: "team",
      targetId: teamId,
      summary: `${actor.name} updated the ${name}.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not update that ministry team.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Updated the ${name}.`);
}

export async function createBranch(formData) {
  const actor = await requireCurrentUser(["overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const regionId = getString(formData, "regionId");
  const city = getString(formData, "city");
  const state = getString(formData, "state");
  const country = getString(formData, "country");
  const pastorName = getString(formData, "pastorName");
  const supportEmail = normalizeEmail(getString(formData, "supportEmail"));
  const supportPhone = normalizePhoneNumber(getString(formData, "supportPhone"));
  const isHeadquarters = getBoolean(formData, "isHeadquarters");
  const active = getBoolean(formData, "active");
  const redirectPath = getScopedPath("/branches", scope.preferredBranchId);
  const slug = getString(formData, "slug") || `${scope.organizationId}-${code || name}`;

  if (!name || !code) {
    redirectWithError(redirectPath, "Branch name and branch code are required.");
  }

  if (supportEmail && !isValidEmailAddress(supportEmail)) {
    redirectWithError(redirectPath, "Enter a valid branch support email address.");
  }

  if (supportPhone && !isValidMessagingPhone(supportPhone)) {
    redirectWithError(
      redirectPath,
      "Enter the branch support phone in international format, like +2348012345678."
    );
  }

  try {
    createBranchEntry({
      organizationId: scope.organizationId,
      regionId,
      slug,
      code,
      name,
      city,
      state,
      country,
      pastorName,
      supportEmail,
      supportPhone,
      isHeadquarters,
      active,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.branch_created",
      targetType: "branch",
      targetId: code,
      summary: `${actor.name} created the ${name} branch.`,
      metadata: {
        code,
      },
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not create that branch.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Created the ${name} branch.`);
}

export async function updateBranch(branchId, formData) {
  const actor = await requireCurrentUser(["overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const regionId = getString(formData, "regionId");
  const city = getString(formData, "city");
  const state = getString(formData, "state");
  const country = getString(formData, "country");
  const pastorName = getString(formData, "pastorName");
  const supportEmail = normalizeEmail(getString(formData, "supportEmail"));
  const supportPhone = normalizePhoneNumber(getString(formData, "supportPhone"));
  const isHeadquarters = getBoolean(formData, "isHeadquarters");
  const active = getBoolean(formData, "active");
  const redirectPath = getScopedPath("/branches", scope.preferredBranchId);

  if (!name || !code) {
    redirectWithError(redirectPath, "Branch name and branch code are required.");
  }

  if (supportEmail && !isValidEmailAddress(supportEmail)) {
    redirectWithError(redirectPath, "Enter a valid branch support email address.");
  }

  if (supportPhone && !isValidMessagingPhone(supportPhone)) {
    redirectWithError(
      redirectPath,
      "Enter the branch support phone in international format, like +2348012345678."
    );
  }

  try {
    updateBranchEntry(branchId, {
      slug: getString(formData, "slug"),
      code,
      regionId,
      name,
      city,
      state,
      country,
      pastorName,
      supportEmail,
      supportPhone,
      isHeadquarters,
      active,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.branch_updated",
      targetType: "branch",
      targetId: branchId,
      summary: `${actor.name} updated the ${name} branch.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not update that branch.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Updated the ${name} branch.`);
}

export async function saveChurchSettings(formData) {
  const actor = await requireCurrentUser(["owner"]);
  const scope = await getWorkspaceSelection(actor);
  const supportEmail = normalizeEmail(getString(formData, "supportEmail"));
  const billingContactEmail = normalizeEmail(getString(formData, "billingContactEmail"));
  const emailFromAddress = normalizeEmail(getString(formData, "emailFromAddress"));
  const emailReplyTo = normalizeEmail(getString(formData, "emailReplyTo"));
  const smsFromNumber = normalizePhoneNumber(getString(formData, "smsFromNumber"));
  const whatsappFromNumber = normalizePhoneNumber(getString(formData, "whatsappFromNumber"));
  const redirectPath = getScopedPath("/settings", scope.preferredBranchId);

  if (supportEmail && !isValidEmailAddress(supportEmail)) {
    redirectWithError(redirectPath, "Enter a valid support email address.");
  }

  if (billingContactEmail && !isValidEmailAddress(billingContactEmail)) {
    redirectWithError(redirectPath, "Enter a valid billing contact email address.");
  }

  if (emailFromAddress && !isValidEmailAddress(emailFromAddress)) {
    redirectWithError(redirectPath, "Enter a valid sender email address.");
  }

  if (emailReplyTo && !isValidEmailAddress(emailReplyTo)) {
    redirectWithError(redirectPath, "Enter a valid reply-to email address.");
  }

  if (smsFromNumber && !isValidMessagingPhone(smsFromNumber)) {
    redirectWithError(
      redirectPath,
      "Enter the SMS sender number in international format, like +15005550006."
    );
  }

  if (whatsappFromNumber && !isValidMessagingPhone(whatsappFromNumber)) {
    redirectWithError(
      redirectPath,
      "Enter the WhatsApp sender number in international format, like +14155238886."
    );
  }

  try {
    updateChurchSettingsEntry({
      organizationId: scope.organizationId,
      churchName: getString(formData, "churchName"),
      campusName: getString(formData, "campusName"),
      supportEmail,
      supportPhone: getString(formData, "supportPhone"),
      timezone: getString(formData, "timezone"),
      intakeConfirmationText: getString(formData, "intakeConfirmationText"),
      emergencyBanner: getString(formData, "emergencyBanner"),
      planName: getString(formData, "planName"),
      billingContactEmail,
      monthlySeatAllowance: getString(formData, "monthlySeatAllowance"),
      nextRenewalDate: isValidDateTime(getString(formData, "nextRenewalDate"))
        ? new Date(getString(formData, "nextRenewalDate")).toISOString()
        : "",
      backupExpectation: getString(formData, "backupExpectation"),
      emailDeliveryMode: getString(formData, "emailDeliveryMode"),
      emailProvider: getString(formData, "emailProvider"),
      emailFromName: getString(formData, "emailFromName"),
      emailFromAddress,
      emailReplyTo,
      emailSubjectPrefix: getString(formData, "emailSubjectPrefix"),
      messageDeliveryMode: getString(formData, "messageDeliveryMode"),
      messageProvider: getString(formData, "messageProvider"),
      smsFromNumber,
      whatsappFromNumber,
      notificationChannels: splitList(getString(formData, "notificationChannels")),
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.settings_updated",
      targetType: "church_settings",
      targetId: scope.organizationId,
      summary: `${actor.name} updated church settings, billing, and delivery preferences.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not save the church settings.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, "Church settings updated.");
}

export async function updateMemberContactProfile(formData) {
  const trackingCode = getString(formData, "trackingCode").toUpperCase();
  const currentContact = getString(formData, "currentContact");
  const submittedBy = getString(formData, "submittedBy");
  const email = normalizeEmail(getString(formData, "email"));
  const phone = normalizePhoneNumber(getString(formData, "phone"));
  const preferredContact = getString(formData, "preferredContact");
  const redirectPath = buildMemberPortalPath(trackingCode, currentContact);

  if (!trackingCode || !currentContact) {
    redirectWithError("/member", "We could not verify that member access link.");
  }

  if (email && !isValidEmailAddress(email)) {
    redirectWithError(redirectPath, "Enter a valid email address.");
  }

  if (phone && !isValidMessagingPhone(phone)) {
    redirectWithError(
      redirectPath,
      "Enter a phone number in international format, like +2348012345678."
    );
  }

  try {
    const result = await updateMemberContactProfileEntry(trackingCode, currentContact, {
      submittedBy,
      email,
      phone,
      preferredContact,
    });

    recordAuditLog({
      actorName: submittedBy || "Member portal",
      actorRole: "member",
      action: "member.contact_updated",
      targetType: "request",
      targetId: trackingCode,
      summary: `Member contact details were updated from the self-service portal.`,
    });

    revalidateCarePaths();
    redirectWithNotice(
      buildMemberPortalPath(result.trackingCode, result.contactValue),
      "Your contact details were updated."
    );
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not update those contact details.")
    );
  }
}

export async function saveFollowUpPlan(householdSlug, formData) {
  const actor = await requireCurrentUser(["leader", "pastor", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const nextTouchpoint = getString(formData, "nextTouchpoint");

  if (!householdSlug || !isValidDateTime(nextTouchpoint)) {
    redirectWithError("/schedule", "Choose the next follow-up date and time first.");
  }

  try {
    await saveFollowUpPlanEntry(householdSlug, {
      nextTouchpoint,
      owner: getString(formData, "owner"),
      author: actor.name,
      noteKind: getString(formData, "noteKind") || "Follow-up",
      note: getString(formData, "note"),
    }, actor, scope.preferredBranchId);

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "care.follow_up_planned",
      targetType: "household",
      targetId: householdSlug,
      summary: `${actor.name} updated the follow-up plan for a household.`,
      metadata: {
        nextTouchpoint,
      },
    });
  } catch (error) {
    redirectWithError(
      "/schedule",
      getActionErrorMessage(error, "We could not save that follow-up plan.")
    );
  }

  revalidateCarePaths(householdSlug);
  redirectWithNotice("/schedule", "Follow-up plan updated.");
}

export async function sendTestEmail(formData) {
  const actor = await requireCurrentUser(["owner"]);
  const scope = await getWorkspaceSelection(actor);
  const email = normalizeEmail(getString(formData, "email")) || actor.email;
  const note = getString(formData, "note");
  const settings = getChurchSettings(scope.organizationId);
  const redirectPath = getScopedPath("/settings", scope.preferredBranchId);

  if (!email || !isValidEmailAddress(email)) {
    redirectWithError(redirectPath, "Enter a valid email address for the delivery test.");
  }

  await emailAddress(
    email,
    "test-email",
    {
      deliveryMode: settings?.emailDeliveryMode || "log-only",
      provider: settings?.emailProvider || "resend",
      note:
        note ||
        `${actor.name} triggered this test from the owner settings screen.`,
    },
    {
      recipientName: actor.name,
      organizationId: scope.organizationId,
      branchId: scope.branchId,
      metadata: {
        requestedBy: actor.id,
      },
    }
  );

  recordAuditLog({
    ...buildActorLog(actor, scope),
    action: "admin.email_test_sent",
    targetType: "email_outbox",
    targetId: email,
    summary: `${actor.name} queued a delivery test email for ${email}.`,
  });

  revalidateCarePaths();
  redirectWithNotice(
    redirectPath,
    "Test email queued. Check the outbox panel below for the final delivery status."
  );
}

export async function sendTestMessage(formData) {
  const actor = await requireCurrentUser(["owner"]);
  const scope = await getWorkspaceSelection(actor);
  const phone = normalizePhoneNumber(getString(formData, "phone")) || actor.phone;
  const channel = getString(formData, "channel") === "whatsapp" ? "whatsapp" : "sms";
  const note = getString(formData, "note");
  const settings = getChurchSettings(scope.organizationId);
  const redirectPath = getScopedPath("/settings", scope.preferredBranchId);

  if (!phone || !isValidMessagingPhone(phone)) {
    redirectWithError(redirectPath, "Enter a valid phone number for the delivery test.");
  }

  await messagePhone(
    phone,
    channel,
    "test-message",
    {
      deliveryMode: settings?.messageDeliveryMode || "log-only",
      provider: settings?.messageProvider || "twilio",
      note:
        note ||
        `${actor.name} triggered this ${channel} delivery test from the owner settings screen.`,
    },
    {
      recipientName: actor.name,
      organizationId: scope.organizationId,
      branchId: scope.branchId,
      metadata: {
        requestedBy: actor.id,
        channel,
      },
    }
  );

  recordAuditLog({
    ...buildActorLog(actor, scope),
    action: "admin.message_test_sent",
    targetType: "message_outbox",
    targetId: phone,
    summary: `${actor.name} queued a ${channel} delivery test for ${phone}.`,
  });

  revalidateCarePaths();
  redirectWithNotice(
    redirectPath,
    "Test message queued. Check the outbox panel below for the final delivery status."
  );
}

export async function createRegion(formData) {
  const actor = await requireCurrentUser(["overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const slug =
    getString(formData, "slug") ||
    String(name || code)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const description = getString(formData, "description");
  const leadName = getString(formData, "leadName");
  const active = getBoolean(formData, "active");
  const redirectPath = getScopedPath("/regions", scope.preferredBranchId);

  if (!name || !code) {
    redirectWithError(redirectPath, "Region name and region code are required.");
  }

  try {
    createRegionEntry({
      organizationId: scope.organizationId,
      slug,
      code,
      name,
      description,
      leadName,
      active,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.region_created",
      targetType: "region",
      targetId: code,
      summary: `${actor.name} created the ${name} region.`,
      metadata: {
        code,
      },
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not create that region.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Created the ${name} region.`);
}

export async function updateRegion(regionId, formData) {
  const actor = await requireCurrentUser(["overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const slug =
    getString(formData, "slug") ||
    String(name || code)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const description = getString(formData, "description");
  const leadName = getString(formData, "leadName");
  const active = getBoolean(formData, "active");
  const redirectPath = getScopedPath("/regions", scope.preferredBranchId);

  if (!name || !code) {
    redirectWithError(redirectPath, "Region name and region code are required.");
  }

  try {
    updateRegionEntry(regionId, {
      slug,
      code,
      name,
      description,
      leadName,
      active,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.region_updated",
      targetType: "region",
      targetId: regionId,
      summary: `${actor.name} updated the ${name} region.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not update that region.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(redirectPath, `Updated the ${name} region.`);
}

export async function saveBranchSettings(branchId, formData) {
  const actor = await requireCurrentUser(["overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const supportEmail = normalizeEmail(getString(formData, "supportEmail"));
  const emailFromAddress = normalizeEmail(getString(formData, "emailFromAddress"));
  const emailReplyTo = normalizeEmail(getString(formData, "emailReplyTo"));
  const smsFromNumber = normalizePhoneNumber(getString(formData, "smsFromNumber"));
  const whatsappFromNumber = normalizePhoneNumber(getString(formData, "whatsappFromNumber"));
  const redirectPath = getScopedPath("/branches", scope.preferredBranchId);
  const branch = getBranchOverview(actor, "").find((item) => item.id === branchId);

  if (supportEmail && !isValidEmailAddress(supportEmail)) {
    redirectWithError(redirectPath, "Enter a valid branch support email address.");
  }

  if (emailFromAddress && !isValidEmailAddress(emailFromAddress)) {
    redirectWithError(redirectPath, "Enter a valid branch sender email address.");
  }

  if (emailReplyTo && !isValidEmailAddress(emailReplyTo)) {
    redirectWithError(redirectPath, "Enter a valid branch reply-to email address.");
  }

  if (smsFromNumber && !isValidMessagingPhone(smsFromNumber)) {
    redirectWithError(redirectPath, "Enter the branch SMS sender number in international format.");
  }

  if (whatsappFromNumber && !isValidMessagingPhone(whatsappFromNumber)) {
    redirectWithError(
      redirectPath,
      "Enter the branch WhatsApp sender number in international format."
    );
  }

  try {
    updateBranchSettingsEntry({
      organizationId: scope.organizationId,
      branchId,
      supportEmail,
      supportPhone: normalizePhoneNumber(getString(formData, "supportPhone")),
      intakeConfirmationText: getString(formData, "intakeConfirmationText"),
      emergencyBanner: getString(formData, "emergencyBanner"),
      publicIntro: getString(formData, "publicIntro"),
      followUpGuidance: getString(formData, "followUpGuidance"),
      emailFromName: getString(formData, "emailFromName"),
      emailFromAddress,
      emailReplyTo,
      smsFromNumber,
      whatsappFromNumber,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "admin.branch_settings_updated",
      targetType: "branch_settings",
      targetId: branchId,
      summary: `${actor.name} updated branch overrides for ${branch?.name || branchId}.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not save those branch overrides.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice(
    redirectPath,
    `Saved branch overrides for ${branch?.name || "that branch"}.`
  );
}

export async function requestMemberTransfer(householdSlug, formData) {
  const actor = await requireCurrentUser(["leader", "pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const toBranchId = getString(formData, "toBranchId");
  const reason = getString(formData, "reason");
  const note = getString(formData, "note");
  const redirectPath = getScopedPath(`/households/${householdSlug}`, scope.preferredBranchId);

  if (!toBranchId || !reason) {
    redirectWithError(redirectPath, "Choose a destination branch and add a transfer reason.");
  }

  try {
    const transferId = createMemberTransferEntry({
      householdSlug,
      toBranchId,
      reason,
      note,
      actor,
      preferredBranchId: scope.preferredBranchId,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "care.transfer_requested",
      targetType: "member_transfer",
      targetId: transferId,
      summary: `${actor.name} requested a branch transfer for household ${householdSlug}.`,
      metadata: {
        toBranchId,
      },
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not request that branch transfer.")
    );
  }

  revalidateCarePaths(householdSlug);
  redirectWithNotice(redirectPath, "Branch transfer requested.");
}

export async function completeMemberTransfer(transferId, householdSlug) {
  const actor = await requireCurrentUser(["overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const redirectPath = getScopedPath("/transfers", scope.preferredBranchId);

  try {
    completeMemberTransferEntry(transferId, actor, scope.preferredBranchId);

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "care.transfer_completed",
      targetType: "member_transfer",
      targetId: transferId,
      summary: `${actor.name} completed a branch transfer for household ${householdSlug}.`,
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not complete that branch transfer.")
    );
  }

  revalidateCarePaths(householdSlug);
  redirectWithNotice(redirectPath, "Branch transfer completed.");
}

export async function uploadHouseholdAttachment(householdSlug, formData) {
  const actor = await requireCurrentUser(["leader", "pastor", "overseer", "owner"]);
  const scope = await getWorkspaceSelection(actor);
  const redirectPath = getScopedPath(`/households/${householdSlug}`, scope.preferredBranchId);
  const file = formData.get("file");
  const purpose = getString(formData, "purpose");
  const requestId = getString(formData, "requestId");

  try {
    const attachmentId = await saveHouseholdAttachment({
      file,
      householdSlug,
      requestId,
      purpose,
      viewer: actor,
      organizationId: scope.organizationId,
      branchId: scope.preferredBranchId,
    });

    recordAuditLog({
      ...buildActorLog(actor, scope),
      action: "care.attachment_uploaded",
      targetType: "household_attachment",
      targetId: attachmentId,
      summary: `${actor.name} uploaded a household attachment for ${householdSlug}.`,
      metadata: {
        purpose,
      },
    });
  } catch (error) {
    redirectWithError(
      redirectPath,
      getActionErrorMessage(error, "We could not upload that attachment.")
    );
  }

  revalidateCarePaths(householdSlug);
  redirectWithNotice(redirectPath, "Attachment uploaded.");
}
