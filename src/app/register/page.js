import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listOrganizations } from "@/lib/organization-store";
import { RegisterForm } from "@/components/register-form";

export const metadata = {
  title: "Create Account",
  description: "Join your church on Church OS.",
};

export default async function RegisterPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (user) redirect("/");

  const orgs = listOrganizations();
  const preselectedOrgId = typeof params?.org === "string" ? params.org : "";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">New member</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Join your church community on Church OS.</p>
        </div>

        <div className="rounded-[2rem] border border-line bg-paper p-8 shadow-sm">
          <RegisterForm
            orgs={orgs}
            preselectedOrgId={preselectedOrgId}
          />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-moss hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted">
          Are you a pastor setting up your church?{" "}
          <Link href="/register/church" className="font-semibold text-moss hover:underline">
            Create a church workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
