/**
 * POST /api/cron/reminders
 *
 * Follow-up reminder chain — Day 1 / 3 / 5 / 7
 *
 * Trigger this endpoint on a schedule (e.g. every hour via your host's
 * cron, a Vercel cron job, or an external scheduler).
 *
 * Day 1  — request still unassigned         → notify leaders & pastor to assign someone
 * Day 3  — request open, no recent activity → remind assigned volunteer / leaders
 * Day 5  — request still open               → escalate to leader + pastor
 * Day 7  — request still open               → final escalation to pastor
 *
 * Each reminder day fires at most ONCE per request (tracked in
 * requests.reminders_sent_json).  The endpoint is idempotent.
 *
 * Security: protected by CRON_SECRET env variable.
 */

import { NextResponse } from "next/server";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";
import { createNotifications } from "@/lib/notifications-store";

// ── reminder schedule ────────────────────────────────────────────────────────

const REMINDER_DAYS = [1, 3, 5, 7];

/** Hours after request creation at which each reminder fires */
const REMINDER_HOURS = {
  1: 24,
  3: 72,
  5: 120,
  7: 168,
};

/** Roles to notify for each day tier */
const REMINDER_ROLES = {
  1: ["leader", "pastor", "overseer", "owner"],        // Unassigned — ping leaders
  3: ["volunteer", "leader"],                           // Gentle nudge
  5: ["leader", "pastor"],                              // Escalate to leadership
  7: ["pastor", "overseer", "owner"],                   // Final escalation
};

const REMINDER_TITLES = {
  1: "Care request needs assigning",
  3: "Follow-up reminder — Day 3",
  5: "Care request still open — Day 5",
  7: "Urgent: care case unresolved — Day 7",
};

function buildReminderBody(day, request) {
  const name = request.household_name || "A household";
  switch (day) {
    case 1:
      return `${name}'s care request has been open for 24 hours and is not yet assigned. Please assign a volunteer.`;
    case 3:
      return `${name}'s care request is 3 days old and still open. Ensure the assigned volunteer has followed up.`;
    case 5:
      return `${name}'s care request remains unresolved after 5 days. Leadership review recommended.`;
    case 7:
      return `${name}'s care request has been open for 7 days without resolution. Immediate pastoral attention required.`;
    default:
      return `Reminder for ${name}'s care request.`;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function hoursSince(isoDate) {
  if (!isoDate) return 0;
  return (Date.now() - new Date(isoDate).getTime()) / 3_600_000;
}

function getRemindersSent(request) {
  return parseJson(request.reminders_sent_json, []);
}

// ── handler ──────────────────────────────────────────────────────────────────

export async function POST(request) {
  // ── auth ────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  // ── load all open (non-resolved, non-archived) requests ─────────────────
  const openRequests = db
    .prepare(
      `SELECT
        id,
        organization_id,
        branch_id,
        household_name,
        household_slug,
        status,
        tone,
        created_at,
        last_activity_at,
        reminders_sent_json,
        assigned_volunteer_json
      FROM requests
      WHERE status NOT IN ('Resolved', 'Archived', 'Closed')
      ORDER BY created_at ASC`
    )
    .all();

  let totalSent = 0;
  const results = [];

  for (const req of openRequests) {
    const ageHours = hoursSince(req.created_at);
    const sentDays = getRemindersSent(req);

    for (const day of REMINDER_DAYS) {
      const threshold = REMINDER_HOURS[day];
      if (ageHours < threshold) continue;        // not old enough yet
      if (sentDays.includes(day)) continue;      // already sent

      // Day-1 special: only fire if still unassigned
      if (day === 1) {
        const assigned = parseJson(req.assigned_volunteer_json, null);
        if (assigned && assigned.name) continue; // already assigned — skip day-1
      }

      // Build volunteer-name targeting for day-3 nudge
      const assigned = parseJson(req.assigned_volunteer_json, null);
      const volunteerName = assigned?.name || null;

      const notifInput = {
        organizationId: req.organization_id,
        branchId: req.branch_id,
        roles: REMINDER_ROLES[day],
        ...(day === 3 && volunteerName ? { volunteerName } : {}),
        kind: day >= 5 ? "alert" : "reminder",
        title: REMINDER_TITLES[day],
        body: buildReminderBody(day, req),
        href: req.household_slug ? `/households/${req.household_slug}` : "/leader",
        metadata: {
          requestId: req.id,
          reminderDay: day,
          householdName: req.household_name,
        },
      };

      const sent = createNotifications(notifInput);

      // Mark reminder day as sent
      const updatedDays = [...sentDays, day];
      db.prepare(
        `UPDATE requests
         SET reminders_sent_json = ?,
             last_activity_at    = COALESCE(last_activity_at, ?)
         WHERE id = ?`
      ).run(serializeJson(updatedDays), now, req.id);

      totalSent += sent;
      results.push({
        requestId: req.id,
        householdName: req.household_name,
        reminderDay: day,
        notificationsSent: sent,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    requestsScanned: openRequests.length,
    remindersSent: totalSent,
    details: results,
    runAt: now,
  });
}

// Allow GET for quick health-check / manual trigger in development
export async function GET(request) {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    return NextResponse.json({ error: "Use POST in production" }, { status: 405 });
  }
  return POST(request);
}
