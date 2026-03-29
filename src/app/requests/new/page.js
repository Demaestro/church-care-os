import Link from "next/link";
import { RequestIntakeForm } from "@/components/request-intake-form";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCopy } from "@/lib/i18n";
import { getChurchSettings } from "@/lib/organization-store";

export const metadata = {
  title: "Request Care",
  description:
    "A low-friction care request form with visible privacy controls and a calm member experience.",
};

export default async function NewRequestPage() {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const settings = getChurchSettings();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2.2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="max-w-4xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            {copy.requestNew.kicker}
          </p>
          <h1 className="mt-4 text-4xl leading-tight tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
            {copy.requestNew.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-muted sm:text-lg">
            {copy.requestNew.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {settings?.supportEmail ? (
              <span className="rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
                {settings.supportEmail}
              </span>
            ) : null}
            {settings?.supportPhone ? (
              <span className="rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
                {settings.supportPhone}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-8">
          <RequestIntakeForm language={preferences.language} copy={copy} />
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {settings?.emergencyBanner ||
            copy.requestNew.emergencyFallback}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/requests/status"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            {copy.requestNew.trackRequest}
          </Link>
          <Link
            href="/member"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            {copy.layout.nav.memberPortal}
          </Link>
          <Link
            href="/permissions"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            {copy.requestNew.permissions}
          </Link>
        </div>
      </div>
    </div>
  );
}
