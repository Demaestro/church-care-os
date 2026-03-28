import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { resolveBackupDir } from "./lib/runtime-paths.mjs";

const backupDir = resolveBackupDir();
const maxAgeHours = Number(process.env.BACKUP_MAX_AGE_HOURS || 26);

const entries = await readdir(backupDir, { withFileTypes: true }).catch(() => []);
const files = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite"))
  .map((entry) => ({
    filePath: path.join(backupDir, entry.name),
    sortTimeMs: parseBackupTimestamp(entry.name),
  }));

if (files.length === 0) {
  console.error(`No backups found in ${backupDir}`);
  process.exit(1);
}

const stats = await Promise.all(
  files.map(async (file) => ({
    filePath: file.filePath,
    sortTimeMs: file.sortTimeMs,
    stats: await stat(file.filePath),
  }))
);
const latest = stats.sort(
  (first, second) =>
    (second.sortTimeMs ?? second.stats.mtimeMs) -
    (first.sortTimeMs ?? first.stats.mtimeMs)
)[0];
const freshnessTimeMs = latest.sortTimeMs ?? latest.stats.mtimeMs;
const ageHours = (Date.now() - freshnessTimeMs) / (60 * 60 * 1000);

if (ageHours > maxAgeHours) {
  console.error(`Latest backup is ${ageHours.toFixed(1)} hours old: ${latest.filePath}`);
  process.exit(1);
}

console.log(`Latest backup is healthy: ${latest.filePath}`);

function parseBackupTimestamp(fileName) {
  const match = fileName.match(
    /^care-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.sqlite$/
  );
  if (!match) {
    return null;
  }

  const [, date, hours, minutes, seconds, millis] = match;
  const parsed = Date.parse(
    `${date}T${hours}:${minutes}:${seconds}.${millis}Z`
  );

  return Number.isNaN(parsed) ? null : parsed;
}
