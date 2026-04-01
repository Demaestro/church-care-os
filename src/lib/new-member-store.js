import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";
import { defaultPrimaryOrganizationId as DEFAULT_ORGANIZATION_ID, defaultPrimaryBranchId as DEFAULT_BRANCH_ID } from "@/lib/organization-defaults";

// ── Journey CRUD ─────────────────────────────────────────────────────────────

export function createJourneyEntry(input) {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO new_member_journeys (
      id, organization_id, branch_id, member_name, member_email,
      member_phone, gender, birthday, assigned_volunteer_id,
      assigned_volunteer_name, stage, touchpoints_sent_json,
      contact_count, last_contact_at, notes, sunday_attendance_count,
      registered_at, completed_at, dropped_at, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    input.organizationId || DEFAULT_ORGANIZATION_ID,
    input.branchId || DEFAULT_BRANCH_ID,
    input.memberName || "New Member",
    input.memberEmail || null,
    input.memberPhone || null,
    input.gender || "unspecified",
    input.birthday || null,
    input.assignedVolunteerId || null,
    input.assignedVolunteerName || null,
    "day_0",
    "[]",
    0,
    null,
    input.notes || null,
    0,
    now,
    null,
    null,
    now
  );
  return id;
}

export function listJourneys(organizationId, branchId, options = {}) {
  const db = getDatabase();
  const { stage, limit = 100 } = options;
  const rows = db.prepare(`
    SELECT * FROM new_member_journeys
    WHERE organization_id = ?
      AND (? IS NULL OR branch_id = ?)
      AND (? IS NULL OR stage = ?)
      AND dropped_at IS NULL
    ORDER BY registered_at DESC
    LIMIT ?
  `).all(
    organizationId || DEFAULT_ORGANIZATION_ID,
    branchId || null, branchId || null,
    stage || null, stage || null,
    limit
  );
  return rows.map(mapJourneyRow);
}

export function getJourneyById(id) {
  const row = getDatabase().prepare(
    `SELECT * FROM new_member_journeys WHERE id = ?`
  ).get(id);
  return row ? mapJourneyRow(row) : null;
}

export function updateJourneyStage(id, stage) {
  getDatabase().prepare(
    `UPDATE new_member_journeys SET stage = ? WHERE id = ?`
  ).run(stage, id);
}

export function markTouchpointSent(id, touchpoint) {
  const row = getDatabase().prepare(
    `SELECT touchpoints_sent_json FROM new_member_journeys WHERE id = ?`
  ).get(id);
  if (!row) return;
  const sent = parseJson(row.touchpoints_sent_json, []);
  if (!sent.includes(touchpoint)) {
    getDatabase().prepare(
      `UPDATE new_member_journeys SET touchpoints_sent_json = ?, stage = ? WHERE id = ?`
    ).run(serializeJson([...sent, touchpoint]), touchpoint, id);
  }
}

export function incrementSundayAttendance(id) {
  getDatabase().prepare(
    `UPDATE new_member_journeys SET sunday_attendance_count = sunday_attendance_count + 1 WHERE id = ?`
  ).run(id);
}

export function completeJourney(id) {
  getDatabase().prepare(
    `UPDATE new_member_journeys SET completed_at = ?, stage = 'completed' WHERE id = ?`
  ).run(new Date().toISOString(), id);
}

export function dropJourney(id, reason = "") {
  getDatabase().prepare(
    `UPDATE new_member_journeys SET dropped_at = ?, stage = 'dropped', notes = COALESCE(notes || ' | ', '') || ? WHERE id = ?`
  ).run(new Date().toISOString(), reason, id);
}

// ── Contact log ──────────────────────────────────────────────────────────────

export function logJourneyContact(input) {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO journey_contacts (
      id, organization_id, branch_id, journey_id,
      contacted_by_user_id, contacted_by_name,
      contact_method, outcome, notes, contacted_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    input.organizationId || DEFAULT_ORGANIZATION_ID,
    input.branchId || DEFAULT_BRANCH_ID,
    input.journeyId,
    input.contactedByUserId || null,
    input.contactedByName || "Staff",
    input.contactMethod || "call",
    input.outcome || "reached",
    input.notes || null,
    now
  );
  // Update journey counters
  db.prepare(`
    UPDATE new_member_journeys
    SET contact_count = contact_count + 1,
        last_contact_at = ?
    WHERE id = ?
  `).run(now, input.journeyId);
  return id;
}

export function listJourneyContacts(journeyId) {
  return getDatabase().prepare(`
    SELECT * FROM journey_contacts WHERE journey_id = ? ORDER BY contacted_at DESC
  `).all(journeyId).map(row => ({
    id: row.id,
    journeyId: row.journey_id,
    contactedByName: row.contacted_by_name,
    contactMethod: row.contact_method,
    outcome: row.outcome,
    notes: row.notes,
    contactedAt: row.contacted_at,
  }));
}

// ── Service schedule ─────────────────────────────────────────────────────────

export function getServiceSchedule(organizationId, branchId) {
  return getDatabase().prepare(`
    SELECT * FROM service_schedules
    WHERE organization_id = ? AND branch_id = ? AND active = 1
    ORDER BY created_at ASC LIMIT 1
  `).get(
    organizationId || DEFAULT_ORGANIZATION_ID,
    branchId || DEFAULT_BRANCH_ID
  ) || null;
}

