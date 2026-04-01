export const roleLandingPages = {
  owner: "/",
  overseer: "/hq",
  general_overseer: "/hq",
  hq_care_admin: "/hq",
  regional_overseer: "/hq",
  branch_admin: "/admin/branch-users",
  pastor: "/",
  leader: "/leader",
  volunteer: "/volunteer",
};

/**
 * Roles that MUST have MFA enabled before they can access the workspace.
 * If a user with one of these roles does not yet have MFA set up, they will
 * be redirected to /security to complete enrollment after their first login.
 */
export const mfaRequiredRoles = [
  "owner",
  "overseer",
  "general_overseer",
  "hq_care_admin",
  "regional_overseer",
];

export const internalRoles = Object.keys(roleLandingPages);

export const protectedRouteRoles = {
  dashboard: ["pastor", "overseer", "owner"],
  leader: ["leader", "pastor", "overseer", "owner"],
  schedule: ["leader", "pastor", "overseer", "owner"],
  volunteer: ["volunteer", "leader", "pastor", "overseer", "owner"],
  households: ["leader", "pastor", "overseer", "owner"],
  audit: ["pastor", "overseer", "owner"],
  notifications: ["volunteer", "leader", "pastor", "overseer", "owner"],
  reports: ["pastor", "overseer", "owner"],
  teams: ["pastor", "overseer", "owner"],
  branches: ["overseer", "owner"],
  users: ["pastor", "overseer", "owner"],
  settings: ["owner"],
};

export const internalRoleOptions = [
  {
    value: "owner",
    label: "Owner",
  },
  {
    value: "overseer",
    label: "General Overseer",
  },
  {
    value: "pastor",
    label: "Branch Pastor",
  },
  {
    value: "leader",
    label: "Leader",
  },
  {
    value: "volunteer",
    label: "Volunteer",
  },
];

export const intakeRateLimit = {
  maxAttempts: 5,
  windowMs: 30 * 60 * 1000,
};

export const retentionPolicy = {
  closedRequestArchiveDays: 90,
  staleRateLimitDays: 2,
  auditLogDays: 365,
};

export const demoAuthUsers = [
  {
    name: "FirstLove Platform Owner",
    email: "owner@firstlove.demo",
    phone: "+2348010000001",
    password: "OwnerDemo!2026",
    role: "owner",
    title: "Platform owner",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    accessScope: "organization",
    managedBranchIds: [],
    lane: "",
    volunteerName: "",
  },
  {
    name: "General Overseer Daniel Afolayan",
    email: "go@firstlove.demo",
    phone: "+2348010000002",
    password: "OverseerDemo!2026",
    role: "overseer",
    title: "General overseer",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    accessScope: "organization",
    managedBranchIds: [],
    volunteerName: "",
  },
  {
    name: "Regional Overseer Grace Obi",
    email: "regional.overseer@firstlove.demo",
    phone: "+2348010000008",
    password: "RegionDemo!2026",
    role: "overseer",
    title: "Regional overseer",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-abuja-central",
    accessScope: "organization",
    managedBranchIds: [
      "branch-firstlove-abuja-central",
      "branch-firstlove-enugu-city",
    ],
    volunteerName: "",
  },
  {
    name: "Pastor Emmanuel Afolayan",
    email: "pastor.lagos@firstlove.demo",
    phone: "+2348010000003",
    password: "PastorDemo!2026",
    role: "pastor",
    title: "Branch pastor",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    accessScope: "branch",
    managedBranchIds: ["branch-firstlove-lagos-hq"],
    lane: "",
    volunteerName: "",
  },
  {
    name: "Pastor Miriam Okeke",
    phone: "+2348010000004",
    email: "pastor.abuja@firstlove.demo",
    password: "AbujaPastor!2026",
    role: "pastor",
    title: "Branch pastor",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-abuja-central",
    accessScope: "branch",
    managedBranchIds: ["branch-firstlove-abuja-central"],
    lane: "",
    volunteerName: "",
  },
  {
    name: "Deacon Bello",
    email: "leader.lagos@firstlove.demo",
    phone: "+2348010000005",
    password: "LeaderDemo!2026",
    role: "leader",
    title: "Mercy lane leader",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    accessScope: "branch",
    managedBranchIds: ["branch-firstlove-lagos-hq"],
    lane: "Mercy & welfare lane",
    volunteerName: "",
  },
  {
    name: "Sister Ngozi Okafor",
    email: "volunteer.lagos@firstlove.demo",
    phone: "+2348010000006",
    password: "VolunteerDemo!2026",
    role: "volunteer",
    title: "Volunteer",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    accessScope: "branch",
    managedBranchIds: ["branch-firstlove-lagos-hq"],
    lane: "Mercy & welfare lane",
    volunteerName: "Sister Ngozi Okafor",
  },
  {
    name: "Brother Samuel Eze",
    email: "volunteer.abuja@firstlove.demo",
    phone: "+2348010000007",
    password: "VolunteerDemo!2026",
    role: "volunteer",
    title: "Volunteer",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-abuja-central",
    accessScope: "branch",
    managedBranchIds: ["branch-firstlove-abuja-central"],
    lane: "Counseling & grief lane",
    volunteerName: "Brother Samuel Eze",
  },
];
