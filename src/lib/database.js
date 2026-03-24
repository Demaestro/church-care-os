import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { hashPassword } from "@/lib/auth-crypto";
import { demoAuthUsers, retentionPolicy } from "@/lib/policies";

let database;

function resolveDatabasePath() {
  if (process.env.CARE_DB_PATH) {
    return process.env.CARE_DB_PATH;
  }

  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "care.db");
  }

  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "care.db"
  );
}

export function getDatabasePath() {
  return resolveDatabasePath();
}

export function getDatabase() {
  if (!database) {
    const databasePath = getDatabasePath();
    mkdirSync(path.dirname(databasePath), { recursive: true });
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec("PRAGMA journal_mode = WAL;");
    database.exec("PRAGMA busy_timeout = 5000;");
    createSchema(database);
    bootstrapDatabase(database);
  }

  return database;
}

export function withTransaction(callback) {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");

  try {
    const result = callback(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function serializeJson(value) {
  return JSON.stringify(value ?? null);
}

export function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function backupDatabaseTo(targetPath) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  await backup(getDatabase(), targetPath);
  return targetPath;
}

export function getDatabaseHealth() {
  const db = getDatabase();
  db.prepare("SELECT 1 AS ok").get();

  return {
    storeMode: "sqlite",
  };
}

export function runIntegrityCheck(targetPath = getDatabasePath()) {
  const db = new DatabaseSync(targetPath, { readonly: true });

  try {
    const result = db.prepare("PRAGMA integrity_check").get();
    return result?.integrity_check === "ok";
  } finally {
    db.close();
  }
}

export function purgeRetentionWindows() {
  const db = getDatabase();
  const cutoff = new Date(
    Date.now() - retentionPolicy.staleRateLimitDays * 24 * 60 * 60 * 1000
  ).toISOString();
  db.prepare("DELETE FROM rate_limits WHERE last_seen_at < ?").run(cutoff);
}

function createSchema(db) {
  db.exec(`
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

function bootstrapDatabase(db) {
  const hasUsers =
    db.prepare("SELECT 1 AS exists_flag FROM users LIMIT 1").get()?.exists_flag === 1;

  if (!hasUsers) {
    seedUsers(db);
  }
}

function seedUsers(db) {
  const users = getBootstrapUsers();
  if (users.length === 0) {
    return;
  }

  const insertUser = db.prepare(`
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
