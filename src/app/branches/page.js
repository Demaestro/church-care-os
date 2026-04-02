import { cookies } from "next/headers";
import {
  createBranch,
  saveBranchSettings,
  updateBranch,
} from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import {
  getBranchOverview,
  getBranchSettings,
  getWorkspaceContext,
  listRegions,
} from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Branches",
  description:
    "Headquarters branch oversight for organizations that run care across multiple church locations.",
};

export default async function BranchesPage({ searchParams }) {
  const user = await requireCurrentUser(["overseer", "owner"]);
  const preferredBranchId = (await cookies()).get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const params = await searchParams;
  const branches = getBranchOverview(user, "");
  const regions = listRegions(workspace.organization.id);
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const totalOpen = branches.reduce((sum, branch) => sum + branch.openRequestCount, 0);
  const totalUrgent = branches.reduce((sum, branch) => sum + branch.urgentHouseholdCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Headquarters oversight
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Branch operations
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Keep every branch under the same church organization while still enforcing branch privacy. Headquarters can compare pressure, health, and staffing here without exposing one branch pastor to another branch.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[28rem]">
            <MetricCard label="Visible branches" value={branches.length} />
            <MetricCard label="Open requests" value={totalOpen} />
            <MetricCard label="Urgent households" value={totalUrgent} />
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

        <div className="mt-6 rounded-[1.2rem] border border-line bg-canvas px-4 py-3 text-sm text-muted">
          Organization: <span className="font-semibold text-foreground">{workspace.organization.name}</span>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow="Add a branch"
            title="Launch another branch workspace"
            body="Create a new branch under this organization. Local pastors and leaders assigned there will only see their branch unless you give them broader HQ access."
          />

          <form action={createBranch} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Branch name" name="name" placeholder="FirstLove Assembly · Jos Central" />
              <Field label="Branch code" name="code" placeholder="JOS-CENTRAL" />
            </div>
            <Field label="Slug (optional)" name="slug" placeholder="org-firstlove-jos-central" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="City" name="city" placeholder="Jos" />
              <Field label="State / province" name="state" placeholder="Plateau" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Country" name="country" placeholder="Nigeria" />
              <Field label="Branch pastor" name="pastorName" placeholder="Pastor Grace Adeyemi" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Region"
                name="regionId"
                defaultValue=""
                options={[
                  { value: "", label: "Unassigned region" },
                  ...regions.map((region) => ({
                    value: region.id,
                    label: `${region.name} (${region.code})`,
                  })),
                ]}
              />
              <Field label="Support email" name="supportEmail" type="email" placeholder="care@firstlove.example" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Support phone" name="supportPhone" type="tel" placeholder="+2348012345678" />
              <ToggleField
                label="Headquarters branch"
                name="isHeadquarters"
                detail="Turn this on only for the main headquarters branch."
              />
            </div>
            <ToggleField
              label="Branch is active"
              name="active"
              defaultChecked
              detail="Inactive branches stay on record, but are removed from daily workspace lists."
            />
            <SubmitButton
              idleLabel="Create branch"
              pendingLabel="Creating branch..."
              className="inline-flex items-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        </article>

        <div className="space-y-4">
          {branches.map((branch) => {
            const branchSettings = getBranchSettings(branch.id);
            return (
              <article
                key={branch.id}
                className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                      {branch.code}
                    </p>
                    <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                      {branch.name}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {branch.locationLabel || branch.organizationName}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge>{branch.isHeadquarters ? "Headquarters" : "Branch campus"}</Badge>
                      <Badge>{branch.regionName || "Unassigned region"}</Badge>
                      <Badge tone={branch.active ? "moss" : "clay"}>
                        {branch.active ? "Active" : "Inactive"}
                      </Badge>
                      {branch.pastorName ? <Badge>{branch.pastorName}</Badge> : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard label="Open" value={branch.openRequestCount} compact />
                    <MetricCard label="Resolved" value={branch.closedRequestCount} compact />
                    <MetricCard label="Urgent" value={branch.urgentHouseholdCount} compact />
                    <MetricCard label="Watch" value={branch.watchHouseholdCount} compact />
                  </div>
                </div>

                <form
                  action={updateBranch.bind(null, branch.id)}
                  className="mt-6 grid gap-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Branch name" name="name" defaultValue={branch.name} />
                    <Field label="Branch code" name="code" defaultValue={branch.code} />
                  </div>
                  <Field label="Slug" name="slug" defaultValue={branch.slug} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="City" name="city" defaultValue={branch.city} />
                    <Field label="State / province" name="state" defaultValue={branch.state} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Country" name="country" defaultValue={branch.country} />
                    <Field label="Branch pastor" name="pastorName" defaultValue={branch.pastorName} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Region"
                      name="regionId"
                      defaultValue={branch.regionId || ""}
                      options={[
                        { value: "", label: "Unassigned region" },
                        ...regions.map((region) => ({
                          value: region.id,
                          label: `${region.name} (${region.code})`,
                        })),
                      ]}
                    />
                    <Field label="Support email" name="supportEmail" type="email" defaultValue={branch.supportEmail} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Support phone" name="supportPhone" type="tel" defaultValue={branch.supportPhone} />
                    <ToggleField
                      label="Headquarters branch"
                      name="isHeadquarters"
                      defaultChecked={branch.isHeadquarters}
                      detail="Keep this on only for the headquarters branch."
                    />
                  </div>
                  <ToggleField
                    label="Branch is active"
                    name="active"
                    defaultChecked={branch.active}
                    detail="Inactive branches stay off daily routing lists."
                  />
                  <SubmitButton
                    idleLabel="Save branch changes"
                    pendingLabel="Saving branch..."
                    className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>

                <form
                  action={saveBranchSettings.bind(null, branch.id)}
                  className="mt-6 grid gap-4 rounded-[1.35rem] border border-line bg-canvas p-5"
                >
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
                      Branch overrides
                    </p>
                    <h3 className="mt-2 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                      Local tone, delivery, and public messaging
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      Use branch overrides when one branch should publish different care copy or sender details while still sitting under the same church organization.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Support email override"
                      name="supportEmail"
                      type="email"
                      defaultValue={branchSettings?.supportEmail || ""}
                    />
                    <Field
                      label="Support phone override"
                      name="supportPhone"
                      type="tel"
                      defaultValue={branchSettings?.supportPhone || ""}
                    />
                  </div>

                  <TextAreaField
                    label="Public intro"
                    name="publicIntro"
                    defaultValue={branchSettings?.publicIntro || ""}
                    placeholder="Share a calmer or more branch-specific introduction for members before they submit a request."
                  />
                  <TextAreaField
                    label="Intake confirmation"
                    name="intakeConfirmationText"
                    defaultValue={branchSettings?.intakeConfirmationText || ""}
                    placeholder="Adjust the confirmation text members see after submitting a request."
                  />
                  <TextAreaField
                    label="Emergency banner"
                    name="emergencyBanner"
                    defaultValue={branchSettings?.emergencyBanner || ""}
                    placeholder="Optional branch-specific urgent-care banner."
                  />
                  <TextAreaField
                    label="Follow-up guidance"
                    name="followUpGuidance"
                    defaultValue={branchSettings?.followUpGuidance || ""}
                    placeholder="Clarify how this branch wants teams to respond and follow up."
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Email from name"
                      name="emailFromName"
                      defaultValue={branchSettings?.emailFromName || ""}
                    />
                    <Field
                      label="Email from address"
                      name="emailFromAddress"
                      type="email"
                      defaultValue={branchSettings?.emailFromAddress || ""}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Email reply-to"
                      name="emailReplyTo"
                      type="email"
                      defaultValue={branchSettings?.emailReplyTo || ""}
                    />
                    <Field
                      label="SMS from number"
                      name="smsFromNumber"
                      type="tel"
                      defaultValue={branchSettings?.smsFromNumber || ""}
                    />
                  </div>
                  <Field
                    label="WhatsApp from number"
                    name="whatsappFromNumber"
                    type="tel"
                    defaultValue={branchSettings?.whatsappFromNumber || ""}
                  />
                  <SubmitButton
                    idleLabel="Save branch overrides"
                    pendingLabel="Saving overrides..."
                    className="inline-flex items-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>
              </article>
            );
          })}
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

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}) {
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
