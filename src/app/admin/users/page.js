import {
  createUserAccount,
  resetUserPassword,
  resolveRecoveryRequest,
  updateUserAccess,
} from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getLocaleTag } from "@/lib/app-preferences";
import { listUsers } from "@/lib/auth-store";
import { getCopy, translateRecoveryStatus, translateRoleLabel } from "@/lib/i18n";
import { listMinistryTeams, listRecoveryRequests } from "@/lib/organization-store";
import { internalRoleOptions } from "@/lib/policies";

export const metadata = {
  title: "People",
  description:
    "Manage user access, role assignments, and manual account recovery for internal care staff.",
};

export default async function AdminUsersPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.people;
  const localeTag = getLocaleTag(preferences.language);
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
  const localizedRoleOptions = roleOptions.map((option) => ({
    ...option,
    label: translateRoleLabel(option.value, preferences.language),
  }));
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
              {pageCopy.kicker}
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              {pageCopy.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              {pageCopy.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[26rem]">
            <MetricCard label={pageCopy.metrics.activeAccounts} value={activeUsers.length} />
            <MetricCard
              label={pageCopy.metrics.openRecoveryRequests}
              value={openRecoveryRequests.length}
            />
            <MetricCard
              label={pageCopy.metrics.volunteers}
              value={users.filter((user) => user.role === "volunteer" && user.active).length}
            />
            <MetricCard
              label={pageCopy.metrics.leaders}
              value={users.filter((user) => user.role === "leader" && user.active).length}
            />
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle={copy.common.flashNotice}
            errorTitle={copy.common.flashError}
          />
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
            eyebrow={pageCopy.createAccount.eyebrow}
            title={pageCopy.createAccount.title}
            body={pageCopy.createAccount.body}
          />

          <form action={createUserAccount} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={pageCopy.fields.fullName}
                name="name"
                placeholder={pageCopy.placeholders.fullName}
              />
              <Field
                label={pageCopy.fields.email}
                name="email"
                type="email"
                placeholder={pageCopy.placeholders.email}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label={pageCopy.fields.role}
                name="role"
                options={localizedRoleOptions}
              />
              <Field
                label={pageCopy.fields.lane}
                name="lane"
                placeholder={pageCopy.placeholders.lane}
                list="lane-options"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={pageCopy.fields.volunteerDisplayName}
                name="volunteerName"
                placeholder={pageCopy.placeholders.volunteerDisplayName}
              />
              <Field
                label={pageCopy.fields.temporaryPassword}
                name="password"
                type="password"
                placeholder={pageCopy.placeholders.temporaryPassword}
              />
            </div>

            <ToggleField
              label={pageCopy.fields.activateImmediately}
              name="active"
              defaultChecked
              detail={pageCopy.fields.activateImmediatelyDetail}
            />

            <SubmitButton
              idleLabel={pageCopy.createButton}
              pendingLabel={pageCopy.creatingButton}
              className="inline-flex items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        </article>

        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow={pageCopy.recovery.eyebrow}
            title={pageCopy.recovery.title}
            body={pageCopy.recovery.body}
          />

          <div className="mt-6 space-y-4">
            {recoveryRequests.length === 0 ? (
              <EmptyCard body={pageCopy.recovery.none} />
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
                          {request.requesterName || pageCopy.recovery.recoveryRequest}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-muted">{request.email}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getRecoveryStatusClass(request.status)}`}
                      >
                        {translateRecoveryStatus(request.status, preferences.language)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-muted">
                      {pageCopy.recovery.requested} {request.requestedLabel}
                    </p>

                    {request.note ? (
                      <p className="mt-3 text-sm leading-7 text-foreground">{request.note}</p>
                    ) : null}

                    <div className="mt-4 rounded-[1rem] border border-line bg-paper p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">
                        {pageCopy.recovery.matchedAccount}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {matchedUser
                          ? `${matchedUser.name} - ${translateRoleLabel(
                              matchedUser.role,
                              preferences.language
                            )}`
                          : pageCopy.recovery.noMatchedAccount}
                      </p>
                    </div>

                    {matchedUser && canManageMatchedUser ? (
                      <form
                        action={resetUserPassword.bind(null, matchedUser.id)}
                        className="mt-4 space-y-3 rounded-[1rem] border border-line bg-paper p-4"
                      >
                        <input type="hidden" name="recoveryRequestId" value={request.id} />
                        <Field
                          label={pageCopy.fields.newPassword}
                          name="password"
                          type="password"
                          placeholder={pageCopy.placeholders.newPassword}
                        />
                        <Field
                          label={pageCopy.fields.resolutionNote}
                          name="resolutionNote"
                          placeholder={pageCopy.placeholders.verificationNote}
                          defaultValue={`Password reset issued for ${matchedUser.email}.`}
                        />
                        <SubmitButton
                          idleLabel={pageCopy.recovery.resetAndResolve}
                          pendingLabel={pageCopy.recovery.resetting}
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
                          label={pageCopy.fields.status}
                          name="status"
                          defaultValue={request.status}
                          options={[
                            {
                              value: "resolved",
                              label: pageCopy.recovery.statusOptions.resolved,
                            },
                            {
                              value: "dismissed",
                              label: pageCopy.recovery.statusOptions.dismissed,
                            },
                            {
                              value: "issued",
                              label: pageCopy.recovery.statusOptions.issued,
                            },
                          ]}
                        />
                        <Field
                          label={pageCopy.fields.adminNote}
                          name="resolutionNote"
                          placeholder={pageCopy.placeholders.resolutionNote}
                          defaultValue={request.resolutionNote}
                        />
                      </div>
                      <SubmitButton
                        idleLabel={pageCopy.recovery.updateRequest}
                        pendingLabel={pageCopy.recovery.updating}
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
          eyebrow={pageCopy.directory.eyebrow}
          title={pageCopy.directory.title}
          body={pageCopy.directory.body}
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
                    <RolePill role={account.role} language={preferences.language} />
                    <StatusPill active={account.active} copy={copy} />
                    {account.lane ? (
                      <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {account.lane}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1rem] bg-canvas px-4 py-3 text-sm leading-7 text-muted">
                  {pageCopy.directory.createdOn}{" "}
                  {new Date(account.createdAt).toLocaleDateString(localeTag)}
                </div>
              </div>

              {canManage ? (
                <div className="mt-6 grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
                  <form
                    action={updateUserAccess.bind(null, account.id)}
                    className="space-y-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label={pageCopy.fields.fullName}
                        name="name"
                        defaultValue={account.name}
                      />
                      <Field
                        label={pageCopy.fields.email}
                        name="email"
                        type="email"
                        defaultValue={account.email}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label={pageCopy.fields.role}
                        name="role"
                        defaultValue={account.role}
                        options={localizedRoleOptions}
                      />
                      <Field
                        label={pageCopy.fields.lane}
                        name="lane"
                        defaultValue={account.lane}
                        placeholder={pageCopy.placeholders.lane}
                        list="lane-options"
                      />
                    </div>

                    <Field
                      label={pageCopy.fields.volunteerDisplayName}
                      name="volunteerName"
                      defaultValue={account.volunteerName}
                      placeholder={pageCopy.placeholders.volunteerDisplayNameNeeded}
                    />

                    <ToggleField
                      label={pageCopy.fields.accountIsActive}
                      name="active"
                      defaultChecked={account.active}
                      detail={pageCopy.fields.accountIsActiveDetail}
                    />

                    <SubmitButton
                      idleLabel={pageCopy.directory.saveAccessChanges}
                      pendingLabel={pageCopy.directory.savingChanges}
                      className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </form>

                  <form
                    action={resetUserPassword.bind(null, account.id)}
                    className="space-y-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                      {pageCopy.fields.passwordReset}
                    </p>
                    <p className="text-sm leading-7 text-muted">
                      {pageCopy.fields.passwordResetBody}
                    </p>
                    <Field
                      label={pageCopy.fields.newPassword}
                      name="password"
                      type="password"
                      placeholder={pageCopy.placeholders.newPassword}
                    />
                    <SubmitButton
                      idleLabel={pageCopy.directory.setNewPassword}
                      pendingLabel={pageCopy.directory.updatingPassword}
                      className="inline-flex items-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </form>
                </div>
              ) : (
                <div className="mt-6 rounded-[1.35rem] border border-line bg-canvas p-5">
                  <p className="text-sm leading-7 text-muted">
                    {pageCopy.directory.oversightOnly}
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

function RolePill({ role, language }) {
  return (
    <span className="rounded-full border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
      {translateRoleLabel(role, language)}
    </span>
  );
}

function StatusPill({ active, copy }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        active
          ? "border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss"
          : "border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay"
      }`}
    >
      {active ? copy.common.active : copy.common.inactive}
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
