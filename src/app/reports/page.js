import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { getOperationalReportData } from "@/lib/organization-store";

export const metadata = {
  title: "Reports",
  description:
    "Operational reporting for care leaders, pastors, and owners with exportable views.",
};

export default async function ReportsPage() {
  await requireCurrentUser(["pastor", "owner"]);
  const report = await getOperationalReportData();
  const needMax = Math.max(...report.needBreakdown.map((item) => item.count), 1);
  const stageMax = Math.max(...report.stageBreakdown.map((item) => item.count), 1);
  const volunteerMax = Math.max(
    ...report.volunteerLoads.map((item) => item.activeCount),
    1
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Dashboard and reporting
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Understand the care system, not just the queue.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Review request mix, team load, overdue follow-ups, and operational
              signals in one oversight surface. Export what you need for board or
              pastoral review.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ExportLink href="/reports/export?type=cases" label="Export cases" />
            <ExportLink href="/reports/export?type=households" label="Export households" />
            <ExportLink href="/reports/export?type=users" label="Export users" />
            <ExportLink href="/reports/export?type=audit" label="Export audit" />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {report.summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.4rem] border border-line bg-canvas p-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {card.label}
              </p>
              <p className="mt-3 text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
                {card.value}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <DataPanel title="Need mix">
          <BarList items={report.needBreakdown} max={needMax} />
        </DataPanel>
        <DataPanel title="Stage mix">
          <BarList items={report.stageBreakdown} max={stageMax} tone="moss" />
        </DataPanel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DataPanel title="Volunteer capacity">
          <div className="space-y-4">
            {report.volunteerLoads.map((volunteer) => (
              <article
                key={volunteer.name}
                className="rounded-[1.25rem] border border-line bg-canvas p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{volunteer.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {volunteer.team || "Volunteer roster"}
                    </p>
                  </div>
                  <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {volunteer.loadLabel}
                  </span>
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-[rgba(34,28,22,0.08)]">
                  <div
                    className="h-full rounded-full bg-[#356fbe]"
                    style={{
                      width: `${Math.max(
                        12,
                        (volunteer.activeCount / volunteerMax) * 100
                      )}%`,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </DataPanel>

        <DataPanel title="Overdue follow-ups">
          <div className="space-y-4">
            {report.overdueFollowUps.length > 0 ? (
              report.overdueFollowUps.map((item) => (
                <Link
                  key={item.slug}
                  href={`/households/${item.slug}`}
                  className="block rounded-[1.25rem] border border-line bg-canvas p-4 transition hover:bg-[#efe7d8]"
                >
                  <p className="text-lg font-semibold text-foreground">{item.name}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {item.owner || "Unassigned"}
                  </p>
                  <p className="mt-2 text-sm font-medium text-clay">{item.dueLabel}</p>
                </Link>
              ))
            ) : (
              <EmptyCopy body="No overdue follow-ups are showing right now." />
            )}
          </div>
        </DataPanel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <DataPanel title="Recent closures">
          <div className="space-y-4">
            {report.recentClosures.length > 0 ? (
              report.recentClosures.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.25rem] border border-line bg-canvas p-4"
                >
                  <p className="text-lg font-semibold text-foreground">{item.householdName}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.need}</p>
                  <p className="mt-2 text-sm text-muted">{item.closedLabel}</p>
                </article>
              ))
            ) : (
              <EmptyCopy body="No closed requests are available yet." />
            )}
          </div>
        </DataPanel>

        <DataPanel title="Governance snapshot">
          <div className="grid gap-4 md:grid-cols-2">
            <GovernanceCard label="Plan" value={report.settings?.planName || "Not set"} />
            <GovernanceCard
              label="Backup posture"
              value={report.settings?.backupExpectation || "Not set"}
            />
            <GovernanceCard
              label="Database path"
              value={report.ops.databasePath}
              compact
            />
            <GovernanceCard
              label="Audit events logged"
              value={report.ops.auditLogCount}
            />
          </div>
        </DataPanel>
      </section>
    </div>
  );
}

function ExportLink({ href, label }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
    >
      {label}
    </Link>
  );
}

function DataPanel({ title, children }) {
  return (
    <section className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
      <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BarList({ items, max, tone = "blue" }) {
  const barClass = tone === "moss" ? "bg-moss" : "bg-[#356fbe]";

  if (items.length === 0) {
    return <EmptyCopy body="No reporting data is available for this slice yet." />;
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

function GovernanceCard({ label, value, compact = false }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p
        className={`mt-3 ${
          compact ? "break-all" : ""
        } text-sm leading-7 text-foreground`}
      >
        {value}
      </p>
    </article>
  );
}

function EmptyCopy({ body }) {
  return <p className="text-sm leading-7 text-muted">{body}</p>;
}
