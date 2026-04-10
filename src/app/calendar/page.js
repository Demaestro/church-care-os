import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/database";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { CalendarEventForm } from "@/components/CalendarEventForm";
import { DeleteEventButton } from "@/components/DeleteEventButton";

export const metadata = {
  title: "Ministry Calendar",
  description: "All upcoming events, services, and programmes for FirstLove Assembly.",
};

const EVENT_TYPE_LABELS = {
  service:     "Sunday Service",
  convention:  "Convention",
  conference:  "Conference",
  prayer:      "Prayer Meeting",
  outreach:    "Outreach",
  youth:       "Youth Programme",
  women:       "Women's Ministry",
  men:         "Men's Fellowship",
  special:     "Special Programme",
  general:     "General Event",
};

const EVENT_TYPE_COLORS = {
  service:     "bg-[rgba(212,175,55,0.12)] text-[var(--gold-text)] border-[rgba(212,175,55,0.25)]",
  convention:  "bg-[rgba(124,58,237,0.08)] text-purple-700 border-purple-200",
  conference:  "bg-[rgba(59,130,246,0.08)] text-blue-700 border-blue-200",
  prayer:      "bg-[rgba(16,185,129,0.08)] text-emerald-700 border-emerald-200",
  outreach:    "bg-[rgba(245,158,11,0.08)] text-amber-700 border-amber-200",
  youth:       "bg-[rgba(236,72,153,0.08)] text-pink-700 border-pink-200",
  women:       "bg-[rgba(168,85,247,0.08)] text-violet-700 border-violet-200",
  men:         "bg-[rgba(14,165,233,0.08)] text-sky-700 border-sky-200",
  special:     "bg-[rgba(239,68,68,0.08)] text-red-700 border-red-200",
  general:     "bg-[rgba(107,114,128,0.08)] text-muted border-line",
};

