CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text,
  pastor_name text,
  website_url text,
  primary_branch_id text,
  support_email text,
  support_phone text,
  headquarters_city text,
  logo_path text,
  logo_storage_backend text NOT NULL DEFAULT 'local',
  logo_mime_type text,
  logo_updated_at timestamptz,
  country text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS regions (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  lead_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS branches (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region_id text REFERENCES regions(id) ON DELETE SET NULL,
  slug text NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  city text,
  state text,
  country text,
  pastor_name text,
  support_email text,
  support_phone text,
  is_headquarters boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS households (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  stage text NOT NULL,
  risk text NOT NULL,
  situation text NOT NULL,
  owner text NOT NULL,
  next_touchpoint timestamptz,
  summary_note text,
  tags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  privacy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pastoral_need_json jsonb,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS household_notes (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  household_slug text NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  author text NOT NULL,
  kind text NOT NULL,
  body text NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  household_slug text NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
  household_name text NOT NULL,
  need text NOT NULL,
  summary text NOT NULL,
  owner text NOT NULL,
  due_at timestamptz NOT NULL,
  tone text NOT NULL,
  status text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL,
  requester_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  tracking_code text,
  status_detail text,
  next_contact_due timestamptz,
  assigned_volunteer_json jsonb,
  escalation_json jsonb
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL,
  access_scope text NOT NULL DEFAULT 'branch',
  title text,
  managed_branch_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  password_hash text NOT NULL,
  lane text,
  volunteer_name text,
  active boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  session_version integer NOT NULL DEFAULT 1,
  last_login_at timestamptz,
  birthday text,
  gender text NOT NULL DEFAULT 'unspecified',
  member_type text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_mode text NOT NULL DEFAULT 'off',
  mfa_secret text,
  mfa_backup_codes_json jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL,
  actor_user_id text,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  summary text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS request_archive (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  request_id text NOT NULL UNIQUE,
  archived_at timestamptz NOT NULL,
  request_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  window_started_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  lane text NOT NULL,
  description text NOT NULL,
  lead_name text NOT NULL,
  contact_email text,
  active boolean NOT NULL DEFAULT true,
  capabilities_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (organization_id, branch_id, name),
  UNIQUE (organization_id, branch_id, lane)
);

CREATE TABLE IF NOT EXISTS church_settings (
  id text PRIMARY KEY,
  organization_id text NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  church_name text NOT NULL,
  campus_name text,
  support_email text,
  support_phone text,
  timezone text NOT NULL,
  intake_confirmation_text text NOT NULL,
  emergency_banner text NOT NULL,
  plan_name text NOT NULL,
  billing_contact_email text,
  monthly_seat_allowance text,
  next_renewal_date timestamptz,
  backup_expectation text,
  email_delivery_mode text NOT NULL DEFAULT 'log-only',
  email_provider text NOT NULL DEFAULT 'resend',
  email_from_name text,
  email_from_address text,
  email_reply_to text,
  email_subject_prefix text,
  message_delivery_mode text NOT NULL DEFAULT 'log-only',
  message_provider text NOT NULL DEFAULT 'twilio',
  sms_from_number text,
  whatsapp_from_number text,
  notification_channels_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS branch_settings (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  support_email text,
  support_phone text,
  intake_confirmation_text text,
  emergency_banner text,
  public_intro text,
  follow_up_guidance text,
  email_from_name text,
  email_from_address text,
  email_reply_to text,
  sms_from_number text,
  whatsapp_from_number text,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_requests (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  email text NOT NULL,
  requester_name text,
  note text,
  status text NOT NULL,
  requested_at timestamptz NOT NULL,
  handled_at timestamptz,
  handled_by text,
  resolution_note text
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  requested_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE TABLE IF NOT EXISTS auth_invites (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text NOT NULL,
  title text,
  access_scope text NOT NULL DEFAULT 'branch',
  managed_branch_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  lane text,
  volunteer_name text,
  token_hash text NOT NULL UNIQUE,
  invited_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE TABLE IF NOT EXISTS session_revocations (
  session_id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  revoked_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  recipient_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  href text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  read_at timestamptz
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  template_key text NOT NULL,
  purpose text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  text_body text NOT NULL,
  html_body text NOT NULL,
  status text NOT NULL,
  provider text NOT NULL,
  provider_message_id text,
  provider_response_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL,
  attempted_at timestamptz,
  sent_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS message_outbox (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  channel text NOT NULL,
  template_key text NOT NULL,
  purpose text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  body text NOT NULL,
  status text NOT NULL,
  provider text NOT NULL,
  provider_message_id text,
  provider_response_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL,
  attempted_at timestamptz,
  sent_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS household_attachments (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  household_slug text NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
  request_id text REFERENCES requests(id) ON DELETE SET NULL,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  storage_backend text NOT NULL DEFAULT 'local',
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  purpose text NOT NULL,
  visibility text NOT NULL DEFAULT 'branch-staff',
  uploaded_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_name text NOT NULL,
  uploaded_by_role text NOT NULL,
  created_at timestamptz NOT NULL
);

ALTER TABLE household_attachments
  ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'local';

CREATE TABLE IF NOT EXISTS member_transfers (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  household_slug text NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
  from_branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  to_branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  requested_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name text NOT NULL,
  requested_by_role text NOT NULL,
  status text NOT NULL,
  reason text NOT NULL,
  note text,
  requested_at timestamptz NOT NULL,
  reviewed_at timestamptz,
  reviewed_by text,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS new_member_journeys (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_email text,
  member_phone text,
  gender text NOT NULL DEFAULT 'unspecified',
  birthday text,
  status text NOT NULL DEFAULT 'active',
  stage text NOT NULL DEFAULT 'day_0',
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_contact_at timestamptz,
  contact_count integer NOT NULL DEFAULT 0,
  touchpoints_sent_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_volunteer_id text,
  assigned_volunteer_name text,
  notes text,
  sunday_attendance_count integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  dropped_at timestamptz,
  drop_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journey_contacts (
  id text PRIMARY KEY,
  journey_id text NOT NULL REFERENCES new_member_journeys(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  contacted_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  contacted_by_name text NOT NULL,
  contact_method text NOT NULL DEFAULT 'call',
  outcome text NOT NULL DEFAULT 'reached',
  notes text,
  contacted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_schedules (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_name text NOT NULL DEFAULT 'Sunday Service',
  day_of_week integer NOT NULL DEFAULT 0,
  service_time text NOT NULL DEFAULT '09:00',
  location text,
  address text,
  reminder_thursday boolean NOT NULL DEFAULT true,
  reminder_saturday boolean NOT NULL DEFAULT true,
  reminder_sunday_morning boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, branch_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id text PRIMARY KEY,
  organization_id text REFERENCES organizations(id) ON DELETE SET NULL,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  queue text NOT NULL,
  type text NOT NULL,
  payload_json jsonb NOT NULL,
  status text NOT NULL,
  run_after timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS members (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  household_id text REFERENCES households(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  gender text,
  birthdate date,
  marital_status text,
  member_type text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_profiles (
  id text PRIMARY KEY,
  member_id text NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  salvation_date date,
  baptism_date date,
  small_group text,
  last_contact_at timestamptz,
  notes_summary text
);

CREATE TABLE IF NOT EXISTS member_events (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL
);

CREATE TABLE IF NOT EXISTS member_tags (
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tag_id text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, tag_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  group_type text NOT NULL,
  leader_user_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_memberships (
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, member_id)
);

CREATE TABLE IF NOT EXISTS services (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  service_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_events (
  id text PRIMARY KEY,
  service_id text NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  mode text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funds (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  code text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fund_id text REFERENCES funds(id) ON DELETE SET NULL,
  memo text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  posted_by_name text,
  voided_at timestamptz,
  void_reason text
);

CREATE TABLE IF NOT EXISTS ledger_lines (
  id text PRIMARY KEY,
  transaction_id text NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id text NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
  debit numeric(12,2) NOT NULL DEFAULT 0,
  credit numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pledges (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id text REFERENCES members(id) ON DELETE SET NULL,
  fund_id text REFERENCES funds(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS discipleship_records (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  household_id text REFERENCES households(id) ON DELETE CASCADE,
  household_slug text NOT NULL REFERENCES households(slug) ON DELETE CASCADE,
  household_name text NOT NULL,
  stage text NOT NULL DEFAULT 'new_believer',
  pathway text NOT NULL DEFAULT 'standard',
  assigned_leader_id text REFERENCES users(id) ON DELETE SET NULL,
  assigned_leader_name text,
  small_group_connected boolean NOT NULL DEFAULT false,
  attending_regularly boolean NOT NULL DEFAULT false,
  serving boolean NOT NULL DEFAULT false,
  baptized boolean NOT NULL DEFAULT false,
  foundation_class boolean NOT NULL DEFAULT false,
  mentoring_others boolean NOT NULL DEFAULT false,
  next_step text,
  notes text,
  last_updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS volunteer_applications (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text NOT NULL,
  areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_notes_household_slug
  ON household_notes (household_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_household_slug
  ON requests (household_slug);
CREATE INDEX IF NOT EXISTS idx_requests_status_due
  ON requests (status, due_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_tracking_code
  ON requests (tracking_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_status
  ON recovery_requests (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry
  ON password_reset_tokens (expires_at, consumed_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
  ON notifications (recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created
  ON email_outbox (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_recipient_created
  ON email_outbox (recipient_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_outbox_status_created
  ON message_outbox (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_outbox_recipient_created
  ON message_outbox (recipient_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regions_org_active
  ON regions (organization_id, active, name);
CREATE INDEX IF NOT EXISTS idx_branches_org_region
  ON branches (organization_id, region_id, active, name);
CREATE INDEX IF NOT EXISTS idx_branch_settings_branch
  ON branch_settings (organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_auth_invites_email
  ON auth_invites (email, expires_at, consumed_at);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user
  ON auth_challenges (user_id, expires_at, consumed_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_challenges_token_hash
  ON auth_challenges (token_hash);
CREATE INDEX IF NOT EXISTS idx_session_revocations_expires
  ON session_revocations (expires_at);
CREATE INDEX IF NOT EXISTS idx_household_attachments_household
  ON household_attachments (household_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_transfers_scope
  ON member_transfers (organization_id, from_branch_id, to_branch_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_journeys_scope
  ON new_member_journeys (organization_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_journeys_scope_stage
  ON new_member_journeys (organization_id, branch_id, stage);
CREATE INDEX IF NOT EXISTS idx_journey_contacts_journey
  ON journey_contacts (journey_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after
  ON jobs (status, run_after, queue);
CREATE INDEX IF NOT EXISTS idx_members_scope
  ON members (organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_discipleship_org_branch
  ON discipleship_records (organization_id, branch_id, stage);
CREATE INDEX IF NOT EXISTS idx_volunteer_apps_scope
  ON volunteer_applications (organization_id, branch_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_events_member
  ON member_events (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_service_member
  ON attendance_events (service_id, member_id);
CREATE INDEX IF NOT EXISTS idx_ledger_lines_tx
  ON ledger_lines (transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_org_posted_at
  ON ledger_transactions (organization_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action
  ON audit_logs (organization_id, action, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_funds_org_code
  ON funds (organization_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_accounts_org_code
  ON ledger_accounts (organization_id, code);
CREATE INDEX IF NOT EXISTS idx_organizations_active_slug
  ON organizations (active, slug);
CREATE INDEX IF NOT EXISTS idx_branches_org_active_name
  ON branches (organization_id, active, name);
CREATE INDEX IF NOT EXISTS idx_households_scope
  ON households (organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_households_scope_touchpoint
  ON households (organization_id, branch_id, next_touchpoint);
CREATE INDEX IF NOT EXISTS idx_requests_scope
  ON requests (organization_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_scope_due
  ON requests (organization_id, branch_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_requests_scope_next_contact
  ON requests (organization_id, branch_id, next_contact_due);
CREATE INDEX IF NOT EXISTS idx_users_scope
  ON users (organization_id, branch_id, role);
CREATE INDEX IF NOT EXISTS idx_users_org_role_active
  ON users (organization_id, role, active);
CREATE INDEX IF NOT EXISTS idx_teams_scope
  ON teams (organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_scope
  ON audit_logs (organization_id, branch_id, created_at DESC);