export function upsertServiceSchedule(input) {
  const db = getDatabase();
  const existing = getServiceSchedule(input.organizationId, input.branchId);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(`
      UPDATE service_schedules SET
        service_name = ?, day_of_week = ?, service_time = ?,
        location = ?, address = ?,
        reminder_thursday = ?, reminder_saturday = ?, reminder_sunday_morning = ?,
        active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.serviceName || "Sunday Service",
      input.dayOfWeek ?? 0,
      input.serviceTime || "09:00",
      input.location || null,
      input.address || null,
      input.reminderThursday ? 1 : 0,
      input.reminderSaturday ? 1 : 0,
      input.reminderSundayMorning ? 1 : 0,
      1, now,
      existing.id
    );
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(`
    INSERT INTO service_schedules (
      id, organization_id, branch_id, service_name, day_of_week,
      service_time, location, address,
      reminder_thursday, reminder_saturday, reminder_sunday_morning,
      active, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    input.organizationId || DEFAULT_ORGANIZATION_ID,
    input.branchId || DEFAULT_BRANCH_ID,
    input.serviceName || "Sunday Service",
    input.dayOfWeek ?? 0,
    input.serviceTime || "09:00",
    input.location || null,
    input.address || null,
    input.reminderThursday ? 1 : 0,
    input.reminderSaturday ? 1 : 0,
    input.reminderSundayMorning ? 1 : 0,
    1, now, now
  );
  return id;
}

// ── Dashboard stats ──────────────────────────────────────────────────────────

export function getNewMemberStats(organizationId, branchId) {
  const db = getDatabase();
  const orgId = organizationId || DEFAULT_ORGANIZATION_ID;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfYear  = new Date(now.getFullYear(), 0, 1).toISOString();
  const twoDaysAgo    = new Date(Date.now() -  2 * 86400000).toISOString();

  const base = `organization_id = ? AND (? IS NULL OR branch_id = ?)`;
  const args = [orgId, branchId || null, branchId || null];

  const total      = db.prepare(`SELECT COUNT(*) AS n FROM new_member_journeys WHERE ${base}`).get(...args)?.n || 0;
  const thisMonth  = db.prepare(`SELECT COUNT(*) AS n FROM new_member_journeys WHERE ${base} AND registered_at >= ?`).get(...args, startOfMonth)?.n || 0;
  const thisYear   = db.prepare(`SELECT COUNT(*) AS n FROM new_member_journeys WHERE ${base} AND registered_at >= ?`).get(...args, startOfYear)?.n || 0;
  const active     = db.prepare(`SELECT COUNT(*) AS n FROM new_member_journeys WHERE ${base} AND dropped_at IS NULL AND completed_at IS NULL`).get(...args)?.n || 0;
  const completed  = db.prepare(`SELECT COUNT(*) AS n FROM new_member_journeys WHERE ${base} AND completed_at IS NOT NULL`).get(...args)?.n || 0;
  const atRisk     = db.prepare(`SELECT COUNT(*) AS n FROM new_member_journeys WHERE ${base} AND dropped_at IS NULL AND completed_at IS NULL AND (last_contact_at IS NULL OR last_contact_at < ?)`).get(...args, twoDaysAgo)?.n || 0;
  const byGender   = db.prepare(`SELECT gender, COUNT(*) AS n FROM new_member_journeys WHERE ${base} GROUP BY gender`).all(...args);
  const monthly    = db.prepare(`
    SELECT strftime('%Y-%m', registered_at) AS month, COUNT(*) AS n
    FROM new_member_journeys WHERE ${base} AND registered_at >= ?
    GROUP BY month ORDER BY month ASC
  `).all(...args, startOfYear);

  return {
    total, thisMonth, thisYear, active, completed, atRisk,
    byGender: Object.fromEntries(byGender.map(r => [r.gender, r.n])),
    monthlyTrend: monthly.map(r => ({ month: r.month, count: r.n })),
  };
}

// ── Pending touchpoints (for cron) ───────────────────────────────────────────

export function getJourneysNeedingTouchpoint() {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM new_member_journeys
    WHERE dropped_at IS NULL AND completed_at IS NULL
    ORDER BY registered_at ASC
  `).all();
  return rows.map(mapJourneyRow);
}

export function getJourneysNeedingEscalation() {
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
  return getDatabase().prepare(`
    SELECT * FROM new_member_journeys
    WHERE dropped_at IS NULL AND completed_at IS NULL
      AND (last_contact_at IS NULL OR last_contact_at < ?)
      AND registered_at < ?
    ORDER BY registered_at ASC
  `).all(twoDaysAgo, twoDaysAgo).map(mapJourneyRow);
}

function mapJourneyRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    memberName: row.member_name,
    memberEmail: row.member_email || "",
    memberPhone: row.member_phone || "",
    gender: row.gender || "unspecified",
    birthday: row.birthday || "",
    assignedVolunteerId: row.assigned_volunteer_id || "",
    assignedVolunteerName: row.assigned_volunteer_name || "",
    stage: row.stage,
    touchpointsSent: parseJson(row.touchpoints_sent_json, []),
    contactCount: row.contact_count || 0,
    lastContactAt: row.last_contact_at || "",
    notes: row.notes || "",
    sundayAttendanceCount: row.sunday_attendance_count || 0,
    registeredAt: row.registered_at,
    completedAt: row.completed_at || "",
    droppedAt: row.dropped_at || "",
    createdAt: row.created_at,
  };
}
