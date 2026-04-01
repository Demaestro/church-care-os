import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { readFileSync } from "node:fs";
import { hashPassword } from "@/lib/auth-crypto";
import {
  defaultBranchSettings,
  defaultBranches,
  defaultBranchTeams,
  defaultChurchSettings,
  defaultOrganizations,
  defaultPrimaryBranchId,
  defaultPrimaryOrganizationId,
  defaultRegions,
  permanentPastorAccounts,
} from "@/lib/organization-defaults";
import { demoAuthUsers, retentionPolicy } from "@/lib/policies";
import {
  closePostgresDatabase,
  getPostgresDatabase,
  getPostgresHealth,
  getPostgresScopedDatabase,
  withPostgresTransaction,
} from "@/lib/postgres-sync";

let database;

function resolveDatabaseDriver() {
  const configuredDriver = String(process.env.CARE_DATABASE_DRIVER || "")
    .trim()
    .toLowerCase();

  if (configuredDriver === "postgres") {
    return "postgres";
  }

  if (configuredDriver === "sqlite") {
    return "sqlite";
  }

  return process.env.DATABASE_URL ? "postgres" : "sqlite";
}

export function getDatabaseDriver() {
  return resolveDatabaseDriver();
}

function isPostgresDriver() {
  return resolveDatabaseDriver() === "postgres";
}

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
  if (isPostgresDriver()) {
    if (!database) {
      database = getPostgresDatabase();
      seedOrganizations(database);
      seedRegions(database);
      seedBranches(database);
      bootstrapDatabase(database);
    }

    return getPostgresScopedDatabase();
  }

  if (!database) {
    const databasePath = getDatabasePath();
    mkdirSync(path.dirname(databasePath), { recursive: true });
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec("PRAGMA journal_mode = WAL;");
    database.exec("PRAGMA busy_timeout = 5000;");
    createSchema(database);
    ensureSchemaMigrations(database);
    bootstrapDatabase(database);
  }

  return database;
}

export function closeDatabase() {
  if (isPostgresDriver()) {
    closePostgresDatabase();
    database = undefined;
    return;
  }

  if (database) {
    database.close();
    database = undefined;
  }
}

