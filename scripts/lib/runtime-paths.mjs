import path from "node:path";
import { mkdir } from "node:fs/promises";
import { DatabaseSync, backup } from "node:sqlite";
import { fileURLToPath } from "node:url";

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsRoot, "..", "..");

export function resolveDatabasePath() {
  if (process.env.CARE_DB_PATH) {
    return process.env.CARE_DB_PATH;
  }

  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "care.db");
  }

  return path.join(projectRoot, "data", "care.db");
}

export function resolveBackupDir() {
  if (process.env.BACKUP_DIR) {
    return process.env.BACKUP_DIR;
  }

  return path.join(path.dirname(resolveDatabasePath()), "backups");
}

export function parseFlag(name) {
  const prefixed = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefixed));
  if (inline) {
    return inline.slice(prefixed.length);
  }

  const flagIndex = process.argv.findIndex((value) => value === `--${name}`);
  if (flagIndex >= 0) {
    return process.argv[flagIndex + 1] || "";
  }

  return "";
}

export async function ensureDirectory(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

export function timestampSegment(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function runIntegrityCheck(targetPath) {
  const db = new DatabaseSync(targetPath, { readonly: true });

  try {
    const result = db.prepare("PRAGMA integrity_check").get();
    return result?.integrity_check === "ok";
  } finally {
    db.close();
  }
}

export async function createSqliteBackup(sourcePath, targetPath) {
  const db = new DatabaseSync(sourcePath);

  try {
    await backup(db, targetPath);
  } finally {
    db.close();
  }
}
