import { cookies } from "next/headers";
import {
  disableMfaEnrollment,
  startMfaEnrollment,
} from "@/app/actions";
import { MfaEnrollmentForm } from "@/components/mfa-enrollment-form";
import { requireCurrentUser } from "@/lib/auth";
import { buildTotpProvisioningUri } from "@/lib/totp";

const MFA_SETUP_PREVIEW_COOKIE = "cco-mfa-preview-codes";

export const metadata = {
  title: "Security",
  description: "Strengthen sign-in controls, MFA, and high-trust workspace access.",
};

export default async function SecurityPage({ searchParams }) {
  const params = await searchParams;
  const mfaRequired = params?.mfa_required === "1";
  const user = await requireCurrentUser([
    "owner",
    "overseer",
    "general_overseer",
    "hq_care_admin",
    "regional_overseer",
    "branch_admin",
    "pastor",
    "leader",
    "volunteer",
  ]);
  const cookieStore = await cookies();
  const previewCodes = JSON.parse(
    cookieStore.get(MFA_SETUP_PREVIEW_COOKIE)?.value || "[]"
  );
  const setupInProgress = Boolean(user.mfaSecret) && !user.mfaEnabled;
  const provisioningUri =
    setupInProgress && user.mfaSecret
      ? buildTotpProvisioningUri({
          secret: user.mfaSecret,
          accountName: user.email,
          issuer: "Church Care OS",
        })
      : "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      {mfaRequired && (
        <div className="mb-6 flex items-start gap-4 rounded-[1.35rem] border border-[rgba(29,78,216,0.22)] bg-[rgba(29,78,216,0.07)] px-5 py-4">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--moss)] text-white text-sm font-bold">!</span>
          <div>
            <p className="font-semibold text-foreground">MFA setup required for your role</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Your account holds a high-trust role that requires multi-factor authentication
              before you can access the workspace. Complete the setup below to continue.
            </p>
          </div>
        </div>
      )}
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Security controls
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Protect branch and headquarters access.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Multi-factor authentication protects care notes, cross-branch oversight, and high-trust leadership access if a password is ever exposed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Current role" value={user.role} />
            <MetricCard
              label="MFA status"
              value={user.mfaEnabled ? "Enabled" : setupInProgress ? "Setup in progress" : "Off"}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow="Multi-factor authentication"
            title="Use an authenticator app for sign-in"
            body="Authenticator codes are the safest way to protect access for pastors, leaders, volunteers, and HQ roles. Backup codes let you recover access if your device is unavailable."
          />

          {!setupInProgress && !user.mfaEnabled ? (
            <form action={startMfaEnrollment} className="mt-6">
              <button
                type="submit"
                className="inline-flex items-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
              >
                Start MFA setup
              </button>
            </form>
          ) : null}

          {setupInProgress ? (
            <div className="mt-6 space-y-5">
              <InfoCard title="Authenticator secret" body={user.mfaSecret} mono />
              <InfoCard title="Provisioning link" body={provisioningUri} mono />
              <MfaEnrollmentForm />
            </div>
          ) : null}

          {user.mfaEnabled ? (
            <div className="mt-6 rounded-[1.35rem] border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] p-5">
              <p className="text-sm font-semibold text-foreground">
                MFA is active for this account.
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Every future sign-in will require a password plus a current authenticator code or one unused backup code.
              </p>
              <form action={disableMfaEnrollment} className="mt-4">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-canvas"
                >
                  Disable MFA
                </button>
              </form>
            </div>
          ) : null}
        </article>

        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <SectionHeading
            eyebrow="Recovery posture"
            title="Store your backup codes safely"
            body="Backup codes can be used one time each if you do not have your authenticator device nearby. Save them somewhere private before you leave this page."
          />

          {Array.isArray(previewCodes) && previewCodes.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {previewCodes.map((code) => (
                <InfoCard key={code} title="Backup code" body={code} mono />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.35rem] border border-line bg-canvas p-5">
              <p className="text-sm leading-7 text-muted">
                When you start MFA setup, your backup codes will appear here once so you can copy them into a safe place.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-[1.35rem] border border-line bg-canvas p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Current account
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">{user.name}</p>
            <p className="mt-2 text-sm text-muted">{user.email}</p>
            <p className="mt-2 text-sm text-muted">
              Last sign-in: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-GB") : "No sign-in recorded yet"}
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function InfoCard({ title, body, mono = false }) {
  return (
    <article className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{title}</p>
      <p className={`mt-3 text-sm leading-7 text-foreground ${mono ? "break-all font-mono" : ""}`}>
        {body}
      </p>
    </article>
  );
}
