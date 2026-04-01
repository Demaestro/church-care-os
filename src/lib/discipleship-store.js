import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";

function row(r) {
  if (!r) return null;
  return {
    id: r.id,
    organizationId: r.organization_id,
    branchId: r.branch_id,
    householdId: r.household_id,
    householdSlug: r.household_slug,
    householdName: r.household_name,
    stage: r.stage,
    pathway: r.pathway,
    assignedLeaderId: r.assigned_leader_id,
    assignedLeaderName: r.assigned_leader_name,
    smallGroupConnected: !!r.small_group_connected,
    attendingRegularly: !!r.attending_regularly,
    serving: !!r.serving,
    baptized: !!r.baptized,
    foundationClass: !!r.foundation_class,
    mentoringOthers: !!r.mentoring_others,
    nextStep: r.next_step,
    notes: r.notes,
    lastUpdatedBy: r.last_updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getDiscipleshipRecord(householdSlug) {
  const db = getDatabase();
  return row(db.prepare(`SELECT * FROM discipleship_records WHERE household_slug = ?`).get(householdSlug));
}

export function upsertDiscipleshipRecord(input) {
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM discipleship_records WHERE organization_id = ? AND household_id = ?`).get(input.organizationId, input.householdId);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(`
      UPDATE discipleship_records SET
        stage = ?, pathway = ?, assigned_leader_id = ?, assigned_leader_name = ?,
        small_group_connected = ?, attending_regularly = ?, serving = ?,
        baptized = ?, foundation_class = ?, mentoring_others = ?,
        next_step = ?, notes = ?, last_updated_by = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.stage || "new_believer", input.pathway || "standard",
      input.assignedLeaderId || null, input.assignedLeaderName || null,
      input.smallGroupConnected ? 1 : 0, input.attendingRegularly ? 1 : 0,
      input.serving ? 1 : 0, input.baptized ? 1 : 0,
      input.foundationClass ? 1 : 0, input.mentoringOthers ? 1 : 0,
      input.nextStep || null, input.notes || null,
      input.lastUpdatedBy || null, now, existing.id
    );
    return existing.id;
  } else {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO discipleship_records (
        id, organization_id, branch_id, household_id, household_slug, household_name,
        stage, pathway, assigned_leader_id, assigned_leader_name,
        small_group_connected, attending_regularly, serving,
        baptized, foundation_class, mentoring_others,
        next_step, notes, last_updated_by, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, input.organizationId, input.branchId, input.householdId, input.householdSlug, input.householdName,
      input.stage || "new_believer", input.pathway || "standard",
      input.assignedLeaderId || null, input.assignedLeaderName || null,
      input.smallGroupConnected ? 1 : 0, input.attendingRegularly ? 1 : 0,
      input.serving ? 1 : 0, input.baptized ? 1 : 0,
      input.foundationClass ? 1 : 0, input.mentoringOthers ? 1 : 0,
      input.nextStep || null, input.notes || null,
      input.lastUpdatedBy || null, now, now
    );
    return id;
  }
}

export function listDiscipleshipRecords(organizationId, branchId, options = {}) {
  const db = getDatabase();
  const { stage, limit = 50 } = options;
  let sql = `SELECT * FROM discipleship_records WHERE organization_id = ?`;
  const params = [organizationId];
  if (branchId) { sql += ` AND branch_id = ?`; params.push(branchId); }
  if (stage) { sql += ` AND stage = ?`; params.push(stage); }
  sql += ` ORDER BY updated_at DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params).map(row);
}

export function getDiscipleshipStats(organizationId, branchId) {
  const db = getDatabase();
  const where = branchId
    ? `organization_id = ? AND branch_id = ?`
    : `organization_id = ?`;
  const params = branchId ? [organizationId, branchId] : [organizationId];
  const rows = db.prepare(`SELECT stage, COUNT(*) as cnt FROM discipleship_records WHERE ${where} GROUP BY stage`).all(...params);
  const byStage = {};
  for (const r of rows) byStage[r.stage] = r.cnt;
  const total = Object.values(byStage).reduce((a, b) => a + b, 0);
  return { total, byStage };
}
