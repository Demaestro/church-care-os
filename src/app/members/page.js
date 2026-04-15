import Link from "next/link";
import { cookies } from "next/headers";
import { createMemberAction } from "@/app/actions";
import AiChatPanel from "@/components/AiChatPanel";
import { requireCurrentUser } from "@/lib/auth";
import { listMembers } from "@/lib/member-store";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Members" };

const MEMBER_TYPES = [
  { value: "", label: "All types" },
  { value: "member", label: "Member" },
  { value: "regular_attendee", label: "Regular Attendee" },
  { value: "new_convert", label: "New Convert" },
  { value: "first_timer", label: "First Timer" },
  { value: "transfer", label: "Transfer" },
  { value: "inactive", label: "Inactive" },
];

export default async function MembersPage({ searchParams }) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const sp = await searchParams;

  const query = typeof sp?.q === "string" ? sp.q.trim() : "";
  const memberType = typeof sp?.type === "string" ? sp.type : "";
  const gender = typeof sp?.gender === "string" ? sp.gender : "";
  const showAdd = sp?.add === "1";

  const branchId = workspace.activeBranch?.id || user.branchId;

  const members = listMembers({
    organizationId: user.organizationId,
    branchId,
    limit: 300,
    query: query || undefined,
    memberType: memberType || undefined,
    gender: gender || undefined,
  });

  const hasFilters = query || memberType || gender;

  // Type distribution for quick stats
  const typeCount = members.reduce((acc, m) => {
    const t = m.member_type || "member";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Member Directory
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">Members</h1>
          <p className="mt-2 text-sm text-muted">
            {members.length} member{members.length === 1 ? "" : "s"}
            {hasFilters ? " matching filters" : ""}
            {workspace.activeBranch ? ` · ${workspace.activeBranch.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/members"
            download
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--elevated)] px-4 py-2 text-sm font-semibold text-foreground transition hover:border-[var(--gold-text)] hover:text-[var(--gold-text)]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </a>
          <a
            href="/members?add=1"
            className="inline-flex items-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
          >
            + Add member
          </a>
        </div>
      </div>

      {/* Quick type stats */}
      {Object.keys(typeCount).length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-3">
          {Object.entries(typeCount).map(([type, count]) => (
            <a
              key={type}
              href={`/members?type=${type}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                memberType === type
                  ? "border-foreground bg-foreground text-paper"
                  : "border-line bg-canvas text-muted hover:bg-paper"
              }`}
            >
              {type.replace(/_/g, " ")} · {count}
            </a>
          ))}
        </div>
      ) : null}

      {/* Search + filter bar */}
      <form method="GET" action="/members" className="mb-6 rounded-[1.35rem] border border-line bg-canvas p-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by name, email, or phone…"
            className="flex-[2] min-w-0 rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          />
          <select
            name="type"
            defaultValue={memberType}
            className="rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          >
            {MEMBER_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            name="gender"
            defaultValue={gender}
            className="rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
          >
            Search
          </button>
          {hasFilters ? (
            <a
              href="/members"
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
            >
              Clear
            </a>
          ) : null}
        </div>
      </form>

      {/* Add member form (collapsible via URL param) */}
      {showAdd ? (
        <div className="mb-6 rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Add a new member</p>
            <a href="/members" className="text-sm text-muted hover:text-foreground">✕ Close</a>
          </div>
          <form action={createMemberAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="text-sm font-medium text-foreground">Full name *</span>
              <input
                name="fullName"
                required
                placeholder="Adeola Benson"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Email</span>
              <input
                name="email"
                type="email"
                placeholder="adeola@example.com"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Phone</span>
              <input
                name="phone"
                placeholder="+234 800 000 0000"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Gender</span>
              <select
                name="gender"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              >
                <option value="">Unspecified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Member type</span>
              <select
                name="memberType"
                defaultValue="member"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              >
                {MEMBER_TYPES.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Date of birth</span>
              <input
                name="birthdate"
                type="date"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-6 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                Create member
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Members table */}
      {members.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-canvas px-8 py-12 text-center">
          <p className="text-muted">
            {hasFilters
              ? "No members match those filters."
              : "No members yet. Use the Add button to start building the directory."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-line bg-paper">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-[0.2em] text-muted">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4 hidden md:table-cell">Contact</th>
                <th className="px-6 py-4 hidden sm:table-cell">Type</th>
                <th className="px-6 py-4 hidden lg:table-cell">Gender</th>
                <th className="px-6 py-4 hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-canvas transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/members/${member.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {member.full_name || member.fullName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted hidden md:table-cell">
                    {member.email || member.phone || "—"}
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-xs font-semibold capitalize text-muted">
                      {(member.member_type || member.memberType || "member").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted capitalize hidden lg:table-cell">
                    {member.gender || "—"}
                  </td>
                  <td className="px-6 py-4 text-muted hidden lg:table-cell">
                    {String(member.created_at || member.createdAt || "").slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AiChatPanel agentType="secretary" />
    </div>
  );
}
