import Link from "next/link";
import { cookies } from "next/headers";
import { switchWorkspaceBranch } from "@/app/actions";
import { requireCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/auth-store";
import { followUpPlaybooks } from "@/lib/follow-up-playbooks";
import {
  getBranchOverview,
  getOperationalReportData,
  getWorkspaceContext,
} from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "HQ Command Centre",
  description: "Organisation-wide care health dashboard for headquarters oversight.",
};

const HQ_ROLES = [
  "general_overseer",
  "hq_care_admin",
  "regional_overseer",
  "overseer",
  "owner",
];

export default async function HQPage() {
  const [user, cookieStore] = await Promise.all([
    requireCurrentUser(HQ_ROLES),
    cookies(),
  ]);
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const [branches, report] = await Promise.all([
    Promise.resolve(getBranchOverview(user, "")),
    getOperationalReportData(user, ""),
  ]);
  const volunteers = listUsers({ organizationId: user.organizationId }).filter(
    (entry) => entry.role === "volunteer" && entry.active
  );
  const volunteerCounts = volunteers.reduce((result, volunteer) => {
    if (!volunteer.branchId) {
      return result;
    }

    result[volunteer.branchId] = (result[volunteer.branchId] || 0) + 1;
    return result;
  }, {});
  const branchHealth = branches
    .map((branch) => {
      const volunteerCount = volunteerCounts[branch.id] || 0;
      const pressureScore =
        branch.openRequestCount * 2 +
        branch.urgentHouseholdCount * 3 +
        branch.watchHouseholdCount;
      const workloadRatio =
        volunteerCount > 0
          ? Number((branch.openRequestCount / volunteerCount).toFixed(1))
          : branch.openRequestCount;

      return {
        ...branch,
        volunteerCount,
        pressureScore,
        workloadRatio,
      };
    })
    .sort(
      (left, right) =>
        right.pressureScore - left.pressureScore ||
        right.openRequestCount - left.openRequestCount
    );
  const branchesOnTrack = branchHealth.filter(
    (branch) => branch.pressureScore === 0
  ).length;
  const totalOpen = branchHealth.reduce(
    (sum, branch) => sum + branch.openRequestCount,
    0
  );
  const totalUrgent = branchHealth.reduce(
    (sum, branch) => sum + branch.urgentHouseholdCount,
    0
  );
  const totalWatch = branchHealth.reduce(
    (sum, branch) => sum + branch.watchHouseholdCount,
    0
  );
  const highestPressure = branchHealth[0] || null;
  const regionalPressureMax = Math.max(
    ...report.regionBreakdown.map((item) => item.count),
    1
  );
  const branchPressureMax = Math.max(
    ...report.branchBreakdown.map((item) => item.count),
    1
  );
  const suggestedMoves = [
    totalUrgent > 0
      ? `${totalUrgent} urgent households are still open across the organisation.`
      : "Urgent households are under control right now.",
    highestPressure
      ? `${highestPressure.name} currently has the heaviest branch pressure score.`
      : "No branch pressure is visible right now.",
    report.transferSummary.requestedCount > 0
      ? `${report.transferSummary.requestedCount} member transfer requests are still waiting for movement.`
      : "No pending member transfers are waiting.",
  ];
  const loadBalancingMoves = branchHealth
    .filter(
      (branch) =>
        branch.openRequestCount > 0 &&
        (branch.volunteerCount === 0 || branch.workloadRatio >= 3)
    )
    .slice(0, 4)
    .map((branch) => ({
      ...branch,
      recommendation:
        branch.volunteerCount === 0
          ? "No active volunteers are available in this branch. HQ should either shift temporary support or keep the next steps pastor-led."
          : `Load is running at ${branch.workloadRatio} open requests per volunteer. Consider shifting a care lead, tightening follow-up rhythm, or reviewing whether another nearby branch can help.`,
    }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              {workspace.organization.shortName || workspace.organization.name}
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              HQ command centre for branch-wide care oversight.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              This view is built for headquarters and regional oversight. Branch pastors stay inside
              their own scope, while HQ users can compare health, transfers, and care pressure
              across the organisation without losing the premium clarity of the local workflow.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/branches"
                className="inline-flex items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
              >
                Manage branches
              </Link>
              <Link
                href="/regions"
                className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
              >
                Manage regions
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
              >
                Open reports
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <HqMetric
              label="Branches"
              value={branchHealth.length}
              detail="Active branches visible in your organisation scope"
            />
            <HqMetric
              label="Open care"
              value={totalOpen}
              detail="Organisation-wide open requests"
            />
            <HqMetric
              label="Urgent households"
              value={totalUrgent}
              detail="High-attention homes still waiting for closure"
              tone={totalUrgent > 0 ? "alert" : "calm"}
            />
            <HqMetric
              label="On track"
              value={`${branchesOnTrack}/${branchHealth.length || 0}`}
              detail="Branches with no visible pressure right now"
              tone="calm"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[1.35rem] border border-line bg-canvas p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Recommended next moves
            </p>
            <div className="mt-4 space-y-3">
              {suggestedMoves.map((item) => (
                <div
                  key={item}
                  className="rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm leading-7 text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.35rem] border border-line bg-canvas p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  Standard follow-up library
                </p>
                <h2 className="mt-2 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                  Approved pastoral rhythms
                </h2>
              </div>
              <p className="text-sm text-muted">
                Use these as the baseline across branches.
              </p>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {followUpPlaybooks.map((playbook) => (
                <article
                  key={playbook.id}
                  className="rounded-[1.15rem] border border-line bg-paper p-4"
                >
                  <p className="text-sm font-semibold text-foreground">{playbook.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {playbook.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-line bg-canvas px-3 py-1">
                      {playbook.followUpRhythm}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-3 py-1">
                      {playbook.followUpGoal}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-8 surface-card overflow-hidden rounded-[1.8rem] border border-line bg-paper p-0">
        <div className="px-6 pt-6 pb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Branch health overview</p>
          <h2 className="mt-2 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            Compare branch pressure without opening each branch first
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Region</th>
                <th className="text-right">Open</th>
                <th className="text-right">Urgent</th>
                <th className="text-right">Watch</th>
                <th className="text-right">Volunteers</th>
                <th className="text-right">Load / volunteer</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branchHealth.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted">
                    No branches are visible in your current organisation scope.
                  </td>
                </tr>
              ) : (
                branchHealth.map((branch) => {
                  const needsAttention = branch.pressureScore > 0;

                  return (
                    <tr key={branch.id}>
                      <td>
                        <div>
                          <p className="font-semibold text-foreground">{branch.name}</p>
                          <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-muted">
                            {branch.code}
                          </p>
                        </div>
                      </td>
                      <td className="text-muted">{branch.regionName}</td>
                      <td className="text-right">{branch.openRequestCount}</td>
                      <td className="text-right">{branch.urgentHouseholdCount}</td>
                      <td className="text-right">{branch.watchHouseholdCount}</td>
                      <td className="text-right">{branch.volunteerCount}</td>
                      <td className="text-right">{branch.workloadRatio}</td>
                      <td>
                        <span
                          className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={
                            needsAttention
                              ? {
                                  borderColor: "rgba(220,38,38,0.18)",
                                  background: "rgba(220,38,38,0.08)",
                                  color: "#b91c1c",
                                }
                              : {
                                  borderColor: "rgba(16,185,129,0.18)",
                                  background: "rgba(16,185,129,0.08)",
                                  color: "#047857",
                                }
                          }
                        >
                          {needsAttention ? "Needs attention" : "On track"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <SwitchBranchButton branchId={branch.id} />
                          <Link
                            href="/branches"
                            className="inline-flex items-center justify-center rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-paper"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DataPanel
          title="Regional pressure"
          body="Use this to spot regions carrying the heaviest open-case load before it becomes a branch-by-branch firefight."
        >
          <BarList
            items={report.regionBreakdown.map((item) => ({
              label: `${item.label} · ${item.urgentCount} urgent`,
              count: item.count,
            }))}
            max={regionalPressureMax}
            emptyBody="No regional pressure data is visible right now."
          />
        </DataPanel>

        <DataPanel
          title="Branch comparison"
          body="This is the simplest live comparison of branch demand right now."
        >
          <BarList
            items={report.branchBreakdown.map((item) => ({
              label: `${item.label} · ${item.regionName}`,
              count: item.count,
            }))}
            max={branchPressureMax}
            tone="moss"
            emptyBody="No branch comparison data is visible right now."
          />
        </DataPanel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <DataPanel
          title="Transfer movement"
          body="Cross-branch care only stays safe when member movement is visible and owned."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <TransferStat label="Requested" value={report.transferSummary.requestedCount} />
            <TransferStat label="Reviewed" value={report.transferSummary.reviewedCount} />
            <TransferStat label="Completed" value={report.transferSummary.completedCount} />
          </div>
          <div className="mt-5 space-y-4">
            {report.recentTransfers.length > 0 ? (
              report.recentTransfers.map((transfer) => (
                <article
                  key={transfer.id}
                  className="rounded-[1.2rem] border border-line bg-canvas p-4"
                >
                  <p className="text-lg font-semibold text-foreground">{transfer.householdSlug}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {transfer.fromBranchName} to {transfer.toBranchName}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground">{transfer.reason}</p>
                  <p className="mt-2 text-sm text-muted">
                    {transfer.requestedByName} · {transfer.requestedLabel}
                  </p>
                </article>
              ))
            ) : (
              <EmptyCopy body="No recent transfers are visible right now." />
            )}
          </div>
        </DataPanel>

        <DataPanel
          title="Volunteer coverage"
          body="This helps HQ see whether the care load is outgrowing branch volunteer capacity."
        >
          <div className="space-y-4">
            {branchHealth.slice(0, 6).map((branch) => (
              <article
                key={branch.id}
                className="rounded-[1.2rem] border border-line bg-canvas p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{branch.name}</p>
                    <p className="mt-1 text-sm text-muted">{branch.regionName}</p>
                  </div>
                  <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {branch.volunteerCount} volunteer{branch.volunteerCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MiniMetric label="Open" value={branch.openRequestCount} />
                  <MiniMetric label="Urgent" value={branch.urgentHouseholdCount} />
                  <MiniMetric label="Load ratio" value={branch.workloadRatio} />
                </div>
              </article>
            ))}
          </div>
        </DataPanel>
      </section>

      <section className="mt-8">
        <DataPanel
          title="Load balancing recommendations"
          body="These are the branches most likely to need an HQ intervention, a temporary volunteer shift, or a more pastor-led follow-up rhythm."
        >
          {loadBalancingMoves.length > 0 ? (
            <div className="space-y-4">
              {loadBalancingMoves.map((branch) => (
                <article
                  key={branch.id}
                  className="rounded-[1.2rem] border border-line bg-canvas p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{branch.name}</p>
                      <p className="mt-1 text-sm text-muted">{branch.regionName}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {branch.openRequestCount} open
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {branch.volunteerCount} volunteers
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        Ratio {branch.workloadRatio}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground">
                    {branch.recommendation}
                  </p>
                  <div className="mt-4">
                    <SwitchBranchButton branchId={branch.id} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyCopy body="No branches currently need a load-balancing intervention." />
          )}
        </DataPanel>
      </section>
    </div>
  );
}

function HqMetric({ label, value, detail, tone = "standard" }) {
  const toneClass =
    tone === "alert"
      ? "text-clay"
      : tone === "calm"
        ? "text-moss"
        : "text-foreground";

  return (
    <article className="rounded-[1.35rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-3 text-4xl tracking-[-0.04em] [font-family:var(--font-display)] ${toneClass}`}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
    </article>
  );
}

function DataPanel({ title, body, children }) {
  return (
    <section className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
      <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BarList({ items, max, tone = "blue", emptyBody }) {
  const barClass = tone === "moss" ? "bg-moss" : "bg-[#356fbe]";

  if (items.length === 0) {
    return <EmptyCopy body={emptyBody} />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-[1.25rem] border border-line bg-canvas p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
              {item.label}
            </p>
            <p className="text-sm text-muted">{item.count}</p>
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-[rgba(34,28,22,0.08)]">
            <div
              className={`h-full rounded-full ${barClass}`}
              style={{ width: `${Math.max(14, (item.count / max) * 100)}%` }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function TransferStat({ label, value }) {
  return (
    <article className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-line bg-paper px-3 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function EmptyCopy({ body }) {
  return <p className="text-sm leading-7 text-muted">{body}</p>;
}

function SwitchBranchButton({ branchId }) {
  return (
    <form action={switchWorkspaceBranch}>
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="redirectTo" value="/leader" />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1.5 text-xs font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
      >
        Open branch
      </button>
    </form>
  );
}
