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
      SELECT id, name, email, role, password_hash, lane, volunteer_name, active, created_at
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
      SELECT id, name, email, role, password_hash, lane, volunteer_name, active, created_at
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
      SELECT id, name, email, role, password_hash, lane, volunteer_name, active, created_at
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

  db.prepare(`
    INSERT INTO users (
      id, name, email, role, password_hash, lane, volunteer_name, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    input.name,
    input.email.trim().toLowerCase(),
    input.role,
    passwordHash,
    input.lane || null,
    input.volunteerName || null,
    input.active === false ? 0 : 1,
    now
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
    role: row.role,
    passwordHash: row.password_hash,
    lane: row.lane || "",
    volunteerName: row.volunteer_name || "",
    active: row.active === 1,
    createdAt: row.created_at,
  };
}
