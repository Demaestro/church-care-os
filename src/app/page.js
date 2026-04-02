import { redirect } from "next/navigation";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { getCopy } from "@/lib/i18n";
import { getAppPreferences } from "@/lib/app-preferences-server";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);

  let user;
  try {
    user = await requireCurrentUser([
      "member","volunteer","leader","pastor","overseer","owner",
      "branch_admin","general_overseer","hq_care_admin","regional_overseer"
    ]);
  } catch {
    redirect("/login");
  }

  const role = user.role;

  if (role === "member") {
    return <MemberHome user={user} />;
  }

  if (role === "volunteer") {
    let openTasks = [];
    try {
      const careStore = await import("@/lib/care-store");
      const fn = careStore.listVolunteerTasksForUser || careStore.getVolunteerTasksForUser;
      if (fn) {
        const tasks = fn(user.id, user.organizationId, user.branchId);
        openTasks = (tasks || []).filter(t => t.status !== "completed" && t.status !== "declined");
      }
    } catch {}
    return <VolunteerHome user={user} openTasks={openTasks} />;
  }

  if (["pastor", "leader"].includes(role)) {
    const { getFollowUpBoard } = await import("@/lib/care-store");
    const board = getFollowUpBoard(user.organizationId, user.branchId);
    return <PastorHome user={user} board={board} />;
  }

  if (["owner","overseer","general_overseer","hq_care_admin","regional_overseer"].includes(role)) {
    redirect("/hq");
  }

  if (role === "branch_admin") {
    redirect("/admin/branch-users");
  }

  redirect("/login");
}

function MemberHome({ user }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Welcome back</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{user.name}</h1>
        <p className="mt-2 text-base text-muted">How can we support you today?</p>
      </div>
      <div className="grid gap-3 sm:gap-4">
        <ActionTile href="/requests/new" title="Request care" detail="Let us know what you need. Your request is private and handled with care." icon="🤝" primary />
        <ActionTile href="/requests/status" title="Track my request" detail="Check the status of a care request you have submitted." icon="🔍" />
        <ActionTile href="/volunteer/apply" title="Serve as a volunteer" detail="Apply to join a care ministry team and help support other members." icon="🙌" />
        <ActionTile href="/member" title="My profile" detail="Update your contact details and preferences." icon="👤" />
      </div>
    </div>
  );
}

function VolunteerHome({ user, openTasks }) {
  const crisis = openTasks.filter(t => t.tone === "crisis");
  const rest = openTasks.filter(t => t.tone !== "crisis");
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Volunteer</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{user.name}</h1>
        </div>
        {openTasks.length > 0 && (
          <span className="rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1 text-xs font-semibold text-moss">
            {openTasks.length} open task{openTasks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {openTasks.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-canvas px-8 py-16 text-center">
          <p className="text-4xl">✓</p>
          <p className="mt-4 text-lg font-semibold text-foreground">All caught up</p>
          <p className="mt-2 text-sm text-muted">No open tasks assigned to you right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {crisis.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Urgent</p>
              {crisis.map(t => <VolunteerTaskRow key={t.id} task={t} />)}
            </>
          )}
          {rest.length > 0 && (
            <>
              {crisis.length > 0 && <div className="pt-2" />}
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Your tasks</p>
              {rest.map(t => <VolunteerTaskRow key={t.id} task={t} />)}
            </>
          )}
        </div>
      )}
      <div className="mt-8">
        <Link href="/volunteer" className="text-sm font-medium text-moss hover:underline">View all volunteer tasks →</Link>
      </div>
    </div>
  );
}

