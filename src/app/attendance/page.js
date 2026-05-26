import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import {
  listAttendanceByService,
  listRecentServices,
} from "@/lib/attendance-store";
import { listMembers } from "@/lib/member-store";
import { createService, recordAttendanceCheckIn } from "@/app/actions";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const params = await searchParams;
  const cookieStore = await cookies();
  const workspace = getWorkspaceContext(
    user,
    cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || ""
  );
  const activeBranchId =
    workspace.activeBranch?.id ||
    (user.accessScope === "organization" ? "" : user.branchId);
  const members = listMembers({
    organizationId: user.organizationId,
    branchId: activeBranchId,
    limit: 200,
  });
  const services = listRecentServices({
    organizationId: user.organizationId,
    branchId: activeBranchId,
  });
  const selectedServiceId =
    (typeof params?.service === "string" ? params.service : "") ||
    services[0]?.id ||
    "";
  const selectedService =
    services.find((service) => service.id === selectedServiceId) || null;
  const roster = selectedServiceId
    ? listAttendanceByService(selectedServiceId, {
        organizationId: user.organizationId,
        branchId: activeBranchId,
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Attendance & Engagement
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">Attendance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            Capture service presence quickly, keep the active roster visible, and feed each
            member&apos;s engagement history without opening a separate admin flow.
          </p>
        </div>
        <Link href="/analytics" className="text-sm font-medium text-moss hover:underline">
          Open analytics
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <p className="text-sm font-semibold text-foreground">Add a service</p>
          <form action={createService} className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Service name</span>
              <input
                name="name"
                placeholder="Sunday Service"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Service date</span>
              <input
                type="date"
                name="serviceDate"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
            >
              Add service
            </button>
          </form>
        </section>

        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Check in a member</p>
              <p className="mt-1 text-sm text-muted">
                Every check-in also writes a service attendance event to the member timeline.
              </p>
            </div>
            {selectedService ? (
              <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Active service: {selectedService.name}
              </span>
            ) : null}
          </div>

          <form action={recordAttendanceCheckIn} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_12rem_auto]">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Member</span>
              <select
                name="memberId"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Service</span>
              <select
                name="serviceId"
                defaultValue={selectedServiceId}
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              >
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {String(service.service_date || "").slice(0, 10)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Mode</span>
              <select
                name="mode"
                className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none focus:border-moss"
              >
                <option value="physical">Physical</option>
                <option value="online">Online</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                Record
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Recent services</p>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {services.length} logged
            </span>
          </div>

          {services.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No services recorded yet. Add a service to start tracking attendance.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {services.map((service) => {
                const active = service.id === selectedServiceId;
                return (
                  <Link
                    key={service.id}
                    href={`/attendance?service=${service.id}`}
                    className={`flex items-center justify-between rounded-[1.2rem] border px-4 py-3 transition ${
                      active
                        ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)]"
                        : "border-line bg-canvas hover:bg-[#f4ecde]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{service.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {String(service.service_date || service.serviceDate || "").slice(0, 10)}
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-muted">
                      {service.attendance_count || 0}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[1.6rem] border border-line bg-paper p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Current roster</p>
              <p className="mt-1 text-sm text-muted">
                {selectedService
                  ? `${selectedService.name} attendance captured so far.`
                  : "Choose a service to view the roster."}
              </p>
            </div>
            {selectedService ? (
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                {roster.length} checked in
              </span>
            ) : null}
          </div>

          {!selectedService ? (
            <p className="mt-4 text-sm text-muted">No service selected yet.</p>
          ) : roster.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nobody has been checked in for this service yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {roster.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-[1.1rem] border border-line bg-canvas px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {record.full_name || "Member"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {record.email || record.phone || "No contact on file"}
                    </p>
                  </div>
                  <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {record.mode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
