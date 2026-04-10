import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { getCurrentUser, getUserLandingPage } from "@/lib/auth";
import { getWorkspaceSearchIndex } from "@/lib/care-store";
import { AppShellNav } from "@/components/app-shell-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { WorkspaceBreadcrumbs } from "@/components/workspace-breadcrumbs";
import { WorkspaceCommandBar } from "@/components/workspace-command-bar";
import { getAppPreferences } from "@/lib/app-preferences-server";
import LeftNav from "@/components/LeftNav";
import AiShepherd from "@/components/AiShepherd";
import {
  getCopy,
  getDisplayModeOptionsWithLabels,
  getLanguageOptionsWithLabels,
  translateRoleLabel,
} from "@/lib/i18n";
import { normalizeInternalRole } from "@/lib/policies";
import { getUnreadNotificationCountForUser } from "@/lib/notifications-store";
import {
  getPublicWorkspaceCatalog,
  getWorkspaceContext,
} from "@/lib/organization-store";
import {
  defaultPrimaryBranchId,
  defaultPrimaryOrganizationId,
} from "@/lib/organization-defaults";
import {
  PUBLIC_BRANCH_COOKIE,
  PUBLIC_ORGANIZATION_COOKIE,
  WORKSPACE_BRANCH_COOKIE,
} from "@/lib/workspace-scope";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata = {
  title: {
    default: "FirstLove Assembly",
    template: "%s | FirstLove Assembly",
  },
  description:
    "Ministry ecosystem for FirstLove Assembly — members, attendance, discipleship, finance, care, and pastoral oversight in one platform.",
  applicationName: "FirstLove Assembly",
  appleWebApp: {
    title: "FirstLove Assembly",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "FirstLove Assembly",
    description:
      "The complete ministry platform for FirstLove Assembly — from member onboarding to financial stewardship.",
    type: "website",
  },
};

