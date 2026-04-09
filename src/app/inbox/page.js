import Link from "next/link";
import { cookies } from "next/headers";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions";
import { SavedViewStrip } from "@/components/saved-view-strip";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { translateSupportNeed } from "@/lib/i18n";
import { getDashboardData, getFollowUpScheduleData } from "@/lib/care-store";
import { listMemberTransfers } from "@/lib/member-transfer-store";
import { listNotificationsForUser } from "@/lib/notifications-store";
import { getWorkspaceContext } from "@/lib/organization-store";
import { matchesSearchQuery } from "@/lib/search-filters";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Pastoral Inbox" };

const INBOX_VIEW_OPTIONS = [
  { value: "all", label: "Everything" },
  { value: "urgent", label: "Urgent care" },
  { value: "follow-up", label: "Follow-up due" },
  { value: "transfers", label: "Transfers" },
  { value: "notifications", label: "Notifications" },
];

export default async function InboxPage({ searchParams }) {
  const [preferences, user, cookieStore] = await Promise.all([
    getAppPreferences(),
    requireCurrentUser([
      "leader",
      "pastor",
      "owner",
    ]),
    cookies(),
  ]);
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const [dashboard, followUpSchedule] = await Promise.all([
    getDashboardData(user, preferredBranchId),
    getFollowUpScheduleData(user, preferredBranchId),
  ]);
  const params = await searchParams;
  const filters = {
    query: typeof params?.q === "string" ? params.q.trim() : "",
    view: normalizeInboxView(params?.view),
  };
  const notifications = listNotificationsForUser(user, 24);
  const unreadNotifications = notifications.filter((notification) => !notification.read);
  const urgentCases = dashboard.openRequests.filter((request) =>
    ["crisis", "urgent"].includes(request.tone)
  );
  const staleUnassigned = dashboard.openRequests.filter(
    (request) => !request.assignedVolunteer?.name
  );
  const actionTransfers = listMemberTransfers(user, preferredBranchId).filter((transfer) =>
    ["requested", "reviewed"].includes(transfer.status)
  );
  const followUpNow = followUpSchedule.items.filter((item) =>
    ["overdue", "today"].includes(item.bucket)
  );
  const visibleUrgentCases = urgentCases.filter((request) =>
    matchesSearchQuery(
      [request.householdName, request.need, request.summary, request.statusDetail],
      filters.query
    )
  );
  const visibleFollowUpNow = followUpNow.filter((item) =>
    matchesSearchQuery(
      [item.householdName, item.summary, item.owner, item.bucketLabel],
      filters.query
    )
  );
  const visibleTransfers = actionTransfers.filter((transfer) =>
    matchesSearchQuery(
      [transfer.householdSlug, transfer.fromBranchName, transfer.toBranchName, transfer.reason],
      filters.query
    )
  );
  const visibleNotifications = notifications.filter((notification) =>
    matchesSearchQuery(
      [notification.title, notification.body, notification.kind],
      filters.query
    )
  );
  const visibleCounts = {
    urgent: visibleUrgentCases.length,
    followUp: visibleFollowUpNow.length,
    transfers: visibleTransfers.length,
    notifications: visibleNotifications.length,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Action inbox
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              One place for what needs your attention now.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              The inbox combines urgent care, overdue touchpoints, notifications, and transfer work
              so you can clear the next decision without moving through several screens first.
            </p>
            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
              <span className="font-semibold text-foreground">
                {workspace.organization.name}
              </span>
              <span>/ {workspace.activeScopeLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/follow-up"
              className="inline-flex items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
            >
              Open follow-up board
            </Link>
            <Link
              href="/leader"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
            >
              Open care work
            </Link>
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
              >
                Mark notifications read
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InboxMetric
            label="Unread notifications"
            value={unreadNotifications.length}
            body="Items still waiting for you to open or clear."
          />
          <InboxMetric
            label="Urgent cases"
            value={urgentCases.length}
            body="Open requests already flagged urgent or crisis."
            tone="alert"
          />
          <InboxMetric
            label="Follow-up due now"
            value={followUpNow.length}
            body="Households overdue or due today for contact."
            tone={followUpNow.length > 0 ? "attention" : "calm"}
          />
          <InboxMetric
            label="Transfers in flight"
            value={actionTransfers.length}
            body="Member movements needing review or completion."
          />
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[1.45rem] border border-line bg-canvas p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  Filter the inbox
                </p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Narrow the inbox to one category of work so you can clear the next right decision without scanning everything at once.
                </p>
              </div>
              <p className="text-sm text-muted">
                Showing {buildInboxVisibleCount(filters.view, visibleCounts)} matching item(s).
              </p>
            </div>

            <form action="/inbox" className="mt-5 grid gap-4 lg:grid-cols-[1fr_15rem_auto]">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Search</span>
                <input
                  type="text"
                  name="q"
                  defaultValue={filters.query}
                  placeholder="Search by household, update, transfer, or notification"
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
                  {INBOX_VIEW_OPTIONS.map((option) => (
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
                    href="/inbox"
                    className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </section>

          <SavedViewStrip
            storageKey="cco-inbox-views"
            currentHref={buildInboxHref(filters)}
            currentLabel={buildInboxViewLabel(filters)}
            presets={buildInboxPresetViews()}
            title="Saved inbox views"
            body="Keep your most-used action lanes nearby, like urgent care or transfer approvals."
            emptyMessage="Save the inbox slices you return to most often."
          />
        </div>
      </section>

      {shouldShowInboxSection("urgent", filters.view) ? (
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <InboxPanel
            title="Immediate attention"
            body="Start here before anything else. These are the cases most likely to drift or escalate if untouched."
          >
            <div className="space-y-4">
              {visibleUrgentCases.length > 0 ? (
                visibleUrgentCases.slice(0, 8).map((request) => (
                  <Link
                    key={request.id}
                    href={`/households/${request.householdSlug}`}
                    className="block rounded-[1.25rem] border border-line bg-canvas p-4 transition hover:bg-[#efe7d8]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{request.householdName}</p>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {translateSupportNeed(request.need, preferences.language)}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-foreground">
                          {request.statusDetail || request.summary}
                        </p>
                      </div>
                      <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                        {request.tone}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyCopy body="No urgent cases are waiting in your current scope." />
              )}
            </div>
          </InboxPanel>

          <InboxPanel
            title="Queue health"
            body="These counts show where handoffs are slowing down."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SmallStat
                label="Unassigned open"
                value={staleUnassigned.length}
                detail="Open requests still waiting for a first volunteer handoff."
              />
              <SmallStat
                label="Due today or overdue"
                value={followUpNow.length}
                detail="Households that need the next touchpoint now."
              />
              <SmallStat
                label="Unread"
                value={unreadNotifications.length}
                detail="Notifications still waiting in your personal inbox."
              />
              <SmallStat
                label="Transfers"
                value={actionTransfers.length}
                detail="Branch movement items still active."
              />
            </div>
          </InboxPanel>
        </section>
      ) : null}

      {shouldShowInboxSection("follow-up", filters.view) ||
      shouldShowInboxSection("transfers", filters.view) ? (
        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
          {shouldShowInboxSection("follow-up", filters.view) ? (
            <InboxPanel
              title="Follow-up due now"
              body="These are the households that need a clear next touchpoint today."
            >
              <div className="space-y-4">
                {visibleFollowUpNow.length > 0 ? (
                  visibleFollowUpNow.slice(0, 10).map((item) => (
                    <Link
                      key={item.householdSlug}
                      href={`/households/${item.householdSlug}`}
                      className="block rounded-[1.25rem] border border-line bg-canvas p-4 transition hover:bg-[#efe7d8]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{item.householdName}</p>
                          <p className="mt-2 text-sm leading-7 text-muted">{item.summary}</p>
                          <p className="mt-2 text-sm text-foreground">
                            Next touchpoint: {item.nextTouchpointLabel}
                          </p>
                        </div>
                        <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                          {item.bucketLabel}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyCopy body="No overdue or due-today follow-ups are waiting right now." />
                )}
              </div>
            </InboxPanel>
          ) : null}

          {shouldShowInboxSection("transfers", filters.view) ? (
            <InboxPanel
              title="Transfers and approvals"
              body="Keep branch movement visible so care ownership does not disappear between campuses."
            >
              <div className="space-y-4">
                {visibleTransfers.length > 0 ? (
                  visibleTransfers.slice(0, 8).map((transfer) => (
                    <Link
                      key={transfer.id}
                      href="/transfers"
                      className="block rounded-[1.25rem] border border-line bg-canvas p-4 transition hover:bg-[#efe7d8]"
                    >
                      <p className="text-lg font-semibold text-foreground">{transfer.householdSlug}</p>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        {transfer.fromBranchName} to {transfer.toBranchName}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">{transfer.reason}</p>
                      <p className="mt-2 text-sm text-muted">
                        {transfer.requestedByName} · {transfer.requestedLabel}
                      </p>
                    </Link>
                  ))
                ) : (
                  <EmptyCopy body="No transfer actions are waiting in your scope." />
                )}
              </div>
            </InboxPanel>
          ) : null}
        </section>
      ) : null}

      {shouldShowInboxSection("notifications", filters.view) ? (
        <section className="mt-8">
          <InboxPanel
            title="Notifications"
            body="Routine system updates stay here so you can clear them without losing the bigger care picture."
          >
            <div className="space-y-4">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={`rounded-[1.25rem] border p-4 ${
                      notification.read
                        ? "border-line bg-canvas"
                        : "border-[rgba(53,111,190,0.16)] bg-[rgba(53,111,190,0.07)]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-foreground">{notification.title}</p>
                        <p className="mt-2 text-sm leading-7 text-muted">{notification.body}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
                          {notification.createdLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {notification.href ? (
                          <Link
                            href={notification.href}
                            className="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-line bg-paper px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                          >
                            Open
                          </Link>
                        ) : null}
                        {!notification.read ? (
                          <form action={markNotificationRead.bind(null, notification.id, "/inbox")}>
                            <button
                              type="submit"
                              className="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
                            >
                              Mark read
                            </button>
                          </form>
                        ) : (
                          <span className="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-line bg-paper px-4 py-2 text-sm font-semibold text-muted">
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyCopy body="No notifications are waiting right now." />
              )}
            </div>
          </InboxPanel>
        </section>
      ) : null}

      {!hasInboxSectionResults(filters.view, visibleCounts) ? (
        <p className="mt-8 rounded-[1.15rem] border border-line bg-canvas px-5 py-4 text-sm text-muted">
          No inbox items match this filter yet. Clear the view or search across a wider slice of work.
        </p>
      ) : null}
    </div>
  );
}

function InboxMetric({ label, value, body, tone = "standard" }) {
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
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
    </article>
  );
}

function InboxPanel({ title, body, children }) {
  return (
    <section className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
      <div className="mb-5">
        <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
      </div>
      {children}
    </section>
  );
}

function SmallStat({ label, value, detail }) {
  return (
    <article className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
    </article>
  );
}

function EmptyCopy({ body }) {
  return <p className="text-sm leading-7 text-muted">{body}</p>;
}

function normalizeInboxView(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  return INBOX_VIEW_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "all";
}

function shouldShowInboxSection(section, view) {
  return view === "all" || view === section;
}

function buildInboxHref(filters) {
  const params = new URLSearchParams();
  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.view !== "all") {
    params.set("view", filters.view);
  }
  const query = params.toString();
  return query ? `/inbox?${query}` : "/inbox";
}

function buildInboxViewLabel(filters) {
  const label =
    INBOX_VIEW_OPTIONS.find((option) => option.value === filters.view)?.label ||
    "Everything";
  return filters.query ? `${label}: ${filters.query}` : label;
}

function buildInboxPresetViews() {
  return [
    { label: "Everything", href: "/inbox" },
    { label: "Urgent care", href: "/inbox?view=urgent" },
    { label: "Follow-up due", href: "/inbox?view=follow-up" },
    { label: "Transfers", href: "/inbox?view=transfers" },
    { label: "Notifications", href: "/inbox?view=notifications" },
  ];
}

function buildInboxVisibleCount(view, counts) {
  if (view === "urgent") {
    return counts.urgent;
  }
  if (view === "follow-up") {
    return counts.followUp;
  }
  if (view === "transfers") {
    return counts.transfers;
  }
  if (view === "notifications") {
    return counts.notifications;
  }
  return counts.urgent + counts.followUp + counts.transfers + counts.notifications;
}

function hasInboxSectionResults(view, counts) {
  return buildInboxVisibleCount(view, counts) > 0;
}
