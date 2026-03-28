import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getOperationsSnapshot, listAuditLogs } from "@/lib/care-store";
import { getCopy, translateRoleLabel } from "@/lib/i18n";

export const metadata = {
  title: "Audit Log",
  description: "Recent internal actions and operations signals for pastoral oversight.",
};

export default async function AuditPage() {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  await requireCurrentUser(["pastor", "owner"]);
  const entries = listAuditLogs();
  const ops = getOperationsSnapshot();
  const pageCopy = copy.audit;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
          {pageCopy.kicker}
        </p>
        <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
          {pageCopy.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          {pageCopy.description}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard label={pageCopy.metrics.households} value={ops.householdCount} />
          <MetricCard label={pageCopy.metrics.openRequests} value={ops.openRequestCount} />
          <MetricCard label={pageCopy.metrics.auditEvents} value={ops.auditLogCount} />
        </div>
      </section>

      <section className="mt-8 surface-card rounded-[2rem] border border-line bg-paper p-8">
        <div className="rounded-[1.5rem] bg-canvas p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {pageCopy.databaseLocation}
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
                    {entry.action} / {entry.targetType} / {entry.targetId}
                  </p>
                </div>
                <p className="text-sm text-muted">{entry.createdLabel}</p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <DetailItem label={pageCopy.details.actor} value={entry.actorName} />
                <DetailItem
                  label={pageCopy.details.role}
                  value={translateRoleLabel(entry.actorRole, preferences.language)}
                />
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
