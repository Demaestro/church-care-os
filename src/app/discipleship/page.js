import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/database";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { listDiscipleshipRecords, getDiscipleshipStats } from "@/lib/discipleship-store";
import DiscipleshipMilestoneCard from "@/components/DiscipleshipMilestoneCard";

export const metadata = { title: "Discipleship Pathways" };

// ── Pathway milestones definition ─────────────────────────────────────────────
// Each stage has a required set of milestones.
// Completing them all advances the member to the next stage.
export const PATHWAY_MILESTONES = [
  {
    key: "foundation_class",
    label: "Foundation Class",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    description: "Completed the new believer foundation class",
    field: "foundationClass",
    color: "blue",
    stage: "new_believer",
  },
  {
    key: "baptized",
    label: "Baptised",
    icon: "M4.5 12.75l6 6 9-13.5",
    description: "Water baptism completed",
    field: "baptized",
    color: "sky",
    stage: "foundation",
  },
  {
    key: "attending_regularly",
    label: "Regular Attender",
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5",
    description: "Attending services regularly (3+ months)",
    field: "attendingRegularly",
    color: "amber",
    stage: "foundation",
  },
  {
    key: "small_group_connected",
    label: "Joined a Cell Group",
    icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    description: "Connected to a small group or cell",
    field: "smallGroupConnected",
    color: "green",
    stage: "growing",
  },
  {
    key: "serving",
    label: "Serving in a Unit",
    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
    description: "Active in a ministry department or service unit",
    field: "serving",
    color: "purple",
    stage: "serving",
  },
  {
    key: "mentoring_others",
    label: "Mentoring Others",
    icon: "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
    description: "Discipling or mentoring at least one other person",
    field: "mentoringOthers",
    color: "gold",
    stage: "mentoring",
  },
];

const STAGES = [
  {
    key: "new_believer",
    label: "New Believer",
    dot: "bg-[var(--gold-text)]",
    ring: "ring-[rgba(212,175,55,0.3)]",
    badge: "bg-[rgba(212,175,55,0.1)] text-[var(--gold-text)]",
    bar: "from-amber-300 to-[var(--gold-text)]",
    milestones: ["foundation_class"],
  },
  {
    key: "foundation",
    label: "Foundation",
    dot: "bg-blue-500",
    ring: "ring-blue-200",
    badge: "bg-blue-50 text-blue-700",
    bar: "from-blue-300 to-blue-500",
    milestones: ["baptized", "attending_regularly"],
  },
  {
    key: "growing",
    label: "Growing",
    dot: "bg-green-500",
    ring: "ring-green-200",
    badge: "bg-green-50 text-green-700",
    bar: "from-green-300 to-green-500",
    milestones: ["small_group_connected"],
  },
  {
    key: "serving",
    label: "Serving",
    dot: "bg-purple-500",
    ring: "ring-purple-200",
    badge: "bg-purple-50 text-purple-700",
    bar: "from-purple-300 to-purple-500",
    milestones: ["serving"],
  },
  {
    key: "mentoring",
    label: "Mentoring Others",
    dot: "bg-emerald-600",
    ring: "ring-emerald-200",
    badge: "bg-emerald-50 text-emerald-700",
    bar: "from-emerald-400 to-emerald-600",
    milestones: ["mentoring_others"],
  },
];

// ── Compute % progress within a stage ─────────────────────────────────────────
function stageProgress(record, stage) {
  if (!record) return 0;
  const milestoneKeys = stage.milestones;
  const completed = milestoneKeys.filter((key) => {
    const m = PATHWAY_MILESTONES.find((m) => m.key === key);
    return m && record[m.field];
  }).length;
  return Math.round((completed / milestoneKeys.length) * 100);
}

// ── Find stuck members (in same stage for > 90 days) ─────────────────────────
function findStuckRecords(records) {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  return records.filter((r) => r.updatedAt < cutoff && r.stage !== "mentoring");
}

// ── Overall pathway % complete ────────────────────────────────────────────────
function overallProgress(record) {
  const all = PATHWAY_MILESTONES.map((m) => record[m.field]);
  const done = all.filter(Boolean).length;
  return Math.round((done / all.length) * 100);
}

