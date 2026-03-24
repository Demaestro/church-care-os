import path from "node:path";
import { access, cp, rm } from "node:fs/promises";
import {
  createSqliteBackup,
  ensureDirectory,
  resolveBackupDir,
  resolveDatabasePath,
  runIntegrityCheck,
  timestampSegment,
} from "./lib/runtime-paths.mjs";

const dbPath = resolveDatabasePath();
const backupDir = resolveBackupDir();
const drillDir = path.join(backupDir, "drills");
const timestamp = timestampSegment();
const backupPath = path.join(drillDir, `drill-backup-${timestamp}.sqlite`);
const restorePath = path.join(drillDir, `drill-restore-${timestamp}.sqlite`);

try {
  await access(dbPath);
} catch {
  console.error(`Database not found at ${dbPath}. Run npm run db:init or start the app once to bootstrap it.`);
  process.exit(1);
}

await ensureDirectory(drillDir);
await createSqliteBackup(dbPath, backupPath);
await cp(backupPath, restorePath, { force: true });

const backupOk = runIntegrityCheck(backupPath);
const restoreOk = runIntegrityCheck(restorePath);

if (!backupOk || !restoreOk) {
  console.error("Staging drill failed integrity checks.");
  process.exit(1);
}

await rm(restorePath, { force: true });

console.log(`Staging drill completed successfully with backup ${backupPath}`);
