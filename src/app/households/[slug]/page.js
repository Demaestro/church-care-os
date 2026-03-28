import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import {
  addHouseholdNote,
  closeCareRequest,
  updateHouseholdSnapshot,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { toDateTimeLocalValue } from "@/lib/care-format";
import { getHouseholdBySlug } from "@/lib/care-store";
import {
  getCopy,
  translateRequestStatus,
  translateRisk,
  translateStage,
  translateSupportNeed,
  translateTimelineKind,
} from "@/lib/i18n";

const toneClasses = {
  urgent: "border-[rgba(184,101,76,0.22)] bg-[rgba(184,101,76,0.10)] text-clay",
  watch: "border-[rgba(179,138,69,0.24)] bg-[rgba(179,138,69,0.12)] text-gold",
  steady: "border-[rgba(73,106,77,0.24)] bg-[rgba(73,106,77,0.10)] text-moss",
};

export async function generateMetadata({ params }) {
  return {
    title: "Household",
    description: "Protected household timeline and care coordination record.",
  };
}

export default async function HouseholdDetailPage({ params }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.householdDetail;
  await requireCurrentUser(["leader", "pastor", "owner"]);
  const { slug } = await params;
  const household = await getHouseholdBySlug(slug);

  if (!household) {
    notFound();
  }

  const snapshotAction = updateHouseholdSnapshot.bind(null, household.slug);
  const noteAction = addHouseholdNote.bind(null, household.slug);
  const stageOptions = ["Assign", "Stabilize", "Support", "Review", "Escalate", "Comfort"];
  const riskOptions = ["urgent", "watch", "steady"];
  const noteTypeOptions = [
    "Follow-up",
    "Prayer",
    "Visit",
    "Coordination",
    "Review",
    "Escalation",
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 pb-16 lg:px-10 lg:py-12">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-line bg-canvas px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted">
                {translateStage(household.stage, preferences.language)}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${toneClasses[household.risk]}`}
              >
                {translateRisk(household.risk, preferences.language)}
              </span>
            </div>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              {household.name}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">{household.situation}</p>
            <div className="mt-6 grid gap-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label={pageCopy.details.owner} value={household.owner} />
              <DetailItem
                label={pageCopy.details.nextTouchpoint}
                value={household.nextTouchpointLabel}
              />
              <DetailItem
                label={pageCopy.details.lastTouchpoint}
                value={household.lastTouchpointLabel}
              />
              <DetailItem
                label={pageCopy.details.openRequests}
                value={String(household.openRequestCount).padStart(2, "0")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/households"
              className="inline-flex w-fit items-center rounded-full border border-line bg-canvas px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1]"
            >
              {pageCopy.backToHouseholds}
            </Link>
            <Link
              href="/requests/new"
              className="inline-flex w-fit items-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
            >
              {pageCopy.logRequest}
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {household.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card title={pageCopy.cards.requests} eyebrow={pageCopy.cards.workInMotion}>
            {household.relatedRequests.length === 0 ? (
              <p className="text-sm leading-7 text-muted">{pageCopy.noRequests}</p>
            ) : (
              <div className="space-y-4">
                {household.relatedRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-[1.5rem] border border-line bg-canvas p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-muted">
                          {translateRequestStatus(request.status, preferences.language)}
                        </p>
                        <h2 className="mt-2 text-2xl text-foreground [font-family:var(--font-display)]">
                          {translateSupportNeed(request.need, preferences.language)}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-muted">
                          {request.summary}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${toneClasses[request.tone]}`}
                      >
                        {translateRisk(request.tone, preferences.language)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-5">
                      <DetailItem label={pageCopy.details.owner} value={request.owner} />
                      <DetailItem
                        label={pageCopy.details.volunteer}
                        value={request.assignedVolunteer?.name || copy.common.notAssigned}
                      />
                      <DetailItem
                        label={pageCopy.details.volunteerStatus}
                        value={getVolunteerStatus(request, pageCopy)}
                      />
                      <DetailItem label={pageCopy.details.due} value={request.dueLabel} />
                      <DetailItem label={pageCopy.details.source} value={request.source} />
                    </div>

                    {request.escalation ? (
                      <div className="mt-4 rounded-[1.25rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-clay">
                          {pageCopy.escalation}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-foreground">
                          {request.escalation.reason}
                        </p>
                      </div>
                    ) : null}

                    {request.status === "Open" ? (
                      <form
                        action={closeCareRequest.bind(
                          null,
                          request.id,
                          household.slug
                        )}
                        className="mt-5"
                      >
                        <SubmitButton
                          idleLabel={pageCopy.markRequestClosed}
                          pendingLabel={pageCopy.closingRequest}
                          className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1] disabled:cursor-not-allowed disabled:opacity-70"
                        />
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Card>

          {household.pastoralNeed ? (
            <Card
              title={pageCopy.cards.pastoralAttention}
              eyebrow={pageCopy.cards.escalation}
            >
              <div className="rounded-[1.5rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] p-5">
                <h2 className="text-2xl text-foreground [font-family:var(--font-display)]">
                  {household.pastoralNeed.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {household.pastoralNeed.detail}
                </p>
                <div className="mt-4 rounded-[1.25rem] bg-paper p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">
                    {copy.common.labels.nextStep}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground">
                    {household.pastoralNeed.nextStep}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          <Card title={pageCopy.cards.timeline} eyebrow={pageCopy.cards.notesAndTouchpoints}>
            <div className="space-y-4">
              {household.notes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-[1.5rem] border border-line bg-canvas p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-muted">
                        {translateTimelineKind(note.kind, preferences.language)}
                      </p>
                      <h2 className="mt-1 text-xl text-foreground [font-family:var(--font-display)]">
                        {note.author}
                      </h2>
                    </div>
                    <p className="text-sm text-muted">{note.createdLabel}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted">{note.body}</p>
                </article>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title={pageCopy.cards.updateSnapshot}
            eyebrow={pageCopy.cards.keepBoardCurrent}
          >
            <form action={snapshotAction} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField
                  label={pageCopy.stageLabel}
                  name="stage"
                  defaultValue={household.stage}
                  options={stageOptions.map((option) => ({
                    value: option,
                    label: translateStage(option, preferences.language),
                  }))}
                />
                <SelectField
                  label={pageCopy.riskLabel}
                  name="risk"
                  defaultValue={household.risk}
                  options={riskOptions.map((option) => ({
                    value: option,
                    label: translateRisk(option, preferences.language),
                  }))}
                />
              </div>

              <Field
                label={pageCopy.ownerLabel}
                name="owner"
                defaultValue={household.owner === "Unassigned" ? "" : household.owner}
                placeholder="Mercy team"
              />

              <Field
                label={pageCopy.nextTouchpointLabel}
                name="nextTouchpoint"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(household.nextTouchpoint)}
                required
              />

              <Field
                label={pageCopy.situationLabel}
                name="situation"
                defaultValue={household.situation}
                placeholder={pageCopy.situationPlaceholder}
                multiline
                required
              />

              <Field
                label={pageCopy.summaryNoteLabel}
                name="summaryNote"
                defaultValue={household.summaryNote}
                placeholder={pageCopy.summaryNotePlaceholder}
                multiline
              />

              <Field
                label={pageCopy.tagsLabel}
                name="tags"
                defaultValue={household.tags.join(", ")}
                placeholder={pageCopy.tagsPlaceholder}
              />

              <SubmitButton
                idleLabel={pageCopy.saveHouseholdUpdate}
                pendingLabel={pageCopy.savingUpdate}
                className="inline-flex items-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          </Card>

          <Card title={pageCopy.cards.addTimelineNote} eyebrow={pageCopy.cards.captureTouchpoint}>
            <form action={noteAction} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label={pageCopy.authorLabel}
                  name="author"
                  placeholder={pageCopy.authorPlaceholder}
                />
                <SelectField
                  label={pageCopy.typeLabel}
                  name="kind"
                  defaultValue="Follow-up"
                  options={noteTypeOptions.map((option) => ({
                    value: option,
                    label: translateTimelineKind(option, preferences.language),
                  }))}
                />
              </div>

              <Field
                label={pageCopy.noteLabel}
                name="body"
                placeholder={pageCopy.notePlaceholder}
                multiline
                required
              />

              <SubmitButton
                idleLabel={pageCopy.addNote}
                pendingLabel={pageCopy.addingNote}
                className="inline-flex items-center rounded-full border border-line bg-canvas px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({ eyebrow, title, children }) {
  return (
    <section className="surface-card rounded-[2rem] border border-line bg-paper p-8">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-7 text-foreground">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  multiline = false,
  required = false,
  type = "text",
}) {
  const classes =
    "mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss";

  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          rows={4}
          className={`${classes} resize-y`}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
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

function getVolunteerStatus(request, pageCopy) {
  if (request.status === "Closed" && request.assignedVolunteer?.completedLabel) {
    return pageCopy.completedAt(request.assignedVolunteer.completedLabel);
  }

  if (
    request.assignedVolunteer?.acceptedLabel &&
    request.assignedVolunteer.acceptedLabel !== "No time set"
  ) {
    return pageCopy.acceptedAt(request.assignedVolunteer.acceptedLabel);
  }

  if (request.assignedVolunteer?.name) {
    return pageCopy.assigned;
  }

  return pageCopy.awaitingVolunteer;
}
