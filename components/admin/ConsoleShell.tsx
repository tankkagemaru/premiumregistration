"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Clock } from "@/components/ui/Clock";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { PendingAlert } from "@/components/admin/PendingAlert";
import { UrgentPopup } from "@/components/admin/UrgentPopup";
import { LangToggle } from "@/components/admin/LangToggle";
import { signOut } from "@/app/admin/actions";
import type { Notification } from "@/lib/admin/notifications-shared";
import { CONSOLE_STR, type ConsoleLang } from "@/lib/admin/console-i18n-shared";
import { cn } from "@/lib/utils";

const TABS: { href: string; key: keyof (typeof CONSOLE_STR)["en"]; roles: string[] }[] = [
  { href: "/admin", key: "nav_dashboard", roles: ["*"] },
  { href: "/admin/exec", key: "nav_exec", roles: ["admin", "boss"] },
  { href: "/admin/calendar", key: "nav_calendar", roles: ["*"] },
  { href: "/admin/intakes", key: "nav_intakes", roles: ["admin", "academic", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/leads", key: "nav_leads", roles: ["admin", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/applications", key: "nav_applications", roles: ["admin", "admissions", "visa", "academic", "counsellor", "staff"] },
  { href: "/admin/requests", key: "nav_requests", roles: ["admin", "marketing", "admissions", "visa", "finance", "academic", "counsellor", "staff"] },
  { href: "/admin/follow-ups", key: "nav_followups", roles: ["admin", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/academic", key: "nav_academic", roles: ["admin", "academic"] },
  { href: "/admin/finance", key: "nav_finance", roles: ["admin", "finance"] },
  { href: "/admin/visa", key: "nav_visa", roles: ["admin", "visa", "admissions", "marketing", "academic", "finance", "counsellor", "staff"] },
  { href: "/admin/reports", key: "nav_reports", roles: ["admin", "marketing", "admissions", "finance"] },
  { href: "/admin/agent-codes", key: "nav_agent_codes", roles: ["admin", "finance", "marketing"] },
  { href: "/admin/users", key: "nav_users", roles: ["admin"] },
  { href: "/admin/logs", key: "nav_logs", roles: ["admin"] },
  { href: "/admin/architecture", key: "nav_architecture", roles: ["admin"] },
  { href: "/admin/settings", key: "nav_settings", roles: ["admin"] },
];

export function ConsoleShell({
  role,
  userName,
  userId,
  notifications,
  lang = "en",
  children,
}: {
  role: string;
  userName: string;
  userId: string;
  notifications: Notification[];
  lang?: ConsoleLang;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const L = CONSOLE_STR[lang];
  const tabs = TABS.filter((t) => t.roles.includes("*") || t.roles.includes(role));

  const links = (
    <nav className="flex flex-col gap-0.5">
      {tabs.map((t) => {
        const active =
          t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            onClick={() => setOpen(false)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-red/10 text-brand-red"
                : "text-ink-soft hover:bg-cream-50 hover:text-ink",
            )}
          >
            {L[t.key]}
          </Link>
        );
      })}
    </nav>
  );

  // Logo footer pinned to the bottom of the sidebar.
  const logoFooter = (
    <div className="mt-auto flex flex-col items-center gap-2 border-t border-border-warm/60 px-2 pb-1 pt-5">
      <Image
        src="/pecsb-logo.png"
        alt="PECSB — Premium Language Centre"
        width={72}
        height={72}
        className="h-16 w-16 rounded-md object-contain opacity-90"
      />
      <p className="text-center text-[9px] font-medium uppercase leading-relaxed tracking-[0.18em] text-ink-muted">
        Premium Entrepreneur
        <br />
        Consultant Sdn Bhd
      </p>
    </div>
  );

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="flex min-h-full">
      {/* Sidebar — desktop / tablet */}
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-e border-border-warm px-3 py-5 md:flex md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <Link href="/admin" className="mb-6 px-2">
          <Wordmark size="md" />
        </Link>
        {links}
        {logoFooter}
      </aside>

      {/* Sidebar — mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="relative z-10 flex h-full w-64 flex-col gap-1 border-e border-border-warm bg-cream px-3 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <Wordmark size="md" />
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {links}
            {logoFooter}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border-warm px-4 py-5 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="text-ink-muted transition-colors hover:text-ink md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted md:inline">
            {L.staff_console}
          </span>
          <div className="ms-auto flex items-center gap-3 sm:gap-4">
            <Clock />
            <LangToggle lang={lang} />
            <ThemeToggle />
            <PendingAlert role={role} />
            <NotificationBell items={notifications} userId={userId} />
            <span className="hidden text-sm text-ink-soft sm:inline">{userName}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50"
              >
                {L.sign_out}
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>

      {/* Once-a-day "needs your attention" popup after sign-in */}
      <UrgentPopup role={role} />
    </div>
  );
}
