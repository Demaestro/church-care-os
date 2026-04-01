import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { getFollowUpBoard } from "@/lib/care-store";

export const metadata = { title: "Follow-up Board" };

const OUTCOME_LABELS = {
  reached: "Reached",
  no_response: "No response",
  prayed: "Prayed with",
  referred: "Referred",
  practical: "Practical help",
  another_visit: "Another visit",
  discipleship: "Discipleship follow-up",
};

export default async function FollowUpBoardPage() {
  const user = await requireCurrentUser(["pastor","overseer","owner","branch_admin","leader","general_overseer","hq_care_admin","regional_overseer"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = user.organizationId;

  const board = getFollowUpBoard(orgId, branchId);
  const total = board.overdue.length + board.dueToday.length + board.dueThisWeek.length + board.noContact.length + board.later.length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Care workflow</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Follow-up Board</h1>
          <p className="mt-1 text-sm text-muted">{total} active case{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/requests/new" className="inline-flex items-center gap-2 rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]">
          + New request
        </Link>
      </div>

      <div className="space-y-10">
        <BoardSection title="Overdue" count={board.overdue.length} items={board.overdue} accentClass="text-clay" emptyMessage="No overdue follow-ups." />
        <BoardSection title="Due today" count={board.dueToday.length} items={board.dueToday} accentClass="text-gold" emptyMessage="Nothing due today." />
        <BoardSection title="Due this week" count={board.dueThisWeek.length} items={board.dueThisWeek} accentClass="text-moss" emptyMessage="Nothing due this week." />
        <BoardSection title="No contact in 14+ days" count={board.noContact.length} items={board.noContact} accentClass="text-muted" emptyMessage="All cases have recent contact." />
        {board.later.length > 0 && (
          <BoardSection title="Later" count={board.later.length} items={board.later} accentClass="text-muted" emptyMessage="" />
        )}
      </div>
    </div>
  );
}

function BoardSection({ title, count, items, accentClass, emptyMessage }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${accentClass}`}>{title}</p>
        {count > 0 && (
          <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-xs font-semibold text-muted">{count}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-[1.1rem] border border-line bg-canvas px-5 py-4 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map(r => <FollowUpCard key={r.id} record={r} />)}
        </div>
      )}
    </section>
  );
}

function FollowUpCard({ record }) {
  const tone = record.tone || "routine";
  const slug = record.household_slug || record.householdSlug || "";
  const name = record.household_name || record.householdName || "Household";
  const dueLabel = record.next_contact_due
    ? new Date(record.next_contact_due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  const outcomeLabel = record.last_contact_outcome ? OUTCOME_LABELS[record.last_contact_outcome] : null;

  return (
    <Link href={slug ? `/households/${slug}` : "/follow-up"} className="flex items-center gap-4 rounded-[1.2rem] border border-line bg-paper px-5 py-4 transition hover:border-[var(--soft-accent-border)] hover:bg-canvas">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone === "crisis" ? "bg-red-500" : tone === "urgent" ? "bg-amber-500" : "bg-line"}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <div className="mt-0.5 flex items-center gap-3">
          {record.follow_up_goal && <p className="truncate text-xs text-muted">{record.follow_up_goal}</p>}
          {outcomeLabel && <p className="shrink-0 text-xs text-muted">Last: {outcomeLabel}</p>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {dueLabel && <p className="text-xs font-medium text-foreground">{dueLabel}</p>}
        {record.follow_up_owner_name && <p className="mt-0.5 text-xs text-muted">{record.follow_up_owner_name}</p>}
      </div>
    </Link>
  );
}
