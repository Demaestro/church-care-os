'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  logout,
  switchPublicBranch,
  switchWorkspaceBranch,
  toggleThemePreference,
} from "@/app/actions";
import { DisplayPreferencesForm } from "@/components/display-preferences-form";

export function AppShellNav({
  sections = [],
  currentLanguage,
  currentDisplayMode,
  currentTheme,
  languageOptions,
  displayModeOptions,
  copy,
  workspaceSwitcher = null,
  userSummary = null,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [desktopOpenKey, setDesktopOpenKey] = useState(null);
  const [mobileOpenKey, setMobileOpenKey] = useState(null);

  const redirectTo = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
  const visibleSections = useMemo(
    () => sections.filter((section) => (section.items || []).length > 0),
    [sections]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 xl:w-full">
      <div className="hidden xl:flex xl:w-full xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
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

          <DesktopMenu
            menuKey="language"
            label={copy.languageLabel}
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
        </div>

        <div className="ml-6 flex shrink-0 items-start gap-3">
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
          ) : null}

          <div className="flex min-w-[10.75rem] flex-col items-end gap-2">
            <ThemeToggleButton
              currentTheme={currentTheme}
              redirectTo={redirectTo}
              copy={copy}
            />

            {userSummary ? (
              <Link
                href={userSummary.switchHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-paper transition hover:opacity-90"
              >
                {copy.switchAccount}
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
              >
                {copy.signIn}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="xl:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {visibleSections.map((section) => (
            <MobileMenuButton
              key={section.label}
              label={section.label}
              active={mobileOpenKey === section.label}
              onClick={() =>
                setMobileOpenKey((current) =>
                  current === section.label ? null : section.label
                )
              }
            />
          ))}

          <MobileMenuButton
            label={copy.languageLabel}
            active={mobileOpenKey === "language"}
            onClick={() =>
              setMobileOpenKey((current) => (current === "language" ? null : "language"))
            }
          />

          {workspaceSwitcher ? (
            <MobileMenuButton
              label={workspaceSwitcher.menuLabel}
              active={mobileOpenKey === "workspace"}
              onClick={() =>
                setMobileOpenKey((current) => (current === "workspace" ? null : "workspace"))
              }
            />
          ) : null}

          <ThemeToggleButton
            currentTheme={currentTheme}
            redirectTo={redirectTo}
            copy={copy}
            mobile
          />

          {userSummary ? (
            <>
              <MobileMenuButton
                label={userSummary.buttonLabel}
                active={mobileOpenKey === "account"}
                onClick={() =>
                  setMobileOpenKey((current) => (current === "account" ? null : "account"))
                }
                accent
              />
              <Link
                href={userSummary.switchHref}
                className="shrink-0 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:opacity-90"
              >
                {copy.switchAccount}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="shrink-0 rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
            >
              {copy.signIn}
            </Link>
          )}
        </div>

        {mobileOpenKey ? (
          <div className="mt-3 rounded-[1.35rem] border border-line bg-paper p-4 shadow-[var(--menu-shadow)]">
            {visibleSections.some((section) => section.label === mobileOpenKey) ? (
              <NavMenuList
                items={
                  visibleSections.find((section) => section.label === mobileOpenKey)?.items ||
                  []
                }
                pathname={pathname}
                stacked
                onNavigate={() => setMobileOpenKey(null)}
              />
            ) : null}

            {mobileOpenKey === "language" ? (
              <LanguageMenuPanel
                currentLanguage={currentLanguage}
                currentDisplayMode={currentDisplayMode}
                languageOptions={languageOptions}
                displayModeOptions={displayModeOptions}
                copy={copy}
              />
            ) : null}

            {mobileOpenKey === "workspace" && workspaceSwitcher ? (
              <WorkspaceMenuPanel workspaceSwitcher={workspaceSwitcher} />
            ) : null}

            {mobileOpenKey === "account" && userSummary ? (
              <AccountMenuPanel copy={copy} userSummary={userSummary} mobile />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThemeToggleButton({
  currentTheme,
  redirectTo,
  copy,
  mobile = false,
}) {
  const darkMode = currentTheme === "dark";

  return (
    <form action={toggleThemePreference} className={mobile ? "shrink-0" : ""}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="theme" value={darkMode ? "light" : "dark"} />
      <button
        type="submit"
        aria-pressed={darkMode}
        className={`inline-flex min-h-11 items-center gap-3 rounded-full border border-line bg-[var(--header-pill-bg)] px-4 py-2 text-sm font-medium text-foreground transition hover:bg-paper ${
          mobile ? "px-4 py-3" : "self-end"
        }`}
      >
        <span>{copy.themeToggleLabel}</span>
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
            darkMode ? "bg-[var(--moss)]" : "bg-[var(--line)]"
          }`}
          style={darkMode ? { opacity: 0.85 } : {}}
        >
          <span
            className={`absolute top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 rounded-full bg-paper shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition ${
              darkMode ? "left-[1.4rem]" : "left-1"
            }`}
          />
        </span>
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

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpenKey(menuKey)}
      onMouseLeave={() => setOpenKey((current) => (current === menuKey ? null : current))}
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
        className={`absolute right-0 top-full z-50 mt-3 transition ${
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

function MobileMenuButton({ label, active, onClick, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-3 text-sm font-medium transition ${
        accent
          ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
          : active
            ? "border-line bg-paper text-foreground"
            : "border-line bg-[var(--header-pill-bg)] text-muted"
      }`}
    >
      {label}
    </button>
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
        {copy.preferencesTitle}
      </p>
      <p className="mt-2 text-sm leading-7 text-muted">{copy.preferencesBody}</p>
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
          {copy.workspaceSignedIn}
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
          {copy.returnToWorkspace}
        </Link>
        <Link
          href="/member"
          className="rounded-[1rem] border border-transparent bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-line hover:bg-[var(--surface-hover)]"
        >
          {copy.memberTools}
        </Link>
        <Link
          href="/security"
          className="rounded-[1rem] border border-transparent bg-canvas px-4 py-3 text-sm font-medium text-foreground transition hover:border-line hover:bg-[var(--surface-hover)]"
        >
          {copy.securityControls || "Security"}
        </Link>
      </div>

      <form action={logout}>
        <button
          type="submit"
          className={`inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-line px-4 py-3 text-sm font-medium text-foreground transition hover:bg-canvas ${
            mobile ? "w-full" : ""
          }`}
        >
          {copy.signOut}
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
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {organization.name}
              </p>
              <div className="mt-3 grid gap-2">
                {organization.branches.map((branch) => (
                  <form key={branch.id} action={action}>
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="branchId" value={branch.id} />
                    <input type="hidden" name="redirectTo" value={workspaceSwitcher.redirectTo} />
                    <button
                      type="submit"
                      onClick={onNavigate}
                      className={`w-full rounded-[0.95rem] border px-4 py-3 text-left text-sm font-medium transition ${
                        workspaceSwitcher.branchId === branch.id
                          ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                          : "border-transparent bg-paper text-foreground hover:border-line hover:bg-[var(--surface-hover)]"
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

function isActivePath(pathname, href) {
  if (!pathname || !href) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
