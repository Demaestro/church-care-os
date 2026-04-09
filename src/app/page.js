import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/database";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = { title: "Home" };

// ── Data helpers ──────────────────────────────────────────────────────────────

function getMinistryStats(organizationId, branchId) {
  try {
    const db = getDatabase();
    const org = organizationId || null;
    const branch = branchId || null;

    const memberCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM members
      WHERE (? IS NULL OR organization_id = ?) AND (? IS NULL OR branch_id = ?)
    `).get(org, org, branch, branch)?.cnt || 0;

    const newMemberCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM members
      WHERE (? IS NULL OR organization_id = ?) AND (? IS NULL OR branch_id = ?)
        AND created_at >= date('now', '-30 days')
    `).get(org, org, branch, branch)?.cnt || 0;

    const lastService = db.prepare(`
      SELECT s.service_date, COUNT(a.id) as checkins
      FROM services s
      LEFT JOIN attendance_events a ON a.service_id = s.id
      WHERE (? IS NULL OR s.organization_id = ?) AND (? IS NULL OR s.branch_id = ?)
      GROUP BY s.id
      ORDER BY s.service_date DESC LIMIT 1
    `).get(org, org, branch, branch);

    const openCareRequests = db.prepare(`
      SELECT COUNT(*) as cnt FROM requests
      WHERE status NOT IN ('Resolved', 'Archived', 'Closed')
        AND (? IS NULL OR organization_id = ?) AND (? IS NULL OR branch_id = ?)
    `).get(org, org, branch, branch)?.cnt || 0;

    const pledgeTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM pledges
      WHERE status = 'active'
        AND (? IS NULL OR organization_id = ?)
    `).get(org, org)?.total || 0;

    const upcomingService = db.prepare(`
      SELECT id, name, service_date, service_time FROM services
      WHERE (? IS NULL OR organization_id = ?) AND (? IS NULL OR branch_id = ?)
        AND service_date >= date('now')
      ORDER BY service_date ASC LIMIT 1
    `).get(org, org, branch, branch);

    const volunteerCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM users
      WHERE role = 'volunteer' AND active = 1
        AND (? IS NULL OR organization_id = ?)
    `).get(org, org)?.cnt || 0;

    return {
      memberCount: Number(memberCount),
      newMemberCount: Number(newMemberCount),
      lastServiceDate: lastService?.service_date || null,
      lastServiceCheckins: Number(lastService?.checkins || 0),
      openCareRequests: Number(openCareRequests),
      pledgeTotal: Number(pledgeTotal),
      upcomingService: upcomingService || null,
      volunteerCount: Number(volunteerCount),
    };
  } catch {
    return {
      memberCount: 0,
      newMemberCount: 0,
      lastServiceDate: null,
      lastServiceCheckins: 0,
      openCareRequests: 0,
      pledgeTotal: 0,
      upcomingService: null,
      volunteerCount: 0,
    };
  }
}

