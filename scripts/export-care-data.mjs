import path from "node:path";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import {
  ensureDirectory,
  parseFlag,
  resolveDatabasePath,
  resolveUploadsPath,
  timestampSegment,
} from "./lib/runtime-paths.mjs";
import { migrationTables } from "./lib/migration-schema.mjs";

const databasePath = resolveDatabasePath();
const exportRoot =
  parseFlag("out") || path.join(process.cwd(), "exports", `care-export-${timestampSegment()}`);
const tablesDir = path.join(exportRoot, "tables");
const uploadsSource = resolveUploadsPath();
const uploadsTarget = path.join(exportRoot, "uploads");

await ensureDirectory(exportRoot);
await ensureDirectory(tablesDir);

const db = new DatabaseSync(databasePath, { readonly: true });

try {
  const manifest = {
    exportedAt: new Date().toISOString(),
    databasePath,
    sourceDriver: "sqlite",
    tables: [],
    uploadsCopied: false,
  };

  for (const table of migrationTables) {
    const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
    const targetPath = path.join(tablesDir, `${table.name}.json`);
    await writeFile(targetPath, JSON.stringify(rows, null, 2), "utf8");
    manifest.tables.push({
      name: table.name,
      rowCount: rows.length,
      file: path.relative(exportRoot, targetPath).replace(/\\/g, "/"),
    });
  }

  try {
    await mkdir(uploadsSource, { recursive: true });
    await cp(uploadsSource, uploadsTarget, { recursive: true, force: true });
    manifest.uploadsCopied = true;
    manifest.uploadsPath = path.relative(exportRoot, uploadsTarget).replace(/\\/g, "/");
  } catch {
    manifest.uploadsCopied = false;
  }

  await writeFile(
    path.join(exportRoot, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log(`Care data exported to ${exportRoot}`);
  for (const table of manifest.tables) {
    console.log(`- ${table.name}: ${table.rowCount} row(s)`);
  }
  console.log(
    manifest.uploadsCopied
      ? `- uploads copied to ${uploadsTarget}`
      : "- uploads folder was not copied"
  );
} finally {
  db.close();
}
