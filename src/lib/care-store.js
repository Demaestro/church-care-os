import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { formatDateTime, formatShortDateTime } from "@/lib/care-format";
import { stageDescriptions } from "@/lib/care-copy";
import {
  getDatabase,
  getDatabasePath,
  generateTrackingCode,
  parseJson,
  serializeJson,
  withTransaction,
} from "@/lib/database";
import { intakeRateLimit, retentionPolicy } from "@/lib/policies";

const defaultPrivacyPreference = {
  visibility: "pastors-and-assigned-leads",
  shareWithVolunteers: true,
  allowTextUpdates: true,
};

const defaultRequester = {
  name: "Member",
  email: "",
  phone: "",
  preferredContact: "Follow up requested",
  requestFor: "self",
};

const riskWeights = {
  urgent: 0,
  watch: 1,
  steady: 2,
};

const stageWeights = {
  Assign: 0,
  Stabilize: 1,
  Support: 2,
  Review: 3,
  Escalate: 4,
  Comfort: 5,
};

function normalizeStore(store) {
  return {
    households: Array.isArray(store?.households) ? store.households : [],
    requests: Array.isArray(store?.requests) ? store.requests : [],
  };
}

function sortByDateAsc(first, second) {
  return new Date(first).valueOf() - new Date(second).valueOf();
}

function sortByDateDesc(first, second) {
  return new Date(second).valueOf() - new Date(first).valueOf();
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return Array.from(
      new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))
    );
  }

  if (typeof tags === "string") {
    return Array.from(
      new Set(
        tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeContactValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return `+${digits.slice(1).replace(/[^\d]/g, "")}`;
  }

  return digits.replace(/[^\d]/g, "");
}

function sortRequests(requests) {
  return [...requests].sort((first, second) => {
    if (first.status !== second.status) {
      return first.status === "Open" ? -1 : 1;
    }

    return sortByDateAsc(
      first.dueAt ?? first.createdAt,
      second.dueAt ?? second.createdAt
    );
  });
}

function sortHouseholds(households) {
  return [...households].sort((first, second) => {
    const riskDiff =
      (riskWeights[first.risk] ?? 99) - (riskWeights[second.risk] ?? 99);
    if (riskDiff !== 0) {
      return riskDiff;
    }

    const stageDiff =
      (stageWeights[first.stage] ?? 99) - (stageWeights[second.stage] ?? 99);
    if (stageDiff !== 0) {
      return stageDiff;
    }

    return sortByDateAsc(
      first.nextTouchpoint ?? first.createdAt,
      second.nextTouchpoint ?? second.createdAt
    );
  });
}

function decorateRequest(request) {
  return {
    ...request,
    assignedVolunteer: request.assignedVolunteer
      ? {
          ...request.assignedVolunteer,
          acceptedLabel: formatDateTime(request.assignedVolunteer.acceptedAt),
          completedLabel: formatDateTime(request.assignedVolunteer.completedAt),
        }
      : null,
    escalation: request.escalation ?? null,
    dueLabel: formatDateTime(request.dueAt),
    dueShortLabel: formatShortDateTime(request.dueAt),
    createdLabel: formatDateTime(request.createdAt),
  };
}

function decorateHousehold(household, requests) {
  const relatedRequests = sortRequests(
    requests.filter((request) => request.householdSlug === household.slug)
  ).map(decorateRequest);
  const notes = [...(household.notes ?? [])]
    .sort((first, second) => sortByDateDesc(first.createdAt, second.createdAt))
    .map((note) => ({
      ...note,
      createdLabel: formatDateTime(note.createdAt),
    }));
  const latestNote = notes[0];

  return {
    ...household,
    owner: household.owner || "Unassigned",
    privacyPreference: household.privacyPreference ?? defaultPrivacyPreference,
    tags: normalizeTags(household.tags),
    notes,
    relatedRequests,
    openRequestCount: relatedRequests.filter((request) => request.status === "Open")
      .length,
    nextTouchpointLabel: formatDateTime(household.nextTouchpoint),
    nextTouchpointShortLabel: formatShortDateTime(household.nextTouchpoint),
    lastTouchpointLabel: latestNote
      ? `${latestNote.kind} by ${latestNote.author} on ${formatDateTime(
          latestNote.createdAt
        )}`
      : "No touchpoints recorded yet",
  };
}

function buildSummaryMetrics(households, requests) {
  const openRequests = requests.filter((request) => request.status === "Open");
  const urgentHouseholds = households.filter((household) => household.risk === "urgent");
  const assignedHouseholds = households.filter(
    (household) => household.owner && household.owner !== "Unassigned"
  );
  const followUpReady = households.filter(
    (household) =>
      household.owner &&
      household.owner !== "Unassigned" &&
      household.nextTouchpoint
  );
  const followUpRate = households.length
    ? Math.round((followUpReady.length / households.length) * 100)
    : 0;

  const latestCreatedAt = requests.reduce((latest, request) => {
    const createdAt = new Date(request.createdAt).valueOf();
    return Number.isNaN(createdAt) ? latest : Math.max(latest, createdAt);
  }, Date.now());
  const oneWeekAgo = latestCreatedAt - 7 * 24 * 60 * 60 * 1000;
  const newRequests = requests.filter(
    (request) => new Date(request.createdAt).valueOf() >= oneWeekAgo
  );

  return [
    {
      value: String(openRequests.length).padStart(2, "0"),
      label: "Open requests",
      detail: `${urgentHouseholds.length} households are currently marked urgent.`,
    },
    {
      value: String(newRequests.length).padStart(2, "0"),
      label: "New requests this week",
      detail: "Fresh intake is flowing into one queue instead of separate notes.",
    },
    {
      value: String(assignedHouseholds.length).padStart(2, "0"),
      label: "Households with owners",
      detail: `${households.length - assignedHouseholds.length} still need a named team or lead.`,
    },
    {
      value: `${followUpRate}%`,
      label: "Follow-up pace",
      detail: "Households with both an owner and a visible next touchpoint.",
    },
  ];
}

function buildStageSummaries(households) {
  const counts = households.reduce((result, household) => {
    result[household.stage] = (result[household.stage] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([stage, count]) => ({
      stage,
      count,
      detail: stageDescriptions[stage] ?? "Care work in motion.",
    }))
    .sort((first, second) => second.count - first.count);
}

function buildDashboardData(store) {
  const requests = sortRequests(store.requests).map(decorateRequest);
  const households = sortHouseholds(
    store.households.map((household) => decorateHousehold(household, store.requests))
  );

  return {
    households,
    requests,
    openRequests: requests.filter((request) => request.status === "Open"),
    summaryMetrics: buildSummaryMetrics(households, requests),
    stageSummaries: buildStageSummaries(households),
    pastoralMoments: households
      .filter((household) => household.pastoralNeed)
      .slice(0, 3)
      .map((household) => ({
        ...household.pastoralNeed,
        householdName: household.name,
        risk: household.risk,
      })),
  };
}

function buildHouseholdDetail(store, slug) {
  const household = store.households.find((item) => item.slug === slug);

  if (!household) {
    return null;
  }

  return decorateHousehold(household, store.requests);
}

function readStore() {
  const db = getDatabase();
  const noteRows = db.prepare(`
    SELECT id, household_slug, created_at, author, kind, body
    FROM household_notes
    ORDER BY created_at DESC
  `).all();
  const notesByHousehold = noteRows.reduce((result, row) => {
    const note = {
      id: row.id,
      createdAt: row.created_at,
      author: row.author,
      kind: row.kind,
      body: row.body,
    };

    if (!result[row.household_slug]) {
      result[row.household_slug] = [];
    }

    result[row.household_slug].push(note);
    return result;
  }, {});

  const householdRows = db.prepare(`
    SELECT
      id,
      slug,
      name,
      stage,
      risk,
      situation,
      owner,
      next_touchpoint,
      summary_note,
      tags_json,
      privacy_json,
      pastoral_need_json,
      created_at
    FROM households
  `).all();
  const requestRows = db.prepare(`
    SELECT
      id,
      household_slug,
      household_name,
      need,
      summary,
      owner,
      due_at,
      tone,
      status,
      source,
      created_at,
      requester_json,
      privacy_json,
      tracking_code,
      status_detail,
      assigned_volunteer_json,
      escalation_json
    FROM requests
  `).all();

  return normalizeStore({
    households: householdRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      stage: row.stage,
      risk: row.risk,
      situation: row.situation,
      owner: row.owner,
      nextTouchpoint: row.next_touchpoint,
      summaryNote: row.summary_note,
      tags: parseJson(row.tags_json, []),
      privacyPreference: parseJson(row.privacy_json, defaultPrivacyPreference),
      pastoralNeed: parseJson(row.pastoral_need_json, null),
      createdAt: row.created_at,
      notes: notesByHousehold[row.slug] || [],
    })),
    requests: requestRows.map((row) => ({
      id: row.id,
      householdSlug: row.household_slug,
      householdName: row.household_name,
      need: row.need,
      summary: row.summary,
      owner: row.owner,
      dueAt: row.due_at,
      tone: row.tone,
      status: row.status,
      source: row.source,
      createdAt: row.created_at,
      requester: parseJson(row.requester_json, defaultRequester),
      privacy: parseJson(row.privacy_json, defaultPrivacyPreference),
      trackingCode: row.tracking_code || "",
      statusDetail: row.status_detail || "",
      assignedVolunteer: parseJson(row.assigned_volunteer_json, null),
      escalation: parseJson(row.escalation_json, null),
    })),
  });
}

