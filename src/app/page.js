import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";

export const metadata = { title: "Home" };

export default async function HomePage() {
  let user;

  try {
    user = await requireCurrentUser([
      "member",
      "volunteer",
      "leader",
      "pastor",
      "overseer",
      "owner",
      "branch_admin",
      "general_overseer",
      "hq_care_admin",
      "regional_overseer",
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
      const listTasks =
        careStore.listVolunteerTasksForUser ||
        careStore.getVolunteerTasksForUser;

      if (listTasks) {
        const tasks = listTasks(user.id, user.organizationId, user.branchId);
        openTasks = (tasks || []).filter(
          (task) => task.status !== "completed" && task.status !== "declined"
        );
      }
    } catch {}

    return <VolunteerHome user={user} openTasks={openTasks} />;
  }

  if (["pastor", "leader"].includes(role)) {
    const { getFollowUpBoard } = await import("@/lib/care-store");
    const board = getFollowUpBoard(user.organizationId, user.branchId);
    return <PastorHome user={user} board={board} />;
  }

  if (
    [
      "owner",
      "overseer",
      "general_overseer",
      "hq_care_admin",
      "regional_overseer",
    ].includes(role)
  ) {
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
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Welcome back
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          {user.name}
        </h1>
        <p className="mt-2 text-base text-muted">
          How can we support you today?
        </p>
      </div>
      <div className="grid gap-3 sm:gap-4">
        <ActionTile
          href="/requests/new"
          title="Request care"
          detail="Let us know what you need. Your request is private and handled with care."
          iconKind="care"
          primary
        />
        <ActionTile
          href="/requests/status"
          title="Track my request"
          detail="Check the status of a care request you have submitted."
          iconKind="track"
        />
        <ActionTile
          href="/volunteer/apply"
          title="Serve as a volunteer"
          detail="Apply to join a care ministry team and help support other members."
          iconKind="serve"
        />
        <ActionTile
          href="/member"
          title="My profile"
          detail="Update your contact details and preferences."
          iconKind="profile"
        />
      </div>
    </div>
  );
}

function VolunteerHome({ user, openTasks }) {
  const crisis = openTasks.filter((task) => task.tone === "crisis");
  const rest = openTasks.filter((task) => task.tone !== "crisis");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Volunteer
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {user.name}
          </h1>
        </div>
        {openTasks.length > 0 ? (
          <span className="rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1 text-xs font-semibold text-moss">
            {openTasks.length} open task{openTasks.length !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {openTasks.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-canvas px-8 py-16 text-center">
          <StatusGlyph />
          <p className="mt-4 text-lg font-semibold text-foreground">
            All caught up
          </p>
          <p className="mt-2 text-sm text-muted">
            No open tasks assigned to you right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {crisis.length > 0 ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
                Urgent
              </p>
              {crisis.map((task) => (
                <VolunteerTaskRow key={task.id} task={task} />
              ))}
            </>
          ) : null}

          {rest.length > 0 ? (
            <>
              {crisis.length > 0 ? <div className="pt-2" /> : null}
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Your tasks
              </p>
              {rest.map((task) => (
                <VolunteerTaskRow key={task.id} task={task} />
              ))}
            </>
          ) : null}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/volunteer"
          className="text-sm font-medium text-moss hover:underline"
        >
          View all volunteer tasks -&gt;
        </Link>
      </div>
    </div>
  );
}

function VolunteerTaskRow({ task }) {
  const toneClass =
    {
      crisis: "border-red-200 bg-red-50 text-red-700",
      urgent: "border-amber-200 bg-amber-50 text-amber-700",
      routine: "border-line bg-canvas text-muted",
    }[task.tone || "routine"] || "border-line bg-canvas text-muted";

  const slug = task.householdSlug || task.household_slug || "";
  const name = task.householdName || task.household_name || "Household";

  return (
    <Link
      href={slug ? `/households/${slug}` : "/volunteer"}
      className="flex items-center justify-between rounded-[1.2rem] border border-line bg-paper px-5 py-4 transition hover:bg-canvas"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {task.taskType ||
            task.task_type ||
            task.requestType ||
            "Care task"}
        </p>
      </div>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
      >
        {task.tone || "routine"}
      </span>
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Care Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
            {user.name}
          </h1>
        </div>
        <Link
          href="/follow-up"
          className="self-start inline-flex items-center gap-2 rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
        >
          Follow-up board -&gt;
        </Link>
      </div>

      {urgentCount > 0 ? (
        <div className="mb-6 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.04)] px-4 py-5 sm:px-6">
          <p className="mb-4 text-sm font-semibold text-clay">
            {urgentCount} follow-up{urgentCount !== 1 ? "s" : ""} need
            attention
          </p>
          <div className="space-y-2">
            {urgentItems.map((record) => (
              <FollowUpRow key={record.id} record={record} />
            ))}
          </div>
        </div>
      ) : null}

      {weekItems.length > 0 ? (
        <section className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Due this week
          </p>
          <div className="space-y-2">
            {weekItems.map((record) => (
              <FollowUpRow key={record.id} record={record} />
            ))}
          </div>
        </section>
      ) : null}

      {noContactItems.length > 0 ? (
        <section className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            No contact in 14+ days
          </p>
          <div className="space-y-2">
            {noContactItems.map((record) => (
              <FollowUpRow key={record.id} record={record} />
            ))}
          </div>
        </section>
      ) : null}

      {urgentCount === 0 &&
      weekItems.length === 0 &&
      noContactItems.length === 0 ? (
        <div className="mb-6 rounded-[1.5rem] border border-line bg-canvas px-6 py-12 text-center">
          <StatusGlyph />
          <p className="mt-3 text-base font-semibold text-foreground">
            All follow-ups are on track
          </p>
          <p className="mt-1 text-sm text-muted">
            No overdue or at-risk cases right now.
          </p>
        </div>
      ) : null}

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
    ? new Date(due).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <Link
      href={slug ? `/households/${slug}` : "/follow-up"}
      className="flex items-center justify-between rounded-[1.1rem] border border-line bg-paper px-5 py-3.5 transition hover:bg-canvas"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {record.follow_up_goal ? (
          <p className="mt-0.5 truncate text-xs text-muted">
            {record.follow_up_goal}
          </p>
        ) : null}
      </div>
      {dueLabel ? (
        <p className="ml-4 shrink-0 text-xs text-muted">{dueLabel}</p>
      ) : null}
    </Link>
  );
}

function ActionTile({ href, title, detail, iconKind, primary = false }) {
  return (
    <Link
      href={href}
      className={`block rounded-[1.5rem] border p-6 transition ${
        primary
          ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] hover:bg-[var(--soft-fill-strong)]"
          : "border-line bg-canvas hover:bg-paper"
      }`}
    >
      <TileGlyph kind={iconKind} />
      <p
        className={`mt-3 text-base font-semibold ${
          primary ? "text-moss" : "text-foreground"
        }`}
      >
        {title}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
    </Link>
  );
}

function QuickLink({ href, label }) {
  return (
    <Link
      href={href}
      className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-[var(--soft-accent-border)] hover:bg-paper hover:text-moss"
    >
      {label}
    </Link>
  );
}

function TileGlyph({ kind }) {
  const commonProps = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
  };

  const icons = {
    care: (
      <svg {...commonProps}>
        <path d="M12 21s-6.5-3.9-8.8-8.2A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 8.8 6.8C18.5 17.1 12 21 12 21Z" />
      </svg>
    ),
    track: (
      <svg {...commonProps}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 3.5 3.5" />
      </svg>
    ),
    serve: (
      <svg {...commonProps}>
        <path d="M12 4v16" />
        <path d="M4 12h16" />
        <path d="M7 7c1.5 2 3.2 3 5 3s3.5-1 5-3" />
      </svg>
    ),
    profile: (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 19c1.6-3 3.7-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
      </svg>
    ),
  };

  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--soft-accent-border)] bg-paper text-moss shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
      {icons[kind] || icons.care}
    </span>
  );
}

function StatusGlyph() {
  return (
    <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss shadow-[0_12px_32px_rgba(37,99,235,0.12)]">
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 12 4.2 4.2L19 6.5" />
      </svg>
    </span>
  );
}
