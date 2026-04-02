import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { listVolunteerApplications } from "@/lib/volunteer-store";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { ReviewPanel } from "@/components/volunteer-review-panel";

export const metadata = {
  title: "Volunteer Applications",
  description: "Review and approve or decline volunteer applications from members.",
};

export default async function VolunteerApplicationsPage({ searchParams }) {
  const user = await requireCurrentUser(["pastor", "leader", "owner"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId;

  const params = await searchParams;
  const filter = params?.status || "pending";

  const applications = listVolunteerApplications(user.organizationId, branchId, {
    status: filter === "all" ? undefined : filter,
  });

  const pendingCount = filter === "pending"
    ? applications.length
    : listVolunteerApplications(user.organizationId, branchId, { status: "pending" }).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            Volunteer ministry
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Applications
          </h1>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm text-muted">
              {pendingCount} pending review{pendingCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {["pending", "approved", "rejected", "all"].map((status) => (
            <a
              key={status}
              href={`/volunteer/applications?status=${status}`}
              className={`rounded-full border px-4 py-2 text-xs font-semibold capitalize transition ${
                filter === status
                  ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                  : "border-line bg-canvas text-muted hover:bg-paper hover:text-foreground"
              }`}
            >
              {status}
            </a>
          ))}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-canvas px-8 py-16 text-center">
          <p className="text-3xl">✓</p>
          <p className="mt-4 text-base font-semibold text-foreground">
            {filter === "pending" ? "No pending applications" : `No ${filter} applications`}
          </p>
          <p className="mt-2 text-sm text-muted">
            {filter === "pending"
              ? "All applications have been reviewed."
              : "Nothing to show for this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard key={app.id} app={app} actorName={user.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app, actorName }) {
  const submitted = new Date(app.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  const statusColors = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-[rgba(73,106,77,0.2)] bg-[rgba(73,106,77,0.08)] text-moss",
    rejected: "border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.04)] text-clay",
  };

  return (
    <div className="rounded-[1.5rem] border border-line bg-paper p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--soft-fill)] text-sm font-bold text-moss">
            {app.userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{app.userName}</p>
            <p className="text-sm text-muted">{app.userEmail}</p>
            <p className="mt-1 text-xs text-muted">Applied {submitted}</p>
          </div>
        </div>

        <span className={`self-start rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusColors[app.status] || "border-line bg-canvas text-muted"}`}>
          {app.status}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">Ministry areas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {app.areas.map((area) => (
              <span key={area} className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-foreground">
                {area.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {app.availability && (
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">Availability</p>
            <p className="mt-1 text-sm text-foreground capitalize">{app.availability.replace(/-/g, " ")}</p>
          </div>
        )}

        {app.note && (
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">Note from applicant</p>
            <p className="mt-1 text-sm leading-6 text-foreground">{app.note}</p>
          </div>
        )}

        {app.status === "pending" && (
          <ReviewPanel applicationId={app.id} applicantName={app.userName} />
        )}

        {app.status !== "pending" && app.reviewedByName && (
          <p className="text-xs text-muted">
            {app.status === "approved" ? "Approved" : "Declined"} by {app.reviewedByName}
            {app.reviewedAt ? ` on ${new Date(app.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
