import { saveChurchSettings, sendTestEmail, sendTestMessage } from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import { toDateTimeLocalValue } from "@/lib/care-format";
import { getOperationsSnapshot } from "@/lib/care-store";
import { getEmailDeliverySnapshot, listEmailOutbox } from "@/lib/email-service";
import { getMessageDeliverySnapshot, listMessageOutbox } from "@/lib/message-service";
import {
  getCopy,
  translateMessageChannel,
  translateOutboxStatus,
} from "@/lib/i18n";
import { supportedTimezones } from "@/lib/organization-defaults";
import { getChurchSettings, listMinistryTeams } from "@/lib/organization-store";

export const metadata = {
  title: "Settings",
  description:
    "Owner settings for church profile, member-facing intake copy, and billing posture.",
};

export default async function SettingsPage({ searchParams }) {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.settings;
  await requireCurrentUser(["owner"]);
  const params = await searchParams;
  const [settings, ops, teams] = await Promise.all([
    Promise.resolve(getChurchSettings()),
    Promise.resolve(getOperationsSnapshot()),
    Promise.resolve(listMinistryTeams()),
  ]);
  const emailSnapshot = getEmailDeliverySnapshot();
  const messageSnapshot = getMessageDeliverySnapshot();
  const outbox = listEmailOutbox(8);
  const messageOutbox = listMessageOutbox(8);
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";

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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[28rem]">
            <MetricCard label={pageCopy.metrics.plan} value={settings?.planName || copy.common.notSet} />
            <MetricCard label={pageCopy.metrics.teamCount} value={teams.length} />
            <MetricCard
              label={pageCopy.metrics.emailMode}
              value={settings?.emailDeliveryMode || "log-only"}
            />
            <MetricCard
              label={pageCopy.metrics.messageMode}
              value={settings?.messageDeliveryMode || "log-only"}
            />
            <MetricCard label={pageCopy.metrics.sentEmails} value={emailSnapshot.sentCount} />
            <MetricCard
              label={pageCopy.metrics.sentMessages}
              value={messageSnapshot.sentCount}
            />
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

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <form
          action={saveChurchSettings}
          className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
        >
          <SectionHeading
            eyebrow={pageCopy.sections.churchProfile.eyebrow}
            title={pageCopy.sections.churchProfile.title}
            body={pageCopy.sections.churchProfile.body}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label={pageCopy.fields.churchName}
              name="churchName"
              defaultValue={settings?.churchName}
            />
            <Field
              label={pageCopy.fields.campusName}
              name="campusName"
              defaultValue={settings?.campusName}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label={pageCopy.fields.supportEmail}
              name="supportEmail"
              type="email"
              defaultValue={settings?.supportEmail}
            />
            <Field
              label={pageCopy.fields.supportPhone}
              name="supportPhone"
              defaultValue={settings?.supportPhone}
            />
          </div>

          <div className="mt-4">
            <SelectField
              label={pageCopy.fields.primaryTimezone}
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
              label={pageCopy.fields.intakeConfirmationText}
              name="intakeConfirmationText"
              defaultValue={settings?.intakeConfirmationText}
            />
            <TextAreaField
              label={pageCopy.fields.emergencyBanner}
              name="emergencyBanner"
              defaultValue={settings?.emergencyBanner}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label={pageCopy.fields.planName}
              name="planName"
              defaultValue={settings?.planName}
            />
            <Field
              label={pageCopy.fields.seatAllowance}
              name="monthlySeatAllowance"
              defaultValue={settings?.monthlySeatAllowance}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label={pageCopy.fields.billingContactEmail}
              name="billingContactEmail"
              type="email"
              defaultValue={settings?.billingContactEmail}
            />
            <Field
              label={pageCopy.fields.nextRenewal}
              name="nextRenewalDate"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(settings?.nextRenewalDate)}
            />
          </div>

          <div className="mt-6 space-y-4">
            <Field
              label={pageCopy.fields.notificationChannels}
              name="notificationChannels"
              defaultValue={settings?.notificationChannels?.join(", ")}
              placeholder={pageCopy.placeholders.notificationChannels}
            />
            <TextAreaField
              label={pageCopy.fields.backupExpectation}
              name="backupExpectation"
              defaultValue={settings?.backupExpectation}
            />
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <SectionHeading
              eyebrow={pageCopy.sections.emailDelivery.eyebrow}
              title={pageCopy.sections.emailDelivery.title}
              body={pageCopy.sections.emailDelivery.body}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SelectField
                label={pageCopy.fields.deliveryMode}
                name="emailDeliveryMode"
                defaultValue={settings?.emailDeliveryMode}
                options={[
                  {
                    value: "log-only",
                    label: pageCopy.options.logOnly,
                  },
                  {
                    value: "resend",
                    label: pageCopy.options.resend,
                  },
                ]}
              />
              <SelectField
                label={pageCopy.fields.provider}
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
                label={pageCopy.fields.fromName}
                name="emailFromName"
                defaultValue={settings?.emailFromName}
                placeholder={pageCopy.placeholders.fromName}
              />
              <Field
                label={pageCopy.fields.fromAddress}
                name="emailFromAddress"
                type="email"
                defaultValue={settings?.emailFromAddress}
                placeholder={pageCopy.placeholders.fromAddress}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label={pageCopy.fields.replyToAddress}
                name="emailReplyTo"
                type="email"
                defaultValue={settings?.emailReplyTo}
                placeholder={pageCopy.placeholders.replyToAddress}
              />
              <Field
                label={pageCopy.fields.subjectPrefix}
                name="emailSubjectPrefix"
                defaultValue={settings?.emailSubjectPrefix}
                placeholder={pageCopy.placeholders.subjectPrefix}
              />
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <SectionHeading
              eyebrow={pageCopy.sections.messageDelivery.eyebrow}
              title={pageCopy.sections.messageDelivery.title}
              body={pageCopy.sections.messageDelivery.body}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SelectField
                label={pageCopy.fields.messageDeliveryMode}
                name="messageDeliveryMode"
                defaultValue={settings?.messageDeliveryMode}
                options={[
                  {
                    value: "log-only",
                    label: pageCopy.options.logOnly,
                  },
                  {
                    value: "twilio",
                    label: pageCopy.options.twilio,
                  },
                ]}
              />
              <SelectField
                label={pageCopy.fields.messageProvider}
                name="messageProvider"
                defaultValue={settings?.messageProvider}
                options={[
                  {
                    value: "twilio",
                    label: "Twilio",
                  },
                ]}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label={pageCopy.fields.smsFromNumber}
                name="smsFromNumber"
                type="tel"
                defaultValue={settings?.smsFromNumber}
                placeholder={pageCopy.placeholders.smsFromNumber}
              />
              <Field
                label={pageCopy.fields.whatsappFromNumber}
                name="whatsappFromNumber"
                type="tel"
                defaultValue={settings?.whatsappFromNumber}
                placeholder={pageCopy.placeholders.whatsappFromNumber}
              />
            </div>
          </div>

          <div className="mt-6">
            <SubmitButton
              idleLabel={pageCopy.buttons.saveSettings}
              pendingLabel={pageCopy.buttons.savingSettings}
              className="inline-flex items-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </form>

        <div className="space-y-6">
          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.operationalSnapshot.eyebrow}
              title={pageCopy.sections.operationalSnapshot.title}
              body={pageCopy.sections.operationalSnapshot.body}
            />

            <div className="mt-6 grid gap-4">
              <SnapshotItem label={pageCopy.snapshot.databasePath} value={ops.databasePath} compact />
              <SnapshotItem label={pageCopy.snapshot.households} value={ops.householdCount} />
              <SnapshotItem label={pageCopy.snapshot.openRequests} value={ops.openRequestCount} />
              <SnapshotItem label={pageCopy.snapshot.auditEvents} value={ops.auditLogCount} />
            </div>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.emailPosture.eyebrow}
              title={pageCopy.sections.emailPosture.title}
              body={pageCopy.sections.emailPosture.body}
            />

            <div className="mt-6 grid gap-4">
              <SnapshotItem label={pageCopy.snapshot.mode} value={emailSnapshot.mode} />
              <SnapshotItem label={pageCopy.snapshot.provider} value={emailSnapshot.provider} />
              <SnapshotItem
                label={pageCopy.snapshot.apiKeyConfigured}
                value={
                  emailSnapshot.mode === "log-only"
                    ? copy.common.notNeededInLogOnlyMode
                    : emailSnapshot.apiKeyConfigured
                      ? copy.common.yes
                      : copy.common.no
                }
              />
              <SnapshotItem
                label={pageCopy.snapshot.appBaseUrlConfigured}
                value={emailSnapshot.appBaseUrlConfigured ? copy.common.yes : copy.common.no}
              />
              <SnapshotItem label={pageCopy.snapshot.queued} value={emailSnapshot.queuedCount} />
              <SnapshotItem label={pageCopy.snapshot.loggedOnly} value={emailSnapshot.loggedCount} />
              <SnapshotItem label={pageCopy.snapshot.sent} value={emailSnapshot.sentCount} />
              <SnapshotItem label={pageCopy.snapshot.failed} value={emailSnapshot.failedCount} />
            </div>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.messagePosture.eyebrow}
              title={pageCopy.sections.messagePosture.title}
              body={pageCopy.sections.messagePosture.body}
            />

            <div className="mt-6 grid gap-4">
              <SnapshotItem label={pageCopy.snapshot.mode} value={messageSnapshot.mode} />
              <SnapshotItem label={pageCopy.snapshot.provider} value={messageSnapshot.provider} />
              <SnapshotItem
                label={pageCopy.snapshot.providerConfigured}
                value={
                  messageSnapshot.mode === "log-only"
                    ? copy.common.notNeededInLogOnlyMode
                    : messageSnapshot.providerConfigured
                      ? copy.common.yes
                      : copy.common.no
                }
              />
              <SnapshotItem
                label={pageCopy.snapshot.appBaseUrlConfigured}
                value={messageSnapshot.appBaseUrlConfigured ? copy.common.yes : copy.common.no}
              />
              <SnapshotItem label={pageCopy.snapshot.queued} value={messageSnapshot.queuedCount} />
              <SnapshotItem
                label={pageCopy.snapshot.loggedOnly}
                value={messageSnapshot.loggedCount}
              />
              <SnapshotItem label={pageCopy.snapshot.sent} value={messageSnapshot.sentCount} />
              <SnapshotItem label={pageCopy.snapshot.failed} value={messageSnapshot.failedCount} />
            </div>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.liveExperience.eyebrow}
              title={pageCopy.sections.liveExperience.title}
              body={pageCopy.sections.liveExperience.body}
            />

            <div className="mt-6 space-y-4">
              <PreviewPanel
                title={pageCopy.snapshot.currentConfirmationText}
                body={settings?.intakeConfirmationText}
              />
              <PreviewPanel
                title={pageCopy.snapshot.currentEmergencyBanner}
                body={settings?.emergencyBanner}
              />
              <PreviewPanel
                title={pageCopy.snapshot.currentContactChannels}
                body={
                  (settings?.notificationChannels || []).join(", ") || copy.common.noChannelsListed
                }
              />
            </div>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.deliveryTest.eyebrow}
              title={pageCopy.sections.deliveryTest.title}
              body={pageCopy.sections.deliveryTest.body}
            />

            <form action={sendTestEmail} className="mt-6 space-y-4">
              <Field
                label={pageCopy.fields.recipientEmail}
                name="email"
                type="email"
                defaultValue={settings?.billingContactEmail || settings?.supportEmail}
                placeholder={pageCopy.placeholders.recipientEmail}
              />
              <TextAreaField
                label={pageCopy.fields.optionalNote}
                name="note"
                defaultValue={pageCopy.placeholders.testNote}
              />
              <SubmitButton
                idleLabel={pageCopy.buttons.sendTestEmail}
                pendingLabel={pageCopy.buttons.queueingTest}
                className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.messageDeliveryTest.eyebrow}
              title={pageCopy.sections.messageDeliveryTest.title}
              body={pageCopy.sections.messageDeliveryTest.body}
            />

            <form action={sendTestMessage} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={pageCopy.fields.recipientPhone}
                  name="phone"
                  type="tel"
                  defaultValue={settings?.supportPhone}
                  placeholder={pageCopy.placeholders.recipientPhone}
                />
                <SelectField
                  label={pageCopy.fields.messageChannel}
                  name="channel"
                  defaultValue="sms"
                  options={[
                    { value: "sms", label: pageCopy.options.sms },
                    { value: "whatsapp", label: pageCopy.options.whatsapp },
                  ]}
                />
              </div>
              <TextAreaField
                label={pageCopy.fields.optionalNote}
                name="note"
                defaultValue={pageCopy.placeholders.testMessageNote}
              />
              <SubmitButton
                idleLabel={pageCopy.buttons.sendTestMessage}
                pendingLabel={pageCopy.buttons.queueingMessage}
                className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          </article>

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.outbox.eyebrow}
              title={pageCopy.sections.outbox.title}
              body={pageCopy.sections.outbox.body}
            />

            <div className="mt-6 space-y-4">
              {outbox.length === 0 ? (
                <PreviewPanel
                  title={pageCopy.snapshot.noOutboxActivity}
                  body={pageCopy.snapshot.noOutboxActivityBody}
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
                      <OutboxStatusPill status={entry.status} language={preferences.language} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                      <p>{copy.common.labels.template}: {entry.templateKey}</p>
                      <p>{copy.common.labels.provider}: {entry.provider}</p>
                      <p>{copy.common.labels.created}: {entry.createdLabel}</p>
                      <p>
                        {copy.common.labels.lastAttempt}:{" "}
                        {entry.attemptedLabel !== "No time set"
                          ? entry.attemptedLabel
                          : copy.common.notAttemptedYet}
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

          <article className="surface-card rounded-[1.8rem] border border-line bg-paper p-6">
            <SectionHeading
              eyebrow={pageCopy.sections.messageOutbox.eyebrow}
              title={pageCopy.sections.messageOutbox.title}
              body={pageCopy.sections.messageOutbox.body}
            />

            <div className="mt-6 space-y-4">
              {messageOutbox.length === 0 ? (
                <PreviewPanel
                  title={pageCopy.snapshot.noMessageOutboxActivity}
                  body={pageCopy.snapshot.noMessageOutboxActivityBody}
                />
              ) : (
                messageOutbox.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[1.25rem] border border-line bg-canvas p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <MessageChannelPill channel={entry.channel} language={preferences.language} />
                          <p className="text-sm font-semibold text-foreground">
                            {entry.recipientPhone}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {entry.body}
                        </p>
                      </div>
                      <OutboxStatusPill status={entry.status} language={preferences.language} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                      <p>{copy.common.labels.template}: {entry.templateKey}</p>
                      <p>{copy.common.labels.provider}: {entry.provider}</p>
                      <p>{copy.common.labels.created}: {entry.createdLabel}</p>
                      <p>
                        {copy.common.labels.lastAttempt}:{" "}
                        {entry.attemptedLabel !== "No time set"
                          ? entry.attemptedLabel
                          : copy.common.notAttemptedYet}
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

function OutboxStatusPill({ status, language }) {
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
      {translateOutboxStatus(status, language)}
    </span>
  );
}

function MessageChannelPill({ channel, language }) {
  const className =
    channel === "whatsapp"
      ? "border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss"
      : "border border-[rgba(53,111,190,0.16)] bg-[rgba(53,111,190,0.08)] text-[#356fbe]";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}>
      {translateMessageChannel(channel, language)}
    </span>
  );
}
