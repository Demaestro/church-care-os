'use server';

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  authenticateCredentials,
  getUserLandingPage,
  requireCurrentUser,
} from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import {
  addHouseholdNoteEntry,
  addVolunteerTaskNoteEntry,
  assignRequestVolunteerEntry,
  closeCareRequestEntry,
  completeVolunteerTaskEntry,
  consumeRateLimit,
  createCareRequestEntry,
  escalateRequestToPastorEntry,
  recordAuditLog,
  updateHouseholdSnapshotEntry,
  acceptVolunteerTaskEntry,
} from "@/lib/care-store";

function getString(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData, key) {
  return formData.get(key) === "on";
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
  revalidatePath("/leader");
  revalidatePath("/households");
  revalidatePath("/volunteer");
  revalidatePath("/audit");
  revalidatePath("/requests/new");

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

export async function login(prevState, formData) {
  void prevState;

  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const errors = {};

  if (!email) {
    errors.email = "Enter the email tied to your care team account.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: "Please correct the highlighted fields and try again.",
      errors,
    };
  }

  const user = await authenticateCredentials(email, password);
  if (!user) {
    return {
      message: "We couldn't sign you in with those credentials.",
      errors: {
        email: "Check your email and password, then try again.",
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

  const responseWindow = getString(formData, "responseWindow") || "48-hours";
  const responsePlan = resolveResponseWindow(responseWindow);
  const keepNamePrivate = getBoolean(formData, "keepNamePrivate");
  const markSensitive = getBoolean(formData, "markSensitive");
  const allowContact = getBoolean(formData, "allowContact");
  const submittedBy = getString(formData, "submittedBy");
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
  };

  const errors = {};

  if (!need) {
    errors.need = "Describe the kind of care that would help most right now.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: "Please correct the highlighted fields and try again.",
      errors,
      values,
      submitted: false,
    };
  }

  if (honeypot) {
    return {
      message:
        "Your request has been received. A pastor or assigned care leader will review it and follow up using the contact method you provided.",
      errors: {},
      values: {},
      submitted: true,
    };
  }

  const rateLimit = consumeRateLimit(await getRequestFingerprint());
  if (!rateLimit.allowed) {
    return {
      message:
        "We have received several requests from this connection in a short window. Please wait a little and try again.",
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
    (allowContact ? "Follow up through church office" : "No direct contact requested");
  const safeSummary =
    summary || "Member asked for support and chose to share more detail later.";

  const householdSlug = await createCareRequestEntry({
    householdName: safeHouseholdName,
    submittedBy: safeSubmittedBy,
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
    targetType: "household",
    targetId: householdSlug,
    summary: `New care request submitted for ${safeHouseholdName}.`,
    metadata: {
      privacyLevel,
      allowContact,
      keepNamePrivate,
      markSensitive,
    },
  });

  revalidateCarePaths(householdSlug);

  return {
    message:
      "Your request has been received. A pastor or assigned care leader will review it and follow up using the contact method you provided.",
    errors: {},
    values: {},
    submitted: true,
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

  await assignRequestVolunteerEntry(requestId, householdSlug, {
    volunteerName,
    volunteerBrief: getString(formData, "volunteerBrief"),
    assignedBy: user.name,
    laneOwner: getString(formData, "laneOwner") || user.lane || "Mercy & welfare lane",
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

  revalidateCarePaths(householdSlug);
  redirect("/leader");
}

export async function escalateRequestToPastor(requestId, householdSlug, formData) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const reason = getString(formData, "reason");

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

  revalidateCarePaths(householdSlug);
  redirect(buildVolunteerRedirect(actorVolunteerName));
}
