"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import type { BillableItem } from "@/lib/admin/billables-shared";
import { flagVisaPayment } from "@/app/admin/visa-actions";

const FIELD =
  "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

// Fallback payment types when it's something new (not on the price list).
const NEW_PAYMENTS = [
  { type: "visa_emgs", label: "EMGS fee" },
  { type: "immigration", label: "Immigration fee" },
  { type: "medical", label: "Medical screening" },
];

/**
 * Visa flags a payment owed to EMGS / Immigration. If it's a standard fee it's
 * picked straight from the price list (Finance's visa items — prefilled amount);
 * if it's something new, they flag a custom one. Either way it creates the fee
 * in Finance's outstanding list + raises a request to collect.
 */
export function VisaPaymentFlag({
  applicationId,
  billables = [],
}: {
  applicationId: string;
  billables?: BillableItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  // choice is either `item:<id>` (price list) or `new:<fee_type>` (custom).
  const [choice, setChoice] = useState(billables[0] ? `item:${billables[0].id}` : "new:visa_emgs");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const selectedItem = choice.startsWith("item:")
    ? billables.find((b) => b.id === choice.slice(5))
    : undefined;

  function pick(value: string) {
    setChoice(value);
    const item = value.startsWith("item:") ? billables.find((b) => b.id === value.slice(5)) : undefined;
    setAmount(item?.default_amount != null ? String(item.default_amount) : "");
  }

  function submit() {
    start(async () => {
      const amt = amount ? Number(amount) : undefined;
      if (selectedItem) {
        await flagVisaPayment({ applicationId, type: selectedItem.fee_type, label: selectedItem.name, amount: amt, note: note || undefined });
      } else {
        await flagVisaPayment({ applicationId, type: choice.slice(4), amount: amt, note: note || undefined });
      }
      setOpen(false);
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <p className="text-xs font-medium text-status-present">
        Flagged to Finance — it&apos;s now in their outstanding list. ✓{" "}
        <button onClick={() => { setDone(false); setNote(""); }} className="font-normal text-ink-muted underline hover:text-ink">
          Flag another
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
      >
        <Wallet className="h-3.5 w-3.5" aria-hidden /> Flag a payment (EMGS / Immigration)
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-warm bg-cream-50/60 p-3">
      <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        Payment
        <select value={choice} onChange={(e) => pick(e.target.value)} className={`mt-1 ${FIELD}`}>
          {billables.length > 0 && (
            <optgroup label="From price list">
              {billables.map((b) => (
                <option key={b.id} value={`item:${b.id}`}>
                  {b.name}{b.default_amount != null ? ` — ${b.currency} ${b.default_amount}` : ""}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Something new">
            {NEW_PAYMENTS.map((p) => (
              <option key={p.type} value={`new:${p.type}`}>New — {p.label}</option>
            ))}
          </optgroup>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          Amount (MYR)
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Finance can set it" className={`mt-1 ${FIELD}`} />
        </label>
        <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="For Finance" className={`mt-1 ${FIELD}`} />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={submit}
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send to Finance"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
