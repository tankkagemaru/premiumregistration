"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatMoney } from "@/lib/admin/finance-shared";
import type { Flag } from "@/lib/admin/applications-shared";

export interface AgentProgressStatus {
  studentName: string;
  percent: number;
  flag: Flag;
  stageLabel: string;
  paymentLabel: string;
  outstandingFees: { label: string; amount: number; currency: string }[];
  nextAction?: string | null;
  nextActionDue?: string | null;
  missingDocs: string[];
  commissionLabel?: string | null;
}

/** The progress ring — click it for a read-only status pop-up (where the
 *  student is, what's paid / owed, what's still needed). */
export function AgentProgress({ status }: { status: AgentProgressStatus }) {
  const [open, setOpen] = useState(false);
  const owed = status.outstandingFees.reduce((s, f) => s + f.amount, 0);

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full transition-transform hover:scale-105" aria-label={`Status for ${status.studentName}`}>
        <ProgressRing percent={status.percent} flag={status.flag} size={44} thickness={5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-card border border-border-warm bg-paper shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-border-warm px-5 py-4">
              <div>
                <p className="font-serif text-xl font-medium text-ink">{status.studentName}</p>
                <p className="mt-0.5 text-xs text-ink-soft">Where things stand</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink"><X className="h-5 w-5" aria-hidden /></button>
            </div>

            <div className="flex flex-col items-center gap-3 px-5 py-4">
              <ProgressRing percent={status.percent} flag={status.flag} size={104} thickness={9} sublabel={status.stageLabel} />
            </div>

            <div className="flex flex-col gap-3 border-t border-border-warm px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Payment</span>
                <span className="font-medium text-ink">{status.paymentLabel}</span>
              </div>
              {status.outstandingFees.length > 0 && (
                <div className="rounded-md border border-brand-red/30 bg-brand-red-bg/50 px-3 py-2">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-brand-red">Still to pay — {formatMoney(owed)}</p>
                  <ul className="flex flex-col gap-0.5 text-xs text-ink-soft">
                    {status.outstandingFees.map((f, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{f.label}</span>
                        <span className="font-mono tabular">{formatMoney(f.amount, f.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {status.nextAction && (
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-ink-muted">Next</span>
                  <span className="text-end text-ink">{status.nextAction}{status.nextActionDue ? ` · ${status.nextActionDue}` : ""}</span>
                </div>
              )}
              {status.missingDocs.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Awaiting from student</p>
                  <div className="flex flex-wrap gap-1.5">
                    {status.missingDocs.map((d) => (
                      <span key={d} className="rounded bg-brand-red-bg px-1.5 py-0.5 text-[11px] text-brand-red">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {status.commissionLabel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Your commission</span>
                  <span className="font-medium text-ink">{status.commissionLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
