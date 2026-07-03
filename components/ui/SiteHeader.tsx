"use client";

import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/context";

// Shared header: PECSB logo + the "regist·er" wordmark (the site's name),
// with the language switcher. Used on the landing and the registration flow.
export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="border-b border-border-warm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/pecsb-logo.png"
            alt={t("company")}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
            priority
          />
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/status"
            className="text-xs font-medium text-ink-soft transition-colors hover:text-brand-red"
          >
            {t("nav.checkStatus")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
