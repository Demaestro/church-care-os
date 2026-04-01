import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listOrganizations, listBranches } from "@/lib/organization-store";
import { RegisterForm } from "@/components/register-form";

export const metadata = {
  title: "Create Account",
  description: "Join your church on Church Care OS.",
};

export default async function RegisterPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (user) redirect("/");

  const orgs = listOrganizations();
  // Pre-select org if passed in query (e.g. ?org=org-firstlove)
  const preselectedOrgId = typeof params?.org === "string" ? params.org : "";
  const preselectedOrg = preselectedOrgId ? orgs.find(o => o.id === preselectedOrgId) : null;
  const preselectedBranches = preselectedOrg ? listBranches(preselectedOrg.id) : [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">New member</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Join your church community on Church Care OS.</p>
        </div>

        {/* Card */}
        <div className="rounded-[2rem] border border-line bg-paper p-8 shadow-sm">
          <RegisterForm orgs={orgs} preselectedOrgId={preselectedOrgId} preselectedBranches={preselectedBranches} />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-moss hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
