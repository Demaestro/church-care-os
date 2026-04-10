import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase, withTransaction } from "@/lib/database";

export function listFunds({ organizationId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, organization_id, name, code
    FROM funds
    WHERE (? IS NULL OR organization_id = ?)
    ORDER BY name
  `).all(organizationId || null, organizationId || null);
  return rows || [];
}

export function listLedgerAccounts({ organizationId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, organization_id, name, type, code
    FROM ledger_accounts
    WHERE (? IS NULL OR organization_id = ?)
    ORDER BY code
  `).all(organizationId || null, organizationId || null);
  return rows || [];
}

export function listLedgerTransactions({ organizationId, limit = 50 } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT t.id, t.organization_id, t.fund_id, t.memo, t.posted_at, f.name AS fund_name
    FROM ledger_transactions t
    LEFT JOIN funds f ON f.id = t.fund_id
    WHERE (? IS NULL OR t.organization_id = ?)
    ORDER BY t.posted_at DESC
    LIMIT ?
  `).all(organizationId || null, organizationId || null, limit);
  return rows || [];
}

export function listPledges({ organizationId, limit = 100 } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT p.id, p.organization_id, p.member_id, p.fund_id, p.amount, p.start_date, p.end_date, p.status,
           m.full_name AS member_name, f.name AS fund_name
    FROM pledges p
    LEFT JOIN members m ON m.id = p.member_id
    LEFT JOIN funds f ON f.id = p.fund_id
    WHERE (? IS NULL OR p.organization_id = ?)
    ORDER BY p.start_date DESC, p.id DESC
    LIMIT ?
  `).all(organizationId || null, organizationId || null, limit);
  return rows || [];
}

export function getTrialBalance({ organizationId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      a.id,
      a.name,
      a.code,
      a.type,
      COALESCE(SUM(l.debit), 0) AS total_debit,
      COALESCE(SUM(l.credit), 0) AS total_credit
    FROM ledger_accounts a
    LEFT JOIN ledger_lines l ON l.account_id = a.id
    LEFT JOIN ledger_transactions t ON t.id = l.transaction_id
    WHERE (? IS NULL OR a.organization_id = ?)
      AND (? IS NULL OR t.organization_id = ? OR t.organization_id IS NULL)
    GROUP BY a.id
    ORDER BY a.code
  `).all(
    organizationId || null,
    organizationId || null,
    organizationId || null,
    organizationId || null
  );

  const accounts = (rows || []).map((row) => ({
    ...row,
    total_debit: Number(row.total_debit || 0),
    total_credit: Number(row.total_credit || 0),
    balance: Number(row.total_debit || 0) - Number(row.total_credit || 0),
  }));

  const totals = accounts.reduce(
    (summary, account) => ({
      totalDebit: summary.totalDebit + account.total_debit,
      totalCredit: summary.totalCredit + account.total_credit,
    }),
    { totalDebit: 0, totalCredit: 0 }
  );

  return {
    accounts,
    totalDebit: totals.totalDebit,
    totalCredit: totals.totalCredit,
    balanced: Number(totals.totalDebit.toFixed(2)) === Number(totals.totalCredit.toFixed(2)),
  };
}

export function getFundActivitySummary({ organizationId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      f.id,
      f.name,
      f.code,
      COUNT(DISTINCT t.id) AS transaction_count,
      COALESCE(SUM(l.debit), 0) AS total_debit,
      COALESCE(SUM(l.credit), 0) AS total_credit
    FROM funds f
    LEFT JOIN ledger_transactions t ON t.fund_id = f.id
    LEFT JOIN ledger_lines l ON l.transaction_id = t.id
    WHERE (? IS NULL OR f.organization_id = ?)
    GROUP BY f.id
    ORDER BY f.name
  `).all(organizationId || null, organizationId || null);

  return (rows || []).map((row) => ({
    ...row,
    transaction_count: Number(row.transaction_count || 0),
    total_debit: Number(row.total_debit || 0),
    total_credit: Number(row.total_credit || 0),
  }));
}

export function createFundEntry(input) {
  const db = getDatabase();
  const fundId = randomUUID();
  db.prepare(`
    INSERT INTO funds (id, organization_id, name, code)
    VALUES (?, ?, ?, ?)
  `).run(
    fundId,
    input.organizationId || null,
    input.name,
    input.code.toUpperCase()
  );
  return fundId;
}

