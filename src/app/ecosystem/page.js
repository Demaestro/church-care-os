import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getEcosystemCommandData } from "@/lib/ecosystem-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Ecosystem Command",
  description:
    "A connected church ecosystem command surface for people, discipleship, ministries, care, branches, and Sunday readiness.",
};

const tonePills = {
  high: "border-[rgba(225,29,72,0.20)] bg-[rgba(225,29,72,0.08)] text-clay",
  medium: "border-[rgba(217,119,6,0.22)] bg-[rgba(217,119,6,0.10)] text-gold",
  low: "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss",
};

const metricTone = {
  blue: "border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.07)]",
  green: "border-[rgba(22,163,74,0.18)] bg-[rgba(22,163,74,0.07)]",
  teal: "border-[rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.07)]",
  amber: "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)]",
  rose: "border-[rgba(225,29,72,0.18)] bg-[rgba(225,29,72,0.08)]",
};

export default async function EcosystemCommandPage() {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const cookieStore = await cookies();
  const data = await getEcosystemCommandData(
    user,
    cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || ""
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <section className="border-b border-line pb-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-4xl">
            <p className="eyebrow">{data.workspace.organizationShortName}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
              Ecosystem Command
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              One church, many expressions: people, discipleship, ministries, services,
              branches, stewardship, and care moving as one connected operating system.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 xl:justify-end">
            <ScopeChip label="Scope" value={data.workspace.scopeLabel} />
            <ScopeChip
              label={data.workspace.activeBranchId ? "Campus" : "Campuses"}
              value={
                data.workspace.activeBranchId
                  ? "Focused"
                  : `${data.workspace.branchCount} visible`
              }
            />
            <Link href="/requests/new" className="btn-primary">
              New request
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel
          eyebrow="Church graph"
          title="Connected people, groups, ministries, campuses, and services"
          action={{ href: "/members", label: "Open people" }}
        >
          <ChurchGraph graph={data.graph} />
        </Panel>

        <Panel
          eyebrow="Pastoral intelligence"
          title="Signals that need leadership attention"
          action={{ href: "/inbox", label: "Open inbox" }}
        >
          <div className="space-y-3">
            {data.signals.map((signal) => (
              <SignalRow key={`${signal.title}:${signal.href}`} signal={signal} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <ScorePanel
          title="Sunday Readiness"
          score={data.readiness.score}
          href="/attendance"
          label="Readiness"
        >
          <div className="space-y-3">
            {data.readiness.checks.map((check) => (
              <ReadinessCheck key={check.label} check={check} />
            ))}
          </div>
        </ScorePanel>

        <Panel
          eyebrow="Attention queue"
          title="People who should not wait"
          action={{ href: "/follow-up", label: "Follow-up" }}
          compact
        >
          <AttentionQueue items={data.peopleNeedingAttention} />
        </Panel>

        <ScorePanel
          title="Discipleship Momentum"
          score={data.scores.discipleshipMomentum}
          href="/discipleship"
          label="Engaged"
        >
          <StageStack stages={data.discipleship.byStage} />
        </ScorePanel>

        <ScorePanel
          title="Ministry Health"
          score={data.scores.ministryHealth}
          href="/teams"
          label="Healthy"
        >
          <MinistrySnapshot health={data.ministryHealth} />
        </ScorePanel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Panel
          eyebrow="Operational command center"
          title="Move across the church ecosystem"
          action={{ href: "/reports", label: "Reports" }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2">
            {data.commandTiles.map((tile) => (
              <CommandTile key={tile.label} tile={tile} />
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Multi-branch oversight"
          title="Branch health, load, and coverage"
          action={{ href: "/branches", label: "Branches" }}
        >
          <BranchMatrix branches={data.branchMatrix} />
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          eyebrow="New members"
          title="First-30-day journey"
          action={{ href: "/new-members", label: "Journeys" }}
          compact
        >
          <NewMemberPulse newMembers={data.newMembers} />
        </Panel>

        <Panel
          eyebrow="Groups"
          title="Community connection"
          action={{ href: "/groups", label: "Groups" }}
          compact
        >
          <ScoreLine
            label="Group connection"
            value={data.scores.groupConnection}
            detail="Member profiles represented across group rosters."
          />
        </Panel>

        {data.finance ? (
          <Panel
            eyebrow="Stewardship"
            title="Giving and accounting readiness"
            action={{ href: "/finance", label: "Finance" }}
            compact
          >
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Funds" value={data.finance.fundCount} />
              <MiniStat label="Pledges" value={data.finance.activePledges} />
              <MiniStat label="Balance" value={data.finance.balanced ? "OK" : "Check"} />
            </div>
          </Panel>
        ) : (
          <Panel
            eyebrow="Stewardship"
            title="Role-protected finance"
            action={{ href: "/security", label: "Security" }}
            compact
          >
            <p className="text-sm leading-7 text-muted">
              Pastor or owner access required.
            </p>
          </Panel>
        )}
      </section>
    </div>
  );
}

function ScopeChip({ label, value }) {
  return (
    <div className="inline-flex min-h-12 items-center gap-3 rounded-[1rem] border border-line bg-paper px-4 py-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <span className="max-w-[14rem] truncate text-sm font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function MetricCard({ metric }) {
  return (
    <Link
      href={metric.href}
      className={`block rounded-[1.35rem] border p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)] ${
        metricTone[metric.tone] || metricTone.blue
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {metric.label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {metric.value}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">{metric.detail}</p>
    </Link>
  );
}

function Panel({ eyebrow, title, action, children, compact = false }) {
  return (
    <section className={`surface-card bg-paper ${compact ? "p-5" : "p-6"}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground">
            {title}
          </h2>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center justify-center rounded-[0.9rem] border border-line bg-canvas px-4 py-2 text-sm font-semibold text-foreground transition hover:border-[var(--soft-accent-border)] hover:bg-[var(--soft-fill)]"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ChurchGraph({ graph }) {
  const nodesById = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

  return (
    <div className="relative min-h-[24rem] overflow-hidden rounded-[1.25rem] border border-line bg-canvas">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(37,99,235,0.05)_1px,transparent_1px)] bg-[length:48px_48px]" />
      {graph.edges.map(([fromId, toId]) => (
        <GraphLine
          key={`${fromId}:${toId}`}
          from={nodesById[fromId]}
          to={nodesById[toId]}
        />
      ))}
      {graph.nodes.map((node) => (
        <GraphNode key={node.id} node={node} />
      ))}
      <div className="absolute bottom-4 left-4 right-4 grid gap-2 rounded-[1rem] border border-line bg-paper/90 p-3 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
        {graph.nodes
          .filter((node) => node.id !== "church")
          .slice(0, 4)
          .map((node) => (
            <div key={node.id} className="flex items-center gap-2 text-xs text-muted">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: node.color }}
              />
              <span className="font-semibold text-foreground">{node.value}</span>
              <span>{node.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function GraphLine({ from, to }) {
  if (!from || !to) {
    return null;
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const width = Math.max(8, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <span
      aria-hidden
      className="absolute h-px origin-left bg-[rgba(100,116,139,0.32)]"
      style={{
        left: `${from.x}%`,
        top: `${from.y}%`,
        width: `${width}%`,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
}

function GraphNode({ node }) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/70 text-center text-white shadow-[var(--shadow-lg)]"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: `${node.size}px`,
        height: `${node.size}px`,
        backgroundColor: node.color,
      }}
    >
      <span className="text-sm font-bold leading-none">{node.value}</span>
      <span className="mt-1 max-w-[4.5rem] truncate px-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] leading-none">
        {node.label}
      </span>
    </div>
  );
}

function SignalRow({ signal }) {
  return (
    <Link
      href={signal.href}
      className="block rounded-[1.1rem] border border-line bg-canvas px-4 py-3 transition hover:border-[var(--soft-accent-border)] hover:bg-[var(--soft-fill)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold leading-6 text-foreground">{signal.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{signal.detail}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] ${
            tonePills[signal.tone] || tonePills.low
          }`}
        >
          {signal.tone}
        </span>
      </div>
    </Link>
  );
}

function ScorePanel({ title, score, href, label, children }) {
  return (
    <section className="surface-card bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="mt-2 text-sm text-muted">{label}</p>
        </div>
        <Link href={href} className="text-sm font-semibold text-moss hover:underline">
          Open
        </Link>
      </div>
      <div className="mt-5 flex items-center gap-5">
        <ScoreDial value={score} />
        <div>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
            {score}%
          </p>
          <p className="mt-1 text-sm text-muted">current score</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ScoreDial({ value }) {
  return (
    <div
      className="relative h-20 w-20 rounded-full"
      style={{
        background: `conic-gradient(var(--moss) ${value}%, rgba(100,116,139,0.18) 0)`,
      }}
    >
      <div className="absolute inset-2 flex items-center justify-center rounded-full bg-paper">
        <span className="text-sm font-bold text-foreground">{value}</span>
      </div>
    </div>
  );
}

function ReadinessCheck({ check }) {
  return (
    <Link
      href={check.href}
      className="flex items-start gap-3 rounded-[1rem] border border-line bg-canvas px-3 py-3 transition hover:border-[var(--soft-accent-border)]"
    >
      <span
        className={`mt-1 h-2.5 w-2.5 rounded-full ${
          check.complete ? "bg-emerald-500" : "bg-gold"
        }`}
      />
      <span>
        <span className="block text-sm font-semibold text-foreground">
          {check.label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted">{check.detail}</span>
      </span>
    </Link>
  );
}

function AttentionQueue({ items }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1rem] border border-dashed border-line bg-canvas p-6 text-sm leading-7 text-muted">
        No urgent people or ownership gaps are visible in this scope.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="block rounded-[1rem] border border-line bg-canvas px-4 py-3 transition hover:border-[var(--soft-accent-border)] hover:bg-[var(--soft-fill)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                {item.detail}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase ${
                tonePills[item.tone] || tonePills.low
              }`}
            >
              {item.meta}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function StageStack({ stages }) {
  const entries = Object.entries(stages || {}).sort((left, right) => right[1] - left[1]);

  if (entries.length === 0) {
    return (
      <p className="rounded-[1rem] border border-dashed border-line bg-canvas p-4 text-sm text-muted">
        No discipleship pathway records yet.
      </p>
    );
  }

  const max = Math.max(...entries.map(([, count]) => count), 1);

  return (
    <div className="space-y-3">
      {entries.slice(0, 5).map(([stage, count]) => (
        <div key={stage}>
          <div className="flex justify-between gap-3 text-xs">
            <span className="font-semibold capitalize text-foreground">
              {stage.replaceAll("_", " ")}
            </span>
            <span className="text-muted">{count}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(100,116,139,0.16)]">
            <div
              className="h-full rounded-full bg-moss"
              style={{ width: `${Math.max(8, Math.round((count / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MinistrySnapshot({ health }) {
  if (health.teams.length === 0) {
    return (
      <p className="rounded-[1rem] border border-dashed border-line bg-canvas p-4 text-sm text-muted">
        No active ministry teams are configured in this scope.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {health.teams.slice(0, 4).map((team) => (
        <Link
          key={team.id}
          href={team.href}
          className="block rounded-[1rem] border border-line bg-canvas px-3 py-3 transition hover:border-[var(--soft-accent-border)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{team.name}</p>
              <p className="mt-1 text-xs text-muted">
                {team.peopleCount} people, {team.openRequestCount} open
              </p>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase ${
                team.tone === "urgent" ? tonePills.medium : tonePills.low
              }`}
            >
              {team.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CommandTile({ tile }) {
  return (
    <Link
      href={tile.href}
      className="rounded-[1.1rem] border border-line bg-canvas p-4 transition hover:border-[var(--soft-accent-border)] hover:bg-[var(--soft-fill)]"
    >
      <p className="text-sm font-semibold text-foreground">{tile.label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
        {tile.value}
      </p>
      <p className="mt-1 text-xs text-muted">{tile.detail}</p>
    </Link>
  );
}

function BranchMatrix({ branches }) {
  if (branches.length === 0) {
    return (
      <p className="rounded-[1rem] border border-dashed border-line bg-canvas p-6 text-sm text-muted">
        No branch health data is visible in this scope.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[44rem]">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Region</th>
            <th className="text-right">Open</th>
            <th className="text-right">Urgent</th>
            <th className="text-right">Volunteers</th>
            <th>Health</th>
          </tr>
        </thead>
        <tbody>
          {branches.slice(0, 8).map((branch) => (
            <tr key={branch.id}>
              <td className="font-semibold">{branch.name}</td>
              <td className="text-sm text-muted">{branch.regionName}</td>
              <td className="text-right font-semibold">{branch.openRequestCount}</td>
              <td className="text-right font-semibold">{branch.urgentHouseholdCount}</td>
              <td className="text-right font-semibold">{branch.volunteerCount}</td>
              <td>
                <span
                  className={`badge ${
                    branch.health === "At risk"
                      ? "badge-crisis"
                      : branch.health === "Watch"
                        ? "badge-urgent"
                        : "badge-new"
                  }`}
                >
                  {branch.health}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewMemberPulse({ newMembers }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Active" value={newMembers.active} />
        <MiniStat label="Month" value={newMembers.thisMonth} />
        <MiniStat label="At risk" value={newMembers.atRisk} />
      </div>
      <div className="mt-5 space-y-2">
        {newMembers.activeJourneys.length === 0 ? (
          <p className="rounded-[1rem] border border-dashed border-line bg-canvas p-4 text-sm text-muted">
            No active new member journeys yet.
          </p>
        ) : (
          newMembers.activeJourneys.map((journey) => (
            <Link
              key={journey.id}
              href={`/new-members/${journey.id}`}
              className="flex items-center justify-between gap-3 rounded-[1rem] border border-line bg-canvas px-3 py-3 text-sm transition hover:border-[var(--soft-accent-border)]"
            >
              <span className="font-semibold text-foreground">{journey.memberName}</span>
              <span className="text-xs capitalize text-muted">
                {String(journey.stage || "").replaceAll("_", " ")}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function ScoreLine({ label, value, detail }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
        </div>
        <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
          {value}%
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(100,116,139,0.16)]">
        <div className="h-full rounded-full bg-moss" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-line bg-canvas px-3 py-4 text-center">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
        {value}
      </p>
    </div>
  );
}
