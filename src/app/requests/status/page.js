import Link from "next/link";
import { RequestStatusLookup } from "@/components/request-status-lookup";
import { getMemberRequestStatusByTrackingCode } from "@/lib/care-store";
import { getChurchSettings } from "@/lib/organization-store";

export const metadata = {
  title: "Request Status",
  description:
    "Track a submitted care request with a member-safe status view and timeline.",
};

export default async function RequestStatusPage({ searchParams }) {
  const params = await searchParams;
  const trackingCode =
    typeof params?.code === "string" ? params.code.trim().toUpperCase() : "";
  const [settings, initialResult] = await Promise.all([
    Promise.resolve(getChurchSettings()),
    trackingCode ? getMemberRequestStatusByTrackingCode(trackingCode) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            Member self-service
          </p>
          <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
            Check where your care request stands.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Use the tracking code from your intake confirmation to see a calm,
            member-safe progress view without logging in or exposing internal care
            notes.
          </p>

          <div className="mt-8 grid gap-4">
            <InfoPanel
              title="What appears here"
              body="You will see the request stage, the current follow-up status, and a privacy-safe timeline of major care handoffs."
            />
            <InfoPanel
              title="Need help with the code?"
              body={`If you cannot find your code, contact ${settings?.supportEmail || "your church care team"}${settings?.supportPhone ? ` or call ${settings.supportPhone}` : ""}.`}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/requests/new"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
            >
              Submit a care request
            </Link>
            <Link
              href="/account-recovery"
              className="inline-flex items-center justify-center rounded-[1rem] border border-[rgba(34,28,22,0.08)] bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-foreground"
            >
              Account recovery
            </Link>
          </div>
        </article>

        <RequestStatusLookup
          initialCode={trackingCode}
          initialResult={initialResult}
        />
      </section>
    </div>
  );
}

function InfoPanel({ title, body }) {
  return (
    <article className="rounded-[1.35rem] border border-line bg-canvas p-5">
      <h2 className="text-xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
    </article>
  );
}
