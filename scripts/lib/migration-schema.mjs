export const migrationTables = [
  {
    name: "organizations",
    booleanColumns: ["active"],
  },
  {
    name: "regions",
    booleanColumns: ["active"],
  },
  {
    name: "branches",
    booleanColumns: ["is_headquarters", "active"],
  },
  {
    name: "households",
    jsonColumns: ["tags_json", "privacy_json", "pastoral_need_json"],
  },
  {
    name: "household_notes",
  },
  {
    name: "requests",
    jsonColumns: [
      "requester_json",
      "privacy_json",
      "assigned_volunteer_json",
      "escalation_json",
    ],
  },
  {
    name: "users",
    booleanColumns: ["active", "mfa_enabled"],
    jsonColumns: ["managed_branch_ids_json", "mfa_backup_codes_json"],
  },
  {
    name: "audit_logs",
    jsonColumns: ["metadata_json"],
  },
  {
    name: "request_archive",
    jsonColumns: ["request_json"],
  },
  {
    name: "rate_limits",
  },
  {
    name: "teams",
    booleanColumns: ["active"],
    jsonColumns: ["capabilities_json"],
  },
  {
    name: "church_settings",
    jsonColumns: ["notification_channels_json"],
  },
  {
    name: "branch_settings",
  },
  {
    name: "recovery_requests",
  },
  {
    name: "password_reset_tokens",
  },
  {
    name: "auth_invites",
    jsonColumns: ["managed_branch_ids_json"],
  },
  {
    name: "auth_challenges",
  },
  {
    name: "notifications",
    jsonColumns: ["metadata_json"],
  },
  {
    name: "email_outbox",
    jsonColumns: ["provider_response_json", "metadata_json"],
  },
  {
    name: "message_outbox",
    jsonColumns: ["provider_response_json", "metadata_json"],
  },
  {
    name: "household_attachments",
  },
  {
    name: "member_transfers",
  },
  {
    name: "jobs",
    jsonColumns: ["payload_json"],
  },
];

export function getTableConfig(name) {
  return migrationTables.find((table) => table.name === name) || null;
}
