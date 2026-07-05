"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface StageTab {
  id: string;
  label: string;
  count?: number;
  attention?: boolean; // the ★ "act now" tab — tinted when it has items
}

/**
 * Shared stage sub-nav — a segmented bar with live counts that filters the page
 * via a URL param (default ?stage=). The page reads the param, computes counts,
 * and filters; this only handles display + navigation. Horizontally scrollable
 * on narrow screens.
 */
export function StageTabs({
  tabs,
  active,
  param = "stage",
}: {
  tabs: StageTab[];
  active: string;
  param?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  function go(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set(param, id);
    // Drop any open drawer/detail param when switching stage.
    next.delete("lead");
    next.delete("app");
    next.delete("visa");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
      <div className="flex gap-1 rounded-lg border border-border-warm bg-paper p-1">
        {tabs.map((t) => {
          const on = t.id === active;
          const attn = t.attention && (t.count ?? 0) > 0;
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                on
                  ? "bg-brand-red text-oncolor"
                  : attn
                    ? "text-brand-red hover:bg-brand-red/10"
                    : "text-ink-soft hover:bg-cream-50 hover:text-ink",
              )}
            >
              {t.attention && <span aria-hidden>★</span>}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular",
                    on ? "bg-oncolor/20" : attn ? "bg-brand-red/15" : "bg-cream-50 text-ink-muted",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
