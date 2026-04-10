import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout, quickDemoLogin } from "@/app/actions";
import { LoginForm } from "@/components/login-form";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCurrentUser, getUserLandingPage } from "@/lib/auth";
import { getCopy, translateRoleLabel } from "@/lib/i18n";
import { defaultPrimaryOrganizationId } from "@/lib/organization-defaults";
import { getPublicWorkspaceCatalog } from "@/lib/organization-store";
import { demoAuthUsers } from "@/lib/policies";
import { PUBLIC_ORGANIZATION_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Sign In",
  description: "Secure member access and church workspace access for care and follow-up.",
};

export default async function LoginPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const params = await searchParams;
  const mode = params?.mode === "member" ? "member" : "church";
  const switchMode = params?.switch === "1";
  const notice = typeof params?.notice === "string" ? params.notice.trim() : "";
  const error = typeof params?.error === "string" ? params.error.trim() : "";
  const user = await getCurrentUser();

  if (user && !switchMode) {
    redirect(getUserLandingPage(user));
  }

  const cookieStore = await cookies();
  const catalog = getPublicWorkspaceCatalog();
  const organizationId =
    cookieStore.get(PUBLIC_ORGANIZATION_COOKIE)?.value ||
    defaultPrimaryOrganizationId ||
    catalog[0]?.id ||
    "";
  const organization =
    catalog.find((item) => item.id === organizationId) ||
    catalog.find((item) => item.id === defaultPrimaryOrganizationId) ||
    catalog[0] ||
    null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid min-h-[640px] overflow-hidden rounded-[2.5rem] border border-line bg-paper shadow-xl lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-between bg-[linear-gradient(145deg,#112041_0%,#1d4ed8_45%,#4338ca_100%)] p-8 lg:p-10">
          <div className="flex items-center gap-4">
            {organization?.logoHref ? (
              <Image
                src={organization.logoHref}
                alt={`${organization.name} logo`}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-[1.5rem] border border-white/15 bg-white/10 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/15 text-lg font-bold tracking-[0.18em] text-white">
                {(organization?.shortName || organization?.name || "CC").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
                {organization?.name || "Church Care OS"}
              </p>
              <p className="mt-1 text-sm text-blue-100">
                {organization?.pastorName
                  ? `Led by ${organization.pastorName}`
                  : "Member care and follow-up"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
              {mode === "member" ? "Member access" : "Church workspace"}
            </p>
            <h1 className="mt-4 text-4xl leading-tight tracking-[-0.04em] text-white [font-family:var(--font-display)] sm:text-5xl">
              {mode === "member"
                ? "Sign in to your member space."
                : "Sign in to lead your ministry clearly."}
            </h1>
            <p className="mt-5 text-base leading-8 text-blue-100">
              {mode === "member"
                ? "Members can review support request progress, update contact details, and stay in step with the next touchpoint."
                : "Pastors, leaders, and volunteers enter the church workspace here for follow-up, assignments, and pastoral oversight."}
            </p>
          </div>

          <div className="space-y-4">
            <ModeCard
              href="/login?mode=church"
              active={mode === "church"}
              title="Church workspace"
              body="Pastor, team, and volunteer sign-in."
            />
            <ModeCard
              href="/login?mode=member"
              active={mode === "member"}
              title="Member access"
              body="Member profile, request history, and secure sign-in."
            />
            <div className="rounded-[1.4rem] border border-white/15 bg-white/8 p-4">
              <p className="text-sm font-semibold text-white">New here?</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href="/register" className="font-medium text-blue-100 underline underline-offset-4">
                  Create member account
                </Link>
                <Link href="/register/church" className="font-medium text-blue-100 underline underline-offset-4">
                  Register your church
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-8 py-10 lg:px-12">
          {switchMode && user ? (
            <div className="mb-6 rounded-[1.2rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                Signed in as
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{user.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={getUserLandingPage(user)}
                  className="rounded-[0.85rem] border border-line bg-paper px-3 py-2 text-xs font-medium text-foreground hover:bg-canvas"
                >
                  Back to workspace
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-[0.85rem] border border-line bg-paper px-3 py-2 text-xs font-medium text-foreground hover:bg-canvas"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === "member" ? "Welcome back, member" : "Welcome back"}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {mode === "member"
                ? "Use the account linked to your church member profile."
                : "Use the account assigned to your church role."}
            </p>
          </div>

          {notice ? (
            <div className="mb-5 rounded-[1rem] border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] px-4 py-3 text-sm text-moss">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-[1rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] px-4 py-3 text-sm text-clay">
              {error}
            </div>
          ) : null}

          <LoginForm copy={copy.loginForm} />

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {mode === "member" ? (
              <>
                <Link href="/register" className="text-muted hover:text-foreground hover:underline">
                  Create a member account
                </Link>
                <span className="text-line">|</span>
                <Link href="/requests/status" className="text-muted hover:text-foreground hover:underline">
                  Track a request
                </Link>
              </>
            ) : (
              <>
                <Link href="/account-recovery" className="text-muted hover:text-foreground hover:underline">
                  Forgot password?
                </Link>
                <span className="text-line">|</span>
                <Link href="/register/church" className="text-muted hover:text-foreground hover:underline">
                  Register your church
                </Link>
              </>
            )}
          </div>

          <div className="mt-8 rounded-[1.3rem] border border-line bg-canvas p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {mode === "member" ? "Prefer not to sign in yet?" : "Member tools stay simple"}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/requests/new" className="font-medium text-foreground underline underline-offset-4">
                Request support
              </Link>
              <Link href="/requests/status" className="font-medium text-foreground underline underline-offset-4">
                Track a request
              </Link>
              <Link href="/member" className="font-medium text-foreground underline underline-offset-4">
                Member portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {process.env.NODE_ENV !== "production" ? (
        <div className="mt-8 rounded-[2rem] border border-line bg-paper p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            {copy.loginPage.quickAccessTitle}
          </p>
          <p className="mt-2 text-sm text-muted">
            {copy.loginPage.quickAccessBody}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {demoAuthUsers.map((account) => (
              <form key={account.email} action={quickDemoLogin}>
                <input type="hidden" name="email" value={account.email} />
                <button
                  type="submit"
                  className="w-full rounded-[1.3rem] border border-line bg-canvas px-4 py-4 text-left transition hover:border-[var(--soft-accent-border)] hover:bg-[var(--soft-fill)]"
                >
                  <p className="text-sm font-semibold text-foreground">{account.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {translateRoleLabel(account.role, preferences.language)}
                  </p>
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModeCard({ href, active, title, body }) {
  return (
    <Link
      href={href}
      className={`block rounded-[1.35rem] border p-4 transition ${
        active
          ? "border-white/25 bg-white/12"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-blue-100">{body}</p>
    </Link>
  );
}
