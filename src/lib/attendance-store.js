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
    organizationId || null, organizationId || null,
    branchId || null, branchId || null,
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

export function hasAttendanceRecord(serviceId, memberId) {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id FROM attendance_events WHERE service_id = ? AND member_id = ? LIMIT 1
  `).get(serviceId, memberId);
  return Boolean(row?.id);
}

export function listAttendanceByService(serviceId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT a.id, a.member_id, a.mode, a.recorded_at, m.full_name, m.email, m.phone
    FROM attendance_events a
    LEFT JOIN members m ON m.id = a.member_id
    WHERE a.service_id = ?
    ORDER BY a.recorded_at DESC
  `).all(serviceId) || [];
}

// Returns last `limit` services with attendance count — for trend charts
export function getAttendanceTrend({ organizationId, branchId, limit = 12 } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT s.id, s.name, s.service_date,
           COUNT(a.id) as total,
           SUM(CASE WHEN a.mode = 'physical' THEN 1 ELSE 0 END) as physical,
           SUM(CASE WHEN a.mode = 'online' THEN 1 ELSE 0 END) as online
    FROM services s
    LEFT JOIN attendance_events a ON a.service_id = s.id
    WHERE (? IS NULL OR s.organization_id = ?)
      AND (? IS NULL OR s.branch_id = ?)
    GROUP BY s.id
    ORDER BY s.service_date DESC
    LIMIT ?
  `).all(
    organizationId || null, organizationId || null,
    branchId || null, branchId || null,
    limit
  );

  // Return chronological order for charts
  return (rows || []).map((r) => ({
    ...r,
    total: Number(r.total || 0),
    physical: Number(r.physical || 0),
    online: Number(r.online || 0),
  })).reverse();
}

// Members who haven't attended in `daysSince` days
export function getLapsedMembers({ organizationId, branchId, daysSince = 30, limit = 25 } = {}) {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT m.id, m.full_name, m.email, m.member_type,
           MAX(s.service_date) as last_seen,
           COUNT(a.id) as total_services
    FROM members m
    LEFT JOIN attendance_events a ON a.member_id = m.id
    LEFT JOIN services s ON s.id = a.service_id
    WHERE (? IS NULL OR m.organization_id = ?)
      AND (? IS NULL OR m.branch_id = ?)
    GROUP BY m.id
    HAVING last_seen IS NULL OR last_seen < ?
    ORDER BY last_seen ASC
    LIMIT ?
  `).all(
    organizationId || null, organizationId || null,
    branchId || null, branchId || null,
    cutoff, limit
  );

  return (rows || []).map((r) => ({
    ...r,
    total_services: Number(r.total_services || 0),
    daysSinceLastSeen: r.last_seen
      ? Math.floor((Date.now() - new Date(r.last_seen).getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));
}

// Aggregate attendance stats for the analytics page
export function getAttendanceInsights({ organizationId, branchId } = {}) {
  const db = getDatabase();

  const totalServices = db.prepare(`
    SELECT COUNT(*) as cnt FROM services
    WHERE (? IS NULL OR organization_id = ?)
      AND (? IS NULL OR branch_id = ?)
  `).get(
    organizationId || null, organizationId || null,
    branchId || null, branchId || null
  )?.cnt || 0;

  const totalCheckIns = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM attendance_events a
    JOIN services s ON s.id = a.service_id
    WHERE (? IS NULL OR s.organization_id = ?)
      AND (? IS NULL OR s.branch_id = ?)
  `).get(
    organizationId || null, organizationId || null,
    branchId || null, branchId || null
  )?.cnt || 0;

  const avgPerService = totalServices > 0
    ? Math.round(Number(totalCheckIns) / Number(totalServices))
    : 0;

  // Last service attendance
  const lastService = db.prepare(`
    SELECT s.name, s.service_date, COUNT(a.id) as attendance_count
    FROM services s
    LEFT JOIN attendance_events a ON a.service_id = s.id
    WHERE (? IS NULL OR s.organization_id = ?)
      AND (? IS NULL OR s.branch_id = ?)
    GROUP BY s.id
    ORDER BY s.service_date DESC
    LIMIT 1
  `).get(
    organizationId || null, organizationId || null,
    branchId || null, branchId || null
  );

  return {
    totalServices: Number(totalServices),
    totalCheckIns: Number(totalCheckIns),
    avgPerService,
    lastService: lastService
      ? { ...lastService, attendance_count: Number(lastService.attendance_count || 0) }
      : null,
  };
}
