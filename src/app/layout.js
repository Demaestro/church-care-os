import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { getCurrentUser, getUserLandingPage } from "@/lib/auth";
import { getWorkspaceSearchIndex } from "@/lib/care-store";
import { AppShellNav } from "@/components/app-shell-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { WorkspaceBreadcrumbs } from "@/components/workspace-breadcrumbs";
import { WorkspaceCommandBar } from "@/components/workspace-command-bar";
import { getAppPreferences } from "@/lib/app-preferences-server";
import {
  getCopy,
  getDisplayModeOptionsWithLabels,
  getLanguageOptionsWithLabels,
  translateRoleLabel,
} from "@/lib/i18n";
import { mfaRequiredRoles, normalizeInternalRole } from "@/lib/policies";
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

export const metadata = {
  title: {
    default: "Church Care OS",
    template: "%s | Church Care OS",
  },
  description:
    "An innovative church ecosystem for people, discipleship, ministries, care, branches, stewardship, and Sunday readiness.",
  applicationName: "Church Care OS",
  appleWebApp: {
    title: "Church Care OS",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Church Care OS",
    description:
      "A connected church operating system for pastoral care, discipleship, ministries, branch oversight, and member journeys.",
    type: "website",
  },
};

export const viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({ children }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const cookieStore = await cookies();
  const user = await getCurrentUser();
  const mfaSetupRequired = Boolean(
    user &&
      mfaRequiredRoles.includes(normalizeInternalRole(user.role)) &&
      !user.mfaConfigured
  );
  const workspaceUser = mfaSetupRequired ? null : user;
  const unreadNotificationCount = workspaceUser
    ? getUnreadNotificationCountForUser(workspaceUser)
    : 0;
  const navSections = buildNavSections(workspaceUser, unreadNotificationCount, copy);
  const languageOptions = getLanguageOptionsWithLabels(preferences.language);
  const displayModeOptions = getDisplayModeOptionsWithLabels(preferences.language);
  const workspaceHref = workspaceUser
    ? getUserLandingPage(workspaceUser)
    : user
      ? "/security?mfa_required=1"
      : "/login";
  const workspace = workspaceUser
    ? getWorkspaceContext(
        workspaceUser,
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
  const workspaceSwitcher = workspaceUser
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
        detailLabel: mfaSetupRequired
          ? "MFA setup required"
          : workspace
          ? `${workspace.organization.shortName} - ${workspace.activeScopeLabel}`
          : "",
        workspaceHref,
        switchHref: "/login?switch=1",
      }
    : null;
  const searchIndex = workspaceUser
    ? await getWorkspaceSearchIndex(workspaceUser, workspace?.activeBranch?.id || "")
    : { households: [], requests: [] };
  const quickActions = buildQuickActions(workspaceUser, copy);
  const commandItems = buildCommandItems({
    sections: navSections,
    quickActions,
    searchIndex,
  });
  const routeLabels = buildRouteLabels(navSections, quickActions);
  const bottomNavItems = buildBottomNav(workspaceUser, unreadNotificationCount);
  const scopeLabel = workspaceUser
    ? workspace?.activeBranch
      ? `Church privacy is enforced inside ${workspace.organization.name}.`
      : `You are viewing ${workspace?.organization?.name || "this church"} across your allowed campuses.`
    : user
      ? "Complete MFA setup before opening workspace data."
    : publicBranch
      ? `Member tools are currently set to ${publicOrganization?.name || publicBranch.name}.`
      : "Member tools are ready for your selected church workspace.";
  const brandOrganization = workspaceUser ? workspace?.organization || null : publicOrganization;
  const brandLogoHref = brandOrganization?.logoHref || "";
  const brandInitials = (brandOrganization?.shortName || brandOrganization?.name || "CC")
    .slice(0, 2)
    .toUpperCase();

  return (
    <html
      lang={preferences.language}
      data-display-mode={preferences.displayMode}
      data-theme={preferences.theme}
      data-privacy-mode={preferences.privacyMode}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body suppressHydrationWarning className="min-h-full text-foreground">
        <div className="relative isolate min-h-screen overflow-x-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[-8rem] -z-10 h-[28rem] blur-3xl"
          >
            <div className="mx-auto h-full max-w-6xl rounded-full bg-[image:var(--hero-glow)]" />
          </div>

          <header className="sticky top-0 z-40 border-b border-line bg-[var(--header-bg)] shadow-[var(--header-shadow)] backdrop-blur-2xl">
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
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

            <div className="border-t border-line/70 bg-[color:color-mix(in_srgb,var(--header-bg)_78%,var(--paper))]">
              <div className="mx-auto max-w-7xl px-6 py-3 lg:px-10">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <WorkspaceBreadcrumbs
                    routeLabels={routeLabels}
                    organizationName={
                      workspaceUser
                        ? workspace?.organization?.name || ""
                        : publicOrganization?.name || ""
                    }
                    branchName={
                      workspaceUser
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
                        workspaceUser
                          ? "Jump to a person, request, household, or workflow"
                          : "Jump to request care, track a request, or open the member portal"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="pb-24 lg:pb-0">{children}</main>

          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted lg:flex-row lg:items-center lg:justify-between lg:px-10">
              <p>{copy.layout.footerPrimary}</p>
              <p>{copy.layout.footerSecondary}</p>
            </div>
          </footer>

          <MobileBottomNav items={bottomNavItems} />
        </div>
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
        background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
        boxShadow: "0 3px 12px rgba(37,99,235,0.38)",
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
      {
        id: "action:request-care",
        href: "/requests/new",
        label: copy.layout.nav.requestCare,
        description: "Start a new care request",
        section: "Quick actions",
        type: "action",
      },
      {
        id: "action:track-request",
        href: "/requests/status",
        label: copy.layout.nav.trackRequest,
        description: "Check the current status of one request",
        section: "Quick actions",
        type: "follow-up",
      },
      {
        id: "action:member-portal",
        href: "/member",
        label: copy.layout.nav.memberPortal,
        description: "Open request history and update your contact details",
        section: "Quick actions",
        type: "member",
      },
      {
        id: "action:register",
        href: "/register",
        label: "Create account",
        description: "Start a secure self-service member account",
        section: "Quick actions",
        type: "action",
      },
    ];
  }

  const items = [
    {
      id: "action:follow-up",
      href: "/follow-up",
      label: "Log follow-up",
      description: "Open the follow-up board and record the next touchpoint",
      section: "Quick actions",
      type: "follow-up",
    },
    {
      id: "action:households",
      href: "/households",
      label: "Open households",
      description: "Review care journeys, notes, and attachments",
      section: "Quick actions",
      type: "household",
    },
    {
      id: "action:member-tools",
      href: "/member",
      label: "Preview member tools",
      description: "See the member-facing request and follow-up experience",
      section: "Quick actions",
      type: "member",
    },
  ];

  const normalizedRole = normalizeInternalRole(user.role);

  if (["leader", "pastor", "owner"].includes(normalizedRole)) {
    items.unshift({
      id: "action:new-request",
      href: "/requests/new",
      label: "New request",
      description: "Capture a fresh care need without leaving the workspace",
      section: "Quick actions",
      type: "action",
    });
    items.unshift({
      id: "action:ecosystem-command",
      href: "/ecosystem",
      label: "Ecosystem Command",
      description: "Open the connected church command surface",
      section: "Quick actions",
      type: "action",
    });
  }

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
    description: `${request.trackingCode || "Request"} - ${request.need || "Care request"}`,
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
      { href: "/requests/new", label: "Request", type: "action" },
      { href: "/requests/status", label: "Track", type: "follow-up" },
      { href: "/member", label: "Portal", type: "member" },
      { href: "/login", label: "Sign in", type: "member" },
    ];
  }

  if (user.role === "member") {
    return [
      { href: "/", label: "Home", type: "action" },
      { href: "/requests/new", label: "Request care", type: "action" },
      { href: "/member", label: "My profile", type: "member" },
      { href: "/volunteer/apply", label: "Serve", type: "follow-up" },
    ];
  }

  if (user.role === "volunteer") {
    return [
      { href: "/volunteer", label: "Tasks", type: "follow-up" },
      {
        href: "/notifications",
        label: unreadNotificationCount > 0 ? `Inbox ${unreadNotificationCount}` : "Inbox",
        type: "inbox",
      },
      { href: "/member", label: "Profile", type: "member" },
      { href: "/security", label: "Security", type: "action" },
    ];
  }

  return [
    { href: "/ecosystem", label: "Command", type: "action" },
    { href: "/follow-up", label: "Follow-up", type: "follow-up" },
    { href: "/households", label: "Households", type: "household" },
    { href: "/inbox", label: "Inbox", type: "inbox" },
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
  const publicItems = [
    {
      href: "/requests/new",
      label: copy.layout.nav.requestCare,
    },
    {
      href: "/requests/status",
      label: copy.layout.nav.trackRequest,
    },
    {
      href: "/member",
      label: copy.layout.nav.memberPortal,
    },
  ];

  if (!user) {
    publicItems.push({
      href: "/login",
      label: copy.layout.nav.signIn,
    });

    return [
      {
        label: copy.layout.navGroups.public,
        items: publicItems,
      },
    ];
  }

  const operationItems = [];
  const oversightItems = [];
  const normalizedRole = normalizeInternalRole(user.role);

  // -- Member-specific nav --
  if (normalizedRole === "member") {
    operationItems.push({ href: "/", label: "My home" });
    operationItems.push({ href: "/requests/new", label: copy.layout.nav.requestCare });
    operationItems.push({ href: "/member", label: "My profile & requests" });
    operationItems.push({ href: "/volunteer/apply", label: "Serve as a volunteer" });
    operationItems.push({
      href: "/notifications",
      label: unreadNotificationCount > 0
        ? `Notifications (${unreadNotificationCount})`
        : "Notifications",
    });
  }

  if (["pastor", "owner"].includes(normalizedRole)) {
    operationItems.push({
      href: "/ecosystem",
      label: "Ecosystem Command",
    });
    operationItems.push({
      href: "/",
      label: "Care Overview",
    });
    operationItems.push({ href: "/follow-up", label: "Follow-up" });
    operationItems.push({ href: "/inbox", label: "Inbox" });
    operationItems.push({ href: "/discipleship", label: "Discipleship" });
  }

  if (["leader", "pastor", "owner"].includes(normalizedRole)) {
    if (normalizedRole === "leader") {
      operationItems.push({
        href: "/ecosystem",
        label: "Ecosystem Command",
      });
    }
    operationItems.push({
      href: "/leader",
      label: copy.layout.nav.leaderView,
    });
    operationItems.push({
      href: "/schedule",
      label: copy.layout.nav.schedule,
    });
    operationItems.push({
      href: "/households",
      label: copy.layout.nav.households,
    });
  }

  if (["volunteer", "leader", "pastor", "owner"].includes(normalizedRole)) {
    operationItems.push({
      href: "/volunteer",
      label: copy.layout.nav.volunteerView,
    });
    operationItems.push({
      href: "/notifications",
      label:
        unreadNotificationCount > 0
          ? `${copy.layout.nav.notifications} (${unreadNotificationCount})`
          : copy.layout.nav.notifications,
    });
  }

  if (["pastor", "owner"].includes(normalizedRole)) {
    oversightItems.push({
      href: "/teams",
      label: copy.layout.nav.teams,
    });
    oversightItems.push({
      href: "/admin/users",
      label: copy.layout.nav.people,
    });
    oversightItems.push({
      href: "/members",
      label: "Members",
    });
    oversightItems.push({
      href: "/groups",
      label: "Groups",
    });
    oversightItems.push({
      href: "/attendance",
      label: "Attendance",
    });
    oversightItems.push({
      href: "/finance",
      label: "Finance",
    });
    oversightItems.push({
      href: "/analytics",
      label: "Analytics",
    });
    oversightItems.push({
      href: "/new-members",
      label: "New Members",
    });
    oversightItems.push({
      href: "/volunteer/applications",
      label: "Volunteer Applications",
    });
    oversightItems.push({
      href: "/reports",
      label: copy.layout.nav.reports,
    });
    oversightItems.push({
      href: "/audit",
      label: copy.layout.nav.audit,
    });
  }

  if (["pastor", "owner"].includes(normalizedRole)) {
    oversightItems.push({
      href: "/settings",
      label: copy.layout.nav.settings,
    });
  }

  if (user) {
    oversightItems.push({
      href: "/security",
      label: copy.layout.nav.security || "Security",
    });
  }

  return [
    {
      label: copy.layout.navGroups.public,
      items: publicItems,
    },
    {
      label: copy.layout.navGroups.operations,
      items: operationItems,
    },
    ...(oversightItems.length > 0
      ? [
          {
            label: copy.layout.navGroups.oversight,
            items: oversightItems,
          },
        ]
      : []),
  ];
}

