import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";
import { hashPassword } from "@/lib/auth-crypto";

export function findUserByEmail(email) {
  if (!email) {
    return null;
  }

  const row = getDatabase()
    .prepare(`
      SELECT id, name, email, phone, role, password_hash, lane, volunteer_name, active, created_at
      , session_version, last_login_at, organization_id, branch_id, access_scope, title, managed_branch_ids_json
      , mfa_enabled, mfa_mode, mfa_secret, mfa_backup_codes_json
      , email_verified_at, failed_login_attempts, locked_at, birthday, gender, member_type
      FROM users
      WHERE email = ?
      LIMIT 1
    `)
    .get(String(email).trim().toLowerCase());

  return mapUserRow(row);
}

export function findUserById(id) {
  if (!id) {
    return null;
  }

  const row = getDatabase()
    .prepare(`
      SELECT id, name, email, phone, role, password_hash, lane, volunteer_name, active, created_at
      , session_version, last_login_at, organization_id, branch_id, access_scope, title, managed_branch_ids_json
      , mfa_enabled, mfa_mode, mfa_secret, mfa_backup_codes_json
      , email_verified_at, failed_login_attempts, locked_at, birthday, gender, member_type
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
    .get(id);

  return mapUserRow(row);
}

export function listUsers(filter = {}) {
  const rows = getDatabase()
    .prepare(`
      SELECT id, name, email, phone, role, password_hash, lane, volunteer_name, active, created_at
      , session_version, last_login_at, organization_id, branch_id, access_scope, title, managed_branch_ids_json
      , mfa_enabled, mfa_mode, mfa_secret, mfa_backup_codes_json
      , email_verified_at, failed_login_attempts, locked_at, birthday, gender, member_type
      FROM users
      ORDER BY role, name
    `)
    .all();

  return rows
    .map(mapUserRow)
    .filter((user) => {
      if (filter.organizationId && user.organizationId !== filter.organizationId) {
        return false;
      }

      if (filter.branchId && user.branchId !== filter.branchId) {
        return false;
      }

      if (filter.role && user.role !== filter.role) {
        return false;
      }

      return true;
    });
}

export function createUserEntry(input) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(input.password);
  const userId = randomUUID();

  db.prepare(`
    INSERT INTO users (
      id, name, email, phone, role, password_hash, lane, volunteer_name, active, created_at,
      organization_id, branch_id, access_scope, title, managed_branch_ids_json,
      mfa_enabled, mfa_mode, mfa_secret, mfa_backup_codes_json,
      email_verified_at, failed_login_attempts, locked_at, birthday, gender, member_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    input.name,
    input.email.trim().toLowerCase(),
    input.phone || null,
    input.role,
    passwordHash,
    input.lane || null,
    input.volunteerName || null,
    input.active === false ? 0 : 1,
    now,
    input.organizationId || null,
    input.branchId || null,
    input.accessScope || "branch",
    input.title || null,
    JSON.stringify(input.managedBranchIds || []),
    input.mfaEnabled ? 1 : 0,
    input.mfaMode || "off",
    input.mfaSecret || null,
    JSON.stringify(input.mfaBackupCodes || []),
    input.emailVerifiedAt === undefined
      ? now
      : input.emailVerifiedAt || null,
    Number(input.failedLoginAttempts || 0),
    input.lockedAt || null,
    input.birthday || null,
    input.gender || "unspecified",
    input.memberType || "member"
  );

  return userId;
}

export function updateUserEntry(userId, input) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET
        name = ?,
        email = ?,
        phone = ?,
        role = ?,
        lane = ?,
        volunteer_name = ?,
        active = ?,
        organization_id = ?,
        branch_id = ?,
        access_scope = ?,
        title = ?,
        managed_branch_ids_json = ?,
        mfa_enabled = ?,
        mfa_mode = ?,
        mfa_secret = ?,
        mfa_backup_codes_json = ?
      WHERE id = ?
    `)
    .run(
      input.name ?? existing.name,
      (input.email ?? existing.email).trim().toLowerCase(),
      input.phone ?? existing.phone ?? null,
      input.role ?? existing.role,
      input.lane ?? existing.lane ?? null,
      input.volunteerName ?? existing.volunteerName ?? null,
      input.active === undefined ? (existing.active ? 1 : 0) : input.active ? 1 : 0,
      input.organizationId ?? existing.organizationId ?? null,
      input.branchId ?? existing.branchId ?? null,
      input.accessScope ?? existing.accessScope ?? "branch",
      input.title ?? existing.title ?? null,
      JSON.stringify(input.managedBranchIds ?? existing.managedBranchIds ?? []),
      input.mfaEnabled === undefined
        ? existing.mfaEnabled
          ? 1
          : 0
        : input.mfaEnabled
          ? 1
          : 0,
      input.mfaMode ?? existing.mfaMode ?? "off",
      input.mfaSecret ?? existing.mfaSecret ?? null,
      JSON.stringify(input.mfaBackupCodes ?? existing.mfaBackupCodes ?? []),
      userId
    );
}

export function setUserPasswordEntry(userId, password) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET password_hash = ?,
          failed_login_attempts = 0,
          locked_at = NULL
      WHERE id = ?
    `)
    .run(hashPassword(password), userId);
}

