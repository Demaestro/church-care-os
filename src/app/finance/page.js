import { requireCurrentUser } from "@/lib/auth";
import { listFunds, listLedgerAccounts, listLedgerTransactions, recordLedgerTransaction } from "@/lib/finance-store";
import { createFund, createLedgerAccount } from "@/app/actions";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const user = await requireCurrentUser(["pastor", "owner"]);
  const funds = listFunds({ organizationId: user.organizationId });
  const accounts = listLedgerAccounts({ organizationId: user.organizationId });
  const transactions = listLedgerTransactions({ organizationId: user.organizationId, limit: 10 });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Fund Accounting
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-foreground">Finance</h1>
        <p className="mt-2 text-sm text-muted">
          Manage funds, ledger accounts, and reconciled transactions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={createFund} className="rounded-[1.5rem] border border-line bg-paper p-6">
          <p className="text-sm font-semibold text-foreground">Create fund</p>
          <div className="mt-4 grid gap-3">
            <input
              name="name"
              placeholder="Building Fund"
              className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
            />
            <input
              name="code"
              placeholder="BUILD"
              className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground uppercase outline-none focus:border-moss"
            />
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
            >
              Add fund
            </button>
          </div>
        </form>

        <form action={createLedgerAccount} className="rounded-[1.5rem] border border-line bg-paper p-6">
          <p className="text-sm font-semibold text-foreground">Create ledger account</p>
          <div className="mt-4 grid gap-3">
            <input
              name="name"
              placeholder="Tithes Income"
              className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
            />
            <input
              name="code"
              placeholder="IN-100"
              className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground uppercase outline-none focus:border-moss"
            />
            <select
              name="type"
              className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
            >
              <option value="">Select type</option>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="equity">Equity</option>
            </select>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
            >
              Add account
            </button>
          </div>
        </form>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-line bg-paper p-6">
          <p className="text-sm font-semibold text-foreground">Active funds</p>
          {funds.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No funds yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {funds.map((fund) => (
                <li key={fund.id} className="flex items-center justify-between">
                  <span>{fund.name}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">
                    {fund.code}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-line bg-paper p-6">
          <p className="text-sm font-semibold text-foreground">Ledger accounts</p>
          {accounts.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No ledger accounts yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between">
                  <span>{account.name}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">
                    {account.code}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-10 rounded-[1.5rem] border border-line bg-paper p-6">
        <p className="text-sm font-semibold text-foreground">Recent transactions</p>
        {transactions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No transactions yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between">
                <span>{tx.memo || "Ledger entry"}</span>
                <span>{String(tx.posted_at || "").slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        action={async (formData) => {
          "use server";
          const memo = String(formData.get("memo") || "").trim();
          const accountId = String(formData.get("accountId") || "");
          const amount = Number(formData.get("amount") || 0);
          if (!memo || !accountId || amount <= 0) {
            return;
          }
          recordLedgerTransaction({
            organizationId: user.organizationId,
            fundId: null,
            memo,
            lines: [
              { accountId, debit: amount, credit: 0 },
              { accountId, debit: 0, credit: amount },
            ],
          });
        }}
        className="mt-10 rounded-[1.5rem] border border-line bg-paper p-6"
      >
        <p className="text-sm font-semibold text-foreground">Quick ledger entry (demo)</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            name="memo"
            placeholder="Offering entry"
            className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          />
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          />
          <select
            name="accountId"
            className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-muted">
          Demo entry posts a balanced transaction to a single account for now.
        </p>
      </form>
    </div>
  );
}
