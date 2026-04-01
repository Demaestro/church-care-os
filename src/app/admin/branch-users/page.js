/**
 * /admin/branch-users
 *
 * Branch Admin user management — scoped to the branch_admin's own branch only.
 * Allows: invite new staff, change roles within branch, lock/unlock accounts.
 * Cannot: create owner/overseer accounts, see other branches, see org-wide audit logs.
 */

import { cookies } from "next/headers";
import {
  createUserAccount,
  lockUserAccount,
  unlockUserAccount,
  revokeUserSessions,
  sendAccountInviteLink,
  updateUserAccess,
} from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/auth-store";
import { getCopy, translateRoleLabel } from "@/lib/i18n";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Branch People",
  description: "Manage staff accounts, roles, and access for your branch.",
};

/** Roles a branch_admin may assign — no HQ or overseer roles */
const BRANCH_ASSIGNABLE_ROLES = [
  { value: "volunteer",    label: "Volunteer" },
  { value: "leader",       label: "Care Leader" },
  { value: "pastor",       label: "Pastor" },
  { value: "branch_admin", label: "Branch Admin" },
];

export default async function BranchUsersPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const user = await requireCurrentUser([
    "branch_admin",
    "pastor",
    "overseer",
    "owner",
  ]);

  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const branchName = workspace.activeBranch?.name || "Your branch";
  const organizationId = workspace.organization.id;

  const params = await searchParams;
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error  = typeof params?.error  === "string" ? params.error  : "";
  const query  = typeof params?.q      === "string" ? params.q.trim() : "";

  // Load users scoped strictly to this branch
  const allUsers = listUsers({ organizationId, branchId }).filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const activeUsers   = allUsers.filter((u) => u.active);
  const inactiveUsers = allUsers.filter((u) => !u.active);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="surface-card p-8 lg:p-10">
        <p className="eyebrow">{branchName}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          Branch People
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Manage who has access to your branch workspace. You can invite new staff, update their
          roles, and lock accounts that are no longer needed.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss">
            <span className="h-2 w-2 rounded-full bg-moss" />
            {activeUsers.length} active
          </div>
          {inactiveUsers.length > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-[var(--case-routine-bg)] px-4 py-2 text-sm font-semibold text-muted">
              <span className="h-2 w-2 rounded-full bg-muted" />
              {inactiveUsers.length} inactive
            </div>
          )}
        </div>

        <div className="mt-6">
          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle="Done"
            errorTitle="Could not complete"
          />
        </div>
      </section>

      {/* ── Invite / create new user ─────────────────────────────────────── */}
      <section className="mt-8 surface-card p-6 lg:p-8">
        <div className="mb-6">
          <p className="eyebrow">Add team member</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Invite new branch staff
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            Create an account for a new volunteer, care leader, or pastor. They will receive a
            welcome email with a temporary password.
          </p>
        </div>

        <form action={createUserAccount} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="branchId"      value={branchId} />
          <input type="hidden" name="organizationId" value={organizationId} />

          <Field label="Full name"     name="name"  placeholder="Grace Adeyemi" required />
          <Field label="Email address" name="email" type="email" placeholder="grace@church.example" required />
          <Field label="Phone (optional)" name="phone" type="tel" placeholder="+234 801 234 5678" />

          <div>
            <label className="block text-sm font-medium text-foreground" htmlFor="invite-role">
              Role
            </label>
            <select
              id="invite-role"
              name="role"
              required
              className="mt-2 w-full rounded-[var(--radius-md)] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss focus:shadow-[0_0_0_3px_var(--soft-fill)]"
            >
              {BRANCH_ASSIGNABLE_ROLES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <SubmitButton
              idleLabel="Create account"
              pendingLabel="Creating account…"
              className="btn-primary"
            />
          </div>
        </form>
      </section>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <form method="GET" className="flex items-center gap-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name, email, or role…"
            className="input-field max-w-sm"
          />
          <button type="submit" className="btn-secondary text-sm">
            Search
          </button>
          {query && (
            <a href="/admin/branch-users" className="btn-ghost text-sm text-clay">
              Clear
            </a>
          )}
        </form>
      </section>

      {/* ── Active users list ────────────────────────────────────────────── */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-1 pb-3">
          <p className="eyebrow">Active staff ({activeUsers.length})</p>
        </div>

        {activeUsers.length === 0 ? (
          <EmptyState
            title="No active staff found"
            body={query ? "Try a different search." : "Invite your first team member above."}
          />
        ) : (
          <div className="surface-card overflow-hidden p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    branchId={branchId}
                    organizationId={organizationId}
                    currentUserId={user.id}
                    roleOptions={BRANCH_ASSIGNABLE_ROLES}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Inactive users list ──────────────────────────────────────────── */}
      {inactiveUsers.length > 0 && (
        <section className="mt-10">
          <div className="px-1 pb-3">
            <p className="eyebrow">Inactive / locked ({inactiveUsers.length})</p>
          </div>
          <div className="surface-card overflow-hidden p-0 opacity-75">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inactiveUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    branchId={branchId}
                    organizationId={organizationId}
                    currentUserId={user.id}
                    roleOptions={BRANCH_ASSIGNABLE_ROLES}
                    inactive
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserRow({ user, currentUserId, roleOptions, branchId, organizationId, inactive = false }) {
  const isSelf = user.id === currentUserId;

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--moss) 0%, #1e40af 100%)",
            }}
          >
            {getInitials(user.name)}
          </span>
          <div>
            <p className="font-semibold text-foreground">
              {user.name}
              {isSelf && (
                <span className="ml-2 rounded-full bg-[var(--soft-fill)] px-2 py-0.5 text-xs font-semibold text-moss">
                  You
                </span>
              )}
            </p>
            {user.lastLoginAt && (
              <p className="text-xs text-muted">
                Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </td>
      <td>
        {isSelf ? (
          <span className="badge badge-new">{user.role}</span>
        ) : (
          <form action={updateUserAccess} className="flex items-center gap-2">
            <input type="hidden" name="userId"         value={user.id} />
            <input type="hidden" name="branchId"       value={branchId} />
            <input type="hidden" name="organizationId" value={organizationId} />
            <select
              name="role"
              defaultValue={user.role}
              className="rounded-[var(--radius-sm)] border border-line bg-paper px-3 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-moss"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-ghost text-xs"
              style={{ minHeight: "1.75rem", padding: "0 0.75rem" }}
            >
              Save
            </button>
          </form>
        )}
      </td>
      <td className="text-muted text-sm">{user.email}</td>
      <td>
        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            <form action={sendAccountInviteLink}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="btn-ghost text-xs"
                style={{ minHeight: "1.75rem", padding: "0 0.75rem" }}
              >
                Resend invite
              </button>
            </form>

            {inactive ? (
              <form action={unlockUserAccount}>
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="btn-ghost text-xs"
                  style={{
                    minHeight: "1.75rem",
                    padding: "0 0.75rem",
                    color: "var(--moss)",
                  }}
                >
                  Reactivate
                </button>
              </form>
            ) : (
              <form action={lockUserAccount}>
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="btn-ghost text-xs"
                  style={{
                    minHeight: "1.75rem",
                    padding: "0 0.75rem",
                    color: "var(--clay)",
                  }}
                >
                  Lock
                </button>
              </form>
            )}

            <form action={revokeUserSessions}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="btn-ghost text-xs"
                style={{ minHeight: "1.75rem", padding: "0 0.75rem" }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}

function Field({ label, name, type = "text", placeholder, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-clay">*</span>}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="mt-2 input-field"
      />
    </label>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 py-14 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
        style={{ background: "var(--soft-fill)" }}
      >
        👥
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
