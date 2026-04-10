import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";
import { normalizeInternalRole } from "@/lib/policies";
import { redirect } from "next/navigation";

// ── Module constants ─────────────────────────────────────────────────────────
export const MODULES = {
  CARE:         "care",
  FINANCE:      "finance",
  MEMBERSHIP:   "membership",
  WORSHIP:      "worship",
  ADMIN:        "admin",
  DISCIPLESHIP: "discipleship",
  ASSETS:       "assets",
};

// ── Access levels (ordered weakest → strongest) ───────────────────────────────
export const ACCESS_LEVELS = ["none", "read", "worker", "lead", "full"];

export function accessLevelValue(level) {
  const idx = ACCESS_LEVELS.indexOf(String(level || "none"));
  return idx === -1 ? 0 : idx;
}

// ── Default module permissions by base role ──────────────────────────────────
// Tier 1: owner / pastor  → full access across all modules
// Tier 2: leader          → departmental lead in care/worship/discipleship,
//                           read-only on membership; no finance or admin access
// Tier 3: volunteer       → worker in care & worship only
// member                  → no module access (member-portal only)
const ROLE_DEFAULTS = {
  owner: {
    care: "full", finance: "full", membership: "full",
    worship: "full", admin: "full", discipleship: "full", assets: "full",
  },
  pastor: {
    care: "full", finance: "full", membership: "full",
    worship: "full", admin: "lead", discipleship: "full", assets: "lead",
  },
  leader: {
    care: "lead", finance: "none", membership: "read",
    worship: "lead", admin: "none", discipleship: "lead", assets: "read",
  },
  volunteer: {
    care: "worker", finance: "none", membership: "none",
    worship: "worker", admin: "none", discipleship: "none", assets: "none",
  },
  member: {
    care: "none", finance: "none", membership: "none",
    worship: "none", admin: "none", discipleship: "none", assets: "none",
  },
};

/**
 * Get effective module permissions for a user.
 *
 * Returns a plain object: { care: "full", finance: "none", ... }
 *
 * Effective access = MAX(role default, explicit DB grant).
 * This means explicit grants can only *elevate* permissions — base role
 * defaults always apply and cannot be overridden downward here.
 */
export function getUserModulePermissions(user) {
  const role = normalizeInternalRole(user?.role);
  const defaults = { ...(ROLE_DEFAULTS[role] || ROLE_DEFAULTS.member) };

  if (!user?.id || !user?.organizationId) return defaults;

  try {
    const db = getDatabase();
    const grants = db.prepare(`
      SELECT module, access_level
      FROM module_permissions
      WHERE user_id = ? AND organization_id = ?
    `).all(user.id, user.organizationId);

    for (const grant of grants) {
      if (!MODULES[grant.module?.toUpperCase()] && !Object.values(MODULES).includes(grant.module)) {
        continue; // unknown module, skip
      }
      if (accessLevelValue(grant.access_level) > accessLevelValue(defaults[grant.module])) {
        defaults[grant.module] = grant.access_level;
      }
    }
  } catch {
    // DB not ready or missing table — fall through with role defaults
  }

  return defaults;
}

/**
 * Returns true if `permissions[module]` meets or exceeds `minLevel`.
 */
export function hasModuleAccess(permissions, module, minLevel = "read") {
  const level = permissions?.[module] ?? "none";
  return accessLevelValue(level) >= accessLevelValue(minLevel);
}

/**
 * Server guard — redirects to /access-restricted when access is denied.
 * Call this at the top of any server page / server action that needs
 * module-level gating.
 */
export function requireModuleAccess(permissions, module, minLevel = "read") {
  if (!hasModuleAccess(permissions, module, minLevel)) {
    redirect("/access-restricted");
  }
}

/**
 * Build a serializable permissions summary to pass from server to client.
 * Only includes boolean flags (canRead, canWrite, isLead) per module so
 * client components don't need the full access-level string.
 */
export function serializePermissions(permissions) {
  const result = {};
  for (const mod of Object.values(MODULES)) {
    const lvl = accessLevelValue(permissions?.[mod] ?? "none");
    result[mod] = {
      canRead:  lvl >= accessLevelValue("read"),
      canWrite: lvl >= accessLevelValue("worker"),
      isLead:   lvl >= accessLevelValue("lead"),
      isFull:   lvl >= accessLevelValue("full"),
      raw:      ACCESS_LEVELS[lvl] || "none",
    };
  }
  return result;
}

/**
 * List all explicit grants for a user (for the permissions admin UI).
 */
export function listUserModuleGrants(userId, organizationId) {
  try {
    const db = getDatabase();
    return db.prepare(`
      SELECT mp.id, mp.module, mp.access_level, mp.note, mp.granted_at,
             u.name AS granted_by_name
      FROM module_permissions mp
      LEFT JOIN users u ON u.id = mp.granted_by
      WHERE mp.user_id = ? AND mp.organization_id = ?
      ORDER BY mp.module
    `).all(userId, organizationId);
  } catch {
    return [];
  }
}

/**
 * Upsert an explicit module permission grant.
 */
export function upsertModulePermission({ userId, organizationId, module, accessLevel, grantedBy, note }) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO module_permissions (id, user_id, organization_id, module, access_level, granted_by, granted_at, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, module) DO UPDATE SET
      access_level = excluded.access_level,
      granted_by   = excluded.granted_by,
      granted_at   = excluded.granted_at,
      note         = excluded.note
  `).run(id, userId, organizationId, module, accessLevel, grantedBy || null, now, note || null);
}

/**
 * Remove an explicit module permission grant (reverts to role default).
 */
export function revokeModulePermission(userId, organizationId, module) {
  const db = getDatabase();
  db.prepare(`
    DELETE FROM module_permissions
    WHERE user_id = ? AND organization_id = ? AND module = ?
  `).run(userId, organizationId, module);
}
