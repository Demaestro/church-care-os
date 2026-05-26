import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("platform foundations", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-platform-test-"));
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
    await rm(tempDir, { recursive: true, force: true });
  });

  test("totp verification accepts a current authenticator code and consumes backup codes", async () => {
    const {
      consumeBackupCode,
      generateBackupCodes,
      generateTotpCode,
      generateTotpSecret,
      hashBackupCode,
      verifyTotpCode,
    } = await import("@/lib/totp");

    const secret = generateTotpSecret();
    const now = Date.UTC(2026, 2, 30, 12, 0, 0);
    const code = generateTotpCode(secret, now);
    expect(verifyTotpCode(secret, code, 1, now)).toBe(true);

    const backupCodes = generateBackupCodes(2);
    const hashed = backupCodes.map(hashBackupCode);
    const result = consumeBackupCode(hashed, backupCodes[0]);

    expect(result.matched).toBe(true);
    expect(result.nextHashes).toHaveLength(1);
  });

  test("member transfers move a household and its open requests into the receiving branch", async () => {
    const { createCareRequestEntry } = await import("@/lib/care-store");
    const { findUserByEmail } = await import("@/lib/auth-store");
    const {
      completeMemberTransferEntry,
      createMemberTransferEntry,
      listMemberTransfers,
    } = await import("@/lib/member-transfer-store");
    const { getDatabase } = await import("@/lib/database");

    const created = await createCareRequestEntry({
      householdName: "Transfer Test Household",
      submittedBy: "Transfer Test Household",
      contactEmail: "transfer@example.com",
      contactPhone: "+2348011111111",
      preferredContact: "Phone call",
      requestFor: "self",
      need: "Prayer",
      summary: "We are testing a branch move.",
      dueAt: "2026-03-30T10:00:00.000Z",
      risk: "watch",
      stage: "Assign",
      owner: "Mercy lane",
      source: "Member care form",
      tags: "Prayer",
      intakeNote: "Submitted online.",
      privacyLevel: "pastors-and-assigned-leads",
      shareWithVolunteers: true,
      allowTextUpdates: true,
    });
    const owner = findUserByEmail("owner@firstlove.demo");
    expect(owner).toBeTruthy();

    const transferId = createMemberTransferEntry({
      householdSlug: created.householdSlug,
      toBranchId: "branch-firstlove-abuja-central",
      reason: "Member now attends the Abuja branch.",
      note: "Transfer for continuity of care.",
      actor: owner,
    });

    completeMemberTransferEntry(transferId, owner);

    const household = getDatabase()
      .prepare("SELECT branch_id, owner FROM households WHERE slug = ? LIMIT 1")
      .get(created.householdSlug);
    const request = getDatabase()
      .prepare(
        "SELECT branch_id, owner, status_detail FROM requests WHERE household_slug = ? AND status = 'Open' LIMIT 1"
      )
      .get(created.householdSlug);
    const transfer = listMemberTransfers(owner).find((item) => item.id === transferId);

    expect(household?.branch_id).toBe("branch-firstlove-abuja-central");
    expect(household?.owner).toBe("Unassigned");
    expect(request?.branch_id).toBe("branch-firstlove-abuja-central");
    expect(request?.status_detail).toContain("receiving branch care team");
    expect(transfer?.status).toBe("completed");
  });

  test("legacy organization schemas are backfilled before church seeding runs", async () => {
    const legacyDb = new DatabaseSync(process.env.CARE_DB_PATH);
    legacyDb.exec(`
      CREATE TABLE organizations (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        short_name TEXT,
        support_email TEXT,
        support_phone TEXT,
        headquarters_city TEXT,
        country TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      ) STRICT;
    `);
    legacyDb.close();

    const { getDatabase } = await import("@/lib/database");
    const db = getDatabase();
    const organizationColumns = db
      .prepare("PRAGMA table_info(organizations)")
      .all()
      .map((column) => column.name);
    const defaultOrganization = db
      .prepare("SELECT id, pastor_name FROM organizations WHERE id = ? LIMIT 1")
      .get("org-firstlove");

    expect(organizationColumns).toContain("pastor_name");
    expect(organizationColumns).toContain("website_url");
    expect(defaultOrganization?.id).toBe("org-firstlove");
  });

  test("finance codes are tenant-scoped and failed journals roll back fully", async () => {
    const {
      createFundEntry,
      createLedgerAccountEntry,
      recordLedgerTransaction,
    } = await import("@/lib/finance-store");
    const { getDatabase } = await import("@/lib/database");

    createFundEntry({
      organizationId: "org-firstlove",
      name: "Building Fund",
      code: "BUILD",
    });
    expect(() =>
      createFundEntry({
        organizationId: "org-rccg",
        name: "Building Fund",
        code: "BUILD",
      })
    ).not.toThrow();
    expect(() =>
      createFundEntry({
        organizationId: "org-firstlove",
        name: "Duplicate Building Fund",
        code: "BUILD",
      })
    ).toThrow();

    const cashAccountId = createLedgerAccountEntry({
      organizationId: "org-firstlove",
      name: "Cash",
      type: "asset",
      code: "CASH",
    });

    expect(() =>
      recordLedgerTransaction({
        organizationId: "org-firstlove",
        memo: "Rollback probe",
        lines: [
          { accountId: cashAccountId, debit: 25, credit: 0 },
          { accountId: "missing-ledger-account", debit: 0, credit: 25 },
        ],
      })
    ).toThrow();

    const persisted = getDatabase()
      .prepare(
        "SELECT COUNT(*) AS count FROM ledger_transactions WHERE memo = ?"
      )
      .get("Rollback probe");
    expect(persisted?.count).toBe(0);
  });
});
