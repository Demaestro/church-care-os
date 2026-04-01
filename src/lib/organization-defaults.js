import { APP_TIME_ZONE } from "@/lib/care-format";

export const defaultPrimaryOrganizationId = "org-firstlove";
export const defaultPrimaryBranchId = "branch-firstlove-lagos-hq";

export const defaultOrganizations = [
  {
    id: "org-firstlove",
    slug: "firstlove-assembly",
    name: "FirstLove Assembly",
    shortName: "FirstLove",
    supportEmail: "care@firstloveassembly.org",
    supportPhone: "+234 800 000 0101",
    headquartersCity: "Lagos",
    country: "Nigeria",
  },
  {
    id: "org-rccg",
    slug: "rccg",
    name: "RCCG",
    shortName: "RCCG",
    supportEmail: "care@rccg.example",
    supportPhone: "+234 800 000 0202",
    headquartersCity: "Lagos",
    country: "Nigeria",
  },
  {
    id: "org-dunamis",
    slug: "dunamis",
    name: "Dunamis International Gospel Centre",
    shortName: "Dunamis",
    supportEmail: "care@dunamis.example",
    supportPhone: "+234 800 000 0303",
    headquartersCity: "Abuja",
    country: "Nigeria",
  },
  {
    id: "org-living-faith",
    slug: "living-faith-church",
    name: "Living Faith Church",
    shortName: "Living Faith",
    supportEmail: "care@livingfaith.example",
    supportPhone: "+234 800 000 0404",
    headquartersCity: "Ota",
    country: "Nigeria",
  },
];

export const defaultRegions = [
  {
    id: "region-firstlove-south-west",
    organizationId: "org-firstlove",
    slug: "south-west-region",
    code: "FLA-SW",
    name: "South West Region",
    description: "Coordinates branches across the South West corridor.",
    leadName: "Pastor Emmanuel Afolayan",
  },
  {
    id: "region-firstlove-north-central",
    organizationId: "org-firstlove",
    slug: "north-central-region",
    code: "FLA-NC",
    name: "North Central Region",
    description: "Supports branch care operations across Abuja and nearby zones.",
    leadName: "Pastor Miriam Okeke",
  },
  {
    id: "region-firstlove-south-east",
    organizationId: "org-firstlove",
    slug: "south-east-region",
    code: "FLA-SE",
    name: "South East Region",
    description: "Oversees pastoral care health across the South East branches.",
    leadName: "Pastor Daniel Nwosu",
  },
  {
    id: "region-rccg-national",
    organizationId: "org-rccg",
    slug: "national-region",
    code: "RCCG-NAT",
    name: "National Region",
    description: "National oversight lane for RCCG care operations.",
    leadName: "Pastor Michael Adebayo",
  },
  {
    id: "region-dunamis-fct",
    organizationId: "org-dunamis",
    slug: "fct-region",
    code: "DUN-FCT",
    name: "FCT Region",
    description: "Regional oversight for Dunamis branch care across Abuja.",
    leadName: "Pastor Stephen Musa",
  },
  {
    id: "region-living-faith-ota",
    organizationId: "org-living-faith",
    slug: "ota-region",
    code: "LFC-OTA",
    name: "Ota Region",
    description: "Canaanland and related branches under the Ota region.",
    leadName: "Pastor Samuel Akinwale",
  },
];

