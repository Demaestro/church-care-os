import { APP_TIME_ZONE } from "@/lib/care-format";

export const defaultMinistryTeams = [
  {
    id: "team-mercy-welfare",
    name: "Mercy & welfare team",
    lane: "Mercy & welfare lane",
    description:
      "Coordinates practical care such as meals, transport, and short-term welfare support after pastoral review.",
    leadName: "Deacon Bello",
    contactEmail: "mercy@gracecommunity.church",
    capabilities: ["Meal support", "Transport", "Financial help"],
  },
  {
    id: "team-prayer-follow-up",
    name: "Prayer & encouragement team",
    lane: "Prayer & encouragement lane",
    description:
      "Handles prayer follow-up, encouragement calls, and gentle check-ins that do not require sensitive case detail.",
    leadName: "Pastor Emmanuel",
    contactEmail: "prayer@gracecommunity.church",
    capabilities: ["Prayer", "Encouragement", "Phone follow-up"],
  },
  {
    id: "team-hospital-visits",
    name: "Hospital & visitation team",
    lane: "Hospital & visitation lane",
    description:
      "Organizes visits, bedside prayer, and recovery support when in-person presence is appropriate.",
    leadName: "Elder Tunde",
    contactEmail: "visits@gracecommunity.church",
    capabilities: ["Hospital visit", "Home visit", "Recovery support"],
  },
  {
    id: "team-counsel-grief",
    name: "Counseling & grief support team",
    lane: "Counseling & grief lane",
    description:
      "Supports longer-form care work that stays under closer pastoral oversight before wider volunteer handoff.",
    leadName: "Pastor Emmanuel",
    contactEmail: "care@gracecommunity.church",
    capabilities: ["Counseling", "Grief support", "Someone to talk to"],
  },
];

export const defaultChurchSettings = {
  churchName: "Grace Community Church",
  campusName: "Main campus",
  supportEmail: "care@gracecommunity.church",
  supportPhone: "+234 800 000 0000",
  timezone: APP_TIME_ZONE,
  intakeConfirmationText:
    "Your request has been received. A pastor or assigned care leader will review it and follow up using the contact method you provided.",
  emergencyBanner:
    "If the situation is unsafe or urgent right now, contact a pastor or emergency support directly instead of waiting on this form alone.",
  planName: "Steward plan",
  billingContactEmail: "finance@gracecommunity.church",
  monthlySeatAllowance: "25 internal seats",
  nextRenewalDate: "2026-06-01T00:00:00.000Z",
  backupExpectation: "Nightly backups with a weekly restore drill",
  emailDeliveryMode: "log-only",
  emailProvider: "resend",
  emailFromName: "Grace Community Church Care Team",
  emailFromAddress: "care@gracecommunity.church",
  emailReplyTo: "care@gracecommunity.church",
  emailSubjectPrefix: "Grace Community Church",
  notificationChannels: ["Phone follow-up", "Text updates", "In-person visit"],
};

export const supportedTimezones = [
  "Africa/Lagos",
  "Europe/London",
  "America/New_York",
];
