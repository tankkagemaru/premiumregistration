"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Briefcase,
  ArrowRight,
  Activity,
  Users,
  Lock,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
} from "lucide-react";
import { ENABLED_TRACKS } from "@/lib/config/tracks";
import { COMPANY, TALK_TO_TEAM_URL } from "@/lib/config/site";
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
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft"
          >
            {t("landing.cta")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
          {TALK_TO_TEAM_URL ? (
            <a
              href={TALK_TO_TEAM_URL}
              className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-paper px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
            >
              <MessageCircle className="h-4 w-4 text-brand-red" aria-hidden />
              {t("landing.talkCta")}
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-border-warm bg-paper px-6 py-3 text-sm font-medium text-ink-muted opacity-70"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t("landing.talkCta")}
            </button>
          )}
        </div>

        {/* Hero illustration */}
        <div className="mt-10 overflow-hidden rounded-card border border-border-warm">
          <Image
            src="/hero.png"
            alt="A Premium consultant guiding students toward English, university, and corporate training pathways"
            width={1672}
            height={941}
            priority
            className="h-auto w-full"
          />
        </div>
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
        <div className="mx-auto grid max-w-3xl gap-8 px-6 py-10 sm:grid-cols-[1.4fr_1fr]">
          {/* Company details */}
          <div className="flex flex-col gap-2 text-xs text-ink-muted">
            <span className="font-serif text-base font-medium text-ink">
              {COMPANY.legalName}
            </span>
            <span className="max-w-sm leading-relaxed">
              {t("landing.footerTagline")}
            </span>
            <div className="mt-2 flex flex-col gap-1.5">
              {COMPANY.address && (
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-red/70" aria-hidden />
                  {COMPANY.address}
                </span>
              )}
              {COMPANY.phone && (
                <a
                  href={`tel:${COMPANY.phone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-2 transition-colors hover:text-brand-red"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-brand-red/70" aria-hidden />
                  {COMPANY.phone}
                </a>
              )}
              {COMPANY.phoneAlt && (
                <a
                  href={`tel:${COMPANY.phoneAlt.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-2 transition-colors hover:text-brand-red"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-brand-red/70 opacity-0" aria-hidden />
                  {COMPANY.phoneAlt}
                </a>
              )}
              {COMPANY.email && (
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="flex items-center gap-2 transition-colors hover:text-brand-red"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-brand-red/70" aria-hidden />
                  {COMPANY.email}
                </a>
              )}
              <a
                href={COMPANY.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-brand-red"
              >
                <Globe className="h-3.5 w-3.5 shrink-0 text-brand-red/70" aria-hidden />
                {COMPANY.website}
              </a>
              {COMPANY.regNo && (
                <span className="mt-1 text-[11px] text-ink-muted/80">
                  {t("landing.footerRegNo")} {COMPANY.regNo}
                </span>
              )}
            </div>
          </div>

          {/* Portals */}
          <nav className="flex flex-col gap-3 text-xs sm:items-end">
            <Link
              href="/status"
              className="inline-flex items-center gap-2 font-medium text-brand-red transition-colors hover:text-brand-red-soft"
            >
              <Activity className="h-4 w-4" aria-hidden />
              {t("nav.checkStatus")}
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-brand-red"
            >
              <Users className="h-4 w-4" aria-hidden />
              {t("nav.agent")}
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-brand-red"
            >
              <Lock className="h-4 w-4" aria-hidden />
              {t("nav.staff")}
            </Link>
          </nav>
        </div>
        <div className="border-t border-border-warm/60">
          <div className="mx-auto max-w-3xl px-6 py-4 text-[11px] text-ink-muted">
            © {new Date().getFullYear()} {t("company")}. {t("landing.footerRights")}
          </div>
        </div>
      </footer>
    </main>
  );
}
