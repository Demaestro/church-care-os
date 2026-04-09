import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { listMembers } from "@/lib/member-store";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const members = listMembers({
    organizationId: user.organizationId,
    branchId: workspace.activeBranch?.id || user.branchId,
    limit: 200,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Member Directory
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">Members</h1>
          <p className="mt-2 text-sm text-muted">
            View member profiles, engagement milestones, and campus connections.
          </p>
        </div>
        <Link
          href="/register"
          className="inline-flex items-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
        >
          Add member
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-canvas px-8 py-12 text-center text-muted">
          No members yet. Invite members to create their accounts to populate the directory.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-line bg-paper">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-[0.2em] text-muted">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    <Link href={`/members/${member.id}`} className="hover:underline">
                      {member.full_name || member.fullName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {member.email || member.phone || "—"}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {member.member_type || member.memberType || "member"}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {String(member.created_at || member.createdAt || "").slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
