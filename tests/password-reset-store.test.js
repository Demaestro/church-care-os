import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("password reset store", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-test-"));
    process.env.CARE_DB_PATH = path.join(tempDir, "care.db");
    process.env.AUTH_SECRET = "test-secret";
    process.env.NODE_ENV = "test";
    vi.resetModules();
  });

  afterEach(async () => {
    const database = await import("@/lib/database");
    database.closeDatabase();
    delete process.env.CARE_DB_PATH;
    delete process.env.AUTH_SECRET;
    delete process.env.NODE_ENV;
    await rm(tempDir, { recursive: true, force: true });
  });

  test("creates, validates, and consumes a one-time reset link", async () => {
    const { findUserByEmail } = await import("@/lib/auth-store");
    const { verifyPassword } = await import("@/lib/auth-crypto");
    const {
      createPasswordResetTokenEntry,
      getPasswordResetTokenEntry,
      consumePasswordResetTokenEntry,
    } = await import("@/lib/password-reset-store");

    const originalUser = findUserByEmail("pastor.lagos@firstlove.demo");
    expect(originalUser?.active).toBe(true);

    const tokenState = createPasswordResetTokenEntry("pastor.lagos@firstlove.demo");
    expect(tokenState?.token).toBeTruthy();
    expect(tokenState?.user.email).toBe("pastor.lagos@firstlove.demo");

    expect(getPasswordResetTokenEntry(tokenState.token).status).toBe("valid");

    const updatedUser = consumePasswordResetTokenEntry(
      tokenState.token,
      "FreshPass!2026"
    );
    expect(updatedUser.email).toBe("pastor.lagos@firstlove.demo");
    expect(getPasswordResetTokenEntry(tokenState.token).status).toBe("used");

    const refreshedUser = findUserByEmail("pastor.lagos@firstlove.demo");
    expect(verifyPassword("FreshPass!2026", refreshedUser.passwordHash)).toBe(true);
  });

  test("expires links that are already out of time", async () => {
    const {
      createPasswordResetTokenEntry,
      getPasswordResetTokenEntry,
    } = await import("@/lib/password-reset-store");

    const tokenState = createPasswordResetTokenEntry("leader.lagos@firstlove.demo", {
      ttlMs: -1000,
    });

    expect(getPasswordResetTokenEntry(tokenState.token).status).toBe("expired");
  });
});
