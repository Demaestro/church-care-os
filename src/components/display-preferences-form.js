'use client';

import { usePathname, useSearchParams } from "next/navigation";
import { saveDisplayPreferences } from "@/app/actions";

export function DisplayPreferencesForm({
  currentLanguage,
  currentDisplayMode,
  languageOptions,
  displayModeOptions,
  copy,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTo = `${pathname}${
    searchParams?.toString() ? `?${searchParams.toString()}` : ""
  }`;

  return (
    <form
      action={saveDisplayPreferences}
      className="flex flex-col gap-3 rounded-[1.25rem] border border-line bg-paper px-4 py-4 md:flex-row md:items-end md:justify-between"
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid flex-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold text-foreground">
            {copy.layout.languageLabel}
          </span>
          <select
            name="language"
            defaultValue={currentLanguage}
            className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-base text-foreground outline-none transition focus:border-moss"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-foreground">
            {copy.layout.textSizeLabel}
          </span>
          <select
            name="displayMode"
            defaultValue={currentDisplayMode}
            className="mt-2 w-full rounded-[1rem] border border-line bg-canvas px-4 py-3 text-base text-foreground outline-none transition focus:border-moss"
          >
            {displayModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-base font-semibold text-paper transition hover:bg-[#2b251f]"
      >
        {copy.layout.applyPreferences}
      </button>
    </form>
  );
}