export function withTransaction(callback) {
  if (isPostgresDriver()) {
    return withPostgresTransaction(callback);
  }

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

export function generateTrackingCode() {
  return `CCO-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function backupDatabaseTo(targetPath) {
  if (isPostgresDriver()) {
    throw new Error(
      "PostgreSQL runtime is active. Use the export/import PostgreSQL tooling instead of SQLite file backups."
    );
  }

  mkdirSync(path.dirname(targetPath), { recursive: true });
  await backup(getDatabase(), targetPath);
  return targetPath;
}

export function getDatabaseHealth() {
  if (isPostgresDriver()) {
    return {
      ...getPostgresHealth(),
      targetDriver: resolveDatabaseDriver(),
    };
  }

  const db = getDatabase();
  db.prepare("SELECT 1 AS ok").get();

  return {
    storeMode: "sqlite",
    targetDriver: resolveDatabaseDriver(),
  };
}

export function runIntegrityCheck(targetPath = getDatabasePath()) {
  if (isPostgresDriver()) {
    getPostgresDatabase().prepare("SELECT 1 AS ok").get();
    return true;
  }

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
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short_name TEXT,
      support_email TEXT,
      support_phone TEXT,
      headquarters_city TEXT,
      country TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      lead_name TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, slug),
      UNIQUE (organization_id, code)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
      slug TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      city TEXT,
      state TEXT,
      country TEXT,
      pastor_name TEXT,
      support_email TEXT,
      support_phone TEXT,
      is_headquarters INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, slug)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
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
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
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
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
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
      tracking_code TEXT,
      status_detail TEXT,
      assigned_volunteer_json TEXT,
      escalation_json TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_requests_household_slug
      ON requests (household_slug);
    CREATE INDEX IF NOT EXISTS idx_requests_status_due
      ON requests (status, due_at);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role TEXT NOT NULL,
      access_scope TEXT NOT NULL DEFAULT 'branch',
      title TEXT,
      managed_branch_ids_json TEXT NOT NULL DEFAULT '[]',
      password_hash TEXT NOT NULL,
      lane TEXT,
      volunteer_name TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      session_version INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
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
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
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

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      lane TEXT NOT NULL,
      description TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      contact_email TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, branch_id, name),
      UNIQUE (organization_id, branch_id, lane)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS church_settings (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
      church_name TEXT NOT NULL,
      campus_name TEXT,
      support_email TEXT,
      support_phone TEXT,
      timezone TEXT NOT NULL,
      intake_confirmation_text TEXT NOT NULL,
      emergency_banner TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      billing_contact_email TEXT,
      monthly_seat_allowance TEXT,
      next_renewal_date TEXT,
      backup_expectation TEXT,
      email_delivery_mode TEXT NOT NULL DEFAULT 'log-only',
      email_provider TEXT NOT NULL DEFAULT 'resend',
      email_from_name TEXT,
      email_from_address TEXT,
      email_reply_to TEXT,
      email_subject_prefix TEXT,
      message_delivery_mode TEXT NOT NULL DEFAULT 'log-only',
      message_provider TEXT NOT NULL DEFAULT 'twilio',
      sms_from_number TEXT,
      whatsapp_from_number TEXT,
      notification_channels_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS branch_settings (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
      support_email TEXT,
      support_phone TEXT,
      intake_confirmation_text TEXT,
      emergency_banner TEXT,
      public_intro TEXT,
      follow_up_guidance TEXT,
      email_from_name TEXT,
      email_from_address TEXT,
      email_reply_to TEXT,
      sms_from_number TEXT,
      whatsapp_from_number TEXT,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS recovery_requests (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      requester_name TEXT,
      note TEXT,
      status TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      handled_at TEXT,
      handled_by TEXT,
      resolution_note TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_recovery_requests_status
      ON recovery_requests (status, requested_at DESC);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      requested_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS auth_invites (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT,
      access_scope TEXT NOT NULL DEFAULT 'branch',
      managed_branch_ids_json TEXT NOT NULL DEFAULT '[]',
      lane TEXT,
      volunteer_name TEXT,
      token_hash TEXT NOT NULL UNIQUE,
      invited_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS auth_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
      ON password_reset_tokens (user_id, requested_at DESC);

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry
      ON password_reset_tokens (expires_at, consumed_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      read_at TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
      ON notifications (recipient_user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
      ON notifications (recipient_user_id, read_at, created_at DESC);

    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      template_key TEXT NOT NULL,
      purpose TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      text_body TEXT NOT NULL,
      html_body TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_message_id TEXT,
      provider_response_json TEXT NOT NULL DEFAULT '{}',
      error_message TEXT,
      created_at TEXT NOT NULL,
      attempted_at TEXT,
      sent_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created
      ON email_outbox (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_email_outbox_recipient_created
      ON email_outbox (recipient_email, created_at DESC);

    CREATE TABLE IF NOT EXISTS message_outbox (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      channel TEXT NOT NULL,
      template_key TEXT NOT NULL,
      purpose TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      recipient_name TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_message_id TEXT,
      provider_response_json TEXT NOT NULL DEFAULT '{}',
      error_message TEXT,
      created_at TEXT NOT NULL,
      attempted_at TEXT,
      sent_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    ) STRICT;

    CREATE TABLE IF NOT EXISTS household_attachments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      household_slug TEXT NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
      request_id TEXT REFERENCES requests(id) ON DELETE SET NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'branch-staff',
      uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      uploaded_by_name TEXT NOT NULL,
      uploaded_by_role TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS member_transfers (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      household_slug TEXT NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
      from_branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      to_branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      requested_by_name TEXT NOT NULL,
      requested_by_role TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      note TEXT,
      requested_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT,
      completed_at TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
      branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
      queue TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      run_after TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      locked_at TEXT,
      locked_by TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_message_outbox_status_created
      ON message_outbox (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_message_outbox_recipient_created
      ON message_outbox (recipient_phone, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_regions_org_active
      ON regions (organization_id, active, name);
    CREATE INDEX IF NOT EXISTS idx_branch_settings_branch
      ON branch_settings (organization_id, branch_id);
    CREATE INDEX IF NOT EXISTS idx_auth_invites_email
      ON auth_invites (email, expires_at, consumed_at);
    CREATE INDEX IF NOT EXISTS idx_auth_challenges_user
      ON auth_challenges (user_id, expires_at, consumed_at);
    CREATE INDEX IF NOT EXISTS idx_household_attachments_household
      ON household_attachments (household_slug, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_member_transfers_scope
      ON member_transfers (organization_id, from_branch_id, to_branch_id, status, requested_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after
      ON jobs (status, run_after, queue);
  `);
}

