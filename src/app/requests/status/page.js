import Link from "next/link";
import { cookies } from "next/headers";
import { RequestStatusLookup } from "@/components/request-status-lookup";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getMemberRequestStatusByTrackingCode } from "@/lib/care-store";
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

export const metadata = {
  title: "Request Status",
  description:
    "Track a submitted care request with a member-safe status view and timeline.",
};

export default async function RequestStatusPage({ searchParams }) {
  const preferences = await getAppPreferences();
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
  const params = await searchParams;
  const trackingCode =
    typeof params?.code === "string" ? params.code.trim().toUpperCase() : "";
  const [settings, initialResult] = await Promise.all([
    Promise.resolve(getEffectiveChurchSettings(organization?.id, branch?.id || "")),
    trackingCode ? getMemberRequestStatusByTrackingCode(trackingCode) : Promise.resolve(null),
  ]);
  const scopedOrganization =
    initialResult?.organizationId
      ? catalog.find((item) => item.id === initialResult.organizationId) || organization
      : organization;
  const scopedBranch =
    initialResult?.branchId && scopedOrganization
      ? scopedOrganization.branches?.find((item) => item.id === initialResult.branchId) || branch
      : branch;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
            {copy.requestStatusPage.kicker}
          </p>
          <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
            {copy.requestStatusPage.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {copy.requestStatusPage.description}
          </p>
          {scopedOrganization ? (
            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
              <span className="font-semibold text-foreground">{scopedOrganization.name}</span>
              {scopedBranch ? <span>/ {scopedBranch.name}</span> : null}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            <InfoPanel
              title={copy.requestStatusPage.infoVisibleTitle}
              body={copy.requestStatusPage.infoVisibleBody}
            />
            <InfoPanel
              title={copy.requestStatusPage.infoSupportTitle}
              body={copy.requestStatusPage.infoSupportBody(
                settings?.supportEmail,
                settings?.supportPhone
              )}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/requests/new"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
            >
              {copy.requestStatusPage.submitCareRequest}
            </Link>
            <Link
              href="/member"
              className="inline-flex items-center justify-center rounded-[1rem] border border-[rgba(34,28,22,0.08)] bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-foreground"
            >
              {copy.layout.nav.memberPortal}
            </Link>
            <Link
              href="/account-recovery"
              className="inline-flex items-center justify-center rounded-[1rem] border border-[rgba(34,28,22,0.08)] bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-foreground"
            >
              {copy.requestStatusPage.accountRecovery}
            </Link>
          </div>
        </article>

        <RequestStatusLookup
          copy={copy.requestStatusLookup}
          privacyCopy={copy.common.privacyShield}
          language={preferences.language}
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
