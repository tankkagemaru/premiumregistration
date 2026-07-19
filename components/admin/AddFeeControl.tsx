"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { BillableItem } from "@/lib/admin/billables-shared";
import { createFeeFromItem } from "@/app/admin/billables-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

/** Add a fee to this application from the billable-items price list. */
export function AddFeeControl({
  applicationId,
  items,
}: {
  applicationId: string;
  items: BillableItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");

  if (items.length === 0) return null;

  const selected = items.find((i) => i.id === itemId);
  const placeholder =
    selected?.default_amount != null ? String(selected.default_amount) : "amount";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add fee from price list
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-border-warm bg-paper p-3">
      <select
        value={itemId}
        onChange={(e) => { setItemId(e.target.value); setAmount(""); }}
        className={F}
      >
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
            {i.default_amount != null ? ` — MYR ${i.default_amount}` : ""}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={placeholder}
          aria-label="Amount (MYR)"
          className={F}
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date"
          className={F}
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={pending || !itemId || (!!amount && Number(amount) <= 0)}
          onClick={() =>
            start(async () => {
              await createFeeFromItem({
                applicationId,
                itemId,
                amount: amount ? Number(amount) : null,
                dueDate: due || null,
              });
              setOpen(false);
              setAmount("");
              setDue("");
              router.refresh();
            })
          }
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add fee"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
