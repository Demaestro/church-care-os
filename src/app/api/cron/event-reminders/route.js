/**
 * POST /api/cron/event-reminders
 *
 * Smart event reminder chain — fires daily.
 * Sends in-app notifications to all staff+members:
 *   5 days before → "5 days to [Event]"
 *   4 days before → "4 days to [Event]"
 *   3 days before → "3 days to [Event]"
 *   2 days before → "2 days to [Event]"
 *   1 day before  → "Tomorrow: [Event]"
 *   Day of        → "Today: [Event] is happening!"
 *
 * Each reminder fires at most ONCE per event per day (tracked in
 * ministry_events via a reminders_sent column).
 *
 * Security: protected by CRON_SECRET env variable.
 */

import { NextResponse } from "next/server";
import { safeEqualValue } from "@/lib/auth-crypto";
import { getDatabase } from "@/lib/database";
import { createNotifications } from "@/lib/notifications-store";

export const runtime = "nodejs";
export const preferredRegion = "home";
export const maxDuration = 120;

function getAuthorizationFailure(request) {
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
      : null;
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token || !safeEqualValue(token, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}

function buildNotificationContent(daysUntil, eventTitle, eventTime, eventLocation) {
  const locationStr = eventLocation ? ` · ${eventLocation}` : "";
  const timeStr = eventTime ? ` at ${eventTime}` : "";

  if (daysUntil === 0) {
    return {
      title: `Today: ${eventTitle}`,
      body: `${eventTitle} is happening today${timeStr}${locationStr}. See you there!`,
    };
  }
  if (daysUntil === 1) {
    return {
      title: `Tomorrow: ${eventTitle}`,
      body: `${eventTitle} is tomorrow${timeStr}${locationStr}. Don't miss it!`,
    };
  }
  return {
    title: `${daysUntil} days to ${eventTitle}`,
    body: `${eventTitle} is in ${daysUntil} days${timeStr}${locationStr}. Mark your calendar!`,
  };
}

export async function POST(request) {
  const authFailure = getAuthorizationFailure(request);
  if (authFailure) return authFailure;

  try {
    const db = getDatabase();

    // Ensure reminders_sent_json column exists (graceful migration)
    try {
      db.prepare(`ALTER TABLE ministry_events ADD COLUMN reminders_sent_json TEXT NOT NULL DEFAULT '{}'`).run();
    } catch {}

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Find events within the next 5 days (inclusive of today)
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 5);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const events = db.prepare(`
      SELECT id, organization_id, branch_id, title, event_type, event_date, event_time, location, reminders_sent_json
      FROM ministry_events
      WHERE event_date >= ?
        AND event_date <= ?
      ORDER BY event_date ASC
    `).all(todayStr, cutoffStr);

    let totalSent = 0;

    for (const ev of events) {
      const target = new Date(ev.event_date);
      target.setHours(0, 0, 0, 0);
      const today0 = new Date(now);
      today0.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((target - today0) / 86400000);

      // Only fire for 0–5 days out
      if (daysUntil < 0 || daysUntil > 5) continue;

      const reminderKey = `day_${daysUntil}`;
      let sent = {};
      try { sent = JSON.parse(ev.reminders_sent_json || "{}"); } catch {}

      // Already sent for this day → skip
      if (sent[reminderKey]) continue;

      const { title, body } = buildNotificationContent(
        daysUntil,
        ev.title,
        ev.event_time,
        ev.location
      );

      // Notify all active staff and members in the org
      const count = createNotifications({
        organizationId: ev.organization_id,
        branchId: ev.branch_id || undefined,
        allowCrossBranch: true,
        roles: ["owner", "pastor", "leader", "volunteer", "member"],
        kind: "event_reminder",
        title,
        body,
        href: "/calendar",
        metadata: {
          eventId: ev.id,
          eventType: ev.event_type,
          eventDate: ev.event_date,
          daysUntil,
        },
      });

      // Mark this day's reminder as sent
      sent[reminderKey] = new Date().toISOString();
      db.prepare(`
        UPDATE ministry_events SET reminders_sent_json = ? WHERE id = ?
      `).run(JSON.stringify(sent), ev.id);

      totalSent += count;
    }

    return NextResponse.json({
      ok: true,
      eventsChecked: events.length,
      notificationsSent: totalSent,
      runAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[event-reminders]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
