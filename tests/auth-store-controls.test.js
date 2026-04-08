import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("auth store controls", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-auth-test-"));
    process.env.CARE_DB_PATH = path.join(tempDir, "care.db");
    process.env.NODE_ENV = "test";
    vi.resetModules();
  });

  afterEach(async () => {
    const database = await import("@/lib/database");
    database.closeDatabase();
    delete process.env.CARE_DB_PATH;
    delete process.env.NODE_ENV;
    await rm(tempDir, { recursive: true, force: true });
  });

  test("tracks last login and session version changes", async () => {
    const {
      bumpUserSessionVersionEntry,
      createUserEntry,
      findUserByEmail,
      touchUserLoginEntry,
    } = await import("@/lib/auth-store");

    const before = findUserByEmail("pastor.lagos@firstlove.demo");
    expect(before?.sessionVersion).toBe(1);
    expect(before?.lastLoginAt).toBe("");

    touchUserLoginEntry(before.id);
    const afterLogin = findUserByEmail("pastor.lagos@firstlove.demo");
    expect(afterLogin?.lastLoginAt).toBeTruthy();

    bumpUserSessionVersionEntry(before.id);
    const afterBump = findUserByEmail("pastor.lagos@firstlove.demo");
    expect(afterBump?.sessionVersion).toBe(2);

    const createdId = createUserEntry({
      name: "Test Member",
      email: "member.test@example.com",
      password: "TestMember!2026",
      role: "member",
      organizationId: "org-firstlove",
      branchId: "branch-firstlove-lagos-hq",
      accessScope: "branch",
      emailVerifiedAt: null,
      gender: "female",
      memberType: "new_member",
    });

    const created = findUserByEmail("member.test@example.com");
    expect(created?.id).toBe(createdId);
    expect(created?.emailVerifiedAt).toBe("");
    expect(created?.branchId).toBe("branch-firstlove-lagos-hq");
    expect(created?.memberType).toBe("new_member");
  });
});
