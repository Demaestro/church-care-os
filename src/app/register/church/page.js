import Link from "next/link";
import { redirect } from "next/navigation";
import { registerChurchWorkspace } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentUser } from "@/lib/auth";
import { supportedTimezones } from "@/lib/organization-defaults";

export const metadata = {
  title: "Register Your Church",
  description:
    "Create a Church OS workspace for your pastor team — members, attendance, finance, discipleship, care, and more in one platform.",
};

export default async function RegisterChurchPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    redirect("/");
  }

  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
        <section className="rounded-[2.5rem] bg-[linear-gradient(145deg,#020230_0%,#020266_55%,#0a0a80_100%)] p-8 text-white shadow-xl lg:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold tracking-[0.2em] text-white" style={{ background: "rgba(212,175,55,0.25)", border: "1.5px solid rgba(212,175,55,0.45)" }}>
            🔥
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
            Church OS — Full Ecosystem
          </p>
          <h1 className="mt-4 text-4xl leading-tight tracking-[-0.04em] [font-family:var(--font-display)] sm:text-5xl">
            One platform for every part of your ministry.
          </h1>
          <p className="mt-5 text-base leading-8 text-blue-100">
            Set up your church workspace once. Everything — members, finance, attendance,
            discipleship, care, volunteers — is ready from day one.
          </p>

          <div className="mt-8 space-y-4">
            <FeatureRow
              title="Complete member management"
              body="Member directory, households, groups, onboarding journeys, and attendance records all in one place."
            />
            <FeatureRow
              title="Finance & stewardship"
              body="Double-entry ledger, fund accounting, tithes, offerings, pledges, and multi-signature approvals."
            />
            <FeatureRow
              title="Discipleship & care"
              body="Growth pathways, pastoral follow-up, care requests, prayer needs — tracked and resolved together."
            />
            <FeatureRow
              title="AI-powered intelligence"
              body="AI Shepherd gives your pastors instant answers about attendance trends, giving patterns, and care gaps."
            />
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-line bg-paper p-8 shadow-sm lg:p-10">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Pastor signup
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Create your church workspace
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Start with the basics. You can refine the rest of the branding, team accounts,
              and follow-up settings right after this step.
            </p>
          </div>

          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle="Done"
            errorTitle="Check this"
          />

          <form action={registerChurchWorkspace} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Church name" name="churchName" placeholder="FirstLove Assembly" required />
              <Field label="Public campus label" name="campusName" placeholder="Central campus" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Pastor name" name="pastorName" placeholder="Pastor Emmanuel Afolayan" required />
              <Field label="Church website" name="websiteUrl" placeholder="firstloveassembly.org" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Church workspace email" name="email" type="email" placeholder="pastor@firstloveassembly.org" required />
              <Field label="Pastor phone" name="phone" type="tel" placeholder="+2348012345678" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Public support email" name="supportEmail" type="email" placeholder="care@firstloveassembly.org" />
              <Field label="Public support phone" name="supportPhone" type="tel" placeholder="+2348012345678" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="City" name="city" placeholder="Lagos" />
              <Field label="State" name="state" placeholder="Lagos State" />
              <Field label="Country" name="country" placeholder="Nigeria" />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-foreground">Timezone</span>
              <select
                name="timezone"
                defaultValue="Africa/Lagos"
                className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground focus:border-moss focus:outline-none"
              >
                {supportedTimezones.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">Church logo</span>
              <input
                type="file"
                name="churchLogo"
                accept="image/png,image/jpeg,image/webp"
                className="mt-2 block w-full rounded-[1rem] border border-dashed border-line bg-canvas px-4 py-3.5 text-sm text-foreground"
              />
              <p className="mt-2 text-xs text-muted">
                PNG, JPG, or WebP. This logo appears on member sign-in and public member tools.
              </p>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Password" name="password" type="password" placeholder="Create a strong password" required />
              <Field
                label="Confirm password"
                name="confirmPassword"
                type="password"
                placeholder="Repeat the password"
                required
              />
            </div>

            <SubmitButton
              idleLabel="Create church workspace"
              pendingLabel="Creating workspace..."
              className="inline-flex min-h-14 w-full items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
            />
          </form>

          <p className="mt-6 text-sm text-muted">
            Looking for member sign-up instead?{" "}
            <Link href="/register" className="font-semibold text-moss hover:underline">
              Create a member account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function Field({ label, name, placeholder, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground focus:border-moss focus:outline-none"
      />
    </label>
  );
}

function FeatureRow({ title, body }) {
  return (
    <article className="rounded-[1.4rem] border border-white/15 bg-white/8 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-blue-100">{body}</p>
    </article>
  );
}