function ensureSchemaMigrations(db) {
  seedOrganizations(db);
  seedRegions(db);

  // These columns must exist on branches BEFORE seedBranches runs its INSERT.
  addColumnIfMissing(db, "branches", "region_id", "TEXT");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_branches_org_region
      ON branches (organization_id, region_id, active, name);
  `);

  seedBranches(db);

  addColumnIfMissing(
    db,
    "households",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "households",
    "branch_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "household_notes",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "household_notes",
    "branch_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "requests",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "requests",
    "branch_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "users",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "users",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "users",
    "access_scope",
    `TEXT NOT NULL DEFAULT 'branch'`
  );
  addColumnIfMissing(db, "users", "title", "TEXT");
  addColumnIfMissing(
    db,
    "users",
    "managed_branch_ids_json",
    `TEXT NOT NULL DEFAULT '[]'`
  );
  addColumnIfMissing(db, "users", "mfa_enabled", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "users", "mfa_mode", `TEXT NOT NULL DEFAULT 'off'`);
  addColumnIfMissing(db, "users", "mfa_secret", "TEXT");
  addColumnIfMissing(
    db,
    "users",
    "mfa_backup_codes_json",
    `TEXT NOT NULL DEFAULT '[]'`
  );
  // region_id migration and its index are handled at the top of this
  // function, before seedBranches runs. Nothing more needed here.
  addColumnIfMissing(
    db,
    "audit_logs",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "audit_logs",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "request_archive",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "request_archive",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "teams",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "teams",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "church_settings",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "recovery_requests",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "recovery_requests",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "notifications",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "notifications",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "email_outbox",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "email_outbox",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(
    db,
    "message_outbox",
    "organization_id",
    `TEXT NOT NULL DEFAULT '${defaultPrimaryOrganizationId}'`
  );
  addColumnIfMissing(
    db,
    "message_outbox",
    "branch_id",
    `TEXT DEFAULT '${defaultPrimaryBranchId}'`
  );
  addColumnIfMissing(db, "requests", "tracking_code", "TEXT");
  addColumnIfMissing(db, "requests", "status_detail", "TEXT");
  addColumnIfMissing(db, "users", "phone", "TEXT");
  addColumnIfMissing(
    db,
    "users",
    "session_version",
    "INTEGER NOT NULL DEFAULT 1"
  );
  addColumnIfMissing(db, "users", "last_login_at", "TEXT");
  addColumnIfMissing(
    db,
    "church_settings",
    "email_delivery_mode",
    "TEXT NOT NULL DEFAULT 'log-only'"
  );
  addColumnIfMissing(
    db,
    "church_settings",
    "email_provider",
    "TEXT NOT NULL DEFAULT 'resend'"
  );
  addColumnIfMissing(db, "church_settings", "email_from_name", "TEXT");
  addColumnIfMissing(db, "church_settings", "email_from_address", "TEXT");
  addColumnIfMissing(db, "church_settings", "email_reply_to", "TEXT");
  addColumnIfMissing(db, "church_settings", "email_subject_prefix", "TEXT");
  addColumnIfMissing(
    db,
    "church_settings",
    "message_delivery_mode",
    "TEXT NOT NULL DEFAULT 'log-only'"
  );
  addColumnIfMissing(
    db,
    "church_settings",
    "message_provider",
    "TEXT NOT NULL DEFAULT 'twilio'"
  );
  addColumnIfMissing(db, "church_settings", "sms_from_number", "TEXT");
  addColumnIfMissing(db, "church_settings", "whatsapp_from_number", "TEXT");
  addColumnIfMissing(
    db,
    "requests",
    "reminders_sent_json",
    `TEXT NOT NULL DEFAULT '[]'`
  );
  addColumnIfMissing(db, "requests", "last_activity_at", "TEXT");
  addColumnIfMissing(db, "requests", "assigned_volunteer_json", "TEXT");

  // New member journey columns
  addColumnIfMissing(db, "users", "birthday", "TEXT");
  addColumnIfMissing(db, "users", "gender", "TEXT NOT NULL DEFAULT 'unspecified'");
  addColumnIfMissing(db, "users", "member_type", "TEXT NOT NULL DEFAULT 'member'");
  addColumnIfMissing(db, "households", "birthday", "TEXT");
  addColumnIfMissing(db, "households", "gender", "TEXT NOT NULL DEFAULT 'unspecified'");
  addColumnIfMissing(db, "households", "member_type", "TEXT NOT NULL DEFAULT 'member'");

  // New member journey tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS new_member_journeys (
      id                TEXT PRIMARY KEY,
      organization_id   TEXT NOT NULL,
      branch_id         TEXT NOT NULL,
      member_name       TEXT NOT NULL,
      member_email      TEXT,
      member_phone      TEXT,
      gender            TEXT NOT NULL DEFAULT 'unspecified',
      birthday          TEXT,
      status            TEXT NOT NULL DEFAULT 'active',
      registered_at     TEXT NOT NULL DEFAULT (datetime('now')),
      last_contact_at   TEXT,
      contact_count     INTEGER NOT NULL DEFAULT 0,
      touchpoints_sent  TEXT NOT NULL DEFAULT '[]',
      assigned_volunteer_id   TEXT,
      assigned_volunteer_name TEXT,
      completed_at      TEXT,
      dropped_at        TEXT,
      drop_reason       TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journey_contacts (
      id                    TEXT PRIMARY KEY,
      journey_id            TEXT NOT NULL,
      organization_id       TEXT NOT NULL,
      branch_id             TEXT NOT NULL,
      contacted_by_user_id  TEXT NOT NULL,
      contacted_by_name     TEXT NOT NULL,
      contact_method        TEXT NOT NULL DEFAULT 'call',
      outcome               TEXT NOT NULL DEFAULT 'reached',
      notes                 TEXT,
      contacted_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_schedules (
      id                      TEXT PRIMARY KEY,
      organization_id         TEXT NOT NULL,
      branch_id               TEXT NOT NULL,
      service_name            TEXT NOT NULL DEFAULT 'Sunday Service',
      day_of_week             INTEGER NOT NULL DEFAULT 0,
      service_time            TEXT NOT NULL DEFAULT '09:00',
      location                TEXT,
      address                 TEXT,
      reminder_thursday       INTEGER NOT NULL DEFAULT 1,
      reminder_saturday       INTEGER NOT NULL DEFAULT 1,
      reminder_sunday_morning INTEGER NOT NULL DEFAULT 1,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(organization_id, branch_id)
    );

    CREATE INDEX IF NOT EXISTS idx_journeys_scope
      ON new_member_journeys (organization_id, branch_id, status);
    CREATE INDEX IF NOT EXISTS idx_journey_contacts_journey
      ON journey_contacts (journey_id);
  `);

  // Follow-up engine columns
  addColumnIfMissing(db, "requests", "next_contact_due", "TEXT");
  addColumnIfMissing(db, "requests", "follow_up_rhythm", "TEXT");
  addColumnIfMissing(db, "requests", "follow_up_goal", "TEXT");
  addColumnIfMissing(db, "requests", "discipleship_stage", "TEXT");
  addColumnIfMissing(db, "requests", "follow_up_template", "TEXT");
  addColumnIfMissing(db, "requests", "last_contact_outcome", "TEXT");
  addColumnIfMissing(db, "requests", "follow_up_owner_id", "TEXT");
  addColumnIfMissing(db, "requests", "follow_up_owner_name", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS discipleship_records (
      id                TEXT PRIMARY KEY,
      organization_id   TEXT NOT NULL,
      branch_id         TEXT NOT NULL,
      household_id      TEXT NOT NULL,
      household_slug    TEXT NOT NULL,
      household_name    TEXT NOT NULL,
      stage             TEXT NOT NULL DEFAULT 'new_believer',
      pathway           TEXT NOT NULL DEFAULT 'standard',
      assigned_leader_id   TEXT,
      assigned_leader_name TEXT,
      small_group_connected INTEGER NOT NULL DEFAULT 0,
      attending_regularly   INTEGER NOT NULL DEFAULT 0,
      serving               INTEGER NOT NULL DEFAULT 0,
      baptized              INTEGER NOT NULL DEFAULT 0,
      foundation_class      INTEGER NOT NULL DEFAULT 0,
      mentoring_others      INTEGER NOT NULL DEFAULT 0,
      next_step         TEXT,
      notes             TEXT,
      last_updated_by   TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(organization_id, household_id)
    );
    CREATE INDEX IF NOT EXISTS idx_discipleship_scope
      ON discipleship_records (organization_id, branch_id, stage);
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_tracking_code
      ON requests (tracking_code);
    CREATE INDEX IF NOT EXISTS idx_households_scope
      ON households (organization_id, branch_id);
    CREATE INDEX IF NOT EXISTS idx_requests_scope
      ON requests (organization_id, branch_id, status);
    CREATE INDEX IF NOT EXISTS idx_users_scope
      ON users (organization_id, branch_id, role);
    CREATE INDEX IF NOT EXISTS idx_teams_scope
      ON teams (organization_id, branch_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_scope
      ON audit_logs (organization_id, branch_id, created_at DESC);
  `);
  backfillScopeColumns(db);
  backfillBranchRegions(db);
  backfillRequestTrackingCodes(db);
  backfillRequestStatusDetails(db);
}

function addColumnIfMissing(db, tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function seedOrganizations(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO organizations (
      id, slug, name, short_name, support_email, support_phone,
      headquarters_city, country, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const organization of defaultOrganizations) {
    insert.run(
      organization.id,
      organization.slug,
      organization.name,
      organization.shortName || null,
      organization.supportEmail || null,
      organization.supportPhone || null,
      organization.headquartersCity || null,
      organization.country || null,
      1,
      now
    );
  }
}

function seedBranches(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO branches (
      id, organization_id, region_id, slug, code, name, city, state, country,
      pastor_name, support_email, support_phone, is_headquarters, active,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const branch of defaultBranches) {
    insert.run(
      branch.id,
      branch.organizationId,
      branch.regionId || null,
      branch.slug,
      branch.code,
      branch.name,
      branch.city || null,
      branch.state || null,
      branch.country || null,
      branch.pastorName || null,
      branch.supportEmail || null,
      branch.supportPhone || null,
      branch.isHeadquarters ? 1 : 0,
      1,
      now,
      now
    );
  }
}

function seedRegions(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO regions (
      id, organization_id, slug, code, name, description, lead_name, active,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const region of defaultRegions) {
    insert.run(
      region.id,
      region.organizationId,
      region.slug,
      region.code,
      region.name,
      region.description || null,
      region.leadName || null,
      1,
      now,
      now
    );
  }
}

function backfillScopeColumns(db) {
  db.prepare(`
    UPDATE households
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE household_notes
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE requests
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE users
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?),
        access_scope = COALESCE(access_scope, 'branch'),
        managed_branch_ids_json = CASE
          WHEN managed_branch_ids_json IS NULL OR managed_branch_ids_json = ''
          THEN ?
          ELSE managed_branch_ids_json
        END
  `).run(
    defaultPrimaryOrganizationId,
    defaultPrimaryBranchId,
    serializeJson([defaultPrimaryBranchId])
  );

  db.prepare(`
    UPDATE audit_logs
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE request_archive
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE teams
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE church_settings
    SET organization_id = COALESCE(organization_id, ?)
  `).run(defaultPrimaryOrganizationId);

  db.prepare(`
    UPDATE recovery_requests
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE notifications
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE email_outbox
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);

  db.prepare(`
    UPDATE message_outbox
    SET organization_id = COALESCE(organization_id, ?),
        branch_id = COALESCE(branch_id, ?)
  `).run(defaultPrimaryOrganizationId, defaultPrimaryBranchId);
}

