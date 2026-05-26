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

export function getFundById(fundId, { organizationId } = {}) {
  if (!fundId) {
    return null;
  }

  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, organization_id, name, code
    FROM funds
    WHERE id = ?
      AND (? IS NULL OR organization_id = ?)
    LIMIT 1
  `).get(fundId, organizationId || null, organizationId || null);

  return row || null;
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

export function getLedgerAccountById(accountId, { organizationId } = {}) {
  if (!accountId) {
    return null;
  }

  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, organization_id, name, type, code
    FROM ledger_accounts
    WHERE id = ?
      AND (? IS NULL OR organization_id = ?)
    LIMIT 1
  `).get(accountId, organizationId || null, organizationId || null);

  return row || null;
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
    input.code.trim().toUpperCase()
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
    input.code.trim().toUpperCase()
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
  const normalizedLines = (input.lines || []).map((line) => ({
    accountId: line.accountId,
    debit: Number(line.debit || 0),
    credit: Number(line.credit || 0),
  }));
  const totalDebit = normalizedLines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = normalizedLines.reduce((sum, line) => sum + line.credit, 0);
  const roundedDebit = Number(totalDebit.toFixed(2));
  const roundedCredit = Number(totalCredit.toFixed(2));

  if (normalizedLines.length < 2) {
    throw new Error("Ledger transaction needs at least two lines.");
  }

  if (normalizedLines.some((line) => !line.accountId)) {
    throw new Error("Every ledger line needs an account.");
  }

  if (normalizedLines.some((line) => line.debit > 0 && line.credit > 0)) {
    throw new Error("A ledger line cannot contain both a debit and a credit.");
  }

  if (normalizedLines.some((line) => line.debit < 0 || line.credit < 0)) {
    throw new Error("Ledger amounts cannot be negative.");
  }

  if (roundedDebit !== roundedCredit) {
    throw new Error("Ledger transaction must balance.");
  }

  return withTransaction((db) => {
    const transactionId = randomUUID();
    db.prepare(`
      INSERT INTO ledger_transactions (id, organization_id, fund_id, memo, posted_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      transactionId,
      input.organizationId || null,
      input.fundId || null,
      input.memo || null,
      input.postedAt || new Date().toISOString()
    );

    for (const line of normalizedLines) {
      db.prepare(`
        INSERT INTO ledger_lines (id, transaction_id, account_id, debit, credit)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        transactionId,
        line.accountId,
        line.debit,
        line.credit
      );
    }

    return transactionId;
  });
}
