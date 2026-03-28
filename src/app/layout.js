import Link from "next/link";
import "./globals.css";
import { logout } from "@/app/actions";
import { getCurrentUser, getRoleLabel } from "@/lib/auth";
import { getUnreadNotificationCountForUser } from "@/lib/notifications-store";

export const metadata = {
  title: {
    default: "Church Care OS",
    template: "%s | Church Care OS",
  },
  description:
    "Care coordination for pastors, deacons, and volunteers with one shared rhythm for requests, assignments, and follow-up.",
  applicationName: "Church Care OS",
  openGraph: {
    title: "Church Care OS",
    description:
      "A warm operating system for care requests, volunteer coordination, and pastoral follow-up.",
    type: "website",
  },
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  const unreadNotificationCount = user
    ? getUnreadNotificationCountForUser(user)
    : 0;
  const navLinks = buildNavLinks(user, unreadNotificationCount);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full text-foreground">
        <div className="relative isolate min-h-screen overflow-x-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[-8rem] -z-10 h-[28rem] blur-3xl"
          >
            <div className="mx-auto h-full max-w-6xl rounded-full bg-[radial-gradient(circle_at_center,rgba(179,138,69,0.18),rgba(73,106,77,0.10)_42%,transparent_72%)]" />
          </div>

          <header className="sticky top-0 z-40 border-b border-line bg-[rgba(255,250,242,0.82)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-[#efe6d7] text-sm font-semibold tracking-[0.2em] text-moss">
                  CC
                </span>
                <span>
                  <span className="block text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                    Church Care
                  </span>
                  <span className="block text-sm font-semibold text-foreground">
                    Operations board
                  </span>
                </span>
              </Link>

              <nav className="hidden items-center gap-2 rounded-full border border-line bg-paper p-1 md:flex">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-canvas hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex">
                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="hidden rounded-full border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.10)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-moss sm:inline-flex">
                      {getRoleLabel(user.role)}
                    </span>
                    <form action={logout}>
                      <button
                        type="submit"
                        className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-foreground transition hover:bg-canvas"
                      >
                        <span className="hidden sm:inline">{user.name} / </span>
                        Sign out
                      </button>
                    </form>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.10)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[rgba(73,106,77,0.14)]"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>

            <div className="border-t border-line px-4 py-3 md:hidden">
              <nav className="flex gap-2 overflow-x-auto pb-1">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shrink-0 rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-muted transition hover:bg-canvas hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main>{children}</main>

          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted lg:flex-row lg:items-center lg:justify-between lg:px-10">
              <p>Built for care teams who want clarity, warmth, and fewer dropped handoffs.</p>
              <p>Pastors, deacons, and volunteers stay in one visible rhythm.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

function buildNavLinks(user, unreadNotificationCount = 0) {
  const links = [
    {
      href: "/requests/new",
      label: "Request Care",
    },
    {
      href: "/requests/status",
      label: "Track Request",
    },
    {
      href: "/permissions",
      label: "Permissions",
    },
  ];

  if (!user) {
    links.push({
      href: "/login",
      label: "Sign In",
    });
    return links;
  }

  if (["pastor", "owner"].includes(user.role)) {
    links.unshift({
      href: "/",
      label: "Dashboard",
    });
    links.push({
      href: "/teams",
      label: "Teams",
    });
    links.push({
      href: "/admin/users",
      label: "People",
    });
    links.push({
      href: "/reports",
      label: "Reports",
    });
  }

  if (["leader", "pastor", "owner"].includes(user.role)) {
    links.push({
      href: "/leader",
      label: "Leader View",
    });
    links.push({
      href: "/households",
      label: "Households",
    });
  }

  if (["volunteer", "leader", "pastor", "owner"].includes(user.role)) {
    links.push({
      href: "/notifications",
      label:
        unreadNotificationCount > 0
          ? `Notifications (${unreadNotificationCount})`
          : "Notifications",
    });
    links.push({
      href: "/volunteer",
      label: "Volunteer View",
    });
  }

  if (["pastor", "owner"].includes(user.role)) {
    links.push({
      href: "/audit",
      label: "Audit",
    });
  }

  if (user.role === "owner") {
    links.push({
      href: "/settings",
      label: "Settings",
    });
  }

  return links;
}
