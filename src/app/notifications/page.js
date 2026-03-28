import Link from "next/link";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getAppPreferences } from "@/lib/app-preferences-server";
import {
  getCopy,
  translateNotificationKind,
  translateRoleLabel,
} from "@/lib/i18n";
import {
  getUnreadNotificationCountForUser,
  listNotificationsForUser,
} from "@/lib/notifications-store";

const toneClasses = {
  care: "border-[rgba(73,106,77,0.18)] bg-[rgba(73,106,77,0.08)] text-moss",
  task: "border-[rgba(179,138,69,0.18)] bg-[rgba(179,138,69,0.12)] text-[#7a6128]",
  warning: "border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay",
  quiet: "border-line bg-canvas text-muted",
};

export const metadata = {
  title: "Notifications",
  description:
    "A private inbox for care routing updates, volunteer handoffs, and account changes.",
};

export default async function NotificationsPage() {
  const preferences = await getAppPreferences();
  const copy = getCopy(preferences.language);
  const pageCopy = copy.notifications;
  const user = await requireCurrentUser(["volunteer", "leader", "pastor", "owner"]);
  const notifications = listNotificationsForUser(user);
  const unreadCount = getUnreadNotificationCountForUser(user);
  const unreadNotifications = notifications.filter((item) => !item.read);
  const readNotifications = notifications.filter((item) => item.read);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              {pageCopy.kicker}
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              {pageCopy.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              {pageCopy.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[26rem]">
            <MetricCard label={pageCopy.metrics.unread} value={unreadCount} />
            <MetricCard label={pageCopy.metrics.total} value={notifications.length} />
            <MetricCard
              label={pageCopy.metrics.role}
              value={translateRoleLabel(user.role, preferences.language)}
            />
          </div>
        </div>

        {unreadCount > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={markAllNotificationsRead}>
              <SubmitButton
                idleLabel={pageCopy.markAllRead}
                pendingLabel={pageCopy.updating}
                className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
            <Link
              href={getPrimaryReturnPath(user.role)}
              className="inline-flex items-center rounded-[1rem] border border-line bg-canvas px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1]"
            >
              {pageCopy.backToWorkspace}
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <InboxPanel
          title={pageCopy.panels.unreadTitle}
          eyebrow={pageCopy.panels.unreadEyebrow(unreadNotifications.length)}
          emptyMessage={pageCopy.panels.unreadEmpty}
          items={unreadNotifications}
          variant="unread"
          copy={copy}
          language={preferences.language}
        />

        <InboxPanel
          title={pageCopy.panels.readTitle}
          eyebrow={pageCopy.panels.readEyebrow(readNotifications.length)}
          emptyMessage={pageCopy.panels.readEmpty}
          items={readNotifications}
          variant="read"
          copy={copy}
          language={preferences.language}
        />
      </section>
    </div>
  );
}

function InboxPanel({ title, eyebrow, emptyMessage, items, variant, copy, language }) {
  return (
    <section className="surface-card rounded-[1.75rem] border border-line bg-paper p-6">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h2>

      {items.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-line bg-canvas p-5">
          <p className="text-sm leading-7 text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              variant={variant}
              copy={copy}
              language={language}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationCard({ notification, variant, copy, language }) {
  const hasHref = Boolean(notification.href);
  const toneClass = resolveToneClass(notification.kind);

  return (
    <article
      className={`rounded-[1.5rem] border p-5 ${
        variant === "unread"
          ? "border-line bg-canvas shadow-[0_18px_48px_rgba(32,22,11,0.06)]"
          : "border-line bg-[#fbf7ef]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] ${toneClass}`}
          >
            {translateNotificationKind(notification.kind, language)}
          </span>
          <h3 className="mt-3 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {notification.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted">{notification.body}</p>
        </div>
        <div className="text-sm text-muted sm:text-right">
          <p>{notification.createdLabel}</p>
          {notification.read && notification.readLabel !== "No time set" ? (
            <p className="mt-1">
              {copy.common.labels.read} {notification.readLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {!notification.read ? (
          <form
            action={markNotificationRead.bind(
              null,
              notification.id,
              hasHref ? notification.href : "/notifications"
            )}
          >
            <SubmitButton
              idleLabel={hasHref ? copy.notifications.open : copy.notifications.markAsRead}
              pendingLabel={hasHref ? copy.notifications.opening : copy.notifications.saving}
              className="inline-flex items-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        ) : hasHref ? (
          <Link
            href={notification.href}
            className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
          >
            {copy.notifications.open}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-[1.35rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
    </article>
  );
}

function resolveToneClass(kind) {
  if (kind === "escalation") {
    return toneClasses.warning;
  }

  if (kind === "task" || kind === "task-note") {
    return toneClasses.task;
  }

  if (kind === "care-request" || kind === "account") {
    return toneClasses.care;
  }

  return toneClasses.quiet;
}

function getPrimaryReturnPath(role) {
  switch (role) {
    case "owner":
    case "pastor":
      return "/";
    case "leader":
      return "/leader";
    default:
      return "/volunteer";
  }
}
