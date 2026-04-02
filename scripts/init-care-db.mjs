import path from "node:path";
import { mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { resolveDatabasePath } from "./lib/runtime-paths.mjs";

const dbPath = resolveDatabasePath();
await mkdir(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

try {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");

  const hasCoreTables =
    db.prepare(
      `
        SELECT COUNT(*) AS count
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('organizations', 'branches', 'households', 'requests', 'users')
      `
    ).get()?.count ?? 0;

  console.log(`Database path prepared at ${dbPath}`);

  if (hasCoreTables >= 5) {
    const organizationCount =
      db.prepare("SELECT COUNT(*) AS count FROM organizations").get()?.count ?? 0;
    const branchCount =
      db.prepare("SELECT COUNT(*) AS count FROM branches").get()?.count ?? 0;
    const householdCount =
      db.prepare("SELECT COUNT(*) AS count FROM households").get()?.count ?? 0;
    const requestCount =
      db.prepare("SELECT COUNT(*) AS count FROM requests").get()?.count ?? 0;
    const userCount =
      db.prepare("SELECT COUNT(*) AS count FROM users").get()?.count ?? 0;

    console.log(
      `Existing schema found with ${organizationCount} organization(s), ${branchCount} branch(es), ${householdCount} household(s), ${requestCount} request(s), and ${userCount} user(s).`
    );
  } else {
    console.log(
      "The database file is ready. The full schema and demo data will be created automatically the first time the app boots and touches the database."
    );
  }
} finally {
  db.close();
}