function getUrgentFollowUps(organizationId, branchId) {
  try {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, household_name, household_slug, next_contact_due, follow_up_goal, tone
      FROM requests
      WHERE status NOT IN ('Resolved', 'Archived', 'Closed')
        AND next_contact_due IS NOT NULL
        AND next_contact_due <= date('now', '+2 days')
        AND (? IS NULL OR organization_id = ?)
        AND (? IS NULL OR branch_id = ?)
      ORDER BY next_contact_due ASC
      LIMIT 5
    `).all(organizationId || null, organizationId || null, branchId || null, branchId || null) || [];
  } catch {
    return [];
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let user;
  try {
    user = await requireCurrentUser(["member", "volunteer", "leader", "pastor", "owner"]);
  } catch {
    redirect("/login");
  }

  const role = user.role;

  if (role === "member") return <MemberHome user={user} />;
  if (role === "volunteer") return <VolunteerHome user={user} />;

  // Staff home — ecosystem dashboard
  const cookieStore = await cookies();
  const branchId = cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || user.branchId || "";
  const stats = getMinistryStats(user.organizationId, branchId || null);
  const urgentFollowUps = getUrgentFollowUps(user.organizationId, branchId || null);

  return <StaffHome user={user} stats={stats} urgentFollowUps={urgentFollowUps} />;
}

// ── Staff (pastor / leader / owner) — Ecosystem Dashboard ────────────────────

function StaffHome({ user, stats, urgentFollowUps }) {
  const greeting = getGreeting();
  const firstName = user.name.split(" ")[0] || user.name;
  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      {/* Page header */}
      <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{greeting}</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">{today}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/members/new?add=1"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
          >
            + Add member
          </Link>
          <Link
            href="/attendance"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-canvas"
          >
            Record attendance
          </Link>
        </div>
      </div>

      {/* Urgent follow-up banner */}
      {urgentFollowUps.length > 0 ? (
        <div className="mb-8 rounded-[1.5rem] border border-[rgba(194,65,12,0.18)] bg-[rgba(194,65,12,0.05)] px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-clay">
              {urgentFollowUps.length} follow-up{urgentFollowUps.length !== 1 ? "s" : ""} due soon
            </p>
            <Link href="/follow-up" className="text-xs font-semibold text-moss hover:underline">
              See all →
            </Link>
          </div>
          <div className="space-y-2">
            {urgentFollowUps.map((record) => (
              <FollowUpRow key={record.id} record={record} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Ministry stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <StatCard
          label="Members"
          value={stats.memberCount}
          sub={stats.newMemberCount > 0 ? `+${stats.newMemberCount} this month` : null}
          href="/members"
        />
        <StatCard
          label="Last service"
          value={stats.lastServiceCheckins || "—"}
          sub={stats.lastServiceDate ? fmtDate(stats.lastServiceDate) : "No services yet"}
          href="/attendance"
        />
        <StatCard
          label="Open care cases"
          value={stats.openCareRequests || "—"}
          sub={stats.openCareRequests === 0 ? "All caught up" : "Needs attention"}
          href="/leader"
          alert={stats.openCareRequests > 0}
        />
        <StatCard
          label="Active pledges"
          value={fmtMoney(stats.pledgeTotal)}
          sub={`${stats.volunteerCount} volunteer${stats.volunteerCount !== 1 ? "s" : ""}`}
          href="/finance"
        />
      </div>

      {/* Upcoming service callout */}
      {stats.upcomingService ? (
        <div className="mb-8 flex items-center justify-between rounded-[1.25rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
              Next service
            </p>
            <p className="mt-0.5 font-semibold text-foreground">
              {stats.upcomingService.name || "Service"}{" "}
              <span className="font-normal text-muted">
                — {fmtDate(stats.upcomingService.service_date)}
                {stats.upcomingService.service_time ? ` at ${stats.upcomingService.service_time}` : ""}
              </span>
            </p>
          </div>
          <Link
            href="/schedule"
            className="shrink-0 rounded-full border border-[var(--soft-accent-border)] bg-paper px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-canvas"
          >
            View schedule
          </Link>
        </div>
      ) : null}

      {/* Ecosystem section grid */}
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
        Ministry sections
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        <EcosystemTile href="/members"        label="Members"        icon="people"    detail="Directory, profiles & groups" />
        <EcosystemTile href="/attendance"     label="Attendance"     icon="worship"   detail="Services & check-in records" />
        <EcosystemTile href="/finance"        label="Finance"        icon="finance"   detail="Ledger, funds & pledges" />
        <EcosystemTile href="/discipleship"   label="Discipleship"   icon="disciple"  detail="Growth journeys & milestones" />
        <EcosystemTile href="/new-members"    label="New Members"    icon="newmember" detail="Welcome & onboarding" />
        <EcosystemTile href="/leader"         label="Care board"     icon="care"      detail="Requests & pastoral follow-up" />
        <EcosystemTile href="/volunteer"      label="Volunteers"     icon="volunteer" detail="Tasks, teams & applications" />
        <EcosystemTile href="/analytics"      label="Analytics"      icon="chart"     detail="Insights & ministry trends" />
        <EcosystemTile href="/groups"         label="Groups"         icon="groups"    detail="Small groups & committees" />
        <EcosystemTile href="/households"     label="Households"     icon="household" detail="Family care & history" />
        <EcosystemTile href="/schedule"       label="Schedule"       icon="calendar"  detail="Service & event planning" />
        <EcosystemTile href="/reports"        label="Reports"        icon="report"    detail="Exportable ministry reports" />
      </div>
    </div>
  );
}

// ── Member home ───────────────────────────────────────────────────────────────

function MemberHome({ user }) {
  const firstName = user.name.split(" ")[0] || user.name;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Welcome to FirstLove Assembly
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          {firstName}
        </h1>
        <p className="mt-2 text-base text-muted">
          What would you like to do today?
        </p>
      </div>
      <div className="grid gap-3">
        <MemberTile
          href="/member"
          title="My profile"
          detail="Update your contact details, view your spiritual milestones, and manage your account."
          icon="profile"
          primary
        />
        <MemberTile
          href="/requests/new"
          title="Request pastoral support"
          detail="Let your pastor know about a personal or family need. All requests are kept private."
          icon="care"
        />
        <MemberTile
          href="/requests/status"
          title="Track my request"
          detail="Check the current status of a care or support request you have submitted."
          icon="track"
        />
        <MemberTile
          href="/volunteer/apply"
          title="Serve in ministry"
          detail="Apply to join a volunteer team and serve alongside the church family."
          icon="serve"
        />
      </div>
    </div>
  );
}

// ── Volunteer home ────────────────────────────────────────────────────────────

function VolunteerHome({ user }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Volunteer</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{user.name}</h1>
        </div>
        <Link
          href="/volunteer"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
        >
          My tasks →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink href="/volunteer"      label="My tasks"          detail="View assigned care and ministry tasks" />
        <QuickLink href="/notifications"  label="Inbox"             detail="Check updates and new assignments" />
        <QuickLink href="/households"     label="Households"        detail="Review case notes for families you serve" />
        <QuickLink href="/member"         label="My profile"        detail="Manage your account and preferences" />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, href, alert = false }) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-[1.35rem] border p-5 transition hover:shadow-lg ${
        alert
          ? "border-[rgba(194,65,12,0.20)] bg-[rgba(194,65,12,0.04)]"
          : "border-line bg-paper shadow-sm"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${alert ? "text-clay" : "text-foreground"}`}>
        {value}
      </p>
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </Link>
  );
}

