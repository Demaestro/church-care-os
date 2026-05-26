import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getRuntimeReadiness } from "@/lib/runtime-readiness.mjs";

const strongSecret = "launch-ready-auth-value-with-more-than-32-characters";
const serverActionsKey = Buffer.from("12345678901234567890123456789012").toString("base64");

describe("runtime readiness", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-readiness-test-"));
    process.env.CARE_DB_PATH = path.join(tempDir, "care.db");
    process.env.NODE_ENV = "test";
    process.env.AUTH_SECRET = "test-secret";
    vi.resetModules();
  });

  afterEach(async () => {
    const database = await import("@/lib/database");
    database.closeDatabase();
    delete process.env.CARE_DB_PATH;
    delete process.env.NODE_ENV;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY;
    delete process.env.APP_BASE_URL;
    delete process.env.CARE_DATABASE_DRIVER;
    delete process.env.CARE_ATTACHMENT_BACKEND;
    delete process.env.DATABASE_URL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    await rm(tempDir, { recursive: true, force: true });
  });

  test("flags missing required env for stateless production", () => {
    const readiness = getRuntimeReadiness({
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "production",
      CARE_DATABASE_DRIVER: "postgres",
      CARE_ATTACHMENT_BACKEND: "vercel-blob",
      AUTH_SECRET: strongSecret,
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: serverActionsKey,
      APP_BASE_URL: "https://care.example.com",
    });

    expect(readiness.readyForProduction).toBe(false);
    expect(readiness.criticalIssues).toContain(
      "DATABASE_URL is required when PostgreSQL runtime is enabled."
    );
    expect(readiness.criticalIssues).toContain(
      "BLOB_READ_WRITE_TOKEN is required when private blob attachment storage is enabled."
    );
    expect(readiness.criticalIssues).toContain(
      "CRON_SECRET should be set before enabling Vercel cron routes."
    );
  });

  test("supports async sqlite transactions without early commit", async () => {
    const { getDatabase, withTransaction } = await import("@/lib/database");

    await withTransaction(async (db) => {
      db.prepare(`
        INSERT INTO rate_limits (key, count, window_started_at, last_seen_at)
        VALUES (?, ?, ?, ?)
      `).run("async-tx", 1, "2026-04-08T00:00:00.000Z", "2026-04-08T00:00:00.000Z");

      await Promise.resolve();
    });

    const inserted = getDatabase()
      .prepare("SELECT count FROM rate_limits WHERE key = ? LIMIT 1")
      .get("async-tx");

    expect(inserted?.count).toBe(1);
  });

  test("marks sqlite production as single-host only but still launchable", () => {
    const readiness = getRuntimeReadiness({
      NODE_ENV: "production",
      AUTH_SECRET: strongSecret,
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: serverActionsKey,
      APP_BASE_URL: "https://care.example.com",
      CARE_DATABASE_DRIVER: "sqlite",
      CARE_ATTACHMENT_BACKEND: "local",
    });

    expect(readiness.readyForProduction).toBe(true);
    expect(readiness.readyForScale).toBe(false);
    expect(readiness.launchProfile).toBe("single-host");
    expect(
      readiness.warnings.some((warning) => warning.includes("SQLite keeps the app in single-host mode"))
    ).toBe(true);
  });

  test("rejects weak production secrets and demo seeding", () => {
    const readiness = getRuntimeReadiness({
      NODE_ENV: "production",
      AUTH_SECRET: "secret",
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: "not-a-valid-key",
      APP_BASE_URL: "https://care.example.com",
      CARE_SEED_DEMO_USERS: "1",
      CARE_SECURE_COOKIES: "false",
    });

    expect(readiness.readyForProduction).toBe(false);
    expect(readiness.criticalIssues).toContain(
      "AUTH_SECRET must be a strong random value in production."
    );
    expect(readiness.criticalIssues).toContain(
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be a base64-encoded AES key with 16, 24, or 32 bytes."
    );
    expect(readiness.criticalIssues).toContain(
      "CARE_SEED_DEMO_USERS must be disabled in production."
    );
    expect(readiness.criticalIssues).toContain(
      "CARE_SECURE_COOKIES must not be disabled in production."
    );
  });
});