export const viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D4AF37" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default async function RootLayout({ children }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const cookieStore = await cookies();
  const user = await getCurrentUser();
  const unreadNotificationCount = user
    ? getUnreadNotificationCountForUser(user)
    : 0;
  const navSections = buildNavSections(user, unreadNotificationCount, copy);
  const languageOptions = getLanguageOptionsWithLabels(preferences.language);
  const displayModeOptions = getDisplayModeOptionsWithLabels(preferences.language);
  const workspaceHref = user ? getUserLandingPage(user) : "/login";
  const workspace = user
    ? getWorkspaceContext(
        user,
        cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || ""
      )
    : null;
  const publicCatalog = !user ? getPublicWorkspaceCatalog() : [];
  const publicOrganizationId =
    cookieStore.get(PUBLIC_ORGANIZATION_COOKIE)?.value ||
    defaultPrimaryOrganizationId ||
    publicCatalog[0]?.id ||
    "";
  const publicOrganization =
    publicCatalog.find((item) => item.id === publicOrganizationId) ||
    publicCatalog.find((item) => item.id === defaultPrimaryOrganizationId) ||
    publicCatalog[0] ||
    null;
  const publicBranchId =
    cookieStore.get(PUBLIC_BRANCH_COOKIE)?.value ||
    publicOrganization?.defaultBranchId ||
    defaultPrimaryBranchId ||
    "";
  const publicBranch =
    publicOrganization?.branches?.find((item) => item.id === publicBranchId) ||
    publicOrganization?.defaultBranch ||
    publicOrganization?.branches?.find((item) => item.id === defaultPrimaryBranchId) ||
    publicOrganization?.branches?.[0] ||
    null;
  const workspaceSwitcher = user
      ? {
        menuLabel: "Campus",
        eyebrow: workspace?.organization?.name || "",
        title: workspace?.activeBranch
          ? workspace.activeBranch.name
          : "All campuses",
        body: workspace?.canSwitchBranches
          ? "Change campus focus without leaving your current workspace."
          : "This account is scoped to one campus. Campus privacy stays enforced here.",
        canSwitch: Boolean(workspace?.canSwitchBranches),
        redirectTo: workspaceHref,
        activeBranchId: workspace?.activeBranch?.id || "",
        branches: workspace?.visibleBranches || [],
      }
    : publicOrganization
      ? {
          menuLabel: "Church",
          eyebrow: "Member tools",
          title: publicOrganization.name,
          body:
            "Choose the church members should use for request care, status tracking, and member sign-in.",
          canSwitch: publicCatalog.length > 1,
          redirectTo: "/",
          organizationId: publicOrganization.id,
          branchId: publicOrganization.defaultBranchId || publicBranch?.id || "",
          catalog: publicCatalog,
        }
      : null;
  const userSummary = user
    ? {
        name: user.name,
        buttonLabel: user.name.split(" ")[0] || user.name,
        roleLabel: translateRoleLabel(user.role, preferences.language),
        detailLabel: workspace
          ? `${workspace.organization.shortName} - ${workspace.activeScopeLabel}`
          : "",
        workspaceHref,
        switchHref: "/login?switch=1",
      }
    : null;
  const searchIndex = user
    ? await getWorkspaceSearchIndex(user, workspace?.activeBranch?.id || "")
    : { households: [], requests: [] };
  const quickActions = buildQuickActions(user, copy);
  const commandItems = buildCommandItems({
    sections: navSections,
    quickActions,
    searchIndex,
  });
  const routeLabels = buildRouteLabels(navSections, quickActions);
  const bottomNavItems = buildBottomNav(user, unreadNotificationCount);
  const scopeLabel = user
    ? workspace?.activeBranch
      ? `Church privacy is enforced inside ${workspace.organization.name}.`
      : `You are viewing ${workspace?.organization?.name || "this church"} across your allowed campuses.`
    : publicBranch
      ? `Member tools are currently set to ${publicOrganization?.name || publicBranch.name}.`
      : "Member tools are ready for your selected church workspace.";
  const brandOrganization = user ? workspace?.organization || null : publicOrganization;
  const brandLogoHref = brandOrganization?.logoHref || "";
  const brandInitials = (brandOrganization?.shortName || brandOrganization?.name || "CC")
    .slice(0, 2)
    .toUpperCase();

  // Stats to pass to AiShepherd (lightweight — all sync)
  const shepherdStats = user
    ? {
        members: undefined,     // fetched server-side in AiShepherd only if needed
        services: undefined,
        openCare: undefined,
        activePledges: undefined,
      }
    : null;

  const isStaff = user && ["leader", "pastor", "owner", "volunteer"].includes(
    normalizeInternalRole(user.role)
  );

  return (
    <html
      lang={preferences.language}
      data-display-mode={preferences.displayMode}
      data-theme={preferences.theme}
      data-privacy-mode={preferences.privacyMode}
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full bg-[var(--base)] text-foreground">
        {/* ── Three-pane shell ──────────────────────────────────────────── */}

        {/* Left glass nav — desktop only (hidden on <lg) */}
        {isStaff && (
          <div className="hidden lg:block">
            <LeftNav user={user} unreadCount={unreadNotificationCount} />
          </div>
        )}

        {/* Right AI Shepherd — desktop only (hidden on <xl) */}
        {isStaff && (
          <div className="hidden xl:block">
            <AiShepherd stats={shepherdStats} />
          </div>
        )}

        {/* Center canvas */}
        <div className={isStaff ? "three-pane-main" : ""}>
          {/* Mobile / tablet header — visible when LeftNav is hidden */}
          <header className={`sticky top-0 z-40 border-b border-line bg-[var(--header-bg)] shadow-[var(--header-shadow)] backdrop-blur-2xl ${isStaff ? "lg:hidden" : ""}`}>
            <div className="mx-auto max-w-7xl px-6">
              <div className="flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-4">
                <Link href="/" className="group flex flex-shrink-0 items-center gap-3">
                  <BrandMark logoHref={brandLogoHref} initials={brandInitials} />
                  <span className="hidden sm:block">
                    <span className="block text-[0.6rem] font-bold uppercase tracking-[0.28em] text-muted leading-none">
                      {copy.layout.brandKicker}
                    </span>
                    <span className="mt-0.5 block text-[0.875rem] font-bold leading-tight text-foreground">
                      {brandOrganization?.name || copy.layout.brandTitle}
                    </span>
                  </span>
                </Link>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  <AppShellNav
                    sections={navSections}
                    currentLanguage={preferences.language}
                    currentDisplayMode={preferences.displayMode}
                    currentTheme={preferences.theme}
                    currentPrivacyMode={preferences.privacyMode}
                    languageOptions={languageOptions}
                    displayModeOptions={displayModeOptions}
                    copy={copy.layout}
                    workspaceSwitcher={workspaceSwitcher}
                    userSummary={userSummary}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-line/70">
              <div className="mx-auto max-w-7xl px-6 py-2.5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <WorkspaceBreadcrumbs
                    routeLabels={routeLabels}
                    organizationName={
                      user
                        ? workspace?.organization?.name || ""
                        : publicOrganization?.name || ""
                    }
                    branchName={
                      user
                        ? workspace?.activeBranch?.name || workspace?.activeScopeLabel || ""
                        : publicBranch?.name || ""
                    }
                    scopeLabel={scopeLabel}
                  />
                  <div className="w-full xl:max-w-2xl">
                    <WorkspaceCommandBar
                      items={commandItems}
                      quickActions={quickActions}
                      placeholder={
                        user
                          ? "Jump to a member, section, or workflow…"
                          : "Request support, track a request, or open the member portal…"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Desktop command bar strip — shown inside canvas when LeftNav is visible */}
          {isStaff && (
            <div className="hidden lg:block sticky top-0 z-30 border-b border-line bg-[var(--header-bg)] shadow-[var(--header-shadow)] backdrop-blur-2xl">
              <div className="px-6 py-3">
                <div className="flex items-center gap-4">
                  <WorkspaceBreadcrumbs
                    routeLabels={routeLabels}
                    organizationName={workspace?.organization?.name || ""}
                    branchName={workspace?.activeBranch?.name || workspace?.activeScopeLabel || ""}
                    scopeLabel={scopeLabel}
                  />
                  <div className="flex-1 max-w-xl ml-auto">
                    <WorkspaceCommandBar
                      items={commandItems}
                      quickActions={quickActions}
                      placeholder="Jump to a member, section, or workflow…"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <main className="pb-24 lg:pb-8">{children}</main>

          {!isStaff && (
            <footer className="border-t border-line">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted lg:flex-row lg:items-center lg:justify-between lg:px-10">
                <p>{copy.layout.footerPrimary}</p>
                <p>{copy.layout.footerSecondary}</p>
              </div>
            </footer>
          )}
        </div>

        <MobileBottomNav items={bottomNavItems} />
      </body>
    </html>
  );
}

function BrandMark({ logoHref = "", initials = "CC" }) {
  if (logoHref) {
    return (
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper shadow-sm transition-all duration-200 group-hover:scale-105">
        <Image
          src={logoHref}
          alt="Church logo"
          width={40}
          height={40}
          unoptimized
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold tracking-wide text-white transition-all duration-200 group-hover:scale-105"
      style={{
        background: "linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)",
        boxShadow: "0 3px 12px rgba(212,175,55,0.40)",
      }}
    >
      {initials}
    </span>
  );
}

function flattenNavItems(sections = []) {
  return sections.flatMap((section) =>
    (section.items || []).map((item) => ({
      ...item,
      section: section.label,
    }))
  );
}

function buildQuickActions(user, copy) {
  if (!user) {
    return [
      { id: "action:request-care", href: "/requests/new",    label: "Request support",  description: "Submit a pastoral support request",              section: "Quick actions", type: "action"    },
      { id: "action:track-request", href: "/requests/status", label: "Track request",    description: "Check the current status of a support request",  section: "Quick actions", type: "follow-up" },
      { id: "action:member-portal", href: "/member",          label: "Member portal",    description: "Open your profile and request history",          section: "Quick actions", type: "member"    },
      { id: "action:register",      href: "/register",        label: "Create account",   description: "Create a secure member account",                 section: "Quick actions", type: "action"    },
    ];
  }

  const normalizedRole = normalizeInternalRole(user.role);
  const items = [];

  if (["leader", "pastor", "owner"].includes(normalizedRole)) {
    items.push({ id: "action:members",    href: "/members",    label: "Members",          description: "View and manage the member directory",           section: "Quick actions", type: "member"    });
    items.push({ id: "action:attendance", href: "/attendance", label: "Attendance",       description: "Record and view service attendance",             section: "Quick actions", type: "action"    });
    items.push({ id: "action:finance",    href: "/finance",    label: "Finance",          description: "View ledger, pledges, and fund activity",        section: "Quick actions", type: "follow-up" });
    items.push({ id: "action:follow-up",  href: "/follow-up",  label: "Follow-up board",  description: "Log follow-ups and care touchpoints",            section: "Quick actions", type: "follow-up" });
    items.push({ id: "action:new-member", href: "/new-members", label: "New members",     description: "Manage the new member welcome journey",          section: "Quick actions", type: "member"    });
    items.push({ id: "action:analytics",  href: "/analytics",  label: "Analytics",        description: "View ministry insights and trends",              section: "Quick actions", type: "action"    });
  } else {
    items.push({ id: "action:follow-up",  href: "/follow-up",  label: "Log follow-up",    description: "Record a pastoral care touchpoint",              section: "Quick actions", type: "follow-up" });
    items.push({ id: "action:households", href: "/households",  label: "Households",       description: "Review family support history and notes",        section: "Quick actions", type: "household" });
  }

  items.push({ id: "action:member-tools", href: "/member", label: "My profile", description: "View member-facing profile and tools", section: "Quick actions", type: "member" });

  return items;
}

function buildCommandItems({ sections, quickActions, searchIndex }) {
  const navItems = flattenNavItems(sections).map((item) => ({
    id: `nav:${item.href}`,
    href: item.href,
    label: item.label,
    description: item.section,
    keywords: [item.section, item.label],
    section: item.section,
    type: "action",
  }));

  const householdItems = (searchIndex?.households || []).map((household) => ({
    id: `household:${household.slug}`,
    href: `/households/${household.slug}`,
    label: household.name,
    description: `${titleCase(household.stage)} - ${titleCase(household.risk)} risk`,
    keywords: [household.owner, ...(household.tags || [])],
    section: "Households",
    type: "household",
  }));

  const requestItems = (searchIndex?.requests || []).map((request) => ({
    id: `request:${request.id}`,
    href: request.householdSlug ? `/households/${request.householdSlug}` : "/follow-up",
    label: request.householdName,
    description: `${request.trackingCode || "Request"} - ${request.need || "Support request"}`,
    keywords: [
      request.trackingCode,
      request.need,
      request.owner,
      request.followUpGoal,
      request.followUpTemplate,
    ],
    section: "Requests",
    type: "request",
  }));

  return [...quickActions, ...navItems, ...householdItems, ...requestItems];
}

function buildRouteLabels(sections, quickActions) {
  return Object.fromEntries(
    [...flattenNavItems(sections), ...quickActions]
      .filter((item) => item.href)
      .map((item) => [item.href, item.label])
  );
}

function buildBottomNav(user, unreadNotificationCount = 0) {
  if (!user) {
    return [
      { href: "/requests/new",   label: "Support", type: "action" },
      { href: "/requests/status", label: "Track",   type: "follow-up" },
      { href: "/member",         label: "Portal",   type: "member" },
      { href: "/login",          label: "Sign in",  type: "member" },
    ];
  }

  if (user.role === "member") {
    return [
      { href: "/",              label: "Home",    type: "action" },
      { href: "/requests/new",  label: "Support", type: "action" },
      { href: "/member",        label: "Profile", type: "member" },
      { href: "/volunteer/apply", label: "Serve", type: "follow-up" },
    ];
  }

  if (user.role === "volunteer") {
    return [
      { href: "/volunteer",     label: "Tasks",   type: "follow-up" },
      { href: "/notifications", label: unreadNotificationCount > 0 ? `Inbox ${unreadNotificationCount}` : "Inbox", type: "inbox" },
      { href: "/member",        label: "Profile", type: "member" },
      { href: "/security",      label: "Security", type: "action" },
    ];
  }

  // Staff / leader / pastor / owner — ecosystem bottom nav
  return [
    { href: "/",          label: "Home",      type: "action" },
    { href: "/members",   label: "People",    type: "member" },
    { href: "/attendance", label: "Worship",  type: "action" },
    { href: "/finance",   label: "Finance",   type: "follow-up" },
    { href: "/inbox",     label: "Inbox",     type: "inbox" },
  ];
}

function titleCase(value = "") {
  return String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildNavSections(user, unreadNotificationCount = 0, copy) {
  // ── Unauthenticated public nav ──────────────────────────────────────────────
  if (!user) {
    return [
      {
        label: "Connect",
        items: [
          { href: "/requests/new",   label: "Request support" },
          { href: "/requests/status", label: "Track my request" },
          { href: "/member",         label: "Member portal" },
          { href: "/register",       label: "Create account" },
          { href: "/login",          label: copy.layout.nav.signIn },
        ],
      },
    ];
  }

  const normalizedRole = normalizeInternalRole(user.role);

  // ── Member ─────────────────────────────────────────────────────────────────
  if (normalizedRole === "member") {
    return [
      {
        label: "My Hub",
        items: [
          { href: "/",              label: "Home" },
          { href: "/member",        label: "My profile" },
          { href: "/requests/new",  label: "Request support" },
          { href: "/notifications", label: unreadNotificationCount > 0 ? `Notifications (${unreadNotificationCount})` : "Notifications" },
        ],
      },
      {
        label: "Get involved",
        items: [
          { href: "/volunteer/apply", label: "Serve as a volunteer" },
          { href: "/requests/status", label: "Track my request" },
        ],
      },
    ];
  }

  // ── Volunteer ──────────────────────────────────────────────────────────────
  if (normalizedRole === "volunteer") {
    return [
      {
        label: "My work",
        items: [
          { href: "/volunteer", label: "My tasks" },
          { href: "/notifications", label: unreadNotificationCount > 0 ? `Inbox (${unreadNotificationCount})` : "Inbox" },
          { href: "/member",    label: "My profile" },
          { href: "/security",  label: "Security" },
        ],
      },
    ];
  }

  // ── Leader / Pastor / Owner (ecosystem nav) ────────────────────────────────
  const sections = [];

  // People
  sections.push({
    label: "People",
    items: [
      { href: "/members",        label: "Members" },
      { href: "/groups",         label: "Groups" },
      { href: "/households",     label: "Households" },
      { href: "/new-members",    label: "New Members" },
      { href: "/transfers",      label: "Transfers" },
      { href: "/admin/users",    label: "Staff & Users" },
    ],
  });

  // Ministry
  sections.push({
    label: "Ministry",
    items: [
      { href: "/discipleship",           label: "Discipleship" },
      { href: "/leader",                 label: "Ministry Board" },
      { href: "/follow-up",              label: "Follow-up" },
      { href: "/volunteer",              label: "Volunteers" },
      { href: "/volunteer/applications", label: "Volunteer applications" },
      { href: "/teams",                  label: "Teams" },
    ],
  });

  // Worship & Scheduling
  sections.push({
    label: "Worship",
    items: [
      { href: "/attendance", label: "Attendance" },
      { href: "/schedule",   label: "Schedule" },
      { href: "/households", label: "Households" },
    ],
  });

  // Finance
  if (["pastor", "owner"].includes(normalizedRole)) {
    sections.push({
      label: "Finance",
      items: [
        { href: "/finance",   label: "Ledger & Funds" },
        { href: "/analytics", label: "Analytics" },
        { href: "/reports",   label: "Reports" },
      ],
    });
  }

  // Comms & Admin
  const adminItems = [
    { href: "/",              label: "Dashboard" },
    { href: "/inbox",         label: "Inbox" },
    { href: "/notifications", label: unreadNotificationCount > 0 ? `Notifications (${unreadNotificationCount})` : "Notifications" },
  ];
  if (["pastor", "owner"].includes(normalizedRole)) {
    adminItems.push({ href: "/audit",    label: "Audit log" });
    adminItems.push({ href: "/settings", label: "Settings" });
    adminItems.push({ href: "/regions",  label: "Regions & Branches" });
  }
  adminItems.push({ href: "/security", label: "Security" });

  sections.push({ label: "Admin", items: adminItems });

  return sections;
}

