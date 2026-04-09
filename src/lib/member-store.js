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

export function listMembers({ organizationId, branchId, limit = 200 } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, organization_id, branch_id, household_id, full_name, email, phone,
           gender, birthdate, marital_status, member_type, created_at
    FROM members
    WHERE (? IS NULL OR organization_id = ?)
      AND (? IS NULL OR branch_id = ?)
    ORDER BY created_at DESC
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
    eventId,
    memberId,
    eventType,
    JSON.stringify(payload || {}),
    new Date().toISOString()
  );
  return eventId;
}

