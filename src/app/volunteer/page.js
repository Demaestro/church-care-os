import Link from "next/link";
import { VolunteerTaskBoard } from "@/components/volunteer-task-board";
import { requireCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/care-store";
import { listVolunteerRoster } from "@/lib/organization-store";
import { leaderPreview, volunteerPreview } from "@/lib/role-previews";

export const metadata = {
  title: "Volunteer View",
  description:
    "A privacy-aware task board that shows volunteers only the work assigned to them.",
};

export default async function VolunteerPage({ searchParams }) {
  const user = await requireCurrentUser(["volunteer", "leader", "pastor", "owner"]);
  const params = await searchParams;
  const requestedVolunteer =
    typeof params?.volunteer === "string" ? params.volunteer : "";
  const requestedTab = typeof params?.tab === "string" ? params.tab : "assigned";
  const { requests } = await getDashboardData();
  const previewMap = new Map(
    leaderPreview.volunteers.map((volunteer) => [volunteer.name, volunteer])
  );
  const liveRoster = listVolunteerRoster().map((volunteer) => {
    const preview = previewMap.get(volunteer.name);

    return {
      ...preview,
      ...volunteer,
      role: volunteer.team || preview?.role || "Volunteer roster",
      availability:
        preview?.availability ||
        (volunteer.active
          ? "Available for routed care work in this lane."
          : "Currently marked inactive in the internal roster."),
      fit:
        preview?.fit ||
        (volunteer.lane
          ? `Best fit: ${volunteer.lane}.`
          : "General volunteer support coverage."),
    };
  });
  const roster =
    liveRoster.length > 0
      ? liveRoster
      : leaderPreview.volunteers.map((volunteer) => ({
          ...volunteer,
          activeCount: requests.filter(
            (request) =>
              request.status === "Open" &&
              request.assignedVolunteer?.name === volunteer.name
          ).length,
        }));
  const forcedVolunteerName =
    user.role === "volunteer" ? user.volunteerName || user.name : "";
  const selectedVolunteer =
    roster.find((volunteer) => volunteer.name === forcedVolunteerName) ||
    roster.find((volunteer) => volunteer.name === requestedVolunteer) ||
    roster.find((volunteer) => volunteer.activeCount > 0) ||
    roster.find((volunteer) => volunteer.name === volunteerPreview.volunteer.name) ||
    roster[0];
  const volunteerRequests = requests.filter(
    (request) => request.assignedVolunteer?.name === selectedVolunteer.name
  );
  const preview = buildVolunteerPreview(selectedVolunteer, volunteerRequests);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      {user.role !== "volunteer" ? (
        <div className="mb-6 flex flex-wrap gap-3">
          {roster.map((volunteer) => (
            <Link
              key={volunteer.name}
              href={`/volunteer?volunteer=${encodeURIComponent(volunteer.name)}`}
              className={`rounded-[1rem] border px-4 py-2 text-sm font-medium transition ${
                volunteer.name === selectedVolunteer.name
                  ? "border-[rgba(34,28,22,0.16)] bg-paper text-foreground"
                  : "border-line bg-transparent text-muted hover:bg-paper hover:text-foreground"
              }`}
            >
              {volunteer.name} ({volunteer.activeCount})
            </Link>
          ))}
        </div>
      ) : null}

      <VolunteerTaskBoard preview={preview} initialTab={requestedTab} />
    </div>
  );
}

function buildVolunteerPreview(selectedVolunteer, requests) {
  const now = new Date();
  const openRequests = requests.filter((request) => request.status === "Open");
  const completedRequests = requests.filter((request) => request.status === "Closed");

  return {
    volunteer: {
      name: selectedVolunteer.name,
      team: selectedVolunteer.role,
    },
    tabs: {
      assigned: openRequests.length,
      completed: completedRequests.length,
    },
    assigned: {
      overdue: openRequests
        .filter((request) => getTaskBucket(request.dueAt, now) === "overdue")
        .map((request) => mapRequestToTask(request, now)),
      dueToday: openRequests
        .filter((request) => getTaskBucket(request.dueAt, now) === "dueToday")
        .map((request) => mapRequestToTask(request, now)),
      upcoming: openRequests
        .filter((request) => getTaskBucket(request.dueAt, now) === "upcoming")
        .map((request) => mapRequestToTask(request, now)),
    },
    completed: completedRequests.map((request) => mapRequestToCompletedTask(request)),
  };
}

function mapRequestToTask(request, now) {
  const bucket = getTaskBucket(request.dueAt, now);
  const accepted = Boolean(request.assignedVolunteer?.acceptedAt);

  return {
    id: request.id,
    householdSlug: request.householdSlug,
    title: request.need,
    memberName: request.householdName,
    initials: getInitials(request.householdName),
    volunteerName: request.assignedVolunteer?.name || "",
    detail: buildVolunteerDetail(request),
    instruction:
      request.assignedVolunteer?.volunteerBrief ||
      "Follow the team leader brief and route any concerns back through the care lead.",
    badge: buildTaskBadge(request.dueAt, now),
    badgeTone:
      bucket === "overdue" ? "high" : bucket === "dueToday" ? "watch" : "routine",
    canAccept: !accepted,
    canDecline: !accepted,
    canComplete: true,
    canAddNote: true,
    accepted,
    acceptedLabel: request.assignedVolunteer?.acceptedLabel,
  };
}

function mapRequestToCompletedTask(request) {
  return {
    id: request.id,
    householdSlug: request.householdSlug,
    title: request.need,
    memberName: request.householdName,
    initials: getInitials(request.householdName),
    volunteerName: request.assignedVolunteer?.name || "",
    detail: "Completed task",
    instruction:
      request.assignedVolunteer?.volunteerBrief ||
      "This task has already been completed and logged.",
    badge: "Completed",
    badgeTone: "done",
    canAccept: false,
    canDecline: false,
    canComplete: false,
    canAddNote: false,
    accepted: Boolean(request.assignedVolunteer?.acceptedAt),
    acceptedLabel: request.assignedVolunteer?.acceptedLabel,
  };
}

function buildVolunteerDetail(request) {
  if (request.privacy?.visibility === "pastors-only") {
    return "Sensitive pastoral support already in progress";
  }

  if (!request.summary) {
    return "Leader-approved practical support";
  }

  if (request.summary.length > 72) {
    return `${request.summary.slice(0, 69)}...`;
  }

  return request.summary;
}

function getTaskBucket(value, now) {
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.valueOf())) {
    return "upcoming";
  }

  if (dueAt.valueOf() < now.valueOf()) {
    return "overdue";
  }

  if (dueAt.toDateString() === now.toDateString()) {
    return "dueToday";
  }

  return "upcoming";
}

function buildTaskBadge(value, now) {
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.valueOf())) {
    return "Upcoming";
  }

  const diff = dueAt.valueOf() - now.valueOf();
  if (diff < 0) {
    const days = Math.max(1, Math.ceil(Math.abs(diff) / (24 * 60 * 60 * 1000)));
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }

  if (dueAt.toDateString() === now.toDateString()) {
    return "Due today";
  }

  return "Upcoming";
}

function getInitials(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
