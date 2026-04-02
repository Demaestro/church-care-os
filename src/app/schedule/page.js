import Link from "next/link";
import { cookies } from "next/headers";
import { saveFollowUpPlan } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { toDateTimeLocalValue } from "@/lib/care-format";
import { getFollowUpScheduleData } from "@/lib/care-store";
import { getCopy, translateSupportNeed } from "@/lib/i18n";
import { getWorkspaceContext } from "@/lib/organization-store";
import { filterScheduleItems, hasActiveFilters } from "@/lib/search-filters";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Follow-up Schedule",
  description:
    "Plan touchpoints, review what is overdue, and keep the next pastoral step visible.",
};

export default async function SchedulePage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.schedule;
  const user = await requireCurrentUser(["leader", "pastor", "overseer", "owner"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const params = await searchParams;
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const filters = {
    query: typeof params?.q === "string" ? params.q.trim() : "",
    bucket: typeof params?.bucket === "string" ? params.bucket : "all",
    owner: typeof params?.owner === "string" ? params.owner : "all",
  };
  const schedule = await getFollowUpScheduleData(user, preferredBranchId);
  const items = filterScheduleItems(schedule.items, filters);
  const ownerOptions = Array.from(new Set(schedule.items.map((item) => item.owner))).sort();
  const showClearFilters = hasActiveFilters(filters);
  const scopeLabel = workspace.activeBranch
    ? `${workspace.organization.name} / ${workspace.activeBranch.name}`
    : `${workspace.organization.name} / headquarters view`;
  const scopedHref = (pathname) =>
    preferredBranchId
      ? `${pathname}?branch=${encodeURIComponent(preferredBranchId)}`
      : pathname;

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
            <p className="mt-5 text-lg leading-8 text-muted">{pageCopy.description}</p>
            <div className="mt-5 inline-flex items-center rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
              <span className="font-semibold text-foreground">{scopeLabel}</span>
              <span className="ml-3">
                {workspace.activeBranch
                  ? "This planner is focused on one branch."
                  : "You are looking across every branch you are allowed to supervise."}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[28rem]">
            <MetricCard label={pageCopy.metrics.overdue} value={schedule.summary.overdue} />
            <MetricCard label={pageCopy.metrics.today} value={schedule.summary.today} />
            <MetricCard label={pageCopy.metrics.thisWeek} value={schedule.summary.thisWeek} />
            <MetricCard label={pageCopy.metrics.later} value={schedule.summary.later} />
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle={copy.common.flashNotice}
            errorTitle={copy.common.flashError}
          />
        </div>

        <form action="/schedule" className="mt-6 rounded-[1.35rem] border border-line bg-canvas p-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.8fr_0.9fr_auto]">
            <Field
              label={copy.common.searchLabel}
              name="q"
              defaultValue={filters.query}
              placeholder={pageCopy.searchPlaceholder}
            />
            <SelectField
              label={pageCopy.fields.bucket}
              name="bucket"
              defaultValue={filters.bucket}
              options={[
                { value: "all", label: copy.common.allStatuses },
                { value: "overdue", label: pageCopy.buckets.overdue },
                { value: "today", label: pageCopy.buckets.today },
                { value: "this-week", label: pageCopy.buckets.thisWeek },
                { value: "later", label: pageCopy.buckets.later },
              ]}
            />
            <SelectField
              label={pageCopy.fields.owner}
              name="owner"
              defaultValue={filters.owner}
              options={[
                { value: "all", label: copy.common.allOwners },
                ...ownerOptions.map((owner) => ({ value: owner, label: owner })),
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
                  href={scopedHref("/schedule")}
                  className="inline-flex min-h-14 items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                >
                  {copy.common.clearFilters}
                </a>
              ) : null}
            </div>
          </div>
        </form>
      </section>

      <section className="mt-8 space-y-4">
        {items.length === 0 ? (
          <article className="surface-card rounded-[1.8rem] border border-dashed border-line bg-paper p-6">
            <p className="text-sm leading-7 text-muted">{pageCopy.empty}</p>
          </article>
        ) : (
          items.map((item) => (
            <article
              key={item.householdSlug}
              className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      {item.bucketLabel}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      {item.owner}
                    </span>
                  </div>
                  <h2 className="mt-4 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                    {item.householdName}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {translateSupportNeed(item.need, preferences.language)}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground">{item.summary}</p>
                  <p className="mt-3 text-sm text-muted">
                    {pageCopy.nextTouchpoint} {item.nextTouchpointLabel}
                  </p>
                </div>

                <Link
                  href={scopedHref(`/households/${item.householdSlug}`)}
                  className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                >
                  {pageCopy.openHousehold}
                </Link>
              </div>

              <form action={saveFollowUpPlan.bind(null, item.householdSlug)} className="mt-6 grid gap-4 rounded-[1.35rem] border border-line bg-canvas p-5 xl:grid-cols-[0.9fr_1fr_1.2fr_auto]">
                <Field
                  label={pageCopy.fields.owner}
                  name="owner"
                  defaultValue={item.owner === "Unassigned" ? "" : item.owner}
                  placeholder={pageCopy.placeholders.owner}
                />
                <Field
                  label={pageCopy.fields.nextTouchpoint}
                  name="nextTouchpoint"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(item.nextTouchpoint)}
                />
                <Field
                  label={pageCopy.fields.note}
                  name="note"
                  defaultValue=""
                  placeholder={pageCopy.placeholders.note}
                />
                <div className="flex items-end">
                  <SubmitButton
                    idleLabel={pageCopy.buttons.savePlan}
                    pendingLabel={pageCopy.buttons.savingPlan}
                    className="inline-flex min-h-14 w-full items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              </form>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
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
