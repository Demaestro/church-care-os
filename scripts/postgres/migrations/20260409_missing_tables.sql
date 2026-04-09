-- Missing tables migration: discipleship_records + volunteer_applications
-- These tables are referenced throughout the codebase but were absent from the schema.

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

CREATE INDEX IF NOT EXISTS idx_discipleship_org_branch
  ON discipleship_records (organization_id, branch_id, stage);

CREATE INDEX IF NOT EXISTS idx_volunteer_apps_scope
  ON volunteer_applications (organization_id, branch_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteer_apps_user_pending
  ON volunteer_applications (organization_id, branch_id, user_id)
  WHERE status = 'pending';
