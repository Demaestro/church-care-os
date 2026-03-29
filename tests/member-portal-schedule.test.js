import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("member portal and follow-up schedule", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-member-test-"));
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

  test("opens a member portal from a tracking code and matching contact", async () => {
    const {
      createCareRequestEntry,
      getMemberPortalData,
      updateMemberContactProfileEntry,
    } = await import("@/lib/care-store");

    const created = await createCareRequestEntry({
      householdName: "Ruth Okonkwo",
      submittedBy: "Ruth Okonkwo",
      contactEmail: "ruth@example.com",
      contactPhone: "+2348012345678",
      preferredContact: "Phone",
      requestFor: "self",
      need: "Prayer",
      summary: "Please keep my family in prayer.",
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

    const portal = await getMemberPortalData(created.trackingCode, "ruth@example.com");
    expect(portal?.requests).toHaveLength(1);
    expect(portal?.profile.email).toBe("ruth@example.com");

    await updateMemberContactProfileEntry(created.trackingCode, "ruth@example.com", {
      email: "ruth.new@example.com",
      phone: "+2348099999999",
      preferredContact: "Email",
    });

    const refreshedPortal = await getMemberPortalData(
      created.trackingCode,
      "ruth.new@example.com"
    );
    expect(refreshedPortal?.profile.email).toBe("ruth.new@example.com");
    expect(refreshedPortal?.profile.phone).toBe("+2348099999999");
    expect(refreshedPortal?.profile.preferredContact).toBe("Email");
  });

  test("saves follow-up plans into the schedule board", async () => {
    const {
      createCareRequestEntry,
      getFollowUpScheduleData,
      saveFollowUpPlanEntry,
    } = await import("@/lib/care-store");

    const created = await createCareRequestEntry({
      householdName: "Joyce Akin",
      submittedBy: "Joyce Akin",
      contactEmail: "joyce@example.com",
      contactPhone: "",
      preferredContact: "Email",
      requestFor: "self",
      need: "Meal support",
      summary: "Meal support after delivery.",
      dueAt: "2026-03-31T10:00:00.000Z",
      risk: "steady",
      stage: "Assign",
      owner: "Mercy lane",
      source: "Member care form",
      tags: "Meal support",
      intakeNote: "Submitted online.",
      privacyLevel: "pastors-and-assigned-leads",
      shareWithVolunteers: true,
      allowTextUpdates: true,
    });

    await saveFollowUpPlanEntry(created.householdSlug, {
      nextTouchpoint: "2026-04-02T09:00:00.000Z",
      owner: "Mercy lane",
      author: "Scheduler",
      note: "Call and confirm delivery support.",
    });

    const schedule = await getFollowUpScheduleData();
    const item = schedule.items.find(
      (entry) => entry.householdSlug === created.householdSlug
    );

    expect(item?.owner).toBe("Mercy lane");
    expect(item?.nextTouchpoint).toBe("2026-04-02T09:00:00.000Z");
  });
});
