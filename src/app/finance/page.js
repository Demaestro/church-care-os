import {
  createFund,
  createLedgerAccount,
  createPledge,
  recordJournalEntry,
} from "@/app/actions";
import AiChatPanel from "@/components/AiChatPanel";
import { requireCurrentUser } from "@/lib/auth";
import {
  detectFinancialAnomalies,
  getFinanceAuditEntries,
  getFundActivitySummary,
  getFundDistribution,
  getGivingPulse,
  getLedgerTransactionsForPeriod,
  getTrialBalance,
  getTrialBalanceForPeriod,
  listFunds,
  listLedgerAccounts,
  listPendingApprovals,
  listPledges,
} from "@/lib/finance-store";
import { listMembers } from "@/lib/member-store";
import {
  FundHealthDonut,
  GivingPulseHistogram,
  PendingApprovalsBanner,
} from "@/components/FinanceCharts";

export const metadata = { title: "Finance" };

export default async function FinancePage({ searchParams }) {
  const user = await requireCurrentUser(["pastor", "owner"]);
  const params = await searchParams;

  const fromDate = typeof params?.from === "string" ? params.from.trim() : "";
  const toDate = typeof params?.to === "string" ? params.to.trim() : "";
  const activeTab = typeof params?.tab === "string" ? params.tab : "journal";

  const funds = listFunds({ organizationId: user.organizationId });
  const accounts = listLedgerAccounts({ organizationId: user.organizationId });
  const pledges = listPledges({ organizationId: user.organizationId, limit: 12 });
  const members = listMembers({
    organizationId: user.organizationId,
    branchId: user.branchId,
    limit: 200,
  });
  const trialBalance = getTrialBalance({ organizationId: user.organizationId });
  const fundSummary = getFundActivitySummary({ organizationId: user.organizationId });
  const givingPulse = getGivingPulse({ organizationId: user.organizationId });
  const fundDistribution = getFundDistribution({ organizationId: user.organizationId });
  const pendingApprovals = listPendingApprovals({ organizationId: user.organizationId });

  // Audit section data
  const financeAuditEntries = getFinanceAuditEntries({ organizationId: user.organizationId });
  const anomalies = detectFinancialAnomalies({ organizationId: user.organizationId });
  const periodTrialBalance =
    fromDate || toDate
      ? getTrialBalanceForPeriod({ organizationId: user.organizationId, fromDate, toDate })
      : null;
  const periodTransactions = getLedgerTransactionsForPeriod({
    organizationId: user.organizationId,
    fromDate: fromDate || null,
    toDate: toDate || null,
    limit: 60,
  });

  const anomalyCount = anomalies.noMemoTransactions.length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Fund Accounting
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">Finance</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
            Maintain the ledger, post balanced journals, track pledges, and run
            reconciliation audits without leaving this workspace.
          </p>
        </div>
        {anomalyCount > 0 ? (
          <a
            href="/finance?tab=audit"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.06)] px-4 py-2 text-xs font-semibold text-clay transition hover:bg-[rgba(220,38,38,0.1)]"
          >
            {anomalyCount} anomaly flag{anomalyCount === 1 ? "" : "s"} — review audit
          </a>
        ) : null}
      </div>

      {/* ── Multi-sig pending approvals ───────────────────────────────────── */}
      <PendingApprovalsBanner approvals={pendingApprovals} currentUserId={user.id} />

      {/* ── Visual Intelligence Dashboard ─────────────────────────────────── */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Fund Health Donut */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Fund Health
          </p>
          <p className="mb-4 text-sm font-semibold text-foreground">Distribution by Fund</p>
          <FundHealthDonut funds={fundDistribution} />
        </div>

        {/* Giving Pulse — spans 2 cols on large screens */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 lg:col-span-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Giving Pulse
          </p>
          <p className="mb-4 text-sm font-semibold text-foreground">
            12-Month Income vs Expense
          </p>
          <GivingPulseHistogram data={givingPulse} />
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Funds" value={funds.length} detail="Named giving buckets" />
        <MetricCard
          label="Ledger accounts"
          value={accounts.length}
          detail="Chart of accounts"
        />
        <MetricCard
          label="Active pledges"
          value={pledges.filter((p) => p.status === "active").length}
          detail="Open financial commitments"
        />
        <MetricCard
          label="Trial balance"
          value={trialBalance.balanced ? "OK" : "Check"}
          detail={trialBalance.balanced ? "Debits and credits match" : "Posting review required"}
          tone={trialBalance.balanced ? "calm" : "alert"}
        />
      </div>

      {/* Tab bar */}
      <nav className="mt-8 flex gap-1 rounded-[1.2rem] border border-line bg-canvas p-1">
        {[
          { key: "journal", label: "Journal" },
          { key: "balances", label: "Trial Balance" },
          { key: "pledges", label: "Pledges" },
          {
            key: "audit",
            label: anomalyCount > 0 ? `Audit · ${anomalyCount}` : "Audit",
            alert: anomalyCount > 0,
          },
        ].map((tab) => (
          <a
            key={tab.key}
            href={`/finance?tab=${tab.key}`}
            className={`flex-1 rounded-[0.9rem] px-4 py-2.5 text-center text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-foreground text-paper"
                : tab.alert
                  ? "text-clay hover:bg-[rgba(220,38,38,0.06)]"
                  : "text-muted hover:bg-paper"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {/* ── Journal tab ─────────────────────────────────────────────────── */}
      {activeTab === "journal" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
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
                        Debits {formatMoney(fund.total_debit)} · Credits{" "}
                        {formatMoney(fund.total_credit)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
                <span className="text-xs uppercase tracking-[0.16em] text-muted">4-line journal</span>
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

            <section className="rounded-[1.6rem] border border-line bg-paper p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Recent journal activity</p>
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  {periodTransactions.length} entries
                </span>
              </div>
              {periodTransactions.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No transactions yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {periodTransactions.slice(0, 12).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex flex-col gap-2 rounded-[1.1rem] border border-line bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {tx.memo || "Ledger entry"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {tx.fund_name ? `${tx.fund_name} · ` : ""}
                          {tx.postedLabel} · {tx.posted_by_name}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] text-muted">
                        {formatMoney(tx.total_debit)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      ) : null}

      {/* ── Trial Balance tab ────────────────────────────────────────────── */}
      {activeTab === "balances" ? (
        <div className="mt-6">
          <section className="rounded-[1.6rem] border border-line bg-paper p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Trial balance</p>
                <p className="mt-1 text-sm text-muted">All-time totals across the ledger.</p>
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

            <TrialBalanceTable data={trialBalance} />
          </section>
        </div>
      ) : null}

      {/* ── Pledges tab ──────────────────────────────────────────────────── */}
      {activeTab === "pledges" ? (
        <div className="mt-6">
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
        </div>
      ) : null}

      {/* ── Audit tab ────────────────────────────────────────────────────── */}
      {activeTab === "audit" ? (
        <div className="mt-6 space-y-6">
          {/* Period picker */}
          <section className="rounded-[1.6rem] border border-line bg-paper p-6">
            <p className="text-sm font-semibold text-foreground">Audit period</p>
            <p className="mt-1 text-sm text-muted">
              Set a date range to scope the trial balance and ledger review. Leave blank to
              view all-time.
            </p>
            <form method="GET" action="/finance" className="mt-5">
              <input type="hidden" name="tab" value="audit" />
              <div className="flex flex-wrap items-end gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">From</span>
                  <input
                    type="date"
                    name="from"
                    defaultValue={fromDate}
                    className="mt-2 rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">To</span>
                  <input
                    type="date"
                    name="to"
                    defaultValue={toDate}
                    className="mt-2 rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
                >
                  Run audit
                </button>
                {fromDate || toDate ? (
                  <a
                    href="/finance?tab=audit"
                    className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                  >
                    Clear period
                  </a>
                ) : null}
              </div>
              {fromDate || toDate ? (
                <p className="mt-3 text-xs text-moss">
                  Showing period:{" "}
                  <span className="font-semibold">
                    {fromDate || "all time"} → {toDate || "present"}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted">Showing all-time ledger.</p>
              )}
            </form>
          </section>

          {/* Period trial balance */}
          {periodTrialBalance ? (
            <section className="rounded-[1.6rem] border border-line bg-paper p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Period trial balance</p>
                  <p className="mt-1 text-sm text-muted">
                    {fromDate || "All time"} → {toDate || "present"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    periodTrialBalance.balanced
                      ? "border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                      : "border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.06)] text-clay"
                  }`}
                >
                  {periodTrialBalance.balanced ? "Balanced" : "Out of balance"}
                </span>
              </div>
              <TrialBalanceTable data={periodTrialBalance} />
            </section>
          ) : (
            <section className="rounded-[1.6rem] border border-line bg-paper p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">All-time trial balance</p>
                  <p className="mt-1 text-sm text-muted">
                    Set a period above to scope this to a specific range.
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
              <TrialBalanceTable data={trialBalance} />
            </section>
          )}

          {/* Transaction ledger for period */}
          <section className="rounded-[1.6rem] border border-line bg-paper p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {fromDate || toDate ? "Period transaction ledger" : "Full transaction ledger"}
              </p>
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                {periodTransactions.length} entries
              </span>
            </div>

            {periodTransactions.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No transactions in this period.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-line">
                <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_1fr_0.7fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>Memo</span>
                  <span>Fund</span>
                  <span>Date</span>
                  <span>Posted by</span>
                  <span>Amount</span>
                </div>
                {periodTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-[1.6fr_0.8fr_0.8fr_1fr_0.7fr] gap-3 border-t border-line px-4 py-3 text-sm ${
                      tx.isVoided ? "opacity-40" : "text-muted"
                    }`}
                  >
                    <span className={tx.isVoided ? "line-through" : "text-foreground font-medium"}>
                      {tx.memo || <span className="italic text-clay">No memo</span>}
                    </span>
                    <span>{tx.fund_name || "—"}</span>
                    <span>{tx.postedLabel}</span>
                    <span>{tx.posted_by_name}</span>
                    <span>{formatMoney(tx.total_debit)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Anomaly flags */}
          <section className="rounded-[1.6rem] border border-line bg-paper p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Anomaly flags</p>
                <p className="mt-1 text-sm text-muted">
                  Entries that warrant review before a formal audit sign-off.
                </p>
              </div>
              {anomalyCount === 0 ? (
                <span className="rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1 text-xs font-semibold text-moss">
                  Clear
                </span>
              ) : (
                <span className="rounded-full border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.06)] px-3 py-1 text-xs font-semibold text-clay">
                  {anomalyCount} flag{anomalyCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {anomalies.noMemoTransactions.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                  Entries without a memo
                </p>
                <p className="mt-1 text-xs text-muted">
                  These cannot be explained in a formal audit. Add memos to all posted entries.
                </p>
                <div className="mt-3 overflow-hidden rounded-[1.15rem] border border-[rgba(220,38,38,0.18)]">
                  <div className="grid grid-cols-[1fr_1fr_1fr] bg-[rgba(220,38,38,0.04)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    <span>Transaction ID</span>
                    <span>Posted by</span>
                    <span>Date</span>
                  </div>
                  {anomalies.noMemoTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-t border-[rgba(220,38,38,0.12)] px-4 py-3 text-sm text-muted"
                    >
                      <span className="truncate font-mono text-xs">{tx.id.slice(0, 8)}…</span>
                      <span>{tx.posted_by_name}</span>
                      <span>{tx.postedLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">No memo-less entries found.</p>
            )}

            {anomalies.largeTransactions.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Largest transactions
                </p>
                <p className="mt-1 text-xs text-muted">
                  High-value entries for senior review.
                </p>
                <div className="mt-3 overflow-hidden rounded-[1.15rem] border border-line">
                  <div className="grid grid-cols-[1.5fr_0.8fr_1fr_0.8fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    <span>Memo</span>
                    <span>Fund</span>
                    <span>Posted by</span>
                    <span>Amount</span>
                  </div>
                  {anomalies.largeTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="grid grid-cols-[1.5fr_0.8fr_1fr_0.8fr] gap-3 border-t border-line px-4 py-3 text-sm text-muted"
                    >
                      <span className="font-medium text-foreground">
                        {tx.memo || <span className="italic text-clay">No memo</span>}
                      </span>
                      <span>{tx.fund_name || "—"}</span>
                      <span>{tx.posted_by_name}</span>
                      <span className="font-semibold text-foreground">
                        {formatMoney(tx.total_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* Finance audit log */}
          <section className="rounded-[1.6rem] border border-line bg-paper p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Finance action log</p>
                <p className="mt-1 text-sm text-muted">
                  Every fund, account, journal, and pledge action taken in this workspace.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                {financeAuditEntries.length} events
              </span>
            </div>

            {financeAuditEntries.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No finance actions recorded yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {financeAuditEntries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[1.3rem] border border-line bg-canvas px-5 py-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-semibold text-foreground">{entry.summary}</p>
                      <p className="shrink-0 text-xs text-muted">{entry.createdLabel}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <AuditChip label={entry.actor_name} />
                      <AuditChip label={entry.actor_role} />
                      <AuditChip label={entry.action} mono />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
      <AiChatPanel agentType="finance" />
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

function TrialBalanceTable({ data }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-line">
      <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        <span>Account</span>
        <span>Debit</span>
        <span>Credit</span>
        <span>Balance</span>
      </div>
      {data.accounts.length === 0 ? (
        <div className="px-4 py-4 text-sm text-muted">No ledger activity yet.</div>
      ) : (
        data.accounts.map((account) => (
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
        <span>{formatMoney(data.totalDebit)}</span>
        <span>{formatMoney(data.totalCredit)}</span>
        <span>{formatMoney(data.totalDebit - data.totalCredit)}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "standard" }) {
  const toneClass =
    tone === "alert" ? "text-clay" : tone === "calm" ? "text-moss" : "text-foreground";

  return (
    <article className="rounded-[1.4rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p
        className={`mt-3 text-4xl tracking-[-0.04em] [font-family:var(--font-display)] ${toneClass}`}
      >
        {value}
      </p>
      <p className="mt-3 text-sm text-muted">{detail}</p>
    </article>
  );
}

function AuditChip({ label, mono = false }) {
  return (
    <span
      className={`rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted ${
        mono ? "font-mono" : ""
      }`}
    >
      {label}
    </span>
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
