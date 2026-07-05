import "server-only";
import { cookies } from "next/headers";
import { CONSOLE_LANG_COOKIE, type ConsoleLang } from "./console-i18n-shared";

export * from "./console-i18n-shared";

/** The signed-in staff member's console language (cookie-backed, default en). */
export async function getConsoleLang(): Promise<ConsoleLang> {
  const store = await cookies();
  return store.get(CONSOLE_LANG_COOKIE)?.value === "ar" ? "ar" : "en";
}
