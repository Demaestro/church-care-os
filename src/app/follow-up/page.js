import Link from "next/link";
import { cookies } from "next/headers";
import { applyFollowUpPlaybook, logFollowUpTouchpoint } from "@/app/actions";
import { SavedViewStrip } from "@/components/saved-view-strip";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { translateStage, translateSupportNeed } from "@/lib/i18n";
import { getFollowUpBoard } from "@/lib/care-store";
import { followUpPlaybooks } from "@/lib/follow-up-playbooks";
import {
  getEffectiveChurchSettings,
  getWorkspaceContext,
} from "@/lib/organization-store";
import { matchesSearchQuery } from "@/lib/search-filters";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Follow-up Board" };

const OUTCOME_LABELS = {
  reached: "Reached",
  no_response: "No response",
  prayed: "Prayed with member",
  referred: "Referred onward",
  practical: "Practical help delivered",
  another_visit: "Another visit needed",
  discipleship: "Discipleship follow-up",
};

const TOUCHPOINT_OPTIONS = Object.entries(OUTCOME_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default async function FollowUpBoardPage({ searchParams }) {
  const [preferences, user, cookieStore] = await Promise.all([
    getAppPreferences(),
    requireCurrentUser([
      "pastor",
      "owner",
      "leader",
    ]),
    cookies(),
  ]);
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = user.organizationId;
  const settings = getEffectiveChurchSettings(orgId, branchId);
  const board = await getFollowUpBoard(orgId, branchId);
  const params = await searchParams;
  const filters = {
    query: typeof params?.q === "string" ? params.q.trim() : "",
    view: normalizeFollowUpView(params?.view),
  };
  const groupedSections = [
    {
      key: "overdue",
      title: "Overdue",
      body: "These households need the next touchpoint immediately.",
      accentClass: "text-clay",
      items: board.overdue,
      emptyMessage: "No overdue follow-ups.",
    },
    {
      key: "today",
      title: "Due today",
      body: "These are the planned contacts for today.",
      accentClass: "text-gold",
      items: board.dueToday,
      emptyMessage: "Nothing is due today.",
    },
    {
      key: "week",
      title: "Due this week",
      body: "Keep these moving so the week does not bottleneck.",
      accentClass: "text-moss",
      items: board.dueThisWeek,
      emptyMessage: "Nothing is due this week.",
    },
    {
      key: "quiet",
      title: "No contact in 14+ days",
      body: "These households do not yet have a future touchpoint on the board.",
      accentClass: "text-muted",
      items: board.noContact,
      emptyMessage: "Every open household has a recent or scheduled touchpoint.",
    },
    {
      key: "later",
      title: "Later",
      body: "Upcoming work already has a planned rhythm.",
      accentClass: "text-muted",
      items: board.later,
      emptyMessage: "No later follow-ups right now.",
    },
  ];
  const filteredSections = groupedSections
    .map((section) => ({
      ...section,
      items: filterFollowUpItems(section.items, filters),
    }))
    .filter((section) => shouldRenderSection(section.key, filters.view, section.items.length));
  const totalActive = groupedSections.reduce(
    (sum, section) => sum + section.items.length,
    0
  );
  const filteredActive = filteredSections.reduce(
    (sum, section) => sum + section.items.length,
    0
  );
  const currentHref = buildFollowUpHref(filters);
  const presetViews = buildFollowUpPresetViews();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Follow-up
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Keep every household in a visible pastoral rhythm.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              The board is organised around the next touchpoint, not around which screen to open.
              Leaders can log outcomes quickly, apply a playbook when the support need is clear,
              and keep the branch moving forward.
            </p>
            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
              <span className="font-semibold text-foreground">
                {workspace.organization.name}
              </span>
              <span>/ {workspace.activeScopeLabel}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/schedule"
                className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
              >
                Open the schedule planner
              </Link>
              <Link
                href="/inbox"
                className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
              >
                Open the action inbox
              </Link>
              <Link
                href="/requests/new"
                className="inline-flex items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
              >
                + New request
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Overdue now"
              value={board.overdue.length}
              detail="Households already past their next contact date"
              tone={board.overdue.length > 0 ? "alert" : "calm"}
            />
            <MetricCard
              label="Due today"
              value={board.dueToday.length}
              detail="Planned touchpoints for this working day"
            />
            <MetricCard
              label="Quiet households"
              value={board.noContact.length}
              detail="Open requests with no recent or future follow-up on record"
              tone={board.noContact.length > 0 ? "attention" : "calm"}
            />
            <MetricCard
              label="Active flow"
              value={totalActive}
              detail="All open requests visible in the current branch scope"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          <article className="rounded-[1.45rem] border border-line bg-canvas p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Ministry guidance
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground">
              {settings.followUpGuidance}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
              <li>Start with overdue touchpoints before opening a new lane of work.</li>
              <li>Log the outcome and the next date in the same moment whenever possible.</li>
              <li>Use playbooks when you want a consistent pastoral rhythm across the branch.</li>
            </ul>
          </article>

          <article className="rounded-[1.45rem] border border-line bg-canvas p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  Follow-up playbooks
                </p>
                <h2 className="mt-2 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                  Consistent rhythms for common ministry situations
                </h2>
              </div>
              <p className="text-sm text-muted">
                Apply these inside a request card below.
              </p>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {followUpPlaybooks.map((playbook) => (
                <article
                  key={playbook.id}
                  className="rounded-[1.15rem] border border-line bg-paper p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {playbook.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {playbook.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-line bg-canvas px-3 py-1">
                      {playbook.followUpRhythm}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-3 py-1">
                      {translateStage(playbook.discipleshipStage, preferences.language)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[1.45rem] border border-line bg-canvas p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  Filter the board
                </p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Keep one clear operational lens on the board at a time so the team can move through follow-up work without feeling scattered.
                </p>
              </div>
              <p className="text-sm text-muted">
                Showing {filteredActive} of {totalActive} visible follow-ups.
              </p>
            </div>

            <form action="/follow-up" className="mt-5 grid gap-4 lg:grid-cols-[1fr_16rem_auto]">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Search</span>
                <input
                  type="text"
                  name="q"
                  defaultValue={filters.query}
                  placeholder="Search by household, goal, owner, or support need"
                  className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-[#8b847d] focus:border-moss"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">View</span>
                <select
                  name="view"
                  defaultValue={filters.view}
                  className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
                >
                  {FOLLOW_UP_VIEW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-3">
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
                >
                  Apply
                </button>
                {(filters.query || filters.view !== "all") ? (
                  <Link
                    href="/follow-up"
                    className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </section>

          <SavedViewStrip
            storageKey="cco-follow-up-views"
            currentHref={currentHref}
            currentLabel={buildFollowUpViewLabel(filters)}
            presets={presetViews}
            title="Saved views"
            body="Keep the operational slices you come back to most often, like overdue calls or discipleship follow-up, ready in one click."
            emptyMessage="Save the follow-up lens you want to revisit later."
          />
        </div>
      </section>

      <div className="mt-8 space-y-8">
        {filteredSections.map((section) => (
          <BoardSection
            key={section.key}
            section={section}
            language={preferences.language}
            redirectTo="/follow-up"
          />
        ))}

        {filteredSections.length === 0 ? (
          <p className="rounded-[1.15rem] border border-line bg-canvas px-5 py-4 text-sm text-muted">
            No follow-up items match this view yet. Try a wider filter or clear the current lens.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BoardSection({ section, language, redirectTo }) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${section.accentClass}`}>
            {section.title}
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">{section.body}</p>
        </div>
        {section.items.length > 0 ? (
          <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {section.items.length} case{section.items.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {section.items.length === 0 ? (
        <p className="rounded-[1.1rem] border border-line bg-canvas px-5 py-4 text-sm text-muted">
          {section.emptyMessage}
        </p>
      ) : (
        <div className="space-y-4">
          {section.items.map((record) => (
            <FollowUpCard
              key={record.id}
              record={record}
              language={language}
              redirectTo={redirectTo}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FollowUpCard({ record, language, redirectTo }) {
  const playbookAction = applyFollowUpPlaybook.bind(null, record.id);
  const touchpointAction = logFollowUpTouchpoint.bind(null, record.id);
  const dueLabel = formatDateLabel(record.next_contact_due);
  const nextTouchpointValue = toDateTimeLocalValue(record.next_contact_due);
  const toneClass =
    record.tone === "crisis"
      ? "bg-red-500"
      : record.tone === "urgent"
        ? "bg-amber-500"
        : "bg-moss";

  return (
    <article className="surface-card rounded-[1.6rem] border border-line bg-paper p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${toneClass}`} />
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              {translateSupportNeed(record.need || "Care follow-up", language)}
            </p>
            {record.discipleship_stage ? (
              <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted">
                {translateStage(record.discipleship_stage, language)}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {record.household_name || "Household"}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            {record.follow_up_goal || record.summary || "Keep a calm, visible next step on record for this household."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
            {record.follow_up_rhythm ? (
              <span className="rounded-full border border-line bg-canvas px-3 py-1">
                {record.follow_up_rhythm}
              </span>
            ) : null}
            {record.follow_up_owner_name ? (
              <span className="rounded-full border border-line bg-canvas px-3 py-1">
                Owner: {record.follow_up_owner_name}
              </span>
            ) : null}
            {record.last_contact_outcome ? (
              <span className="rounded-full border border-line bg-canvas px-3 py-1">
                Last: {OUTCOME_LABELS[record.last_contact_outcome] || record.last_contact_outcome}
              </span>
            ) : null}
            {dueLabel ? (
              <span className="rounded-full border border-line bg-canvas px-3 py-1">
                Next: {dueLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href={record.household_slug ? `/households/${record.household_slug}` : "/households"}
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
          >
            Open household
          </Link>
          <Link
            href={record.household_slug ? `/households/${record.household_slug}#timeline` : "/schedule"}
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
          >
            View timeline
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <details className="rounded-[1.2rem] border border-line bg-canvas p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            Log the next touchpoint
          </summary>
          <p className="mt-3 text-sm leading-7 text-muted">
            Record what happened, set the next contact date, and keep the pastoral rhythm visible for the team.
          </p>
          <form action={touchpointAction} className="mt-4 space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label className="block">
              <span className="text-sm font-medium text-foreground">Outcome</span>
              <select
                name="outcome"
                defaultValue={record.last_contact_outcome || "reached"}
                className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
              >
                {TOUCHPOINT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Next touchpoint</span>
              <input
                type="datetime-local"
                name="nextTouchpoint"
                defaultValue={nextTouchpointValue}
                className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Note</span>
              <textarea
                name="note"
                rows={3}
                placeholder="What happened, and what should the team know before the next touchpoint?"
                className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
            >
              Save touchpoint
            </button>
          </form>
        </details>

        <details className="rounded-[1.2rem] border border-line bg-canvas p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            Apply a playbook
          </summary>
          <p className="mt-3 text-sm leading-7 text-muted">
            Use a preset rhythm when you want the same pastoral pattern across similar situations.
          </p>
          <form action={playbookAction} className="mt-4 space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label className="block">
              <span className="text-sm font-medium text-foreground">Playbook</span>
              <select
                name="playbookId"
                defaultValue={record.follow_up_template || "first-response"}
                className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
              >
                {followUpPlaybooks.map((playbook) => (
                  <option key={playbook.id} value={playbook.id}>
                    {playbook.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
            >
              Apply playbook
            </button>
          </form>
        </details>
      </div>
    </article>
  );
}

function MetricCard({ label, value, detail, tone = "standard" }) {
  const toneClass =
    tone === "alert"
      ? "text-clay"
      : tone === "attention"
        ? "text-gold"
        : tone === "calm"
          ? "text-moss"
          : "text-foreground";

  return (
    <article className="rounded-[1.35rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-3 text-4xl tracking-[-0.04em] [font-family:var(--font-display)] ${toneClass}`}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
    </article>
  );
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const FOLLOW_UP_VIEW_OPTIONS = [
  { value: "all", label: "All follow-up work" },
  { value: "overdue", label: "Overdue only" },
  { value: "today", label: "Due today" },
  { value: "quiet", label: "No contact in 14+ days" },
  { value: "discipleship", label: "Discipleship follow-up" },
  { value: "unassigned", label: "Needs an owner" },
];

function normalizeFollowUpView(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  return FOLLOW_UP_VIEW_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "all";
}

function filterFollowUpItems(items, filters) {
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.filter((item) => {
    const matchesQuery = matchesSearchQuery(
      [
        item.household_name,
        item.need,
        item.summary,
        item.follow_up_goal,
        item.follow_up_owner_name,
        item.follow_up_rhythm,
        item.discipleship_stage,
      ],
      filters.query
    );

    if (!matchesQuery) {
      return false;
    }

    switch (filters.view) {
      case "discipleship":
        return Boolean(item.discipleship_stage);
      case "unassigned":
        return !item.follow_up_owner_name;
      default:
        return true;
    }
  });
}

function shouldRenderSection(sectionKey, view, itemCount) {
  if (itemCount === 0 && ["overdue", "today", "quiet"].includes(view)) {
    return sectionKey === view;
  }

  if (view === "all" || view === "discipleship" || view === "unassigned") {
    return true;
  }

  if (view === "today") {
    return sectionKey === "today";
  }

  return sectionKey === view;
}

function buildFollowUpHref(filters) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.view && filters.view !== "all") {
    params.set("view", filters.view);
  }

  const query = params.toString();
  return query ? `/follow-up?${query}` : "/follow-up";
}

function buildFollowUpViewLabel(filters) {
  const activeView =
    FOLLOW_UP_VIEW_OPTIONS.find((option) => option.value === filters.view)?.label ||
    "All follow-up work";

  return filters.query
    ? `${activeView}: ${filters.query}`
    : activeView;
}

function buildFollowUpPresetViews() {
  return [
    { label: "All board", href: "/follow-up" },
    { label: "Overdue now", href: "/follow-up?view=overdue" },
    { label: "Due today", href: "/follow-up?view=today" },
    { label: "Quiet households", href: "/follow-up?view=quiet" },
    { label: "Discipleship", href: "/follow-up?view=discipleship" },
    { label: "Needs owner", href: "/follow-up?view=unassigned" },
  ];
}
