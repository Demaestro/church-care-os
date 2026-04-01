import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  addHouseholdNote,
  closeCareRequest,
  completeMemberTransfer,
  requestMemberTransfer,
  updateHouseholdSnapshot,
  uploadHouseholdAttachment,
} from "@/app/actions";
import { PrivacyShield } from "@/components/privacy-shield";
import { SubmitButton } from "@/components/submit-button";
import { TabBar } from "@/components/tab-bar";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { listHouseholdAttachments } from "@/lib/attachment-store";
import { toDateTimeLocalValue } from "@/lib/care-format";
import { getHouseholdBySlug } from "@/lib/care-store";
import { getDiscipleshipRecord } from "@/lib/discipleship-store";
import { listMemberTransfers } from "@/lib/member-transfer-store";
import {
  getBranchOverview,
  getWorkspaceContext,
} from "@/lib/organization-store";
import {
  getCopy,
  translateRequestStatus,
  translateRisk,
  translateStage,
  translateSupportNeed,
  translateTimelineKind,
} from "@/lib/i18n";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

const toneClasses = {
  urgent: "border-[rgba(184,101,76,0.22)] bg-[rgba(184,101,76,0.10)] text-clay",
  watch: "border-[rgba(179,138,69,0.24)] bg-[rgba(179,138,69,0.12)] text-gold",
  steady: "border-[rgba(73,106,77,0.24)] bg-[rgba(73,106,77,0.10)] text-moss",
};

const STAGE_LABELS = {
  new_believer: "New Believer",
  foundation: "Foundation",
  growing: "Growing",
  serving: "Serving",
  mentoring: "Mentoring Others",
};

export async function generateMetadata() {
  return {
    title: "Household",
    description: "Protected household timeline and care coordination record.",
  };
}

