import { requireCurrentUser } from "@/lib/auth";
import { listRecentServices } from "@/lib/attendance-store";
import { listMembers } from "@/lib/member-store";
import { createService } from "@/app/actions";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const members = listMembers({ organizationId: user.organizationId, branchId: user.branchId, limit: 200 });
  const services = listRecentServices({
    organizationId: user.organizationId,
    branchId: user.branchId,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Attendance & Engagement
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-foreground">Attendance</h1>
          <p className="mt-2 text-sm text-muted">
            Track physical and online service engagement across your campus.
          </p>
        </div>
      </div>

      <form action={createService} className="mb-8 grid gap-4 rounded-[1.5rem] border border-line bg-paper p-6 lg:grid-cols-3">
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
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
          >
            Add service
          </button>
        </div>
      </form>

      <form action="/attendance" className="mb-8 rounded-[1.5rem] border border-line bg-paper p-6">
        <p className="text-sm font-semibold text-foreground">Quick check-in (demo)</p>
        <p className="mt-2 text-sm text-muted">
          Select a member and then record attendance from the member profile. This page keeps the services list ready.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground">
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name || member.fullName}
              </option>
            ))}
          </select>
          <select className="w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground">
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </form>

      {services.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-canvas px-8 py-12 text-center text-muted">
          No services recorded yet. Add a service to start tracking attendance.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-line bg-paper">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-[0.2em] text-muted">
              <tr>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {service.name}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {String(service.service_date || service.serviceDate || "").slice(0, 10)}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {service.attendance_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
