import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase, serializeJson, parseJson } from "@/lib/database";

function mapApplicationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    areas: parseJson(row.areas, []),
    availability: row.availability,
    note: row.note,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export function createVolunteerApplication({
  id,
  organizationId,
  branchId,
  userId,
  userName,
  userEmail,
  areas,
  availability,
  note,
}) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const applicationId = id || randomUUID();

  db.prepare(`
    INSERT OR IGNORE INTO volunteer_applications (
      id, organization_id, branch_id, user_id, user_name, user_email,
      areas, availability, note, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    applicationId,
    organizationId,
    branchId,
    userId,
    userName,
    userEmail,
    serializeJson(Array.isArray(areas) ? areas : [areas].filter(Boolean)),
    availability || null,
    note || null,
    now
  );

  return applicationId;
}

export function listVolunteerApplications(organizationId, branchId, { status } = {}) {
  const db = getDatabase();

  if (status) {
    return db
      .prepare(`
        SELECT * FROM volunteer_applications
        WHERE organization_id = ? AND branch_id = ? AND status = ?
        ORDER BY created_at DESC
      `)
      .all(organizationId, branchId, status)
      .map(mapApplicationRow);
  }

  return db
    .prepare(`
      SELECT * FROM volunteer_applications
      WHERE organization_id = ? AND branch_id = ?
      ORDER BY created_at DESC
    `)
    .all(organizationId, branchId)
    .map(mapApplicationRow);
}

export function getVolunteerApplication(id) {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM volunteer_applications WHERE id = ? LIMIT 1`)
    .get(id);
  return mapApplicationRow(row);
}

export function reviewVolunteerApplication(id, { status, reviewedBy, reviewedByName }) {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE volunteer_applications
    SET status = ?, reviewed_by = ?, reviewed_by_name = ?, reviewed_at = ?
    WHERE id = ?
  `).run(status, reviewedBy, reviewedByName, now, id);
}

export function hasPendingApplication(organizationId, branchId, userId) {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT 1 AS found FROM volunteer_applications
      WHERE organization_id = ? AND branch_id = ? AND user_id = ? AND status = 'pending'
      LIMIT 1
    `)
    .get(organizationId, branchId, userId);
  return row?.found === 1;
}
