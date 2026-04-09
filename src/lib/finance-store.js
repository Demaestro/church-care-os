import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";

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
    SELECT id, organization_id, fund_id, memo, posted_at
    FROM ledger_transactions
    WHERE (? IS NULL OR organization_id = ?)
    ORDER BY posted_at DESC
    LIMIT ?
  `).all(organizationId || null, organizationId || null, limit);
  return rows || [];
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

export function recordLedgerTransaction(input) {
  const db = getDatabase();
  const totalDebit = input.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

  if (totalDebit !== totalCredit) {
    throw new Error("Ledger transaction must balance.");
  }

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

  for (const line of input.lines) {
    db.prepare(`
      INSERT INTO ledger_lines (id, transaction_id, account_id, debit, credit)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      transactionId,
      line.accountId,
      Number(line.debit || 0),
      Number(line.credit || 0)
    );
  }

  return transactionId;
}

