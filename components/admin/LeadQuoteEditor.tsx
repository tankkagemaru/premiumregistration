"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { BillableItem } from "@/lib/admin/billables-shared";
import { formatMoney } from "@/lib/admin/finance-shared";
import { saveLeadQuote, type QuoteItem } from "@/app/admin/lead-quote-actions";

const NUM = "w-24 rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none focus:border-brand-red";

/**
 * What marketing is selling this lead — a preliminary quote built from finance's
 * price list. Saved on the lead and scaffolded as fees on the application when it
 * converts, so finance/admissions inherit what was discussed.
 */
export function LeadQuoteEditor({
  leadId,
  initial,
  billables,
}: {
  leadId: string;
  initial: QuoteItem[];
  billables: BillableItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [items, setItems] = useState<QuoteItem[]>(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  const filtered = billables
    .filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 25);

  function addItemFrom(b: BillableItem) {
    setItems((cur) => [
      ...cur,
      { name: b.name, fee_type: b.fee_type, amount: b.default_amount ?? 0, currency: b.currency ?? "MYR" },
    ]);
    setSaved(false);
    setQuery("");
    setOpen(false);
  }
  const setAmount = (i: number, v: string) => {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, amount: Number(v) || 0 } : it)));
    setSaved(false);
  };
  const remove = (i: number) => {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="text-xs text-ink-muted">Nothing quoted yet — add what you discussed (program, fees…).</p>
      )}
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate text-ink">{it.name}</span>
          <input type="number" value={it.amount || ""} onChange={(e) => setAmount(i, e.target.value)} className={NUM} placeholder="0" />
          <span className="text-[10px] text-ink-muted">{it.currency}</span>
          <button onClick={() => remove(i)} aria-label="Remove" className="text-ink-muted hover:text-brand-red">
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}

      {billables.length > 0 && (
        <div className="relative">
          <div className="flex items-center gap-1.5 rounded-md border border-border-warm bg-cream-50 px-2 py-1.5">
            <Plus className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Search price list to add a fee…"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted/70"
            />
          </div>
          {open && (
            <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border-warm bg-paper shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-muted">No match.</p>
              ) : (
                filtered.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addItemFrom(b)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-cream-50"
                  >
                    <span className="min-w-0 truncate text-ink">{b.name}</span>
                    {b.default_amount != null && (
                      <span className="shrink-0 font-mono text-ink-muted">{b.currency} {b.default_amount}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={pending || !dirty}
          onClick={() =>
            start(async () => {
              setErr(null);
              const r = await saveLeadQuote(leadId, items);
              if (r && !r.ok) { setErr("Could not save the quote — you may not have permission."); return; }
              setSaved(true);
              router.refresh();
            })
          }
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save quote"}
        </button>
        {err && <span className="text-xs text-brand-red">{err}</span>}
        {items.length > 0 && (
          <span className="text-xs text-ink-muted">
            Total: {formatMoney(items.reduce((s, it) => s + it.amount, 0), items[0].currency)}
          </span>
        )}
      </div>
    </div>
  );
}
