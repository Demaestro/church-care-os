import { cookies } from "next/headers";
import { createRegion, updateRegion } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import {
  getBranchOverview,
  getWorkspaceContext,
  listRegions,
} from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Regions",
  description:
    "Regional hierarchy and oversight across multiple branches in one church organization.",
};

export default async function RegionsPage({ searchParams }) {
  const user = await requireCurrentUser(["overseer", "owner"]);
  const preferredBranchId = (await cookies()).get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const params = await searchParams;
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const regions = listRegions(workspace.organization.id);
  const branches = getBranchOverview(user, "");
  const regionalRows = regions.map((region) => {
    const regionBranches = branches.filter((branch) => branch.regionId === region.id);
    return {
      ...region,
      branchNames: regionBranches.map((branch) => branch.name),
      openRequests: regionBranches.reduce((sum, branch) => sum + branch.openRequestCount, 0),
      urgentHouseholds: regionBranches.reduce(
        (sum, branch) => sum + branch.urgentHouseholdCount,
        0
      ),
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Regional oversight
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Regions and shared supervision
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Group branches under regional oversight without weakening branch privacy. Headquarters can compare care pressure and leadership load by region from one place.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[28rem]">
            <MetricCard label="Regions" value={regionalRows.length} />
            <MetricCard label="Visible branches" value={branches.length} />
            <MetricCard
              label="Open requests"
              value={regionalRows.reduce((sum, row) => sum + row.openRequests, 0)}
            />
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle="Saved"
            errorTitle="Could not continue"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow="Add a region"
            title="Create a regional oversight lane"
            body="Regional groupings help the General Overseer or HQ care office compare multiple branches without giving branch pastors visibility into one another’s cases."
          />

          <form action={createRegion} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Region name" name="name" placeholder="North Central" />
              <Field label="Region code" name="code" placeholder="NC" />
            </div>
            <Field label="Slug (optional)" name="slug" placeholder="north-central" />
            <Field label="Regional lead" name="leadName" placeholder="Pastor Emmanuel Joseph" />
            <TextAreaField
              label="Description"
              name="description"
              placeholder="Which branches belong here, and what does HQ expect this regional lane to oversee?"
            />
            <ToggleField
              label="Region is active"
              name="active"
              detail="Inactive regions stay on record but are hidden from new branch assignments."
              defaultChecked
            />
            <SubmitButton
              idleLabel="Create region"
              pendingLabel="Creating region..."
              className="inline-flex items-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        </article>

        <div className="space-y-4">
          {regionalRows.map((region) => (
            <article
              key={region.id}
              className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    {region.code}
                  </p>
                  <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                    {region.name}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {region.description || "No regional description added yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge>{region.leadName || "Lead not assigned"}</Badge>
                    <Badge tone={region.active ? "moss" : "clay"}>
                      {region.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard label="Branches" value={region.branchCount} compact />
                  <MetricCard label="Open" value={region.openRequests} compact />
                  <MetricCard label="Urgent" value={region.urgentHouseholds} compact />
                </div>
              </div>

              <div className="mt-5 rounded-[1.2rem] border border-line bg-canvas p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  Branches in this region
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {region.branchNames.length > 0 ? (
                    region.branchNames.map((branchName) => (
                      <Badge key={branchName}>{branchName}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted">No branches are assigned yet.</p>
                  )}
                </div>
              </div>

              <form
                action={updateRegion.bind(null, region.id)}
                className="mt-6 grid gap-4 rounded-[1.35rem] border border-line bg-canvas p-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Region name" name="name" defaultValue={region.name} />
                  <Field label="Region code" name="code" defaultValue={region.code} />
                </div>
                <Field label="Slug" name="slug" defaultValue={region.slug} />
                <Field label="Regional lead" name="leadName" defaultValue={region.leadName} />
                <TextAreaField
                  label="Description"
                  name="description"
                  defaultValue={region.description}
                />
                <ToggleField
                  label="Region is active"
                  name="active"
                  detail="Turn this off only when the region should stop appearing in branch assignment forms."
                  defaultChecked={region.active}
                />
                <SubmitButton
                  idleLabel="Save region"
                  pendingLabel="Saving region..."
                  className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </form>
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

function MetricCard({ label, value, compact = false }) {
  return (
    <article className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p
        className={`mt-3 ${compact ? "text-2xl" : "text-3xl"} tracking-[-0.04em] text-foreground [font-family:var(--font-display)]`}
      >
        {value}
      </p>
    </article>
  );
}

function Badge({ children, tone = "neutral" }) {
  const className =
    tone === "moss"
      ? "border-[rgba(73,106,77,0.18)] bg-[rgba(73,106,77,0.08)] text-moss"
      : tone === "clay"
        ? "border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay"
        : "border-line bg-paper text-muted";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
  );
}

function Field({ label, name, defaultValue, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type="text"
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

function ToggleField({ label, name, detail, defaultChecked = false }) {
  return (
    <label className="flex items-start gap-4 rounded-[1rem] border border-line bg-paper px-4 py-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-line text-moss focus:ring-moss"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-sm leading-7 text-muted">{detail}</span>
      </span>
    </label>
  );
}
