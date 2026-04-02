import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { getLocaleTag } from "@/lib/app-preferences";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getPasswordResetTokenEntry } from "@/lib/password-reset-store";
import { getCopy } from "@/lib/i18n";

export const metadata = {
  title: "Reset Password",
  description:
    "Choose a new password for an internal care account using a secure one-time link.",
};

export default async function ResetPasswordPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const localeTag = getLocaleTag(preferences.language);
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token.trim() : "";
  const tokenState = getPasswordResetTokenEntry(token);
  const isValid = tokenState.status === "valid";
  const expiresLabel =
    tokenState.expiresAt && isValid
      ? new Date(tokenState.expiresAt).toLocaleString(localeTag, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            {copy.resetPasswordPage.kicker}
          </p>
          <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
            {copy.resetPasswordPage.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {copy.resetPasswordPage.description}
          </p>

          <div className="mt-8 space-y-4">
            {isValid ? (
              <InfoCard
                title={copy.resetPasswordPage.validFor(expiresLabel)}
                body={copy.resetPasswordPage.autoExpireBody}
              />
            ) : (
              <InfoCard
                title={copy.resetPasswordPage.invalidTitle}
                body={copy.resetPasswordPage.invalidBody}
              />
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/account-recovery"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
            >
              {copy.resetPasswordPage.requestNewLink}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-[1rem] border border-[rgba(34,28,22,0.08)] bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-foreground"
            >
              {copy.resetPasswordPage.backToSignIn}
            </Link>
          </div>
        </article>

        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          {isValid ? (
            <>
              <h2 className="text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
                {copy.resetPasswordPage.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                {copy.resetPasswordPage.validFor(expiresLabel)}
              </p>
              <div className="mt-6">
                <PasswordResetForm
                  formCopy={copy.resetPasswordForm}
                  pageCopy={{
                    backToSignIn: copy.resetPasswordPage.backToSignIn,
                    requestNewLink: copy.resetPasswordPage.requestNewLink,
                  }}
                  token={token}
                />
              </div>
            </>
          ) : (
            <div className="rounded-[1.8rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] p-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-clay">
                {copy.resetPasswordPage.invalidTitle}
              </p>
              <h2 className="mt-4 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                {copy.resetPasswordPage.requestNewLink}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                {copy.resetPasswordPage.invalidBody}
              </p>
            </div>
          )}
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
