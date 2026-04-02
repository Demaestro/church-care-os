import Link from "next/link";
import { cookies } from "next/headers";
import { updateMemberContactProfile } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { PrivacyShield } from "@/components/privacy-shield";
import { SubmitButton } from "@/components/submit-button";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { getCopy, translateSupportNeed } from "@/lib/i18n";
import {
  defaultPrimaryBranchId,
  defaultPrimaryOrganizationId,
} from "@/lib/organization-defaults";
import { getMemberPortalData } from "@/lib/care-store";
import { getPublicWorkspaceCatalog } from "@/lib/organization-store";
import { filterMemberRequests, hasActiveFilters } from "@/lib/search-filters";
import {
  PUBLIC_BRANCH_COOKIE,
  PUBLIC_ORGANIZATION_COOKIE,
} from "@/lib/workspace-scope";

export const metadata = {
  title: "Member Portal",
  description:
    "A gentle self-service hub for reviewing request history and keeping contact details current.",
};

export default async function MemberPortalPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.memberPortal;
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
  const contact = typeof params?.contact === "string" ? params.contact.trim() : "";
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const filters = {
    query: typeof params?.q === "string" ? params.q.trim() : "",
    status: typeof params?.status === "string" ? params.status : "all",
  };
  const portal = trackingCode && contact
    ? await getMemberPortalData(trackingCode, contact)
    : null;
  const scopedOrganization =
    portal?.requests?.[0]?.organizationId
      ? catalog.find((item) => item.id === portal.requests[0].organizationId) || organization
      : organization;
  const scopedBranch =
    portal?.requests?.[0]?.branchId && scopedOrganization
      ? scopedOrganization.branches?.find((item) => item.id === portal.requests[0].branchId) ||
        branch
      : branch;
  const visibleRequests = filterMemberRequests(portal?.requests || [], filters);
  const visibleOpenRequests = visibleRequests.filter((item) => item.isOpen);
  const visibleResolvedRequests = visibleRequests.filter((item) => !item.isOpen);
  const showClearFilters = hasActiveFilters(filters);
  const emptyStateMessage =
    trackingCode && contact && !portal ? pageCopy.notFound : pageCopy.helperBody;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              {pageCopy.kicker}
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              {pageCopy.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">{pageCopy.description}</p>
            {scopedOrganization ? (
              <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
                <span className="font-semibold text-foreground">{scopedOrganization.name}</span>
                {scopedBranch ? <span>/ {scopedBranch.name}</span> : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/requests/new"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-base font-medium text-foreground transition hover:bg-[#f4ecde]"
            >
              {pageCopy.requestCare}
            </Link>
            <Link
              href="/requests/status"
              className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-base font-medium text-foreground transition hover:bg-[#f4ecde]"
            >
              {pageCopy.trackSingleRequest}
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle={copy.common.flashNotice}
            errorTitle={copy.common.flashError}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {pageCopy.lookupEyebrow}
          </p>
          <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {pageCopy.lookupTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">{pageCopy.lookupBody}</p>

          <form action="/member" className="mt-6 space-y-4">
            <Field
              label={pageCopy.fields.trackingCode}
              name="code"
              defaultValue={trackingCode}
              placeholder="CCO-1234ABCD"
            />
            <Field
              label={pageCopy.fields.contact}
              name="contact"
              defaultValue={contact}
              placeholder={pageCopy.placeholders.contact}
            />
            <button
              type="submit"
              className="inline-flex min-h-14 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-base font-semibold text-paper transition hover:bg-[#2b251f]"
            >
              {pageCopy.buttons.openPortal}
            </button>
          </form>

          <div className="mt-6 rounded-[1.25rem] border border-line bg-canvas p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              {pageCopy.helpTitle}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">{emptyStateMessage}</p>
          </div>
        </article>

        {portal ? (
          <PrivacyShield
            className="surface-card"
            eyebrow={pageCopy.privacyShield.eyebrow}
            title={pageCopy.privacyShield.title}
            body={pageCopy.privacyShield.body}
            watermark={pageCopy.privacyShield.watermark}
            quickHideLabel={copy.common.privacyShield.quickHide}
            revealLabel={copy.common.privacyShield.reveal}
            hiddenTitle={copy.common.privacyShield.hiddenTitle}
            hiddenBody={copy.common.privacyShield.hiddenBody}
          >
            <article className="rounded-[1.8rem] p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label={pageCopy.metrics.totalRequests} value={portal.requests.length} />
                <MetricCard label={pageCopy.metrics.openRequests} value={portal.openRequests.length} />
                <MetricCard
                  label={pageCopy.metrics.households}
                  value={portal.connectedHouseholds.length}
                />
              </div>

              <form action={updateMemberContactProfile} className="mt-6 space-y-4 rounded-[1.35rem] border border-line bg-canvas p-5">
                <input type="hidden" name="trackingCode" value={portal.trackingCode} />
                <input type="hidden" name="currentContact" value={portal.contactValue} />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                  {pageCopy.profileEyebrow}
                </p>
                <h3 className="mt-2 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                  {pageCopy.profileTitle}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={pageCopy.fields.name}
                    name="submittedBy"
                    defaultValue={portal.profile.submittedBy}
                    placeholder={pageCopy.placeholders.name}
                  />
                  <Field
                    label={pageCopy.fields.preferredContact}
                    name="preferredContact"
                    defaultValue={portal.profile.preferredContact}
                    placeholder={pageCopy.placeholders.preferredContact}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={pageCopy.fields.email}
                    name="email"
                    type="email"
                    defaultValue={portal.profile.email}
                    placeholder="you@example.com"
                  />
                  <Field
                    label={pageCopy.fields.phone}
                    name="phone"
                    type="tel"
                    defaultValue={portal.profile.phone}
                    placeholder="+2348012345678"
                  />
                </div>
                <SubmitButton
                  idleLabel={pageCopy.buttons.saveProfile}
                  pendingLabel={pageCopy.buttons.savingProfile}
                  className="inline-flex min-h-14 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-base font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </form>
            </article>
          </PrivacyShield>
        ) : (
          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <div className="rounded-[1.35rem] border border-dashed border-line bg-canvas p-6">
              <p className="text-sm leading-7 text-muted">{pageCopy.emptyPortal}</p>
            </div>
          </article>
        )}
      </section>

      {portal ? (
        <PrivacyShield
          className="mt-8 surface-card"
          eyebrow={pageCopy.privacyShield.eyebrow}
          title={pageCopy.privacyShield.title}
          body={pageCopy.privacyShield.body}
          watermark={pageCopy.privacyShield.watermark}
          quickHideLabel={copy.common.privacyShield.quickHide}
          revealLabel={copy.common.privacyShield.reveal}
          hiddenTitle={copy.common.privacyShield.hiddenTitle}
          hiddenBody={copy.common.privacyShield.hiddenBody}
        >
          <section className="rounded-[1.8rem] p-6">
            <form action="/member" className="rounded-[1.25rem] border border-line bg-canvas p-4">
              <input type="hidden" name="code" value={trackingCode} />
              <input type="hidden" name="contact" value={contact} />
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.8fr_auto]">
                <Field
                  label={copy.common.searchLabel}
                  name="q"
                  defaultValue={filters.query}
                  placeholder={pageCopy.searchPlaceholder}
                />
                <SelectField
                  label={pageCopy.fields.requestStatus}
                  name="status"
                  defaultValue={filters.status}
                  options={[
                    { value: "all", label: copy.common.allStatuses },
                    { value: "open", label: pageCopy.statuses.open },
                    { value: "resolved", label: pageCopy.statuses.resolved },
                  ]}
                />
                <div className="flex items-end gap-3">
                  <button
                    type="submit"
                    className="inline-flex min-h-14 items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
                  >
                    {copy.common.searchLabel}
                  </button>
                  {showClearFilters ? (
                    <a
                      href={buildMemberHref(trackingCode, contact)}
                      className="inline-flex min-h-14 items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
                    >
                      {copy.common.clearFilters}
                    </a>
                  ) : null}
                </div>
              </div>
            </form>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <section>
                <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                  {pageCopy.historyTitle}
                </h2>

                <div className="mt-5 space-y-4">
                  {visibleOpenRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      label={pageCopy.statuses.open}
                      language={preferences.language}
                      copy={copy}
                    />
                  ))}
                  {visibleResolvedRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      label={pageCopy.statuses.resolved}
                      language={preferences.language}
                      copy={copy}
                    />
                  ))}
                  {visibleRequests.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-line bg-canvas p-5">
                      <p className="text-sm leading-7 text-muted">{pageCopy.noMatches}</p>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                  {pageCopy.householdsTitle}
                </h2>
                {portal.connectedHouseholds.map((household) => (
                  <article
                    key={household.slug}
                    className="rounded-[1.25rem] border border-line bg-canvas p-5"
                  >
                    <p className="text-lg font-semibold text-foreground">{household.name}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {pageCopy.connectedRequests(household.openRequests)}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {pageCopy.lastPlannedTouchpoint} {household.lastUpdateLabel}
                    </p>
                  </article>
                ))}
              </section>
            </div>
          </section>
        </PrivacyShield>
      ) : null}
    </div>
  );
}

function buildMemberHref(code, contact) {
  const params = new URLSearchParams();
  if (code) {
    params.set("code", code);
  }
  if (contact) {
    params.set("contact", contact);
  }
  const query = params.toString();
  return query ? `/member?${query}` : "/member";
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-paper p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function RequestCard({ request, label, language, copy }) {
  return (
    <article className="rounded-[1.35rem] border border-line bg-canvas p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
          <h3 className="mt-2 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {request.householdName}
          </h3>
          <p className="mt-2 text-sm leading-7 text-muted">
            {translateSupportNeed(request.need, language)}
          </p>
        </div>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {request.statusLabel}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-foreground">{request.statusDetail}</p>
      <p className="mt-3 text-sm leading-7 text-muted">{request.summary}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            {copy.requestStatusLookup.trackingCodeLabel}
          </p>
          <p className="mt-2 text-sm text-foreground">{request.trackingCode}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            {copy.requestStatusLookup.infoCards.responseWindow}
          </p>
          <p className="mt-2 text-sm text-foreground">{request.dueLabel}</p>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      />
    </label>
  );
}

function SelectField({ label, name, defaultValue, options }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
