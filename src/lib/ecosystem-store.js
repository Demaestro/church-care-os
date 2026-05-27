import "server-only";

import { cache } from "react";
import { listRecentServices } from "@/lib/attendance-store";
import { getDashboardData } from "@/lib/care-store";
import {
  getBranchOverview,
  getOperationalReportData,
  getWorkspaceContext,
  listMinistryTeams,
} from "@/lib/organization-store";
import { getDiscipleshipStats, listDiscipleshipRecords } from "@/lib/discipleship-store";
import { listFunds, listPledges, getTrialBalance } from "@/lib/finance-store";
import { listGroups } from "@/lib/group-store";
import { listMembers } from "@/lib/member-store";
import { getNewMemberStats, listJourneys } from "@/lib/new-member-store";
import { getOperationsSummaryData } from "@/lib/operations-store";
import { normalizeInternalRole } from "@/lib/policies";

const attentionToneWeights = {
  high: 0,
  medium: 1,
  low: 2,
};

export const getEcosystemCommandData = cache(async function getEcosystemCommandData(
  viewer,
  preferredBranchId = ""
) {
  const workspace = getWorkspaceContext(viewer, preferredBranchId);
  const activeBranchId =
    workspace.activeBranch?.id ||
    (viewer?.accessScope === "organization" ? "" : viewer?.branchId || "");
  const organizationId = workspace.organization.id;
  const role = normalizeInternalRole(viewer?.role);
  const canSeeFinance = ["pastor", "owner"].includes(role);

  const [dashboard, report] = await Promise.all([
    getDashboardData(viewer, activeBranchId),
    getOperationalReportData(viewer, activeBranchId),
  ]);

  const members = listMembers({
    organizationId,
    branchId: activeBranchId,
    limit: 1000,
  });
  const services = listRecentServices({
    organizationId,
    branchId: activeBranchId,
    limit: 8,
  });
  const teams = listMinistryTeams(viewer, activeBranchId);
  const branches = getBranchOverview(viewer, activeBranchId);
  const groups = listGroups({ organizationId, branchId: activeBranchId });
  const journeys = listJourneys(organizationId, activeBranchId, { limit: 200 });
  const newMemberStats = getNewMemberStats(organizationId, activeBranchId);
  const discipleshipStats = getDiscipleshipStats(organizationId, activeBranchId);
  const discipleshipRecords = listDiscipleshipRecords(organizationId, activeBranchId, {
    limit: 300,
  });
  const finance = canSeeFinance
    ? {
        funds: listFunds({ organizationId }),
        pledges: listPledges({ organizationId, limit: 80 }),
        trialBalance: getTrialBalance({ organizationId }),
      }
    : null;
  const operations = getOperationsSummaryData(viewer, activeBranchId);

  const overdueFollowUps = getOverdueHouseholds(dashboard.households);
  const urgentHouseholds = dashboard.households.filter(
    (household) => household.risk === "urgent"
  );
  const unassignedRequests = dashboard.openRequests.filter(
    (request) => !request.owner || request.owner === "Unassigned"
  );
  const activeTeams = teams.filter((team) => team.active);
  const activeVolunteers = report.volunteerLoads.filter((volunteer) => volunteer.active);
  const groupsMemberCount = groups.reduce(
    (sum, group) => sum + Number(group.member_count || group.memberCount || 0),
    0
  );
  const journeysAtRisk = journeys.filter((journey) => isJourneyAtRisk(journey));
  const discipleshipEngaged = discipleshipRecords.filter((record) =>
    isDiscipleshipEngaged(record)
  );
  const ministryHealth = buildMinistryHealth(activeTeams);
  const branchMatrix = buildBranchMatrix(branches, report.volunteerLoads);
  const readiness = buildSundayReadiness({
    services,
    activeTeams,
    activeVolunteers,
    overdueFollowUps,
    journeysAtRisk,
    unassignedRequests,
  });
  const scores = {
    sundayReadiness: readiness.score,
    discipleshipMomentum: percentage(discipleshipEngaged.length, discipleshipRecords.length),
    ministryHealth: ministryHealth.score,
    groupConnection: percentage(groupsMemberCount, members.length),
  };
  const signals = buildSignals({
    urgentHouseholds,
    overdueFollowUps,
    journeysAtRisk,
    unassignedRequests,
    discipleshipRecords,
    discipleshipEngaged,
    ministryHealth,
    branchMatrix,
    finance,
    operations,
  });

  return {
    workspace: {
      organizationName: workspace.organization.name,
      organizationShortName: workspace.organization.shortName || workspace.organization.name,
      scopeLabel: workspace.activeScopeLabel,
      branchCount: branches.length,
      activeBranchId,
      canSeeFinance,
    },
    metrics: [
      {
        label: "People",
        value: members.length,
        detail: `${dashboard.households.length} households and ${groups.length} groups connected.`,
        href: "/members",
        tone: "blue",
      },
      {
        label: "Care Signals",
        value: dashboard.openRequests.length,
        detail: `${urgentHouseholds.length} urgent, ${overdueFollowUps.length} overdue.`,
        href: "/inbox?view=urgent",
        tone: urgentHouseholds.length > 0 ? "rose" : "green",
      },
      {
        label: "Discipleship",
        value: `${scores.discipleshipMomentum}%`,
        detail: `${discipleshipStats.total} active pathway records.`,
        href: "/discipleship",
        tone: "teal",
      },
      {
        label: "Ministries",
        value: `${scores.ministryHealth}%`,
        detail: `${activeTeams.length} ministry teams in the operating graph.`,
        href: "/teams",
        tone: "amber",
      },
    ],
    graph: buildChurchGraph({
      organizationName: workspace.organization.shortName || workspace.organization.name,
      peopleCount: members.length,
      householdCount: dashboard.households.length,
      groupCount: groups.length,
      teamCount: activeTeams.length,
      branchCount: branches.length,
      serviceCount: services.length,
    }),
    readiness,
    scores,
    signals,
    peopleNeedingAttention: buildPeopleAttentionQueue({
      urgentHouseholds,
      overdueFollowUps,
      journeysAtRisk,
      unassignedRequests,
    }),
    discipleship: {
      total: discipleshipStats.total,
      byStage: discipleshipStats.byStage,
      engagedCount: discipleshipEngaged.length,
      records: discipleshipRecords.slice(0, 6),
    },
    newMembers: {
      ...newMemberStats,
      atRiskJourneys: journeysAtRisk.slice(0, 5),
      activeJourneys: journeys
        .filter((journey) => !journey.completedAt && !journey.droppedAt)
        .slice(0, 5),
    },
    ministryHealth,
    branchMatrix,
    commandTiles: buildCommandTiles({
      members,
      dashboard,
      groups,
      activeTeams,
      services,
      newMemberStats,
      canSeeFinance,
      finance,
      report,
      operations,
    }),
    finance: canSeeFinance
      ? {
          fundCount: finance.funds.length,
          activePledges: finance.pledges.filter((pledge) => pledge.status === "active")
            .length,
          balanced: finance.trialBalance.balanced,
        }
      : null,
  };
});

