"use client";

import Link from "next/link";

/**
 * Premium "Access Restricted" screen.
 *
 * Props:
 *   module       - e.g. "Finance" (shown in the message)
 *   requiredRole - e.g. "Finance Lead" (what the user needs)
 *   managerHref  - where to redirect for "request permission" (default: /security)
 */
export default function AccessRestricted({
  module = "this section",
  requiredRole = "a departmental lead",
  managerHref = "/security",
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Gold lock icon */}
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)",
            border: "1px solid rgba(212,175,55,0.22)",
            boxShadow: "0 4px 24px rgba(212,175,55,0.10)",
          }}
        >
          <svg
            className="h-7 w-7 text-[var(--gold-text)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Text */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gold-text)] mb-2">
          Access Restricted
        </p>
        <h1 className="text-xl font-bold text-foreground mb-3">
          {module} is not available to your account
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          This section requires <span className="font-medium text-foreground">{requiredRole}</span>{" "}
          permissions. If you believe you should have access, request it from your Lead Pastor.
          Church privacy and departmental siloing protect sensitive data for everyone.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href={managerHref}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold-pure) 0%, var(--gold-text) 100%)",
              boxShadow: "0 2px 12px rgba(212,175,55,0.30)",
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Request permission from Lead Pastor
          </Link>
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * LockedField — renders a blurred placeholder for fields the current user
 * isn't allowed to see. Maintains layout without leaking data.
 *
 * Usage:
 *   <LockedField label="Total giving" />
 */
export function LockedField({ label = "Restricted field", width = "w-24" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${width}`}
      title={`${label} — restricted`}
    >
      <span className="h-3.5 rounded bg-muted/20 flex-1 blur-[3px] select-none" aria-hidden>
        ████████
      </span>
      <svg
        className="h-3 w-3 shrink-0 text-[var(--gold-text)] opacity-70"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-label={`${label} — restricted`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    </span>
  );
}
