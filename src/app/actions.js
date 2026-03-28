'use server';

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DISPLAY_MODE_COOKIE,
  LANGUAGE_COOKIE,
  getPreferenceCookieOptions,
  normalizeDisplayMode,
  normalizeLanguage,
} from "@/lib/app-preferences";
import {
  authenticateCredentials,
  getUserLandingPage,
  requireCurrentUser,
} from "@/lib/auth";
import {
  createUserEntry,
  findUserByEmail,
  findUserById,
  setUserPasswordEntry,
  toggleUserActiveEntry,
  updateUserEntry,
} from "@/lib/auth-store";
import { formatDateTime } from "@/lib/care-format";
import { createSession, destroySession } from "@/lib/session";
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
  createMinistryTeamEntry,
  createRecoveryRequestEntry,
  getChurchSettings,
  resolveRecoveryRequestEntry,
  updateChurchSettingsEntry,
  updateMinistryTeamEntry,
} from "@/lib/organization-store";
import { getCopy } from "@/lib/i18n";
import {
  createPasswordResetTokenEntry,
  consumePasswordResetTokenEntry,
  getPasswordResetTokenEntry,
  invalidatePasswordResetTokensForUser,
} from "@/lib/password-reset-store";

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
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
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

function buildHouseholdHref(householdSlug) {
  return householdSlug ? `/households/${householdSlug}` : "/";
}