export const defaultBranches = [
  {
    id: "branch-firstlove-lagos-hq",
    organizationId: "org-firstlove",
    regionId: "region-firstlove-south-west",
    slug: "lagos-headquarters",
    code: "FLA-LAG-HQ",
    name: "Lagos Headquarters",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    pastorName: "Pastor Emmanuel Afolayan",
    supportEmail: "lagos@firstloveassembly.org",
    supportPhone: "+234 800 000 0102",
    isHeadquarters: true,
  },
  {
    id: "branch-firstlove-abuja-central",
    organizationId: "org-firstlove",
    regionId: "region-firstlove-north-central",
    slug: "abuja-central",
    code: "FLA-ABJ-CEN",
    name: "Abuja Central",
    city: "Abuja",
    state: "FCT",
    country: "Nigeria",
    pastorName: "Pastor Miriam Okeke",
    supportEmail: "abuja@firstloveassembly.org",
    supportPhone: "+234 800 000 0103",
    isHeadquarters: false,
  },
  {
    id: "branch-firstlove-enugu-city",
    organizationId: "org-firstlove",
    regionId: "region-firstlove-south-east",
    slug: "enugu-city",
    code: "FLA-ENU-CIT",
    name: "Enugu City",
    city: "Enugu",
    state: "Enugu",
    country: "Nigeria",
    pastorName: "Pastor Daniel Nwosu",
    supportEmail: "enugu@firstloveassembly.org",
    supportPhone: "+234 800 000 0104",
    isHeadquarters: false,
  },
  {
    id: "branch-firstlove-owerri",
    organizationId: "org-firstlove",
    regionId: "region-firstlove-south-east",
    slug: "owerri",
    code: "FLA-OWR",
    name: "Owerri",
    city: "Owerri",
    state: "Imo",
    country: "Nigeria",
    pastorName: "Pastor Daniel Nnabugo",
    supportEmail: "owerri@firstloveassembly.org",
    supportPhone: "+234 800 000 0105",
    isHeadquarters: false,
  },
  {
    id: "branch-firstlove-port-harcourt",
    organizationId: "org-firstlove",
    regionId: "region-firstlove-south-east",
    slug: "port-harcourt",
    code: "FLA-PHC",
    name: "Port Harcourt",
    city: "Port Harcourt",
    state: "Rivers",
    country: "Nigeria",
    pastorName: "Pastor Linus Ochai",
    supportEmail: "portharcourt@firstloveassembly.org",
    supportPhone: "+234 800 000 0106",
    isHeadquarters: false,
  },
  {
    id: "branch-rccg-national-hq",
    organizationId: "org-rccg",
    regionId: "region-rccg-national",
    slug: "national-headquarters",
    code: "RCCG-HQ",
    name: "National Headquarters",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    pastorName: "Pastor Michael Adebayo",
    supportEmail: "hq@rccg.example",
    supportPhone: "+234 800 000 0203",
    isHeadquarters: true,
  },
  {
    id: "branch-dunamis-central",
    organizationId: "org-dunamis",
    regionId: "region-dunamis-fct",
    slug: "central-auditorium",
    code: "DUN-ABJ-CEN",
    name: "Central Auditorium",
    city: "Abuja",
    state: "FCT",
    country: "Nigeria",
    pastorName: "Pastor Stephen Musa",
    supportEmail: "central@dunamis.example",
    supportPhone: "+234 800 000 0304",
    isHeadquarters: true,
  },
  {
    id: "branch-living-faith-canaanland",
    organizationId: "org-living-faith",
    regionId: "region-living-faith-ota",
    slug: "canaanland",
    code: "LFC-OTA-HQ",
    name: "Canaanland",
    city: "Ota",
    state: "Ogun",
    country: "Nigeria",
    pastorName: "Pastor Samuel Akinwale",
    supportEmail: "canaanland@livingfaith.example",
    supportPhone: "+234 800 000 0405",
    isHeadquarters: true,
  },
];

