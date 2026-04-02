import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { hasPendingApplication } from "@/lib/volunteer-store";
import { VolunteerApplyForm } from "@/components/volunteer-apply-form";

export const metadata = {
  title: "Serve as a Volunteer",
  description: "Apply to join a care ministry team at your church.",
};

export default async function VolunteerApplyPage() {
  const user = await requireCurrentUser([
    "member", "volunteer", "leader", "pastor", "owner",
    "general_overseer", "regional_overseer", "branch_admin",
  ]).catch(() => redirect("/login"));

  const alreadyPending = hasPendingApplication(user.organizationId, user.branchId, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
          Volunteer ministry
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Serve your church
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Tell us where your heart is and how you&apos;d like to help. Your pastor will review your application and reach out to confirm.
        </p>
      </div>

      {alreadyPending ? (
        <div className="rounded-[1.5rem] border border-[rgba(73,106,77,0.2)] bg-[rgba(73,106,77,0.06)] px-6 py-8 text-center">
          <p className="text-2xl">🙏</p>
          <p className="mt-3 text-base font-semibold text-foreground">Application received</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Your volunteer application is under review. Your pastor will contact you soon.
          </p>
        </div>
      ) : (
        <VolunteerApplyForm userName={user.name} userEmail={user.email} />
      )}
    </div>
  );
}
