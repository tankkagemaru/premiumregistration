"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/agent", label: "My students" },
  { href: "/agent/programmes", label: "Programmes" },
];

export function AgentNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border-warm">
      <div className="mx-auto flex max-w-4xl gap-5 px-6">
        {TABS.map((t) => {
          const active = t.href === "/agent" ? pathname === "/agent" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px border-b-2 py-3 text-sm font-medium transition-colors",
                active ? "border-brand-red text-ink" : "border-transparent text-ink-muted hover:text-ink",
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