function getHouseholdRecord(slug) {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        slug,
        name,
        stage,
        risk,
        situation,
        owner,
        next_touchpoint,
        summary_note,
        tags_json,
        privacy_json,
        pastoral_need_json,
        created_at
      FROM households
      WHERE slug = ?
      LIMIT 1
    `)
    .get(slug);
}

function getRequestRecord(id) {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        household_slug,
        household_name,
        need,
        summary,
        owner,
        due_at,
        tone,
        status,
        source,
        created_at,
        requester_json,
        privacy_json,
        tracking_code,
        status_detail,
        assigned_volunteer_json,
        escalation_json
      FROM requests
      WHERE id = ?
      LIMIT 1
    `)
    .get(id);
}

function getRequestRecordByTrackingCode(trackingCode) {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        household_slug,
        household_name,
        need,
        summary,
        owner,
        due_at,
        tone,
        status,
        source,
        created_at,
        requester_json,
        privacy_json,
        tracking_code,
        status_detail,
        assigned_volunteer_json,
        escalation_json
      FROM requests
      WHERE tracking_code = ?
      LIMIT 1
    `)
    .get(trackingCode);
}

function insertHouseholdNote(db, householdSlug, note) {
  db.prepare(`
    INSERT INTO household_notes (
      id, household_slug, created_at, author, kind, body
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    note.id || randomUUID(),
    householdSlug,
    note.createdAt,
    note.author,
    note.kind,
    note.body
  );
}

function mapRequestRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    householdSlug: record.household_slug,
    householdName: record.household_name,
    need: record.need,
    summary: record.summary,
    owner: record.owner,
    dueAt: record.due_at,
    tone: record.tone,
    status: record.status,
    source: record.source,
    createdAt: record.created_at,
    requester: parseJson(record.requester_json, defaultRequester),
    privacy: parseJson(record.privacy_json, defaultPrivacyPreference),
    trackingCode: record.tracking_code || "",
    statusDetail: record.status_detail || "",
    assignedVolunteer: parseJson(record.assigned_volunteer_json, null),
    escalation: parseJson(record.escalation_json, null),
  };
}

function mapHouseholdRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    stage: record.stage,
    risk: record.risk,
    situation: record.situation,
    owner: record.owner,
    nextTouchpoint: record.next_touchpoint,
    summaryNote: record.summary_note,
    tags: parseJson(record.tags_json, []),
    privacyPreference: parseJson(record.privacy_json, defaultPrivacyPreference),
    pastoralNeed: parseJson(record.pastoral_need_json, null),
    createdAt: record.created_at,
  };
}

function buildRequestStatusDetail(request) {
  if (request.status === "Closed") {
    return "Your request has been resolved and logged by the care team.";
  }

  if (request.escalation?.reason) {
    return "A pastor is reviewing the next safe step before any wider handoff.";
  }

  if (request.assignedVolunteer?.name) {
    return "An assigned care team follow-up is now in progress.";
  }

  if (request.owner && request.owner !== "Unassigned") {
    return "Your request has been assigned to a care lead for follow-up.";
  }

  return "Your request has been received and is awaiting pastoral review.";
}

function isSameRequesterContact(request, contactValue) {
  const normalized = normalizeContactValue(contactValue);
  if (!normalized) {
    return false;
  }

  const requesterEmail = normalizeContactValue(request.requester?.email);
  const requesterPhone = normalizeContactValue(request.requester?.phone);

  return normalized === requesterEmail || normalized === requesterPhone;
}

function buildMemberSafeRequest(request, household) {
  const memberState = resolveMemberFacingState(request);
  const householdName =
    request.privacy?.visibility === "pastors-only"
      ? "Private care request"
      : request.householdName;
  const need =
    request.privacy?.visibility === "pastors-only" ? "Private support" : request.need;
  const summary =
    request.privacy?.visibility === "pastors-only"
      ? "A pastor is keeping the details of this request private while follow-up is arranged."
      : request.summary;

  return {
    id: request.id,
    trackingCode: request.trackingCode,
    householdSlug: request.householdSlug,
    householdName,
    need,
    summary,
    statusLabel: memberState.label,
    statusTone: memberState.tone,
    statusDetail: request.statusDetail || buildRequestStatusDetail(request),
    createdLabel: request.createdLabel || formatDateTime(request.createdAt),
    dueLabel: request.dueLabel || formatDateTime(request.dueAt),
    isOpen: request.status === "Open",
    timeline: buildMemberSafeTimeline(request, household),
  };
}

