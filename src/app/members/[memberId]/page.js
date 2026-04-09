import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addMemberTimelineEvent,
  addMemberToGroup,
  updateMember,
} from "@/app/actions";
import { requireCurrentUser } from "@/lib/auth";
import {
  getMemberWithProfile,
  listMemberAttendance,
  listMemberEvents,
  listMemberGroups,
  listMemberPledges,
} from "@/lib/member-store";
import { listGroups } from "@/lib/group-store";

export const metadata = { title: "Member Profile" };

export default async function MemberProfilePage({ params, searchParams }) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const { memberId } = await params;
  const sp = await searchParams;
  const activeTab = typeof sp?.tab === "string" ? sp.tab : "overview";

  const member = getMemberWithProfile(memberId);
  if (!member) notFound();

  const events = listMemberEvents(memberId, 50);
  const attendance = listMemberAttendance(memberId, 40);
  const groups = listMemberGroups(memberId);
  const pledges = listMemberPledges(memberId);
  const allGroups = listGroups({ organizationId: user.organizationId, branchId: member.branch_id });

  const joinedDays = member.created_at
    ? Math.floor((Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "attendance", label: `Attendance · ${attendance.length}` },
    { key: "groups", label: `Groups · ${groups.length}` },
    { key: "pledges", label: `Pledges · ${pledges.length}` },
    { key: "timeline", label: `Timeline · ${events.length}` },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      {/* Back */}
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"
      >
        ← Members
      </Link>

      {/* Hero */}
      <div className="mt-6 rounded-[1.8rem] border border-line bg-paper p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-foreground [font-family:var(--font-display)]">
                {member.full_name}
              </h1>
              <TypeBadge type={member.member_type} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {member.email || "No email"}
              {member.phone ? ` · ${member.phone}` : ""}
            </p>
            {joinedDays !== null ? (
              <p className="mt-1 text-xs text-muted">
                Member for {joinedDays} day{joinedDays === 1 ? "" : "s"} · since{" "}
                {String(member.created_at || "").slice(0, 10)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Chip>{attendance.length} service{attendance.length === 1 ? "" : "s"}</Chip>
            <Chip>{groups.length} group{groups.length === 1 ? "" : "s"}</Chip>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <nav className="mt-6 flex gap-1 rounded-[1.2rem] border border-line bg-canvas p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={`/members/${memberId}?tab=${tab.key}`}
            className={`shrink-0 rounded-[0.9rem] px-3 py-2.5 text-center text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-foreground text-paper"
                : "text-muted hover:bg-paper"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Edit form */}
          <section className="rounded-[1.6rem] border border-line bg-paper p-6">
            <p className="text-sm font-semibold text-foreground">Member details</p>
            <form action={updateMember} className="mt-5 space-y-4">
              <input type="hidden" name="memberId" value={memberId} />
              <Field label="Full name" name="fullName" defaultValue={member.full_name || ""} />
              <Field label="Email" name="email" type="email" defaultValue={member.email || ""} />
              <Field label="Phone" name="phone" defaultValue={member.phone || ""} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Gender"
                  name="gender"
                  defaultValue={member.gender || ""}
                  options={[
                    { value: "", label: "Unspecified" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ]}
                />
                <SelectField
                  label="Marital status"
                  name="maritalStatus"
                  defaultValue={member.marital_status || ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "single", label: "Single" },
                    { value: "married", label: "Married" },
                    { value: "widowed", label: "Widowed" },
                    { value: "divorced", label: "Divorced" },
                  ]}
                />
              </div>
              <Field label="Date of birth" name="birthdate" type="date" defaultValue={member.birthdate || ""} />
              <SelectField
                label="Member type"
                name="memberType"
                defaultValue={member.member_type || "member"}
                options={[
                  { value: "member", label: "Member" },
                  { value: "regular_attendee", label: "Regular Attendee" },
                  { value: "new_convert", label: "New Convert" },
                  { value: "first_timer", label: "First Timer" },
                  { value: "transfer", label: "Transfer" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                Save changes
              </button>
            </form>
          </section>

          <section className="space-y-5">
            {/* Spiritual milestones */}
            <article className="rounded-[1.6rem] border border-line bg-paper p-6">
              <p className="text-sm font-semibold text-foreground">Spiritual milestones</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Milestone label="Salvation" value={member.salvation_date || "—"} />
                <Milestone label="Baptism" value={member.baptism_date || "—"} />
                <Milestone label="Small group" value={member.small_group || "—"} />
                <Milestone
                  label="Last contact"
                  value={member.last_contact_at ? String(member.last_contact_at).slice(0, 10) : "—"}
                />
              </div>
              {member.notes_summary ? (
                <p className="mt-4 text-sm leading-7 text-muted">{member.notes_summary}</p>
              ) : null}
            </article>

            {/* Recent attendance */}
            <article className="rounded-[1.6rem] border border-line bg-paper p-6">
              <p className="text-sm font-semibold text-foreground">Recent attendance</p>
              {attendance.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No attendance recorded yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {attendance.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-[0.9rem] border border-line bg-canvas px-4 py-2.5"
                    >
                      <span className="text-sm text-foreground">{a.service_name || "Service"}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">{a.service_date}</span>
                        <ModeBadge mode={a.mode} />
                      </div>
                    </div>
                  ))}
                  {attendance.length > 5 ? (
                    <a
                      href={`/members/${memberId}?tab=attendance`}
                      className="block text-center text-xs text-muted hover:text-foreground"
                    >
                      View all {attendance.length} →
                    </a>
                  ) : null}
                </div>
              )}
            </article>

            {/* Log event */}
            <article className="rounded-[1.6rem] border border-line bg-paper p-6">
              <p className="text-sm font-semibold text-foreground">Log an event</p>
              <form action={addMemberTimelineEvent} className="mt-4 space-y-3">
                <input type="hidden" name="memberId" value={memberId} />
                <SelectField
                  label="Event type"
                  name="eventType"
                  defaultValue=""
                  options={[
                    { value: "", label: "Select type" },
                    { value: "pastoral_visit", label: "Pastoral visit" },
                    { value: "phone_call", label: "Phone call" },
                    { value: "prayer_request", label: "Prayer request" },
                    { value: "care_follow_up", label: "Care follow-up" },
                    { value: "salvation", label: "Salvation" },
                    { value: "baptism", label: "Baptism" },
                    { value: "small_group_join", label: "Joined small group" },
                    { value: "discipleship_class", label: "Discipleship class" },
                    { value: "serving_started", label: "Started serving" },
                    { value: "milestone", label: "Life milestone" },
                    { value: "note", label: "General note" },
                  ]}
                />
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Note</span>
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Brief description…"
                    className="mt-2 w-full resize-none rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
                >
                  Log event
                </button>
              </form>
            </article>
          </section>
        </div>
      ) : null}

      {/* ── Attendance ───────────────────────────────────────────────────── */}
      {activeTab === "attendance" ? (
        <section className="mt-6 rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Attendance history</p>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {attendance.length} records
            </span>
          </div>
          {attendance.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No attendance records yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-line">
              <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                <span>Service</span><span>Date</span><span>Mode</span>
              </div>
              {attendance.map((a) => (
                <div key={a.id} className="grid grid-cols-[1.4fr_0.9fr_0.7fr] gap-3 border-t border-line px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{a.service_name || "Service"}</span>
                  <span className="text-muted">{a.service_date}</span>
                  <ModeBadge mode={a.mode} />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* ── Groups ───────────────────────────────────────────────────────── */}
      {activeTab === "groups" ? (
        <section className="mt-6 space-y-5">
          <article className="rounded-[1.6rem] border border-line bg-paper p-6">
            <p className="text-sm font-semibold text-foreground">Group memberships</p>
            {groups.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Not assigned to any group yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.id} className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{g.name}</p>
                    <p className="mt-1 text-xs capitalize text-muted">
                      {g.group_type} · {g.role} · since {String(g.joined_at || "").slice(0, 10)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
          {allGroups.length > 0 ? (
            <article className="rounded-[1.6rem] border border-line bg-paper p-6">
              <p className="text-sm font-semibold text-foreground">Add to group</p>
              <form action={addMemberToGroup} className="mt-4 flex flex-wrap gap-3">
                <input type="hidden" name="memberId" value={memberId} />
                <select
                  name="groupId"
                  className="flex-1 rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
                >
                  <option value="">Select a group</option>
                  {allGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.group_type})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
                >
                  Add
                </button>
              </form>
            </article>
          ) : null}
        </section>
      ) : null}

      {/* ── Pledges ──────────────────────────────────────────────────────── */}
      {activeTab === "pledges" ? (
        <section className="mt-6 rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Financial commitments</p>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {pledges.length} pledge{pledges.length === 1 ? "" : "s"}
            </span>
          </div>
          {pledges.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No pledges recorded. Add pledges from Finance.</p>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-line">
                <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.6fr] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>Fund</span><span>Amount</span><span>Period</span><span>Status</span>
                </div>
                {pledges.map((p) => (
                  <div key={p.id} className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.6fr] gap-3 border-t border-line px-4 py-3 text-sm text-muted">
                    <span className="font-medium text-foreground">{p.fund_name || "—"}</span>
                    <span>{formatMoney(p.amount)}</span>
                    <span>{p.start_date || "—"} → {p.end_date || "open"}</span>
                    <span className="uppercase tracking-[0.12em]">{p.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[1.1rem] border border-line bg-canvas px-4 py-3">
                <p className="text-xs text-muted">
                  Total pledged:{" "}
                  <span className="font-semibold text-foreground">
                    {formatMoney(pledges.reduce((s, p) => s + Number(p.amount || 0), 0))}
                  </span>
                </p>
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      {activeTab === "timeline" ? (
        <section className="mt-6 rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Engagement timeline</p>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">{events.length} events</span>
          </div>
          {events.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No events yet. Log from the Overview tab.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="flex gap-4 rounded-[1.2rem] border border-line bg-canvas px-5 py-4"
                >
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {(event.event_type || "event").replace(/_/g, " ")}
                      </p>
                      <span className="shrink-0 text-xs text-muted">
                        {String(event.created_at || "").slice(0, 10)}
                      </span>
                    </div>
                    {event.event_payload?.note ? (
                      <p className="mt-1 text-sm leading-6 text-muted">{event.event_payload.note}</p>
                    ) : null}
                    {event.event_payload?.loggedBy ? (
                      <p className="mt-1 text-xs text-muted">by {event.event_payload.loggedBy}</p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

function TypeBadge({ type }) {
  return (
    <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold capitalize tracking-[0.14em] text-muted">
      {(type || "member").replace(/_/g, " ")}
    </span>
  );
}

function ModeBadge({ mode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] ${
        mode === "physical"
          ? "border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
          : "border border-line bg-canvas text-muted"
      }`}
    >
      {mode || "—"}
    </span>
  );
}

function Milestone({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
      {children}
    </span>
  );
}

function Field({ label, name, type = "text", defaultValue }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
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
        className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
