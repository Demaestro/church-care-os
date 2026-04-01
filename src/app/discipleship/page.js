import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { listDiscipleshipRecords, getDiscipleshipStats } from "@/lib/discipleship-store";

export const metadata = { title: "Discipleship Pathways" };

const STAGES = [
  { key: "new_believer",  label: "New Believer",    dot: "bg-moss",       text: "text-moss" },
  { key: "foundation",   label: "Foundation",       dot: "bg-blue-500",   text: "text-blue-600" },
  { key: "growing",      label: "Growing",          dot: "bg-amber-500",  text: "text-gold" },
  { key: "serving",      label: "Serving",          dot: "bg-purple-500", text: "text-purple-600" },
  { key: "mentoring",    label: "Mentoring Others", dot: "bg-green-600",  text: "text-green-700" },
];

export default async function DiscipleshipPage() {
  const user = await requireCurrentUser(["pastor","overseer","owner","branch_admin","leader","general_overseer"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = user.organizationId;

  const records = listDiscipleshipRecords(orgId, branchId, { limit: 200 });
  const stats = getDiscipleshipStats(orgId, branchId);

  const byStage = {};
  for (const s of STAGES) byStage[s.key] = [];
  for (const r of records) {
    if (byStage[r.stage]) byStage[r.stage].push(r);
    else byStage["new_believer"].push(r);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Pathways</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Discipleship</h1>
          <p className="mt-1 text-sm text-muted">{stats.total} people being discipled</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STAGES.map(stage => (
          <div key={stage.key}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${stage.text}`}>{stage.label}</p>
              <span className="text-xs text-muted">({stats.byStage[stage.key] || 0})</span>
            </div>
            <div className="space-y-2">
              {byStage[stage.key].length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-line px-3 py-5 text-center text-xs text-muted">
                  Empty
                </div>
              ) : (
                byStage[stage.key].map(r => (
                  <Link key={r.id} href={`/households/${r.householdSlug}`} className="block rounded-[1rem] border border-line bg-paper px-3 py-3 transition hover:border-[var(--soft-accent-border)] hover:bg-canvas">
                    <p className="text-xs font-semibold text-foreground">{r.householdName}</p>
                    {r.assignedLeaderName && <p className="mt-0.5 text-xs text-muted">{r.assignedLeaderName}</p>}
                    {r.nextStep && <p className="mt-1 text-xs italic text-muted">{r.nextStep}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.baptized && <span className="rounded px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700">Baptized</span>}
                      {r.smallGroupConnected && <span className="rounded px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700">Small group</span>}
                      {r.serving && <span className="rounded px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700">Serving</span>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
