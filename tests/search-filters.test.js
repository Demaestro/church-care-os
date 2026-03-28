import { describe, expect, test } from "vitest";
import {
  filterHouseholds,
  filterRecoveryRequests,
  filterUsers,
  hasActiveFilters,
} from "@/lib/search-filters";

describe("search filters", () => {
  test("filters households by query, risk, and assignment", () => {
    const households = [
      {
        name: "Ruth Okonkwo",
        owner: "Mercy & welfare lane",
        risk: "urgent",
        situation: "Sensitive financial follow-up",
        summaryNote: "Needs careful handoff",
        tags: ["Finance", "Private"],
        relatedRequests: [{ need: "Financial help" }],
      },
      {
        name: "Joyce Akin",
        owner: "Unassigned",
        risk: "watch",
        situation: "Meal delivery after childbirth",
        summaryNote: "Warm meal support",
        tags: ["Meal support"],
        relatedRequests: [{ need: "Meal support" }],
      },
    ];

    expect(
      filterHouseholds(households, {
        query: "financial ruth",
        risk: "urgent",
        assignment: "assigned",
      })
    ).toHaveLength(1);

    expect(
      filterHouseholds(households, {
        query: "meal",
        risk: "all",
        assignment: "unassigned",
      })[0]?.name
    ).toBe("Joyce Akin");
  });

  test("filters users by query, role, and status", () => {
    const users = [
      {
        name: "Pastor Emmanuel",
        email: "pastor@grace.demo",
        role: "pastor",
        lane: "",
        volunteerName: "",
        active: true,
      },
      {
        name: "Sister Ngozi Okafor",
        email: "volunteer@grace.demo",
        role: "volunteer",
        lane: "Mercy & welfare lane",
        volunteerName: "Sister Ngozi",
        active: false,
      },
    ];

    expect(
      filterUsers(users, {
        query: "ngozi mercy",
        role: "volunteer",
        status: "inactive",
      })
    ).toHaveLength(1);

    expect(
      filterUsers(users, {
        query: "pastor",
        role: "pastor",
        status: "active",
      })[0]?.email
    ).toBe("pastor@grace.demo");
  });

  test("filters recovery requests and detects active filter values", () => {
    const requests = [
      {
        email: "leader@grace.demo",
        requesterName: "Deacon Bello",
        note: "Locked out after phone change",
        resolutionNote: "",
        status: "open",
      },
      {
        email: "volunteer@grace.demo",
        requesterName: "Sister Ngozi",
        note: "",
        resolutionNote: "Link sent",
        status: "issued",
      },
    ];

    expect(
      filterRecoveryRequests(requests, {
        query: "phone",
        status: "open",
      })
    ).toHaveLength(1);

    expect(hasActiveFilters({ query: "", role: "all", status: "active" })).toBe(true);
    expect(hasActiveFilters({ query: "", role: "all", status: "all" })).toBe(false);
  });
});