function getEvents(organizationId, branchId) {
  try {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, title, description, event_type, event_date, event_time, location, created_at
      FROM ministry_events
      WHERE organization_id = ?
        AND (? IS NULL OR branch_id = ? OR branch_id IS NULL)
      ORDER BY event_date ASC, event_time ASC
    `).all(organizationId, branchId || null, branchId || null);
  } catch {
    return [];
  }
}

function groupByMonth(events) {
  const groups = {};
  for (const ev of events) {
    const d = new Date(ev.event_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = { label, items: [] };
    groups[key].items.push(ev);
  }
  return Object.values(groups);
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default async function CalendarPage({ searchParams }) {
  const user = await requireCurrentUser(["leader", "pastor", "owner", "volunteer", "member"]);
  const cookieStore = await cookies();
  const branchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || user.branchId || "";
  const workspace = getWorkspaceContext(user, branchId);
  const canManage = ["pastor", "owner"].includes(user.role);

  const params = await searchParams;
  const showForm = params?.add === "1" || typeof params?.edit === "string";
  const editId = typeof params?.edit === "string" ? params.edit : null;

  const allEvents = getEvents(user.organizationId, workspace.activeBranch?.id || branchId || null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = allEvents.filter((ev) => new Date(ev.event_date) >= today);
  const past = allEvents.filter((ev) => new Date(ev.event_date) < today);
  const upcomingGroups = groupByMonth(upcoming);
  const pastGroups = groupByMonth(past.slice(-30)).reverse();

  const editEvent = editId ? allEvents.find((ev) => ev.id === editId) : null;

  const nextEvent = upcoming[0] || null;
  const nextDays = nextEvent ? daysUntil(nextEvent.event_date) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
            FirstLove Assembly
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-foreground [font-family:var(--font-display)] sm:text-4xl">
            Ministry Calendar
          </h1>
          <p className="mt-1 text-sm text-muted">
            {workspace.organization.name} · {workspace.activeScopeLabel}
          </p>
        </div>
        {canManage && (
          <Link
            href="/calendar?add=1"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.08)] px-4 py-2 text-sm font-semibold text-[var(--gold-text)] transition hover:bg-[rgba(212,175,55,0.14)]"
          >
            + Add event
          </Link>
        )}
      </div>

      {/* Next-up callout */}
      {nextEvent && nextDays !== null && nextDays <= 14 && (
        <div className="mb-8 rounded-[1.4rem] border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.06)] px-6 py-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--gold-text)]">
                {nextDays === 0 ? "Today" : nextDays === 1 ? "Tomorrow" : `${nextDays} days away`}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">{nextEvent.title}</p>
              <p className="text-sm text-muted">
                {fmtDate(nextEvent.event_date)}
                {nextEvent.event_time ? ` · ${nextEvent.event_time}` : ""}
                {nextEvent.location ? ` · ${nextEvent.location}` : ""}
              </p>
            </div>
            <span className={`mt-3 inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold sm:mt-0 ${EVENT_TYPE_COLORS[nextEvent.event_type] || EVENT_TYPE_COLORS.general}`}>
              {EVENT_TYPE_LABELS[nextEvent.event_type] || nextEvent.event_type}
            </span>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {canManage && showForm && (
        <div className="mb-8 rounded-[1.6rem] border border-line bg-paper p-6 shadow-[var(--shadow)]">
          <h2 className="mb-5 text-xl font-semibold text-foreground [font-family:var(--font-display)]">
            {editEvent ? "Edit event" : "New ministry event"}
          </h2>
          <CalendarEventForm
            organizationId={user.organizationId}
            branchId={workspace.activeBranch?.id || branchId || ""}
            editEvent={editEvent}
            eventTypeLabels={EVENT_TYPE_LABELS}
          />
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        {/* Upcoming events */}
        <div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Upcoming events
          </p>
          {upcomingGroups.length === 0 ? (
            <div className="rounded-[1.4rem] border border-line bg-canvas px-6 py-10 text-center">
              <p className="text-sm text-muted">No upcoming events scheduled.</p>
              {canManage && (
                <Link href="/calendar?add=1" className="mt-3 inline-block text-sm font-semibold text-[var(--gold-text)] hover:underline">
                  Add the first event →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {upcomingGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                    {group.label}
                  </p>
                  <div className="space-y-3">
                    {group.items.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        canManage={canManage}
                        typeLabel={EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                        typeColor={EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.general}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past events */}
          {pastGroups.length > 0 && (
            <div className="mt-12">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Past events
              </p>
              <div className="space-y-8 opacity-60">
                {pastGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                      {group.label}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((ev) => (
                        <EventCard
                          key={ev.id}
                          event={ev}
                          canManage={false}
                          typeLabel={EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                          typeColor={EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.general}
                          past
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: event type legend + quick stats */}
        <aside className="space-y-5">
          <div className="rounded-[1.3rem] border border-line bg-canvas p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Event types
            </p>
            <ul className="space-y-2">
              {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                <li key={key} className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${EVENT_TYPE_COLORS[key]}`}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.3rem] border border-line bg-canvas p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              This year
            </p>
            <div className="space-y-2">
              <Stat label="Total events" value={allEvents.length} />
              <Stat label="Upcoming" value={upcoming.length} />
              <Stat label="Completed" value={past.length} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EventCard({ event, canManage, typeLabel, typeColor, past = false }) {
  const days = daysUntil(event.event_date);
  const isToday = days === 0;
  const isTomorrow = days === 1;
  const isSoon = days > 0 && days <= 5;

  return (
    <div className={`group flex items-start gap-4 rounded-[1.25rem] border bg-paper px-5 py-4 transition ${
      isToday ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.04)]" :
      isSoon ? "border-line hover:border-[rgba(212,175,55,0.25)]" :
      "border-line"
    }`}>
      {/* Date column */}
      <div className="flex w-12 shrink-0 flex-col items-center rounded-[0.7rem] border border-line bg-canvas py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {new Date(event.event_date).toLocaleDateString("en-NG", { month: "short" })}
        </p>
        <p className="text-xl font-bold leading-none text-foreground">
          {new Date(event.event_date).getDate()}
        </p>
        <p className="text-[10px] text-muted">
          {new Date(event.event_date).toLocaleDateString("en-NG", { weekday: "short" })}
        </p>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {event.event_time || "Time TBC"}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <span className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeColor}`}>
            {typeLabel}
          </span>
        </div>
        {event.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{event.description}</p>
        ) : null}
        {!past && (
          <div className="mt-2 flex items-center gap-2">
            {isToday && <span className="text-[10px] font-bold text-[var(--gold-text)] uppercase tracking-wide">Today</span>}
            {isTomorrow && <span className="text-[10px] font-bold text-[var(--gold-text)] uppercase tracking-wide">Tomorrow</span>}
            {isSoon && !isToday && !isTomorrow && <span className="text-[10px] font-semibold text-[var(--gold-text)]">{days} days away</span>}
            {canManage && (
              <div className="ml-auto flex gap-2 opacity-0 transition group-hover:opacity-100">
                <Link
                  href={`/calendar?edit=${event.id}`}
                  className="text-[11px] font-medium text-muted hover:text-foreground"
                >
                  Edit
                </Link>
                <DeleteEventButton eventId={event.id} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