function VolunteerTaskRow({ task }) {
  const toneClass = {
    crisis: "border-red-200 bg-red-50 text-red-700",
    urgent: "border-amber-200 bg-amber-50 text-amber-700",
    routine: "border-line bg-canvas text-muted",
  }[task.tone || "routine"] || "border-line bg-canvas text-muted";

  const slug = task.householdSlug || task.household_slug || "";
  const name = task.householdName || task.household_name || "Household";
  return (
    <Link href={slug ? `/households/${slug}` : "/volunteer"} className="flex items-center justify-between rounded-[1.2rem] border border-line bg-paper px-5 py-4 transition hover:bg-canvas">
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="mt-0.5 text-xs text-muted">{task.taskType || task.task_type || task.requestType || "Care task"}</p>
      </div>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>{task.tone || "routine"}</span>
    </Link>
  );
}

function PastorHome({ user, board }) {
  const urgentItems = [...board.overdue, ...board.dueToday].slice(0, 8);
  const weekItems = board.dueThisWeek.slice(0, 6);
  const noContactItems = board.noContact.slice(0, 5);
  const urgentCount = board.overdue.length + board.dueToday.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Care Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{user.name}</h1>
        </div>
        <Link href="/follow-up" className="self-start inline-flex items-center gap-2 rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]">
          Follow-up board →
        </Link>
      </div>

      {urgentCount > 0 && (
        <div className="mb-6 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.04)] px-4 py-5 sm:px-6">
          <p className="mb-4 text-sm font-semibold text-clay">
            {urgentCount} follow-up{urgentCount !== 1 ? "s" : ""} need attention
          </p>
          <div className="space-y-2">
            {urgentItems.map(r => <FollowUpRow key={r.id} record={r} />)}
          </div>
        </div>
      )}

      {weekItems.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Due this week</p>
          <div className="space-y-2">{weekItems.map(r => <FollowUpRow key={r.id} record={r} />)}</div>
        </section>
      )}

      {noContactItems.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">No contact in 14+ days</p>
          <div className="space-y-2">{noContactItems.map(r => <FollowUpRow key={r.id} record={r} />)}</div>
        </section>
      )}

      {urgentCount === 0 && weekItems.length === 0 && noContactItems.length === 0 && (
        <div className="mb-6 rounded-[1.5rem] border border-line bg-canvas px-6 py-12 text-center">
          <p className="text-3xl">✓</p>
          <p className="mt-3 text-base font-semibold text-foreground">All follow-ups are on track</p>
          <p className="mt-1 text-sm text-muted">No overdue or at-risk cases right now.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickLink href="/follow-up" label="Follow-up board" />
        <QuickLink href="/inbox" label="Pastoral inbox" />
        <QuickLink href="/new-members" label="New members" />
        <QuickLink href="/volunteer/applications" label="Volunteer apps" />
        <QuickLink href="/households" label="Households" />
        <QuickLink href="/discipleship" label="Discipleship" />
      </div>
    </div>
  );
}

function FollowUpRow({ record }) {
  const slug = record.household_slug || record.householdSlug || "";
  const name = record.household_name || record.householdName || "Household";
  const due = record.next_contact_due;
  const dueLabel = due
    ? new Date(due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  return (
    <Link href={slug ? `/households/${slug}` : "/follow-up"} className="flex items-center justify-between rounded-[1.1rem] border border-line bg-paper px-5 py-3.5 transition hover:bg-canvas">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {record.follow_up_goal && <p className="mt-0.5 truncate text-xs text-muted">{record.follow_up_goal}</p>}
      </div>
      {dueLabel && <p className="ml-4 shrink-0 text-xs text-muted">{dueLabel}</p>}
    </Link>
  );
}

function ActionTile({ href, title, detail, icon, primary = false }) {
  return (
    <Link href={href} className={`block rounded-[1.5rem] border p-6 transition ${primary ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] hover:bg-[var(--soft-fill-strong)]" : "border-line bg-canvas hover:bg-paper"}`}>
      <span className="text-2xl">{icon}</span>
      <p className={`mt-3 text-base font-semibold ${primary ? "text-moss" : "text-foreground"}`}>{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
    </Link>
  );
}

function QuickLink({ href, label }) {
  return (
    <Link href={href} className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-[var(--soft-accent-border)] hover:bg-paper hover:text-moss">
      {label}
    </Link>
  );
}