export function createLedgerAccountEntry(input) {
  const db = getDatabase();
  const accountId = randomUUID();
  db.prepare(`
    INSERT INTO ledger_accounts (id, organization_id, name, type, code)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    accountId,
    input.organizationId || null,
    input.name,
    input.type,
    input.code.toUpperCase()
  );
  return accountId;
}

export function createPledgeEntry(input) {
  const db = getDatabase();
  const pledgeId = randomUUID();
  db.prepare(`
    INSERT INTO pledges (
      id, organization_id, member_id, fund_id, amount, start_date, end_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pledgeId,
    input.organizationId || null,
    input.memberId || null,
    input.fundId || null,
    Number(input.amount || 0),
    input.startDate || null,
    input.endDate || null,
    input.status || "active"
  );
  return pledgeId;
}

export function recordLedgerTransaction(input) {
  const totalDebit  = input.lines.reduce((sum, line) => sum + Number(line.debit  || 0), 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const roundedDebit  = Number(totalDebit.toFixed(2));
  const roundedCredit = Number(totalCredit.toFixed(2));

  if (roundedDebit !== roundedCredit) {
    throw new Error("Ledger transaction must balance.");
  }

  const transactionId = randomUUID();

  // Wrap the header + all line inserts in a single atomic transaction so a
  // partial failure cannot leave an unbalanced ledger_transactions row behind.
  withTransaction((db) => {
    db.prepare(`
      INSERT INTO ledger_transactions
        (id, organization_id, fund_id, memo, posted_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      transactionId,
      input.organizationId || null,
      input.fundId || null,
      input.memo || null,
      input.postedAt || new Date().toISOString()
    );

    for (const line of input.lines) {
      db.prepare(`
        INSERT INTO ledger_lines (id, transaction_id, account_id, debit, credit)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        transactionId,
        line.accountId,
        Number(line.debit  || 0),
        Number(line.credit || 0)
      );
    }
  });

  return transactionId;
}

// -- Audit & Reconciliation queries -------------------------------------------

export function getTrialBalanceForPeriod({ organizationId, fromDate, toDate } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      a.id,
      a.name,
      a.code,
      a.type,
      COALESCE(SUM(l.debit), 0)  AS total_debit,
      COALESCE(SUM(l.credit), 0) AS total_credit
    FROM ledger_accounts a
    LEFT JOIN ledger_lines l ON l.account_id = a.id
    LEFT JOIN ledger_transactions t ON t.id = l.transaction_id
    WHERE (? IS NULL OR a.organization_id = ?)
      AND (t.id IS NULL OR (
        (? IS NULL OR t.posted_at >= ?) AND
        (? IS NULL OR t.posted_at <= ?)
      ))
    GROUP BY a.id
    ORDER BY a.code
  `).all(
    organizationId || null, organizationId || null,
    fromDate || null, fromDate ? fromDate + "T00:00:00" : null,
    toDate || null, toDate ? toDate + "T23:59:59" : null
  );

  const accounts = (rows || []).map((row) => ({
    ...row,
    total_debit: Number(row.total_debit || 0),
    total_credit: Number(row.total_credit || 0),
    balance: Number(row.total_debit || 0) - Number(row.total_credit || 0),
  }));

  const totals = accounts.reduce(
    (sum, a) => ({ totalDebit: sum.totalDebit + a.total_debit, totalCredit: sum.totalCredit + a.total_credit }),
    { totalDebit: 0, totalCredit: 0 }
  );

  return {
    accounts,
    totalDebit: totals.totalDebit,
    totalCredit: totals.totalCredit,
    balanced: Number(totals.totalDebit.toFixed(2)) === Number(totals.totalCredit.toFixed(2)),
    fromDate: fromDate || null,
    toDate: toDate || null,
  };
}

export function getLedgerTransactionsForPeriod({ organizationId, fromDate, toDate, limit = 60 } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      t.id,
      t.memo,
      t.posted_at,
      f.name AS fund_name,
      COALESCE(SUM(l.debit), 0)  AS total_debit,
      COALESCE(SUM(l.credit), 0) AS total_credit
    FROM ledger_transactions t
    LEFT JOIN funds f ON f.id = t.fund_id
    LEFT JOIN ledger_lines l ON l.transaction_id = t.id
    WHERE (? IS NULL OR t.organization_id = ?)
      AND (? IS NULL OR t.posted_at >= ?)
      AND (? IS NULL OR t.posted_at <= ?)
    GROUP BY t.id
    ORDER BY t.posted_at DESC
    LIMIT ?
  `).all(
    organizationId || null, organizationId || null,
    fromDate || null, fromDate ? fromDate + "T00:00:00" : null,
    toDate || null, toDate ? toDate + "T23:59:59" : null,
    limit
  );

  return (rows || []).map((row) => ({
    ...row,
    total_debit: Number(row.total_debit || 0),
    total_credit: Number(row.total_credit || 0),
    postedLabel: String(row.posted_at || "").replace("T", " ").slice(0, 16),
  }));
}