export default async function HouseholdDetailPage({ params, searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.householdDetail;
  const user = await requireCurrentUser(["leader", "pastor", "overseer", "owner"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams?.tab || "overview";
  const household = await getHouseholdBySlug(slug, user, preferredBranchId);

  if (!household) {
    notFound();
  }

  const attachments = listHouseholdAttachments(household.slug, user, preferredBranchId);
  const transfers = listMemberTransfers(user, preferredBranchId).filter(
    (item) => item.householdSlug === household.slug
  );
  const discipleshipRecord = getDiscipleshipRecord(slug);
  const branchOptions = getBranchOverview(user, "")
    .filter(
      (branch) =>
        branch.organizationId === household.organizationId &&
        branch.id !== household.branchId
    )
    .map((branch) => ({
      id: branch.id,
      name: branch.name,
      regionName: branch.regionName,
    }));
  const snapshotAction = updateHouseholdSnapshot.bind(null, household.slug);
  const noteAction = addHouseholdNote.bind(null, household.slug);
  const attachmentAction = uploadHouseholdAttachment.bind(null, household.slug);
  const transferAction = requestMemberTransfer.bind(null, household.slug);
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
  const scopeLabel = workspace.activeBranch
    ? `${workspace.organization.name} / ${workspace.activeBranch.name}`
    : `${workspace.organization.name} / all visible branches`;
  const scopedHref = (pathname) =>
    preferredBranchId
      ? `${pathname}?branch=${encodeURIComponent(preferredBranchId)}`
      : pathname;

  const openTasks = household.relatedRequests
    ? household.relatedRequests.filter(r => r.status === "Open")
    : [];

  const tabs = [
    { key: "overview",     label: "Overview" },
    { key: "timeline",     label: "Timeline" },
    { key: "tasks",        label: "Tasks", count: openTasks.length },
    { key: "discipleship", label: "Discipleship" },
    { key: "notes",        label: "Notes" },
    { key: "attachments",  label: "Attachments" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 pb-16 lg:px-10 lg:py-12">
      <PrivacyShield
        className="surface-card"
        eyebrow={pageCopy.privacyShield.eyebrow}
        title={pageCopy.privacyShield.title}
        body={pageCopy.privacyShield.body}
        watermark={pageCopy.privacyShield.watermark}
        quickHideLabel={copy.common.privacyShield.quickHide}
        revealLabel={copy.common.privacyShield.reveal}
        hiddenTitle={copy.common.privacyShield.hiddenTitle}
        hiddenBody={copy.common.privacyShield.hiddenBody}
      >
        {/* ── Hero section ── */}
        <section className="rounded-[2rem] p-8 lg:p-10">
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
              <div className="mt-5 inline-flex items-center rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
                <span className="font-semibold text-foreground">{scopeLabel}</span>
                <span className="ml-3 text-muted">
                  Household activity stays inside the branch scope shown here.
                </span>
              </div>
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
                href={scopedHref("/households")}
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

        {/* ── Tab bar ── */}
        <div className="px-8 lg:px-10">
          <TabBar tabs={tabs} />
        </div>

        {/* ── Tab content ── */}
        <div className="px-8 pt-8 pb-8 lg:px-10">

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="tab-content">
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <Card title={pageCopy.cards.requests} eyebrow={pageCopy.cards.workInMotion}>
                    {household.relatedRequests.length === 0 ? (
                      <p className="text-sm leading-7 text-muted">{pageCopy.noRequests}</p>
                    ) : (
                      <div className="space-y-4">
                        {household.relatedRequests.slice(0, 3).map((request) => (
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
                </div>
              </div>
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === "timeline" && (
            <div className="tab-content">
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
          )}

          {/* Tasks tab */}
          {activeTab === "tasks" && (
            <div className="tab-content">
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
                            action={closeCareRequest.bind(null, request.id, household.slug)}
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
            </div>
          )}

          {/* Discipleship tab */}
          {activeTab === "discipleship" && (
            <div className="tab-content">
              <DiscipleshipPanel record={discipleshipRecord} household={household} user={user} />
            </div>
          )}

          {/* Notes tab */}
          {activeTab === "notes" && (
            <div className="tab-content">
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

              <div className="mt-6">
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

              {/* Branch transfer */}
              <div className="mt-6">
                <Card title="Branch transfer" eyebrow="Move care safely between branches">
                  {transfers.length > 0 ? (
                    <div className="space-y-4">
                      {transfers.map((transfer) => (
                        <article
                          key={transfer.id}
                          className="rounded-[1.25rem] border border-line bg-canvas p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {transfer.fromBranchName} → {transfer.toBranchName}
                              </p>
                              <p className="mt-2 text-sm leading-7 text-muted">
                                {transfer.reason}
                              </p>
                            </div>
                            <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                              {transfer.status}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <DetailItem label="Requested" value={transfer.requestedLabel} />
                            <DetailItem label="By" value={transfer.requestedByName} />
                          </div>
                          {transfer.status === "requested" &&
                          ["overseer", "owner"].includes(user.role) ? (
                            <form
                              action={completeMemberTransfer.bind(null, transfer.id, household.slug)}
                              className="mt-4"
                            >
                              <SubmitButton
                                idleLabel="Complete transfer"
                                pendingLabel="Completing..."
                                className="inline-flex items-center rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
                              />
                            </form>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-muted">
                      Use this when a household should continue care in another branch of the same organization.
                    </p>
                  )}

                  {branchOptions.length > 0 ? (
                    <form
                      action={transferAction}
                      className="mt-6 grid gap-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                    >
                      <SelectField
                        label="Destination branch"
                        name="toBranchId"
                        defaultValue=""
                        options={[
                          { value: "", label: "Choose a branch" },
                          ...branchOptions.map((branch) => ({
                            value: branch.id,
                            label: `${branch.name} · ${branch.regionName || "Unassigned region"}`,
                          })),
                        ]}
                      />
                      <Field
                        label="Transfer reason"
                        name="reason"
                        placeholder="Member relocated, pastoral oversight changed, family now attends another branch..."
                      />
                      <Field
                        label="Transfer note"
                        name="note"
                        placeholder="What should the receiving branch know before they pick this up?"
                        multiline
                      />
                      <SubmitButton
                        idleLabel="Request transfer"
                        pendingLabel="Requesting transfer..."
                        className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1] disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </form>
                  ) : (
                    <div className="mt-6 rounded-[1.25rem] border border-line bg-canvas p-4">
                      <p className="text-sm leading-7 text-muted">
                        This workspace cannot request a transfer right now because no other visible branch is available inside this organization.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Attachments tab */}
          {activeTab === "attachments" && (
            <div className="tab-content">
              <Card title="Attachments" eyebrow="Files and case records">
                {attachments.length > 0 ? (
                  <div className="space-y-4">
                    {attachments.map((attachment) => (
                      <article
                        key={attachment.id}
                        className="rounded-[1.25rem] border border-line bg-canvas p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-foreground">
                              {attachment.originalName}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-muted">
                              {attachment.purpose}
                            </p>
                          </div>
                          <Link
                            href={attachment.downloadHref}
                            className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                          >
                            Download
                          </Link>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <DetailItem label="Uploaded by" value={attachment.uploadedByName} />
                          <DetailItem label="Size" value={`${Math.max(1, Math.round(attachment.fileSize / 1024))} KB`} />
                          <DetailItem label="Added" value={attachment.createdLabel} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-muted">
                    Upload discharge letters, internal care memos, or supporting documents here so the branch timeline stays complete.
                  </p>
                )}

                <form
                  action={attachmentAction}
                  className="mt-6 grid gap-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                >
                  <Field
                    label="Attachment purpose"
                    name="purpose"
                    placeholder="Discharge summary, prayer letter, internal memo..."
                  />
                  <Field
                    label="Related request ID (optional)"
                    name="requestId"
                    placeholder="Leave blank to attach to the household only."
                  />
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">Select file</span>
                    <input
                      type="file"
                      name="file"
                      className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
                    />
                  </label>
                  <SubmitButton
                    idleLabel="Upload attachment"
                    pendingLabel="Uploading..."
                    className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>
              </Card>
            </div>
          )}

        </div>
      </PrivacyShield>
    </div>
  );
}

function DiscipleshipPanel({ record, household, user }) {
  if (!record) {
    return (
      <Card title="Discipleship" eyebrow="Growth pathway">
        <p className="text-sm leading-7 text-muted">
          No discipleship record yet for this household.
        </p>
        <div className="mt-4">
          <Link
            href="/discipleship"
            className="inline-flex items-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
          >
            View discipleship board →
          </Link>
        </div>
      </Card>
    );
  }

  const stageLabel = STAGE_LABELS[record.stage] || record.stage;

  return (
    <Card title="Discipleship" eyebrow="Growth pathway">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-1 text-xs font-semibold text-moss">
            {stageLabel}
          </span>
          {record.pathway && record.pathway !== "standard" && (
            <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted">
              {record.pathway} pathway
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MilestoneBadge label="Baptized" active={record.baptized} />
          <MilestoneBadge label="Small group" active={record.smallGroupConnected} />
          <MilestoneBadge label="Attending regularly" active={record.attendingRegularly} />
          <MilestoneBadge label="Serving" active={record.serving} />
          <MilestoneBadge label="Foundation class" active={record.foundationClass} />
          <MilestoneBadge label="Mentoring others" active={record.mentoringOthers} />
        </div>

        {record.nextStep && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Next step</p>
            <p className="mt-2 text-sm leading-7 text-foreground">{record.nextStep}</p>
          </div>
        )}

        {record.assignedLeaderName && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Assigned leader</p>
            <p className="mt-2 text-sm text-foreground">{record.assignedLeaderName}</p>
          </div>
        )}

        {record.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Notes</p>
            <p className="mt-2 text-sm leading-7 text-muted">{record.notes}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/discipleship"
            className="inline-flex items-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
          >
            Update discipleship record →
          </Link>
        </div>
      </div>
    </Card>
  );
}

function MilestoneBadge({ label, active }) {
  return (
    <div className={`flex items-center gap-2 rounded-[0.75rem] border px-3 py-2 text-sm ${active ? "border-green-200 bg-green-50 text-green-700" : "border-line bg-canvas text-muted"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-green-500" : "bg-line"}`} />
      {label}
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
