"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { recordPayment } from "@/app/admin/finance-actions";
import {
  createAppDocUploadUrl,
  recordApplicationDoc,
} from "@/app/admin/document-actions";

const METHODS = ["bank_transfer", "fpx", "card", "cash", "other"];
const F = "rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none focus:border-brand-red";
const BUCKET = "registration-docs";

/**
 * Inline "record a payment against this fee" control. Optionally attaches the
 * QuickBooks receipt: uploaded as a `receipt` document on the application and
 * linked to the payment row.
 */
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
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

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

  async function save() {
    // Upload the receipt first (if any), then record the payment linked to it.
    let receiptDocId: string | undefined;
    if (receipt) {
      const signed = await createAppDocUploadUrl(applicationId, "receipt", receipt.name);
      if (!("error" in signed)) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(signed.path, signed.token, receipt);
        if (!error) {
          const rec = await recordApplicationDoc(applicationId, "receipt", signed.path);
          receiptDocId = rec.id;
        }
      }
    }
    await recordPayment({
      applicationId,
      feeId,
      amount: Number(value),
      method,
      reference: reference || undefined,
      receiptDocId,
    });
    setOpen(false);
    setReference("");
    setReceipt(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Amount" className={`w-20 ${F}`} />
      <select value={method} onChange={(e) => setMethod(e.target.value)} className={F}>
        {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
      </select>
      <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ref" className={`w-24 ${F}`} />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        title={receipt ? receipt.name : "Attach QuickBooks receipt (optional)"}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
          receipt
            ? "border-status-present/50 bg-status-present-bg text-status-present"
            : "border-border-warm bg-paper text-ink-muted hover:text-ink"
        }`}
      >
        <Paperclip className="h-3 w-3" aria-hidden />
        {receipt ? "Receipt ✓" : "Receipt"}
      </button>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={pending || !Number(value)}
        onClick={() => start(save)}
        className="rounded-md bg-inkbtn px-2.5 py-1 text-xs font-medium text-oncolor hover:bg-inkbtn-soft disabled:opacity-50"
      >
        Save
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-ink-muted hover:text-ink">
        Cancel
      </button>
    </div>
  );
}
