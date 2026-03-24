import path from "node:path";
import { access } from "node:fs/promises";
import {
  createSqliteBackup,
  ensureDirectory,
  resolveBackupDir,
  resolveDatabasePath,
  timestampSegment,
} from "./lib/runtime-paths.mjs";

const dbPath = resolveDatabasePath();
const backupDir = resolveBackupDir();
const targetPath = path.join(
  backupDir,
  `care-${timestampSegment()}.sqlite`
);

try {
  await access(dbPath);
} catch {
  console.error(`Database not found at ${dbPath}. Run npm run db:init or start the app once to bootstrap it.`);
  process.exit(1);
}

await ensureDirectory(backupDir);
await createSqliteBackup(dbPath, targetPath);

console.log(`Backup created at ${targetPath}`);
