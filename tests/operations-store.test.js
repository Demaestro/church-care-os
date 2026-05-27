import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("operations command data", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-ops-test-"));
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

  test("surfaces low diesel and inventory signals for management", async () => {
    const { findUserByEmail } = await import("@/lib/auth-store");
    const { getOperationsCommandData } = await import("@/lib/operations-store");

    const owner = findUserByEmail("owner@firstlove.demo");
    const data = getOperationsCommandData(owner, "");

    expect(data.summary.lowFuel).toBeGreaterThan(0);
    expect(data.summary.lowInventory).toBeGreaterThan(0);
    expect(data.resourceSignals.some((signal) => signal.title === "Diesel is running low"))
      .toBe(true);
    expect(data.branchOps.some((branch) => branch.health === "At risk")).toBe(true);
  });

  test("keeps operations data branch-scoped for leaders", async () => {
    const { findUserByEmail } = await import("@/lib/auth-store");
    const { getOperationsCommandData } = await import("@/lib/operations-store");

    const leader = findUserByEmail("leader.lagos@firstlove.demo");
    const data = getOperationsCommandData(
      leader,
      "branch-firstlove-abuja-central"
    );

    expect(data.workspace.activeBranchId).toBe("branch-firstlove-lagos-hq");
    expect(data.fuelTanks.every((tank) => tank.branchId === "branch-firstlove-lagos-hq"))
      .toBe(true);
    expect(data.inventory.some((item) => item.name === "Generator diesel filters"))
      .toBe(false);
  });

  test("fuel logs update reserve status without crossing tank capacity", async () => {
    const { findUserByEmail } = await import("@/lib/auth-store");
    const { listFuelTanks, recordFuelLogEntry } = await import(
      "@/lib/operations-store"
    );

    const owner = findUserByEmail("owner@firstlove.demo");
    const branchId = "branch-firstlove-lagos-hq";
    const before = listFuelTanks(owner, branchId).find(
      (tank) => tank.assetName === "Main sanctuary generator"
    );

    expect(before).toMatchObject({
      currentLitres: 180,
      status: "warning",
    });

    recordFuelLogEntry(
      before.id,
      {
        logType: "refill",
        quantityLitres: 500,
        readingAt: "2026-05-27T09:00:00.000Z",
        recordedByName: "Test operator",
      },
      owner,
      branchId
    );

    const after = listFuelTanks(owner, branchId).find(
      (tank) => tank.id === before.id
    );

    expect(after.currentLitres).toBe(680);
    expect(after.status).toBe("steady");
  });
});
