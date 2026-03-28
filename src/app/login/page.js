import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCurrentUser, getUserLandingPage } from "@/lib/auth";
import { getCopy, translateRoleLabel } from "@/lib/i18n";
import { demoAuthUsers } from "@/lib/policies";

export const metadata = {
  title: "Sign In",
  description: "Secure access for pastors, ministry leaders, and volunteers.",
};

export default async function LoginPage() {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const user = await getCurrentUser();
  if (user) {
    redirect(getUserLandingPage(user));
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            {copy.loginPage.kicker}
          </p>
          <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
            {copy.loginPage.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {copy.loginPage.description}
          </p>

          <div className="mt-8 rounded-[1.5rem] bg-canvas p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              {copy.loginPage.publicRouteTitle}
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground">
              {copy.loginPage.publicRouteBody}
            </p>
          </div>
        </article>

        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <h2 className="text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
            {copy.loginPage.welcomeBack}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            {copy.loginPage.useAssignedAccount}
          </p>
          <div className="mt-6">
            <LoginForm copy={copy} />
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted">
            <Link
              href="/account-recovery"
              className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
            >
              {copy.loginPage.needRecovery}
            </Link>
            <Link
              href="/requests/status"
              className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
            >
              {copy.loginPage.trackRequest}
            </Link>
          </div>
        </article>
      </section>

      {process.env.NODE_ENV !== "production" ? (
        <section className="mt-8 surface-card rounded-[2rem] border border-line bg-paper p-8">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            {copy.loginPage.demoAccounts}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {demoAuthUsers.map((account) => (
              <article
                key={account.email}
                className="rounded-[1.5rem] border border-line bg-canvas p-5"
              >
                <p className="text-sm font-semibold text-foreground">{account.name}</p>
                <p className="mt-2 text-sm text-muted">
                  {translateRoleLabel(account.role, preferences.language)}
                </p>
                <p className="mt-4 text-sm leading-7 text-foreground">
                  {account.email}
                </p>
                <p className="text-sm leading-7 text-foreground">
                  {account.password}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