function buildChurchGraph({
  organizationName,
  peopleCount,
  householdCount,
  groupCount,
  teamCount,
  branchCount,
  serviceCount,
}) {
  const nodes = [
    {
      id: "church",
      label: organizationName,
      value: "Church",
      x: 50,
      y: 48,
      size: 82,
      color: "#2563eb",
    },
    {
      id: "people",
      label: "People",
      value: formatCount(peopleCount),
      x: 22,
      y: 34,
      size: 58,
      color: "#16a34a",
    },
    {
      id: "households",
      label: "Households",
      value: formatCount(householdCount),
      x: 34,
      y: 70,
      size: 54,
      color: "#0f766e",
    },
    {
      id: "groups",
      label: "Groups",
      value: formatCount(groupCount),
      x: 68,
      y: 30,
      size: 54,
      color: "#7c3aed",
    },
    {
      id: "ministries",
      label: "Ministries",
      value: formatCount(teamCount),
      x: 78,
      y: 66,
      size: 58,
      color: "#d97706",
    },
    {
      id: "campuses",
      label: "Campuses",
      value: formatCount(branchCount),
      x: 50,
      y: 18,
      size: 50,
      color: "#0891b2",
    },
    {
      id: "services",
      label: "Services",
      value: formatCount(serviceCount),
      x: 16,
      y: 72,
      size: 46,
      color: "#be123c",
    },
  ];

  return {
    nodes,
    edges: [
      ["church", "people"],
      ["church", "households"],
      ["church", "groups"],
      ["church", "ministries"],
      ["church", "campuses"],
      ["people", "households"],
      ["people", "groups"],
      ["households", "services"],
      ["groups", "ministries"],
      ["campuses", "ministries"],
      ["campuses", "people"],
    ],
  };
}

