-- Finance Audit Capability Migration
-- Adds poster attribution, void support, and performance indexes
-- for the new Audit & Reconciliation section on the Finance page.

-- 1. Poster attribution on ledger_transactions
--    Every journal entry now records who posted it, not just the audit_log event.
ALTER TABLE ledger_transactions
  ADD COLUMN IF NOT EXISTS posted_by_user_id text REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ledger_transactions
  ADD COLUMN IF NOT EXISTS posted_by_name text;

-- 2. Void/reversal support
--    Sets a soft-delete path for incorrect entries without destroying history.
ALTER TABLE ledger_transactions
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

ALTER TABLE ledger_transactions
  ADD COLUMN IF NOT EXISTS void_reason text;

-- 3. Performance indexes for audit queries
--    Supports "finance.*" LIKE prefix scan on audit_logs.
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action
  ON audit_logs (organization_id, action, created_at DESC);

--    Supports period-bounded trial balance queries on ledger_transactions.
CREATE INDEX IF NOT EXISTS idx_ledger_tx_org_posted_at
  ON ledger_transactions (organization_id, posted_at DESC);

-- 4. Fix multi-tenancy bug: fund codes and account codes must be unique per org,
--    not globally. The global UNIQUE on the column definition remains for
--    backward-compat; these partial indexes enforce the correct per-org constraint
--    and will be used by the query planner going forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_funds_org_code
  ON funds (organization_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_accounts_org_code
  ON ledger_accounts (organization_id, code);
