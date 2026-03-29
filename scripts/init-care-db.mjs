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

const defaultMinistryTeams = [
  {
    id: "team-mercy-welfare",
    name: "Mercy & welfare team",
    lane: "Mercy & welfare lane",
    description:
      "Coordinates practical care such as meals, transport, and short-term welfare support after pastoral review.",
    leadName: "Deacon Bello",
    contactEmail: "mercy@gracecommunity.church",
    capabilities: ["Meal support", "Transport", "Financial help"],
  },
  {
    id: "team-prayer-follow-up",
    name: "Prayer & encouragement team",
    lane: "Prayer & encouragement lane",
    description:
      "Handles prayer follow-up, encouragement calls, and gentle check-ins that do not require sensitive case detail.",
    leadName: "Pastor Emmanuel",
    contactEmail: "prayer@gracecommunity.church",
    capabilities: ["Prayer", "Encouragement", "Phone follow-up"],
  },
  {
    id: "team-hospital-visits",
    name: "Hospital & visitation team",
    lane: "Hospital & visitation lane",
    description:
      "Organizes visits, bedside prayer, and recovery support when in-person presence is appropriate.",
    leadName: "Elder Tunde",
    contactEmail: "visits@gracecommunity.church",
    capabilities: ["Hospital visit", "Home visit", "Recovery support"],
  },
  {
    id: "team-counsel-grief",
    name: "Counseling & grief support team",
    lane: "Counseling & grief lane",
    description:
      "Supports longer-form care work that stays under closer pastoral oversight before wider volunteer handoff.",
    leadName: "Pastor Emmanuel",
    contactEmail: "care@gracecommunity.church",
    capabilities: ["Counseling", "Grief support", "Someone to talk to"],
  },
];

const defaultChurchSettings = {
  churchName: "Grace Community Church",
  campusName: "Main campus",
  supportEmail: "care@gracecommunity.church",
  supportPhone: "+234 800 000 0000",
  timezone: "Africa/Lagos",
  intakeConfirmationText:
    "Your request has been received. A pastor or assigned care leader will review it and follow up using the contact method you provided.",
  emergencyBanner:
    "If the situation is unsafe or urgent right now, contact a pastor or emergency support directly instead of waiting on this form alone.",
  planName: "Steward plan",
  billingContactEmail: "finance@gracecommunity.church",
  monthlySeatAllowance: "25 internal seats",
  nextRenewalDate: "2026-06-01T00:00:00.000Z",
  backupExpectation: "Nightly backups with a weekly restore drill",
  emailDeliveryMode: "log-only",
  emailProvider: "resend",
  emailFromName: "Grace Community Church Care Team",
  emailFromAddress: "care@gracecommunity.church",
  emailReplyTo: "care@gracecommunity.church",
  emailSubjectPrefix: "Grace Community Church",
  messageDeliveryMode: "log-only",
  messageProvider: "twilio",
  smsFromNumber: "+15005550006",
  whatsappFromNumber: "+14155238886",
  notificationChannels: ["Phone follow-up", "Text updates", "In-person visit"],
};

