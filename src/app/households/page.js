import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { getHouseholds } from "@/lib/care-store";

const toneClasses = {
  urgent: "border-[rgba(184,101,76,0.22)] bg-[rgba(184,101,76,0.10)] text-clay",
  watch: "border-[rgba(179,138,69,0.24)] bg-[rgba(179,138,69,0.12)] text-gold",
  steady: "border-[rgba(73,106,77,0.24)] bg-[rgba(73,106,77,0.10)] text-moss",
};

export const metadata = {
  title: "Households",
  description:
    "A live board of households, risk levels, owners, requests, and next touchpoints across the care team.",
};

export default async function HouseholdsPage() {
  await requireCurrentUser(["leader", "pastor", "owner"]);
  const households = await getHouseholds();

  const urgentCount = households.filter((household) => household.risk === "urgent").length;
  const watchCount = households.filter((household) => household.risk === "watch").length;
  const unassignedCount = households.filter(
    (household) => household.owner === "Unassigned"
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 pb-16 lg:px-10 lg:py-12">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Household board
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              A live map of the people already in your care orbit.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Each card now reads from the shared store, links into a household
              timeline, and reflects the latest request intake and note activity.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-fit items-center rounded-full border border-line bg-canvas px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1]"
            >
              Back to dashboard
            </Link>
            <Link
              href="/requests/new"
              className="inline-flex w-fit items-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
            >
              Log new request
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Open households"
            value={String(households.length).padStart(2, "0")}
            detail="Every visible household has a timeline and next touchpoint behind it."
          />
          <SummaryCard
            label="Urgent follow-up"
            value={String(urgentCount).padStart(2, "0")}
            detail="These households need movement today from staff or ministry leads."
          />
          <SummaryCard
            label="Needs assignment"
            value={String(unassignedCount).padStart(2, "0")}
            detail="Requests waiting on a named team, lead, or volunteer match."
          />
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <FilterCard
          tone="urgent"
          title="Urgent"
          count={urgentCount}
          description="Immediate touchpoints, counseling, or rapid practical support."
        />
        <FilterCard
          tone="watch"
          title="Watch"
          count={watchCount}
          description="Healthy momentum, but the team should keep a close eye on the next step."
        />
        <FilterCard
          tone="steady"
          title="Steady"
          count={households.length - urgentCount - watchCount}
          description="Progress is moving; the main need is consistent follow-through."
        />
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Active households
            </p>
            <h2 className="mt-3 text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
              Scan for risk, ownership, request load, and the next concrete move.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-8 text-muted">
            Open a household to update its snapshot, log notes, and close related
            requests without leaving the care workflow.
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {households.map((household) => (
            <article
              key={household.slug}
              className="surface-card rounded-[1.75rem] border border-line bg-paper p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-muted">
                    {household.stage}
                  </p>
                  <h3 className="mt-2 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                    {household.name}
                  </h3>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${toneClasses[household.risk]}`}
                >
                  {household.risk}
                </span>
              </div>

              <p className="mt-4 text-base leading-7 text-muted">
                {household.situation}
              </p>

              <div className="mt-6 grid gap-4 text-sm text-muted sm:grid-cols-2">
                <DetailItem label="Owner" value={household.owner} />
                <DetailItem
                  label="Next touchpoint"
                  value={household.nextTouchpointLabel}
                />
                <DetailItem
                  label="Last touchpoint"
                  value={household.lastTouchpointLabel}
                />
                <DetailItem
                  label="Open requests"
                  value={String(household.openRequestCount).padStart(2, "0")}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {household.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/households/${household.slug}`}
                  className="inline-flex w-fit items-center rounded-full border border-line bg-canvas px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1]"
                >
                  Open timeline
                </Link>
                <Link
                  href="/requests/new"
                  className="inline-flex w-fit items-center rounded-full border border-line bg-transparent px-4 py-2 text-sm font-semibold text-muted transition hover:bg-[#f4ebdc] hover:text-foreground"
                >
                  Add request
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="rounded-[1.5rem] border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
    </article>
  );
}

function FilterCard({ tone, title, count, description }) {
  return (
    <article
      className={`surface-card rounded-[1.5rem] border bg-paper p-5 ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl [font-family:var(--font-display)]">{title}</h3>
        <span className="text-2xl tracking-[-0.04em]">
          {String(count).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-current/80">{description}</p>
    </article>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-7 text-foreground">{value}</p>
    </div>
  );
}