export const defaultMinistryTeams = [
  {
    id: "team-mercy-welfare",
    name: "Mercy & welfare team",
    lane: "Mercy & welfare lane",
    description:
      "Coordinates meals, transport, and welfare support after pastoral review.",
    leadName: "Deacon Bello",
    contactEmail: "mercy@firstloveassembly.org",
    capabilities: ["Meal support", "Transport", "Financial help"],
  },
  {
    id: "team-prayer-follow-up",
    name: "Prayer & encouragement team",
    lane: "Prayer & encouragement lane",
    description:
      "Handles prayer follow-up, encouragement calls, and non-sensitive check-ins.",
    leadName: "Pastor Emmanuel Afolayan",
    contactEmail: "prayer@firstloveassembly.org",
    capabilities: ["Prayer", "Encouragement", "Phone follow-up"],
  },
  {
    id: "team-hospital-visits",
    name: "Hospital & visitation team",
    lane: "Hospital & visitation lane",
    description:
      "Organizes visits, bedside prayer, and recovery support when in-person presence is appropriate.",
    leadName: "Elder Tunde",
    contactEmail: "visits@firstloveassembly.org",
    capabilities: ["Hospital visit", "Home visit", "Recovery support"],
  },
  {
    id: "team-counsel-grief",
    name: "Counseling & grief support team",
    lane: "Counseling & grief lane",
    description:
      "Supports longer-form care work under closer pastoral oversight before wider handoff.",
    leadName: "Pastor Miriam Okeke",
    contactEmail: "care@firstloveassembly.org",
    capabilities: ["Counseling", "Grief support", "Someone to talk to"],
  },
];

export const defaultBranchTeams = [
  {
    id: "team-firstlove-lagos-mercy",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    name: "Lagos Mercy & welfare team",
    lane: "Mercy & welfare lane",
    description:
      "Coordinates practical care across the Lagos HQ branch.",
    leadName: "Deacon Bello",
    contactEmail: "mercy@firstloveassembly.org",
    capabilities: ["Meal support", "Transport", "Financial help"],
  },
  {
    id: "team-firstlove-lagos-prayer",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    name: "Lagos Prayer & encouragement team",
    lane: "Prayer & encouragement lane",
    description:
      "Carries prayer follow-up and gentle pastoral encouragement in Lagos HQ.",
    leadName: "Pastor Emmanuel Afolayan",
    contactEmail: "prayer@firstloveassembly.org",
    capabilities: ["Prayer", "Encouragement", "Phone follow-up"],
  },
  {
    id: "team-firstlove-abuja-mercy",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-abuja-central",
    name: "Abuja Mercy & welfare team",
    lane: "Mercy & welfare lane",
    description:
      "Coordinates meals, transport, and welfare handoffs for Abuja Central.",
    leadName: "Deacon Chinedu",
    contactEmail: "mercy.abuja@firstloveassembly.org",
    capabilities: ["Meal support", "Transport", "Financial help"],
  },
  {
    id: "team-firstlove-abuja-counsel",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-abuja-central",
    name: "Abuja Counseling & grief support team",
    lane: "Counseling & grief lane",
    description:
      "Supports counseling, grief response, and pastor-approved care plans in Abuja Central.",
    leadName: "Pastor Miriam Okeke",
    contactEmail: "care.abuja@firstloveassembly.org",
    capabilities: ["Counseling", "Grief support", "Someone to talk to"],
  },
  {
    id: "team-firstlove-enugu-visits",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-enugu-city",
    name: "Enugu Hospital & visitation team",
    lane: "Hospital & visitation lane",
    description:
      "Organizes home and hospital follow-up for Enugu City.",
    leadName: "Elder Ifeanyi",
    contactEmail: "visits.enugu@firstloveassembly.org",
    capabilities: ["Hospital visit", "Home visit", "Recovery support"],
  },
];

export const defaultChurchSettings = {
  churchName: "FirstLove Assembly",
  campusName: "Lagos Headquarters",
  supportEmail: "care@firstloveassembly.org",
  supportPhone: "+234 800 000 0101",
  timezone: APP_TIME_ZONE,
  intakeConfirmationText:
    "Your request has been received. Your branch pastor or an assigned care leader will review it and follow up using the contact method you provided.",
  emergencyBanner:
    "If the situation is unsafe or urgent right now, contact your branch pastor or emergency support directly instead of waiting on this form alone.",
  planName: "Shepherd network",
  billingContactEmail: "hq.finance@firstloveassembly.org",
  monthlySeatAllowance: "120 internal seats across all branches",
  nextRenewalDate: "2026-06-01T00:00:00.000Z",
  backupExpectation: "Nightly backups with a weekly restore drill",
  emailDeliveryMode: "log-only",
  emailProvider: "resend",
  emailFromName: "FirstLove Assembly Care Office",
  emailFromAddress: "care@firstloveassembly.org",
  emailReplyTo: "care@firstloveassembly.org",
  emailSubjectPrefix: "FirstLove Assembly",
  messageDeliveryMode: "log-only",
  messageProvider: "twilio",
  smsFromNumber: "+15005550006",
  whatsappFromNumber: "+14155238886",
  notificationChannels: ["Phone follow-up", "Text updates", "In-person visit"],
};

