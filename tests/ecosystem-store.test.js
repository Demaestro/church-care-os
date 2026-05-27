import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("ecosystem command data", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-ecosystem-test-"));
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

  test("builds a connected owner command surface with finance signals", async () => {
    const { findUserByEmail } = await import("@/lib/auth-store");
    const { getEcosystemCommandData } = await import("@/lib/ecosystem-store");

    const owner = findUserByEmail("owner@firstlove.demo");
    const data = await getEcosystemCommandData(owner, "");

    expect(data.workspace.organizationName).toContain("FirstLove");
    expect(data.metrics.map((metric) => metric.label)).toEqual([
      "People",
      "Care Signals",
      "Discipleship",
      "Ministries",
    ]);
    expect(data.graph.nodes.find((node) => node.id === "church")).toBeTruthy();
    expect(data.signals.length).toBeGreaterThan(0);
    expect(data.commandTiles.some((tile) => tile.label === "Operations")).toBe(true);
    expect(data.commandTiles.some((tile) => tile.label === "Giving")).toBe(true);
    expect(data.finance).toMatchObject({
      balanced: true,
    });
  });

  test("keeps leader data branch-scoped and hides finance", async () => {
    const { findUserByEmail } = await import("@/lib/auth-store");
    const { getEcosystemCommandData } = await import("@/lib/ecosystem-store");
    const { getRoleLandingPage } = await import("@/lib/session");

    const leader = findUserByEmail("leader.lagos@firstlove.demo");
    const data = await getEcosystemCommandData(
      leader,
      "branch-firstlove-abuja-central"
    );

    expect(getRoleLandingPage("leader")).toBe("/ecosystem");
    expect(data.workspace.activeBranchId).toBe("branch-firstlove-lagos-hq");
    expect(data.branchMatrix.every((branch) => branch.id === "branch-firstlove-lagos-hq"))
      .toBe(true);
    expect(data.commandTiles.some((tile) => tile.label === "Giving")).toBe(false);
    expect(data.finance).toBeNull();
  });
});
