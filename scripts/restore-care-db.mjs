import path from "node:path";
import { cp, access } from "node:fs/promises";
import {
  createSqliteBackup,
  ensureDirectory,
  parseFlag,
  resolveBackupDir,
  resolveDatabasePath,
  runIntegrityCheck,
  timestampSegment,
} from "./lib/runtime-paths.mjs";

const sourcePath = parseFlag("from");
const dbPath = resolveDatabasePath();
const backupDir = resolveBackupDir();

if (!sourcePath) {
  console.error("Pass the backup to restore with --from /absolute/path/to/file.sqlite");
  process.exit(1);
}

try {
  await access(sourcePath);
} catch {
  console.error(`Backup file not found at ${sourcePath}`);
  process.exit(1);
}

await ensureDirectory(path.dirname(dbPath));
await ensureDirectory(backupDir);

try {
  await access(dbPath);
  const safetyBackup = path.join(
    backupDir,
    `pre-restore-${timestampSegment()}.sqlite`
  );
  await createSqliteBackup(dbPath, safetyBackup);
  console.log(`Safety backup created at ${safetyBackup}`);
} catch {
  // No existing database to protect.
}

await cp(sourcePath, dbPath, { force: true });

if (!runIntegrityCheck(dbPath)) {
  console.error("Restore finished but integrity_check failed.");
  process.exit(1);
}

console.log(`Database restored from ${sourcePath}`);
