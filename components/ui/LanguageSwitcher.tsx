"use client";

import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.code === locale);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
        {current?.name ?? "English"}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute end-0 z-30 mt-1 w-36 overflow-hidden rounded-md border border-border-warm bg-paper py-1 shadow-sm"
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setLocale(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-cream-50",
                l.code === locale ? "text-ink" : "text-ink-soft",
              )}
            >
              {l.name}
              {l.code === locale && (
                <Check className="h-3.5 w-3.5 text-brand-red" aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
