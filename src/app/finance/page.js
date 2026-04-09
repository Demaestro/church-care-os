import {
  createFund,
  createLedgerAccount,
  createPledge,
  recordJournalEntry,
} from "@/app/actions";
import { requireCurrentUser } from "@/lib/auth";
import {
  getFundActivitySummary,
  getTrialBalance,
  listFunds,
  listLedgerAccounts,
  listLedgerTransactions,
  listPledges,
} from "@/lib/finance-store";
import { listMembers } from "@/lib/member-store";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const user = await requireCurrentUser(["pastor", "owner"]);
  const funds = listFunds({ organizationId: user.organizationId });
  const accounts = listLedgerAccounts({ organizationId: user.organizationId });
  const transactions = listLedgerTransactions({
    organizationId: user.organizationId,
    limit: 12,
  });
  const pledges = listPledges({ organizationId: user.organizationId, limit: 12 });
  const members = listMembers({
    organizationId: user.organizationId,
    branchId: user.branchId,
    limit: 200,
  });
  const trialBalance = getTrialBalance({ organizationId: user.organizationId });
  const fundSummary = getFundActivitySummary({ organizationId: user.organizationId });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Fund Accounting
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">Finance</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
            This workspace is designed for a real accounting session: create funds, maintain
            ledger accounts, post balanced journals, watch the trial balance, and track
            member pledges without leaving the same screen.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Funds"
          value={funds.length}
          detail="Named giving buckets ready for routing"
        />
        <MetricCard
          label="Ledger accounts"
          value={accounts.length}
          detail="Double-entry accounts available for posting"
        />
        <MetricCard
          label="Active pledges"
          value={pledges.filter((pledge) => pledge.status === "active").length}
          detail="Open financial commitments"
        />
        <MetricCard
          label="Trial balance"
          value={trialBalance.balanced ? "OK" : "Check"}
          detail={trialBalance.balanced ? "Debits and credits match" : "Posting review required"}
          tone={trialBalance.balanced ? "calm" : "alert"}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="space-y-6">
          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <p className="text-sm font-semibold text-foreground">Create fund</p>
            <form action={createFund} className="mt-4 grid gap-3">
              <input
                name="name"
                placeholder="Building Fund"
                className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
              <input
                name="code"
                placeholder="BUILD"
                className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm uppercase text-foreground outline-none focus:border-moss"
              />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                Add fund
              </button>
            </form>
          </article>

          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <p className="text-sm font-semibold text-foreground">Create ledger account</p>
            <form action={createLedgerAccount} className="mt-4 grid gap-3">
              <input
                name="name"
                placeholder="Tithes Income"
                className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
              <input
                name="code"
                placeholder="IN-100"
                className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm uppercase text-foreground outline-none focus:border-moss"
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
            </form>
          </article>

          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Accounting session tools</p>
              <span className="text-xs uppercase tracking-[0.16em] text-muted">Session-ready</span>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>Fund routing keeps journals tied to the right giving bucket.</li>
              <li>Trial balance highlights whether posting stayed balanced.</li>
              <li>Pledges let finance track campaign commitments over time.</li>
              <li>Recent journals make same-session review faster for the treasurer.</li>
            </ul>
          </article>
        </section>

        <section className="space-y-6">
          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Post journal entry</p>
                <p className="mt-1 text-sm text-muted">
                  Post a balanced entry with explicit debit and credit lines.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                4-line journal
              </span>
            </div>

            <form action={recordJournalEntry} className="mt-5 space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_14rem_14rem]">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Memo</span>
                  <input
                    name="memo"
                    placeholder="Sunday welfare disbursement"
                    className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Fund</span>
                  <select
                    name="fundId"
                    className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  >
                    <option value="">No fund routing</option>
                    {funds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {fund.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Posting date</span>
                  <input
                    type="date"
                    name="postedAt"
                    className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  />
                </label>
              </div>

              <div className="overflow-hidden rounded-[1.2rem] border border-line">
                <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>Account</span>
                  <span>Debit</span>
                  <span>Credit</span>
                </div>
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1.6fr_0.7fr_0.7fr] gap-3 border-t border-line px-4 py-3"
                  >
                    <select
                      name={`accountId_${index}`}
                      className="rounded-[0.95rem] border border-line bg-paper px-3 py-2 text-sm text-foreground outline-none focus:border-moss"
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </select>
                    <input
                      name={`debit_${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="rounded-[0.95rem] border border-line bg-paper px-3 py-2 text-sm text-foreground outline-none focus:border-moss"
                    />
                    <input
                      name={`credit_${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="rounded-[0.95rem] border border-line bg-paper px-3 py-2 text-sm text-foreground outline-none focus:border-moss"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                Post journal entry
              </button>
            </form>
          </article>

          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Pledge tracker</p>
                <p className="mt-1 text-sm text-muted">
                  Record campaign promises and giving commitments against a fund.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                {pledges.length} pledge{pledges.length === 1 ? "" : "s"}
              </span>
            </div>

            <form action={createPledge} className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Member</span>
                <select
                  name="memberId"
                  className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                >
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Fund</span>
                <select
                  name="fundId"
                  className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                >
                  <option value="">Select fund</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Amount</span>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50000"
                  className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Start</span>
                  <input
                    type="date"
                    name="startDate"
                    className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">End</span>
                  <input
                    type="date"
                    name="endDate"
                    className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  />
                </label>
              </div>
              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
                >
                  Create pledge
                </button>
              </div>
            </form>

            {pledges.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-[1.15rem] border border-line">
                <div className="grid grid-cols-[1.3fr_1fr_0.8fr_0.9fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>Member</span>
                  <span>Fund</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {pledges.map((pledge) => (
                  <div
                    key={pledge.id}
                    className="grid grid-cols-[1.3fr_1fr_0.8fr_0.9fr] gap-3 border-t border-line px-4 py-3 text-sm text-muted"
                  >
                    <span>{pledge.member_name || "Member"}</span>
                    <span>{pledge.fund_name || "Fund"}</span>
                    <span>{formatMoney(pledge.amount)}</span>
                    <span className="uppercase tracking-[0.12em]">{pledge.status}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Fund routing summary</p>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {fundSummary.length} fund{fundSummary.length === 1 ? "" : "s"}
            </span>
          </div>
          {fundSummary.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No fund activity yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {fundSummary.map((fund) => (
                <div
                  key={fund.id}
                  className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-foreground">{fund.name}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-muted">
                      {fund.transaction_count} tx
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Debits {formatMoney(fund.total_debit)} · Credits {formatMoney(fund.total_credit)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Trial balance</p>
              <p className="mt-1 text-sm text-muted">
                A fast confidence check for the current accounting session.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                trialBalance.balanced
                  ? "border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                  : "border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.06)] text-clay"
              }`}
            >
              {trialBalance.balanced ? "Balanced" : "Out of balance"}
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-line">
            <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              <span>Account</span>
              <span>Debit</span>
              <span>Credit</span>
              <span>Balance</span>
            </div>
            {trialBalance.accounts.length === 0 ? (
              <div className="px-4 py-4 text-sm text-muted">No ledger activity yet.</div>
            ) : (
              trialBalance.accounts.map((account) => (
                <div
                  key={account.id}
                  className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-3 border-t border-line px-4 py-3 text-sm text-muted"
                >
                  <span>{account.code} · {account.name}</span>
                  <span>{formatMoney(account.total_debit)}</span>
                  <span>{formatMoney(account.total_credit)}</span>
                  <span>{formatMoney(account.balance)}</span>
                </div>
              ))
            )}
            <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-3 border-t border-line bg-canvas px-4 py-3 text-sm font-semibold text-foreground">
              <span>Total</span>
              <span>{formatMoney(trialBalance.totalDebit)}</span>
              <span>{formatMoney(trialBalance.totalCredit)}</span>
              <span>{formatMoney(trialBalance.totalDebit - trialBalance.totalCredit)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[1.6rem] border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Recent journal activity</p>
          <span className="text-xs uppercase tracking-[0.16em] text-muted">
            {transactions.length} recent
          </span>
        </div>
        {transactions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No transactions yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col gap-2 rounded-[1.1rem] border border-line bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{tx.memo || "Ledger entry"}</p>
                  <p className="mt-1 text-xs text-muted">
                    {tx.fund_name ? `${tx.fund_name} · ` : ""}
                    {String(tx.posted_at || "").replace("T", " ").slice(0, 16)}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  Journal
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "standard" }) {
  const toneClass =
    tone === "alert"
      ? "text-clay"
      : tone === "calm"
        ? "text-moss"
        : "text-foreground";

  return (
    <article className="rounded-[1.4rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-3 text-4xl tracking-[-0.04em] [font-family:var(--font-display)] ${toneClass}`}>
        {value}
      </p>
      <p className="mt-3 text-sm text-muted">{detail}</p>
    </article>
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