const demoAuthUsers = [
  {
    name: "Pastor Emmanuel",
    email: "pastor@grace.demo",
    phone: "+2348010000001",
    password: "PastorDemo!2026",
    role: "pastor",
    lane: "",
    volunteerName: "",
  },
  {
    name: "Deacon Bello",
    email: "leader@grace.demo",
    phone: "+2348010000002",
    password: "LeaderDemo!2026",
    role: "leader",
    lane: "Mercy & welfare lane",
    volunteerName: "",
  },
  {
    name: "Sister Ngozi Okafor",
    email: "volunteer@grace.demo",
    phone: "+2348010000003",
    password: "VolunteerDemo!2026",
    role: "volunteer",
    lane: "",
    volunteerName: "Sister Ngozi Okafor",
  },
  {
    name: "Church Owner",
    email: "owner@grace.demo",
    phone: "+2348010000004",
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
  path.join(path.dirname(dbPath), "care-store.json");

await mkdir(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

try {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  createSchema(db);
  ensureSchemaMigrations(db);
  seedHouseholdsAndRequests(db, await readLegacyStore());
  seedTeams(db);
  seedChurchSettings(db);
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

function ensureSchemaMigrations(database) {
  addColumnIfMissing(database, "requests", "tracking_code", "TEXT");
  addColumnIfMissing(database, "requests", "status_detail", "TEXT");
  addColumnIfMissing(database, "users", "phone", "TEXT");
  addColumnIfMissing(
    database,
    "church_settings",
    "email_delivery_mode",
    "TEXT NOT NULL DEFAULT 'log-only'"
  );
  addColumnIfMissing(
    database,
    "church_settings",
    "email_provider",
    "TEXT NOT NULL DEFAULT 'resend'"
  );
  addColumnIfMissing(database, "church_settings", "email_from_name", "TEXT");
  addColumnIfMissing(database, "church_settings", "email_from_address", "TEXT");
  addColumnIfMissing(database, "church_settings", "email_reply_to", "TEXT");
  addColumnIfMissing(database, "church_settings", "email_subject_prefix", "TEXT");
  addColumnIfMissing(
    database,
    "church_settings",
    "message_delivery_mode",
    "TEXT NOT NULL DEFAULT 'log-only'"
  );
  addColumnIfMissing(
    database,
    "church_settings",
    "message_provider",
    "TEXT NOT NULL DEFAULT 'twilio'"
  );
  addColumnIfMissing(database, "church_settings", "sms_from_number", "TEXT");
  addColumnIfMissing(database, "church_settings", "whatsapp_from_number", "TEXT");
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_tracking_code
      ON requests (tracking_code);
  `);
  backfillRequestTrackingCodes(database);
  backfillRequestStatusDetails(database);
}

function addColumnIfMissing(database, tableName, columnName, columnDefinition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    database.exec(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
    );
  }
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
        status, source, created_at, requester_json, privacy_json, tracking_code,
        status_detail, assigned_volunteer_json, escalation_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            email: "",
            preferredContact: "Follow up requested",
            requestFor: "self",
          }
        ),
        JSON.stringify(request.privacy ?? defaultPrivacyPreference),
        request.trackingCode || nextTrackingCode(database),
        request.statusDetail || buildStatusDetail(request),
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

function seedTeams(database) {
  const hasTeams =
    database.prepare("SELECT 1 AS exists_flag FROM teams LIMIT 1").get()
      ?.exists_flag === 1;

  if (hasTeams) {
    return;
  }

  const insertTeam = database.prepare(`
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
      JSON.stringify(team.capabilities || []),
      now,
      now
    );
  }
}

function seedChurchSettings(database) {
  const hasSettings =
    database.prepare("SELECT 1 AS exists_flag FROM church_settings LIMIT 1").get()
      ?.exists_flag === 1;

  if (hasSettings) {
    return;
  }

  const now = new Date().toISOString();

  database.prepare(`
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
    JSON.stringify(defaultChurchSettings.notificationChannels),
    now
  );
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

function generateTrackingCode() {
  return `CCO-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function nextTrackingCode(database) {
  let code = generateTrackingCode();

  while (
    database
      .prepare("SELECT 1 AS exists_flag FROM requests WHERE tracking_code = ? LIMIT 1")
      .get(code)?.exists_flag === 1
  ) {
    code = generateTrackingCode();
  }

  return code;
}

function backfillRequestTrackingCodes(database) {
  const rows = database.prepare(`
    SELECT id
    FROM requests
    WHERE tracking_code IS NULL OR tracking_code = ''
  `).all();
  const update = database.prepare(`
    UPDATE requests
    SET tracking_code = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    update.run(nextTrackingCode(database), row.id);
  }
}

function backfillRequestStatusDetails(database) {
  const rows = database.prepare(`
    SELECT id, owner, status, assigned_volunteer_json, escalation_json
    FROM requests
    WHERE status_detail IS NULL OR status_detail = ''
  `).all();
  const update = database.prepare(`
    UPDATE requests
    SET status_detail = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    update.run(buildStatusDetail(row), row.id);
  }
}

function buildStatusDetail(request) {
  if (request.status === "Closed") {
    return "Your request has been resolved and logged by the care team.";
  }

  if (request.escalation_json || request.escalation) {
    return "A pastor is reviewing the next safe step before any wider handoff.";
  }

  if (request.assigned_volunteer_json || request.assignedVolunteer) {
    return "An assigned care team follow-up is now in progress.";
  }

  if (request.owner && request.owner !== "Unassigned") {
    return "Your request has been assigned to a care lead for follow-up.";
  }

  return "Your request has been received and is awaiting pastoral review.";
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