function backfillRequestTrackingCodes(db) {
  const rows = db.prepare(`
    SELECT id
    FROM requests
    WHERE tracking_code IS NULL OR tracking_code = ''
  `).all();
  const update = db.prepare(`
    UPDATE requests
    SET tracking_code = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    update.run(nextTrackingCode(db), row.id);
  }
}

function backfillBranchRegions(db) {
  const update = db.prepare(`
    UPDATE branches
    SET region_id = ?
    WHERE id = ? AND (region_id IS NULL OR region_id = '')
  `);

  for (const branch of defaultBranches) {
    if (branch.regionId) {
      update.run(branch.regionId, branch.id);
    }
  }
}

function backfillRequestStatusDetails(db) {
  const rows = db.prepare(`
    SELECT id, owner, status, assigned_volunteer_json, escalation_json
    FROM requests
    WHERE status_detail IS NULL OR status_detail = ''
  `).all();
  const update = db.prepare(`
    UPDATE requests
    SET status_detail = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    update.run(buildStatusDetail(row), row.id);
  }
}

function nextTrackingCode(db) {
  let code = generateTrackingCode();

  while (
    db.prepare("SELECT 1 AS exists_flag FROM requests WHERE tracking_code = ? LIMIT 1")
      .get(code)?.exists_flag === 1
  ) {
    code = generateTrackingCode();
  }

  return code;
}

