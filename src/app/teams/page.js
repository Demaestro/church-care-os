import { createMinistryTeam, updateMinistryTeam } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { listMinistryTeams } from "@/lib/organization-store";

export const metadata = {
  title: "Teams",
  description:
    "Configure ministry lanes, capabilities, and team ownership for routed care work.",
};

export default async function TeamsPage({ searchParams }) {
  await requireCurrentUser(["pastor", "owner"]);
  const params = await searchParams;
  const teams = listMinistryTeams();
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const activeTeams = teams.filter((team) => team.active);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Ministry routing
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Shape the lanes behind care handoffs.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Every routed case depends on clear lane ownership. Manage the teams,
              capabilities, and active volunteer surface that the rest of the app
              relies on.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[30rem]">
            <MetricCard label="Active teams" value={activeTeams.length} />
            <MetricCard
              label="Configured volunteers"
              value={teams.reduce((sum, team) => sum + team.volunteerCount, 0)}
            />
            <MetricCard
              label="Open routed cases"
              value={teams.reduce((sum, team) => sum + team.openRequestCount, 0)}
            />
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner notice={notice} error={error} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow="Create lane"
            title="Add a ministry team"
            body="Create a new lane when a type of care needs its own owner, capabilities, and volunteer capacity."
          />

          <form action={createMinistryTeam} className="mt-6 space-y-4">
            <Field label="Team name" name="name" placeholder="Prayer & encouragement team" />
            <Field label="Lane name" name="lane" placeholder="Prayer & encouragement lane" />
            <Field label="Lead name" name="leadName" placeholder="Pastor Emmanuel" />
            <Field
              label="Contact email"
              name="contactEmail"
              type="email"
              placeholder="care@gracecommunity.church"
            />
            <TextAreaField
              label="Description"
              name="description"
              placeholder="Describe what kind of care this lane should handle."
            />
            <Field
              label="Capabilities"
              name="capabilities"
              placeholder="Prayer, Encouragement, Phone follow-up"
            />
            <ToggleField
              label="Team is active"
              name="active"
              defaultChecked
              detail="Inactive teams stay visible in the configuration list but no longer represent live routing capacity."
            />
            <SubmitButton
              idleLabel="Create ministry team"
              pendingLabel="Creating team..."
              className="inline-flex items-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        </article>

        <div className="space-y-4">
          {teams.map((team) => (
            <article
              key={team.id}
              className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                    {team.name}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted">{team.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      {team.lane}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        team.active
                          ? "border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss"
                          : "border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay"
                      }`}
                    >
                      {team.active ? "Active" : "Inactive"}
                    </span>
                    {team.capabilities.map((capability) => (
                      <span
                        key={capability}
                        className="rounded-full border border-[rgba(34,28,22,0.08)] bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Leaders" value={team.leaderCount} />
                  <MetricCard label="Volunteers" value={team.volunteerCount} />
                  <MetricCard label="Open cases" value={team.openRequestCount} />
                  <MetricCard label="Assigned tasks" value={team.assignedTaskCount} />
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4 rounded-[1.35rem] border border-line bg-canvas p-5">
                  <InfoList
                    title="Lane leaders"
                    items={team.leaders.map((leader) => leader.name)}
                    emptyLabel="No leader accounts assigned yet."
                  />
                  <InfoList
                    title="Volunteer roster"
                    items={team.volunteers.map(
                      (volunteer) => volunteer.volunteerName || volunteer.name
                    )}
                    emptyLabel="No volunteers currently assigned to this lane."
                  />
                </div>

                <form
                  action={updateMinistryTeam.bind(null, team.id)}
                  className="space-y-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Team name" name="name" defaultValue={team.name} />
                    <Field label="Lane name" name="lane" defaultValue={team.lane} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Lead name" name="leadName" defaultValue={team.leadName} />
                    <Field
                      label="Contact email"
                      name="contactEmail"
                      type="email"
                      defaultValue={team.contactEmail}
                    />
                  </div>
                  <TextAreaField
                    label="Description"
                    name="description"
                    defaultValue={team.description}
                  />
                  <Field
                    label="Capabilities"
                    name="capabilities"
                    defaultValue={team.capabilities.join(", ")}
                  />
                  <ToggleField
                    label="Team is active"
                    name="active"
                    defaultChecked={team.active}
                    detail={`Last updated ${team.updatedLabel}.`}
                  />
                  <SubmitButton
                    idleLabel="Save team changes"
                    pendingLabel="Saving team..."
                    className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
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

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function Field({ label, name, defaultValue, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      />
    </label>
  );
}

function TextAreaField({ label, name, defaultValue, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      />
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

function InfoList({ title, items, emptyLabel }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-7 text-muted">{emptyLabel}</p>
      )}
    </div>
  );
}
