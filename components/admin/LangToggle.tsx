"use client";

import { useRouter } from "next/navigation";
import { CONSOLE_LANG_COOKIE, type ConsoleLang } from "@/lib/admin/console-i18n-shared";

/** EN ⇄ العربية switch for the staff console (cookie + refresh). */
export function LangToggle({ lang }: { lang: ConsoleLang }) {
  const router = useRouter();
  const next = lang === "ar" ? "en" : "ar";
  return (
    <button
      onClick={() => {
        document.cookie = `${CONSOLE_LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
        router.refresh();
      }}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      title={next === "ar" ? "العربية" : "English"}
      className="rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50"
    >
      {next === "ar" ? "ع" : "EN"}
    </button>
  );
}