function buildStatusDetail(row) {
  if (row.status === "Closed") {
    return "Your request has been resolved and logged by the care team.";
  }

  if (row.escalation_json) {
    return "A pastor is reviewing the next safe step before any wider handoff.";
  }

  if (row.assigned_volunteer_json) {
    return "An assigned care team follow-up is now in progress.";
  }

  if (row.owner && row.owner !== "Unassigned") {
    return "Your request has been assigned to a care lead for follow-up.";
  }

  return "Your request has been received and is awaiting pastoral review.";
}

function bootstrapDatabase(db) {
  const hasOrganizations =
    db.prepare("SELECT 1 AS exists_flag FROM organizations LIMIT 1").get()?.exists_flag ===
    1;
  const hasBranches =
    db.prepare("SELECT 1 AS exists_flag FROM branches LIMIT 1").get()?.exists_flag === 1;
  if (!hasOrganizations) {
    seedOrganizations(db);
  }

  // Always run seedBranches — INSERT OR IGNORE is idempotent,
  // so new branches added to defaultBranches are picked up on restart.
  seedBranches(db);

  seedBranchSettings(db);
  seedTeams(db);
  seedChurchSettings(db);
  seedUsers(db);
  seedPermanentPastors(db);

  seedDemoBranchCoverage(db);
}