export const defaultBranchSettings = [
  {
    id: "branch-settings-firstlove-lagos-hq",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-lagos-hq",
    supportEmail: "lagos@firstloveassembly.org",
    supportPhone: "+234 800 000 0102",
    intakeConfirmationText:
      "Your Lagos HQ care request has been received. A pastor or assigned care leader from Lagos Headquarters will follow up with you.",
    emergencyBanner:
      "If you are in immediate danger or need urgent medical help in Lagos, please contact emergency support before waiting on this care form.",
    publicIntro:
      "Share what is happening in a calm, private space. Lagos HQ pastors and care leaders will take the next safe step with you.",
    followUpGuidance:
      "Lagos HQ uses a 24-hour first-touch target for urgent care and a 72-hour target for steady follow-up.",
    emailFromName: "FirstLove Assembly Lagos Care Office",
    emailFromAddress: "lagos@firstloveassembly.org",
    emailReplyTo: "lagos@firstloveassembly.org",
  },
  {
    id: "branch-settings-firstlove-abuja-central",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-abuja-central",
    supportEmail: "abuja@firstloveassembly.org",
    supportPhone: "+234 800 000 0103",
    intakeConfirmationText:
      "Your Abuja Central request is now with the branch care team. A pastor or assigned leader in Abuja Central will review it shortly.",
    emergencyBanner:
      "If this is an immediate safety issue in Abuja, contact emergency support and your branch pastor directly.",
    publicIntro:
      "Abuja Central keeps this request private and routes it only to the people needed to care for you safely.",
    followUpGuidance:
      "Abuja Central prioritizes grief, welfare, and pastoral review with a branch-led follow-up plan.",
    emailFromName: "FirstLove Assembly Abuja Central",
    emailFromAddress: "abuja@firstloveassembly.org",
    emailReplyTo: "abuja@firstloveassembly.org",
  },
];

export const supportedTimezones = [
  "Africa/Lagos",
  "Europe/London",
  "America/New_York",
];

export function getDefaultOrganizationById(organizationId) {
  return (
    defaultOrganizations.find((organization) => organization.id === organizationId) ||
    defaultOrganizations[0]
  );
}

export function getDefaultBranchById(branchId) {
  return (
    defaultBranches.find((branch) => branch.id === branchId) || defaultBranches[0]
  );
}

export function getDefaultBranchTeams(branchId) {
  return defaultBranchTeams.filter((team) => team.branchId === branchId);
}

/**
 * Named pastor accounts that are always seeded (INSERT OR IGNORE),
 * even in production.  Passwords should be changed on first login.
 */
export const permanentPastorAccounts = [
  {
    id: "user-pastor-daniel-nnabugo",
    name: "Pastor Daniel Nnabugo",
    email: "daniel.nnabugo@firstloveassembly.org",
    password: "Firstlove@Owerri1",
    role: "pastor",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-owerri",
    accessScope: "branch",
    title: "Senior Pastor",
  },
  {
    id: "user-pastor-linus-ochai",
    name: "Pastor Linus Ochai",
    email: "linus.ochai@firstloveassembly.org",
    password: "Firstlove@PH1",
    role: "pastor",
    organizationId: "org-firstlove",
    branchId: "branch-firstlove-port-harcourt",
    accessScope: "branch",
    title: "Senior Pastor",
  },
];
