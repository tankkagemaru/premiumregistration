"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  setFeeStatus,
  setCommissionStatus,
  setCommissionAmount,
} from "@/app/admin/finance-actions";
import { formatMoney } from "@/lib/admin/finance-shared";

const SELECT_CLS =
  "rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none";
const NUM_CLS =
  "w-20 rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none focus:border-brand-red";

export function FeeStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setFeeStatus(id, e.target.value);
          router.refresh();
        })
      }
      className={SELECT_CLS}
    >
      {["unpaid", "partial", "paid", "waived"].map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

/**
 * Inline base × rate → amount editor for a single commission. Finance sets the
 * base fee (settable per deal for promotions / agent pricing) and a rate; the
 * amount is computed live but stays editable for a flat figure.
 */
export function CommissionAmountControl({
  id,
  amount,
  base,
  currency = "MYR",
}: {
  id: string;
  amount: number | null | undefined;
  base?: number | null;
  currency?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [baseVal, setBaseVal] = useState(base != null ? String(base) : "");
  const [rate, setRate] = useState("");
  const [amt, setAmt] = useState(amount != null ? String(amount) : "");

  // base × rate → amount (only when both are present); amount stays editable.
  function recompute(nextBase: string, nextRate: string) {
    const b = Number(nextBase);
    const r = Number(nextRate);
    if (nextBase && nextRate && Number.isFinite(b) && Number.isFinite(r)) {
      setAmt(String(Math.round(b * (r / 100) * 100) / 100));
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-1.5 font-mono text-xs text-ink tabular hover:text-brand-red"
      >
        {formatMoney(amount, currency)}
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <label className="flex items-center gap-1 text-[10px] text-ink-muted">
        Base
        <input
          type="number"
          value={baseVal}
          onChange={(e) => { setBaseVal(e.target.value); recompute(e.target.value, rate); }}
          placeholder="0"
          className={NUM_CLS}
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] text-ink-muted">
        %
        <input
          type="number"
          value={rate}
          onChange={(e) => { setRate(e.target.value); recompute(baseVal, e.target.value); }}
          placeholder="0"
          className="w-14 rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none focus:border-brand-red"
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] text-ink-muted">
        =
        <input
          type="number"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="0"
          className={NUM_CLS}
        />
      </label>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setCommissionAmount(
              id,
              Number(amt),
              baseVal ? Number(baseVal) : null,
            );
            setOpen(false);
            router.refresh();
          })
        }
        className="rounded-md bg-brand-red px-2 py-1 text-[11px] font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md border border-border-warm px-2 py-1 text-[11px] text-ink-muted hover:text-ink"
      >
        Cancel
      </button>
    </div>
  );
}

export function CommissionStatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setCommissionStatus(id, e.target.value);
          router.refresh();
        })
      }
      className={SELECT_CLS}
    >
      {["accrued", "invoiced", "paid"].map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
