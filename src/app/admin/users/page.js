import {
  createUserAccount,
  resetUserPassword,
  resolveRecoveryRequest,
  updateUserAccess,
} from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { getRoleLabel, requireCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/auth-store";
import { listMinistryTeams, listRecoveryRequests } from "@/lib/organization-store";
import { internalRoleOptions } from "@/lib/policies";

export const metadata = {
  title: "People",
  description:
    "Manage user access, role assignments, and manual account recovery for internal care staff.",
};

export default async function AdminUsersPage({ searchParams }) {
  const currentUser = await requireCurrentUser(["pastor", "owner"]);
  const params = await searchParams;
  const users = listUsers();
  const teams = listMinistryTeams();
  const recoveryRequests = listRecoveryRequests();
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const roleOptions =
    currentUser.role === "owner"
      ? internalRoleOptions
      : internalRoleOptions.filter((option) =>
          ["leader", "volunteer"].includes(option.value)
        );
  const laneSuggestions = Array.from(
    new Set(teams.map((team) => team.lane).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second));
  const activeUsers = users.filter((user) => user.active);
  const openRecoveryRequests = recoveryRequests.filter(
    (request) => request.status === "open"
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Access control
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              People, roles, and recovery oversight.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Manage who can enter internal care workflows, what lane they operate
              inside, and how account recovery gets handled with pastoral care
              rather than guesswork.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[26rem]">
            <MetricCard label="Active accounts" value={activeUsers.length} />
            <MetricCard label="Open recovery requests" value={openRecoveryRequests.length} />
            <MetricCard
              label="Volunteers"
              value={users.filter((user) => user.role === "volunteer" && user.active).length}
            />
            <MetricCard
              label="Leaders"
              value={users.filter((user) => user.role === "leader" && user.active).length}
            />
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner notice={notice} error={error} />
        </div>
      </section>

      <datalist id="lane-options">
        {laneSuggestions.map((lane) => (
          <option key={lane} value={lane} />
        ))}
      </datalist>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow="Create account"
            title="Add an internal care user"
            body="Create owner, pastor, leader, or volunteer accounts from one place. Pastors can create leaders and volunteers; owners can create any role."
          />

          <form action={createUserAccount} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" name="name" placeholder="Sister Ngozi Okafor" />
              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="ngozi@gracecommunity.church"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Role" name="role" options={roleOptions} />
              <Field
                label="Lane or team lane"
                name="lane"
                placeholder="Mercy & welfare lane"
                list="lane-options"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Volunteer display name"
                name="volunteerName"
                placeholder="Shown in volunteer task view"
              />
              <Field
                label="Temporary password"
                name="password"
                type="password"
                placeholder="Create a strong password"
              />
            </div>

            <ToggleField
              label="Activate immediately"
              name="active"
              defaultChecked
              detail="Turn this off only if you want to create the profile before access goes live."
            />

            <SubmitButton
              idleLabel="Create account"
              pendingLabel="Creating account..."
              className="inline-flex items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        </article>

        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow="Recovery queue"
            title="Handle password recovery manually"
            body="Requests from the public recovery form land here for review. Reset a password only after you have verified the requester."
          />

          <div className="mt-6 space-y-4">
            {recoveryRequests.length === 0 ? (
              <EmptyCard body="No recovery requests have been submitted yet." />
            ) : (
              recoveryRequests.map((request) => {
                const matchedUser = users.find((user) => user.email === request.email);
                const canManageMatchedUser =
                  matchedUser && canManageRole(currentUser.role, matchedUser.role);

                return (
                  <article
                    key={request.id}
                    className="rounded-[1.35rem] border border-line bg-canvas p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {request.requesterName || "Recovery request"}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-muted">{request.email}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getRecoveryStatusClass(request.status)}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-muted">
                      Requested {request.requestedLabel}
                    </p>

                    {request.note ? (
                      <p className="mt-3 text-sm leading-7 text-foreground">{request.note}</p>
                    ) : null}

                    <div className="mt-4 rounded-[1rem] border border-line bg-paper p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">
                        Matched account
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {matchedUser
                          ? `${matchedUser.name} - ${getRoleLabel(matchedUser.role)}`
                          : "No internal account matches this email yet."}
                      </p>
                    </div>

                    {matchedUser && canManageMatchedUser ? (
                      <form
                        action={resetUserPassword.bind(null, matchedUser.id)}
                        className="mt-4 space-y-3 rounded-[1rem] border border-line bg-paper p-4"
                      >
                        <input type="hidden" name="recoveryRequestId" value={request.id} />
                        <Field
                          label="New password"
                          name="password"
                          type="password"
                          placeholder="Set a new temporary password"
                        />
                        <Field
                          label="Resolution note"
                          name="resolutionNote"
                          placeholder="Verified identity by phone and issued a temporary password."
                          defaultValue={`Password reset issued for ${matchedUser.email}.`}
                        />
                        <SubmitButton
                          idleLabel="Reset password and resolve"
                          pendingLabel="Resetting password..."
                          className="inline-flex items-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
                        />
                      </form>
                    ) : null}

                    <form
                      action={resolveRecoveryRequest.bind(null, request.id)}
                      className="mt-4 space-y-3 rounded-[1rem] border border-line bg-paper p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[0.42fr_0.58fr]">
                        <SelectField
                          label="Status"
                          name="status"
                          defaultValue={request.status}
                          options={[
                            { value: "resolved", label: "Resolved" },
                            { value: "dismissed", label: "Dismissed" },
                            { value: "issued", label: "Password issued" },
                          ]}
                        />
                        <Field
                          label="Admin note"
                          name="resolutionNote"
                          placeholder="Record what was verified or why this was closed."
                          defaultValue={request.resolutionNote}
                        />
                      </div>
                      <SubmitButton
                        idleLabel="Update request"
                        pendingLabel="Updating..."
                        className="inline-flex items-center rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1] disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </form>
                  </article>
                );
              })
            )}
          </div>
        </article>
      </section>

      <section className="mt-8 space-y-4">
        <SectionHeading
          eyebrow="Directory"
          title="Review each internal account"
          body="Every account card below can be adjusted in place. Owners can manage every role. Pastors can manage leaders and volunteers."
        />

        {users.map((account) => {
          const canManage = canManageRole(currentUser.role, account.role);

          return (
            <article
              key={account.id}
              className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                    {account.name}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted">{account.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <RolePill role={account.role} />
                    <StatusPill active={account.active} />
                    {account.lane ? (
                      <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {account.lane}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1rem] bg-canvas px-4 py-3 text-sm leading-7 text-muted">
                  Created {new Date(account.createdAt).toLocaleDateString("en-GB")}
                </div>
              </div>

              {canManage ? (
                <div className="mt-6 grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
                  <form
                    action={updateUserAccess.bind(null, account.id)}
                    className="space-y-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Full name" name="name" defaultValue={account.name} />
                      <Field
                        label="Email"
                        name="email"
                        type="email"
                        defaultValue={account.email}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="Role"
                        name="role"
                        defaultValue={account.role}
                        options={roleOptions}
                      />
                      <Field
                        label="Lane"
                        name="lane"
                        defaultValue={account.lane}
                        placeholder="Mercy & welfare lane"
                        list="lane-options"
                      />
                    </div>

                    <Field
                      label="Volunteer display name"
                      name="volunteerName"
                      defaultValue={account.volunteerName}
                      placeholder="Only needed for volunteer accounts"
                    />

                    <ToggleField
                      label="Account is active"
                      name="active"
                      defaultChecked={account.active}
                      detail="Inactive users remain in the database but cannot sign in."
                    />

                    <SubmitButton
                      idleLabel="Save access changes"
                      pendingLabel="Saving changes..."
                      className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </form>

                  <form
                    action={resetUserPassword.bind(null, account.id)}
                    className="space-y-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                      Password reset
                    </p>
                    <p className="text-sm leading-7 text-muted">
                      Issue a new temporary password when the team member has been
                      verified offline.
                    </p>
                    <Field
                      label="New password"
                      name="password"
                      type="password"
                      placeholder="Set a new password"
                    />
                    <SubmitButton
                      idleLabel="Set new password"
                      pendingLabel="Updating password..."
                      className="inline-flex items-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </form>
                </div>
              ) : (
                <div className="mt-6 rounded-[1.35rem] border border-line bg-canvas p-5">
                  <p className="text-sm leading-7 text-muted">
                    This account is visible for oversight, but only an owner can
                    manage users at this role level.
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function canManageRole(actorRole, role) {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "pastor") {
    return ["leader", "volunteer"].includes(role);
  }

  return false;
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.35rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function SectionHeading({ eyebrow, title, body }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  list,
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        list={list}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
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
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({ label, name, detail, defaultChecked }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[1rem] border border-line bg-paper px-4 py-4">
      <span className="max-w-2xl">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-sm leading-7 text-muted">{detail}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 accent-[#496a4d]"
      />
    </label>
  );
}

function RolePill({ role }) {
  return (
    <span className="rounded-full border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
      {getRoleLabel(role)}
    </span>
  );
}

function StatusPill({ active }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        active
          ? "border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss"
          : "border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function EmptyCard({ body }) {
  return (
    <div className="rounded-[1.35rem] border border-line bg-canvas p-5">
      <p className="text-sm leading-7 text-muted">{body}</p>
    </div>
  );
}

function getRecoveryStatusClass(status) {
  switch (status) {
    case "issued":
      return "border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss";
    case "dismissed":
      return "border border-[rgba(34,28,22,0.08)] bg-[rgba(34,28,22,0.04)] text-muted";
    case "resolved":
      return "border border-[rgba(179,138,69,0.18)] bg-[rgba(179,138,69,0.12)] text-[#7a6128]";
    default:
      return "border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay";
  }
}
