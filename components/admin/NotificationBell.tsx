"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/admin/notifications-shared";

export function NotificationBell({ items }: { items: Notification[] }) {
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        aria-label="Notifications"
        className="relative rounded-md p-1.5 text-ink-muted transition-colors hover:bg-cream-50 hover:text-ink"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-medium text-cream">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 w-72 overflow-hidden rounded-card border border-border-warm bg-paper shadow-sm">
          <p className="border-b border-border-warm px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Notifications
          </p>
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Nothing new.
            </p>
          )}
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.lead_id ? `/admin/leads?lead=${n.lead_id}` : "/admin"}
              className="block border-b border-border-warm/60 px-4 py-3 text-sm text-ink transition-colors last:border-0 hover:bg-cream-50"
            >
              {n.title}
              <span className="mt-0.5 block text-[11px] text-ink-muted">
                {new Date(n.created_at).toISOString().slice(0, 10)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
