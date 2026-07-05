"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Clock } from "@/components/ui/Clock";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { signOut } from "@/app/admin/actions";
import type { Notification } from "@/lib/admin/notifications-shared";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; roles: string[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["*"] },
  { href: "/admin/exec", label: "Executive", roles: ["admin", "boss"] },
  { href: "/admin/calendar", label: "Calendar", roles: ["*"] },
  { href: "/admin/intakes", label: "Intakes", roles: ["admin", "academic", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/leads", label: "Leads", roles: ["admin", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/applications", label: "Applications", roles: ["admin", "admissions", "visa", "academic", "counsellor", "staff"] },
  { href: "/admin/requests", label: "Requests", roles: ["admin", "marketing", "admissions", "visa", "finance", "academic", "counsellor", "staff"] },
  { href: "/admin/follow-ups", label: "Follow-ups", roles: ["admin", "marketing", "admissions", "counsellor", "staff"] },
  { href: "/admin/academic", label: "Academic", roles: ["admin", "academic"] },
  { href: "/admin/finance", label: "Finance", roles: ["admin", "finance"] },
  { href: "/admin/visa", label: "Visa", roles: ["admin", "visa", "admissions", "marketing", "academic", "finance", "counsellor", "staff"] },
  { href: "/admin/reports", label: "Reports", roles: ["admin", "marketing", "admissions", "finance"] },
  { href: "/admin/agent-codes", label: "Agent codes", roles: ["admin", "finance", "marketing"] },
  { href: "/admin/users", label: "Users", roles: ["admin"] },
  { href: "/admin/logs", label: "Logs", roles: ["admin"] },
  { href: "/admin/architecture", label: "Architecture", roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", roles: ["admin"] },
];

export function ConsoleShell({
  role,
  userName,
  userId,
  notifications,
  children,
}: {
  role: string;
  userName: string;
  userId: string;
  notifications: Notification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
            {t.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      {/* Sidebar — desktop / tablet */}
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border-warm px-3 py-5 md:flex md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <Link href="/admin" className="mb-6 px-2">
          <Wordmark size="md" />
        </Link>
        {links}
      </aside>

      {/* Sidebar — mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="relative z-10 flex h-full w-64 flex-col gap-1 border-r border-border-warm bg-cream px-3 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <Wordmark size="md" />
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {links}
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
            Staff console
          </span>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <Clock />
            <ThemeToggle />
            <NotificationBell items={notifications} userId={userId} />
            <span className="hidden text-sm text-ink-soft sm:inline">{userName}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
