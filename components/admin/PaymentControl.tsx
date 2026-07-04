"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/app/admin/finance-actions";

const METHODS = ["bank_transfer", "fpx", "card", "cash", "other"];
const F = "rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none focus:border-brand-red";

/** Inline "record a payment against this fee" control for the finance table. */
export function PaymentControl({
  applicationId,
  feeId,
  amount,
}: {
  applicationId: string;
  feeId: string;
  amount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(amount || ""));
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-border-warm bg-paper px-2 py-1 text-xs font-medium text-ink hover:bg-cream-50"
      >
        Record payment
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Amount" className={`w-20 ${F}`} />
      <select value={method} onChange={(e) => setMethod(e.target.value)} className={F}>
        {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
      </select>
      <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ref" className={`w-24 ${F}`} />
      <button
        disabled={pending || !Number(value)}
        onClick={() =>
          start(async () => {
            await recordPayment({ applicationId, feeId, amount: Number(value), method, reference: reference || undefined });
            setOpen(false);
            setReference("");
            router.refresh();
          })
        }
        className="rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-cream hover:bg-ink-soft disabled:opacity-50"
      >
        Save
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-ink-muted hover:text-ink">
        Cancel
      </button>
    </div>
  );
}
