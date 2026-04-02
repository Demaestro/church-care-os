import "server-only";

import { randomUUID } from "node:crypto";
import { formatDateTime } from "@/lib/care-format";
import { getDatabase, parseJson, serializeJson, withTransaction } from "@/lib/database";

export function enqueueJob(input) {
  const id = randomUUID();
  const now = new Date().toISOString();

  getDatabase()
    .prepare(`
      INSERT INTO jobs (
        id,
        organization_id,
        branch_id,
        queue,
        type,
        payload_json,
        status,
        run_after,
        attempts,
        max_attempts,
        locked_at,
        locked_by,
        last_error,
        created_at,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.organizationId || null,
      input.branchId || null,
      input.queue,
      input.type,
      serializeJson(input.payload || {}),
      "queued",
      input.runAfter || now,
      0,
      input.maxAttempts || 3,
      null,
      null,
      null,
      now,
      null
    );

  return id;
}

export function claimNextJob(queue = "", workerName = "worker") {
  return withTransaction((db) => {
    const now = new Date().toISOString();
    const row = db
      .prepare(`
        SELECT id
        FROM jobs
        WHERE status = 'queued'
          AND run_after <= ?
          ${queue ? "AND queue = ?" : ""}
        ORDER BY run_after ASC, created_at ASC
        LIMIT 1
      `)
      .get(...(queue ? [now, queue] : [now]));

    if (!row) {
      return null;
    }

    db.prepare(`
      UPDATE jobs
      SET
        status = 'processing',
        locked_at = ?,
        locked_by = ?
      WHERE id = ?
    `).run(now, workerName, row.id);

    return db
      .prepare(`
        SELECT *
        FROM jobs
        WHERE id = ?
        LIMIT 1
      `)
      .get(row.id);
  });
}

export function completeJob(jobId) {
  getDatabase()
    .prepare(`
      UPDATE jobs
      SET
        status = 'completed',
        completed_at = ?,
        locked_at = NULL,
        locked_by = NULL,
        last_error = NULL
      WHERE id = ?
    `)
    .run(new Date().toISOString(), jobId);
}

export function failJob(jobId, errorMessage) {
  const db = getDatabase();
  const job = db
    .prepare(`
      SELECT attempts, max_attempts
      FROM jobs
      WHERE id = ?
      LIMIT 1
    `)
    .get(jobId);

  if (!job) {
    return;
  }

  const attempts = Number(job.attempts || 0) + 1;
  const maxAttempts = Number(job.max_attempts || 3);
  const shouldRetry = attempts < maxAttempts;
  const retryAt = new Date(Date.now() + attempts * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE jobs
    SET
      status = ?,
      attempts = ?,
      run_after = ?,
      locked_at = NULL,
      locked_by = NULL,
      last_error = ?
    WHERE id = ?
  `).run(
    shouldRetry ? "queued" : "failed",
    attempts,
    shouldRetry ? retryAt : new Date().toISOString(),
    String(errorMessage || "Unknown job failure"),
    jobId
  );
}

export function listJobs(limit = 30, organizationId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        queue,
        type,
        payload_json,
        status,
        run_after,
        attempts,
        max_attempts,
        locked_at,
        locked_by,
        last_error,
        created_at,
        completed_at
      FROM jobs
      ${organizationId ? "WHERE organization_id = ?" : ""}
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(...(organizationId ? [organizationId, limit] : [limit]));

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id || "",
    branchId: row.branch_id || "",
    queue: row.queue,
    type: row.type,
    payload: parseJson(row.payload_json, {}),
    status: row.status,
    runAfter: row.run_after,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 3),
    lockedAt: row.locked_at || "",
    lockedBy: row.locked_by || "",
    lastError: row.last_error || "",
    createdAt: row.created_at,
    completedAt: row.completed_at || "",
    createdLabel: formatDateTime(row.created_at),
    runAfterLabel: formatDateTime(row.run_after),
    completedLabel: formatDateTime(row.completed_at),
  }));
}

export function getJobSnapshot(organizationId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT status, COUNT(*) AS count
      FROM jobs
      ${organizationId ? "WHERE organization_id = ?" : ""}
      GROUP BY status
    `)
    .all(...(organizationId ? [organizationId] : []));
  const latest = getDatabase()
    .prepare(`
      SELECT status, created_at, run_after
      FROM jobs
      ${organizationId ? "WHERE organization_id = ?" : ""}
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(...(organizationId ? [organizationId] : []));
  const counts = rows.reduce((result, row) => {
    result[row.status] = Number(row.count || 0);
    return result;
  }, {});

  return {
    queuedCount: counts.queued || 0,
    processingCount: counts.processing || 0,
    completedCount: counts.completed || 0,
    failedCount: counts.failed || 0,
    latestStatus: latest?.status || "",
    latestCreatedLabel: formatDateTime(latest?.created_at),
    latestRunAfterLabel: formatDateTime(latest?.run_after),
  };
}
