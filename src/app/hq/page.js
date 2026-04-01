import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { getBranchOverview, getWorkspaceContext } from "@/lib/organization-store";
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
  const user = await requireCurrentUser(HQ_ROLES);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branches = getBranchOverview(user, "");   // always show ALL branches here

  // ── Org-wide aggregates ──────────────────────────────────────────────────
  const totalBranches      = branches.length;
  const totalOpen          = branches.reduce((s, b) => s + b.openRequestCount, 0);
  const totalUrgent        = branches.reduce((s, b) => s + b.urgentHouseholdCount, 0);
  const totalWatch         = branches.reduce((s, b) => s + b.watchHouseholdCount, 0);
  const branchesOnTrack    = branches.filter(
    (b) => b.openRequestCount === 0 && b.urgentHouseholdCount === 0
  ).length;
  const branchesNeedAttention = totalBranches - branchesOnTrack;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(29,78,216,0.14)] bg-paper p-8 shadow-[var(--shadow-lg)] lg:p-10">
        {/* blue ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 rounded-[2rem]"
          style={{
            background:
              "radial-gradient(ellipse at 60% -20%, rgba(59,130,246,0.12), transparent 60%)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">{workspace.organization.shortName || workspace.organization.name}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              HQ Command Centre
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Organisation-wide care health at a glance. Branch data stays private — only
              aggregates are shown here unless you switch into a specific branch from the nav.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/branches"
                className="btn-primary text-sm"
                style={{ minHeight: "2.5rem" }}
              >
                Manage branches
              </Link>
              <Link
                href="/admin/users"
                className="btn-secondary text-sm"
                style={{ minHeight: "2.5rem" }}
              >
                Manage people
              </Link>
              <Link
                href="/reports"
                className="btn-ghost text-sm"
                style={{ minHeight: "2.5rem" }}
              >
                Reports
              </Link>
            </div>
          </div>

          {/* ── Top KPI strip ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[32rem]">
            <KpiCard
              label="Branches"
              value={totalBranches}
              detail="in organisation"
            />
            <KpiCard
              label="Open cases"
              value={totalOpen}
              detail="across all branches"
              tone={totalOpen > 0 ? "blue" : "green"}
            />
            <KpiCard
              label="Urgent"
              value={totalUrgent}
              detail="households flagged"
              tone={totalUrgent > 0 ? "red" : "green"}
            />
            <KpiCard
              label="On track"
              value={branchesOnTrack}
              detail={`of ${totalBranches} branches`}
              tone="green"
            />
          </div>
        </div>
      </section>

      {/* ── Summary ribbon ───────────────────────────────────────────────── */}
      {branchesNeedAttention > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(220,38,38,0.20)] bg-[rgba(220,38,38,0.06)] px-5 py-4">
          <span className="notif-dot mt-1 flex-shrink-0" />
          <p className="text-sm font-medium text-clay">
            {branchesNeedAttention}{" "}
            {branchesNeedAttention === 1 ? "branch needs" : "branches need"} attention — open
            care requests or urgent households are unresolved. Review the table below and follow
            up with the local pastor.
          </p>
        </div>
      )}

      {/* ── Branch health table ──────────────────────────────────────────── */}
      <section className="mt-8 surface-card overflow-hidden p-0">
        <div className="px-6 pt-6 pb-4">
          <p className="eyebrow">Branch health overview</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            All branches — live snapshot
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Location</th>
                <th>Region</th>
                <th className="text-right">Open</th>
                <th className="text-right">Urgent</th>
                <th className="text-right">Watch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted">
                    No branches found for this organisation.
                  </td>
                </tr>
              )}
              {branches.map((branch) => {
                const needsAttention =
                  branch.openRequestCount > 0 || branch.urgentHouseholdCount > 0;

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
                    <td className="text-muted">
                      {branch.city && branch.country
                        ? `${branch.city}, ${branch.country}`
                        : branch.locationLabel || "—"}
                    </td>
                    <td className="text-muted">{branch.regionName}</td>
                    <td className="text-right">
                      <span
                        className={
                          branch.openRequestCount > 0
                            ? "font-semibold text-[var(--info)]"
                            : "text-muted"
                        }
                      >
                        {branch.openRequestCount}
                      </span>
                    </td>
                    <td className="text-right">
                      <span
                        className={
                          branch.urgentHouseholdCount > 0
                            ? "font-semibold text-clay"
                            : "text-muted"
                        }
                      >
                        {branch.urgentHouseholdCount}
                      </span>
                    </td>
                    <td className="text-right">
                      <span
                        className={
                          branch.watchHouseholdCount > 0
                            ? "font-semibold text-gold"
                            : "text-muted"
                        }
                      >
                        {branch.watchHouseholdCount}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${needsAttention ? "badge-urgent" : "badge-new"}`}
                        style={
                          !needsAttention
                            ? {
                                background: "rgba(16,185,129,0.10)",
                                color: "#059669",
                                borderColor: "rgba(16,185,129,0.20)",
                              }
                            : {}
                        }
                      >
                        {needsAttention ? "Needs attention" : "On track"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <SwitchBranchLink branchId={branch.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Quick-stat row ───────────────────────────────────────────────── */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat
          label="Total open across org"
          value={totalOpen}
          description="Care requests not yet resolved"
          tone="blue"
        />
        <QuickStat
          label="Urgent households"
          value={totalUrgent}
          description="Need immediate pastoral care"
          tone="red"
        />
        <QuickStat
          label="Watch households"
          value={totalWatch}
          description="Monitoring for deterioration"
          tone="amber"
        />
        <QuickStat
          label="Branches on track"
          value={`${branchesOnTrack} / ${totalBranches}`}
          description="No open cases or urgent flags"
          tone="green"
        />
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, detail, tone = "default" }) {
  const valueClass =
    tone === "red"
      ? "text-clay"
      : tone === "green"
        ? "text-emerald-600"
        : tone === "blue"
          ? "text-[var(--info)]"
          : "text-foreground";

  return (
    <div className="rounded-[1.25rem] border border-line bg-canvas px-4 py-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function QuickStat({ label, value, description, tone = "default" }) {
  const valueClass =
    tone === "red"
      ? "text-clay"
      : tone === "green"
        ? "text-emerald-600"
        : tone === "blue"
          ? "text-[var(--moss)]"
          : tone === "amber"
            ? "text-gold"
            : "text-foreground";

  return (
    <div className="stat-card">
      <p className="eyebrow">{label}</p>
      <p className={`mt-3 text-4xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

function SwitchBranchLink({ branchId }) {
  return (
    <Link
      href={`/leader?branch=${branchId}`}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1.5 text-xs font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
    >
      View
    </Link>
  );
}
