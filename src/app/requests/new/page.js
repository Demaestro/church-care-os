import Link from "next/link";
import { RequestIntakeForm } from "@/components/request-intake-form";
import { getChurchSettings } from "@/lib/organization-store";

export const metadata = {
  title: "Request Care",
  description:
    "A low-friction care request form with visible privacy controls and a calm member experience.",
};

export default function NewRequestPage() {
  const settings = getChurchSettings();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2.2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="max-w-4xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            Member intake
          </p>
          <h1 className="mt-4 text-4xl leading-tight tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
            Ask for care without navigating church structure first.
          </h1>
          <p className="mt-5 text-base leading-8 text-muted sm:text-lg">
            A pastor or care lead reviews every request before anything is
            routed wider. Privacy choices live inside this form so members can
            decide consent at the point of submission.
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
          <RequestIntakeForm />
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {settings?.emergencyBanner ||
            "If the situation is unsafe or urgent right now, contact a pastor or emergency support directly instead of waiting on this form alone."}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/requests/status"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            Track a request
          </Link>
          <Link
            href="/permissions"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            View permission matrix
          </Link>
        </div>
      </div>
    </div>
  );
}