function buildSundayReadiness({
  services,
  activeTeams,
  activeVolunteers,
  overdueFollowUps,
  journeysAtRisk,
  unassignedRequests,
}) {
  const checks = [
    {
      label: "Service logging",
      detail:
        services.length > 0
          ? `${services[0].name} has ${services[0].attendance_count || 0} check-ins logged.`
          : "No service has been logged yet.",
      href: "/attendance",
      complete: services.length > 0,
    },
    {
      label: "Team coverage",
      detail: `${activeTeams.length} active teams and ${activeVolunteers.length} active volunteers.`,
      href: "/teams",
      complete: activeTeams.length > 0 && activeVolunteers.length > 0,
    },
    {
      label: "Follow-up rhythm",
      detail:
        overdueFollowUps.length === 0
          ? "No overdue household touchpoints are visible."
          : `${overdueFollowUps.length} household touchpoints are overdue.`,
      href: "/follow-up?view=overdue",
      complete: overdueFollowUps.length === 0,
    },
    {
      label: "New member handoff",
      detail:
        journeysAtRisk.length === 0
          ? "New member journeys have a recent contact signal."
          : `${journeysAtRisk.length} new member journeys need contact.`,
      href: "/new-members",
      complete: journeysAtRisk.length === 0,
    },
    {
      label: "Care ownership",
      detail:
        unassignedRequests.length === 0
          ? "Open requests have visible owners."
          : `${unassignedRequests.length} open requests need an owner.`,
      href: "/leader",
      complete: unassignedRequests.length === 0,
    },
  ];

  return {
    score: percentage(
      checks.filter((check) => check.complete).length,
      checks.length
    ),
    checks,
    latestService: services[0] || null,
  };
}

function buildMinistryHealth(activeTeams) {
  const teams = activeTeams.map((team) => {
    const peopleCount = Number(team.volunteerCount || 0) + Number(team.leaderCount || 0);
    const loadLimit = Math.max(2, peopleCount * 2);
    const needsAttention =
      peopleCount === 0 || Number(team.openRequestCount || 0) > loadLimit;

    return {
      id: team.id,
      name: team.name,
      lane: team.lane,
      leader: team.leadName || "Unassigned",
      peopleCount,
      openRequestCount: Number(team.openRequestCount || 0),
      status: needsAttention ? "Needs attention" : "Healthy",
      tone: needsAttention ? "urgent" : "calm",
      href: "/teams",
    };
  });
  const healthyCount = teams.filter((team) => team.status === "Healthy").length;

  return {
    score: percentage(healthyCount, teams.length),
    healthyCount,
    attentionCount: teams.length - healthyCount,
    teams: teams
      .sort(
        (first, second) =>
          Number(second.openRequestCount) - Number(first.openRequestCount) ||
          first.name.localeCompare(second.name)
      )
      .slice(0, 6),
  };
}

function buildBranchMatrix(branches, volunteerLoads) {
  const volunteerCountByBranch = volunteerLoads.reduce((result, volunteer) => {
    if (!volunteer.branchId || volunteer.active === false) {
      return result;
    }

    result[volunteer.branchId] = (result[volunteer.branchId] || 0) + 1;
    return result;
  }, {});

  return branches
    .map((branch) => {
      const volunteerCount = volunteerCountByBranch[branch.id] || 0;
      const pressure =
        Number(branch.openRequestCount || 0) * 2 +
        Number(branch.urgentHouseholdCount || 0) * 3 +
        Number(branch.watchHouseholdCount || 0);
      const health =
        pressure === 0
          ? "Clear"
          : pressure >= 8 || volunteerCount === 0
            ? "At risk"
            : "Watch";

      return {
        id: branch.id,
        name: branch.name,
        regionName: branch.regionName,
        openRequestCount: branch.openRequestCount,
        urgentHouseholdCount: branch.urgentHouseholdCount,
        watchHouseholdCount: branch.watchHouseholdCount,
        volunteerCount,
        pressure,
        health,
      };
    })
    .sort(
      (first, second) =>
        second.pressure - first.pressure || first.name.localeCompare(second.name)
    );
}

