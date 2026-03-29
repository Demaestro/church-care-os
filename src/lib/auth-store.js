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
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
    .get(id);

  return mapUserRow(row);
}

export function listUsers() {
  const rows = getDatabase()
    .prepare(`
      SELECT id, name, email, phone, role, password_hash, lane, volunteer_name, active, created_at
      FROM users
      ORDER BY role, name
    `)
    .all();

  return rows.map(mapUserRow);
}

export function createUserEntry(input) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(input.password);
  const userId = randomUUID();

  db.prepare(`
    INSERT INTO users (
      id, name, email, phone, role, password_hash, lane, volunteer_name, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    now
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
        active = ?
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
      SET password_hash = ?
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
    active: row.active === 1,
    createdAt: row.created_at,
  };
}
