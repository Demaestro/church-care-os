import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/database";
import { getWorkspaceContext } from "@/lib/organization-store";
import { cookies } from "next/headers";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Pastoral Inbox" };

export default async function InboxPage() {
  const user = await requireCurrentUser(["pastor","overseer","owner","general_overseer","hq_care_admin"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = user.organizationId;

  const db = getDatabase();

  // Check if mark_sensitive column exists by querying PRAGMA
  let hasSensitive = false;
  try {
    const cols = db.prepare(`PRAGMA table_info(requests)`).all();
    hasSensitive = cols.some(c => c.name === "mark_sensitive");
  } catch {}

  const urgent = db.prepare(`
    SELECT id, household_name, household_slug, tone, status, created_at, summary
    FROM requests
    WHERE organization_id = ?
      AND (? = '' OR branch_id = ?)
      AND tone IN ('crisis','urgent')
      AND status NOT IN ('resolved','archived')
    ORDER BY created_at ASC
    LIMIT 20
  `).all(orgId, branchId, branchId);

  const sensitive = hasSensitive ? db.prepare(`
    SELECT id, household_name, household_slug, tone, status, created_at, summary
    FROM requests
    WHERE organization_id = ?
      AND (? = '' OR branch_id = ?)
      AND mark_sensitive = 1
      AND status NOT IN ('resolved','archived')
    ORDER BY created_at DESC
    LIMIT 20
  `).all(orgId, branchId, branchId) : [];

  const unassigned = db.prepare(`
    SELECT id, household_name, household_slug, tone, created_at, summary
    FROM requests
    WHERE organization_id = ?
      AND (? = '' OR branch_id = ?)
      AND (assigned_volunteer_json IS NULL OR assigned_volunteer_json = '' OR assigned_volunteer_json = 'null')
      AND status NOT IN ('resolved','archived')
      AND created_at < datetime('now', '-1 day')
    ORDER BY created_at ASC
    LIMIT 20
  `).all(orgId, branchId, branchId);

  const totalItems = urgent.length + sensitive.length + unassigned.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Pastoral</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Inbox</h1>
        <p className="mt-1 text-sm text-muted">{totalItems} item{totalItems !== 1 ? "s" : ""} need your attention</p>
      </div>

      <InboxSection title="Urgent escalations" items={urgent} emptyMessage="No urgent cases." accentClass="text-clay" />
      {hasSensitive && <InboxSection title="Sensitive cases" items={sensitive} emptyMessage="No sensitive cases." accentClass="text-gold" />}
      <InboxSection title="Unassigned (24h+)" items={unassigned} emptyMessage="All cases are assigned." accentClass="text-muted" />
    </div>
  );
}

function InboxSection({ title, items, emptyMessage, accentClass }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-3">
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${accentClass}`}>{title}</p>
        {items.length > 0 && (
          <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-xs font-semibold text-muted">{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-[1.1rem] border border-line bg-canvas px-5 py-4 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map(r => (
            <Link key={r.id} href={`/households/${r.household_slug}`} className="flex items-center justify-between rounded-[1.2rem] border border-line bg-paper px-5 py-4 transition hover:border-[var(--soft-accent-border)] hover:bg-canvas">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.household_name}</p>
                {r.summary && <p className="mt-0.5 truncate text-xs text-muted">{r.summary}</p>}
              </div>
              <span className={`ml-4 shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.tone === "crisis" ? "border-red-200 bg-red-50 text-red-700" : r.tone === "urgent" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-line bg-canvas text-muted"}`}>
                {r.tone || "routine"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
