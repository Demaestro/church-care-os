import "server-only";

import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  getAttachmentStorageBackend,
  readAttachmentObject,
  storeAttachmentObject,
} from "@/lib/blob-storage";
import { assertExpectedFileSignature } from "@/lib/file-signatures";

const allowedLogoMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const extensionByMimeType = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

function sanitizeSlug(value) {
  return (
    String(value || "church")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "church"
  );
}

export function getAllowedLogoMimeTypes() {
  return [...allowedLogoMimeTypes];
}

export async function saveChurchLogo({ organizationSlug, file }) {
  if (!file || typeof file.arrayBuffer !== "function" || Number(file.size || 0) <= 0) {
    return null;
  }

  const mimeType = String(file.type || "").toLowerCase();
  if (!allowedLogoMimeTypes.has(mimeType)) {
    throw new Error("Church logos must be PNG, JPG, or WebP images.");
  }

  const fileSize = Number(file.size || 0);
  if (fileSize > 3 * 1024 * 1024) {
    throw new Error("Church logos must be 3 MB or smaller.");
  }

  const slug = sanitizeSlug(organizationSlug);
  const uploadedBuffer = Buffer.from(await file.arrayBuffer());
  assertExpectedFileSignature(uploadedBuffer, mimeType, "church logo");
  const extension =
    extensionByMimeType[mimeType] ||
    path.extname(String(file.name || "")).toLowerCase() ||
    ".png";
  const storageKey = ["branding", slug, `logo-${randomUUID()}${extension}`].join("/");
  const storage = await storeAttachmentObject({
    storageKey,
    mimeType,
    buffer: uploadedBuffer,
    storageBackend: getAttachmentStorageBackend(),
  });
  const updatedAt = new Date().toISOString();

  return {
    logoPath: storage.storedName,
    logoStorageBackend: storage.storageBackend,
    logoMimeType: mimeType,
    logoUpdatedAt: updatedAt,
  };
}

export async function readChurchLogo(organization) {
  if (!organization?.logoPath) {
    return null;
  }

  const payload = await readAttachmentObject({
    storedName: organization.logoPath,
    storageBackend: organization.logoStorageBackend,
  });

  if (!payload) {
    return null;
  }

  return {
    body: payload.body,
    contentLength: payload.contentLength,
    contentType: payload.contentType || organization.logoMimeType || "image/png",
    etag: payload.etag || organization.logoUpdatedAt || "",
  };
}
