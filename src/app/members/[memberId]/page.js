import Link from "next/link";
import { cookies } from "next/headers";
import { addMemberTimelineEvent } from "@/app/actions";
import { requireCurrentUser } from "@/lib/auth";
import {
  getMemberById,
  listMemberAttendance,
  listMemberEvents,
} from "@/lib/member-store";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Member Profile" };

const TIMELINE_EVENT_OPTIONS = [
  { value: "care_follow_up", label: "Care follow-up" },
  { value: "service_attendance", label: "Service attendance" },
  { value: "small_group_joined", label: "Joined a small group" },
  { value: "discipleship_class", label: "Completed a discipleship class" },
  { value: "serving_started", label: "Started serving" },
  { value: "baptism", label: "Baptism" },
  { value: "milestone_note", label: "Milestone note" },
];

export default async function MemberProfilePage({ params }) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const cookieStore = await cookies();
  const workspace = getWorkspaceContext(
    user,
    cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || ""
  );
  const activeBranchId =
    workspace.activeBranch?.id ||
    (user.accessScope === "organization" ? "" : user.branchId);
  const resolvedParams = await params;
  const memberId = resolvedParams?.memberId || "";
  const member = getMemberById(memberId, {
    organizationId: user.organizationId,
    branchId: activeBranchId,
  });

  if (!member) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm text-muted">Member not found.</p>
        <Link href="/members" className="mt-4 inline-flex text-sm font-medium text-moss">
          Back to members
        </Link>
      </div>
    );
  }

  const timeline = listMemberEvents(memberId, 200);
  const attendance = listMemberAttendance(memberId, 40);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Member profile
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">
            {member.full_name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {member.email || member.phone || "No contact on record"}
          </p>
        </div>
        <Link href="/members" className="text-sm font-medium text-moss hover:underline">
          Back to members
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Engagement timeline
              </p>
              <p className="mt-2 text-sm text-muted">
                A chronological story of pastoral care, attendance, and discipleship milestones.
              </p>
            </div>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {timeline.length} event{timeline.length === 1 ? "" : "s"}
            </span>
          </div>

          {timeline.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No engagement events recorded yet.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {timeline.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-foreground">
                      {formatTimelineEvent(event.event_type)}
                    </p>
                    <span className="text-xs text-muted">
                      {formatDateTime(event.created_at)}
                    </span>
                  </div>
                  {event.event_payload?.note ? (
                    <p className="mt-2 text-sm text-muted">{event.event_payload.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Attendance
            </p>
            {attendance.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No attendance recorded.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-muted">
                {attendance.map((record) => (
                  <li key={record.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {record.service_name || "Service"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {String(record.service_date || "").slice(0, 10)}
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted">
                      {record.mode}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Add timeline event
            </p>
            <form action={addMemberTimelineEvent} className="mt-4 space-y-4">
              <input type="hidden" name="memberId" value={memberId} />
              <label className="block">
                <span className="text-sm font-medium text-foreground">Event type</span>
                <select
                  name="eventType"
                  className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                >
                  {TIMELINE_EVENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Event date</span>
                <input
                  type="date"
                  name="eventDate"
                  className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Note</span>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="What happened, and why does it matter for this member journey?"
                  className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                />
              </label>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                Add event
              </button>
            </form>
          </article>
        </section>
      </div>
    </div>
  );
}

function formatTimelineEvent(value) {
  return String(value || "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return String(value);
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
