"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  setFeeStatus,
  setFeeAmount,
  setCommissionStatus,
  setCommissionAmount,
  setCommissionClaimReady,
} from "@/app/admin/finance-actions";
import { formatMoney } from "@/lib/admin/finance-shared";
import { DocViewer } from "@/components/admin/DocViewer";

const SELECT_CLS =
  "rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none";
const NUM_CLS =
  "w-20 rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none focus:border-brand-red";

/**
 * Inline editor for a fee's amount. Fees scaffolded by automation start at MYR 0;
 * this is how finance keys in the real figure. Click the amount to edit.
 */
export function FeeAmountControl({
  id,
  amount,
  currency = "MYR",
  currencies = ["MYR"],
  myrEquivalent,
}: {
  id: string;
  amount: number;
  currency?: string;
  currencies?: string[];
  myrEquivalent?: number; // amount converted to MYR (live FX), when currency ≠ MYR
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(amount ? String(amount) : "");
  const [ccy, setCcy] = useState(currency);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group inline-flex flex-col items-end gap-0.5 font-mono text-xs text-ink tabular hover:text-brand-red"
        title="Set fee amount / currency"
      >
        <span className="inline-flex items-center gap-1.5">
          {formatMoney(amount, currency)}
          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
        </span>
        {currency !== "MYR" && myrEquivalent != null && (
          <span className="text-[10px] text-ink-muted">≈ {formatMoney(Math.round(myrEquivalent))}</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <select value={ccy} onChange={(e) => setCcy(e.target.value)} className={SELECT_CLS} aria-label="Currency">
        {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="number"
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        placeholder="0"
        aria-label="Fee amount"
        className={NUM_CLS}
      />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setFeeAmount(id, Number(val), ccy);
            setOpen(false);
            router.refresh();
          })
        }
        className="rounded-md bg-brand-red px-2 py-1 text-[11px] font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
      <button
        onClick={() => { setVal(amount ? String(amount) : ""); setCcy(currency); setOpen(false); }}
        className="rounded-md border border-border-warm px-2 py-1 text-[11px] text-ink-muted hover:text-ink"
      >
        Cancel
      </button>
    </div>
  );
}

const FEE_STATUS_OPTION: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
  waived: "Waived",
};

export function FeeStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  // "Waived" isn't offered here — it needs a recorded reason (Waive control).
  // It still renders as the current value when the fee is already waived.
  const options = status === "waived" ? ["unpaid", "partial", "paid", "waived"] : ["unpaid", "partial", "paid"];
  return (
    <span className="inline-flex flex-col">
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            setErr(null);
            const r = await setFeeStatus(id, e.target.value);
            if (r && !r.ok && r.error) { setErr(r.error); return; }
            router.refresh();
          })
        }
        className={SELECT_CLS}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {FEE_STATUS_OPTION[s] ?? s}
          </option>
        ))}
      </select>
      {err && <span className="mt-0.5 max-w-[160px] text-[10px] text-brand-red">{err}</span>}
    </span>
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

/**
 * Open (or close) a commission for the agent to claim + view their uploaded
 * claim invoice. Gating the claim to a finance action keeps agents from
 * uploading before the deal is approved.
 */
export function CommissionClaimControl({
  id,
  claimReady,
  claimInvoiceDocId,
}: {
  id: string;
  claimReady: boolean;
  claimInvoiceDocId?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [viewing, setViewing] = useState(false);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await setCommissionClaimReady(id, !claimReady); router.refresh(); })}
        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
          claimReady
            ? "bg-status-present-bg text-status-present"
            : "border border-border-warm bg-paper text-ink-muted hover:text-ink"
        }`}
      >
        {claimReady ? "Open for claim ✓" : "Open for claim"}
      </button>
      {claimInvoiceDocId && (
        <button
          type="button"
          onClick={() => setViewing(true)}
          className="text-[10px] font-medium text-brand-red hover:underline"
        >
          View claim invoice →
        </button>
      )}
      {viewing && claimInvoiceDocId && (
        <DocViewer docId={claimInvoiceDocId} label="Claim invoice" onClose={() => setViewing(false)} />
      )}
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
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          setErr(null);
          const r = await setCommissionStatus(id, e.target.value);
          if (r && !r.ok) { setErr(r.error ?? "Blocked."); return; }
          router.refresh();
        })
      }
      className={SELECT_CLS}
    >
      {["accrued", "invoiced", "paid"].map((s) => (
        <option key={s} value={s}>
          {s === "accrued" ? "Accrued" : s === "invoiced" ? "Invoiced" : "Paid"}
        </option>
      ))}
    </select>
    {err && <span className="mt-0.5 max-w-[180px] text-[10px] text-brand-red">{err}</span>}
    </span>
  );
}
