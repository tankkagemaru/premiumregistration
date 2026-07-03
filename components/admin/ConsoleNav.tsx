"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/pipeline", label: "Pipeline" },
  { href: "/admin/follow-ups", label: "Follow-ups" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/visa", label: "Visa" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export function ConsoleNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-6 overflow-x-auto border-b border-border-warm px-6">
      <div className="mx-auto flex w-full max-w-6xl gap-6">
        {TABS.map((t) => {
          const active =
            t.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px border-b-2 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-brand-red text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
