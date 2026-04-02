import "server-only";

import { randomUUID } from "node:crypto";
import { listUsers } from "@/lib/auth-store";
import { formatDateTime } from "@/lib/care-format";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";

function resolveTargetUserIds(input = {}) {
  const recipients = new Set();
  const visibleUsers = listUsers(
    input.organizationId ? { organizationId: input.organizationId } : {}
  ).filter((user) =>
    input.branchId ? user.branchId === input.branchId || input.allowCrossBranch : true
  );

  for (const userId of input.userIds || []) {
    if (userId) {
      recipients.add(userId);
    }
  }

  if (input.volunteerName) {
    for (const user of visibleUsers) {
      if (
        user.active &&
        user.role === "volunteer" &&
        (user.volunteerName === input.volunteerName || user.name === input.volunteerName)
      ) {
        recipients.add(user.id);
      }
    }
  }

  if (input.roles?.length) {
    for (const user of visibleUsers) {
      if (user.active && input.roles.includes(user.role)) {
        recipients.add(user.id);
      }
    }
  }

  return [...recipients];
}

export function createNotifications(input) {
  const userIds = resolveTargetUserIds(input);

  if (userIds.length === 0) {
    return 0;
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO notifications (
      id,
      organization_id,
      branch_id,
      recipient_user_id,
      kind,
      title,
      body,
      href,
      metadata_json,
      created_at,
      read_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const userId of userIds) {
    insert.run(
      randomUUID(),
      input.organizationId || "",
      input.branchId || null,
      userId,
      input.kind || "update",
      input.title,
      input.body,
      input.href || null,
      serializeJson(input.metadata || {}),
      now,
      null
    );
  }

  return userIds.length;
}

export function listNotificationsForUser(user, limit = 40) {
  if (!user?.id) {
    return [];
  }

  return getDatabase()
    .prepare(`
      SELECT
        id,
        recipient_user_id,
        kind,
        title,
        body,
        href,
        metadata_json,
        created_at,
        read_at
      FROM notifications
      WHERE recipient_user_id = ?
      ORDER BY
        CASE WHEN read_at IS NULL THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT ?
    `)
    .all(user.id, limit)
    .map((row) => ({
      id: row.id,
      recipientUserId: row.recipient_user_id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href || "",
      metadata: parseJson(row.metadata_json, {}),
      createdAt: row.created_at,
      readAt: row.read_at || "",
      read: Boolean(row.read_at),
      createdLabel: formatDateTime(row.created_at),
      readLabel: formatDateTime(row.read_at),
    }));
}

export function getUnreadNotificationCountForUser(user) {
  if (!user?.id) {
    return 0;
  }

  return (
    getDatabase()
      .prepare(`
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE recipient_user_id = ? AND read_at IS NULL
      `)
      .get(user.id)?.count || 0
  );
}

export function markNotificationReadEntry(notificationId, userId) {
  if (!notificationId || !userId) {
    return;
  }

  getDatabase()
    .prepare(`
      UPDATE notifications
      SET read_at = COALESCE(read_at, ?)
      WHERE id = ? AND recipient_user_id = ?
    `)
    .run(new Date().toISOString(), notificationId, userId);
}

export function markAllNotificationsReadEntry(userId) {
  if (!userId) {
    return;
  }

  getDatabase()
    .prepare(`
      UPDATE notifications
      SET read_at = COALESCE(read_at, ?)
      WHERE recipient_user_id = ? AND read_at IS NULL
    `)
    .run(new Date().toISOString(), userId);
}
