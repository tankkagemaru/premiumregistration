"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, FilePlus2, Send, AlertTriangle, History } from "lucide-react";
import {
  AGREEMENT_REQUEST_KINDS,
  AGREEMENT_EVENT_LABEL,
  type AgreementEvent,
} from "@/lib/admin/agreements-shared";
import { submitAgreementChangeRequest } from "@/app/admin/agreement-actions";

const F = "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";

/**
 * "Request a change" on the agent's agreement: change of terms, special-project
 * addendum, early-termination notice (Clause 12b), or a new agreement. Every
 * submission goes on the permanent record (agreement_events), lands in
 * Finance's Requests inbox, and is audited. The history renders below so the
 * agent can see what's on file.
 */
export function AgreementChangeRequest({
  agreementId,
  events,
}: {
  agreementId: string;
  events: AgreementEvent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [type, setType] = useState(AGREEMENT_REQUEST_KINDS[0].type);
  const [detail, setDetail] = useState("");
  const [confirmNotice, setConfirmNotice] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isTermination = type === "termination_notice";

  function submit() {
    setErr(null);
    start(async () => {
      const r = await submitAgreementChangeRequest(agreementId, type, detail);
      if (!r.ok) { setErr("Could not send the request — try again."); return; }
      setOpen(false);
      setDone(true);
      setDetail("");
      setConfirmNotice(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-border-warm bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Changes & notices
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Need different terms, a special-project addendum, or to end the agreement?
            Raise it here — everything goes on record and to PECSB finance.
          </p>
        </div>
        <button
          onClick={() => { setOpen(true); setDone(false); setErr(null); }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink hover:bg-cream-50"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden /> Request a change
        </button>
      </div>

      {done && (
        <p className="mt-3 text-xs font-medium text-status-present">
          Sent — PECSB finance has been notified and your request is on record below. ✓
        </p>
      )}

      {/* On-record history */}
      {events.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            <History className="h-3.5 w-3.5" aria-hidden /> On record
          </p>
          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <div key={e.id} className="border-s-2 border-border-warm ps-3">
                <p className="text-sm font-medium text-ink">
                  {AGREEMENT_EVENT_LABEL[e.type] ?? e.type}
                </p>
                {e.body && <p className="text-xs text-ink-soft">{e.body}</p>}
                <p className="text-[11px] text-ink-muted">{String(e.created_at).slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="Request a change" className="relative z-10 w-full max-w-lg rounded-card border border-border-warm bg-paper p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <p className="font-serif text-xl text-ink">Request a change</p>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {AGREEMENT_REQUEST_KINDS.map((k) => (
                <label
                  key={k.type}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 ${
                    type === k.type ? "border-brand-red/50 bg-brand-red-bg/30" : "border-border-warm bg-paper hover:bg-cream-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="req-kind"
                    checked={type === k.type}
                    onChange={() => { setType(k.type); setConfirmNotice(false); }}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{k.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-soft">{k.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                Details
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={4}
                placeholder={
                  isTermination
                    ? "Reason for termination and any handover notes…"
                    : "Describe what you're proposing — programmes, rates, project, dates…"
                }
                className={F}
              />
            </div>

            {isTermination && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-brand-red/40 bg-brand-red-bg/50 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
                <label className="flex items-start gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={confirmNotice}
                    onChange={(e) => setConfirmNotice(e.target.checked)}
                    className="mt-0.5"
                  />
                  I understand this constitutes written notice under Clause 12(b): the Agreement
                  ends thirty (30) days from today. Commission already earned on fully-paid
                  enrolments remains payable (Clause 12(d)).
                </label>
              </div>
            )}

            {err && <p className="mt-2 text-xs text-brand-red">{err}</p>}

            <div className="mt-4 flex gap-2">
              <button
                disabled={pending || !detail.trim() || (isTermination && !confirmNotice)}
                onClick={submit}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden />
                {pending ? "Sending…" : isTermination ? "Send notice" : "Send request"}
              </button>
              <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
