/**
 * Idempotency key store.
 *
 * Prevents duplicate submissions on high-latency / 3G networks where the
 * user's device retries a form POST because it timed out before receiving
 * the server's 200 response.
 *
 * Flow:
 *   1. Client generates a key (UUID or hash) and attaches it to the form.
 *   2. Server calls `claimKey(key)` before doing any work.
 *      - If claim succeeds  → process normally, then `resolveKey(key, result)`.
 *      - If claim fails with DUPLICATE_SUBMISSION → another in-flight request
 *        for this key is currently processing; return immediately.
 *      - If claim fails with IDEMPOTENT_REPLAY    → request already processed;
 *        return the cached result from the first run.
 *   3. Keys expire after TTL (default 24 h) so the table stays lean.
 *
 * The table is always SQLite even when the app runs on Postgres for primary
 * data, because idempotency keys are ephemeral process-local state.
 */

import "server-only";

import { getDatabase } from "@/lib/database";
import { E, err, ok } from "@/lib/result";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Schema (called from database.js ensureSchemaMigrations) ───────────────────

export function ensureIdempotencyTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key         TEXT    PRIMARY KEY,
      status      TEXT    NOT NULL DEFAULT 'processing',
      result_json TEXT,
      created_at  TEXT    NOT NULL,
      expires_at  TEXT    NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_idempotency_expires
      ON idempotency_keys (expires_at);
  `);
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Attempt to claim an idempotency key before processing a request.
 *
 * Returns:
 *   ok(null)                         → key is fresh, proceed with work
 *   err(E.IDEMPOTENT_REPLAY, ...)    → already processed; use cachedResult
 *   err(E.DUPLICATE_SUBMISSION, ...) → in-flight duplicate, abort
 *
 * The returned err result carries `.cachedResult` for IDEMPOTENT_REPLAY.
 */
export function claimKey(key, ttlMs = DEFAULT_TTL_MS) {
  if (!key || typeof key !== "string" || key.length > 128) {
    // No key provided — skip idempotency, treat as fresh request
    return ok(null);
  }

  const db = getDatabase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
  const nowIso = now.toISOString();

  // Prune expired keys opportunistically (low cost on SQLite)
  db.prepare(`DELETE FROM idempotency_keys WHERE expires_at < ?`).run(nowIso);

  const existing = db
    .prepare(`SELECT status, result_json FROM idempotency_keys WHERE key = ?`)
    .get(key);

  if (existing) {
    if (existing.status === "done") {
      const cachedResult = existing.result_json
        ? JSON.parse(existing.result_json)
        : null;
      const result = err(E.IDEMPOTENT_REPLAY, "This request was already processed.");
      result.cachedResult = cachedResult;
      return result;
    }

    // status === "processing" → in-flight duplicate
    return err(E.DUPLICATE_SUBMISSION, "A duplicate submission is already being processed.");
  }

  // Insert fresh key in "processing" state
  db.prepare(`
    INSERT OR IGNORE INTO idempotency_keys (key, status, result_json, created_at, expires_at)
    VALUES (?, 'processing', NULL, ?, ?)
  `).run(key, nowIso, expiresAt);

  // Verify we actually won the insert (race condition guard)
  const row = db
    .prepare(`SELECT status FROM idempotency_keys WHERE key = ?`)
    .get(key);

  if (!row || row.status !== "processing") {
    return err(E.DUPLICATE_SUBMISSION, "A duplicate submission is already being processed.");
  }

  return ok(null);
}

/**
 * Mark a previously claimed key as successfully processed and store the
 * serialisable result so idempotent replays can return the same data.
 */
export function resolveKey(key, result = null) {
  if (!key) return;
  const db = getDatabase();
  db.prepare(`
    UPDATE idempotency_keys
    SET status = 'done', result_json = ?
    WHERE key = ?
  `).run(result != null ? JSON.stringify(result) : null, key);
}

/**
 * Release a claimed key without storing a result (use in catch blocks so the
 * client can retry after a server-side failure).
 */
export function releaseKey(key) {
  if (!key) return;
  const db = getDatabase();
  db.prepare(`DELETE FROM idempotency_keys WHERE key = ?`).run(key);
}