function buildMemberStatusPath(trackingCode) {
  return trackingCode
    ? `/requests/status?code=${encodeURIComponent(trackingCode)}`
    : "/requests/status";
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

function buildActorLog(user) {
  return {
    actorUserId: user.id,
    actorName: user.name,
    actorRole: user.role,
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

function canManageRole(actorRole, role) {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "pastor") {
    return ["leader", "volunteer"].includes(role);
  }

  return false;
}

function assertUserManagement(actor, targetUser, nextRole = targetUser?.role) {
  const currentRole = targetUser?.role || nextRole;
  if (!canManageRole(actor.role, currentRole) || !canManageRole(actor.role, nextRole)) {
    throw new Error("You do not have permission to manage that account.");
  }

  if (targetUser?.id === actor.id && nextRole !== actor.role) {
    throw new Error("You cannot change your own role from this screen.");
  }
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

  await createSession(user);
  recordAuditLog({
    ...buildActorLog(user),
    action: "auth.login",
    targetType: "session",
    targetId: user.id,
    summary: `${user.name} signed in.`,
  });

  redirect(getUserLandingPage(user));
}

export async function logout() {
  const user = await requireCurrentUser(["owner", "pastor", "leader", "volunteer"]);

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
  const contactEmail = allowContact ? rawContactEmail : "";
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
  };
  const settings = getChurchSettings();
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
    (allowContact ? "Follow up through church office" : "No direct contact requested");
  const safeSummary =
    summary || "Member asked for support and chose to share more detail later.";

  const { householdSlug, trackingCode } = await createCareRequestEntry({
    householdName: safeHouseholdName,
    submittedBy: safeSubmittedBy,
    contactEmail,
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
  const nextTouchpoint = getString(formData, "nextTouchpoint");

  await updateHouseholdSnapshotEntry(householdSlug, {
    stage: normalizeStage(getString(formData, "stage")),
    risk: normalizeRisk(getString(formData, "risk")),
    owner: getString(formData, "owner"),
    nextTouchpoint: isValidDateTime(nextTouchpoint) ? nextTouchpoint : "",
    situation: getString(formData, "situation"),
    summaryNote: getString(formData, "summaryNote"),
    tags: getString(formData, "tags"),
  });

  recordAuditLog({
    ...buildActorLog(user),
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
  const body = getString(formData, "body");

  if (!body) {
    redirect(`/households/${householdSlug}`);
  }

  await addHouseholdNoteEntry(householdSlug, {
    author: getString(formData, "author") || user.name,
    kind: getString(formData, "kind"),
    body,
  });

  recordAuditLog({
    ...buildActorLog(user),
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
  await closeCareRequestEntry(requestId, householdSlug);

  recordAuditLog({
    ...buildActorLog(user),
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
  });

  recordAuditLog({
    ...buildActorLog(user),
    action: "care.volunteer_assigned",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} assigned ${volunteerName} to a care request.`,
    metadata: {
      volunteerName,
    },
  });
  notifyVolunteer(volunteerName, {
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
  const reason = getString(formData, "reason");
  const householdName = getString(formData, "householdName") || "Care household";
  const need = getString(formData, "need") || "Care follow-up";

  await escalateRequestToPastorEntry(requestId, householdSlug, {
    reason,
    nextStep: getString(formData, "nextStep"),
    escalatedBy: user.name,
  });

  recordAuditLog({
    ...buildActorLog(user),
    action: "care.request_escalated",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} escalated a request back to pastoral review.`,
    metadata: {
      reason,
    },
  });
  notifyRoles(["pastor", "owner"], {
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
  const actorVolunteerName = resolveVolunteerIdentity(user);

  if (volunteerName !== actorVolunteerName) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  await acceptVolunteerTaskEntry(requestId, householdSlug, actorVolunteerName);

  recordAuditLog({
    ...buildActorLog(user),
    action: "care.volunteer_task_accepted",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} accepted a volunteer task.`,
  });
  notifyRoles(["leader", "pastor", "owner"], {
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
  });

  recordAuditLog({
    ...buildActorLog(user),
    action: "care.volunteer_task_declined",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} declined a volunteer task for re-routing.`,
    metadata: {
      reason,
    },
  });
  notifyRoles(["leader", "pastor", "owner"], {
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
  const actorVolunteerName = resolveVolunteerIdentity(user);

  if (volunteerName !== actorVolunteerName) {
    redirect(buildVolunteerRedirect(actorVolunteerName));
  }

  await completeVolunteerTaskEntry(requestId, householdSlug, actorVolunteerName);

  recordAuditLog({
    ...buildActorLog(user),
    action: "care.volunteer_task_completed",
    targetType: "request",
    targetId: requestId,
    summary: `${user.name} completed a volunteer task.`,
  });
  notifyRoles(["leader", "pastor", "owner"], {
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
  });

  recordAuditLog({
    ...buildActorLog(user),
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
  const redirectTo = getString(formData, "redirectTo") || "/";
  const cookieOptions = getPreferenceCookieOptions();

  cookieStore.set(LANGUAGE_COOKIE, language, cookieOptions);
  cookieStore.set(DISPLAY_MODE_COOKIE, displayMode, cookieOptions);

  redirect(redirectTo);
}

export async function createUserAccount(formData) {
  const actor = await requireCurrentUser(["pastor", "owner"]);
  const name = getString(formData, "name");
  const email = normalizeEmail(getString(formData, "email"));
  const role = getString(formData, "role");
  const lane = getString(formData, "lane");
  const password = getString(formData, "password");
  const volunteerName = getString(formData, "volunteerName") || name;
  const active = getBoolean(formData, "active");

  if (!name || !email || !role || !password) {
    redirectWithError("/admin/users", "Complete the required user fields first.");
  }

  if (!isValidEmailAddress(email)) {
    redirectWithError("/admin/users", "Enter a valid email address for the new account.");
  }

  if (password.length < 8) {
    redirectWithError("/admin/users", "Passwords should be at least 8 characters.");
  }

  if (!["owner", "pastor", "leader", "volunteer"].includes(role)) {
    redirectWithError("/admin/users", "Select a valid role for the new account.");
  }

  try {
    assertUserManagement(actor, null, role);

    const createdUserId = createUserEntry({
      name,
      email,
      role,
      lane,
      password,
      volunteerName: role === "volunteer" ? volunteerName : "",
      active,
    });

    recordAuditLog({
      ...buildActorLog(actor),
      action: "admin.user_created",
      targetType: "user",
      targetId: email,
      summary: `${actor.name} created a ${role} account for ${name}.`,
    });

    createNotifications({
      userIds: [createdUserId],
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
        metadata: {
          role,
        },
      }
    );
  } catch (error) {
    redirectWithError(
      "/admin/users",
      getActionErrorMessage(error, "We could not create that user account.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice("/admin/users", `Created a new ${role} account for ${name}.`);
}

export async function updateUserAccess(userId, formData) {
  const actor = await requireCurrentUser(["pastor", "owner"]);
  const targetUser = findUserById(userId);

  if (!targetUser) {
    redirectWithError("/admin/users", "That account no longer exists.");
  }

  const name = getString(formData, "name");
  const email = normalizeEmail(getString(formData, "email"));
  const role = getString(formData, "role");
  const lane = getString(formData, "lane");
  const volunteerName = getString(formData, "volunteerName") || name;
  const active = getBoolean(formData, "active");

  if (!name || !email || !role) {
    redirectWithError("/admin/users", "Name, email, and role are required.");
  }

  if (!["owner", "pastor", "leader", "volunteer"].includes(role)) {
    redirectWithError("/admin/users", "Select a valid role for that account.");
  }

  if (targetUser.id === actor.id && !active) {
    redirectWithError("/admin/users", "You cannot deactivate your own account.");
  }

  try {
    assertUserManagement(actor, targetUser, role);

    updateUserEntry(userId, {
      name,
      email,
      role,
      lane,
      volunteerName: role === "volunteer" ? volunteerName : "",
      active,
    });

    recordAuditLog({
      ...buildActorLog(actor),
      action: "admin.user_updated",
      targetType: "user",
      targetId: userId,
      summary: `${actor.name} updated access for ${name}.`,
      metadata: {
        role,
        active,
      },
    });
  } catch (error) {
    redirectWithError(
      "/admin/users",
      getActionErrorMessage(error, "We could not update that account.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice("/admin/users", `Updated access for ${name}.`);
}

export async function resetUserPassword(userId, formData) {
  const actor = await requireCurrentUser(["pastor", "owner"]);
  const targetUser = findUserById(userId);

  if (!targetUser) {
    redirectWithError("/admin/users", "That account no longer exists.");
  }

  const password = getString(formData, "password");
  const recoveryRequestId = getString(formData, "recoveryRequestId");
  const resolutionNote = getString(formData, "resolutionNote");

  if (!password) {
    redirectWithError("/admin/users", "Enter a new password before you reset it.");
  }

  if (password.length < 8) {
    redirectWithError("/admin/users", "Passwords should be at least 8 characters.");
  }

  try {
    assertUserManagement(actor, targetUser, targetUser.role);
    setUserPasswordEntry(userId, password);
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
      ...buildActorLog(actor),
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
        metadata: {
          recoveryRequestId,
        },
      }
    );
  } catch (error) {
    redirectWithError(
      "/admin/users",
      getActionErrorMessage(error, "We could not reset that password.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice("/admin/users", `Password updated for ${targetUser.name}.`);
}

export async function markNotificationRead(notificationId, href = "") {
  const user = await requireCurrentUser(["volunteer", "leader", "pastor", "owner"]);

  markNotificationReadEntry(notificationId, user.id);
  revalidateCarePaths();

  redirect(href || "/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireCurrentUser(["volunteer", "leader", "pastor", "owner"]);

  markAllNotificationsReadEntry(user.id);
  revalidateCarePaths();

  redirect("/notifications");
}

export async function resolveRecoveryRequest(requestId, formData) {
  const actor = await requireCurrentUser(["pastor", "owner"]);
  const status = getString(formData, "status") || "resolved";
  const resolutionNote = getString(formData, "resolutionNote");

  try {
    resolveRecoveryRequestEntry(requestId, {
      status,
      handledBy: actor.name,
      resolutionNote,
    });

    recordAuditLog({
      ...buildActorLog(actor),
      action: "admin.recovery_request_resolved",
      targetType: "recovery_request",
      targetId: requestId,
      summary: `${actor.name} marked a recovery request as ${status}.`,
    });
  } catch (error) {
    redirectWithError(
      "/admin/users",
      getActionErrorMessage(error, "We could not update that recovery request.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice("/admin/users", "Recovery request updated.");
}

export async function createMinistryTeam(formData) {
  const actor = await requireCurrentUser(["pastor", "owner"]);
  const name = getString(formData, "name");
  const lane = getString(formData, "lane");
  const description = getString(formData, "description");
  const leadName = getString(formData, "leadName") || actor.name;
  const contactEmail = normalizeEmail(getString(formData, "contactEmail"));
  const active = getBoolean(formData, "active");

  if (!name || !lane || !description) {
    redirectWithError("/teams", "Name, lane, and description are required.");
  }

  try {
    createMinistryTeamEntry({
      name,
      lane,
      description,
      leadName,
      contactEmail,
      active,
      capabilities: splitList(getString(formData, "capabilities")),
    });

    recordAuditLog({
      ...buildActorLog(actor),
      action: "admin.team_created",
      targetType: "team",
      targetId: lane,
      summary: `${actor.name} created the ${name}.`,
    });
  } catch (error) {
    redirectWithError(
      "/teams",
      getActionErrorMessage(error, "We could not create that ministry team.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice("/teams", `Created the ${name}.`);
}

export async function updateMinistryTeam(teamId, formData) {
  const actor = await requireCurrentUser(["pastor", "owner"]);
  const name = getString(formData, "name");
  const lane = getString(formData, "lane");
  const description = getString(formData, "description");
  const leadName = getString(formData, "leadName");
  const contactEmail = normalizeEmail(getString(formData, "contactEmail"));
  const active = getBoolean(formData, "active");

  if (!name || !lane || !description || !leadName) {
    redirectWithError("/teams", "Name, lane, lead, and description are required.");
  }

  try {
    updateMinistryTeamEntry(teamId, {
      name,
      lane,
      description,
      leadName,
      contactEmail,
      active,
      capabilities: splitList(getString(formData, "capabilities")),
    });

    recordAuditLog({
      ...buildActorLog(actor),
      action: "admin.team_updated",
      targetType: "team",
      targetId: teamId,
      summary: `${actor.name} updated the ${name}.`,
    });
  } catch (error) {
    redirectWithError(
      "/teams",
      getActionErrorMessage(error, "We could not update that ministry team.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice("/teams", `Updated the ${name}.`);
}

export async function saveChurchSettings(formData) {
  const actor = await requireCurrentUser(["owner"]);
  const supportEmail = normalizeEmail(getString(formData, "supportEmail"));
  const billingContactEmail = normalizeEmail(getString(formData, "billingContactEmail"));
  const emailFromAddress = normalizeEmail(getString(formData, "emailFromAddress"));
  const emailReplyTo = normalizeEmail(getString(formData, "emailReplyTo"));

  if (supportEmail && !isValidEmailAddress(supportEmail)) {
    redirectWithError("/settings", "Enter a valid support email address.");
  }

  if (billingContactEmail && !isValidEmailAddress(billingContactEmail)) {
    redirectWithError("/settings", "Enter a valid billing contact email address.");
  }

  if (emailFromAddress && !isValidEmailAddress(emailFromAddress)) {
    redirectWithError("/settings", "Enter a valid sender email address.");
  }

  if (emailReplyTo && !isValidEmailAddress(emailReplyTo)) {
    redirectWithError("/settings", "Enter a valid reply-to email address.");
  }

  try {
    updateChurchSettingsEntry({
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
      notificationChannels: splitList(getString(formData, "notificationChannels")),
    });

    recordAuditLog({
      ...buildActorLog(actor),
      action: "admin.settings_updated",
      targetType: "church_settings",
      targetId: "primary",
      summary: `${actor.name} updated church settings, billing, and email preferences.`,
    });
  } catch (error) {
    redirectWithError(
      "/settings",
      getActionErrorMessage(error, "We could not save the church settings.")
    );
  }

  revalidateCarePaths();
  redirectWithNotice("/settings", "Church settings updated.");
}

export async function sendTestEmail(formData) {
  const actor = await requireCurrentUser(["owner"]);
  const email = normalizeEmail(getString(formData, "email")) || actor.email;
  const note = getString(formData, "note");
  const settings = getChurchSettings();

  if (!email || !isValidEmailAddress(email)) {
    redirectWithError("/settings", "Enter a valid email address for the delivery test.");
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
      metadata: {
        requestedBy: actor.id,
      },
    }
  );

  recordAuditLog({
    ...buildActorLog(actor),
    action: "admin.email_test_sent",
    targetType: "email_outbox",
    targetId: email,
    summary: `${actor.name} queued a delivery test email for ${email}.`,
  });

  revalidateCarePaths();
  redirectWithNotice(
    "/settings",
    "Test email queued. Check the outbox panel below for the final delivery status."
  );
}
