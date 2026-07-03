"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Console tabs, filtered by the signed-in user's role — a finance officer sees
 * Finance, a visa officer sees Visa, and only the admin (superadmin) sees
 * Users / Logs / Settings.
 */
const TABS: { href: string; label: string; roles: string[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["*"] },
  { href: "/admin/leads", label: "Leads", roles: ["admin", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/applications", label: "Applications", roles: ["admin", "admissions", "visa", "academic", "counsellor", "staff"] },
  { href: "/admin/requests", label: "Requests", roles: ["admin", "marketing", "admissions", "visa", "finance", "academic", "counsellor", "staff"] },
  { href: "/admin/follow-ups", label: "Follow-ups", roles: ["admin", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/academic", label: "Academic", roles: ["admin", "academic"] },
  { href: "/admin/finance", label: "Finance", roles: ["admin", "finance"] },
  { href: "/admin/visa", label: "Visa", roles: ["admin", "visa"] },
  { href: "/admin/reports", label: "Reports", roles: ["admin", "marketing", "admissions", "finance"] },
  { href: "/admin/users", label: "Users", roles: ["admin"] },
  { href: "/admin/logs", label: "Logs", roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", roles: ["admin"] },
];

export function ConsoleNav({ role }: { role: string }) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => t.roles.includes("*") || t.roles.includes(role));

  return (
    <nav className="flex gap-6 overflow-x-auto border-b border-border-warm px-6">
      <div className="mx-auto flex w-full max-w-6xl gap-6">
        {tabs.map((t) => {
          const active =
            t.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px shrink-0 border-b-2 py-3 text-sm font-medium transition-colors",
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
