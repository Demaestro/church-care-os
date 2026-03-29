export const roleLandingPages = {
  owner: "/",
  pastor: "/",
  leader: "/leader",
  volunteer: "/volunteer",
};

export const internalRoles = Object.keys(roleLandingPages);

export const protectedRouteRoles = {
  dashboard: ["pastor", "owner"],
  leader: ["leader", "pastor", "owner"],
  volunteer: ["volunteer", "leader", "pastor", "owner"],
  households: ["leader", "pastor", "owner"],
  audit: ["pastor", "owner"],
  notifications: ["volunteer", "leader", "pastor", "owner"],
  reports: ["pastor", "owner"],
  teams: ["pastor", "owner"],
  users: ["pastor", "owner"],
  settings: ["owner"],
};

export const internalRoleOptions = [
  {
    value: "owner",
    label: "Owner",
  },
  {
    value: "pastor",
    label: "Pastor",
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
    name: "Pastor Emmanuel",
    email: "pastor@grace.demo",
    phone: "+2348010000001",
    password: "PastorDemo!2026",
    role: "pastor",
    lane: "",
    volunteerName: "",
  },
  {
    name: "Deacon Bello",
    email: "leader@grace.demo",
    phone: "+2348010000002",
    password: "LeaderDemo!2026",
    role: "leader",
    lane: "Mercy & welfare lane",
    volunteerName: "",
  },
  {
    name: "Sister Ngozi Okafor",
    email: "volunteer@grace.demo",
    phone: "+2348010000003",
    password: "VolunteerDemo!2026",
    role: "volunteer",
    lane: "",
    volunteerName: "Sister Ngozi Okafor",
  },
  {
    name: "Church Owner",
    email: "owner@grace.demo",
    phone: "+2348010000004",
    password: "OwnerDemo!2026",
    role: "owner",
    lane: "",
    volunteerName: "",
  },
];
