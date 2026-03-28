import Link from "next/link";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
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
              Private inbox
            </p>
            <h1 className="mt-4 text-5xl leading-none tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-6xl">
              Notifications that keep care moving without widening access.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              This feed reflects only what belongs to your role and your account.
              New requests, routed tasks, password changes, and pastoral escalations
              arrive here with just enough context to act safely.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[26rem]">
            <MetricCard label="Unread" value={unreadCount} />
            <MetricCard label="Total" value={notifications.length} />
            <MetricCard label="Role" value={formatRoleLabel(user.role)} />
          </div>
        </div>

        {unreadCount > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={markAllNotificationsRead}>
              <SubmitButton
                idleLabel="Mark all as read"
                pendingLabel="Updating..."
                className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
            <Link
              href={getPrimaryReturnPath(user.role)}
              className="inline-flex items-center rounded-[1rem] border border-line bg-canvas px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#ece1d1]"
            >
              Back to workspace
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <InboxPanel
          title="Needs your attention"
          eyebrow={`Unread (${unreadNotifications.length})`}
          emptyMessage="You are all caught up. New care events will appear here as they happen."
          items={unreadNotifications}
          variant="unread"
        />

        <InboxPanel
          title="Recent activity"
          eyebrow={`Read (${readNotifications.length})`}
          emptyMessage="Read items will settle here after you open or mark them."
          items={readNotifications}
          variant="read"
        />
      </section>
    </div>
  );
}

function InboxPanel({ title, eyebrow, emptyMessage, items, variant }) {
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
            />
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationCard({ notification, variant }) {
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
            {formatKind(notification.kind)}
          </span>
          <h3 className="mt-3 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {notification.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted">{notification.body}</p>
        </div>
        <div className="text-sm text-muted sm:text-right">
          <p>{notification.createdLabel}</p>
          {notification.read && notification.readLabel !== "No time set" ? (
            <p className="mt-1">Read {notification.readLabel}</p>
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
              idleLabel={hasHref ? "Open" : "Mark as read"}
              pendingLabel={hasHref ? "Opening..." : "Saving..."}
              className="inline-flex items-center rounded-[1rem] bg-foreground px-4 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        ) : hasHref ? (
          <Link
            href={notification.href}
            className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
          >
            Open
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

function formatKind(kind) {
  return String(kind || "update").replaceAll("-", " ");
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

function formatRoleLabel(role) {
  const value = String(role || "");
  return value ? value[0].toUpperCase() + value.slice(1) : "User";
}
