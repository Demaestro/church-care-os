import Link from "next/link";
import { notFound } from "next/navigation";
import { completeNewMemberJourney, dropNewMemberJourney, logContact } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getJourneyById, listJourneyContacts } from "@/lib/new-member-store";

const STAGE_STEPS = [
  "day_0",
  "day_2",
  "day_5",
  "day_12",
  "day_21",
  "day_30",
  "completed",
];

const STAGE_LABELS = {
  day_0: "Joined",
  day_2: "Day 2",
  day_5: "Day 5",
  day_12: "Day 12",
  day_21: "Day 21",
  day_30: "Day 30",
  completed: "Integrated",
  dropped: "Dropped",
};

const CONTACT_METHOD_LABELS = {
  call: "Phone call",
  text: "Text message",
  "in-person": "In person",
  visit: "Home visit",
};

const OUTCOME_LABELS = {
  reached: "Reached",
  voicemail: "Left voicemail",
  "no-answer": "No answer",
  visited: "Visited in person",
};

export async function generateMetadata({ params }) {
  const { id } = await params;
  const journey = getJourneyById(id);

  return {
    title: journey ? `${journey.memberName} Journey` : "Member Journey",
  };
}

export default async function MemberJourneyPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const user = await requireCurrentUser([
    "pastor",
    "overseer",
    "owner",
    "branch_admin",
    "general_overseer",
    "hq_care_admin",
    "regional_overseer",
    "leader",
    "volunteer",
  ]);
  const journey = getJourneyById(id);

  if (!journey) {
    notFound();
  }

  const contacts = listJourneyContacts(id);
  const notice =
    typeof resolvedSearchParams?.notice === "string"
      ? resolvedSearchParams.notice
      : "";
  const error =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : "";
  const currentStepIndex = Math.max(
    STAGE_STEPS.indexOf(journey.stage),
    journey.stage === "dropped" ? 0 : 0
  );
  const progressSignals = buildProgressSignals(journey, contacts);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <div className="mb-6">
        <Link
          href="/new-members"
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          Back to new members
        </Link>
      </div>

      <FlashBanner notice={notice} error={error} noticeTitle="Saved" errorTitle="Error" />

      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              New member journey
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              {journey.memberName}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Keep the first 30 days calm, visible, and owned. This page keeps the first follow-up,
              current stage, service signal, and contact history in one premium workspace.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
              {journey.memberEmail ? (
                <span className="rounded-full border border-line bg-canvas px-4 py-2">
                  {journey.memberEmail}
                </span>
              ) : null}
              {journey.memberPhone ? (
                <span className="rounded-full border border-line bg-canvas px-4 py-2">
                  {journey.memberPhone}
                </span>
              ) : null}
              {journey.gender !== "unspecified" ? (
                <span className="rounded-full border border-line bg-canvas px-4 py-2 capitalize">
                  {journey.gender}
                </span>
              ) : null}
              {journey.birthday ? (
                <span className="rounded-full border border-line bg-canvas px-4 py-2">
                  Birthday {formatBirthday(journey.birthday)}
                </span>
              ) : null}
              <span className="rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 font-semibold text-moss">
                {STAGE_LABELS[journey.stage] || journey.stage}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {journey.stage !== "completed" && journey.stage !== "dropped" ? (
              <>
                <form action={completeNewMemberJourney}>
                  <input type="hidden" name="journeyId" value={journey.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-[#059669] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#047857]"
                  >
                    Mark integrated
                  </button>
                </form>
                <form action={dropNewMemberJourney}>
                  <input type="hidden" name="journeyId" value={journey.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                  >
                    Mark dropped
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {progressSignals.map((signal) => (
            <MetricCard
              key={signal.label}
              label={signal.label}
              value={signal.value}
              detail={signal.detail}
              tone={signal.tone}
            />
          ))}
        </div>

        <div className="mt-8 rounded-[1.35rem] border border-line bg-canvas p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Journey progress</p>
          <div className="mt-5 grid gap-3 md:grid-cols-7">
            {STAGE_STEPS.map((step, index) => {
              const done = currentStepIndex > index;
              const current = currentStepIndex === index;

              return (
                <div
                  key={step}
                  className={`rounded-[1rem] border px-4 py-4 text-center ${
                    done
                      ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)]"
                      : current
                        ? "border-[rgba(73,106,77,0.24)] bg-paper"
                        : "border-line bg-paper"
                  }`}
                >
                  <div
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                      done
                        ? "bg-moss text-white"
                        : current
                          ? "border border-[rgba(73,106,77,0.24)] bg-[var(--soft-fill)] text-moss"
                          : "border border-line bg-canvas text-muted"
                    }`}
                  >
                    {done ? "OK" : index + 1}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {STAGE_LABELS[step]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <PanelCard
          title="Log a touchpoint"
          body="Record what happened, keep the pastoral next step clear, and avoid losing the member between follow-up moments."
        >
          <form action={logContact} className="space-y-5">
            <input type="hidden" name="journeyId" value={journey.id} />
            <input type="hidden" name="contactedByName" value={user.name} />
            <input type="hidden" name="contactedByUserId" value={user.id} />
            <input type="hidden" name="organizationId" value={journey.organizationId} />
            <input type="hidden" name="branchId" value={journey.branchId} />

            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Method"
                name="contactMethod"
                defaultValue="call"
                options={Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <SelectField
                label="Outcome"
                name="outcome"
                defaultValue="reached"
                options={Object.entries(OUTCOME_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>

            <Field
              label="Notes"
              name="notes"
              placeholder="How did the conversation go? What should happen next?"
              multiline
            />

            <SubmitButton
              idleLabel="Log contact"
              pendingLabel="Saving..."
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
            />
          </form>
        </PanelCard>

        <PanelCard
          title="Next step summary"
          body="Keep the member journey easy to scan before you open the longer timeline below."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SummaryItem
              label="Assigned volunteer"
              value={journey.assignedVolunteerName || "Not assigned yet"}
            />
            <SummaryItem
              label="Last contact"
              value={journey.lastContactAt ? formatDateTime(journey.lastContactAt) : "No contact logged yet"}
            />
            <SummaryItem
              label="Service signal"
              value={
                journey.sundayAttendanceCount > 0
                  ? `${journey.sundayAttendanceCount} service visit${journey.sundayAttendanceCount === 1 ? "" : "s"}`
                  : "No service attendance logged yet"
              }
            />
            <SummaryItem
              label="Journey note"
              value={journey.notes || "No additional journey note has been recorded yet."}
            />
          </div>
        </PanelCard>
      </section>

      <section className="mt-8">
        <PanelCard
          title="Contact history"
          body="Every logged touchpoint stays here so the next pastor or volunteer can continue without guesswork."
        >
          {contacts.length === 0 ? (
            <p className="text-sm leading-7 text-muted">
              No touchpoints have been logged yet. Use the form above to record the first contact.
            </p>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <article
                  key={contact.id}
                  className="rounded-[1.2rem] border border-line bg-canvas p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {CONTACT_METHOD_LABELS[contact.contactMethod] || contact.contactMethod}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        {contact.notes || "No note was added for this touchpoint."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {OUTCOME_LABELS[contact.outcome] || contact.outcome}
                      </p>
                      <p className="mt-3 text-xs text-muted">{formatDateTime(contact.contactedAt)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    Logged by {contact.contactedByName}
                  </p>
                </article>
              ))}
            </div>
          )}
        </PanelCard>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "default" }) {
  const toneClass =
    tone === "alert"
      ? "text-clay"
      : tone === "calm"
        ? "text-moss"
        : "text-foreground";

  return (
    <article className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-3 text-3xl tracking-[-0.04em] [font-family:var(--font-display)] ${toneClass}`}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
    </article>
  );
}

function PanelCard({ title, body, children }) {
  return (
    <section className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
      <div className="mb-5">
        <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, name, placeholder, multiline = false }) {
  const classes =
    "mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-[#8b847d] focus:border-moss";

  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          rows={4}
          placeholder={placeholder}
          className={`${classes} resize-y`}
        />
      ) : (
        <input
          type="text"
          name={name}
          placeholder={placeholder}
          className={classes}
        />
      )}
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
        className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
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

function SummaryItem({ label, value }) {
  return (
    <article className="rounded-[1rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-sm leading-7 text-foreground">{value}</p>
    </article>
  );
}

function buildProgressSignals(journey, contacts) {
  return [
    {
      label: "Contacts logged",
      value: journey.contactCount,
      detail: `${contacts.length} visible touchpoint${contacts.length === 1 ? "" : "s"} in the history below.`,
    },
    {
      label: "Service visits",
      value: journey.sundayAttendanceCount,
      detail: "Use this to judge whether the member is settling into regular attendance.",
      tone: journey.sundayAttendanceCount > 0 ? "calm" : "default",
    },
    {
      label: "Current stage",
      value: STAGE_LABELS[journey.stage] || journey.stage,
      detail: "This is the current point in the 30-day follow-up pathway.",
    },
    {
      label: "Last contact",
      value: journey.lastContactAt ? formatDateTime(journey.lastContactAt) : "Not yet logged",
      detail: journey.lastContactAt
        ? "A touchpoint is already on record."
        : "Log the next action so the pathway stays visible.",
      tone: journey.lastContactAt ? "calm" : "alert",
    },
  ];
}

function formatBirthday(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