const ECOSYSTEM_ICONS = {
  people:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5 2c1.5 0 3 .7 4 1.8",
  worship:   "M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  finance:   "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  disciple:  "M22 10v6M2 10l10-5 10 5-10 5-10-5ZM6 12v5c3 3 9 3 12 0v-5",
  newmember: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-3h6M22 8l-3-3-3 3",
  care:      "M12 21c-1-1-7-4.5-7-9a7 7 0 0 1 14 0c0 4.5-6 8-7 9Z",
  volunteer: "M4.5 9.5a6.5 6.5 0 1 1 13 0M12 3v6.5M9 9.5l3 3 3-3M6.5 15.5c0 2.8 2.5 5 5.5 5s5.5-2.2 5.5-5",
  chart:     "M3 3v18h18M18 8l-5 5-3-3-5 5",
  groups:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 4a4 4 0 0 0 0-8M23 21v-2a4 4 0 0 0-3-3.87",
  household: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 22V12h6v10",
  calendar:  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  report:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8",
};

const MEMBER_ICONS = {
  profile: "M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM3.5 22a8.5 8.5 0 0 1 17 0",
  care:    "M12 21c-1-1-7-4.5-7-9a7 7 0 0 1 14 0c0 4.5-6 8-7 9Z",
  track:   "M11 11a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm5 5 4.5 4.5",
  serve:   "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 3v7l4.5 2.7-.75 1.3L10 13V5h2Z",
};

function EcosystemTile({ href, label, icon, detail }) {
  const pathData = ECOSYSTEM_ICONS[icon] || ECOSYSTEM_ICONS.people;
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-[1.35rem] border border-line bg-paper p-5 transition hover:border-[var(--soft-accent-border)] hover:bg-canvas hover:shadow-md"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d={pathData} />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground group-hover:text-moss transition-colors">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted">{detail}</p>
      </div>
    </Link>
  );
}

function MemberTile({ href, title, detail, icon, primary = false }) {
  const pathData = MEMBER_ICONS[icon] || MEMBER_ICONS.profile;
  return (
    <Link
      href={href}
      className={`flex gap-4 rounded-[1.5rem] border p-5 transition ${
        primary
          ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] hover:bg-[var(--soft-fill-strong)]"
          : "border-line bg-canvas hover:bg-paper"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
          primary
            ? "border-[var(--soft-accent-border)] bg-paper text-moss"
            : "border-line bg-paper text-muted"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d={pathData} />
        </svg>
      </span>
      <div>
        <p className={`text-sm font-semibold ${primary ? "text-moss" : "text-foreground"}`}>{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
      </div>
    </Link>
  );
}

function QuickLink({ href, label, detail }) {
  return (
    <Link
      href={href}
      className="rounded-[1.25rem] border border-line bg-canvas p-4 transition hover:border-[var(--soft-accent-border)] hover:bg-paper"
    >
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </Link>
  );
}

function FollowUpRow({ record }) {
  const slug = record.household_slug || record.householdSlug || "";
  const name = record.household_name || record.householdName || "Household";
  const due = record.next_contact_due;
  const dueLabel = due
    ? new Date(due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  return (
    <Link
      href={slug ? `/households/${slug}` : "/follow-up"}
      className="flex items-center justify-between rounded-[1.1rem] border border-line bg-paper px-5 py-3.5 transition hover:bg-canvas"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {record.follow_up_goal ? (
          <p className="mt-0.5 truncate text-xs text-muted">{record.follow_up_goal}</p>
        ) : null}
      </div>
      {dueLabel ? <p className="ml-4 shrink-0 text-xs text-muted">{dueLabel}</p> : null}
    </Link>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString("en-NG")}`;
}
