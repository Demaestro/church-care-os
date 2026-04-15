import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-6 py-16 lg:px-10">
      <div className="w-full rounded-[2rem] border border-line bg-paper px-8 py-12 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
          Church OS
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          This page could not be found.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          The link may be old, incomplete, or no longer available in this workspace.
          Use the navigation or return home to continue.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Return home
          </Link>
          <Link
            href="/members"
            className="inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Members
          </Link>
          <Link
            href="/finance"
            className="inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Finance
          </Link>
          <Link
            href="/attendance"
            className="inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Attendance
          </Link>
        </div>
      </div>
    </section>
  );
}

