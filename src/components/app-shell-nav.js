'use client';

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  logout,
  switchPublicBranch,
  switchWorkspaceBranch,
  togglePrivacyModePreference,
  toggleThemePreference,
} from "@/app/actions";
import { DisplayPreferencesForm } from "@/components/display-preferences-form";
import { PwaInstallControl } from "@/components/pwa-install-control";

export function AppShellNav({
  sections = [],
  currentLanguage,
  currentDisplayMode,
  currentTheme,
  currentPrivacyMode = "open",
  languageOptions,
  displayModeOptions,
  copy,
  workspaceSwitcher = null,
  userSummary = null,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [desktopOpenKey, setDesktopOpenKey] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const redirectTo = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
  const visibleSections = useMemo(
    () => sections.filter((section) => (section.items || []).length > 0),
    [sections]
  );

  return (
    <div className="relative flex min-w-0 items-center gap-2">
      <div className="hidden items-center gap-1 xl:flex">
        {visibleSections.map((section) => (
          <DesktopMenu
            key={section.label}
            menuKey={section.label}
            label={section.label}
            openKey={desktopOpenKey}
            setOpenKey={setDesktopOpenKey}
          >
            <NavMenuList
              items={section.items}
              pathname={pathname}
              onNavigate={() => setDesktopOpenKey(null)}
            />
          </DesktopMenu>
        ))}

        <DesktopMenu
          menuKey="preferences"
          label={copy.preferencesMenuLabel || "Language"}
          openKey={desktopOpenKey}
          setOpenKey={setDesktopOpenKey}
          wide
        >
          <LanguageMenuPanel
            currentLanguage={currentLanguage}
            currentDisplayMode={currentDisplayMode}
            languageOptions={languageOptions}
            displayModeOptions={displayModeOptions}
            copy={copy}
          />
        </DesktopMenu>

        {workspaceSwitcher ? (
          <DesktopMenu
            menuKey="workspace"
            label={workspaceSwitcher.menuLabel}
            openKey={desktopOpenKey}
            setOpenKey={setDesktopOpenKey}
            wide
          >
            <WorkspaceMenuPanel
              workspaceSwitcher={workspaceSwitcher}
              onNavigate={() => setDesktopOpenKey(null)}
            />
          </DesktopMenu>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <PwaInstallControl copy={copy} />
        <PrivacyToggleButton
          currentPrivacyMode={currentPrivacyMode}
          redirectTo={redirectTo}
        />
        <ThemeToggleButton
          currentTheme={currentTheme}
          redirectTo={redirectTo}
          copy={copy}
        />

        {userSummary?.switchHref ? (
          <Link
            href={userSummary.switchHref}
            className="hidden min-h-11 items-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)] xl:inline-flex"
          >
            {copy.switchAccount || "Switch account"}
          </Link>
        ) : null}

        {userSummary ? (
          <DesktopMenu
            menuKey="account"
            label={userSummary.buttonLabel}
            accent
            openKey={desktopOpenKey}
            setOpenKey={setDesktopOpenKey}
          >
            <AccountMenuPanel copy={copy} userSummary={userSummary} />
          </DesktopMenu>
        ) : (
          <Link
            href="/login"
            className="hidden min-h-11 items-center justify-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)] xl:inline-flex"
          >
            {copy.signIn}
          </Link>
        )}

        <button
          type="button"
          className="xl:hidden inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-[var(--header-pill-bg)] px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-paper"
          onClick={() => setMobileOpen((current) => !current)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileOpen ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-[1.5rem] border border-line bg-paper p-4 shadow-[var(--menu-shadow)] xl:hidden">
          <div className="space-y-5">
            {visibleSections.map((section) => (
              <div key={section.label}>
                <p className="eyebrow mb-2 px-1">{section.label}</p>
                <NavMenuList
                  items={section.items}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            ))}

            <div>
              <p className="eyebrow mb-2 px-1">{copy.preferencesMenuLabel || "Language"}</p>
              <LanguageMenuPanel
                currentLanguage={currentLanguage}
                currentDisplayMode={currentDisplayMode}
                languageOptions={languageOptions}
                displayModeOptions={displayModeOptions}
                copy={copy}
              />
            </div>

            {workspaceSwitcher ? (
              <div>
                <p className="eyebrow mb-2 px-1">{workspaceSwitcher.menuLabel}</p>
                <WorkspaceMenuPanel
                  workspaceSwitcher={workspaceSwitcher}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <ThemeToggleButton
                currentTheme={currentTheme}
                redirectTo={redirectTo}
                copy={copy}
                mobile
              />
              <PrivacyToggleButton
                currentPrivacyMode={currentPrivacyMode}
                redirectTo={redirectTo}
                mobile
              />
            </div>

            {userSummary ? (
              <div>
                <p className="eyebrow mb-2 px-1">Account</p>
                <AccountMenuPanel copy={copy} userSummary={userSummary} mobile />
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
              >
                {copy.signIn}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ThemeToggleButton({ currentTheme, redirectTo, copy, mobile = false }) {
  const darkMode = currentTheme === "dark";

  return (
    <form action={toggleThemePreference}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="theme" value={darkMode ? "light" : "dark"} />
      <button
        type="submit"
        aria-label={copy.themeToggleLabel || "Toggle dark mode"}
        title={copy.themeToggleLabel || "Toggle dark mode"}
        className={`inline-flex items-center justify-center rounded-full border border-line bg-[var(--header-pill-bg)] text-sm font-semibold text-foreground transition hover:border-[var(--soft-accent-border)] hover:bg-paper ${
          mobile ? "min-h-11 w-full gap-2 px-4 py-3" : "h-11 w-11"
        }`}
      >
        {darkMode ? <SunGlyph /> : <MoonGlyph />}
        {mobile ? <span>{darkMode ? "Light mode" : "Dark mode"}</span> : null}
      </button>
    </form>
  );
}

function PrivacyToggleButton({ currentPrivacyMode, redirectTo, mobile = false }) {
  const guarded = currentPrivacyMode === "guarded";

  return (
    <form action={togglePrivacyModePreference}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="privacyMode" value={guarded ? "open" : "guarded"} />
      <button
        type="submit"
        aria-label="Toggle privacy guard"
        title="Toggle privacy guard"
        className={`inline-flex items-center justify-center rounded-full border border-line bg-[var(--header-pill-bg)] text-sm font-semibold text-foreground transition hover:border-[var(--soft-accent-border)] hover:bg-paper ${
          mobile ? "min-h-11 w-full gap-2 px-4 py-3" : "h-11 w-11"
        }`}
      >
        {guarded ? <EyeOffGlyph /> : <EyeGlyph />}
        {mobile ? <span>{guarded ? "Privacy guarded" : "Privacy open"}</span> : null}
      </button>
    </form>
  );
}

function DesktopMenu({
  menuKey,
  label,
  children,
  openKey,
  setOpenKey,
  wide = false,
  accent = false,
}) {
  const open = openKey === menuKey;
  const closeTimer = useRef(null);

  function handleMouseEnter() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenKey(menuKey);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => {
      setOpenKey((current) => (current === menuKey ? null : current));
    }, 120);
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setOpenKey((current) => (current === menuKey ? null : menuKey))}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
          accent
            ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss hover:bg-[var(--soft-fill-strong)]"
            : open
              ? "border-line bg-paper text-foreground"
              : "border-transparent bg-[var(--header-pill-bg)] text-muted hover:border-line hover:bg-paper hover:text-foreground"
        }`}
      >
        {label}
        <Chevron open={open} />
      </button>

      <div
        className={`absolute right-0 top-full z-50 mt-2 transition ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <div
          className={`rounded-[1.45rem] border border-line bg-paper p-4 shadow-[var(--menu-shadow)] ${
            wide ? "w-[23rem]" : "w-[18rem]"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function NavMenuList({ items = [], pathname, onNavigate = () => {} }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`rounded-[1rem] border px-4 py-3 text-sm font-medium transition ${
              active
                ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                : "border-transparent bg-canvas text-foreground hover:border-line hover:bg-[var(--surface-hover)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function LanguageMenuPanel({
  currentLanguage,
  currentDisplayMode,
  languageOptions,
  displayModeOptions,
  copy,
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted">
        {copy.preferencesTitle || "Language and reading"}
      </p>
      <p className="mt-2 text-sm leading-7 text-muted">
        {copy.preferencesBody ||
          "Choose the language and text size that make the workspace easiest to read."}
      </p>
      <div className="mt-4">
        <DisplayPreferencesForm
          currentLanguage={currentLanguage}
          currentDisplayMode={currentDisplayMode}
          languageOptions={languageOptions}
          displayModeOptions={displayModeOptions}
          copy={copy}
          compact
        />
      </div>
    </div>
  );
}

function AccountMenuPanel({ copy, userSummary, mobile = false }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted">
          {copy.workspaceSignedIn || "Signed in"}
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">{userSummary.name}</p>
        <p className="mt-1 text-sm text-muted">{userSummary.roleLabel}</p>
        {userSummary.detailLabel ? (
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
            {userSummary.detailLabel}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Link
          href={userSummary.workspaceHref}
          className="rounded-[1rem] border border-transparent bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-line hover:bg-[var(--surface-hover)]"
        >
          {copy.returnToWorkspace || "Return to workspace"}
        </Link>
        <Link
          href="/member"
          className="rounded-[1rem] border border-transparent bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-line hover:bg-[var(--surface-hover)]"
        >
          {copy.memberTools || "Member tools"}
        </Link>
        <Link
          href="/security"
          className="rounded-[1rem] border border-transparent bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-line hover:bg-[var(--surface-hover)]"
        >
          {copy.securityControls || "Security"}
        </Link>
        {userSummary.switchHref ? (
          <Link
            href={userSummary.switchHref}
            className="rounded-[1rem] border border-transparent bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-line hover:bg-[var(--surface-hover)]"
          >
            {copy.switchAccount || "Switch account"}
          </Link>
        ) : null}
      </div>

      <form action={logout}>
        <button
          type="submit"
          className={`inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-line px-4 py-3 text-sm font-medium text-foreground transition hover:bg-canvas ${
            mobile ? "w-full" : ""
          }`}
        >
          {copy.signOut || "Sign out"}
        </button>
      </form>
    </div>
  );
}

function WorkspaceMenuPanel({ workspaceSwitcher, onNavigate = () => {} }) {
  const action =
    workspaceSwitcher.catalog || workspaceSwitcher.organizationId
      ? switchPublicBranch
      : switchWorkspaceBranch;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted">
          {workspaceSwitcher.eyebrow}
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">
          {workspaceSwitcher.title}
        </p>
        <p className="mt-2 text-sm leading-7 text-muted">{workspaceSwitcher.body}</p>
      </div>

      {"catalog" in workspaceSwitcher && workspaceSwitcher.catalog ? (
        <div className="space-y-3">
          {workspaceSwitcher.catalog.map((organization) => (
            <div key={organization.id} className="rounded-[1rem] border border-line bg-canvas p-3">
              <form action={action}>
                <input type="hidden" name="organizationId" value={organization.id} />
                <input
                  type="hidden"
                  name="branchId"
                  value={organization.defaultBranchId || organization.defaultBranch?.id || ""}
                />
                <input type="hidden" name="redirectTo" value={workspaceSwitcher.redirectTo} />
                <button
                  type="submit"
                  onClick={onNavigate}
                  className={`flex w-full items-center gap-3 rounded-[0.95rem] border px-4 py-3 text-left text-sm font-medium transition ${
                    workspaceSwitcher.organizationId === organization.id
                      ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                      : "border-transparent bg-paper text-foreground hover:border-line hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {organization.logoHref ? (
                    <Image
                      src={organization.logoHref}
                      alt={`${organization.name} logo`}
                      width={44}
                      height={44}
                      unoptimized
                      className="h-11 w-11 rounded-2xl border border-line bg-paper object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper text-xs font-bold uppercase text-moss">
                      {(organization.shortName || organization.name).slice(0, 2)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{organization.name}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-muted">
                      {organization.pastorName || "Member tools and sign-in"}
                    </span>
                  </span>
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      {"branches" in workspaceSwitcher && workspaceSwitcher.branches ? (
        workspaceSwitcher.canSwitch ? (
          <div className="grid gap-2">
            <form action={action}>
              <input type="hidden" name="branchId" value="" />
              <input type="hidden" name="redirectTo" value={workspaceSwitcher.redirectTo} />
              <button
                type="submit"
                onClick={onNavigate}
                className={`w-full rounded-[0.95rem] border px-4 py-3 text-left text-sm font-medium transition ${
                  !workspaceSwitcher.activeBranchId
                    ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                    : "border-transparent bg-canvas text-foreground hover:border-line hover:bg-[var(--surface-hover)]"
                }`}
              >
                All visible branches
              </button>
            </form>
            {workspaceSwitcher.branches.map((branch) => (
              <form key={branch.id} action={action}>
                <input type="hidden" name="branchId" value={branch.id} />
                <input type="hidden" name="redirectTo" value={workspaceSwitcher.redirectTo} />
                <button
                  type="submit"
                  onClick={onNavigate}
                  className={`w-full rounded-[0.95rem] border px-4 py-3 text-left text-sm font-medium transition ${
                    workspaceSwitcher.activeBranchId === branch.id
                      ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                      : "border-transparent bg-canvas text-foreground hover:border-line hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span className="block">{branch.name}</span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-muted">
                    {branch.locationLabel || branch.code}
                  </span>
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-muted">
            This workspace is limited to one branch.
          </div>
        )
      ) : null}
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

function SunGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.25" />
      <path d="M12 19.25v2.25" />
      <path d="m4.93 4.93 1.6 1.6" />
      <path d="m17.47 17.47 1.6 1.6" />
      <path d="M2.5 12h2.25" />
      <path d="M19.25 12h2.25" />
      <path d="m4.93 19.07 1.6-1.6" />
      <path d="m17.47 6.53 1.6-1.6" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 15.35A8.5 8.5 0 1 1 8.65 4 6.75 6.75 0 0 0 20 15.35Z" />
    </svg>
  );
}

function EyeGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3 21 21" />
      <path d="M10.58 10.58A3 3 0 0 0 14 14" />
      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a17.73 17.73 0 0 1-4.11 4.95" />
      <path d="M6.1 6.09A17.74 17.74 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.18-.8" />
    </svg>
  );
}

function isActivePath(pathname, href) {
  if (!pathname || !href) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
