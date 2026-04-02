import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { get, put } from "@vercel/blob";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultUploadsRoot = path.resolve(moduleDir, "..", "..", "data", "uploads");

function normalizeBackend(value) {
  const backend = String(value || "").trim().toLowerCase();

  if (backend === "vercel-blob" || backend === "blob") {
    return "vercel-blob";
  }

  return "local";
}

export function getAttachmentStorageBackend() {
  const configuredBackend = normalizeBackend(process.env.CARE_ATTACHMENT_BACKEND);
  if (configuredBackend !== "local") {
    return configuredBackend;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return "vercel-blob";
  }

  return "local";
}

function getUploadsRoot() {
  const basePath = process.env.CARE_UPLOADS_PATH || defaultUploadsRoot;
  mkdirSync(basePath, { recursive: true });
  return basePath;
}

function getBlobOptions() {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    : {};
}

export async function storeAttachmentObject({
  storageKey,
  mimeType,
  buffer,
  storageBackend = getAttachmentStorageBackend(),
}) {
  if (storageBackend === "vercel-blob") {
    const result = await put(storageKey, buffer, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: mimeType,
      ...getBlobOptions(),
    });

    return {
      storedName: result.pathname,
      storageBackend: "vercel-blob",
    };
  }

  const targetPath = path.join(getUploadsRoot(), storageKey);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, buffer);
  return {
    storedName: storageKey,
    storageBackend: "local",
  };
}

export async function readAttachmentObject({
  storedName,
  storageBackend = "local",
}) {
  if (!storedName) {
    return null;
  }

  if (normalizeBackend(storageBackend) === "vercel-blob") {
    const result = await get(storedName, {
      access: "private",
      useCache: false,
      ...getBlobOptions(),
    });

    if (!result || result.statusCode !== 200) {
      return null;
    }

    return {
      body: result.stream,
      contentLength: Number(result.blob.size || 0),
      contentType: result.blob.contentType || "application/octet-stream",
      etag: result.blob.etag || "",
    };
  }

  const fullPath = path.join(getUploadsRoot(), storedName);
  let buffer;

  try {
    buffer = readFileSync(fullPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }

  return {
    body: buffer,
    contentLength: buffer.byteLength,
    contentType: "",
    etag: "",
  };
}
