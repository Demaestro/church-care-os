import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-6 py-16 lg:px-10">
      <div className="w-full rounded-[2rem] border border-line bg-paper px-8 py-12 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
          Church Care OS
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          This page could not be found.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          The link may be old, incomplete, or no longer available in this church workspace.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Return home
          </Link>
          <Link
            href="/requests/new"
            className="inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Request care
          </Link>
          <Link
            href="/member"
            className="inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Open member tools
          </Link>
        </div>
      </div>
    </section>
  );
}

