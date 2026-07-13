"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, GraduationCap, CalendarDays, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONSOLE_STR, type ConsoleLang } from "@/lib/admin/console-i18n-shared";

const TABS: { href: string; key: "ag_nav_students" | "ag_nav_programmes" | "ag_nav_calendar"; icon: LucideIcon }[] = [
  { href: "/agent", key: "ag_nav_students", icon: Users },
  { href: "/agent/programmes", key: "ag_nav_programmes", icon: GraduationCap },
  { href: "/agent/calendar", key: "ag_nav_calendar", icon: CalendarDays },
];

export function AgentNav({ lang = "en" }: { lang?: ConsoleLang }) {
  const pathname = usePathname();
  const L = CONSOLE_STR[lang];
  return (
    <nav className="border-b border-border-warm">
      <div className="mx-auto flex max-w-4xl gap-5 px-6">
        {TABS.map((t) => {
          const active = t.href === "/agent" ? pathname === "/agent" : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "group -mb-px inline-flex items-center gap-1.5 border-b-2 py-3 text-sm font-medium transition-colors",
                active ? "border-brand-red text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="nav-ico h-4 w-4" aria-hidden />
              {L[t.key]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
