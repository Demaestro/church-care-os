import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { resolveBackupDir } from "./lib/runtime-paths.mjs";

const backupDir = resolveBackupDir();
const maxAgeHours = Number(process.env.BACKUP_MAX_AGE_HOURS || 26);

const entries = await readdir(backupDir, { withFileTypes: true }).catch(() => []);
const files = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite"))
  .map((entry) => path.join(backupDir, entry.name));

if (files.length === 0) {
  console.error(`No backups found in ${backupDir}`);
  process.exit(1);
}

const stats = await Promise.all(
  files.map(async (filePath) => ({
    filePath,
    stats: await stat(filePath),
  }))
);
const latest = stats.sort(
  (first, second) => second.stats.mtimeMs - first.stats.mtimeMs
)[0];
const ageHours = (Date.now() - latest.stats.mtimeMs) / (60 * 60 * 1000);

if (ageHours > maxAgeHours) {
  console.error(`Latest backup is ${ageHours.toFixed(1)} hours old: ${latest.filePath}`);
  process.exit(1);
}

console.log(`Latest backup is healthy: ${latest.filePath}`);