export function getFinanceAuditEntries({ organizationId, limit = 40 } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, created_at, actor_name, actor_role, action, target_type, target_id, summary
    FROM audit_logs
    WHERE (? IS NULL OR organization_id = ?)
      AND action LIKE 'finance.%'
    ORDER BY created_at DESC
    LIMIT ?
  `).all(organizationId || null, organizationId || null, limit);

  return (rows || []).map((row) => ({
    ...row,
    createdLabel: String(row.created_at || "").replace("T", " ").slice(0, 16),
  }));
}

export function detectFinancialAnomalies({ organizationId } = {}) {
  const db = getDatabase();

  // Entries with no memo — cannot be explained in a formal audit
  const noMemo = db.prepare(`
    SELECT
      t.id,
      t.posted_at,
      COALESCE(SUM(l.debit), 0) AS total_amount
    FROM ledger_transactions t
    LEFT JOIN ledger_lines l ON l.transaction_id = t.id
    WHERE (? IS NULL OR t.organization_id = ?)
      AND (t.memo IS NULL OR t.memo = '')
    GROUP BY t.id
    ORDER BY t.posted_at DESC
    LIMIT 10
  `).all(organizationId || null, organizationId || null);

  // Top 5 largest transactions by debit volume — high-value items warrant review
  const largeTransactions = db.prepare(`
    SELECT
      t.id,
      t.memo,
      t.posted_at,
      f.name AS fund_name,
      COALESCE(SUM(l.debit), 0) AS total_amount
    FROM ledger_transactions t
    LEFT JOIN ledger_lines l ON l.transaction_id = t.id
    LEFT JOIN funds f ON f.id = t.fund_id
    WHERE (? IS NULL OR t.organization_id = ?)
    GROUP BY t.id
    ORDER BY total_amount DESC
    LIMIT 5
  `).all(organizationId || null, organizationId || null);

  return {
    noMemoTransactions: (noMemo || []).map((r) => ({
      ...r,
      total_amount: Number(r.total_amount || 0),
      postedLabel: String(r.posted_at || "").replace("T", " ").slice(0, 16),
    })),
    largeTransactions: (largeTransactions || []).map((r) => ({
      ...r,
      total_amount: Number(r.total_amount || 0),
      postedLabel: String(r.posted_at || "").replace("T", " ").slice(0, 16),
    })),
  };
}

// ── Finance Chart Data ─────────────────────────────────────────────────────────

/**
 * 12-month giving pulse — total income credits per calendar month.
 * Returns array of { month: "Jan 25", income: 450000, expense: 210000 }
 * covering the last 12 full months, oldest first.
 */
export function getGivingPulse({ organizationId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', t.posted_at) AS ym,
      SUM(CASE WHEN a.type IN ('income') THEN l.credit ELSE 0 END) AS income,
      SUM(CASE WHEN a.type IN ('expense') THEN l.debit ELSE 0 END) AS expense
    FROM ledger_transactions t
    JOIN ledger_lines l ON l.transaction_id = t.id
    JOIN ledger_accounts a ON a.id = l.account_id
    WHERE (? IS NULL OR t.organization_id = ?)
      AND t.posted_at >= date('now', '-12 months')
    GROUP BY ym
    ORDER BY ym ASC
  `).all(organizationId || null, organizationId || null) || [];

  return rows.map(r => ({
    month:   r.ym,
    income:  Number(r.income  || 0),
    expense: Number(r.expense || 0),
  }));
}

/**
 * Fund distribution — total net credit balance per fund (for donut chart).
 */
export function getFundDistribution({ organizationId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      f.id,
      f.name,
      f.code,
      COALESCE(SUM(l.credit - l.debit), 0) AS balance
    FROM funds f
    LEFT JOIN ledger_transactions t ON t.fund_id = f.id
      AND (? IS NULL OR t.organization_id = ?)
    LEFT JOIN ledger_lines l ON l.transaction_id = t.id
    WHERE (? IS NULL OR f.organization_id = ?)
    GROUP BY f.id
    HAVING balance > 0
    ORDER BY balance DESC
    LIMIT 8
  `).all(organizationId || null, organizationId || null,
         organizationId || null, organizationId || null) || [];

  const total = rows.reduce((s, r) => s + Number(r.balance), 0);
  return rows.map(r => ({
    id:      r.id,
    name:    r.name,
    code:    r.code,
    balance: Number(r.balance),
    pct:     total > 0 ? Math.round((Number(r.balance) / total) * 100) : 0,
  }));
}

/**
 * List pending multi-sig finance approval requests for this org.
 */
export function listPendingApprovals({ organizationId } = {}) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM finance_approval_requests
    WHERE organization_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(organizationId || null) || [];

  return rows.map(r => ({
    id:               r.id,
    amount:           Number(r.amount),
    memo:             r.memo,
    fundId:           r.fund_id,
    requestedBy:      r.requested_by,
    requestedByName:  r.requested_by_name,
    createdAt:        r.created_at,
    approvals:        JSON.parse(r.approvals_json || "[]"),
    requiredApprovals: Number(r.required_approvals),
    linesJson:        r.lines_json,
  }));
}
