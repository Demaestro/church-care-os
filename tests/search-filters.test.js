import { describe, expect, test } from "vitest";
import {
  filterHouseholds,
  filterNotifications,
  filterRecoveryRequests,
  filterRecentClosures,
  filterOverdueFollowUps,
  filterUsers,
  filterVolunteerLoads,
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
        phone: "+2348010000003",
        role: "volunteer",
        lane: "Mercy & welfare lane",
        volunteerName: "Sister Ngozi",
        active: false,
      },
    ];

    expect(
      filterUsers(users, {
        query: "ngozi mercy +234801",
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

  test("filters notifications by query, read status, and kind", () => {
    const notifications = [
      {
        title: "Volunteer accepted a task",
        body: "Sister Ngozi accepted an assigned care follow-up.",
        kind: "task",
        read: false,
      },
      {
        title: "Password reset link sent",
        body: "A one-time password reset link was sent.",
        kind: "account",
        read: true,
      },
    ];

    expect(
      filterNotifications(notifications, {
        query: "ngozi follow-up",
        status: "unread",
        kind: "task",
      })
    ).toHaveLength(1);

    expect(
      filterNotifications(notifications, {
        query: "password",
        status: "read",
        kind: "account",
      })[0]?.title
    ).toBe("Password reset link sent");
  });

  test("filters report lists by shared search query", () => {
    const volunteerLoads = [
      {
        name: "Sister Ngozi Okafor",
        team: "Mercy & welfare team",
        lane: "Mercy & welfare lane",
        email: "volunteer@grace.demo",
      },
      {
        name: "Brother Peter Obi",
        team: "Prayer & encouragement team",
        lane: "Prayer & encouragement lane",
        email: "peter@grace.demo",
      },
    ];
    const overdueFollowUps = [
      {
        name: "Ruth Okonkwo",
        owner: "Mercy & welfare lane",
        dueLabel: "2 days overdue",
      },
    ];
    const recentClosures = [
      {
        householdName: "Joyce Akin",
        need: "Meal support",
        closedLabel: "Today",
      },
    ];

    expect(filterVolunteerLoads(volunteerLoads, { query: "ngozi mercy" })).toHaveLength(1);
    expect(filterOverdueFollowUps(overdueFollowUps, { query: "ruth overdue" })).toHaveLength(1);
    expect(filterRecentClosures(recentClosures, { query: "joyce meal" })).toHaveLength(1);
  });
});
