import Link from "next/link";
import { AccountRecoveryForm } from "@/components/account-recovery-form";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCopy } from "@/lib/i18n";
import { getChurchSettings } from "@/lib/organization-store";

export const metadata = {
  title: "Account Recovery",
  description:
    "Request a secure reset link for an internal care account without exposing whether an account exists.",
};

export default async function AccountRecoveryPage() {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const settings = getChurchSettings();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            {copy.recoveryPage.kicker}
          </p>
          <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
            {copy.recoveryPage.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {copy.recoveryPage.description}
          </p>

          <div className="mt-8 space-y-4">
            <InfoCard
              title={copy.recoveryPage.nextTitle}
              body={copy.recoveryPage.nextBody}
            />
            <InfoCard
              title={copy.recoveryPage.supportTitle}
              body={copy.recoveryPage.supportBody(
                settings?.supportEmail,
                settings?.supportPhone
              )}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
          >
            {copy.recoveryPage.backToSignIn}
          </Link>
          <Link
            href="/requests/status"
            className="inline-flex items-center justify-center rounded-[1rem] border border-[rgba(34,28,22,0.08)] bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-foreground"
          >
            {copy.recoveryPage.trackInstead}
          </Link>
        </div>
      </article>

      <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <h2 className="text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
          {copy.recoveryPage.tellUsTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          {copy.recoveryPage.tellUsBody}
        </p>

        <div className="mt-6">
          <AccountRecoveryForm copy={copy} />
        </div>
      </article>
      </section>
    </div>
  );
}

function InfoCard({ title, body }) {
  return (
    <article className="rounded-[1.35rem] border border-line bg-canvas p-5">
      <h2 className="text-xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
    </article>
  );
}
