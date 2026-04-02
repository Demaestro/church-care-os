import "server-only";

import { randomUUID } from "node:crypto";
import { formatDateTime } from "@/lib/care-format";
import { getDatabase, withTransaction } from "@/lib/database";
import {
  buildViewerScope,
  recordMatchesViewerScope,
} from "@/lib/workspace-scope";
import { defaultPrimaryBranchId, defaultPrimaryOrganizationId } from "@/lib/organization-defaults";

function getBranchName(branchId) {
  return (
    getDatabase()
      .prepare(`
        SELECT name
        FROM branches
        WHERE id = ?
        LIMIT 1
      `)
      .get(branchId)?.name || branchId
  );
}

function getHouseholdRow(slug) {
  return getDatabase()
    .prepare(`
      SELECT id, organization_id, branch_id, slug, name
      FROM households
      WHERE slug = ?
      LIMIT 1
    `)
    .get(slug);
}

function getTransferRow(id) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM member_transfers
      WHERE id = ?
      LIMIT 1
    `)
    .get(id);
}

function assertTransferScope(row, viewer = null, preferredBranchId = "") {
  if (!viewer || !row) {
    throw new Error("You do not have access to that transfer.");
  }

  const scope = buildViewerScope(viewer, preferredBranchId);
  const allowed =
    recordMatchesViewerScope(
      {
        organizationId: row.organization_id,
        branchId: row.from_branch_id,
      },
      scope
    ) ||
    recordMatchesViewerScope(
      {
        organizationId: row.organization_id,
        branchId: row.to_branch_id,
      },
      scope
    );

  if (!allowed) {
    throw new Error("You do not have access to that transfer.");
  }
}

export function listMemberTransfers(viewer = null, preferredBranchId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT *
      FROM member_transfers
      ORDER BY requested_at DESC
    `)
    .all();

  return rows
    .filter((row) => {
      if (!viewer) {
        return false;
      }

      try {
        assertTransferScope(row, viewer, preferredBranchId);
        return true;
      } catch {
        return false;
      }
    })
    .map((row) => ({
      id: row.id,
      organizationId: row.organization_id || defaultPrimaryOrganizationId,
      householdSlug: row.household_slug,
      fromBranchId: row.from_branch_id || defaultPrimaryBranchId,
      toBranchId: row.to_branch_id || defaultPrimaryBranchId,
      fromBranchName: getBranchName(row.from_branch_id),
      toBranchName: getBranchName(row.to_branch_id),
      requestedByUserId: row.requested_by_user_id || "",
      requestedByName: row.requested_by_name,
      requestedByRole: row.requested_by_role,
      status: row.status,
      reason: row.reason,
      note: row.note || "",
      requestedAt: row.requested_at,
      reviewedAt: row.reviewed_at || "",
      reviewedBy: row.reviewed_by || "",
      completedAt: row.completed_at || "",
      requestedLabel: formatDateTime(row.requested_at),
      reviewedLabel: formatDateTime(row.reviewed_at),
      completedLabel: formatDateTime(row.completed_at),
    }));
}

export function createMemberTransferEntry({
  householdSlug,
  toBranchId,
  reason,
  note,
  actor,
  preferredBranchId = "",
}) {
  const household = getHouseholdRow(householdSlug);
  if (!household) {
    throw new Error("That household could not be found.");
  }

  assertTransferScope(
    {
      organization_id: household.organization_id,
      from_branch_id: household.branch_id,
      to_branch_id: toBranchId,
    },
    actor,
    preferredBranchId
  );

  if (!toBranchId || toBranchId === household.branch_id) {
    throw new Error("Choose a different destination branch.");
  }

  const targetBranch = getDatabase()
    .prepare(`
      SELECT id, organization_id
      FROM branches
      WHERE id = ?
      LIMIT 1
    `)
    .get(toBranchId);

  if (!targetBranch || targetBranch.organization_id !== household.organization_id) {
    throw new Error("Choose a valid destination branch inside this organization.");
  }

  const openTransfer = getDatabase()
    .prepare(`
      SELECT id
      FROM member_transfers
      WHERE household_slug = ?
        AND status = 'requested'
      LIMIT 1
    `)
    .get(householdSlug);

  if (openTransfer) {
    throw new Error("There is already an open transfer request for this household.");
  }

  const id = randomUUID();
  getDatabase()
    .prepare(`
      INSERT INTO member_transfers (
        id,
        organization_id,
        household_slug,
        from_branch_id,
        to_branch_id,
        requested_by_user_id,
        requested_by_name,
        requested_by_role,
        status,
        reason,
        note,
        requested_at,
        reviewed_at,
        reviewed_by,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      household.organization_id,
      household.slug,
      household.branch_id,
      toBranchId,
      actor.id,
      actor.name,
      actor.role,
      "requested",
      reason,
      note || null,
      new Date().toISOString(),
      null,
      null,
      null
    );

  return id;
}

export function completeMemberTransferEntry(
  transferId,
  actor,
  preferredBranchId = ""
) {
  const transfer = getTransferRow(transferId);
  if (!transfer) {
    throw new Error("That transfer request was not found.");
  }

  assertTransferScope(transfer, actor, preferredBranchId);

  if (transfer.status !== "requested") {
    throw new Error("Only requested transfers can be completed.");
  }

  return withTransaction((db) => {
    const now = new Date().toISOString();
    const receivingBranchName = getBranchName(transfer.to_branch_id);
    const transferSummary = `Household transferred to ${receivingBranchName}. Previous branch notes move with the case so the receiving branch can continue care safely.`;

    db.prepare(`
      UPDATE households
      SET
        branch_id = ?,
        stage = 'Assign',
        owner = 'Unassigned',
        summary_note = ?
      WHERE slug = ?
    `).run(transfer.to_branch_id, transferSummary, transfer.household_slug);

    db.prepare(`
      UPDATE household_notes
      SET branch_id = ?
      WHERE household_slug = ?
    `).run(transfer.to_branch_id, transfer.household_slug);

    db.prepare(`
      INSERT INTO household_notes (
        id, organization_id, branch_id, household_slug, created_at, author, kind, body
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      transfer.organization_id,
      transfer.to_branch_id,
      transfer.household_slug,
      now,
      actor.name,
      "Transfer",
      `${actor.name} completed a branch transfer from ${getBranchName(
        transfer.from_branch_id
      )} to ${receivingBranchName}. ${transfer.reason}`
    );

    db.prepare(`
      UPDATE requests
      SET
        branch_id = ?,
        owner = 'Unassigned',
        assigned_volunteer_json = NULL,
        escalation_json = NULL,
        status_detail = 'Your request is now with the receiving branch care team for review.'
      WHERE household_slug = ?
        AND status = 'Open'
    `).run(transfer.to_branch_id, transfer.household_slug);

    db.prepare(`
      UPDATE household_attachments
      SET branch_id = ?
      WHERE household_slug = ?
    `).run(transfer.to_branch_id, transfer.household_slug);

    db.prepare(`
      UPDATE member_transfers
      SET
        status = 'completed',
        reviewed_at = ?,
        reviewed_by = ?,
        completed_at = ?
      WHERE id = ?
    `).run(now, actor.name, now, transferId);

    return transferId;
  });
}
