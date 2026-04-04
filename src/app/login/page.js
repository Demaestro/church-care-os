import Link from "next/link";
import { redirect } from "next/navigation";
import { logout, quickDemoLogin } from "@/app/actions";
import { LoginForm } from "@/components/login-form";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCurrentUser, getUserLandingPage } from "@/lib/auth";
import { getCopy, translateRoleLabel } from "@/lib/i18n";
import { demoAuthUsers } from "@/lib/policies";

export const metadata = {
  title: "Sign In",
  description: "Secure access for pastors, ministry leaders, and volunteers.",
};

export default async function LoginPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const params = await searchParams;
  const switchMode = params?.switch === "1";
  const notice =
    typeof params?.notice === "string" ? params.notice.trim() : "";
  const error = typeof params?.error === "string" ? params.error.trim() : "";
  const user = await getCurrentUser();
  if (user && !switchMode) {
    redirect(getUserLandingPage(user));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid min-h-[520px] overflow-hidden rounded-[2.5rem] border border-line shadow-lg lg:grid-cols-2">

        {/* ── Left: Brand panel ── */}
        <div className="flex flex-col justify-between bg-[linear-gradient(145deg,#1e3a8a_0%,#1d4ed8_45%,#4338ca_100%)] p-10 lg:p-12">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold tracking-widest text-white">
              CC
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
              Church Care OS
            </p>
          </div>

          <div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
              A calmer way<br />to care for<br />your people.
            </h1>
            <p className="mt-4 text-sm leading-7 text-blue-200">
              Pastoral care, follow-up workflows, and discipleship — all in one private, secure space.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Access roles</p>
            <div className="flex flex-wrap gap-2">
              {["Pastor", "Leader", "Volunteer", "Member"].map(r => (
                <span key={r} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Sign-in form ── */}
        <div className="flex flex-col justify-center bg-paper px-8 py-10 lg:px-12">
          {switchMode && user ? (
            <div className="mb-6 rounded-[1.2rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Signed in as</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{user.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={getUserLandingPage(user)} className="rounded-[0.85rem] border border-line bg-paper px-3 py-2 text-xs font-medium text-foreground hover:bg-canvas">
                  Back to workspace
                </Link>
                <form action={logout}>
                  <button type="submit" className="rounded-[0.85rem] border border-line bg-paper px-3 py-2 text-xs font-medium text-foreground hover:bg-canvas">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted">Sign in to your care workspace.</p>
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
            <Link href="/account-recovery" className="text-muted hover:text-foreground hover:underline">
              Forgot password?
            </Link>
            <span className="text-line">·</span>
            <Link href="/requests/status" className="text-muted hover:text-foreground hover:underline">
              Track a request
            </Link>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-sm text-muted">
              New to your church?{" "}
              <Link href="/register" className="font-semibold text-moss hover:underline">
                Create a member account →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Demo quick-access (dev only) ── */}
      {process.env.NODE_ENV !== "production" ? (
        <div className="mt-8 rounded-[2rem] border border-line bg-paper p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            {copy.loginPage.quickAccessTitle}
          </p>
          <p className="mt-2 text-sm text-muted">{copy.loginPage.quickAccessBody}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {demoAuthUsers.map((account) => (
              <form key={account.email} action={quickDemoLogin}>
                <input type="hidden" name="email" value={account.email} />
                <button
                  type="submit"
                  className="w-full rounded-[1.3rem] border border-line bg-canvas px-4 py-4 text-left transition hover:border-[var(--soft-accent-border)] hover:bg-[var(--soft-fill)]"
                >
                  <p className="text-sm font-semibold text-foreground">{account.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{translateRoleLabel(account.role, preferences.language)}</p>
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
