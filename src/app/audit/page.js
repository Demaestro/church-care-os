import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getOperationsSnapshot, listAuditLogs } from "@/lib/care-store";
import { getCopy, translateRoleLabel } from "@/lib/i18n";
import { getWorkspaceContext } from "@/lib/organization-store";
import { filterAuditEntries, hasActiveFilters } from "@/lib/search-filters";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Audit Log",
  description: "Recent internal actions and operations signals for pastoral oversight.",
};

export default async function AuditPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const user = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const params = await searchParams;
  const entries = listAuditLogs(160, user, preferredBranchId);
  const ops = getOperationsSnapshot(user, preferredBranchId);
  const pageCopy = copy.audit;
  const filters = {
    query: typeof params?.q === "string" ? params.q.trim() : "",
    role: typeof params?.role === "string" ? params.role : "all",
    action: typeof params?.action === "string" ? params.action : "all",
  };
  const visibleEntries = filterAuditEntries(entries, filters);
  const actionOptions = Array.from(
    new Set(entries.map((entry) => entry.action.split(".")[0]))
  ).sort();
  const showClearFilters = hasActiveFilters(filters);
  const scopeLabel = workspace.activeBranch
    ? `${workspace.organization.name} / ${workspace.activeBranch.name}`
    : `${workspace.organization.name} / headquarters view`;

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
        <div className="mt-5 inline-flex items-center rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
          <span className="font-semibold text-foreground">{scopeLabel}</span>
          <span className="ml-3">
            {workspace.activeBranch
              ? "Audit events below are limited to the branch you are focused on."
              : "You are reviewing audit activity across the branches you are allowed to oversee."}
          </span>
        </div>

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

        <form action="/audit" className="mt-6 rounded-[1.35rem] border border-line bg-canvas p-4">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.8fr_0.8fr_auto]">
            <Field
              label={copy.common.searchLabel}
              name="q"
              defaultValue={filters.query}
              placeholder={copy.common.searchPlaceholder}
            />
            <SelectField
              label={pageCopy.details.role}
              name="role"
              defaultValue={filters.role}
              options={[
                { value: "all", label: copy.common.allRoles },
                { value: "owner", label: translateRoleLabel("owner", preferences.language) },
                {
                  value: "overseer",
                  label: translateRoleLabel("overseer", preferences.language),
                },
                { value: "pastor", label: translateRoleLabel("pastor", preferences.language) },
                { value: "leader", label: translateRoleLabel("leader", preferences.language) },
                {
                  value: "volunteer",
                  label: translateRoleLabel("volunteer", preferences.language),
                },
                { value: "public", label: copy.layout.roleLabels.member },
              ]}
            />
            <SelectField
              label={pageCopy.details.action}
              name="action"
              defaultValue={filters.action}
              options={[
                { value: "all", label: copy.common.allKinds },
                ...actionOptions.map((action) => ({ value: action, label: action })),
              ]}
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
                  href="/audit"
                  className="inline-flex min-h-14 items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                >
                  {copy.common.clearFilters}
                </a>
              ) : null}
            </div>
          </div>
        </form>

        <div className="mt-6 space-y-4">
          {visibleEntries.map((entry) => (
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
                <DetailItem label={pageCopy.details.action} value={entry.action} />
                <DetailItem label={pageCopy.details.target} value={entry.targetType} />
              </div>
            </article>
          ))}
          {visibleEntries.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-line bg-canvas p-5">
              <p className="text-sm leading-7 text-muted">{copy.common.noMatchesFound}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
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

function SelectField({ label, name, defaultValue, options }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
