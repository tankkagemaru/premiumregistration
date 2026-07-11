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
  const [pick, setPick] = useState(billables[0]?.id ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  function addItem() {
    const b = billables.find((x) => x.id === pick);
    if (!b) return;
    setItems((cur) => [
      ...cur,
      { name: b.name, fee_type: b.fee_type, amount: b.default_amount ?? 0, currency: b.currency ?? "MYR" },
    ]);
    setSaved(false);
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
        <div className="flex items-center gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded-md border border-border-warm bg-cream-50 px-2 py-1.5 text-xs text-ink outline-none focus:border-brand-red">
            {billables.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.default_amount != null ? ` — ${b.currency} ${b.default_amount}` : ""}
              </option>
            ))}
          </select>
          <button onClick={addItem} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border-warm bg-paper px-2 py-1.5 text-xs font-medium text-ink hover:bg-cream-50">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={pending || !dirty}
          onClick={() => start(async () => { await saveLeadQuote(leadId, items); setSaved(true); router.refresh(); })}
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save quote"}
        </button>
        {items.length > 0 && (
          <span className="text-xs text-ink-muted">
            Total: {formatMoney(items.reduce((s, it) => s + it.amount, 0), items[0].currency)}
          </span>
        )}
      </div>
    </div>
  );
}
