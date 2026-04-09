import Link from "next/link";
import { cookies } from "next/headers";
import AiChatPanel from "@/components/AiChatPanel";
import { requireCurrentUser } from "@/lib/auth";
import {
  getAttendanceInsights,
  getAttendanceTrend,
  getLapsedMembers,
} from "@/lib/attendance-store";
import {
  getFundActivitySummary,
  getTrialBalance,
  listPledges,
} from "@/lib/finance-store";
import { listMembers } from "@/lib/member-store";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId;
  const orgId = user.organizationId;

  const members = listMembers({ organizationId: orgId, branchId, limit: 500 });
  const attendanceInsights = getAttendanceInsights({ organizationId: orgId, branchId });
  const trend = getAttendanceTrend({ organizationId: orgId, branchId, limit: 12 });
  const lapsed = getLapsedMembers({ organizationId: orgId, branchId, daysSince: 30, limit: 10 });
  const fundSummary = getFundActivitySummary({ organizationId: orgId });
  const trialBalance = getTrialBalance({ organizationId: orgId });
  const pledges = listPledges({ organizationId: orgId, limit: 200 });

  // Member breakdown
  const byType = members.reduce((acc, m) => {
    const t = m.member_type || "member";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const byGender = members.reduce((acc, m) => {
    const g = m.gender || "unspecified";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const activeMembers = members.filter((m) => m.member_type !== "inactive").length;
  const activePledges = pledges.filter((p) => p.status === "active");
  const totalPledged = activePledges.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const trendMax = Math.max(...trend.map((t) => t.total), 1);

  // Finance totals from trial balance
  const totalIncome = trialBalance.accounts
    .filter((a) => a.type === "income")
    .reduce((sum, a) => sum + Number(a.total_credit || 0), 0);
  const totalExpense = trialBalance.accounts
    .filter((a) => a.type === "expense")
    .reduce((sum, a) => sum + Number(a.total_debit || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Growth & Discipleship
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-foreground">Analytics</h1>
        <p className="mt-2 text-sm text-muted">
          Live insights across membership, attendance, and financial stewardship.
          {workspace.activeBranch ? ` · ${workspace.activeBranch.name}` : " · All branches"}
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total members"
          value={members.length}
          sub={`${activeMembers} active`}
        />
        <MetricCard
          label="Services held"
          value={attendanceInsights.totalServices}
          sub={`avg ${attendanceInsights.avgPerService} per service`}
        />
        <MetricCard
          label="Total check-ins"
          value={attendanceInsights.totalCheckIns}
          sub={
            attendanceInsights.lastService
              ? `Last: ${attendanceInsights.lastService.service_date}`
              : "No services yet"
          }
        />
        <MetricCard
          label="Active pledges"
          value={activePledges.length}
          sub={formatMoney(totalPledged) + " pledged"}
          tone="calm"
        />
      </div>

      {/* Attendance trend chart */}
      <section className="mt-8 rounded-[1.6rem] border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Attendance trend</p>
            <p className="mt-1 text-sm text-muted">Check-ins across the last 12 services.</p>
          </div>
          <Link href="/attendance" className="text-xs text-muted transition hover:text-foreground">
            Manage →
          </Link>
        </div>

        {trend.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            No services recorded yet.{" "}
            <Link href="/attendance" className="underline">
              Record your first service →
            </Link>
          </p>
        ) : (
          <div className="mt-6">
            <div className="flex h-36 items-end gap-2">
              {trend.map((t) => {
                const barH = Math.max(4, Math.round((t.total / trendMax) * 128));
                const physH = Math.max(2, Math.round((t.physical / trendMax) * 128));
                const onlH = t.online > 0 ? Math.max(2, Math.round((t.online / trendMax) * 128)) : 0;
                return (
                  <div key={t.id} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] leading-none text-muted">{t.total || 0}</span>
                    <div className="flex w-full flex-col-reverse gap-0.5">
                      <div
                        className="w-full rounded-sm border border-[var(--soft-accent-border)] bg-[var(--soft-fill)]"
                        style={{ height: `${physH}px` }}
                        title={`Physical: ${t.physical}`}
                      />
                      {onlH > 0 ? (
                        <div
                          className="w-full rounded-sm border border-line bg-canvas"
                          style={{ height: `${onlH}px` }}
                          title={`Online: ${t.online}`}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              {trend.map((t) => (
                <div key={t.id} className="flex-1 text-center">
                  <span className="text-[9px] text-muted">
                    {String(t.service_date || "").slice(5)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-5">
              <LegendDot
                color="border-[var(--soft-accent-border)] bg-[var(--soft-fill)]"
                label="Physical"
              />
              <LegendDot color="border-line bg-canvas" label="Online" />
            </div>
          </div>
        )}
      </section>

      {/* Membership + lapse */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Breakdown */}
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <p className="text-sm font-semibold text-foreground">Membership breakdown</p>

          <div className="mt-5">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">By type</p>
            {Object.entries(byType).length === 0 ? (
              <p className="text-sm text-muted">No members yet.</p>
            ) : (
              Object.entries(byType).map(([type, count]) => (
                <BarRow key={type} label={type.replace(/_/g, " ")} count={count} total={members.length} />
              ))
            )}
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">By gender</p>
            {Object.entries(byGender).map(([g, count]) => (
              <BarRow key={g} label={g} count={count} total={members.length} />
            ))}
          </div>
        </section>

        {/* Lapsed members */}
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Lapsed members</p>
              <p className="mt-1 text-sm text-muted">Not seen in 30+ days.</p>
            </div>
            {lapsed.length > 0 ? (
              <span className="rounded-full border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.06)] px-3 py-1 text-xs font-semibold text-clay">
                {lapsed.length} flagged
              </span>
            ) : (
              <span className="rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1 text-xs font-semibold text-moss">
                All active
              </span>
            )}
          </div>

          {lapsed.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No lapsed members detected. Great retention!</p>
          ) : (
            <div className="mt-4 space-y-2">
              {lapsed.map((m) => (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center justify-between rounded-[1.1rem] border border-line bg-canvas px-4 py-3 transition hover:bg-paper"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.full_name}</p>
                    <p className="text-xs capitalize text-muted">
                      {(m.member_type || "member").replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-clay">
                    {m.last_seen ? `${m.daysSinceLastSeen}d ago` : "Never seen"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Finance overview */}
      <section className="mt-6 rounded-[1.6rem] border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Stewardship overview</p>
            <p className="mt-1 text-sm text-muted">Fund activity and ledger posture.</p>
          </div>
          <Link href="/finance" className="text-xs text-muted transition hover:text-foreground">
            Full ledger →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <FinanceStat label="Total income" value={formatMoney(totalIncome)} tone="calm" />
          <FinanceStat label="Total expenses" value={formatMoney(totalExpense)} />
          <FinanceStat
            label="Net position"
            value={formatMoney(totalIncome - totalExpense)}
            tone={totalIncome - totalExpense >= 0 ? "calm" : "alert"}
          />
        </div>

        {fundSummary.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fundSummary.map((fund) => (
              <div key={fund.id} className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{fund.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {fund.transaction_count} transaction{fund.transaction_count === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  In {formatMoney(fund.total_credit)} · Out {formatMoney(fund.total_debit)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No fund activity yet.{" "}
            <Link href="/finance" className="underline">
              Create funds in Finance →
            </Link>
          </p>
        )}
      </section>
      <AiChatPanel agentType="secretary" />
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

function MetricCard({ label, value, sub, tone = "standard" }) {
  const valueClass =
    tone === "calm" ? "text-moss" : tone === "alert" ? "text-clay" : "text-foreground";
  return (
    <article className="rounded-[1.4rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p
        className={`mt-3 text-4xl tracking-[-0.04em] [font-family:var(--font-display)] ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-muted">{sub}</p>
    </article>
  );
}

function FinanceStat({ label, value, tone = "standard" }) {
  const valueClass =
    tone === "calm" ? "text-moss" : tone === "alert" ? "text-clay" : "text-foreground";
  return (
    <div className="rounded-[1.1rem] border border-line bg-canvas px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold [font-family:var(--font-display)] ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function BarRow({ label, count, total }) {
  const pct = total > 0 ? Math.max(4, Math.round((count / total) * 100)) : 4;
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs capitalize text-muted">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full border border-line bg-canvas" style={{ height: "8px" }}>
        <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-foreground">{count}</span>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-sm border ${color}`} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
