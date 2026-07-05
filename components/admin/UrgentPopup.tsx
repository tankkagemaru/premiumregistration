"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { getUrgentSummary, type UrgentItem } from "@/app/admin/urgent-actions";
import { playChime } from "@/lib/chime";

const FLAG = "pecsb-urgent-shown";

/**
 * One-time "needs your attention" popup after sign-in. Shows at most once per
 * day per browser session; skips silently when there's nothing urgent.
 */
export function UrgentPopup({ role }: { role: string }) {
  const [items, setItems] = useState<UrgentItem[] | null>(null);

  useEffect(() => {
    if (["boss", "agent"].includes(role)) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (sessionStorage.getItem(FLAG) === today) return;
    } catch {
      return; // storage unavailable — don't risk showing on every navigation
    }
    let active = true;
    getUrgentSummary().then((list) => {
      if (!active || list.length === 0) return;
      try {
        sessionStorage.setItem(FLAG, today);
      } catch {}
      setItems(list);
      playChime();
    });
    return () => {
      active = false;
    };
  }, [role]);

  if (!items) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-inkbtn/40"
        onClick={() => setItems(null)}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-label="Needs your attention"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-card border border-border-warm bg-paper shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-red/30 bg-brand-red-bg px-5 py-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-brand-red" aria-hidden />
            <p className="font-serif text-lg font-medium text-brand-red">
              Needs your attention
            </p>
          </div>
          <button
            onClick={() => setItems(null)}
            aria-label="Dismiss"
            className="text-ink-muted transition-colors hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col">
          {items.map((it) => (
            <Link
              key={it.href + it.label}
              href={it.href}
              onClick={() => setItems(null)}
              className="flex items-center justify-between gap-3 border-b border-border-warm/60 px-5 py-3.5 transition-colors last:border-0 hover:bg-cream-50"
            >
              <span className="text-sm text-ink">{it.label}</span>
              <span className="shrink-0 rounded-md bg-brand-red-bg px-2.5 py-1 font-mono text-sm font-medium text-brand-red tabular">
                {it.count}
              </span>
            </Link>
          ))}
        </div>
        <div className="flex justify-end border-t border-border-warm bg-cream-50/60 px-5 py-3">
          <button
            onClick={() => setItems(null)}
            className="rounded-md border border-border-warm bg-paper px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
