"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Briefcase, ArrowRight } from "lucide-react";
import { ENABLED_TRACKS } from "@/lib/config/tracks";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useI18n } from "@/lib/i18n/context";

const TRACK_ICONS = {
  BookOpen,
  GraduationCap,
  Briefcase,
} as const;

export default function Home() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-full flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 pt-16 pb-12">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          <span className="text-brand-red">01</span> · {t("landing.kicker")}
        </p>
        <h1 className="font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">
          {t("landing.title")}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
          {t("landing.body")}
        </p>
        <Link
          href="/register"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft"
        >
          {t("landing.cta")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      </section>

      {/* Track overview */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-20">
        <SectionLabel>{t("landing.offer")}</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          {ENABLED_TRACKS.map((track, i) => {
            const Icon = TRACK_ICONS[track.icon];
            return (
              <div
                key={track.id}
                className="rounded-card border border-border-warm bg-paper p-6"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-brand-red" aria-hidden />
                  <span className="font-mono text-xs text-ink-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-4 font-serif text-xl font-medium text-ink">
                  {t(`tracks.${track.id}.title`)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {t(`tracks.${track.id}.blurb`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border-warm">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1 text-xs text-ink-muted">
            <span className="font-medium text-ink">
              {t("landing.footerCompany")}
            </span>
            <span>{t("landing.footerLocation")}</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <Link href="/status" className="text-ink-soft transition-colors hover:text-brand-red">
              {t("nav.checkStatus")}
            </Link>
            <Link href="/agent" className="text-ink-soft transition-colors hover:text-brand-red">
              {t("nav.agent")}
            </Link>
            <Link href="/admin/login" className="text-ink-soft transition-colors hover:text-brand-red">
              {t("nav.staff")}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