function buildSignals({
  urgentHouseholds,
  overdueFollowUps,
  journeysAtRisk,
  unassignedRequests,
  discipleshipRecords,
  discipleshipEngaged,
  ministryHealth,
  branchMatrix,
  finance,
  operations,
}) {
  const signals = [
    {
      title:
        urgentHouseholds.length > 0
          ? `${urgentHouseholds.length} urgent household${urgentHouseholds.length === 1 ? "" : "s"}`
          : "Urgent care is clear",
      detail:
        urgentHouseholds.length > 0
          ? "Open the inbox and route the highest-risk care first."
          : "No urgent households are visible in the current scope.",
      tone: urgentHouseholds.length > 0 ? "high" : "low",
      href: "/inbox?view=urgent",
    },
    {
      title:
        overdueFollowUps.length > 0
          ? `${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length === 1 ? "" : "s"}`
          : "Follow-up rhythm is current",
      detail:
        overdueFollowUps.length > 0
          ? "Households with missed touchpoints should be handled before new routine work."
          : "Every visible household touchpoint is either current or unscheduled.",
      tone: overdueFollowUps.length > 0 ? "high" : "low",
      href: "/follow-up?view=overdue",
    },
    {
      title:
        journeysAtRisk.length > 0
          ? `${journeysAtRisk.length} new member handoff${journeysAtRisk.length === 1 ? "" : "s"}`
          : "New member journey is steady",
      detail:
        journeysAtRisk.length > 0
          ? "New members without a recent contact signal need a named owner today."
          : "Recent new member contacts are within the current standard.",
      tone: journeysAtRisk.length > 0 ? "medium" : "low",
      href: "/new-members",
    },
    {
      title:
        unassignedRequests.length > 0
          ? `${unassignedRequests.length} open request${unassignedRequests.length === 1 ? "" : "s"} need ownership`
          : "Care ownership is visible",
      detail:
        unassignedRequests.length > 0
          ? "Assign requests to a ministry lane or pastor before the next review cycle."
          : "Open requests have an owner in the current workspace.",
      tone: unassignedRequests.length > 0 ? "medium" : "low",
      href: "/leader",
    },
    {
      title:
        discipleshipRecords.length > discipleshipEngaged.length
          ? `${discipleshipRecords.length - discipleshipEngaged.length} discipleship gap${discipleshipRecords.length - discipleshipEngaged.length === 1 ? "" : "s"}`
          : "Discipleship momentum is connected",
      detail:
        discipleshipRecords.length > discipleshipEngaged.length
          ? "Some pathways have no visible next step, group connection, or serving signal."
          : "Visible pathway records have current engagement signals.",
      tone:
        discipleshipRecords.length > discipleshipEngaged.length ? "medium" : "low",
      href: "/discipleship",
    },
    {
      title:
        ministryHealth.attentionCount > 0
          ? `${ministryHealth.attentionCount} ministry team${ministryHealth.attentionCount === 1 ? "" : "s"} stretched`
          : "Ministry teams look healthy",
      detail:
        ministryHealth.attentionCount > 0
          ? "Review teams with high open load or no active people coverage."
          : "Active ministry teams have visible people coverage.",
      tone: ministryHealth.attentionCount > 0 ? "medium" : "low",
      href: "/teams",
    },
  ];

  const highestBranchPressure = branchMatrix[0];
  if (highestBranchPressure) {
    signals.push({
      title: `${highestBranchPressure.name} is the highest-pressure branch`,
      detail: `${highestBranchPressure.openRequestCount} open requests, ${highestBranchPressure.urgentHouseholdCount} urgent households.`,
      tone: highestBranchPressure.pressure >= 8 ? "high" : "low",
      href: "/branches",
    });
  }

  if (finance && !finance.trialBalance.balanced) {
    signals.push({
      title: "Trial balance needs review",
      detail: "Stewardship data is not balanced, so finance should review postings.",
      tone: "high",
      href: "/finance",
    });
  }

  if (operations?.summary?.signals > 0) {
    signals.push({
      title:
        operations.summary.lowFuel > 0
          ? `${operations.summary.lowFuel} diesel tracker${operations.summary.lowFuel === 1 ? "" : "s"} below reserve`
          : `${operations.summary.signals} operations signal${operations.summary.signals === 1 ? "" : "s"}`,
      detail:
        operations.summary.lowFuel > 0
          ? "Management should review fuel reserve before the next service window."
          : "Inventory, maintenance, or procurement needs management attention.",
      tone: operations.summary.lowFuel > 0 ? "high" : "medium",
      href: "/operations",
    });
  }

  return signals
    .sort(
      (first, second) =>
        attentionToneWeights[first.tone] - attentionToneWeights[second.tone]
    )
    .slice(0, 7);
}

