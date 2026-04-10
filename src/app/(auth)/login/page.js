import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout, quickDemoLogin } from "@/app/actions";
import { LoginForm } from "@/components/login-form";
import { OrgLogo } from "@/components/org-logo";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCurrentUser, getUserLandingPage } from "@/lib/auth";
import { getCopy, translateRoleLabel } from "@/lib/i18n";
import { defaultPrimaryOrganizationId } from "@/lib/organization-defaults";
import { getPublicWorkspaceCatalog } from "@/lib/organization-store";
import { demoAuthUsers } from "@/lib/policies";
import { PUBLIC_ORGANIZATION_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Sign In — Firstlove Assembly",
  description: "Sign in to the Firstlove Assembly ministry ecosystem.",
};

const FLA_LOGO = "https://firstloveassembly.org.ng/img/FLA_LOGO_MAIN.png";

export default async function LoginPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const params = await searchParams;
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

  const logoSrc = organization?.logoHref || FLA_LOGO;
  const orgName = organization?.name || "Firstlove Assembly";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f4] px-4 py-12">

      {/* ── Login card ─────────────────────────────────────────────── */}
      <div className="w-full max-w-sm">

        {/* Logo + church identity */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#020266] shadow-lg">
            <OrgLogo
              src={logoSrc}
              alt={orgName}
              initials={(orgName || "FL").slice(0, 2)}
              className="h-[88px] w-[88px] rounded-full object-contain"
              fallbackClassName="text-2xl font-extrabold tracking-wider text-white"
            />
          </div>

          <h1 className="text-xl font-extrabold tracking-wide text-[#020266]">
            {orgName}
          </h1>
          <div className="mt-1.5 h-[2.5px] w-8 rounded-full bg-[#FF6600]" />
          <p className="mt-2.5 max-w-[240px] text-xs leading-relaxed text-gray-400">
            Spreading the flame of God&rsquo;s love in the Spirit of Christ
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-gray-100 bg-white px-8 py-8 shadow-xl shadow-gray-100/80">

          {/* Switch-mode banner */}
          {switchMode && user ? (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-gray-400">
                Signed in as
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{user.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={getUserLandingPage(user)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Back to workspace
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Sign in to your account to continue.
            </p>
          </div>

          {notice ? (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <LoginForm copy={copy.loginForm} />

          <div className="mt-4 text-center">
            <Link
              href="/account-recovery"
              className="text-xs text-gray-400 transition hover:text-[#020266] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-[0.65rem] text-gray-300 uppercase tracking-[0.2em]">
          Firstlove Assembly &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Dev quick-access — hidden in production */}
      {process.env.NODE_ENV !== "production" ? (
        <div className="mt-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gray-400">
            {copy.loginPage.quickAccessTitle}
          </p>
          <p className="mt-1 text-xs text-gray-400">{copy.loginPage.quickAccessBody}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {demoAuthUsers.map((account) => (
              <form key={account.email} action={quickDemoLogin}>
                <input type="hidden" name="email" value={account.email} />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-xs transition hover:border-[#020266]/20 hover:bg-[#020266]/5"
                >
                  <p className="font-semibold text-gray-800">{account.name}</p>
                  <p className="mt-0.5 text-gray-400">
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
