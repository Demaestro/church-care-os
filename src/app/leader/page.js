import Link from "next/link";
import { cookies } from "next/headers";
import { assignRequestVolunteer, escalateRequestToPastor } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getDashboardData } from "@/lib/care-store";
import {
  getCopy,
  translateSupportNeed,
} from "@/lib/i18n";
import { getWorkspaceContext, listVolunteerRoster } from "@/lib/organization-store";
import { leaderPreview, volunteerPreview } from "@/lib/role-previews";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

const statusClasses = {
  watch: "bg-[rgba(179,138,69,0.14)] text-[#7a6128]",
  routine: "bg-[rgba(34,28,22,0.06)] text-muted",
  sensitive: "bg-[rgba(184,101,76,0.10)] text-clay",
  assigned: "bg-[rgba(73,106,77,0.10)] text-moss",
};

export const metadata = {
  title: "Leader View",
  description:
    "A ministry leader routing screen for managing only the cases already routed into a specific lane.",
};

export default async function LeaderPage() {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.leader;
  const user = await requireCurrentUser(["leader", "pastor", "overseer", "owner"]);
  const preferredBranchId = (await cookies()).get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const activeBranchId = workspace.activeBranch?.id || "";
  const { households, openRequests } = await getDashboardData(user, activeBranchId);
  const householdMap = Object.fromEntries(
    households.map((household) => [household.slug, household])
  );
  const laneRequests = openRequests
    .filter((request) => isVisibleInLeaderLane(request))
    .map((request) => {
      const household = householdMap[request.householdSlug];

      return {
        ...request,
        household,
        canAssignVolunteer: canAssignVolunteer(request),
        defaultVolunteerName: suggestVolunteerName(request),
        defaultVolunteerBrief: buildVolunteerBrief(request, pageCopy),
        status: resolveStatus(request, pageCopy),
        privacyLabel: resolvePrivacyLabel(request, pageCopy),
        assignmentHint: resolveAssignmentHint(request, pageCopy),
      };
    });
  const escalations = openRequests
    .filter((request) => isEscalatedRequest(request, householdMap[request.householdSlug]))
    .map((request) => {
      const household = householdMap[request.householdSlug];

      return {
        id: request.id,
        householdName: request.householdName,
        reason:
          request.escalation?.reason ||
          household?.pastoralNeed?.detail ||
          "Leader requested a pastor to review the next step directly.",
        nextStep:
          request.escalation?.nextStep ||
          household?.pastoralNeed?.nextStep ||
          "Pastoral review is needed before this request is handed off more widely.",
      };
    });
  const previewMap = new Map(
    leaderPreview.volunteers.map((volunteer) => [volunteer.name, volunteer])
  );
  const liveVolunteers = listVolunteerRoster(user, activeBranchId)
    .filter((volunteer) => !user.lane || volunteer.lane === user.lane || !volunteer.lane)
    .map((volunteer) => {
      const preview = previewMap.get(volunteer.name);
      const activeCount = openRequests.filter(
        (request) =>
          request.status === "Open" &&
          request.assignedVolunteer?.name === volunteer.name
      ).length;

      return {
        ...preview,
        ...volunteer,
        role: volunteer.team || preview?.role || user.lane || copy.common.volunteerRoster,
        availability:
          preview?.availability ||
          (volunteer.active
            ? "Available for routed practical care work."
            : "Currently marked inactive in the internal roster."),
        fit:
          preview?.fit ||
          (volunteer.lane
            ? `Best fit: ${volunteer.lane}.`
            : "General volunteer coverage."),
        activeCount,
        load: `${activeCount} active task${activeCount === 1 ? "" : "s"}`,
      };
    });
  const volunteers =
    liveVolunteers.length > 0
      ? liveVolunteers
      : leaderPreview.volunteers.map((volunteer) => {
          const activeCount = openRequests.filter(
            (request) =>
              request.status === "Open" &&
              request.assignedVolunteer?.name === volunteer.name
          ).length;

          return {
            ...volunteer,
            activeCount,
            load: `${activeCount} active task${activeCount === 1 ? "" : "s"}`,
          };
        });
  const assignableVolunteers = volunteers.filter((volunteer) => volunteer.active !== false);
  const volunteerOptions =
    assignableVolunteers.length > 0 ? assignableVolunteers : volunteers;
  const metrics = [
    {
      label: pageCopy.metrics.routedCases,
      value: laneRequests.length,
    },
    {
      label: pageCopy.metrics.needsVolunteer,
      value: laneRequests.filter(
        (request) => !request.assignedVolunteer && request.canAssignVolunteer
      ).length,
    },
    {
      label: pageCopy.metrics.pastorEscalations,
      value: escalations.length,
    },
    {
      label: pageCopy.metrics.volunteersAvailable,
      value: volunteers.filter((volunteer) => volunteer.activeCount < 3).length,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              {pageCopy.kicker}
            </p>
            <h1 className="mt-4 text-4xl leading-tight tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
              {pageCopy.title}
            </h1>
            <p className="mt-5 text-base leading-8 text-muted sm:text-lg">
              {user.name} is working inside {workspace.activeScopeLabel}. {pageCopy.body}
            </p>
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-muted">
              {workspace.organization.name} - {workspace.activeScopeLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/permissions"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-base font-medium text-foreground transition hover:bg-[#f4ecde]"
            >
              {pageCopy.viewPermissions}
            </Link>
            <Link
              href="/volunteer"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-base font-medium text-foreground transition hover:bg-[#f4ecde]"
            >
              {pageCopy.previewVolunteerHandoff}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="surface-card rounded-[1.6rem] border border-line bg-[#f5f0e6] p-5"
          >
            <p className="text-sm uppercase tracking-[0.16em] text-muted">
              {metric.label}
            </p>
            <p className="mt-3 text-5xl tracking-[-0.05em] text-foreground">
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelCard title={pageCopy.panels.routedLane}>
          {laneRequests.length === 0 ? (
            <p className="text-sm leading-7 text-muted">{pageCopy.emptyLane}</p>
          ) : (
            <div className="space-y-4">
              {laneRequests.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-line bg-canvas p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar initials={getInitials(item.householdName)} />
                      <div>
                        <p className="text-sm uppercase tracking-[0.16em] text-muted">
                          {translateSupportNeed(item.need, preferences.language)}
                        </p>
                        <h2 className="mt-2 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                          {item.householdName}
                        </h2>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] ${statusClasses[item.status.tone]}`}
                    >
                      {item.status.label}
                    </span>
                  </div>

                  <p className="mt-4 text-base leading-8 text-muted">{item.summary}</p>

                  <div className="mt-4 grid gap-4 rounded-[1.25rem] bg-paper p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">
                        {pageCopy.assignmentHint}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {item.assignmentHint}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">
                        {pageCopy.privacyBoundary}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {item.privacyLabel}
                      </p>
                    </div>
                  </div>

                  {item.assignedVolunteer ? (
                    <div className="mt-4 rounded-[1.25rem] border border-[rgba(73,106,77,0.18)] bg-[rgba(73,106,77,0.08)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-moss">
                        {pageCopy.currentAssignment}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {pageCopy.currentAssignmentBy(item.assignedVolunteer.name)}{" "}
                        {item.assignedVolunteer.assignedBy || pageCopy.leaderTeam}.
                        {item.assignedVolunteer.acceptedLabel &&
                        item.assignedVolunteer.acceptedLabel !== "No time set"
                          ? ` ${pageCopy.acceptedAt(item.assignedVolunteer.acceptedLabel)}`
                          : ""}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                    {item.canAssignVolunteer ? (
                      <form
                        action={assignRequestVolunteer.bind(
                          null,
                          item.id,
                          item.householdSlug
                        )}
                        className="space-y-4 rounded-[1.25rem] border border-line bg-paper p-4"
                      >
                        <input type="hidden" name="assignedBy" value={user.name} />
                        <input
                          type="hidden"
                          name="laneOwner"
                          value={user.lane || leaderPreview.leader.lane}
                        />
                        <input type="hidden" name="householdName" value={item.householdName} />
                        <input type="hidden" name="need" value={item.need} />

                        <label className="block">
                          <span className="text-sm font-medium text-foreground">
                            {pageCopy.volunteerLabel}
                          </span>
                          <select
                            name="volunteerName"
                            defaultValue={item.defaultVolunteerName}
                            className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
                          >
                            {volunteerOptions.map((volunteer) => (
                              <option key={volunteer.name} value={volunteer.name}>
                                {volunteer.name} - {volunteer.load}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-foreground">
                            {pageCopy.volunteerBrief}
                          </span>
                          <textarea
                            name="volunteerBrief"
                            defaultValue={item.defaultVolunteerBrief}
                            rows={3}
                            className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
                          />
                        </label>

                        <SubmitButton
                          idleLabel={
                            item.assignedVolunteer
                              ? pageCopy.reassignVolunteer
                              : pageCopy.assignVolunteer
                          }
                          pendingLabel={pageCopy.savingAssignment}
                          className="inline-flex items-center rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1] disabled:cursor-not-allowed disabled:opacity-70"
                        />
                      </form>
                    ) : (
                      <div className="rounded-[1.25rem] border border-line bg-paper p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">
                          {pageCopy.volunteerAssignmentBlocked}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-foreground">
                          {pageCopy.volunteerAssignmentBlockedBody}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4 rounded-[1.25rem] border border-line bg-paper p-4">
                      <form
                        action={escalateRequestToPastor.bind(
                          null,
                          item.id,
                          item.householdSlug
                        )}
                        className="space-y-4"
                      >
                        <input type="hidden" name="escalatedBy" value={user.name} />
                        <input
                          type="hidden"
                          name="nextStep"
                          value="Pastor Emmanuel to review, contact the household, and decide the next safe handoff."
                        />
                        <input type="hidden" name="householdName" value={item.householdName} />
                        <input type="hidden" name="need" value={item.need} />

                        <label className="block">
                          <span className="text-sm font-medium text-foreground">
                            {pageCopy.escalationReason}
                          </span>
                          <textarea
                            name="reason"
                            defaultValue={`Leader requested pastoral review for ${item.need.toLowerCase()} before any wider handoff.`}
                            rows={3}
                            className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
                          />
                        </label>

                        <SubmitButton
                          idleLabel={pageCopy.escalateToPastor}
                          pendingLabel={pageCopy.escalating}
                          className="inline-flex items-center rounded-[1rem] border border-[rgba(184,101,76,0.2)] bg-[rgba(184,101,76,0.08)] px-4 py-3 text-sm font-semibold text-clay transition hover:bg-[rgba(184,101,76,0.14)] disabled:cursor-not-allowed disabled:opacity-70"
                        />
                      </form>

                      <Link
                        href={`/households/${item.householdSlug}`}
                        className="inline-flex items-center rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1]"
                      >
                        {pageCopy.openTimeline}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PanelCard>

        <div className="space-y-6">
          <PanelCard title={pageCopy.panels.volunteerCapacity}>
            <div className="space-y-4">
              {volunteers.map((volunteer) => (
                <article
                  key={volunteer.name}
                  className="rounded-[1.5rem] border border-line bg-canvas p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl text-foreground [font-family:var(--font-display)]">
                        {volunteer.name}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        {volunteer.role}
                      </p>
                    </div>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      {volunteer.load}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-foreground">
                    {volunteer.availability}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted">{volunteer.fit}</p>
                  <div className="mt-4">
                    <Link
                      href={`/volunteer?volunteer=${encodeURIComponent(volunteer.name)}`}
                      className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-2 text-sm font-medium text-foreground transition hover:bg-[#f4ecde]"
                    >
                      {pageCopy.openVolunteerView}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </PanelCard>

          <PanelCard title={pageCopy.panels.visibility}>
            <ul className="space-y-4 text-sm leading-7 text-muted">
              {pageCopy.visibilityRules.map((rule) => (
                <li
                  key={rule}
                  className="rounded-[1.5rem] border border-line bg-canvas p-5"
                >
                  {rule}
                </li>
              ))}
            </ul>
          </PanelCard>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <PanelCard title={pageCopy.panels.escalations}>
          {escalations.length === 0 ? (
            <p className="text-sm leading-7 text-muted">{pageCopy.noEscalations}</p>
          ) : (
            <div className="space-y-4">
              {escalations.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] p-5"
                >
                  <h2 className="text-2xl text-foreground [font-family:var(--font-display)]">
                    {item.householdName}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.reason}</p>
                  <div className="mt-4 rounded-[1.25rem] bg-paper p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                      {copy.common.labels.nextStep}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-foreground">
                      {item.nextStep}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title={pageCopy.panels.routingSequence}>
          <ol className="space-y-4">
            {pageCopy.sequenceSteps.map((step, index) => (
              <li
                key={step}
                className="rounded-[1.5rem] border border-line bg-canvas p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  Step {index + 1}
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </PanelCard>
      </section>
    </div>
  );
}

function PanelCard({ title, children }) {
  return (
    <section className="surface-card rounded-[1.75rem] border border-line bg-paper p-6">
      <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Avatar({ initials }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(179,138,69,0.14)] text-xl font-semibold text-[#8a6b2b]">
      {initials}
    </span>
  );
}

function getInitials(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isVisibleInLeaderLane(request) {
  if (request.status !== "Open") {
    return false;
  }

  if (request.owner === "Pastoral staff" || request.owner === "Finance deacon") {
    return false;
  }

  if (
    request.privacy?.visibility === "pastors-only" &&
    request.privacy?.shareWithVolunteers === false
  ) {
    return false;
  }

  return true;
}

function isEscalatedRequest(request, household) {
  return (
    request.status === "Open" &&
    (request.owner === "Pastoral staff" ||
      Boolean(request.escalation) ||
      household?.stage === "Escalate")
  );
}

function canAssignVolunteer(request) {
  return request.privacy?.shareWithVolunteers !== false;
}

function suggestVolunteerName(request) {
  const lowerNeed = request.need.toLowerCase();

  if (lowerNeed.includes("meal")) {
    return "Amina Okoye";
  }

  if (
    lowerNeed.includes("transport") ||
    lowerNeed.includes("grocery") ||
    lowerNeed.includes("errand")
  ) {
    return "Elder Tunde";
  }

  return volunteerPreview.volunteer.name;
}

function buildVolunteerBrief(request, copy) {
  if (!canAssignVolunteer(request)) {
    return copy.pastorOnlyBrief;
  }

  if (request.privacy?.visibility === "pastors-only") {
    return copy.sensitiveBrief;
  }

  return request.summary || copy.defaultBrief;
}

function resolveStatus(request, copy) {
  if (
    request.assignedVolunteer?.acceptedLabel &&
    request.assignedVolunteer.acceptedLabel !== "No time set"
  ) {
    return {
      label: copy.volunteerAccepted,
      tone: "assigned",
    };
  }

  if (request.assignedVolunteer) {
    return {
      label: copy.assignedTo(request.assignedVolunteer.name.split(" ")[0]),
      tone: "assigned",
    };
  }

  if (request.owner === "Unassigned") {
    return {
      label: copy.needsOwner,
      tone: "routine",
    };
  }

  if (request.tone === "urgent") {
    return {
      label: copy.routeToday,
      tone: "watch",
    };
  }

  return {
    label: copy.readyToAssign,
    tone: "routine",
  };
}

function resolvePrivacyLabel(request, copy) {
  if (!canAssignVolunteer(request)) {
    return copy.pastorOnlyVisibility;
  }

  if (request.privacy?.visibility === "pastors-only") {
    return copy.genericVolunteerBriefOnly;
  }

  return copy.volunteerSafeSummaryApproved;
}

function resolveAssignmentHint(request, copy) {
  if (request.assignedVolunteer) {
    return copy.reassignHint(request.assignedVolunteer.name);
  }

  const lowerNeed = request.need.toLowerCase();
  if (lowerNeed.includes("meal")) {
    return copy.bestFitMeal;
  }

  if (lowerNeed.includes("transport") || lowerNeed.includes("ride")) {
    return copy.bestFitTransport;
  }

  if (lowerNeed.includes("prayer")) {
    return copy.bestFitPrayer;
  }

  return copy.bestFitGeneric;
}
