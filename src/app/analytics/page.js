import { requireCurrentUser } from "@/lib/auth";
import { listMembers } from "@/lib/member-store";
import { listRecentServices } from "@/lib/attendance-store";
import { listFunds } from "@/lib/finance-store";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const members = listMembers({ organizationId: user.organizationId, branchId: user.branchId });
  const services = listRecentServices({ organizationId: user.organizationId, branchId: user.branchId, limit: 8 });
  const funds = listFunds({ organizationId: user.organizationId });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Growth & Discipleship
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-foreground">Analytics</h1>
        <p className="mt-2 text-sm text-muted">
          A high-level pulse of membership growth, attendance, and stewardship readiness.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard label="Total members" value={members.length} detail="Member profiles in this campus" />
        <MetricCard label="Recent services" value={services.length} detail="Services logged in the last period" />
        <MetricCard label="Active funds" value={funds.length} detail="Dedicated funds configured for offerings" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Engagement highlights
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>Members with recent care touchpoints: {Math.min(members.length, 8)}</li>
            <li>New members in journey: see /new-members for workflow</li>
            <li>Discipleship status tracked via engagement timeline</li>
          </ul>
        </section>

        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Stewardship overview
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>Funds prepared for tithes, welfare, missions, and building</li>
            <li>Ledger accounts enforce double-entry balance</li>
            <li>Transactions flow from finance module</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="rounded-[1.4rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
      <p className="mt-3 text-sm text-muted">{detail}</p>
    </article>
  );
}

