import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { resolveDatabasePath } from "./lib/runtime-paths.mjs";

const defaultPrivacyPreference = {
  visibility: "pastors-and-assigned-leads",
  shareWithVolunteers: true,
  allowTextUpdates: true,
};

const demoAuthUsers = [
  {
    name: "Pastor Emmanuel",
    email: "pastor@grace.demo",
    password: "PastorDemo!2026",
    role: "pastor",
    lane: "",
    volunteerName: "",
  },
  {
    name: "Deacon Bello",
    email: "leader@grace.demo",
    password: "LeaderDemo!2026",
    role: "leader",
    lane: "Mercy & welfare lane",
    volunteerName: "",
  },
  {
    name: "Sister Ngozi Okafor",
    email: "volunteer@grace.demo",
    password: "VolunteerDemo!2026",
    role: "volunteer",
    lane: "",
    volunteerName: "Sister Ngozi Okafor",
  },
  {
    name: "Church Owner",
    email: "owner@grace.demo",
    password: "OwnerDemo!2026",
    role: "owner",
    lane: "",
    volunteerName: "",
  },
];

const dbPath = resolveDatabasePath();
const legacyStorePath =
  process.env.LEGACY_CARE_STORE_PATH ||
  process.env.CARE_STORE_PATH ||
  path.join(process.cwd(), "data", "care-store.json");

await mkdir(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

try {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  createSchema(db);
  seedHouseholdsAndRequests(db, await readLegacyStore());
  seedUsers(db);

  const householdCount =
    db.prepare("SELECT COUNT(*) AS count FROM households").get()?.count ?? 0;
  const requestCount =
    db.prepare("SELECT COUNT(*) AS count FROM requests").get()?.count ?? 0;
  const userCount =
    db.prepare("SELECT COUNT(*) AS count FROM users").get()?.count ?? 0;

  console.log(
    `Initialized ${dbPath} with ${householdCount} households, ${requestCount} requests, and ${userCount} users.`
  );
} finally {
  db.close();
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      stage TEXT NOT NULL,
      risk TEXT NOT NULL,
      situation TEXT NOT NULL,
      owner TEXT NOT NULL,
      next_touchpoint TEXT,
      summary_note TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      privacy_json TEXT NOT NULL DEFAULT '{}',
      pastoral_need_json TEXT,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS household_notes (
      id TEXT PRIMARY KEY,
      household_slug TEXT NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      author TEXT NOT NULL,
      kind TEXT NOT NULL,
      body TEXT NOT NULL
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_household_notes_household_slug
      ON household_notes (household_slug, created_at DESC);

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      household_slug TEXT NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
      household_name TEXT NOT NULL,
      need TEXT NOT NULL,
      summary TEXT NOT NULL,
      owner TEXT NOT NULL,
      due_at TEXT NOT NULL,
      tone TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      requester_json TEXT NOT NULL DEFAULT '{}',
      privacy_json TEXT NOT NULL DEFAULT '{}',
      assigned_volunteer_json TEXT,
      escalation_json TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_requests_household_slug
      ON requests (household_slug);
    CREATE INDEX IF NOT EXISTS idx_requests_status_due
      ON requests (status, due_at);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      lane TEXT,
      volunteer_name TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      actor_user_id TEXT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
      ON audit_logs (created_at DESC);

    CREATE TABLE IF NOT EXISTS request_archive (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      archived_at TEXT NOT NULL,
      request_json TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      window_started_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    ) STRICT;
  `);
}

function seedHouseholdsAndRequests(database, store) {
  const hasHouseholds =
    database.prepare("SELECT 1 AS exists_flag FROM households LIMIT 1").get()
      ?.exists_flag === 1;

  if (hasHouseholds) {
    return;
  }

  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");

  try {
    const insertHousehold = database.prepare(`
      INSERT INTO households (
        id, slug, name, stage, risk, situation, owner, next_touchpoint,
        summary_note, tags_json, privacy_json, pastoral_need_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertNote = database.prepare(`
      INSERT INTO household_notes (
        id, household_slug, created_at, author, kind, body
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertRequest = database.prepare(`
      INSERT INTO requests (
        id, household_slug, household_name, need, summary, owner, due_at, tone,
        status, source, created_at, requester_json, privacy_json,
        assigned_volunteer_json, escalation_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const household of store.households) {
      insertHousehold.run(
        household.id || randomUUID(),
        household.slug,
        household.name,
        household.stage || "Assign",
        household.risk || "watch",
        household.situation || "",
        household.owner || "Unassigned",
        household.nextTouchpoint || "",
        household.summaryNote || household.situation || "",
        JSON.stringify(Array.isArray(household.tags) ? household.tags : []),
        JSON.stringify(household.privacyPreference ?? defaultPrivacyPreference),
        JSON.stringify(household.pastoralNeed ?? null),
        household.createdAt || now
      );

      for (const note of household.notes ?? []) {
        insertNote.run(
          note.id || randomUUID(),
          household.slug,
          note.createdAt || now,
          note.author || "Care team",
          note.kind || "Follow-up",
          note.body || ""
        );
      }
    }

    for (const request of store.requests) {
      insertRequest.run(
        request.id || randomUUID(),
        request.householdSlug,
        request.householdName,
        request.need,
        request.summary || "",
        request.owner || "Unassigned",
        request.dueAt || now,
        request.tone || "watch",
        request.status || "Open",
        request.source || "Manual intake",
        request.createdAt || now,
        JSON.stringify(
          request.requester ?? {
            name: "Member",
            preferredContact: "Follow up requested",
            requestFor: "self",
          }
        ),
        JSON.stringify(request.privacy ?? defaultPrivacyPreference),
        request.assignedVolunteer
          ? JSON.stringify(request.assignedVolunteer)
          : null,
        request.escalation ? JSON.stringify(request.escalation) : null
      );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function seedUsers(database) {
  const hasUsers =
    database.prepare("SELECT 1 AS exists_flag FROM users LIMIT 1").get()
      ?.exists_flag === 1;

  if (hasUsers) {
    return;
  }

  const users = getBootstrapUsers();
  if (users.length === 0) {
    return;
  }

  const insertUser = database.prepare(`
    INSERT INTO users (
      id, name, email, role, password_hash, lane, volunteer_name, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const user of users) {
    insertUser.run(
      randomUUID(),
      user.name,
      user.email.toLowerCase(),
      user.role,
      hashPassword(user.password),
      user.lane || null,
      user.volunteerName || null,
      1,
      now
    );
  }
}

function getBootstrapUsers() {
  if (process.env.NODE_ENV !== "production") {
    return demoAuthUsers;
  }

  if (process.env.BOOTSTRAP_OWNER_EMAIL && process.env.BOOTSTRAP_OWNER_PASSWORD) {
    return [
      {
        name: process.env.BOOTSTRAP_OWNER_NAME || "Church Owner",
        email: process.env.BOOTSTRAP_OWNER_EMAIL,
        password: process.env.BOOTSTRAP_OWNER_PASSWORD,
        role: process.env.BOOTSTRAP_OWNER_ROLE || "owner",
        lane: "",
        volunteerName: "",
      },
    ];
  }

  return [];
}

async function readLegacyStore() {
  try {
    const raw = await readFile(legacyStorePath, "utf8");
    const parsed = JSON.parse(raw);

    return {
      households: Array.isArray(parsed?.households) ? parsed.households : [],
      requests: Array.isArray(parsed?.requests) ? parsed.requests : [],
    };
  } catch {
    return {
      households: [],
      requests: [],
    };
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}
