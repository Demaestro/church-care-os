import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { listGroups } from "@/lib/group-store";
import { createGroup } from "@/app/actions";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Groups" };

export default async function GroupsPage() {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const cookieStore = await cookies();
  const workspace = getWorkspaceContext(
    user,
    cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || ""
  );
  const activeBranchId =
    workspace.activeBranch?.id ||
    (user.accessScope === "organization" ? "" : user.branchId);
  const groups = listGroups({
    organizationId: user.organizationId,
    branchId: activeBranchId,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Community Groups
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">Groups</h1>
          <p className="mt-2 text-sm text-muted">
            Track small groups, departments, and fellowships in one place.
          </p>
        </div>
      </div>

      <form action={createGroup} className="mb-8 grid gap-4 rounded-[1.5rem] border border-line bg-paper p-6 lg:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-foreground">Group name</span>
          <input
            name="name"
            placeholder="Choir, Men&apos;s Fellowship, Teens"
            className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Group type</span>
          <input
            name="groupType"
            placeholder="Department, Life Stage, Small Group"
            className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
          >
            Create group
          </button>
        </div>
      </form>

      {groups.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-canvas px-8 py-12 text-center text-muted">
          No groups yet. Add a department or fellowship to begin.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-[1.5rem] border border-line bg-paper p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {group.group_type}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">{group.name}</h2>
              <p className="mt-2 text-sm text-muted">
                {group.member_count || 0} member{group.member_count === 1 ? "" : "s"} connected
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