export function toggleUserActiveEntry(userId, active) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET active = ?
      WHERE id = ?
    `)
    .run(active ? 1 : 0, userId);
}

export function touchUserLoginEntry(userId) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET last_login_at = ?
      WHERE id = ?
    `)
    .run(new Date().toISOString(), userId);
}

export function clearUserLoginFailuresEntry(userId) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET failed_login_attempts = 0,
          locked_at = NULL
      WHERE id = ?
    `)
    .run(userId);
}

export function recordFailedLoginAttemptEntry(userId, threshold = 10) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  const nextAttempts = Number(existing.failedLoginAttempts || 0) + 1;
  const lockedAt = nextAttempts >= threshold ? new Date().toISOString() : null;

  getDatabase()
    .prepare(`
      UPDATE users
      SET failed_login_attempts = ?,
          locked_at = COALESCE(?, locked_at)
      WHERE id = ?
    `)
    .run(nextAttempts, lockedAt, userId);

  return {
    attempts: nextAttempts,
    locked: Boolean(lockedAt || existing.lockedAt),
    lockedAt: lockedAt || existing.lockedAt || "",
  };
}

export function markUserEmailVerifiedEntry(userId) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  const now = new Date().toISOString();
  getDatabase()
    .prepare(`
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, ?),
          active = 1,
          failed_login_attempts = 0,
          locked_at = NULL
      WHERE id = ?
    `)
    .run(now, userId);

  return now;
}

export function unlockUserEntry(userId) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET failed_login_attempts = 0,
          locked_at = NULL
      WHERE id = ?
    `)
    .run(userId);
}

export function bumpUserSessionVersionEntry(userId) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET session_version = session_version + 1
      WHERE id = ?
    `)
    .run(userId);
}

export function setUserMfaEntry(userId, input) {
  const existing = findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET
        mfa_enabled = ?,
        mfa_mode = ?,
        mfa_secret = ?,
        mfa_backup_codes_json = ?
      WHERE id = ?
    `)
    .run(
      input.enabled ? 1 : 0,
      input.mode || "off",
      input.secret || null,
      JSON.stringify(input.backupCodes || []),
      userId
    );
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    role: row.role,
    passwordHash: row.password_hash,
    lane: row.lane || "",
    volunteerName: row.volunteer_name || "",
    organizationId: row.organization_id || "",
    branchId: row.branch_id || "",
    accessScope: row.access_scope || "branch",
    title: row.title || "",
    managedBranchIds: row.managed_branch_ids_json
      ? JSON.parse(row.managed_branch_ids_json)
      : [],
    mfaEnabled: row.mfa_enabled === 1,
    mfaMode: row.mfa_mode || "off",
    mfaSecret: row.mfa_secret || "",
    mfaBackupCodes: row.mfa_backup_codes_json
      ? JSON.parse(row.mfa_backup_codes_json)
      : [],
    emailVerifiedAt: row.email_verified_at || "",
    failedLoginAttempts: Number(row.failed_login_attempts || 0),
    lockedAt: row.locked_at || "",
    birthday: row.birthday || "",
    gender: row.gender || "unspecified",
    memberType: row.member_type || "member",
    active: row.active === 1,
    sessionVersion: Number(row.session_version || 1),
    lastLoginAt: row.last_login_at || "",
    createdAt: row.created_at,
  };
}