function buildPeopleAttentionQueue({
  urgentHouseholds,
  overdueFollowUps,
  journeysAtRisk,
  unassignedRequests,
}) {
  const householdItems = urgentHouseholds.slice(0, 4).map((household) => ({
    id: `urgent:${household.slug}`,
    label: household.name,
    detail: household.pastoralNeed?.nextStep || household.summaryNote || household.situation,
    meta: household.owner || "Unassigned",
    href: `/households/${household.slug}`,
    tone: "high",
  }));
  const followUpItems = overdueFollowUps.slice(0, 4).map((household) => ({
    id: `overdue:${household.slug}`,
    label: household.name,
    detail: household.nextTouchpointShortLabel || "Overdue touchpoint",
    meta: household.owner || "Unassigned",
    href: `/households/${household.slug}`,
    tone: "medium",
  }));
  const journeyItems = journeysAtRisk.slice(0, 3).map((journey) => ({
    id: `journey:${journey.id}`,
    label: journey.memberName,
    detail:
      journey.contactCount === 0
        ? "No contact logged yet"
        : "Last contact is outside the current standard",
    meta: journey.assignedVolunteerName || "Unassigned",
    href: `/new-members/${journey.id}`,
    tone: "medium",
  }));
  const requestItems = unassignedRequests.slice(0, 3).map((request) => ({
    id: `request:${request.id}`,
    label: request.householdName,
    detail: request.need || request.summary || "Open care request",
    meta: request.dueShortLabel || request.createdLabel,
    href: request.householdSlug ? `/households/${request.householdSlug}` : "/leader",
    tone: "medium",
  }));

  return [...householdItems, ...followUpItems, ...journeyItems, ...requestItems]
    .sort(
      (first, second) =>
        attentionToneWeights[first.tone] - attentionToneWeights[second.tone]
    )
    .slice(0, 8);
}

function buildCommandTiles({
  members,
  dashboard,
  groups,
  activeTeams,
  services,
  newMemberStats,
  canSeeFinance,
  finance,
  report,
  operations,
}) {
  const tiles = [
    {
      label: "People",
      value: members.length,
      detail: "member profiles",
      href: "/members",
    },
    {
      label: "Care",
      value: dashboard.openRequests.length,
      detail: "open requests",
      href: "/inbox",
    },
    {
      label: "Groups",
      value: groups.length,
      detail: "communities",
      href: "/groups",
    },
    {
      label: "Ministries",
      value: activeTeams.length,
      detail: "active teams",
      href: "/teams",
    },
    {
      label: "Operations",
      value: operations?.summary?.signals || 0,
      detail: "resource signals",
      href: "/operations",
    },
    {
      label: "Events",
      value: services.length,
      detail: "recent services",
      href: "/attendance",
    },
    {
      label: "New Members",
      value: newMemberStats.active,
      detail: "journeys",
      href: "/new-members",
    },
    {
      label: "Reports",
      value: report.ops.auditLogCount,
      detail: "audit events",
      href: "/reports",
    },
  ];

  if (canSeeFinance && finance) {
    tiles.splice(5, 0, {
      label: "Giving",
      value: finance.funds.length,
      detail: "funds",
      href: "/finance",
    });
  }

  return tiles;
}

function getOverdueHouseholds(households) {
  const now = Date.now();

  return households.filter((household) => {
    const nextTouchpoint = new Date(household.nextTouchpoint).valueOf();
    return !Number.isNaN(nextTouchpoint) && nextTouchpoint < now;
  });
}

function isJourneyAtRisk(journey) {
  if (!journey || journey.completedAt || journey.droppedAt) {
    return false;
  }

  const registeredAt = new Date(journey.registeredAt).valueOf();
  if (Number.isNaN(registeredAt) || Date.now() - registeredAt < 2 * 86400000) {
    return false;
  }

  if (!journey.lastContactAt) {
    return true;
  }

  const lastContactAt = new Date(journey.lastContactAt).valueOf();
  return Number.isNaN(lastContactAt) || Date.now() - lastContactAt > 2 * 86400000;
}

function isDiscipleshipEngaged(record) {
  return Boolean(
    record?.nextStep ||
      record?.smallGroupConnected ||
      record?.attendingRegularly ||
      record?.serving ||
      record?.baptized ||
      record?.foundationClass ||
      record?.mentoringOthers
  );
}

function percentage(part, total) {
  if (!total) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((Number(part || 0) / total) * 100)));
}

function formatCount(value) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(
    Number(value || 0)
  );
}