function resolveScheduleBucket(nextTouchpoint, now = new Date()) {
  const target = new Date(nextTouchpoint);
  if (Number.isNaN(target.valueOf())) {
    return {
      bucket: "later",
      bucketLabel: "Later",
    };
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  const nextWeek = new Date(endOfToday);
  nextWeek.setDate(nextWeek.getDate() + 7);

  if (target.valueOf() < startOfToday.valueOf()) {
    return {
      bucket: "overdue",
      bucketLabel: "Overdue",
    };
  }

  if (target.valueOf() <= endOfToday.valueOf()) {
    return {
      bucket: "today",
      bucketLabel: "Today",
    };
  }

  if (target.valueOf() <= nextWeek.valueOf()) {
    return {
      bucket: "this-week",
      bucketLabel: "Next 7 days",
    };
  }

  return {
    bucket: "later",
    bucketLabel: "Later",
  };
}

function buildMemberSafeTimeline(request, household) {
  const events = [
    {
      id: `${request.id}-submitted`,
      label: "Request received",
      detail: "We logged your request and recorded your privacy choices.",
      createdAt: request.createdAt,
      createdLabel: formatDateTime(request.createdAt),
    },
  ];

  if (request.owner && request.owner !== "Unassigned") {
    events.push({
      id: `${request.id}-assigned`,
      label: "Care lead assigned",
      detail:
        request.privacy?.visibility === "pastors-only"
          ? "A pastor or care lead has taken ownership of your request."
          : "Your request is now with a care lead for follow-up.",
      createdAt: request.createdAt,
      createdLabel: formatDateTime(request.createdAt),
    });
  }

  if (request.assignedVolunteer?.name && request.privacy?.shareWithVolunteers !== false) {
    events.push({
      id: `${request.id}-volunteer`,
      label: "Follow-up in progress",
      detail: "A care team follow-up has been assigned and is underway.",
      createdAt: request.assignedVolunteer.assignedAt || request.createdAt,
      createdLabel: formatDateTime(
        request.assignedVolunteer.assignedAt || request.createdAt
      ),
    });
  }

  if (request.escalation?.reason) {
    events.push({
      id: `${request.id}-pastoral`,
      label: "Pastoral review",
      detail:
        "Pastoral staff are reviewing the next safe step for this request before any wider handoff.",
      createdAt: request.escalation.escalatedAt || request.createdAt,
      createdLabel: formatDateTime(
        request.escalation.escalatedAt || request.createdAt
      ),
    });
  }

  if (request.status === "Closed") {
    events.push({
      id: `${request.id}-closed`,
      label: "Request resolved",
      detail: "This request has been marked complete by the care team.",
      createdAt:
        request.assignedVolunteer?.completedAt ||
        household?.notes?.[0]?.createdAt ||
        request.createdAt,
      createdLabel: formatDateTime(
        request.assignedVolunteer?.completedAt ||
          household?.notes?.[0]?.createdAt ||
          request.createdAt
      ),
    });
  }

  return [...events].sort((first, second) =>
    sortByDateDesc(first.createdAt, second.createdAt)
  );
}

function resolveMemberFacingState(request) {
  if (request.status === "Closed") {
    return {
      label: "Resolved",
      tone: "done",
    };
  }

  if (request.assignedVolunteer?.name) {
    return {
      label: "Follow-up active",
      tone: "active",
    };
  }

  if (request.escalation?.reason || request.owner === "Pastoral staff") {
    return {
      label: "Pastoral review",
      tone: "pastoral",
    };
  }

  if (request.owner && request.owner !== "Unassigned") {
    return {
      label: "Assigned",
      tone: "watch",
    };
  }

  return {
    label: "Received",
    tone: "quiet",
  };
}

export const getDashboardData = cache(async function getDashboardData() {
  return buildDashboardData(readStore());
});

export const getHouseholds = cache(async function getHouseholds() {
  const store = readStore();
  return sortHouseholds(
    store.households.map((household) => decorateHousehold(household, store.requests))
  );
});

export const getHouseholdBySlug = cache(async function getHouseholdBySlug(slug) {
  return buildHouseholdDetail(readStore(), slug);
});

export async function getMemberRequestStatusByTrackingCode(trackingCode) {
  const normalizedCode = String(trackingCode || "").trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const requestRecord = getRequestRecordByTrackingCode(normalizedCode);
  const request = mapRequestRecord(requestRecord);

  if (!request) {
    return null;
  }

  const household = buildHouseholdDetail(readStore(), request.householdSlug);
  const memberState = resolveMemberFacingState(request);

  return {
    trackingCode: request.trackingCode,
    householdName:
      request.privacy?.visibility === "pastors-only"
        ? "Private care request"
        : request.householdName,
    need:
      request.privacy?.visibility === "pastors-only" ? "Private support" : request.need,
    summary:
      request.privacy?.visibility === "pastors-only"
        ? "A pastor is keeping the details of this request private while follow-up is arranged."
        : request.summary,
    statusLabel: memberState.label,
    statusTone: memberState.tone,
    statusDetail: request.statusDetail || buildRequestStatusDetail(request),
    createdLabel: request.createdLabel || formatDateTime(request.createdAt),
    dueLabel: request.dueLabel || formatDateTime(request.dueAt),
    privacyLabel:
      request.privacy?.visibility === "pastors-only"
        ? "Visible only to pastor until they decide what should be shared wider."
        : "Visible to pastor and assigned care leads.",
    timeline: buildMemberSafeTimeline(request, household),
  };
}

export async function getMemberPortalData(trackingCode, contactValue) {
  const normalizedCode = String(trackingCode || "").trim().toUpperCase();
  const normalizedContact = normalizeContactValue(contactValue);

  if (!normalizedCode || !normalizedContact) {
    return null;
  }

  const request = mapRequestRecord(getRequestRecordByTrackingCode(normalizedCode));
  if (!request || !isSameRequesterContact(request, normalizedContact)) {
    return null;
  }

  const store = readStore();
  const householdMap = new Map(
    store.households.map((household) => [household.slug, household])
  );
  const matchingRequests = sortRequests(
    store.requests.filter((item) => isSameRequesterContact(item, normalizedContact))
  ).map((item) =>
    buildMemberSafeRequest(item, buildHouseholdDetail(store, item.householdSlug))
  );
  const connectedHouseholds = Array.from(
    new Map(
      matchingRequests.map((item) => [
        item.householdSlug,
        {
          slug: item.householdSlug,
          name: item.householdName,
          openRequests: matchingRequests.filter(
            (requestItem) => requestItem.householdSlug === item.householdSlug && requestItem.isOpen
          ).length,
          lastUpdate:
            householdMap.get(item.householdSlug)?.nextTouchpoint ||
            householdMap.get(item.householdSlug)?.createdAt ||
            "",
        },
      ])
    ).values()
  ).map((item) => ({
    ...item,
    lastUpdateLabel: formatDateTime(item.lastUpdate),
  }));
  const profileSource = request.requester || {};

  return {
    trackingCode: request.trackingCode,
    contactValue: normalizedContact,
    profile: {
      submittedBy: profileSource.name || "",
      email: profileSource.email || "",
      phone: profileSource.phone || "",
      preferredContact: profileSource.preferredContact || "",
    },
    requests: matchingRequests,
    openRequests: matchingRequests.filter((item) => item.isOpen),
    resolvedRequests: matchingRequests.filter((item) => !item.isOpen),
    connectedHouseholds,
  };
}

export async function updateMemberContactProfileEntry(trackingCode, contactValue, updates) {
  const portal = await getMemberPortalData(trackingCode, contactValue);
  if (!portal) {
    throw new Error("We could not verify that member request access.");
  }

  const nextEmail = normalizeContactValue(updates.email || portal.profile.email);
  const nextPhone = normalizeContactValue(updates.phone || portal.profile.phone);
  const nextSubmittedBy = updates.submittedBy || portal.profile.submittedBy;
  const nextPreferredContact = updates.preferredContact || portal.profile.preferredContact;
  const matchValue = portal.contactValue;

  withTransaction((db) => {
    const rows = db.prepare(`
      SELECT id, requester_json
      FROM requests
    `).all();

    for (const row of rows) {
      const requester = parseJson(row.requester_json, defaultRequester);
      const request = {
        requester,
      };

      if (!isSameRequesterContact(request, matchValue)) {
        continue;
      }

      db.prepare(`
        UPDATE requests
        SET requester_json = ?
        WHERE id = ?
      `).run(
        serializeJson({
          ...requester,
          name: nextSubmittedBy,
          email: nextEmail,
          phone: nextPhone,
          preferredContact: nextPreferredContact,
        }),
        row.id
      );
    }
  });

  return {
    trackingCode: portal.trackingCode,
    contactValue: nextEmail || nextPhone || matchValue,
  };
}

export async function getFollowUpScheduleData() {
  const dashboard = await getDashboardData();
  const now = new Date();
  const items = dashboard.households
    .filter((household) => household.nextTouchpoint)
    .map((household) => {
      const scheduleState = resolveScheduleBucket(household.nextTouchpoint, now);
      const openRequest = household.relatedRequests.find((request) => request.status === "Open");

      return {
        householdSlug: household.slug,
        householdName: household.name,
        owner: household.owner || "Unassigned",
        nextTouchpoint: household.nextTouchpoint,
        nextTouchpointLabel: household.nextTouchpointLabel,
        nextTouchpointShortLabel: household.nextTouchpointShortLabel,
        summary: household.summaryNote || household.situation,
        need: openRequest?.need || "Care follow-up",
        openRequestCount: household.openRequestCount,
        bucket: scheduleState.bucket,
        bucketLabel: scheduleState.bucketLabel,
      };
    })
    .sort((first, second) => sortByDateAsc(first.nextTouchpoint, second.nextTouchpoint));

  return {
    summary: {
      overdue: items.filter((item) => item.bucket === "overdue").length,
      today: items.filter((item) => item.bucket === "today").length,
      thisWeek: items.filter((item) => item.bucket === "this-week").length,
      later: items.filter((item) => item.bucket === "later").length,
    },
    items,
  };
}

export async function getCareStoreHealth() {
  const db = getDatabase();
  db.prepare("SELECT 1").get();

  return {
    storeMode: "sqlite",
  };
}

export function listAuditLogs(limit = 60) {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        created_at,
        actor_user_id,
        actor_name,
        actor_role,
        action,
        target_type,
        target_id,
        summary,
        metadata_json
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      summary: row.summary,
      metadata: parseJson(row.metadata_json, {}),
      createdLabel: formatDateTime(row.created_at),
    }));
}

