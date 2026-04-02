import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { formatDateTime } from "@/lib/care-format";
import { getDatabase } from "@/lib/database";
import {
  buildViewerScope,
  recordMatchesViewerScope,
} from "@/lib/workspace-scope";
import { defaultPrimaryBranchId, defaultPrimaryOrganizationId } from "@/lib/organization-defaults";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultUploadsRoot = path.resolve(moduleDir, "..", "..", "data", "uploads");

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function getUploadsRoot() {
  const basePath = process.env.CARE_UPLOADS_PATH || defaultUploadsRoot;
  mkdirSync(basePath, { recursive: true });
  return basePath;
}

function sanitizeFileName(value) {
  return String(value || "attachment")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "attachment";
}

function mapAttachmentRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    organizationId: row.organization_id || defaultPrimaryOrganizationId,
    branchId: row.branch_id || defaultPrimaryBranchId,
    householdSlug: row.household_slug,
    requestId: row.request_id || "",
    originalName: row.original_name,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    purpose: row.purpose,
    visibility: row.visibility,
    uploadedByUserId: row.uploaded_by_user_id || "",
    uploadedByName: row.uploaded_by_name,
    uploadedByRole: row.uploaded_by_role,
    createdAt: row.created_at,
    createdLabel: formatDateTime(row.created_at),
    downloadHref: `/attachments/${row.id}`,
  };
}

function getHouseholdRow(householdSlug) {
  return getDatabase()
    .prepare(`
      SELECT organization_id, branch_id, slug
      FROM households
      WHERE slug = ?
      LIMIT 1
    `)
    .get(householdSlug);
}

function assertViewerAccess(row, viewer = null, preferredBranchId = "") {
  if (!viewer) {
    throw new Error("You must be signed in to access attachments.");
  }

  const viewerScope = buildViewerScope(viewer, preferredBranchId);
  if (
    !recordMatchesViewerScope(
      {
        organizationId: row.organization_id,
        branchId: row.branch_id,
      },
      viewerScope
    )
  ) {
    throw new Error("You do not have access to that attachment.");
  }
}

export function getAllowedAttachmentMimeTypes() {
  return [...allowedMimeTypes];
}

export function listHouseholdAttachments(
  householdSlug,
  viewer = null,
  preferredBranchId = ""
) {
  const rows = getDatabase()
    .prepare(`
      SELECT *
      FROM household_attachments
      WHERE household_slug = ?
      ORDER BY created_at DESC
    `)
    .all(householdSlug);

  return rows
    .filter((row) => {
      if (!viewer) {
        return false;
      }

      try {
        assertViewerAccess(row, viewer, preferredBranchId);
        return true;
      } catch {
        return false;
      }
    })
    .map(mapAttachmentRow);
}

export function getAttachmentById(id, viewer = null, preferredBranchId = "") {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM household_attachments
      WHERE id = ?
      LIMIT 1
    `)
    .get(id);

  if (!row) {
    return null;
  }

  assertViewerAccess(row, viewer, preferredBranchId);
  return mapAttachmentRow(row);
}

export function readAttachmentBuffer(id, viewer = null, preferredBranchId = "") {
  const attachment = getAttachmentById(id, viewer, preferredBranchId);
  if (!attachment) {
    return null;
  }

  const fullPath = path.join(getUploadsRoot(), attachment.storedName);
  return {
    attachment,
    buffer: readFileSync(fullPath),
  };
}

export async function saveHouseholdAttachment({
  file,
  householdSlug,
  requestId = "",
  purpose,
  visibility = "branch-staff",
  viewer,
  organizationId,
  branchId,
}) {
  const household = getHouseholdRow(householdSlug);
  const originalName = sanitizeFileName(file?.name || "attachment");
  const mimeType = file?.type || "application/octet-stream";
  const fileSize = Number(file?.size || 0);

  if (!viewer) {
    throw new Error("You must be signed in to upload attachments.");
  }

  if (!household) {
    throw new Error("That household could not be found.");
  }

  assertViewerAccess(
    {
      organization_id: household.organization_id,
      branch_id: household.branch_id,
    },
    viewer,
    branchId || ""
  );

  if (
    organizationId &&
    household.organization_id &&
    organizationId !== household.organization_id
  ) {
    throw new Error("That household belongs to another organization.");
  }

  if (!file || fileSize <= 0) {
    throw new Error("Choose a file before uploading.");
  }

  if (fileSize > 10 * 1024 * 1024) {
    throw new Error("Attachments must be 10 MB or smaller.");
  }

  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error("That file type is not supported yet.");
  }

  const id = randomUUID();
  const extension = path.extname(originalName) || "";
  const storedName = `${id}${extension}`;
  const now = new Date().toISOString();
  const buffer = Buffer.from(await file.arrayBuffer());

  writeFileSync(path.join(getUploadsRoot(), storedName), buffer);

  getDatabase()
    .prepare(`
      INSERT INTO household_attachments (
        id,
        organization_id,
        branch_id,
        household_slug,
        request_id,
        original_name,
        stored_name,
        mime_type,
        file_size,
        purpose,
        visibility,
        uploaded_by_user_id,
        uploaded_by_name,
        uploaded_by_role,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      household.organization_id,
      household.branch_id,
      householdSlug,
      requestId || null,
      originalName,
      storedName,
      mimeType,
      fileSize,
      purpose || "Case attachment",
      visibility,
      viewer.id,
      viewer.name,
      viewer.role,
      now
    );

  return id;
}