function seedBranchSettings(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO branch_settings (
      id, organization_id, branch_id, support_email, support_phone,
      intake_confirmation_text, emergency_banner, public_intro,
      follow_up_guidance, email_from_name, email_from_address, email_reply_to,
      sms_from_number, whatsapp_from_number, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const settings of defaultBranchSettings) {
    insert.run(
      settings.id,
      settings.organizationId,
      settings.branchId,
      settings.supportEmail || null,
      settings.supportPhone || null,
      settings.intakeConfirmationText || null,
      settings.emergencyBanner || null,
      settings.publicIntro || null,
      settings.followUpGuidance || null,
      settings.emailFromName || null,
      settings.emailFromAddress || null,
      settings.emailReplyTo || null,
      settings.smsFromNumber || null,
      settings.whatsappFromNumber || null,
      now
    );
  }
}

function seedTeams(db) {
  const insertTeam = db.prepare(`
    INSERT OR IGNORE INTO teams (
      id, organization_id, branch_id, name, lane, description, lead_name,
      contact_email, active, capabilities_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const team of defaultBranchTeams) {
    insertTeam.run(
      team.id,
      team.organizationId,
      team.branchId,
      team.name,
      team.lane,
      team.description,
      team.leadName,
      team.contactEmail || null,
      1,
      serializeJson(team.capabilities || []),
      now,
      now
    );
  }
}

function seedChurchSettings(db) {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO church_settings (
      id, organization_id, church_name, campus_name, support_email, support_phone, timezone,
      intake_confirmation_text, emergency_banner, plan_name, billing_contact_email,
      monthly_seat_allowance, next_renewal_date, backup_expectation,
      email_delivery_mode, email_provider, email_from_name, email_from_address,
      email_reply_to, email_subject_prefix, message_delivery_mode, message_provider,
      sms_from_number, whatsapp_from_number, notification_channels_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const organization of defaultOrganizations) {
    const hqBranch =
      defaultBranches.find(
        (branch) =>
          branch.organizationId === organization.id && branch.isHeadquarters
      ) ||
      defaultBranches.find((branch) => branch.organizationId === organization.id);
    const settings = {
      ...defaultChurchSettings,
      churchName: organization.name,
      campusName: hqBranch?.name || defaultChurchSettings.campusName,
      supportEmail: organization.supportEmail || defaultChurchSettings.supportEmail,
      supportPhone: organization.supportPhone || defaultChurchSettings.supportPhone,
      billingContactEmail:
        organization.supportEmail || defaultChurchSettings.billingContactEmail,
      emailFromName: `${organization.name} Care Office`,
      emailFromAddress:
        organization.supportEmail || defaultChurchSettings.emailFromAddress,
      emailReplyTo: organization.supportEmail || defaultChurchSettings.emailReplyTo,
      emailSubjectPrefix: organization.name,
    };

    insert.run(
      `settings-${organization.id}`,
      organization.id,
      settings.churchName,
      settings.campusName,
      settings.supportEmail,
      settings.supportPhone,
      settings.timezone,
      settings.intakeConfirmationText,
      settings.emergencyBanner,
      settings.planName,
      settings.billingContactEmail,
      settings.monthlySeatAllowance,
      settings.nextRenewalDate,
      settings.backupExpectation,
      settings.emailDeliveryMode,
      settings.emailProvider,
      settings.emailFromName,
      settings.emailFromAddress,
      settings.emailReplyTo,
      settings.emailSubjectPrefix,
      settings.messageDeliveryMode,
      settings.messageProvider,
      settings.smsFromNumber,
      settings.whatsappFromNumber,
      serializeJson(settings.notificationChannels),
      now
    );
  }
}

function seedPermanentPastors(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, organization_id, branch_id, name, email, role, access_scope,
      title, managed_branch_ids_json, password_hash, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  for (const u of permanentPastorAccounts) {
    insert.run(
      u.id,
      u.organizationId,
      u.branchId,
      u.name,
      u.email.toLowerCase(),
      u.role,
      u.accessScope || "branch",
      u.title || null,
      serializeJson([u.branchId]),
      hashPassword(u.password),
      1,
      now
    );
  }
}

function seedUsers(db) {
  const users = getBootstrapUsers();
  if (users.length === 0) {
    return;
  }

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, organization_id, branch_id, name, email, phone, role, access_scope,
      title, managed_branch_ids_json, password_hash, lane, volunteer_name, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const user of users) {
    insertUser.run(
      randomUUID(),
      user.organizationId || defaultPrimaryOrganizationId,
      user.branchId || defaultPrimaryBranchId,
      user.name,
      user.email.toLowerCase(),
      user.phone || null,
      user.role,
      user.accessScope || "branch",
      user.title || null,
      serializeJson(user.managedBranchIds || []),
      hashPassword(user.password),
      user.lane || null,
      user.volunteerName || null,
      1,
      now
    );
  }
}

function getBootstrapUsers() {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.CARE_SEED_DEMO_USERS === "1"
  ) {
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

function seedDemoBranchCoverage(db) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const branchHouseholdCounts = new Map(
    db
      .prepare(`
        SELECT branch_id, COUNT(*) AS count
        FROM households
        GROUP BY branch_id
      `)
      .all()
      .map((row) => [row.branch_id, Number(row.count || 0)])
  );

  const demoHouseholds = [
    {
      branchId: "branch-firstlove-abuja-central",
      organizationId: "org-firstlove",
      slug: "amaka-obi-abuja",
      name: "Amaka Obi",
      stage: "Support",
      risk: "watch",
      situation: "Grief support follow-up after a family loss.",
      owner: "Counseling & grief lane",
      nextTouchpoint: "2026-03-31T11:00:00.000Z",
      summaryNote: "Abuja branch is pacing weekly support calls and one in-person visit.",
      tags: ["Grief support", "Abuja"],
      needTitle: "Grief support",
      requestNeed: "Grief support",
      requestSummary:
        "Member requested a branch-led grief support rhythm with one pastor-approved volunteer call per week.",
      requester: {
        name: "Amaka Obi",
        email: "amaka.obi@example.com",
        phone: "+2348015550101",
        preferredContact: "Phone call",
        requestFor: "self",
      },
    },
    {
      branchId: "branch-firstlove-enugu-city",
      organizationId: "org-firstlove",
      slug: "elder-onyeka-enugu",
      name: "Elder Onyeka",
      stage: "Assign",
      risk: "urgent",
      situation: "Mobility support and pastoral check-in after discharge.",
      owner: "Hospital & visitation lane",
      nextTouchpoint: "2026-03-30T14:00:00.000Z",
      summaryNote: "Enugu branch needs a transport and home-visit plan this week.",
      tags: ["Hospital visit", "Enugu"],
      needTitle: "Hospital visit",
      requestNeed: "Hospital visit",
      requestSummary:
        "Pastoral staff in Enugu are arranging a recovery visit and practical mobility support.",
      requester: {
        name: "Elder Onyeka",
        email: "onyeka@example.com",
        phone: "+2348015550102",
        preferredContact: "Phone call",
        requestFor: "self",
      },
    },
  ];

  for (const household of demoHouseholds) {
    if ((branchHouseholdCounts.get(household.branchId) || 0) > 0) {
      continue;
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO households (
        id, organization_id, branch_id, slug, name, stage, risk, situation,
        owner, next_touchpoint, summary_note, tags_json, privacy_json,
        pastoral_need_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      household.organizationId,
      household.branchId,
      household.slug,
      household.name,
      household.stage,
      household.risk,
      household.situation,
      household.owner,
      household.nextTouchpoint,
      household.summaryNote,
      serializeJson(household.tags),
      serializeJson({
        visibility: "pastors-and-assigned-leads",
        shareWithVolunteers: true,
        allowTextUpdates: true,
      }),
      serializeJson({
        title: household.needTitle,
        detail: household.summaryNote,
        nextStep: "Branch pastor to confirm follow-up ownership and timing.",
      }),
      now
    );

    db.prepare(`
      INSERT INTO household_notes (
        id, organization_id, branch_id, household_slug, created_at, author, kind, body
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      household.organizationId,
      household.branchId,
      household.slug,
      now,
      "Branch intake",
      "Intake",
      household.requestSummary
    );

    db.prepare(`
      INSERT INTO requests (
        id, organization_id, branch_id, household_slug, household_name, need, summary,
        owner, due_at, tone, status, source, created_at, requester_json, privacy_json,
        tracking_code, status_detail, assigned_volunteer_json, escalation_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      household.organizationId,
      household.branchId,
      household.slug,
      household.name,
      household.requestNeed,
      household.requestSummary,
      household.owner,
      household.nextTouchpoint,
      household.risk,
      "Open",
      "Branch intake",
      now,
      serializeJson(household.requester),
      serializeJson({
        visibility: "pastors-and-assigned-leads",
        shareWithVolunteers: true,
        allowTextUpdates: true,
      }),
      generateTrackingCode(),
      "Your request has been assigned to a branch care lead for follow-up.",
      null,
      null
    );
  }
}
