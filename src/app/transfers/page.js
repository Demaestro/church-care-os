import Link from "next/link";
import { cookies } from "next/headers";
import { completeMemberTransfer } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/organization-store";
import { listMemberTransfers } from "@/lib/member-transfer-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Transfers",
  description:
    "Review and complete safe member transfers between branches in the same church organization.",
};

export default async function TransfersPage({ searchParams }) {
  const user = await requireCurrentUser(["overseer", "owner"]);
  const preferredBranchId = (await cookies()).get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const workspace = getWorkspaceContext(user, preferredBranchId);
  const params = await searchParams;
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const transfers = listMemberTransfers(user, preferredBranchId);
  const requested = transfers.filter((item) => item.status === "requested");
  const completed = transfers.filter((item) => item.status === "completed");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Movement between branches
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Member transfer centre
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Move households safely between branches while keeping the care timeline, notes, and attachments together. Branch pastors stay inside their own branch scope; HQ confirms the transfer here.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[28rem]">
            <MetricCard label="Requested" value={requested.length} />
            <MetricCard label="Completed" value={completed.length} />
            <MetricCard label="Visible total" value={transfers.length} />
          </div>
        </div>

        <div className="mt-6 rounded-[1.2rem] border border-line bg-canvas px-4 py-3 text-sm text-muted">
          Reviewing as <span className="font-semibold text-foreground">{workspace.organization.name}</span>
          {workspace.activeBranch ? ` / ${workspace.activeBranch.name}` : " / all visible branches"}.
        </div>

        <div className="mt-6">
          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle="Saved"
            errorTitle="Could not continue"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Needs review"
            title="Open transfer requests"
            body="Requested transfers stay here until an HQ role approves and completes the move."
          />
          {requested.length > 0 ? (
            requested.map((transfer) => (
              <TransferCard key={transfer.id} transfer={transfer} actionable />
            ))
          ) : (
            <EmptyCard body="No transfer requests are waiting right now." />
          )}
        </div>

        <div className="space-y-4">
          <SectionHeading
            eyebrow="Recent moves"
            title="Completed transfers"
            body="Completed transfers remain visible for oversight, audit review, and follow-up coaching."
          />
          {completed.slice(0, 8).length > 0 ? (
            completed.slice(0, 8).map((transfer) => (
              <TransferCard key={transfer.id} transfer={transfer} />
            ))
          ) : (
            <EmptyCard body="Completed branch transfers will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function TransferCard({ transfer, actionable = false }) {
  return (
    <article className="surface-card rounded-[1.6rem] border border-line bg-paper p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {transfer.status}
          </p>
          <h3 className="mt-3 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {transfer.householdSlug}
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            {transfer.fromBranchName} → {transfer.toBranchName}
          </p>
        </div>

        <div className="text-sm text-muted">
          <p>{transfer.requestedLabel}</p>
          {transfer.completedLabel !== "No time set" ? (
            <p className="mt-1">{transfer.completedLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <DetailItem
          label="Requested by"
          value={`${transfer.requestedByName} · ${transfer.requestedByRole}`}
        />
        <DetailItem label="Reason" value={transfer.reason} />
      </div>

      {transfer.note ? (
        <div className="mt-4 rounded-[1.2rem] border border-line bg-canvas p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Transfer note</p>
          <p className="mt-3 text-sm leading-7 text-foreground">{transfer.note}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/households/${transfer.householdSlug}`}
          className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
        >
          Open household
        </Link>
        {actionable ? (
          <form action={completeMemberTransfer.bind(null, transfer.id, transfer.householdSlug)}>
            <SubmitButton
              idleLabel="Complete transfer"
              pendingLabel="Completing transfer..."
              className="inline-flex items-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        ) : null}
      </div>
    </article>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-7 text-foreground">{value}</p>
    </div>
  );
}

function EmptyCard({ body }) {
  return (
    <article className="surface-card rounded-[1.6rem] border border-line bg-paper p-6">
      <p className="text-sm leading-7 text-muted">{body}</p>
    </article>
  );
}