export function recordAuditLog(entry) {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_logs (
      id, created_at, actor_user_id, actor_name, actor_role,
      action, target_type, target_id, summary, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    now,
    entry.actorUserId || null,
    entry.actorName || "System",
    entry.actorRole || "system",
    entry.action,
    entry.targetType,
    entry.targetId,
    entry.summary,
    serializeJson(entry.metadata || {})
  );
}

export function consumeRateLimit(key, config = intakeRateLimit) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT key, count, window_started_at, last_seen_at
    FROM rate_limits
    WHERE key = ?
    LIMIT 1
  `).get(key);

  if (!row) {
    db.prepare(`
      INSERT INTO rate_limits (key, count, window_started_at, last_seen_at)
      VALUES (?, ?, ?, ?)
    `).run(key, 1, now, now);
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
    };
  }

  const windowStartedAt = new Date(row.window_started_at).valueOf();
  const expired =
    Number.isNaN(windowStartedAt) || Date.now() - windowStartedAt > config.windowMs;

  if (expired) {
    db.prepare(`
      UPDATE rate_limits
      SET count = ?, window_started_at = ?, last_seen_at = ?
      WHERE key = ?
    `).run(1, now, now, key);

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
    };
  }

  const nextCount = row.count + 1;
  db.prepare(`
    UPDATE rate_limits
    SET count = ?, last_seen_at = ?
    WHERE key = ?
  `).run(nextCount, now, key);

  return {
    allowed: nextCount <= config.maxAttempts,
    remaining: Math.max(0, config.maxAttempts - nextCount),
  };
}

export function runRetentionSweep() {
  const db = getDatabase();
  const closedCutoff = new Date(
    Date.now() - retentionPolicy.closedRequestArchiveDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const auditCutoff = new Date(
    Date.now() - retentionPolicy.auditLogDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const rateLimitCutoff = new Date(
    Date.now() - retentionPolicy.staleRateLimitDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const staleClosedRequests = db.prepare(`
    SELECT id, household_slug
    FROM requests
    WHERE status = 'Closed' AND created_at < ?
  `).all(closedCutoff);

  withTransaction(() => {
    const archiveInsert = db.prepare(`
      INSERT OR IGNORE INTO request_archive (
        id, request_id, archived_at, request_json
      ) VALUES (?, ?, ?, ?)
    `);
    const archiveRows = db.prepare(`
      SELECT
        id,
        household_slug,
        household_name,
        need,
        summary,
        owner,
        due_at,
        tone,
        status,
        source,
        created_at,
        requester_json,
        privacy_json,
        assigned_volunteer_json,
        escalation_json
      FROM requests
      WHERE status = 'Closed' AND created_at < ?
    `).all(closedCutoff);

    for (const row of archiveRows) {
      archiveInsert.run(
        randomUUID(),
        row.id,
        new Date().toISOString(),
        serializeJson({
          id: row.id,
          householdSlug: row.household_slug,
          householdName: row.household_name,
          need: row.need,
          summary: row.summary,
          owner: row.owner,
          dueAt: row.due_at,
          tone: row.tone,
          status: row.status,
          source: row.source,
          createdAt: row.created_at,
          requester: parseJson(row.requester_json, defaultRequester),
          privacy: parseJson(row.privacy_json, defaultPrivacyPreference),
          assignedVolunteer: parseJson(row.assigned_volunteer_json, null),
          escalation: parseJson(row.escalation_json, null),
        })
      );
    }

    db.prepare(`
      DELETE FROM requests
      WHERE status = 'Closed' AND created_at < ?
    `).run(closedCutoff);
    db.prepare(`
      DELETE FROM audit_logs
      WHERE actor_role = 'system' AND created_at < ?
    `).run(auditCutoff);
    db.prepare(`
      DELETE FROM rate_limits
      WHERE last_seen_at < ?
    `).run(rateLimitCutoff);
  });

  return {
    archivedClosedRequestCount: staleClosedRequests.length,
  };
}

export async function createCareRequestEntry(input) {
  const slug = slugify(input.householdName);
  const now = new Date().toISOString();
  const trackingCode = generateTrackingCode();
  const tags = normalizeTags(input.tags);
  const owner = input.owner || "Unassigned";
  const noteBody =
    input.intakeNote ||
    `New care request logged: ${input.need}. ${input.summary}`;
  const privacyPreference = {
    visibility: input.privacyLevel || "pastors-and-assigned-leads",
    shareWithVolunteers: input.shareWithVolunteers ?? true,
    allowTextUpdates: input.allowTextUpdates ?? true,
  };
  const statusDetail =
    input.statusDetail || "Your request has been received and is awaiting pastoral review.";

  withTransaction((db) => {
    const householdRecord = getHouseholdRecord(slug);

    if (householdRecord) {
      const currentHousehold = mapHouseholdRecord(householdRecord);
      db.prepare(`
        UPDATE households
        SET
          name = ?,
          stage = ?,
          risk = ?,
          situation = ?,
          owner = ?,
          next_touchpoint = ?,
          summary_note = ?,
          tags_json = ?,
          privacy_json = ?,
          pastoral_need_json = ?
        WHERE slug = ?
      `).run(
        input.householdName,
        input.stage || currentHousehold.stage,
        input.risk || currentHousehold.risk,
        input.summary,
        owner || currentHousehold.owner,
        input.dueAt,
        input.intakeNote || currentHousehold.summaryNote,
        serializeJson([...(currentHousehold.tags ?? []), ...tags]),
        serializeJson(privacyPreference),
        serializeJson(
          input.pastoralDetail
            ? {
                title: input.need,
                detail: input.pastoralDetail,
                nextStep:
                  input.pastoralNextStep ||
                  "Review and assign a pastoral follow-up touchpoint.",
              }
            : currentHousehold.pastoralNeed
        ),
        slug
      );
    } else {
      db.prepare(`
        INSERT INTO households (
          id, slug, name, stage, risk, situation, owner, next_touchpoint,
          summary_note, tags_json, privacy_json, pastoral_need_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        slug,
        input.householdName,
        input.stage || "Assign",
        input.risk || "watch",
        input.summary,
        owner,
        input.dueAt,
        input.intakeNote || input.summary,
        serializeJson(tags),
        serializeJson(privacyPreference),
        serializeJson(
          input.pastoralDetail
            ? {
                title: input.need,
                detail: input.pastoralDetail,
                nextStep:
                  input.pastoralNextStep ||
                  "Review and assign a pastoral follow-up touchpoint.",
              }
            : null
        ),
        now
      );
    }

    insertHouseholdNote(db, slug, {
      id: randomUUID(),
      createdAt: now,
      author: "Intake form",
      kind: "Intake",
      body: noteBody,
    });

    db.prepare(`
      INSERT INTO requests (
        id, household_slug, household_name, need, summary, owner, due_at, tone,
        status, source, created_at, requester_json, privacy_json, tracking_code,
        status_detail, assigned_volunteer_json, escalation_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      slug,
      input.householdName,
      input.need,
      input.summary,
      owner,
      input.dueAt,
      input.risk || "watch",
      "Open",
      input.source || "Manual intake",
      now,
      serializeJson({
        name: input.submittedBy || "Member",
        email: input.contactEmail || "",
        phone: input.contactPhone || "",
        preferredContact: input.preferredContact || "Follow up requested",
        requestFor: input.requestFor || "self",
      }),
      serializeJson(privacyPreference),
      trackingCode,
      statusDetail,
      null,
      null
    );
  });

  return {
    householdSlug: slug,
    trackingCode,
  };
}

export async function updateHouseholdSnapshotEntry(slug, updates) {
  const householdRecord = getHouseholdRecord(slug);
  if (!householdRecord) {
    throw new Error("Household not found.");
  }

  const household = mapHouseholdRecord(householdRecord);
  const nextTags = normalizeTags(updates.tags);
  const nextStage = updates.stage || household.stage;
  const nextRisk = updates.risk || household.risk;
  const nextOwner = updates.owner || "Unassigned";
  const nextTouchpoint = updates.nextTouchpoint || household.nextTouchpoint;
  const nextSituation = updates.situation || household.situation;
  const nextSummaryNote = updates.summaryNote || household.summaryNote;
  const nextStatusDetail =
    nextOwner && nextOwner !== "Unassigned"
      ? "Your request has been assigned to a care lead for follow-up."
      : "Your request has been received and is awaiting pastoral review.";

  const changeBits = [];
  if (household.stage !== nextStage) {
    changeBits.push(`stage ${household.stage} -> ${nextStage}`);
  }
  if (household.risk !== nextRisk) {
    changeBits.push(`risk ${household.risk} -> ${nextRisk}`);
  }
  if ((household.owner || "Unassigned") !== nextOwner) {
    changeBits.push(`owner ${(household.owner || "Unassigned")} -> ${nextOwner}`);
  }
  if (household.nextTouchpoint !== nextTouchpoint) {
    changeBits.push(`next touchpoint -> ${formatDateTime(nextTouchpoint)}`);
  }

  withTransaction((db) => {
    db.prepare(`
      UPDATE households
      SET
        stage = ?,
        risk = ?,
        owner = ?,
        next_touchpoint = ?,
        situation = ?,
        summary_note = ?,
        tags_json = ?
      WHERE slug = ?
    `).run(
      nextStage,
      nextRisk,
      nextOwner,
      nextTouchpoint,
      nextSituation,
      nextSummaryNote,
      serializeJson(nextTags),
      slug
    );
    db.prepare(`
      UPDATE requests
      SET owner = ?, status_detail = ?
      WHERE household_slug = ? AND status = 'Open'
    `).run(nextOwner, nextStatusDetail, slug);

    if (changeBits.length > 0) {
      insertHouseholdNote(db, slug, {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        author: "Care board",
        kind: "Update",
        body: `Snapshot updated: ${changeBits.join("; ")}.`,
      });
    }
  });
}

export async function addHouseholdNoteEntry(slug, input) {
  const householdRecord = getHouseholdRecord(slug);
  if (!householdRecord) {
    throw new Error("Household not found.");
  }

  insertHouseholdNote(getDatabase(), slug, {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    author: input.author || "Care team",
    kind: input.kind || "Follow-up",
    body: input.body,
  });
}

export async function saveFollowUpPlanEntry(slug, input) {
  const householdRecord = getHouseholdRecord(slug);
  if (!householdRecord) {
    throw new Error("Household not found.");
  }

  const household = mapHouseholdRecord(householdRecord);
  const nextTouchpoint = input.nextTouchpoint || household.nextTouchpoint;
  const nextOwner = input.owner || household.owner || "Unassigned";

  withTransaction((db) => {
    db.prepare(`
      UPDATE households
      SET next_touchpoint = ?, owner = ?
      WHERE slug = ?
    `).run(nextTouchpoint, nextOwner, slug);

    db.prepare(`
      UPDATE requests
      SET owner = ?
      WHERE household_slug = ? AND status = 'Open'
    `).run(nextOwner, slug);

    insertHouseholdNote(db, slug, {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      author: input.author || "Care scheduler",
      kind: input.noteKind || "Follow-up",
      body:
        input.note ||
        `Follow-up scheduled for ${formatDateTime(nextTouchpoint)}.`,
    });
  });
}

export async function closeCareRequestEntry(requestId, householdSlug) {
  const requestRecord = getRequestRecord(requestId);
  if (!requestRecord) {
    throw new Error("Request not found.");
  }

  withTransaction((db) => {
    db.prepare(`
      UPDATE requests
      SET status = 'Closed',
          status_detail = 'Your request has been resolved and logged by the care team.'
      WHERE id = ?
    `).run(requestId);

    insertHouseholdNote(db, householdSlug, {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      author: "Care board",
      kind: "Closure",
      body: `Closed request: ${requestRecord.need}.`,
    });
  });
}

export async function assignRequestVolunteerEntry(requestId, householdSlug, input) {
  const request = mapRequestRecord(getRequestRecord(requestId));
  const household = mapHouseholdRecord(getHouseholdRecord(householdSlug));

  if (!request) {
    throw new Error("Request not found.");
  }

  if (!input.volunteerName) {
    throw new Error("Volunteer name is required.");
  }

  if (request.privacy?.shareWithVolunteers === false) {
    throw new Error("This request is not cleared for volunteer visibility.");
  }

  const now = new Date().toISOString();
  const assignment = {
    name: input.volunteerName,
    assignedBy: input.assignedBy || "Leader routing view",
    assignedAt: now,
    acceptedAt: request.assignedVolunteer?.acceptedAt || "",
    completedAt: "",
    volunteerBrief:
      input.volunteerBrief ||
      "Follow the leader brief and route questions back to the care lead.",
  };

  withTransaction((db) => {
    db.prepare(`
      UPDATE requests
      SET owner = ?, assigned_volunteer_json = ?, escalation_json = NULL,
          status_detail = 'An assigned care team follow-up is now in progress.'
      WHERE id = ?
    `).run(
      request.owner && request.owner !== "Unassigned"
        ? request.owner
        : input.laneOwner || "Ministry leader",
      serializeJson(assignment),
      requestId
    );

    if (household) {
      db.prepare(`
        UPDATE households
        SET owner = ?, stage = ?
        WHERE slug = ?
      `).run(
        household.owner && household.owner !== "Unassigned"
          ? household.owner
          : input.laneOwner || input.assignedBy || "Ministry leader",
        household.stage === "Assign" ? "Support" : household.stage,
        householdSlug
      );

      insertHouseholdNote(db, householdSlug, {
        id: randomUUID(),
        createdAt: now,
        author: input.assignedBy || "Leader routing view",
        kind: "Coordination",
        body: `Assigned ${input.volunteerName} to ${request.need}. Volunteer brief: ${assignment.volunteerBrief}`,
      });
    }
  });
}

export async function escalateRequestToPastorEntry(requestId, householdSlug, input) {
  const request = mapRequestRecord(getRequestRecord(requestId));
  const household = mapHouseholdRecord(getHouseholdRecord(householdSlug));

  if (!request) {
    throw new Error("Request not found.");
  }

  const now = new Date().toISOString();
  const reason =
    input.reason ||
    "Leader flagged this case for pastoral review before any wider handoff.";
  const escalation = {
    reason,
    escalatedBy: input.escalatedBy || "Leader routing view",
    escalatedAt: now,
  };

  withTransaction((db) => {
    db.prepare(`
      UPDATE requests
      SET owner = 'Pastoral staff',
          assigned_volunteer_json = NULL,
          escalation_json = ?,
          status_detail = 'A pastor is reviewing the next safe step before any wider handoff.'
      WHERE id = ?
    `).run(serializeJson(escalation), requestId);

    if (household) {
      db.prepare(`
        UPDATE households
        SET stage = 'Escalate',
            owner = 'Pastoral staff',
            pastoral_need_json = ?
        WHERE slug = ?
      `).run(
        serializeJson({
          title: request.need,
          detail: reason,
          nextStep:
            input.nextStep ||
            "Pastor Emmanuel to review, contact the household, and decide the next safe handoff.",
        }),
        householdSlug
      );

      insertHouseholdNote(db, householdSlug, {
        id: randomUUID(),
        createdAt: now,
        author: input.escalatedBy || "Leader routing view",
        kind: "Escalation",
        body: `Escalated ${request.need} back to pastor. Reason: ${reason}`,
      });
    }
  });
}

export async function acceptVolunteerTaskEntry(requestId, householdSlug, volunteerName) {
  const request = mapRequestRecord(getRequestRecord(requestId));

  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.status !== "Open") {
    throw new Error("Only open requests can be accepted.");
  }

  if (request.assignedVolunteer?.name !== volunteerName) {
    throw new Error("This request is not assigned to that volunteer.");
  }

  const now = new Date().toISOString();
  const assignment = {
    ...(request.assignedVolunteer ?? {}),
    name: volunteerName,
    acceptedAt: request.assignedVolunteer?.acceptedAt || now,
  };

  withTransaction((db) => {
    db.prepare(`
      UPDATE requests
      SET assigned_volunteer_json = ?,
          status_detail = 'A care team follow-up is actively underway.'
      WHERE id = ?
    `).run(serializeJson(assignment), requestId);

    insertHouseholdNote(db, householdSlug, {
      id: randomUUID(),
      createdAt: now,
      author: volunteerName,
      kind: "Volunteer",
      body: `Accepted volunteer task for ${request.need}.`,
    });
  });
}

export async function declineVolunteerTaskEntry(requestId, householdSlug, input) {
  const request = mapRequestRecord(getRequestRecord(requestId));
  const household = mapHouseholdRecord(getHouseholdRecord(householdSlug));

  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.status !== "Open") {
    throw new Error("Only open requests can be declined.");
  }

  if (request.assignedVolunteer?.name !== input.volunteerName) {
    throw new Error("This request is not assigned to that volunteer.");
  }

  if (request.assignedVolunteer?.acceptedAt) {
    throw new Error("Accepted tasks should be re-routed by a leader.");
  }

  const now = new Date().toISOString();
  const declineReason =
    input.reason ||
    "Volunteer asked for this task to be re-routed before accepting it.";
  const nextOwner =
    household?.owner && household.owner !== "Unassigned"
      ? household.owner
      : input.laneOwner || "Ministry leader";

  withTransaction((db) => {
    db.prepare(`
      UPDATE requests
      SET assigned_volunteer_json = NULL,
          owner = ?,
          status_detail = 'A care lead is re-routing this request after a volunteer handoff change.'
      WHERE id = ?
    `).run(nextOwner, requestId);

    if (household) {
      db.prepare(`
        UPDATE households
        SET owner = ?, stage = ?
        WHERE slug = ?
      `).run(nextOwner, household.stage === "Assign" ? "Assign" : household.stage, householdSlug);
    }

    insertHouseholdNote(db, householdSlug, {
      id: randomUUID(),
      createdAt: now,
      author: input.volunteerName,
      kind: "Volunteer",
      body: `Declined volunteer task for ${request.need}. Reason: ${declineReason}`,
    });
  });
}

export async function completeVolunteerTaskEntry(requestId, householdSlug, volunteerName) {
  const request = mapRequestRecord(getRequestRecord(requestId));
  const household = mapHouseholdRecord(getHouseholdRecord(householdSlug));

  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.assignedVolunteer?.name !== volunteerName) {
    throw new Error("This request is not assigned to that volunteer.");
  }

  const now = new Date().toISOString();
  const assignment = {
    ...(request.assignedVolunteer ?? {}),
    name: volunteerName,
    completedAt: now,
    acceptedAt: request.assignedVolunteer?.acceptedAt || now,
  };

  withTransaction((db) => {
    db.prepare(`
      UPDATE requests
      SET status = 'Closed',
          assigned_volunteer_json = ?,
          status_detail = 'Your request has been resolved and logged by the care team.'
      WHERE id = ?
    `).run(serializeJson(assignment), requestId);

    if (household) {
      db.prepare(`
        UPDATE households
        SET stage = ?
        WHERE slug = ?
      `).run(household.stage === "Assign" ? "Support" : "Review", householdSlug);
    }

    insertHouseholdNote(db, householdSlug, {
      id: randomUUID(),
      createdAt: now,
      author: volunteerName,
      kind: "Volunteer",
      body: `Completed volunteer task for ${request.need}.`,
    });
  });
}

export async function addVolunteerTaskNoteEntry(requestId, householdSlug, input) {
  const request = mapRequestRecord(getRequestRecord(requestId));

  if (!request) {
    throw new Error("Request not found.");
  }

  if (!input.body) {
    throw new Error("A note body is required.");
  }

  if (request.assignedVolunteer?.name !== input.volunteerName) {
    throw new Error("This request is not assigned to that volunteer.");
  }

  const now = new Date().toISOString();
  const assignment = {
    ...(request.assignedVolunteer ?? {}),
    name: input.volunteerName,
    lastNoteAt: now,
  };

  withTransaction((db) => {
    db.prepare(`
      UPDATE requests
      SET assigned_volunteer_json = ?
      WHERE id = ?
    `).run(serializeJson(assignment), requestId);

    insertHouseholdNote(db, householdSlug, {
      id: randomUUID(),
      createdAt: now,
      author: input.volunteerName,
      kind: "Volunteer note",
      body: input.body,
    });
  });
}

export function getOperationsSnapshot() {
  const db = getDatabase();
  const householdCount = db.prepare("SELECT COUNT(*) AS count FROM households").get()
    .count;
  const openRequestCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM requests
    WHERE status = 'Open'
  `).get().count;
  const auditLogCount = db.prepare("SELECT COUNT(*) AS count FROM audit_logs").get()
    .count;

  return {
    databasePath: getDatabasePath(),
    householdCount,
    openRequestCount,
    auditLogCount,
  };
}
