import Link from "next/link";
import { cookies } from "next/headers";
import { RequestIntakeForm } from "@/components/request-intake-form";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCopy } from "@/lib/i18n";
import {
  defaultPrimaryBranchId,
  defaultPrimaryOrganizationId,
} from "@/lib/organization-defaults";
import {
  getEffectiveChurchSettings,
  getPublicWorkspaceCatalog,
} from "@/lib/organization-store";
import {
  PUBLIC_BRANCH_COOKIE,
  PUBLIC_ORGANIZATION_COOKIE,
} from "@/lib/workspace-scope";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Request Care",
  description:
    "A low-friction care request form with visible privacy controls and a calm member experience.",
};

export default async function NewRequestPage() {
  const [preferences, currentUser] = await Promise.all([
    getAppPreferences(),
    getCurrentUser(),
  ]);
  const copy = getCopy(preferences.language);
  const cookieStore = await cookies();
  const catalog = getPublicWorkspaceCatalog();
  const organizationId =
    cookieStore.get(PUBLIC_ORGANIZATION_COOKIE)?.value ||
    defaultPrimaryOrganizationId ||
    catalog[0]?.id ||
    "";
  const organization =
    catalog.find((item) => item.id === organizationId) ||
    catalog.find((item) => item.id === defaultPrimaryOrganizationId) ||
    catalog[0] ||
    null;
  const branchId =
    cookieStore.get(PUBLIC_BRANCH_COOKIE)?.value ||
    defaultPrimaryBranchId ||
    organization?.branches?.[0]?.id ||
    "";
  const branch =
    organization?.branches?.find((item) => item.id === branchId) ||
    organization?.branches?.find((item) => item.id === defaultPrimaryBranchId) ||
    organization?.branches?.[0] ||
    null;
  const settings = getEffectiveChurchSettings(organization?.id, branch?.id || "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-16 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
      <section className="surface-card rounded-[1.5rem] border border-line bg-paper p-5 sm:rounded-[2rem] sm:p-8 lg:p-10">
        <div className="max-w-4xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            {copy.requestNew.kicker}
          </p>
          <h1 className="mt-4 text-4xl leading-tight tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
            {copy.requestNew.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-muted sm:text-lg">
            {copy.requestNew.description}
          </p>
          {organization ? (
            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
              <span className="font-semibold text-foreground">{organization.name}</span>
              {branch ? <span>/ {branch.name}</span> : null}
            </div>
          ) : null}
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
          <RequestIntakeForm
            language={preferences.language}
            copy={copy.intakeForm}
            currentUser={currentUser ? { name: currentUser.name, email: currentUser.email, phone: currentUser.phone } : null}
          />
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {settings?.emergencyBanner ||
            copy.requestNew.emergencyFallback}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/requests/status"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            {copy.requestNew.trackRequest}
          </Link>
          <Link
            href="/member"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            {copy.layout.nav.memberPortal}
          </Link>
          <Link
            href="/permissions"
            className="font-medium text-foreground underline decoration-[rgba(34,28,22,0.18)] underline-offset-4"
          >
            {copy.requestNew.permissions}
          </Link>
        </div>
      </div>
    </div>
  );
}
