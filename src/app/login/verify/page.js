import Link from "next/link";
import { getPendingSession } from "@/lib/session";
import { LoginChallengeForm } from "@/components/login-challenge-form";

export const metadata = {
  title: "Verify Sign In",
  description:
    "Complete multi-factor sign-in before opening the internal workspace.",
};

export default async function VerifyLoginPage() {
  const pending = await getPendingSession();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr]">
        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            Two-step sign-in
          </p>
          <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
            Confirm it is really you.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Enter the current authenticator code or one unused backup code. This extra step protects branch and headquarters care data if a password is ever exposed.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-line bg-canvas p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Why this matters
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground">
              <li>Headquarters and branch records stay protected even if one password is guessed.</li>
              <li>Cross-branch oversight can stay private without lowering the bar for sign-in.</li>
              <li>Backup codes let you recover access if your authenticator device is unavailable.</li>
            </ul>
          </div>
        </article>

        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <h2 className="text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
            Finish sign-in
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            {pending?.userId
              ? "Your password was accepted. Enter your second-step code to continue."
              : "This sign-in challenge expired. Start again from the main sign-in screen."}
          </p>

          <div className="mt-6">
            {pending?.userId ? (
              <LoginChallengeForm />
            ) : (
              <div className="rounded-[1.35rem] border border-line bg-canvas p-5">
                <p className="text-sm leading-7 text-muted">
                  Verification sessions stay short on purpose so unfinished sign-ins cannot linger.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
                >
                  Back to sign in
                </Link>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
