"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getUrgentSummary, type UrgentItem } from "@/app/admin/urgent-actions";

/**
 * Persistent red "pending work" indicator — deliberately separate from the
 * notification bell (events) : this is the standing to-do pressure. Red badge
 * with the total count; opens a dropdown of role-scoped pending items that
 * deep-link into the right stage tab. Refreshes when opened and every 5 min.
 */
export function PendingAlert({ role }: { role: string }) {
  const [items, setItems] = useState<UrgentItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => {
    getUrgentSummary().then(setItems).catch(() => {});
  };

  useEffect(() => {
    if (["boss", "agent"].includes(role)) return;
    refresh();
    const id = setInterval(refresh, 5 * 60_000);
    return () => clearInterval(id);
  }, [role]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (["boss", "agent"].includes(role)) return null;
  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refresh();
        }}
        aria-label={total > 0 ? `${total} pending items` : "No pending items"}
        title="Pending items"
        className={`relative rounded-md p-1.5 transition-colors ${
          total > 0 ? "text-brand-red hover:bg-brand-red-bg" : "text-ink-muted hover:text-ink"
        }`}
      >
        <AlertTriangle className="h-5 w-5" aria-hidden />
        {total > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 font-mono text-[10px] font-semibold text-oncolor">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-card border border-border-warm bg-paper shadow-xl">
          <p className="border-b border-border-warm bg-brand-red-bg px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-red">
            Pending items
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Nothing pending — all clear.
            </p>
          ) : (
            items.map((it) => (
              <Link
                key={it.href + it.label}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 border-b border-border-warm/60 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-cream-50"
              >
                <span className="text-ink">{it.label}</span>
                <span className="shrink-0 rounded-md bg-brand-red-bg px-2 py-0.5 font-mono text-xs font-medium text-brand-red tabular">
                  {it.count}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
