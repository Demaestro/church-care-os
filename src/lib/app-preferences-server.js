import "server-only";

import { cookies } from "next/headers";
import {
  DISPLAY_MODE_COOKIE,
  LANGUAGE_COOKIE,
  THEME_COOKIE,
  normalizeDisplayMode,
  normalizeLanguage,
  normalizeTheme,
} from "@/lib/app-preferences";

export async function getAppPreferences() {
  const cookieStore = await cookies();

  return {
    language: normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value),
    displayMode: normalizeDisplayMode(cookieStore.get(DISPLAY_MODE_COOKIE)?.value),
    theme: normalizeTheme(cookieStore.get(THEME_COOKIE)?.value),
  };
}
