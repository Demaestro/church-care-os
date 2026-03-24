import { randomUUID, scryptSync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { parseFlag, resolveDatabasePath } from "./lib/runtime-paths.mjs";

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

const name = parseFlag("name");
const email = parseFlag("email").toLowerCase();
const password = parseFlag("password");
const role = parseFlag("role") || "owner";
const lane = parseFlag("lane");
const volunteerName = parseFlag("volunteer-name");
const validRoles = new Set(["owner", "pastor", "leader", "volunteer"]);

if (!name || !email || !password) {
  console.error("Usage: npm run auth:create-user -- --name \"Church Owner\" --email owner@example.com --password \"StrongPass!2026\" --role owner");
  process.exit(1);
}

if (!validRoles.has(role)) {
  console.error(`Role must be one of: ${Array.from(validRoles).join(", ")}`);
  process.exit(1);
}

const db = new DatabaseSync(resolveDatabasePath());

try {
  db.exec(`
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
  `);

  db.prepare(`
    INSERT INTO users (
      id, name, email, role, password_hash, lane, volunteer_name, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    name,
    email,
    role,
    hashPassword(password),
    lane || null,
    volunteerName || null,
    1,
    new Date().toISOString()
  );

  console.log(`Created ${role} user ${email}`);
} finally {
  db.close();
}
