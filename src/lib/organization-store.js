import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { listUsers } from "@/lib/auth-store";
import { formatDateTime, formatShortDateTime } from "@/lib/care-format";
import { getDashboardData, getOperationsSnapshot, listAuditLogs } from "@/lib/care-store";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";
import { defaultChurchSettings } from "@/lib/organization-defaults";

export const getChurchSettings = cache(function getChurchSettings() {
  const row = getDatabase()
    .prepare(`
      SELECT
        id,
        church_name,
        campus_name,
        support_email,
        support_phone,
        timezone,
        intake_confirmation_text,
        emergency_banner,
        plan_name,
        billing_contact_email,
        monthly_seat_allowance,
        next_renewal_date,
        backup_expectation,
        email_delivery_mode,
        email_provider,
        email_from_name,
        email_from_address,
        email_reply_to,
        email_subject_prefix,
        message_delivery_mode,
        message_provider,
        sms_from_number,
        whatsapp_from_number,
        notification_channels_json,
        updated_at
      FROM church_settings
      WHERE id = 'primary'
      LIMIT 1
    `)
    .get();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    churchName: row.church_name,
    campusName: row.campus_name || "",
    supportEmail: row.support_email || "",
    supportPhone: row.support_phone || "",
    timezone: row.timezone,
    intakeConfirmationText: row.intake_confirmation_text,
    emergencyBanner: row.emergency_banner,
    planName: row.plan_name,
    billingContactEmail: row.billing_contact_email || "",
    monthlySeatAllowance: row.monthly_seat_allowance || "",
    nextRenewalDate: row.next_renewal_date || "",
    backupExpectation: row.backup_expectation || "",
    emailDeliveryMode:
      row.email_delivery_mode || defaultChurchSettings.emailDeliveryMode,
    emailProvider: row.email_provider || defaultChurchSettings.emailProvider,
    emailFromName: row.email_from_name || defaultChurchSettings.emailFromName,
    emailFromAddress:
      row.email_from_address ||
      row.support_email ||
      defaultChurchSettings.emailFromAddress,
    emailReplyTo:
      row.email_reply_to || row.support_email || defaultChurchSettings.emailReplyTo,
    emailSubjectPrefix:
      row.email_subject_prefix || defaultChurchSettings.emailSubjectPrefix,
    messageDeliveryMode:
      row.message_delivery_mode || defaultChurchSettings.messageDeliveryMode,
    messageProvider:
      row.message_provider || defaultChurchSettings.messageProvider,
    smsFromNumber:
      row.sms_from_number || defaultChurchSettings.smsFromNumber,
    whatsappFromNumber:
      row.whatsapp_from_number || defaultChurchSettings.whatsappFromNumber,
    notificationChannels: parseJson(row.notification_channels_json, []),
    updatedAt: row.updated_at,
    updatedLabel: formatDateTime(row.updated_at),
    renewalLabel: formatDateTime(row.next_renewal_date),
  };
});

export function updateChurchSettingsEntry(input) {
  const now = new Date().toISOString();
  const current = getChurchSettings();

  if (!current) {
    throw new Error("Church settings are not available.");
  }

  getDatabase()
    .prepare(`
      UPDATE church_settings
      SET
        church_name = ?,
        campus_name = ?,
        support_email = ?,
        support_phone = ?,
        timezone = ?,
        intake_confirmation_text = ?,
        emergency_banner = ?,
        plan_name = ?,
        billing_contact_email = ?,
        monthly_seat_allowance = ?,
        next_renewal_date = ?,
        backup_expectation = ?,
        email_delivery_mode = ?,
        email_provider = ?,
        email_from_name = ?,
        email_from_address = ?,
        email_reply_to = ?,
        email_subject_prefix = ?,
        message_delivery_mode = ?,
        message_provider = ?,
        sms_from_number = ?,
        whatsapp_from_number = ?,
        notification_channels_json = ?,
        updated_at = ?
      WHERE id = 'primary'
    `)
    .run(
      input.churchName || current.churchName,
      input.campusName || "",
      input.supportEmail || "",
      input.supportPhone || "",
      input.timezone || current.timezone,
      input.intakeConfirmationText || current.intakeConfirmationText,
      input.emergencyBanner || current.emergencyBanner,
      input.planName || current.planName,
      input.billingContactEmail || "",
      input.monthlySeatAllowance || "",
      input.nextRenewalDate || "",
      input.backupExpectation || "",
      input.emailDeliveryMode || current.emailDeliveryMode,
      input.emailProvider || current.emailProvider,
      input.emailFromName || current.emailFromName,
      input.emailFromAddress || current.emailFromAddress,
      input.emailReplyTo || current.emailReplyTo,
      input.emailSubjectPrefix || current.emailSubjectPrefix,
      input.messageDeliveryMode || current.messageDeliveryMode,
      input.messageProvider || current.messageProvider,
      input.smsFromNumber || current.smsFromNumber,
      input.whatsappFromNumber || current.whatsappFromNumber,
      serializeJson(input.notificationChannels || []),
      now
    );
}

