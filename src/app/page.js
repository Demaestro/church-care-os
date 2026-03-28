import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { APP_TIME_ZONE } from "@/lib/care-format";
import { getDashboardData } from "@/lib/care-store";
import { getChurchSettings } from "@/lib/organization-store";
import { atRiskMembers } from "@/lib/role-previews";

const metricToneClasses = {
  default: "text-foreground",
  clay: "text-clay",
  moss: "text-moss",
};

const caseBadgeClasses = {
  crisis: "bg-[rgba(184,101,76,0.10)] text-clay",
  urgent: "bg-[rgba(179,138,69,0.14)] text-[#7a6128]",
  new: "bg-[rgba(74,135,217,0.12)] text-[#3c6eb9]",
  routine: "bg-[rgba(34,28,22,0.06)] text-muted",
};

const riskBarClasses = {
  high: "bg-clay",
  medium: "bg-gold",
  watch: "bg-[#8b7d56]",
};

export default async function Home() {
  const user = await requireCurrentUser(["pastor", "owner"]);
  const settings = getChurchSettings();
  const { households, openRequests } = await getDashboardData();
  const now = new Date();
  const activeCases = openRequests.slice(0, 5).map((request) => ({
    id: request.id,
    initials: getInitials(request.householdName),
    name: request.householdName,
    detail: `${request.need} - ${formatOwnerLabel(
      request.owner,
      request.assignedVolunteer?.name
    )}`,
    badge: resolveCaseBadge(request),
    href: `/households/${request.householdSlug}`,
  }));
  const followUpRows = [...households]
    .sort(
      (first, second) =>
        new Date(first.nextTouchpoint).valueOf() -
        new Date(second.nextTouchpoint).valueOf()
    )
    .slice(0, 5)
    .map((household) => ({
      slug: household.slug,
      initials: getInitials(household.name),
      name: household.name,
      detail: `${household.situation} - ${household.owner || "Unassigned"}`,
      age: formatFollowUpAge(household.nextTouchpoint, now),
    }));
  const overdueCount = households.filter((household) =>
    isOverdue(household.nextTouchpoint, now)
  ).length;
  const resolvedThisMonth = households.filter((household) =>
    ["Review", "Comfort"].includes(household.stage)
  ).length;
  const dashboardDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(now);
  const metrics = [
    {
      label: "Open cases",
      value: openRequests.length,
      tone: "default",
    },
    {
      label: "Overdue follow-ups",
      value: overdueCount,
      tone: "default",
    },
    {
      label: "At risk members",
      value: atRiskMembers.length,
      tone: "clay",
    },
    {
      label: "Resolved this month",
      value: resolvedThisMonth,
      tone: "moss",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
            Good morning, {user.name}
          </p>
          <p className="mt-2 text-lg text-muted">
            {settings?.churchName || "Grace Community Church"} - {dashboardDate}
          </p>
        </div>
        <Link
          href="/requests/new"
          className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-6 py-4 text-xl font-medium text-foreground transition hover:bg-[#f4ecde]"
        >
          + New care request
        </Link>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="surface-card rounded-[1.6rem] border border-line bg-[#f5f0e6] p-5"
          >
            <p className="text-lg text-foreground">{metric.label}</p>
            <p
              className={`mt-3 text-5xl tracking-[-0.05em] ${metricToneClasses[metric.tone]}`}
            >
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <PanelCard
          title="Active care cases"
          href="/households"
          linkLabel="See all"
        >
          <div className="space-y-1">
            {activeCases.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start gap-4 border-b border-line px-1 py-4 transition last:border-b-0 hover:bg-[rgba(34,28,22,0.02)]"
              >
                <Avatar initials={item.initials} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xl font-medium text-foreground">
                    {item.name}
                  </p>
                  <p className="mt-1 text-lg text-muted">{item.detail}</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-4 py-1.5 text-lg font-medium ${caseBadgeClasses[item.badge.tone]}`}
                >
                  {item.badge.label}
                </span>
              </Link>
            ))}
          </div>
        </PanelCard>

        <PanelCard
          title="Overdue follow-ups"
          href="/households"
          linkLabel="See all"
        >
          <div className="space-y-1">
            {followUpRows.map((item) => (
              <Link
                key={item.slug}
                href={`/households/${item.slug}`}
                className="flex items-start gap-4 border-b border-line px-1 py-4 transition last:border-b-0 hover:bg-[rgba(34,28,22,0.02)]"
              >
                <Avatar initials={item.initials} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xl font-medium text-foreground">
                    {item.name}
                  </p>
                  <p className="mt-1 text-lg text-muted">{item.detail}</p>
                </div>
                <span className="text-lg font-medium text-clay">{item.age}</span>
              </Link>
            ))}
          </div>
        </PanelCard>
      </section>

      <section className="mt-8 surface-card rounded-[1.75rem] border border-line bg-paper p-6 lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            Members at risk of being overlooked
          </h2>
          <Link
            href="/permissions"
            className="text-lg font-medium text-[#356fbe] transition hover:text-[#29578f]"
          >
            How is this calculated? {"->"}
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {atRiskMembers.map((member) => (
            <article
              key={member.name}
              className="flex flex-col gap-4 border-b border-line pb-5 last:border-b-0 last:pb-0 lg:flex-row lg:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <Avatar initials={member.initials} />
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-medium text-foreground">{member.name}</p>
                  <div className="mt-3 h-2.5 rounded-full bg-[rgba(34,28,22,0.12)]">
                    <div
                      className={`h-full rounded-full ${riskBarClasses[member.tone]}`}
                      style={{ width: `${member.progress}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-lg text-clay lg:w-[22rem] lg:text-right">
                {member.indicator}
              </p>
              <button
                type="button"
                className="rounded-[1rem] border border-line bg-paper px-6 py-3 text-xl font-medium text-foreground transition hover:bg-[#f4ecde]"
              >
                Reach out
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PanelCard({ title, href, linkLabel, children }) {
  return (
    <section className="surface-card rounded-[1.75rem] border border-line bg-paper p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
          {title}
        </h2>
        <Link
          href={href}
          className="text-lg font-medium text-[#356fbe] transition hover:text-[#29578f]"
        >
          {linkLabel} {"->"}
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Avatar({ initials }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(184,101,76,0.10)] text-xl font-semibold text-clay">
      {initials}
    </span>
  );
}

function getInitials(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatOwnerLabel(owner, volunteerName) {
  if (volunteerName) {
    return `Assigned to ${owner} / ${volunteerName}`;
  }

  return owner === "Unassigned" ? "No assignment yet" : `Assigned to ${owner}`;
}

function resolveCaseBadge(request) {
  if (request.tone === "urgent" && request.owner === "Pastoral staff") {
    return { label: "Crisis", tone: "crisis" };
  }

  if (request.owner === "Unassigned") {
    return { label: "New", tone: "new" };
  }

  if (request.tone === "urgent") {
    return { label: "Urgent", tone: "urgent" };
  }

  return { label: "Routine", tone: "routine" };
}

function isOverdue(value, now) {
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.valueOf() < now.valueOf();
}

function formatFollowUpAge(value, now) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "No date";
  }

  const diff = date.valueOf() - now.valueOf();
  const dayDiff = Math.round(diff / (24 * 60 * 60 * 1000));

  if (diff < 0) {
    const overdueDays = Math.max(1, Math.ceil(Math.abs(diff) / (24 * 60 * 60 * 1000)));
    return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
  }

  if (dayDiff === 0) {
    return "Due today";
  }

  if (dayDiff === 1) {
    return "Due tomorrow";
  }

  return `Due in ${dayDiff} days`;
}
