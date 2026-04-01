'use client';

import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { saveDisplayPreferences } from "@/app/actions";

/**
 * Compact auto-submit language dropdown for the nav bar.
 * Submits instantly on change — no separate button needed.
 */
export function LanguageSelect({
  currentLanguage,
  currentDisplayMode,
  currentTheme,
  languageOptions = [],
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTo = `${pathname}${
    searchParams?.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const formRef = useRef(null);

  return (
    <form ref={formRef} action={saveDisplayPreferences} className="contents">
      <input type="hidden" name="redirectTo"   value={redirectTo} />
      <input type="hidden" name="displayMode"  value={currentDisplayMode} />
      <input type="hidden" name="theme"        value={currentTheme} />

      <div className="relative inline-flex items-center">
        {/* Globe icon */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          style={{ fontSize: "0.9rem" }}
        >
          🌐
        </span>

        <select
          name="language"
          defaultValue={currentLanguage}
          onChange={() => formRef.current?.requestSubmit()}
          className="
            h-10 cursor-pointer appearance-none
            rounded-full border border-line
            bg-[var(--header-pill-bg)]
            pl-8 pr-7 text-sm font-medium text-foreground
            outline-none
            transition hover:border-[var(--soft-accent-border)] hover:bg-paper
            focus:border-[var(--moss)] focus:shadow-[0_0_0_3px_var(--soft-fill)]
          "
          aria-label="Select language"
        >
          {languageOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
          style={{ fontSize: "0.65rem" }}
        >
          ▾
        </span>
      </div>
    </form>
  );
}
