# Pristine Schema Blueprint (PostgreSQL)

This blueprint extends the current schema with a deeper member model, attendance, group structures, and fund accounting. It is additive and designed for phased cutover.

## Core Additions

- Members and member profiles separated from staff users
- Engagement timeline as a first-class ledger
- Dynamic grouping via tags and groups
- Attendance events across services and small groups
- Fund accounting with double-entry ledger

## Key Tables (Additive)

```sql
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
  posted_at timestamptz NOT NULL DEFAULT now()
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
```

## Indexing Guidance

- members by organization and branch
- member_events by member_id and created_at
- attendance_events by service_id and member_id
- ledger_lines by transaction_id

