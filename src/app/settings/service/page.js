import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { getServiceSchedule } from "@/lib/new-member-store";
import { saveServiceSchedule } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { FlashBanner } from "@/components/flash-banner";

export const metadata = { title: "Service Schedule", description: "Set service times and configure automated reminders." };

export default async function ServiceSchedulePage({ searchParams }) {
  const params = await searchParams;
  const user = await requireCurrentUser(["pastor","overseer","owner","branch_admin","general_overseer"]);
  const cookieStore = await cookies();
  const preferredBranchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = workspace.organization.id;
  const schedule = getServiceSchedule(orgId, branchId);
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error  = typeof params?.error  === "string" ? params.error  : "";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <section className="surface-card p-8">
        <p className="eyebrow">Automated reminders</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Sunday Service Schedule</h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Set your service details once. New members will automatically receive up to 3 gentle reminders each week — Thursday, Saturday, and Sunday morning — so they never forget to come.
        </p>
        <div className="mt-6">
          <FlashBanner notice={notice} error={error} noticeTitle="Saved" errorTitle="Could not save" />
        </div>
        <form action={saveServiceSchedule} className="mt-6 space-y-5">
          <input type="hidden" name="organizationId" value={orgId} />
          <input type="hidden" name="branchId" value={branchId} />
          <Field label="Service name" name="serviceName" defaultValue={schedule?.service_name || "Sunday Service"} placeholder="Sunday Morning Service" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">Day of week</label>
              <select name="dayOfWeek" defaultValue={schedule?.day_of_week ?? 0} className="mt-2 input-field">
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
            <Field label="Service time" name="serviceTime" type="time" defaultValue={schedule?.service_time || "09:00"} />
          </div>
          <Field label="Location / venue name" name="location" defaultValue={schedule?.location || ""} placeholder="Grace Assembly Main Auditorium" />
          <Field label="Full address" name="address" defaultValue={schedule?.address || ""} placeholder="12 Church Road, Lagos, Nigeria" />
          <div>
            <p className="text-sm font-medium text-foreground">Automated reminders</p>
            <p className="mt-1 text-xs text-muted">Choose which days new members receive a service reminder notification.</p>
            <div className="mt-3 space-y-3">
              <Toggle name="reminderThursday" label="Thursday reminder" detail="'This Sunday: [Service name] at [Time]'" defaultChecked={schedule?.reminder_thursday !== 0} />
              <Toggle name="reminderSaturday" label="Saturday reminder" detail="'Tomorrow: [Service name] — We'd love to see you'" defaultChecked={schedule?.reminder_saturday !== 0} />
              <Toggle name="reminderSundayMorning" label="Sunday morning reminder" detail="'Good morning! Service starts at [Time] today'" defaultChecked={schedule?.reminder_sunday_morning !== 0} />
            </div>
          </div>
          <SubmitButton idleLabel="Save service schedule" pendingLabel="Saving…" className="btn-primary w-full" />
        </form>
      </section>
    </div>
  );
}

function Field({ label, name, defaultValue, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} className="mt-2 input-field" />
    </label>
  );
}

function Toggle({ name, label, detail, defaultChecked }) {
  return (
    <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-canvas px-4 py-3 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded" />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs leading-5 text-muted">{detail}</span>
      </span>
    </label>
  );
}
