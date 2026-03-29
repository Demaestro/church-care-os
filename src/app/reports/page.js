import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import {
  getCopy,
  translateStage,
  translateSupportNeed,
} from "@/lib/i18n";
import { getOperationalReportData } from "@/lib/organization-store";
import {
  filterOverdueFollowUps,
  filterRecentClosures,
  filterVolunteerLoads,
  hasActiveFilters,
  matchesSearchQuery,
} from "@/lib/search-filters";

export const metadata = {
  title: "Reports",
  description:
    "Operational reporting for care leaders, pastors, and owners with exportable views.",
};

export default async function ReportsPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.reports;
  await requireCurrentUser(["pastor", "owner"]);
  const params = await searchParams;
  const report = await getOperationalReportData();
  const filters = {
    query: typeof params?.q === "string" ? params.q.trim() : "",
  };
  const visibleVolunteerLoads = filterVolunteerLoads(report.volunteerLoads, filters);
  const visibleOverdueFollowUps = filterOverdueFollowUps(report.overdueFollowUps, filters);
  const visibleRecentClosures = filterRecentClosures(report.recentClosures, filters);
  const visibleRequestTrend = report.requestTrend.filter((item) =>
    matchesSearchQuery([item.label], filters.query)
  );
  const visibleOwnerLoad = report.ownerLoad.filter((item) =>
    matchesSearchQuery([item.label], filters.query)
  );
  const visibleSourceMix = report.sourceMix.filter((item) =>
    matchesSearchQuery([item.label], filters.query)
  );
  const visibleAgingBuckets = report.agingBuckets.filter((item) =>
    matchesSearchQuery([item.label], filters.query)
  );
  const showClearFilters = hasActiveFilters(filters);
  const visibleSearchTotal =
    visibleVolunteerLoads.length +
    visibleOverdueFollowUps.length +
    visibleRecentClosures.length +
    visibleRequestTrend.length +
    visibleOwnerLoad.length +
    visibleSourceMix.length +
    visibleAgingBuckets.length;
  const overallSearchTotal =
    report.volunteerLoads.length +
    report.overdueFollowUps.length +
    report.recentClosures.length +
    report.requestTrend.length +
    report.ownerLoad.length +
    report.sourceMix.length +
    report.agingBuckets.length;
  const needMax = Math.max(...report.needBreakdown.map((item) => item.count), 1);
  const stageMax = Math.max(...report.stageBreakdown.map((item) => item.count), 1);
  const volunteerMax = Math.max(
    ...visibleVolunteerLoads.map((item) => item.activeCount),
    1
  );
  const trendMax = Math.max(...visibleRequestTrend.map((item) => item.count), 1);
  const ownerLoadMax = Math.max(...visibleOwnerLoad.map((item) => item.count), 1);
  const sourceMixMax = Math.max(...visibleSourceMix.map((item) => item.count), 1);
  const agingMax = Math.max(...visibleAgingBuckets.map((item) => item.count), 1);
  const summaryCards = [
    {
      label: pageCopy.summary.openCareRequests,
      value: report.summaryCards[0]?.value ?? report.overdueFollowUps.length,
      detail: pageCopy.summary.openCareRequestsDetail(report.overdueFollowUps.length),
    },
    {
      label: pageCopy.summary.activeVolunteers,
      value: report.summaryCards[1]?.value ?? report.volunteerLoads.length,
      detail: pageCopy.summary.activeVolunteersDetail(
        report.volunteerLoads.filter((item) => item.team).length
      ),
    },
    {
      label: pageCopy.summary.resolvedRequests,
      value: report.summaryCards[2]?.value ?? report.recentClosures.length,
      detail: pageCopy.summary.resolvedRequestsDetail,
    },
    {
      label: pageCopy.summary.recentAuditActivity,
      value: report.summaryCards[3]?.value ?? report.ops.auditLogCount,
      detail: pageCopy.summary.recentAuditActivityDetail,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              {pageCopy.kicker}
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              {pageCopy.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              {pageCopy.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ExportLink href="/reports/export?type=cases" label={pageCopy.exports.cases} />
            <ExportLink
              href="/reports/export?type=households"
              label={pageCopy.exports.households}
            />
            <ExportLink href="/reports/export?type=users" label={pageCopy.exports.users} />
            <ExportLink href="/reports/export?type=audit" label={pageCopy.exports.audit} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
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

        <form action="/reports" className="mt-6 rounded-[1.35rem] border border-line bg-canvas p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <Field
              label={copy.common.searchLabel}
              name="q"
              defaultValue={filters.query}
              placeholder={pageCopy.searchPlaceholder}
            />
            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex min-h-14 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                {copy.common.searchLabel}
              </button>
              {showClearFilters ? (
                <a
                  href="/reports"
                  className="inline-flex min-h-14 items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                >
                  {copy.common.clearFilters}
                </a>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">
            {pageCopy.searchSummary(visibleSearchTotal, overallSearchTotal)}
          </p>
        </form>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <DataPanel title={pageCopy.panels.needMix}>
          <BarList
            items={report.needBreakdown.map((item) => ({
              ...item,
              label: translateSupportNeed(item.label, preferences.language),
            }))}
            max={needMax}
            emptyBody={pageCopy.noSliceData}
          />
        </DataPanel>
        <DataPanel title={pageCopy.panels.stageMix}>
          <BarList
            items={report.stageBreakdown.map((item) => ({
              ...item,
              label: translateStage(item.label, preferences.language),
            }))}
            max={stageMax}
            tone="moss"
            emptyBody={pageCopy.noSliceData}
          />
        </DataPanel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DataPanel title={pageCopy.panels.volunteerCapacity}>
          <div className="space-y-4">
            {visibleVolunteerLoads.map((volunteer) => (
              <article
                key={volunteer.name}
                className="rounded-[1.25rem] border border-line bg-canvas p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{volunteer.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {volunteer.team || copy.common.volunteerRoster}
                    </p>
                  </div>
                  <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {volunteer.activeCount === 0
                      ? copy.common.available
                      : `${volunteer.activeCount} active task${
                          volunteer.activeCount === 1 ? "" : "s"
                        }`}
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

        <DataPanel title={pageCopy.panels.overdueFollowUps}>
          <div className="space-y-4">
            {visibleOverdueFollowUps.length > 0 ? (
              visibleOverdueFollowUps.map((item) => (
                <Link
                  key={item.slug}
                  href={`/households/${item.slug}`}
                  className="block rounded-[1.25rem] border border-line bg-canvas p-4 transition hover:bg-[#efe7d8]"
                >
                  <p className="text-lg font-semibold text-foreground">{item.name}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {item.owner || copy.common.unassigned}
                  </p>
                  <p className="mt-2 text-sm font-medium text-clay">{item.dueLabel}</p>
                </Link>
              ))
            ) : (
              <EmptyCopy body={pageCopy.noOverdue} />
            )}
          </div>
        </DataPanel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <DataPanel title={pageCopy.panels.recentClosures}>
          <div className="space-y-4">
            {visibleRecentClosures.length > 0 ? (
              visibleRecentClosures.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.25rem] border border-line bg-canvas p-4"
                >
                  <p className="text-lg font-semibold text-foreground">{item.householdName}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {translateSupportNeed(item.need, preferences.language)}
                  </p>
                  <p className="mt-2 text-sm text-muted">{item.closedLabel}</p>
                </article>
              ))
            ) : (
              <EmptyCopy body={pageCopy.noClosures} />
            )}
          </div>
        </DataPanel>

        <DataPanel title={pageCopy.panels.governanceSnapshot}>
          <div className="grid gap-4 md:grid-cols-2">
            <GovernanceCard
              label={pageCopy.governance.plan}
              value={report.settings?.planName || copy.common.notSet}
            />
            <GovernanceCard
              label={pageCopy.governance.backupPosture}
              value={report.settings?.backupExpectation || copy.common.notSet}
            />
            <GovernanceCard
              label={pageCopy.governance.databasePath}
              value={report.ops.databasePath}
              compact
            />
            <GovernanceCard
              label={pageCopy.governance.auditEventsLogged}
              value={report.ops.auditLogCount}
            />
          </div>
        </DataPanel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <DataPanel title={pageCopy.panels.intakeTrend}>
          <BarList items={visibleRequestTrend} max={trendMax} emptyBody={pageCopy.noSliceData} />
        </DataPanel>
        <DataPanel title={pageCopy.panels.ownerLoad}>
          <BarList items={visibleOwnerLoad} max={ownerLoadMax} tone="moss" emptyBody={pageCopy.noSliceData} />
        </DataPanel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <DataPanel title={pageCopy.panels.sourceMix}>
          <BarList items={visibleSourceMix} max={sourceMixMax} emptyBody={pageCopy.noSliceData} />
        </DataPanel>
        <DataPanel title={pageCopy.panels.caseAging}>
          <BarList items={visibleAgingBuckets} max={agingMax} tone="moss" emptyBody={pageCopy.noSliceData} />
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

function Field({ label, name, defaultValue, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      />
    </label>
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
