import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("security hardening", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-security-test-"));
    process.env.CARE_DB_PATH = path.join(tempDir, "care.db");
    process.env.NODE_ENV = "test";
    process.env.AUTH_SECRET = "test-auth-secret";
    vi.resetModules();
  });

  afterEach(async () => {
    const database = await import("@/lib/database");
    database.closeDatabase();
    delete process.env.CARE_DB_PATH;
    delete process.env.NODE_ENV;
    delete process.env.AUTH_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.HEALTHCHECK_TOKEN;
    await rm(tempDir, { recursive: true, force: true });
  });

  test("cron job route fails closed in production when CRON_SECRET is missing", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("@/app/api/cron/jobs/route");
    const response = await GET(new Request("http://localhost/api/cron/jobs"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toBe("Service unavailable");
  });

  test("health route hides detailed diagnostics without a health token in production", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("@/app/health/route");
    const response = await GET(new Request("http://localhost/health"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.checks).toBeUndefined();
    expect(payload.criticalIssues).toBeUndefined();
    expect(payload.storeMode).toBeUndefined();
  });

  test("health route returns detailed diagnostics when a valid token is supplied", async () => {
    process.env.NODE_ENV = "production";
    process.env.HEALTHCHECK_TOKEN = "health-secret";

    const { GET } = await import("@/app/health/route");
    const response = await GET(
      new Request("http://localhost/health", {
        headers: {
          authorization: "Bearer health-secret",
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.checks).toBeDefined();
    expect(payload.storeMode).toBeDefined();
  });

  test("legacy administrative roles normalize to the smaller canonical role set", async () => {
    const { normalizeInternalRole, normalizeInternalRoles } = await import("@/lib/policies");

    expect(normalizeInternalRole("overseer")).toBe("owner");
    expect(normalizeInternalRole("general_overseer")).toBe("owner");
    expect(normalizeInternalRole("branch_admin")).toBe("pastor");
    expect(normalizeInternalRoles(["overseer", "owner", "branch_admin"])).toEqual([
      "owner",
      "pastor",
    ]);
  });

  test("file-signature validation rejects mismatched uploads", async () => {
    const { assertExpectedFileSignature } = await import("@/lib/file-signatures");

    const disguisedPdf = Buffer.from("not-a-real-png");

    expect(() =>
      assertExpectedFileSignature(disguisedPdf, "image/png", "attachment")
    ).toThrow(/did not match/i);
  });
});
