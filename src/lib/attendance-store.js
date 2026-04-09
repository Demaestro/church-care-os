import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";

export function listRecentServices({ organizationId, branchId, limit = 30 } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT s.id, s.organization_id, s.branch_id, s.name, s.service_date, s.created_at,
           COUNT(a.id) as attendance_count
    FROM services s
    LEFT JOIN attendance_events a ON s.id = a.service_id
    WHERE (? IS NULL OR s.organization_id = ?)
      AND (? IS NULL OR s.branch_id = ?)
    GROUP BY s.id
    ORDER BY s.service_date DESC
    LIMIT ?
  `).all(
    organizationId || null,
    organizationId || null,
    branchId || null,
    branchId || null,
    limit
  );

  return rows || [];
}

export function createServiceEntry(input) {
  const db = getDatabase();
  const serviceId = randomUUID();
  db.prepare(`
    INSERT INTO services (id, organization_id, branch_id, name, service_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    serviceId,
    input.organizationId || null,
    input.branchId || null,
    input.name,
    input.serviceDate,
    new Date().toISOString()
  );
  return serviceId;
}

export function recordAttendance(serviceId, memberId, mode = "physical") {
  const db = getDatabase();
  const attendanceId = randomUUID();
  db.prepare(`
    INSERT INTO attendance_events (id, service_id, member_id, mode, recorded_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(attendanceId, serviceId, memberId, mode, new Date().toISOString());
  return attendanceId;
}

