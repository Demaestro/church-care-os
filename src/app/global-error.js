"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({ error, unstable_retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--surface)] text-foreground">
        <title>Something went wrong | Church Care OS</title>
        <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16 lg:px-10">
          <section className="w-full rounded-[2rem] border border-line bg-paper px-8 py-12 shadow-[0_32px_100px_rgba(15,23,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              Church Care OS
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              We hit a problem loading this workspace.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted sm:text-lg">
              The app kept your current page safe, but this section needs to reload before
              it can continue.
            </p>

            {error?.digest ? (
              <p className="mt-4 text-sm text-muted">Reference: {error.digest}</p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="inline-flex items-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Return home
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Open sign-in
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
