import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { resolveDatabasePath } from "./lib/runtime-paths.mjs";

const retentionDays = 90;
const staleRateLimitDays = 2;
const auditDays = 365;
const dbPath = resolveDatabasePath();
let db;
let transactionStarted = false;

try {
  await access(dbPath);
} catch {
  console.error(`Database not found at ${dbPath}. Run npm run db:init or start the app once to bootstrap it.`);
  process.exit(1);
}

db = new DatabaseSync(dbPath);

try {
  const closedCutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const auditCutoff = new Date(
    Date.now() - auditDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const rateLimitCutoff = new Date(
    Date.now() - staleRateLimitDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const staleRows = db.prepare(`
    SELECT
      id,
      household_slug,
      household_name,
      need,
      summary,
      owner,
      due_at,
      tone,
      status,
      source,
      created_at,
      requester_json,
      privacy_json,
      assigned_volunteer_json,
      escalation_json
    FROM requests
    WHERE status = 'Closed' AND created_at < ?
  `).all(closedCutoff);

  db.exec("BEGIN IMMEDIATE");
  transactionStarted = true;

  const archiveInsert = db.prepare(`
    INSERT OR IGNORE INTO request_archive (
      id, request_id, archived_at, request_json
    ) VALUES (?, ?, ?, ?)
  `);

  for (const row of staleRows) {
    archiveInsert.run(
      randomUUID(),
      row.id,
      new Date().toISOString(),
      JSON.stringify({
        id: row.id,
        householdSlug: row.household_slug,
        householdName: row.household_name,
        need: row.need,
        summary: row.summary,
        owner: row.owner,
        dueAt: row.due_at,
        tone: row.tone,
        status: row.status,
        source: row.source,
        createdAt: row.created_at,
        requester: JSON.parse(row.requester_json),
        privacy: JSON.parse(row.privacy_json),
        assignedVolunteer: row.assigned_volunteer_json
          ? JSON.parse(row.assigned_volunteer_json)
          : null,
        escalation: row.escalation_json ? JSON.parse(row.escalation_json) : null,
      })
    );
  }

  db.prepare(`
    DELETE FROM requests
    WHERE status = 'Closed' AND created_at < ?
  `).run(closedCutoff);
  db.prepare(`
    DELETE FROM audit_logs
    WHERE actor_role = 'system' AND created_at < ?
  `).run(auditCutoff);
  db.prepare(`
    DELETE FROM rate_limits
    WHERE last_seen_at < ?
  `).run(rateLimitCutoff);

  db.exec("COMMIT");
  transactionStarted = false;

  console.log(`Retention sweep archived ${staleRows.length} closed requests.`);
} catch (error) {
  if (transactionStarted) {
    db.exec("ROLLBACK");
  }
  console.error("Retention sweep failed.", error);
  process.exit(1);
} finally {
  db?.close();
}
