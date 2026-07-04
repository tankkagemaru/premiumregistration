"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  notificationHref,
  type Notification,
} from "@/lib/admin/notifications-shared";
import { authConfigured } from "@/lib/admin/leads-shared";
import { markNotificationsRead } from "@/app/admin/actions";

interface Row {
  id: string;
  type: string;
  payload: { title?: string; lead_id?: string; application_id?: string } | null;
  read_at: string | null;
  created_at: string;
}

function toNotification(r: Row): Notification {
  return {
    id: r.id,
    type: r.type,
    title: r.payload?.title ?? r.type,
    lead_id: r.payload?.lead_id,
    application_id: r.payload?.application_id,
    read_at: r.read_at,
    created_at: r.created_at,
  };
}

export function NotificationBell({
  items,
  userId,
}: {
  items: Notification[];
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Notification[]>(items);
  const unread = list.filter((n) => !n.read_at).length;

  // Realtime: prepend new notifications for this user as they arrive.
  useEffect(() => {
    if (!authConfigured || !userId) return;
    let active = true;
    let cleanup: (() => void) | undefined;
    import("@/lib/supabase/client").then(({ createClient }) => {
      if (!active) return;
      const supabase = createClient();
      const channel = supabase
        .channel(`notif-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = toNotification(payload.new as Row);
            setList((prev) =>
              prev.some((n) => n.id === next.id) ? prev : [next, ...prev],
            );
          },
        )
        .subscribe();
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [userId]);

  function openMenu() {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      // Optimistically clear, then persist.
      setList((prev) =>
        prev.map((n) =>
          n.read_at ? n : { ...n, read_at: new Date().toISOString() },
        ),
      );
      void markNotificationsRead();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openMenu}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        aria-label="Notifications"
        className="relative rounded-md p-1.5 text-ink-muted transition-colors hover:bg-cream-50 hover:text-ink"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-medium text-oncolor">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 w-72 overflow-hidden rounded-card border border-border-warm bg-paper shadow-sm">
          <p className="border-b border-border-warm px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Notifications
          </p>
          {list.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Nothing new.
            </p>
          )}
          {list.map((n) => (
            <Link
              key={n.id}
              href={notificationHref(n)}
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
