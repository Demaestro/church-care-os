import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";

export function ensureMemberFromUser(user) {
  if (!user || user.role !== "member") {
    return null;
  }

  const db = getDatabase();
  const email = user.email ? user.email.trim().toLowerCase() : null;

  try {
    const existing = email
      ? db.prepare(`SELECT id FROM members WHERE email = ? LIMIT 1`).get(email)
      : null;

    if (existing?.id) {
      return existing.id;
    }

    const memberId = randomUUID();
    db.prepare(`
      INSERT INTO members (
        id, organization_id, branch_id, household_id, full_name, email, phone,
        gender, birthdate, marital_status, member_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      memberId,
      user.organizationId || null,
      user.branchId || null,
      null,
      user.name,
      email,
      user.phone || null,
      user.gender || null,
      user.birthday || null,
      null,
      user.memberType || "member",
      new Date().toISOString()
    );

    return memberId;
  } catch {
    return null;
  }
}

export function listMembers({ organizationId, branchId, limit = 200, query, memberType, gender } = {}) {
  const db = getDatabase();

  let sql = `
    SELECT id, organization_id, branch_id, household_id, full_name, email, phone,
           gender, birthdate, marital_status, member_type, created_at
    FROM members
    WHERE (? IS NULL OR organization_id = ?)
      AND (? IS NULL OR branch_id = ?)
  `;
  const params = [
    organizationId || null, organizationId || null,
    branchId || null, branchId || null,
  ];

  if (query) {
    sql += ` AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
    const like = `%${query}%`;
    params.push(like, like, like);
  }
  if (memberType) {
    sql += ` AND member_type = ?`;
    params.push(memberType);
  }
  if (gender) {
    sql += ` AND gender = ?`;
    params.push(gender);
  }

  sql += ` ORDER BY full_name ASC LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params) || [];
}

export function getMemberById(memberId) {
  if (!memberId) return null;
  const db = getDatabase();
  return db.prepare(`
    SELECT id, organization_id, branch_id, household_id, full_name, email, phone,
           gender, birthdate, marital_status, member_type, created_at
    FROM members WHERE id = ? LIMIT 1
  `).get(memberId) || null;
}

export function getMemberWithProfile(memberId) {
  if (!memberId) return null;
  const db = getDatabase();
  const member = db.prepare(`
    SELECT m.id, m.organization_id, m.branch_id, m.household_id,
           m.full_name, m.email, m.phone, m.gender, m.birthdate,
           m.marital_status, m.member_type, m.created_at,
           p.salvation_date, p.baptism_date, p.small_group,
           p.last_contact_at, p.notes_summary
    FROM members m
    LEFT JOIN member_profiles p ON p.member_id = m.id
    WHERE m.id = ?
    LIMIT 1
  `).get(memberId);
  return member || null;
}

export function upsertMemberProfile(memberId, input) {
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM member_profiles WHERE member_id = ?`).get(memberId);
  if (existing) {
    db.prepare(`
      UPDATE member_profiles SET
        salvation_date = ?, baptism_date = ?, small_group = ?,
        last_contact_at = ?, notes_summary = ?
      WHERE member_id = ?
    `).run(
      input.salvationDate || null,
      input.baptismDate || null,
      input.smallGroup || null,
      input.lastContactAt || null,
      input.notesSummary || null,
      memberId
    );
  } else {
    db.prepare(`
      INSERT INTO member_profiles (id, member_id, salvation_date, baptism_date, small_group, last_contact_at, notes_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), memberId,
      input.salvationDate || null,
      input.baptismDate || null,
      input.smallGroup || null,
      input.lastContactAt || null,
      input.notesSummary || null
    );
  }
}

export function updateMemberEntry(memberId, input) {
  const db = getDatabase();
  db.prepare(`
    UPDATE members SET
      full_name = ?,
      email = ?,
      phone = ?,
      gender = ?,
      birthdate = ?,
      marital_status = ?,
      member_type = ?
    WHERE id = ?
  `).run(
    input.fullName,
    input.email ? input.email.trim().toLowerCase() : null,
    input.phone || null,
    input.gender || null,
    input.birthdate || null,
    input.maritalStatus || null,
    input.memberType || "member",
    memberId
  );
}

export function listMemberEvents(memberId, limit = 50) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, member_id, event_type, event_payload, created_at
    FROM member_events
    WHERE member_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(memberId, limit);

  return (rows || []).map((row) => ({
    ...row,
    event_payload: row.event_payload
      ? (typeof row.event_payload === "string" ? JSON.parse(row.event_payload) : row.event_payload)
      : {},
  }));
}

export function listMemberAttendance(memberId, limit = 50) {
  const db = getDatabase();
  return db.prepare(`
    SELECT a.id, a.service_id, a.member_id, a.mode, a.recorded_at,
           s.name as service_name, s.service_date
    FROM attendance_events a
    LEFT JOIN services s ON s.id = a.service_id
    WHERE a.member_id = ?
    ORDER BY a.recorded_at DESC
    LIMIT ?
  `).all(memberId, limit) || [];
}

export function listMemberGroups(memberId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT g.id, g.name, g.group_type, gm.role, gm.joined_at
    FROM group_memberships gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.member_id = ?
    ORDER BY gm.joined_at DESC
  `).all(memberId) || [];
}

export function listMemberPledges(memberId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT p.id, p.amount, p.start_date, p.end_date, p.status,
           f.name as fund_name
    FROM pledges p
    LEFT JOIN funds f ON f.id = p.fund_id
    WHERE p.member_id = ?
    ORDER BY p.start_date DESC
  `).all(memberId) || [];
}

export function getMemberStats(organizationId, branchId) {
  const db = getDatabase();
  const where = branchId
    ? `organization_id = ? AND branch_id = ?`
    : `organization_id = ?`;
  const params = branchId ? [organizationId, branchId] : [organizationId];

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM members WHERE ${where}`).get(...params)?.cnt || 0;

  const byType = db.prepare(`
    SELECT member_type, COUNT(*) as cnt FROM members WHERE ${where} GROUP BY member_type
  `).all(...params) || [];

  const byGender = db.prepare(`
    SELECT COALESCE(gender, 'unspecified') as gender, COUNT(*) as cnt
    FROM members WHERE ${where} GROUP BY gender
  `).all(...params) || [];

  // Members not seen (no attendance) in last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const lapsed = db.prepare(`
    SELECT m.id, m.full_name, m.email,
           MAX(s.service_date) as last_seen
    FROM members m
    LEFT JOIN attendance_events a ON a.member_id = m.id
    LEFT JOIN services s ON s.id = a.service_id
    WHERE ${where.replace(/\?/g, (_, i) => `m.organization_id = ?`).replace(/branch_id/g, 'm.branch_id')}
    GROUP BY m.id
    HAVING last_seen IS NULL OR last_seen < ?
    ORDER BY last_seen ASC NULLS FIRST
    LIMIT 20
  `).all(...params, cutoff) || [];

  return { total, byType, byGender, lapsed };
}

export function createMemberEntry(input) {
  const db = getDatabase();
  const memberId = randomUUID();
  db.prepare(`
    INSERT INTO members (
      id, organization_id, branch_id, household_id, full_name, email, phone,
      gender, birthdate, marital_status, member_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    memberId,
    input.organizationId || null,
    input.branchId || null,
    input.householdId || null,
    input.fullName,
    input.email ? input.email.trim().toLowerCase() : null,
    input.phone || null,
    input.gender || null,
    input.birthdate || null,
    input.maritalStatus || null,
    input.memberType || "member",
    new Date().toISOString()
  );
  return memberId;
}

export function addMemberEvent(memberId, eventType, payload = {}) {
  const db = getDatabase();
  const eventId = randomUUID();
  db.prepare(`
    INSERT INTO member_events (id, member_id, event_type, event_payload, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    eventId, memberId, eventType,
    JSON.stringify(payload || {}),
    new Date().toISOString()
  );
  return eventId;
}
