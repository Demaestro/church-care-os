import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";

export function listGroups({ organizationId, branchId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT g.id, g.organization_id, g.branch_id, g.name, g.group_type,
           g.leader_user_id, g.created_at,
           COUNT(m.member_id) as member_count
    FROM groups g
    LEFT JOIN group_memberships m ON g.id = m.group_id
    WHERE (? IS NULL OR g.organization_id = ?)
      AND (? IS NULL OR g.branch_id = ?)
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(
    organizationId || null,
    organizationId || null,
    branchId || null,
    branchId || null
  );

  return rows || [];
}

export function createGroupEntry(input) {
  const db = getDatabase();
  const groupId = randomUUID();
  db.prepare(`
    INSERT INTO groups (
      id, organization_id, branch_id, name, group_type, leader_user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    groupId,
    input.organizationId || null,
    input.branchId || null,
    input.name,
    input.groupType,
    input.leaderUserId || null,
    new Date().toISOString()
  );

  return groupId;
}

export function addMemberToGroup(groupId, memberId, role = "member") {
  const db = getDatabase();
  db.prepare(`
    INSERT OR IGNORE INTO group_memberships (group_id, member_id, role, joined_at)
    VALUES (?, ?, ?, ?)
  `).run(groupId, memberId, role, new Date().toISOString());
}

