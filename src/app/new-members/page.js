import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { getNewMemberStats, listJourneys, getJourneysNeedingEscalation } from "@/lib/new-member-store";

export const metadata = { title: "New Members", description: "Track and nurture new members through their first 30 days." };

const STAGE_LABELS = {
  day_0: "Just Joined",
  day_2: "Day 2 Follow-up",
  day_5: "Day 5 Reminder",
  day_12: "Day 12 Check-in",
  day_21: "Day 21 Touch",
  day_30: "30-Day Review",
  completed: "Integrated",
  dropped: "Dropped",
};

const STAGE_TONE = {
  day_0: "new", day_2: "new", day_5: "new", day_12: "urgent",
  day_21: "urgent", day_30: "crisis", completed: "routine", dropped: "crisis",
};

export default async function NewMembersPage() {
  const user = await requireCurrentUser(["pastor","overseer","owner","branch_admin","general_overseer","hq_care_admin","regional_overseer"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || "";
  const orgId = workspace.organization.id;

  const stats = getNewMemberStats(orgId, branchId);
  const activeJourneys = listJourneys(orgId, branchId, { limit: 50 });
  const atRisk = getJourneysNeedingEscalation();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      {/* Header */}
      <section className="surface-card p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">{workspace.organization.shortName || workspace.organization.name}</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">New Members</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Track every new member through their 30-day welcome journey. Assign volunteers, log contacts, and make sure nobody falls through the cracks.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/requests/new?type=new_member" className="btn-primary text-sm">Register new member</Link>
              <Link href="/settings/service" className="btn-secondary text-sm">Service schedule</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[30rem]">
            <KpiCard label="This month" value={stats.thisMonth} tone="blue" />
            <KpiCard label="This year" value={stats.thisYear} tone="blue" />
            <KpiCard label="All time" value={stats.total} />
            <KpiCard label="Active journeys" value={stats.active} tone="blue" />
            <KpiCard label="Integrated" value={stats.completed} tone="green" />
            <KpiCard label="At risk" value={stats.atRisk} tone={stats.atRisk > 0 ? "red" : "green"} />
          </div>
        </div>
      </section>

      {/* At-risk alert */}
      {atRisk.length > 0 && (
        <div className="mt-6 surface-card border-[rgba(225,29,72,0.20)] bg-[rgba(225,29,72,0.04)] p-5">
          <p className="eyebrow text-clay">Needs immediate follow-up</p>
          <p className="mt-1 text-sm text-muted">{atRisk.length} new {atRisk.length === 1 ? "member has" : "members have"} had no contact in 48+ hours.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {atRisk.map(m => (
              <Link key={m.id} href={`/new-members/${m.id}`}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[rgba(225,29,72,0.16)] bg-paper px-4 py-3 text-sm transition hover:bg-[var(--surface-hover)]">
                <div>
                  <p className="font-semibold text-foreground">{m.memberName}</p>
                  <p className="text-xs text-muted">{m.contactCount === 0 ? "Never contacted" : `Last contact: ${formatRelative(m.lastContactAt)}`}</p>
                </div>
                <span className="badge badge-crisis">At risk</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <p className="eyebrow">Gender breakdown</p>
          <div className="mt-3 space-y-2">
            <GenderBar label="Male"   count={stats.byGender?.male || 0}   total={stats.total} color="var(--moss)" />
            <GenderBar label="Female" count={stats.byGender?.female || 0} total={stats.total} color="var(--gold)" />
            <GenderBar label="Other"  count={stats.byGender?.unspecified || 0} total={stats.total} color="var(--muted)" />
          </div>
        </div>
        <div className="stat-card lg:col-span-3">
          <p className="eyebrow">Monthly registrations — {new Date().getFullYear()}</p>
          <div className="mt-3 flex items-end gap-1 h-20">
            {stats.monthlyTrend.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
            {(() => {
              const max = Math.max(...stats.monthlyTrend.map(m => m.count), 1);
              return stats.monthlyTrend.map(m => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[0.6rem] font-semibold text-moss">{m.count}</span>
                  <div className="w-full rounded-t" style={{ height: `${Math.max((m.count/max)*64, 4)}px`, background: "var(--moss)", opacity: 0.75 }} />
                  <span className="text-[0.58rem] text-muted">{m.month.slice(5)}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Active journeys table */}
      <section className="mt-8 surface-card overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <p className="eyebrow">Active journeys</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{activeJourneys.filter(j => !j.completedAt && !j.droppedAt).length} members in progress</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Birthday</th>
                <th>Stage</th>
                <th className="text-right">Contacts</th>
                <th>Last contact</th>
                <th>Volunteer</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeJourneys.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-muted">No active journeys. Register a new member to begin.</td></tr>
              )}
              {activeJourneys.map(m => (
                <tr key={m.id}>
                  <td><p className="font-semibold text-foreground">{m.memberName}</p><p className="text-xs text-muted">{m.memberEmail || m.memberPhone}</p></td>
                  <td className="capitalize text-muted text-sm">{m.gender === "unspecified" ? "—" : m.gender}</td>
                  <td className="text-muted text-sm">{m.birthday ? formatBirthday(m.birthday) : "—"}</td>
                  <td><span className={`badge badge-${STAGE_TONE[m.stage] || "routine"}`}>{STAGE_LABELS[m.stage] || m.stage}</span></td>
                  <td className="text-right font-semibold text-foreground">{m.contactCount}</td>
                  <td className="text-sm text-muted">{m.lastContactAt ? formatRelative(m.lastContactAt) : <span className="text-clay font-medium">Never</span>}</td>
                  <td className="text-sm text-muted">{m.assignedVolunteerName || <span className="text-gold">Unassigned</span>}</td>
                  <td><Link href={`/new-members/${m.id}`} className="inline-flex items-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1.5 text-xs font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, tone = "default" }) {
  const vc = tone === "red" ? "text-clay" : tone === "green" ? "text-emerald-600" : tone === "blue" ? "text-[var(--moss)]" : "text-foreground";
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-canvas px-4 py-4">
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${vc}`}>{value}</p>
    </div>
  );
}

function GenderBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-xs text-muted">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-foreground">{count}</span>
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatBirthday(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