export default async function DiscipleshipPage() {
  const user = await requireCurrentUser(["pastor", "owner", "leader"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = user.organizationId;

  const records = listDiscipleshipRecords(orgId, branchId, { limit: 300 });
  const stats = getDiscipleshipStats(orgId, branchId);
  const stuckMembers = findStuckRecords(records);

  const byStage = {};
  for (const s of STAGES) byStage[s.key] = [];
  for (const r of records) {
    const key = r.stage || "new_believer";
    if (!byStage[key]) byStage["new_believer"].push(r);
    else byStage[key].push(r);
  }

  // Overall milestone completion rates
  const milestoneRates = PATHWAY_MILESTONES.map((m) => {
    const done = records.filter((r) => r[m.field]).length;
    const pct = records.length > 0 ? Math.round((done / records.length) * 100) : 0;
    return { ...m, done, pct };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-text)]">
            Growth
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Discipleship Roadmaps</h1>
          <p className="mt-1 text-sm text-muted">
            {stats.total} people on the pathway · {stuckMembers.length > 0 ? `${stuckMembers.length} need attention` : "all progressing"}
          </p>
        </div>
        <Link
          href="/discipleship/enroll"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, var(--gold-pure) 0%, var(--gold-text) 100%)",
            boxShadow: "0 2px 10px rgba(212,175,55,0.30)",
          }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Enrol member
        </Link>
      </div>

      {/* ── Pathway progress pipeline ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Pathway pipeline</h2>
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-[10px] text-muted">{stats.total} total</span>
        </div>

        {/* Stage flow — horizontal scroll on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage, idx) => {
            const count = stats.byStage[stage.key] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            const isLast = idx === STAGES.length - 1;
            return (
              <div key={stage.key} className="flex items-stretch gap-0 shrink-0">
                <div className={`rounded-2xl border border-[var(--line)] bg-paper p-4 shadow-[var(--shadow-sm)] w-40 ring-2 ${stage.ring}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2 w-2 rounded-full ${stage.dot} shrink-0`} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted truncate">
                      {stage.label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">{count}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{pct}% of total</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-[rgba(18,18,18,0.06)]">
                    <div
                      className={`h-1.5 rounded-full bg-gradient-to-r ${stage.bar} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {!isLast && (
                  <div className="flex items-center px-1">
                    <svg className="h-4 w-4 text-muted/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Stuck members alert ───────────────────────────────────────────── */}
      {stuckMembers.length > 0 && (
        <section
          className="rounded-2xl p-5"
          style={{
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.25)",
          }}
        >
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">
                {stuckMembers.length} {stuckMembers.length === 1 ? "person has" : "people have"} been at the same stage for 90+ days
              </p>
              <p className="text-xs text-muted mb-3">
                Ask the AI Shepherd: <em>"Who is stuck in their discipleship pathway?"</em> for personalised outreach suggestions.
              </p>
              <div className="flex flex-wrap gap-2">
                {stuckMembers.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/households/${r.householdSlug}`}
                    className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {r.householdName}
                    <span className="text-amber-400 capitalize">· {r.stage?.replace("_", " ")}</span>
                  </Link>
                ))}
                {stuckMembers.length > 5 && (
                  <span className="flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-600">
                    +{stuckMembers.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Milestone completion rates ────────────────────────────────────── */}
      {records.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Milestone completion — all members</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {milestoneRates.map((m) => (
              <div key={m.key} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-paper px-4 py-3 shadow-[var(--shadow-sm)]">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  m.color === "gold" ? "bg-[rgba(212,175,55,0.12)] text-[var(--gold-text)]"
                  : m.color === "blue" ? "bg-blue-50 text-blue-600"
                  : m.color === "sky" ? "bg-sky-50 text-sky-600"
                  : m.color === "amber" ? "bg-amber-50 text-amber-600"
                  : m.color === "green" ? "bg-green-50 text-green-600"
                  : "bg-purple-50 text-purple-600"
                }`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-semibold text-foreground">{m.label}</p>
                    <span className="text-[11px] font-bold text-foreground">{m.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[rgba(18,18,18,0.06)]">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${m.pct}%`,
                        background: m.color === "gold"
                          ? "linear-gradient(90deg, var(--gold-pure), var(--gold-text))"
                          : undefined,
                        backgroundColor: m.color !== "gold" ? undefined : undefined,
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">{m.done} of {records.length}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Stage columns — member cards ──────────────────────────────────── */}
      <section className="space-y-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">All members by stage</h2>

        {STAGES.map((stage) => {
          const members = byStage[stage.key] || [];
          if (members.length === 0) return null;
          return (
            <div key={stage.key}>
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stage.badge}`}>
                  {members.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {members.map((record) => (
                  <DiscipleshipMilestoneCard
                    key={record.id}
                    record={record}
                    stage={stage}
                    milestones={PATHWAY_MILESTONES}
                    progress={stageProgress(record, stage)}
                    overall={overallProgress(record)}
                    isStuck={stuckMembers.some((s) => s.id === record.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {records.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center">
            <svg className="mx-auto h-8 w-8 text-muted/40 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm font-medium text-muted">No discipleship records yet</p>
            <p className="mt-1 text-xs text-muted">Enrol a member to start tracking their spiritual journey.</p>
          </div>
        )}
      </section>
    </div>
  );
}
