import { getRoleLabel, requireCurrentUser } from "@/lib/auth";
import { listAuditLogs, getOperationsSnapshot } from "@/lib/care-store";

export const metadata = {
  title: "Audit Log",
  description: "Recent internal actions and operations signals for pastoral oversight.",
};

export default async function AuditPage() {
  await requireCurrentUser(["pastor", "owner"]);
  const entries = listAuditLogs();
  const ops = getOperationsSnapshot();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
          Oversight
        </p>
        <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
          Audit trail and operations snapshot
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Sensitive care work needs a visible trail. This log captures auth and
          workflow mutations made inside the product.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard label="Households" value={ops.householdCount} />
          <MetricCard label="Open requests" value={ops.openRequestCount} />
          <MetricCard label="Audit events" value={ops.auditLogCount} />
        </div>
      </section>

      <section className="mt-8 surface-card rounded-[2rem] border border-line bg-paper p-8">
        <div className="rounded-[1.5rem] bg-canvas p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Database location
          </p>
          <p className="mt-2 break-all text-sm leading-7 text-foreground">
            {ops.databasePath}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.5rem] border border-line bg-canvas p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.summary}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
                    {entry.action} · {entry.targetType} · {entry.targetId}
                  </p>
                </div>
                <p className="text-sm text-muted">{entry.createdLabel}</p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <DetailItem label="Actor" value={entry.actorName} />
                <DetailItem label="Role" value={getRoleLabel(entry.actorRole)} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.5rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-7 text-foreground">{value}</p>
    </div>
  );
}