export const listMinistryTeams = cache(function listMinistryTeams() {
  const db = getDatabase();
  const teamRows = db.prepare(`
    SELECT
      id,
      name,
      lane,
      description,
      lead_name,
      contact_email,
      active,
      capabilities_json,
      created_at,
      updated_at
    FROM teams
    ORDER BY active DESC, name ASC
  `).all();
  const users = listUsers();
  const requestRows = db.prepare(`
    SELECT owner, status, assigned_volunteer_json
    FROM requests
  `).all();

  return teamRows.map((row) => {
    const volunteers = users.filter(
      (user) => user.active && user.role === "volunteer" && user.lane === row.lane
    );
    const leaders = users.filter(
      (user) => user.active && user.role === "leader" && user.lane === row.lane
    );
    const openRequestCount = requestRows.filter(
      (request) =>
        request.status === "Open" &&
        (request.owner === row.lane || request.owner === row.name)
    ).length;
    const assignedTaskCount = requestRows.filter((request) => {
      if (request.status !== "Open" || !request.assigned_volunteer_json) {
        return false;
      }

      const assignment = parseJson(request.assigned_volunteer_json, null);
      return volunteers.some((volunteer) => volunteer.volunteerName === assignment?.name);
    }).length;

    return {
      id: row.id,
      name: row.name,
      lane: row.lane,
      description: row.description,
      leadName: row.lead_name,
      contactEmail: row.contact_email || "",
      active: row.active === 1,
      capabilities: parseJson(row.capabilities_json, []),
      volunteerCount: volunteers.length,
      leaderCount: leaders.length,
      openRequestCount,
      assignedTaskCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      updatedLabel: formatDateTime(row.updated_at),
      volunteers,
      leaders,
      loadLabel:
        openRequestCount === 0
          ? "Quiet right now"
          : `${openRequestCount} live case${openRequestCount === 1 ? "" : "s"}`,
    };
  });
});

export function createMinistryTeamEntry(input) {
  const now = new Date().toISOString();

  getDatabase()
    .prepare(`
      INSERT INTO teams (
        id, name, lane, description, lead_name, contact_email, active,
        capabilities_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      input.name,
      input.lane,
      input.description,
      input.leadName,
      input.contactEmail || null,
      input.active === false ? 0 : 1,
      serializeJson(input.capabilities || []),
      now,
      now
    );
}

export function updateMinistryTeamEntry(teamId, input) {
  const existing = listMinistryTeams().find((team) => team.id === teamId);
  if (!existing) {
    throw new Error("Team not found.");
  }

  const now = new Date().toISOString();
  getDatabase()
    .prepare(`
      UPDATE teams
      SET
        name = ?,
        lane = ?,
        description = ?,
        lead_name = ?,
        contact_email = ?,
        active = ?,
        capabilities_json = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      input.name || existing.name,
      input.lane || existing.lane,
      input.description || existing.description,
      input.leadName || existing.leadName,
      input.contactEmail || null,
      input.active === undefined ? (existing.active ? 1 : 0) : input.active ? 1 : 0,
      serializeJson(input.capabilities || existing.capabilities),
      now,
      teamId
    );
}

