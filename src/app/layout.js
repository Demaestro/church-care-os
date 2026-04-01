import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { getCurrentUser, getUserLandingPage } from "@/lib/auth";
import { AppShellNav } from "@/components/app-shell-nav";
import { getAppPreferences } from "@/lib/app-preferences-server";
import {
  getCopy,
  getDisplayModeOptionsWithLabels,
  getLanguageOptionsWithLabels,
  translateRoleLabel,
} from "@/lib/i18n";
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

// Inter font loaded via Google Fonts for premium typography
const interFontUrl =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";

export const metadata = {
  title: {
    default: "Church Care OS",
    template: "%s | Church Care OS",
  },
  description:
    "Care coordination for pastors, deacons, and volunteers with one shared rhythm for requests, assignments, and follow-up.",
  applicationName: "Church Care OS",
  openGraph: {
    title: "Church Care OS",
    description:
      "A warm operating system for care requests, volunteer coordination, and pastoral follow-up.",
    type: "website",
  },
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
    defaultPrimaryBranchId ||
    publicOrganization?.branches?.[0]?.id ||
    "";
  const publicBranch =
    publicOrganization?.branches?.find((item) => item.id === publicBranchId) ||
    publicOrganization?.branches?.find((item) => item.id === defaultPrimaryBranchId) ||
    publicOrganization?.branches?.[0] ||
    null;
  const workspaceSwitcher = user
    ? {
        menuLabel: "Branch",
        eyebrow: workspace?.organization?.name || "",
        title: workspace?.activeBranch
          ? workspace.activeBranch.name
          : "All branches",
        body: workspace?.canSwitchBranches
          ? "Change branch focus without leaving your current workspace."
          : "This account is scoped to one branch. Branch privacy stays enforced here.",
        canSwitch: Boolean(workspace?.canSwitchBranches),
        redirectTo: workspaceHref,
        activeBranchId: workspace?.activeBranch?.id || "",
        branches: workspace?.visibleBranches || [],
      }
    : publicOrganization
      ? {
          menuLabel: "Church",
          eyebrow: publicOrganization.name,
          title: publicBranch?.name || publicOrganization.name,
          body:
            "Choose the church branch members should use for intake, request tracking, and member tools.",
          canSwitch: (publicOrganization.branches || []).length > 1 || publicCatalog.length > 1,
          redirectTo: "/",
          organizationId: publicOrganization.id,
          branchId: publicBranch?.id || "",
          catalog: publicCatalog,
        }
      : null;
  const userSummary = user
    ? {
        name: user.name,
        buttonLabel: user.name.split(" ")[0] || user.name,
        roleLabel: translateRoleLabel(user.role, preferences.language),
        detailLabel: workspace
          ? `${workspace.organization.shortName} · ${workspace.activeScopeLabel}`
          : "",
        workspaceHref,
        switchHref: "/login?switch=1",
      }
    : null;

  return (
    <html
      lang={preferences.language}
      data-display-mode={preferences.displayMode}
      data-theme={preferences.theme}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={interFontUrl} rel="stylesheet" />
      </head>
      <body suppressHydrationWarning className="min-h-full text-foreground">
        <div className="relative isolate min-h-screen overflow-x-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[-8rem] -z-10 h-[28rem] blur-3xl"
          >
            <div className="mx-auto h-full max-w-6xl rounded-full bg-[image:var(--hero-glow)]" />
          </div>

          <header className="sticky top-0 z-40 border-b border-line bg-[var(--header-bg)] shadow-[var(--header-shadow)] backdrop-blur-2xl">
            <div className="mx-auto max-w-7xl px-6 py-4 lg:px-10">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-[0.12em] text-white transition-all duration-200 group-hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, var(--moss) 0%, #1e40af 100%)",
                      boxShadow: "0 4px 14px rgba(29,78,216,0.36)",
                    }}
                  >
                    CC
                  </span>
                  <span>
                    <span className="block text-[0.66rem] font-semibold uppercase tracking-[0.26em] text-muted">
                      {copy.layout.brandKicker}
                    </span>
                    <span className="block text-[0.9rem] font-bold text-foreground leading-tight">
                      {copy.layout.brandTitle}
                    </span>
                  </span>
                </Link>

                <AppShellNav
                  sections={navSections}
                  currentLanguage={preferences.language}
                  currentDisplayMode={preferences.displayMode}
                  currentTheme={preferences.theme}
                  languageOptions={languageOptions}
                  displayModeOptions={displayModeOptions}
                  copy={copy.layout}
                  workspaceSwitcher={workspaceSwitcher}
                  userSummary={userSummary}
                />
              </div>
            </div>
          </header>

          <main>{children}</main>

          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted lg:flex-row lg:items-center lg:justify-between lg:px-10">
              <p>{copy.layout.footerPrimary}</p>
              <p>{copy.layout.footerSecondary}</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
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
    {
      href: "/permissions",
      label: copy.layout.nav.permissions,
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

  if (["pastor", "overseer", "owner"].includes(user.role)) {
    operationItems.push({
      href: "/",
      label: copy.layout.nav.dashboard,
    });
  }

  if (["leader", "pastor", "overseer", "owner"].includes(user.role)) {
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

  if (["volunteer", "leader", "pastor", "overseer", "owner"].includes(user.role)) {
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

  if (["pastor", "overseer", "owner"].includes(user.role)) {
    oversightItems.push({
      href: "/teams",
      label: copy.layout.nav.teams,
    });
    oversightItems.push({
      href: "/admin/users",
      label: copy.layout.nav.people,
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

  if (
    ["general_overseer", "hq_care_admin", "regional_overseer", "overseer", "owner"].includes(
      user.role
    )
  ) {
    oversightItems.unshift({
      href: "/hq",
      label: "HQ Dashboard",
    });
  }

  if (user.role === "branch_admin") {
    oversightItems.push({
      href: "/admin/branch-users",
      label: "Branch People",
    });
  }

  if (["overseer", "owner"].includes(user.role)) {
    oversightItems.push({
      href: "/branches",
      label: copy.layout.nav.branches,
    });
    oversightItems.push({
      href: "/regions",
      label: copy.layout.nav.regions || "Regions",
    });
    oversightItems.push({
      href: "/transfers",
      label: copy.layout.nav.transfers || "Transfers",
    });
  }

  if (user.role === "owner") {
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
