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

export const runtime = "nodejs";
export const preferredRegion = "home";
export const maxDuration = 300;

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
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const nowMs = nowDate.getTime();

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

  // ── New Member Journey touchpoints ─────────────────────────────────────────

  const JOURNEY_TOUCHPOINTS = [
    { key: "day2",  minHours: 48,  roles: ["volunteer","leader"],            title: "Follow up new member",          body: (name) => `${name} registered 2 days ago. Please make your first contact call or visit.` },
    { key: "day5",  minHours: 120, roles: ["leader","pastor"],               title: "Check in: new member Day 5",    body: (name) => `${name} is 5 days into their welcome journey. Please ensure someone has connected.` },
    { key: "day12", minHours: 288, roles: ["pastor"],                        title: "New member 12-day check",       body: (name) => `${name} has been with us 12 days. A personal check-in from the pastor is recommended.` },
    { key: "day21", minHours: 504, roles: ["pastor","leader"],               title: "New member 21-day review",      body: (name) => `${name} is at Day 21 of their welcome journey. Please assess integration progress.` },
    { key: "day30", minHours: 720, roles: ["pastor","owner","branch_admin"], title: "New member 30-day milestone",   body: (name) => `${name}'s 30-day welcome journey is complete. Please mark them as integrated or review their status.` },
  ];

  const activeJourneys = db.prepare(`
    SELECT * FROM new_member_journeys
    WHERE status = 'active'
    ORDER BY registered_at ASC
  `).all();

  let journeysSent = 0;
  const journeyResults = [];

  for (const journey of activeJourneys) {
    const registeredAt = new Date(journey.registered_at);
    const ageHours = (nowMs - registeredAt.getTime()) / (1000 * 60 * 60);
    const sentTouchpoints = parseJson(journey.touchpoints_sent, []);

    for (const tp of JOURNEY_TOUCHPOINTS) {
      if (ageHours < tp.minHours) continue;
      if (sentTouchpoints.includes(tp.key)) continue;

      const sent = createNotifications({
        organizationId: journey.organization_id,
        branchId: journey.branch_id,
        roles: tp.roles,
        kind: "alert",
        title: tp.title,
        body: tp.body(journey.member_name),
        href: `/new-members/${journey.id}`,
        metadata: { journeyId: journey.id, memberName: journey.member_name, touchpoint: tp.key },
      });

      const updatedTouchpoints = [...sentTouchpoints, tp.key];
      db.prepare(`UPDATE new_member_journeys SET touchpoints_sent = ?, updated_at = ? WHERE id = ?`)
        .run(serializeJson(updatedTouchpoints), now, journey.id);

      journeysSent += sent;
      journeyResults.push({ journeyId: journey.id, memberName: journey.member_name, touchpoint: tp.key, sent });
    }

    // 48-hour escalation: no contact at all after 2 days
    if (ageHours >= 48 && !journey.last_contact_at && !sentTouchpoints.includes("escalate48h")) {
      createNotifications({
        organizationId: journey.organization_id,
        branchId: journey.branch_id,
        roles: ["pastor", "branch_admin"],
        kind: "urgent",
        title: "New member has not been contacted",
        body: `${journey.member_name} registered 48 hours ago and has not been contacted yet. Immediate follow-up needed.`,
        href: `/new-members/${journey.id}`,
        metadata: { journeyId: journey.id, memberName: journey.member_name, touchpoint: "escalate48h" },
      });
      const updatedTouchpoints = [...sentTouchpoints, "escalate48h"];
      db.prepare(`UPDATE new_member_journeys SET touchpoints_sent = ?, updated_at = ? WHERE id = ?`)
        .run(serializeJson(updatedTouchpoints), now, journey.id);
    }
  }

  // ── Sunday Service Reminders ────────────────────────────────────────────────
  // Fire reminders on Thursday (day 4), Saturday (day 6), and Sunday morning (day 0)
  const todayDay = new Date().getDay(); // 0=Sun, 4=Thu, 6=Sat
  const isReminderDay = [0, 4, 6].includes(todayDay);
  let serviceRemindersSent = 0;

  if (isReminderDay) {
    const schedules = db.prepare(`SELECT * FROM service_schedules`).all();
    for (const schedule of schedules) {
      const shouldFire =
        (todayDay === 4 && schedule.reminder_thursday) ||
        (todayDay === 6 && schedule.reminder_saturday) ||
        (todayDay === 0 && schedule.reminder_sunday_morning);

      if (!shouldFire) continue;

      // Only send to new members (active journeys in this branch)
      const newMembers = db.prepare(`
        SELECT id, member_name FROM new_member_journeys
        WHERE organization_id = ? AND branch_id = ? AND status = 'active'
      `).all(schedule.organization_id, schedule.branch_id);

      if (newMembers.length === 0) continue;

      const dayLabel = todayDay === 4 ? "this Sunday" : todayDay === 6 ? "tomorrow" : "today";
      const sent = createNotifications({
        organizationId: schedule.organization_id,
        branchId: schedule.branch_id,
        roles: ["volunteer", "leader", "pastor"],
        kind: "info",
        title: `Reminder: ${schedule.service_name} is ${dayLabel}`,
        body: `${schedule.service_name} is at ${schedule.service_time}${schedule.location ? ` — ${schedule.location}` : ""}. ${newMembers.length} new member(s) may need a personal invite.`,
        href: "/new-members",
      });
      serviceRemindersSent += sent;
    }
  }

  return NextResponse.json({
    ok: true,
    requestsScanned: openRequests.length,
    remindersSent: totalSent,
    details: results,
    journeyTouchpointsSent: journeysSent,
    journeyDetails: journeyResults,
    serviceRemindersSent,
    runAt: now,
  });
}

export async function GET(request) {
  return POST(request);
}
