"use client";

import Image from "next/image";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useI18n } from "@/lib/i18n/context";

// Shared header: PECSB logo + the "regist·er" wordmark (the site's name),
// with the language switcher. Used on the landing and the registration flow.
export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="border-b border-border-warm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
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
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-brand-red/5 px-3.5 py-1.5 text-xs font-medium text-brand-red transition-colors hover:border-brand-red/60 hover:bg-brand-red/10"
          >
            <Activity className="h-3.5 w-3.5" aria-hidden />
            {t("nav.checkStatus")}
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