export const listRecoveryRequests = cache(function listRecoveryRequests() {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        email,
        requester_name,
        note,
        status,
        requested_at,
        handled_at,
        handled_by,
        resolution_note
      FROM recovery_requests
      ORDER BY
        CASE status
          WHEN 'open' THEN 0
          WHEN 'issued' THEN 1
          ELSE 2
        END,
        requested_at DESC
    `)
    .all()
    .map((row) => ({
      id: row.id,
      email: row.email,
      requesterName: row.requester_name || "",
      note: row.note || "",
      status: row.status,
      requestedAt: row.requested_at,
      handledAt: row.handled_at || "",
      handledBy: row.handled_by || "",
      resolutionNote: row.resolution_note || "",
      requestedLabel: formatDateTime(row.requested_at),
      handledLabel: formatDateTime(row.handled_at),
    }));
});

export function createRecoveryRequestEntry(input) {
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO recovery_requests (
        id, email, requester_name, note, status, requested_at,
        handled_at, handled_by, resolution_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.email.trim().toLowerCase(),
      input.requesterName || null,
      input.note || null,
      "open",
      new Date().toISOString(),
      null,
      null,
      null
    );

  return id;
}

export function resolveRecoveryRequestEntry(requestId, input) {
  const now = new Date().toISOString();

  getDatabase()
    .prepare(`
      UPDATE recovery_requests
      SET
        status = ?,
        handled_at = ?,
        handled_by = ?,
        resolution_note = ?
      WHERE id = ?
    `)
    .run(
      input.status || "resolved",
      now,
      input.handledBy || "Care admin",
      input.resolutionNote || "",
      requestId
    );
}

export const listVolunteerRoster = cache(function listVolunteerRoster() {
  const db = getDatabase();
  const users = listUsers();
  const requestRows = db.prepare(`
    SELECT assigned_volunteer_json, status
    FROM requests
  `).all();
  const rosterMap = new Map();

  for (const user of users) {
    if (user.role !== "volunteer") {
      continue;
    }

    const volunteerName = user.volunteerName || user.name;
    rosterMap.set(volunteerName, {
      name: volunteerName,
      team: user.lane || "General care volunteers",
      email: user.email,
      lane: user.lane || "",
      active: user.active,
      activeCount: 0,
    });
  }

  for (const row of requestRows) {
    const assignment = parseJson(row.assigned_volunteer_json, null);
    if (!assignment?.name) {
      continue;
    }

    const existing = rosterMap.get(assignment.name) || {
      name: assignment.name,
      team: "Volunteer roster",
      email: "",
      lane: "",
      active: true,
      activeCount: 0,
    };

    if (row.status === "Open") {
      existing.activeCount += 1;
    }

    rosterMap.set(assignment.name, existing);
  }

  return [...rosterMap.values()].sort((first, second) =>
    first.name.localeCompare(second.name)
  );
});

function buildRequestTrend(requests) {
  const buckets = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, {
      key,
      label: day.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
      }),
      count: 0,
    });
  }

  for (const request of requests) {
    const key = String(request.createdAt || "").slice(0, 10);
    if (buckets.has(key)) {
      buckets.get(key).count += 1;
    }
  }

  return [...buckets.values()];
}

function buildOwnerLoad(households) {
  const counts = households.reduce((result, household) => {
    const owner = household.owner || "Unassigned";
    result[owner] = (result[owner] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count);
}

function buildSourceMix(requests) {
  const counts = requests.reduce((result, request) => {
    const source = request.source || "Unknown";
    result[source] = (result[source] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count);
}

function buildAgingBuckets(requests) {
  const now = Date.now();
  const counts = {
    Overdue: 0,
    "Due today": 0,
    "1-3 days": 0,
    "4+ days": 0,
  };

  for (const request of requests.filter((item) => item.status === "Open")) {
    const dueAt = new Date(request.dueAt).valueOf();
    if (Number.isNaN(dueAt)) {
      counts["4+ days"] += 1;
      continue;
    }

    const diffDays = Math.floor((dueAt - now) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) {
      counts.Overdue += 1;
    } else if (diffDays === 0) {
      counts["Due today"] += 1;
    } else if (diffDays <= 3) {
      counts["1-3 days"] += 1;
    } else {
      counts["4+ days"] += 1;
    }
  }

  return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

export async function getOperationalReportData() {
  const [dashboard, settings] = await Promise.all([
    getDashboardData(),
    Promise.resolve(getChurchSettings()),
  ]);
  const users = listUsers();
  const teams = listMinistryTeams();
  const audits = listAuditLogs(40);
  const now = new Date();
  const overdueFollowUps = dashboard.households.filter((household) => {
    const due = new Date(household.nextTouchpoint);
    return !Number.isNaN(due.valueOf()) && due.valueOf() < now.valueOf();
  });
  const needs = dashboard.requests.reduce((result, request) => {
    result[request.need] = (result[request.need] ?? 0) + 1;
    return result;
  }, {});
  const stages = dashboard.households.reduce((result, household) => {
    result[household.stage] = (result[household.stage] ?? 0) + 1;
    return result;
  }, {});

  return {
    settings,
    ops: getOperationsSnapshot(),
    summaryCards: [
      {
        label: "Open care requests",
        value: dashboard.openRequests.length,
        detail: `${overdueFollowUps.length} households need a follow-up touchpoint.`,
      },
      {
        label: "Active volunteers",
        value: users.filter((user) => user.active && user.role === "volunteer").length,
        detail: `${teams.length} ministry teams currently configured.`,
      },
      {
        label: "Resolved requests",
        value: dashboard.requests.filter((request) => request.status === "Closed").length,
        detail: "Closed requests remain in reporting until retention archives them.",
      },
      {
        label: "Recent audit activity",
        value: audits.length,
        detail: "Latest auth and workflow events captured for oversight.",
      },
    ],
    needBreakdown: Object.entries(needs)
      .map(([label, count]) => ({ label, count }))
      .sort((first, second) => second.count - first.count),
    stageBreakdown: Object.entries(stages)
      .map(([label, count]) => ({ label, count }))
      .sort((first, second) => second.count - first.count),
    volunteerLoads: listVolunteerRoster()
      .map((volunteer) => ({
        ...volunteer,
        loadLabel:
          volunteer.activeCount === 0
            ? "Available"
            : `${volunteer.activeCount} active task${volunteer.activeCount === 1 ? "" : "s"}`,
      }))
      .sort((first, second) => second.activeCount - first.activeCount),
    overdueFollowUps: overdueFollowUps.map((household) => ({
      slug: household.slug,
      name: household.name,
      owner: household.owner,
      dueLabel: household.nextTouchpointShortLabel,
    })),
    recentClosures: dashboard.requests
      .filter((request) => request.status === "Closed")
      .slice(0, 6)
      .map((request) => ({
        id: request.id,
        householdName: request.householdName,
        need: request.need,
        closedLabel: request.createdLabel,
      })),
    requestTrend: buildRequestTrend(dashboard.requests),
    ownerLoad: buildOwnerLoad(dashboard.households),
    sourceMix: buildSourceMix(dashboard.requests),
    agingBuckets: buildAgingBuckets(dashboard.requests),
  };
}

export async function buildReportExport(type) {
  const db = getDatabase();

  switch (type) {
    case "households":
      return {
        filename: `households-${Date.now()}.csv`,
        content: toCsv(
          ["Household", "Stage", "Risk", "Owner", "Next touchpoint"],
          db.prepare(`
            SELECT name, stage, risk, owner, next_touchpoint
            FROM households
            ORDER BY name ASC
          `)
            .all()
            .map((row) => [
              row.name,
              row.stage,
              row.risk,
              row.owner,
              formatShortDateTime(row.next_touchpoint),
            ])
        ),
      };
    case "users":
      return {
        filename: `users-${Date.now()}.csv`,
        content: toCsv(
          ["Name", "Email", "Role", "Lane", "Volunteer name", "Active"],
          listUsers().map((user) => [
            user.name,
            user.email,
            user.role,
            user.lane,
            user.volunteerName,
            user.active ? "Yes" : "No",
          ])
        ),
      };
    case "audit":
      return {
        filename: `audit-${Date.now()}.csv`,
        content: toCsv(
          ["When", "Actor", "Role", "Action", "Target", "Summary"],
          listAuditLogs(200).map((entry) => [
            entry.createdAt,
            entry.actorName,
            entry.actorRole,
            entry.action,
            `${entry.targetType}:${entry.targetId}`,
            entry.summary,
          ])
        ),
      };
    case "cases":
    default:
      return {
        filename: `care-cases-${Date.now()}.csv`,
        content: toCsv(
          [
            "Tracking code",
            "Household",
            "Need",
            "Status",
            "Owner",
            "Due",
            "Privacy",
          ],
          db.prepare(`
            SELECT
              tracking_code,
              household_name,
              need,
              status,
              owner,
              due_at,
              privacy_json
            FROM requests
            ORDER BY created_at DESC
          `)
            .all()
            .map((row) => [
              row.tracking_code || "",
              row.household_name,
              row.need,
              row.status,
              row.owner,
              formatShortDateTime(row.due_at),
              parseJson(row.privacy_json, {}).visibility || "",
            ])
        ),
      };
  }
}

function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) =>
    row
      .map((value) => {
        const safe = String(value ?? "");
        if (safe.includes(",") || safe.includes("\"") || safe.includes("\n")) {
          return `"${safe.replace(/"/g, "\"\"")}"`;
        }
        return safe;
      })
      .join(",")
  );

  return `${lines.join("\n")}\n`;
}
