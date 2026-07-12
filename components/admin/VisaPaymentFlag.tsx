"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { flagVisaPayment } from "@/app/admin/visa-actions";

const FIELD =
  "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

// The payments visa typically owes out during the EMGS journey.
const VISA_PAYMENTS = [
  { type: "visa_emgs", label: "EMGS fee" },
  { type: "immigration", label: "Immigration fee" },
  { type: "medical", label: "Medical screening" },
];

/**
 * Visa flags a payment owed to EMGS / Immigration — creates the fee (so it lands
 * in Finance's outstanding list) and asks Finance to invoice + collect.
 */
export function VisaPaymentFlag({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ type: "visa_emgs", amount: "", note: "" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  if (done) {
    return (
      <p className="text-xs font-medium text-status-present">
        Flagged to Finance — it&apos;s now in their outstanding list. ✓{" "}
        <button onClick={() => { setDone(false); setF({ type: "visa_emgs", amount: "", note: "" }); }} className="font-normal text-ink-muted underline hover:text-ink">
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
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          Payment
          <select value={f.type} onChange={(e) => set("type", e.target.value)} className={`mt-1 ${FIELD}`}>
            {VISA_PAYMENTS.map((p) => <option key={p.type} value={p.type}>{p.label}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          Amount (MYR, optional)
          <input type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="Finance can set it" className={`mt-1 ${FIELD}`} />
        </label>
      </div>
      <input value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Note for Finance (optional)" className={FIELD} />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await flagVisaPayment({
                applicationId,
                type: f.type,
                amount: f.amount ? Number(f.amount) : undefined,
                note: f.note || undefined,
              });
              setOpen(false);
              setDone(true);
              router.refresh();
            })
          }
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
