import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import {
  getMemberById,
  listMemberAttendance,
  listMemberEvents,
} from "@/lib/member-store";
import { addMemberEvent } from "@/lib/member-store";

export const metadata = { title: "Member Profile" };

export default async function MemberProfilePage({ params }) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const memberId = params?.memberId || "";
  const member = getMemberById(memberId);

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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Engagement timeline
          </p>
          {timeline.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No engagement events recorded yet.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {timeline.map((event) => (
                <div key={event.id} className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {event.event_type}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {String(event.created_at || "").replace("T", " ").slice(0, 16)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Attendance
          </p>
          {attendance.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No attendance recorded.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {attendance.map((record) => (
                <li key={record.id} className="flex items-start justify-between gap-4">
                  <span>{record.service_name || "Service"}</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted">
                    {record.mode}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <form
        action={async (formData) => {
          "use server";
          const label = String(formData.get("eventLabel") || "").trim();
          if (!label) return;
          addMemberEvent(memberId, label, { source: "manual" });
        }}
        className="mt-8 rounded-[1.6rem] border border-line bg-paper p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Add engagement event
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            name="eventLabel"
            placeholder="Baptism, First timers class, Joined choir"
            className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
          >
            Add event
          </button>
        </div>
      </form>
    </div>
  );
}
