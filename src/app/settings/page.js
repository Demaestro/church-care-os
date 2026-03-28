import { saveChurchSettings, sendTestEmail } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { supportedTimezones } from "@/lib/organization-defaults";
import { toDateTimeLocalValue } from "@/lib/care-format";
import { getOperationsSnapshot } from "@/lib/care-store";
import { getEmailDeliverySnapshot, listEmailOutbox } from "@/lib/email-service";
import { getChurchSettings, listMinistryTeams } from "@/lib/organization-store";

export const metadata = {
  title: "Settings",
  description:
    "Owner settings for church profile, member-facing intake copy, and billing posture.",
};

export default async function SettingsPage({ searchParams }) {
  await requireCurrentUser(["owner"]);
  const params = await searchParams;
  const [settings, ops, teams] = await Promise.all([
    Promise.resolve(getChurchSettings()),
    Promise.resolve(getOperationsSnapshot()),
    Promise.resolve(listMinistryTeams()),
  ]);
  const emailSnapshot = getEmailDeliverySnapshot();
  const outbox = listEmailOutbox(8);
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              Owner controls
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Tune the church-wide operating layer.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              These settings shape the member intake language, support contacts,
              billing snapshot, and operations posture across the app.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[28rem]">
            <MetricCard label="Plan" value={settings?.planName || "Not set"} />
            <MetricCard label="Team count" value={teams.length} />
            <MetricCard label="Email mode" value={settings?.emailDeliveryMode || "log-only"} />
            <MetricCard
              label="Sent emails"
              value={emailSnapshot.sentCount}
            />
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner notice={notice} error={error} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <form
          action={saveChurchSettings}
          className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
        >
          <SectionHeading
            eyebrow="Church profile"
            title="Member-facing and billing settings"
            body="Update the name, support contacts, intake confirmation text, and billing posture that appear across the product."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Church name" name="churchName" defaultValue={settings?.churchName} />
            <Field label="Campus name" name="campusName" defaultValue={settings?.campusName} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="Support email"
              name="supportEmail"
              type="email"
              defaultValue={settings?.supportEmail}
            />
            <Field
              label="Support phone"
              name="supportPhone"
              defaultValue={settings?.supportPhone}
            />
          </div>

          <div className="mt-4">
            <SelectField
              label="Primary timezone"
              name="timezone"
              defaultValue={settings?.timezone}
              options={supportedTimezones.map((timezone) => ({
                value: timezone,
                label: timezone,
              }))}
            />
          </div>

          <div className="mt-6 space-y-4">
            <TextAreaField
              label="Intake confirmation text"
              name="intakeConfirmationText"
              defaultValue={settings?.intakeConfirmationText}
            />
            <TextAreaField
              label="Emergency banner"
              name="emergencyBanner"
              defaultValue={settings?.emergencyBanner}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Plan name" name="planName" defaultValue={settings?.planName} />
            <Field
              label="Seat allowance"
              name="monthlySeatAllowance"
              defaultValue={settings?.monthlySeatAllowance}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="Billing contact email"
              name="billingContactEmail"
              type="email"
              defaultValue={settings?.billingContactEmail}
            />
            <Field
              label="Next renewal"
              name="nextRenewalDate"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(settings?.nextRenewalDate)}
            />
          </div>

          <div className="mt-6 space-y-4">
            <Field
              label="Notification channels"
              name="notificationChannels"
              defaultValue={settings?.notificationChannels?.join(", ")}
              placeholder="Phone follow-up, Text updates, In-person visit"
            />
            <TextAreaField
              label="Backup expectation"
              name="backupExpectation"
              defaultValue={settings?.backupExpectation}
            />
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <SectionHeading
              eyebrow="Email delivery"
              title="Provider-ready transactional email"
              body="Sender details live here. Provider secrets stay in environment variables, not in the database."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SelectField
                label="Delivery mode"
                name="emailDeliveryMode"
                defaultValue={settings?.emailDeliveryMode}
                options={[
                  {
                    value: "log-only",
                    label: "Log only (capture emails without sending)",
                  },
                  {
                    value: "resend",
                    label: "Resend API (live delivery)",
                  },
                ]}
              />
              <SelectField
                label="Provider"
                name="emailProvider"
                defaultValue={settings?.emailProvider}
                options={[
                  {
                    value: "resend",
                    label: "Resend",
                  },
                ]}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="From name"
                name="emailFromName"
                defaultValue={settings?.emailFromName}
                placeholder="Grace Community Church Care Team"
              />
              <Field
                label="From address"
                name="emailFromAddress"
                type="email"
                defaultValue={settings?.emailFromAddress}
                placeholder="care@yourchurch.org"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Reply-to address"
                name="emailReplyTo"
                type="email"
                defaultValue={settings?.emailReplyTo}
                placeholder="care@yourchurch.org"
              />
              <Field
                label="Subject prefix"
                name="emailSubjectPrefix"
                defaultValue={settings?.emailSubjectPrefix}
                placeholder="Grace Community Church"
              />
            </div>
          </div>

          <div className="mt-6">
            <SubmitButton
              idleLabel="Save settings"
              pendingLabel="Saving settings..."
              className="inline-flex items-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </form>

        <div className="space-y-6">
          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow="Operational snapshot"
              title="Current system posture"
              body="A quick owner view of the live data store and the operational load currently moving through the app."
            />

            <div className="mt-6 grid gap-4">
              <SnapshotItem label="Database path" value={ops.databasePath} compact />
              <SnapshotItem label="Households" value={ops.householdCount} />
              <SnapshotItem label="Open requests" value={ops.openRequestCount} />
              <SnapshotItem label="Audit events" value={ops.auditLogCount} />
            </div>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow="Email posture"
              title="Delivery readiness and outbox health"
              body="Log-only mode is safe for local rehearsal. Live delivery needs both a valid sender address and the Resend API key in the host environment."
            />

            <div className="mt-6 grid gap-4">
              <SnapshotItem label="Mode" value={emailSnapshot.mode} />
              <SnapshotItem label="Provider" value={emailSnapshot.provider} />
              <SnapshotItem
                label="API key configured"
                value={
                  emailSnapshot.mode === "log-only"
                    ? "Not needed in log-only mode"
                    : emailSnapshot.apiKeyConfigured
                      ? "Yes"
                      : "No"
                }
              />
              <SnapshotItem
                label="App base URL configured"
                value={emailSnapshot.appBaseUrlConfigured ? "Yes" : "No"}
              />
              <SnapshotItem label="Queued" value={emailSnapshot.queuedCount} />
              <SnapshotItem label="Logged only" value={emailSnapshot.loggedCount} />
              <SnapshotItem label="Sent" value={emailSnapshot.sentCount} />
              <SnapshotItem label="Failed" value={emailSnapshot.failedCount} />
            </div>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow="Live experience"
              title="How members experience the system"
              body="These are the values that shape the public request flow and ongoing communication expectations."
            />

            <div className="mt-6 space-y-4">
              <PreviewPanel
                title="Current confirmation text"
                body={settings?.intakeConfirmationText}
              />
              <PreviewPanel
                title="Current emergency banner"
                body={settings?.emergencyBanner}
              />
              <PreviewPanel
                title="Current contact channels"
                body={
                  (settings?.notificationChannels || []).join(", ") || "No channels listed"
                }
              />
            </div>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow="Delivery test"
              title="Queue a test email"
              body="This sends a branded test through the current mode. In log-only mode it still lands in the outbox so you can review the rendered message."
            />

            <form action={sendTestEmail} className="mt-6 space-y-4">
              <Field
                label="Recipient email"
                name="email"
                type="email"
                defaultValue={settings?.billingContactEmail || settings?.supportEmail}
                placeholder="you@example.com"
              />
              <TextAreaField
                label="Optional note"
                name="note"
                defaultValue="This is a test of the Church Care OS email delivery setup."
              />
              <SubmitButton
                idleLabel="Send test email"
                pendingLabel="Queueing test..."
                className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow="Outbox"
              title="Recent email activity"
              body="Every delivery attempt is recorded here, even when live sending is turned off."
            />

            <div className="mt-6 space-y-4">
              {outbox.length === 0 ? (
                <PreviewPanel
                  title="No outbox activity yet"
                  body="Workflow and test emails will appear here once the system starts queueing them."
                />
              ) : (
                outbox.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[1.25rem] border border-line bg-canvas p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {entry.subject}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-muted">
                          {entry.recipientEmail}
                        </p>
                      </div>
                      <OutboxStatusPill status={entry.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                      <p>Template: {entry.templateKey}</p>
                      <p>Provider: {entry.provider}</p>
                      <p>Created: {entry.createdLabel}</p>
                      <p>
                        Last attempt:{" "}
                        {entry.attemptedLabel !== "No time set"
                          ? entry.attemptedLabel
                          : "Not attempted yet"}
                      </p>
                    </div>
                    {entry.errorMessage ? (
                      <p className="mt-3 rounded-[1rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] px-4 py-3 text-sm text-clay">
                        {entry.errorMessage}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </article>
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
    <article className="rounded-[1.35rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-sm leading-7 text-foreground">{value}</p>
    </article>
  );
}

function Field({ label, name, defaultValue, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
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
        className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
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

function TextAreaField({ label, name, defaultValue }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
      />
    </label>
  );
}

function SnapshotItem({ label, value, compact = false }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-3 ${compact ? "break-all" : ""} text-sm leading-7 text-foreground`}>
        {value}
      </p>
    </article>
  );
}

function PreviewPanel({ title, body }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{title}</p>
      <p className="mt-3 text-sm leading-7 text-foreground">{body}</p>
    </article>
  );
}

function OutboxStatusPill({ status }) {
  const className =
    status === "sent"
      ? "border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss"
      : status === "failed"
        ? "border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay"
        : status === "logged"
          ? "border border-[rgba(179,138,69,0.18)] bg-[rgba(179,138,69,0.12)] text-[#7a6128]"
          : "border border-line bg-paper text-muted";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}>
      {status}
    </span>
  );
}
