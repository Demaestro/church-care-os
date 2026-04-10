/**
 * GET /api/events/upcoming
 *
 * Returns the next ministry event that is within 2 days from now.
 * Used by the EventCountdown banner component.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDatabase();

    // 2 days from now (inclusive of today)
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 2);

    const todayStr = now.toISOString().split("T")[0];
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const event = db.prepare(`
      SELECT id, title, description, event_type, event_date, event_time, location
      FROM ministry_events
      WHERE event_date >= ?
        AND event_date <= ?
      ORDER BY event_date ASC, event_time ASC
      LIMIT 1
    `).get(todayStr, cutoffStr);

    if (!event) {
      return NextResponse.json({ event: null });
    }

    // Check if event has already passed today (if event_time is set and it's today)
    if (event.event_date === todayStr && event.event_time) {
      const [h, m] = event.event_time.split(":").map(Number);
      const eventTs = new Date();
      eventTs.setHours(h, m, 0, 0);
      if (eventTs < now) {
        return NextResponse.json({ event: null });
      }
    }

    return NextResponse.json({ event });
  } catch (err) {
    return NextResponse.json({ event: null });
  }
}
