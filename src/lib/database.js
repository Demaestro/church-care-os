import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { hashPassword } from "@/lib/auth-crypto";
import {
  defaultChurchSettings,
  defaultMinistryTeams,
} from "@/lib/organization-defaults";
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
    ensureSchemaMigrations(database);
    bootstrapDatabase(database);
  }

  return database;
}

export function closeDatabase() {
  if (database) {
    database.close();
    database = undefined;
  }
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

export function generateTrackingCode() {
  return `CCO-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
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
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      lane TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      contact_email TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS church_settings (
      id TEXT PRIMARY KEY,
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

    CREATE TABLE IF NOT EXISTS recovery_requests (
      id TEXT PRIMARY KEY,
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

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
      ON password_reset_tokens (user_id, requested_at DESC);

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry
      ON password_reset_tokens (expires_at, consumed_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
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

    CREATE INDEX IF NOT EXISTS idx_message_outbox_status_created
      ON message_outbox (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_message_outbox_recipient_created
      ON message_outbox (recipient_phone, created_at DESC);
  `);
}

function ensureSchemaMigrations(db) {
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
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_tracking_code
      ON requests (tracking_code);
  `);
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
  const hasTeams =
    db.prepare("SELECT 1 AS exists_flag FROM teams LIMIT 1").get()?.exists_flag === 1;
  const hasSettings =
    db.prepare("SELECT 1 AS exists_flag FROM church_settings LIMIT 1").get()
      ?.exists_flag === 1;
  const hasUsers =
    db.prepare("SELECT 1 AS exists_flag FROM users LIMIT 1").get()?.exists_flag === 1;

  if (!hasTeams) {
    seedTeams(db);
  }

  if (!hasSettings) {
    seedChurchSettings(db);
  }

  if (!hasUsers) {
    seedUsers(db);
  }
}

function seedTeams(db) {
  const insertTeam = db.prepare(`
    INSERT INTO teams (
      id, name, lane, description, lead_name, contact_email, active,
      capabilities_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const team of defaultMinistryTeams) {
    insertTeam.run(
      team.id,
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

  db.prepare(`
    INSERT INTO church_settings (
      id, church_name, campus_name, support_email, support_phone, timezone,
      intake_confirmation_text, emergency_banner, plan_name, billing_contact_email,
      monthly_seat_allowance, next_renewal_date, backup_expectation,
      email_delivery_mode, email_provider, email_from_name, email_from_address,
      email_reply_to, email_subject_prefix, message_delivery_mode, message_provider,
      sms_from_number, whatsapp_from_number, notification_channels_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "primary",
    defaultChurchSettings.churchName,
    defaultChurchSettings.campusName,
    defaultChurchSettings.supportEmail,
    defaultChurchSettings.supportPhone,
    defaultChurchSettings.timezone,
    defaultChurchSettings.intakeConfirmationText,
    defaultChurchSettings.emergencyBanner,
    defaultChurchSettings.planName,
    defaultChurchSettings.billingContactEmail,
    defaultChurchSettings.monthlySeatAllowance,
    defaultChurchSettings.nextRenewalDate,
    defaultChurchSettings.backupExpectation,
    defaultChurchSettings.emailDeliveryMode,
    defaultChurchSettings.emailProvider,
    defaultChurchSettings.emailFromName,
    defaultChurchSettings.emailFromAddress,
    defaultChurchSettings.emailReplyTo,
    defaultChurchSettings.emailSubjectPrefix,
    defaultChurchSettings.messageDeliveryMode,
    defaultChurchSettings.messageProvider,
    defaultChurchSettings.smsFromNumber,
    defaultChurchSettings.whatsappFromNumber,
    serializeJson(defaultChurchSettings.notificationChannels),
    now
  );
}

function seedUsers(db) {
  const users = getBootstrapUsers();
  if (users.length === 0) {
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, phone, role, password_hash, lane, volunteer_name, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();

  for (const user of users) {
    insertUser.run(
      randomUUID(),
      user.name,
      user.email.toLowerCase(),
      user.phone || null,
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
