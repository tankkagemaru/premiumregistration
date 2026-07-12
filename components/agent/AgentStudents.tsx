"use client";

import { Fragment, useMemo, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { VISA_STAGE_LABEL, type VisaCase } from "@/lib/admin/visa-shared";
import {
  formatMoney,
  FEE_TYPE_LABEL,
  type Fee,
  type Commission,
  type CommissionStatus,
  type FeeType,
} from "@/lib/admin/finance-shared";
import {
  STAGE_LABEL,
  stagePercent,
  expectedDocs,
  DOC_LABEL,
  type Application,
} from "@/lib/admin/applications-shared";
import { AgentStudentName } from "@/components/agent/AgentStudentName";
import { AgentProgress } from "@/components/agent/AgentProgress";
import { ClaimInvoiceUpload } from "@/components/agent/ClaimInvoiceUpload";

interface AgentDoc { application_id: string; kind: string; review_status: string }

const COMMISSION_TONE: Record<CommissionStatus, string> = {
  accrued: "bg-cream-50 text-ink-muted",
  invoiced: "bg-brand-gold/15 text-brand-gold",
  paid: "bg-status-present/15 text-status-present",
};
const COMMISSION_LABEL: Record<CommissionStatus, string> = {
  accrued: "Accrued", invoiced: "Invoiced", paid: "Paid",
};
const PAY_TONE: Record<"paid" | "due" | "none", string> = {
  paid: "bg-status-present/15 text-status-present",
  due: "bg-brand-red-bg text-brand-red",
  none: "text-ink-muted",
};

function feeSummary(fees: Fee[]): { label: string; tone: "paid" | "due" | "none" } {
  if (fees.length === 0) return { label: "—", tone: "none" };
  const settled = fees.every((f) => f.status === "paid" || f.status === "waived");
  if (settled) return { label: "Paid", tone: "paid" };
  const started = fees.some((f) => f.status === "paid" || f.status === "partial");
  return { label: started ? "Partial" : "Outstanding", tone: "due" };
}

const SEL = "rounded-md border border-border-warm bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";

export function AgentStudents({
  apps,
  fees,
  commissions,
  docs,
  visaCases,
  trackTitles,
}: {
  apps: Application[];
  fees: Fee[];
  commissions: Commission[];
  docs: AgentDoc[];
  visaCases: VisaCase[];
  trackTitles: Record<string, string>;
}) {
  const visaByApp = new Map(visaCases.map((v) => [v.application_id, v] as const));
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [pay, setPay] = useState("all");

  const payable = commissions.filter((c) => c.direction === "payable");
  const feesByApp = (id: string) => fees.filter((f) => f.application_id === id);
  const commissionByApp = (id: string) => payable.find((c) => c.application_id === id);
  const outstandingDocs = (appId: string, s: string, intl: boolean) => {
    const appDocs = docs.filter((d) => d.application_id === appId);
    return expectedDocs(s, intl).filter((kind) => {
      const doc = appDocs.find((d) => d.kind === kind);
      return !doc || doc.review_status === "rejected";
    });
  };

  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      apps.filter((a) => {
        const summary = feeSummary(feesByApp(a.id));
        if (stage !== "all" && a.stage !== stage) return false;
        if (pay !== "all" && summary.tone !== pay) return false;
        if (!query) return true;
        return `${a.student_name} ${a.target_institution ?? ""} ${trackTitles[a.track] ?? a.track}`
          .toLowerCase()
          .includes(query);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps, fees, query, stage, pay],
  );

  const stageOptions = Array.from(new Set(apps.map((a) => a.stage)));

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-md border border-border-warm bg-paper px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, institution…" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70" />
        </div>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={SEL} aria-label="Stage">
          <option value="all">All stages</option>
          {stageOptions.map((s) => <option key={s} value={s}>{STAGE_LABEL[s] ?? s}</option>)}
        </select>
        <select value={pay} onChange={(e) => setPay(e.target.value)} className={SEL} aria-label="Payment">
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="due">Outstanding</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Payment</th>
              <th className="px-4 py-2.5 font-medium">Commission</th>
              <th className="px-4 py-2.5 text-center font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                {apps.length === 0 ? "No students yet — share your link to get started." : "No students match."}
              </td></tr>
            )}
            {shown.map((a) => {
              const appFees = feesByApp(a.id);
              const summary = feeSummary(appFees);
              const comm = commissionByApp(a.id);
              const missing = outstandingDocs(a.id, a.stage, a.is_international);
              const missingLabels = missing.map((k) => DOC_LABEL[k] ?? k);
              const hasTodo = Boolean(a.next_action) || missing.length > 0;
              const outstandingFees = appFees
                .filter((f) => f.status === "unpaid" || f.status === "partial")
                .map((f) => ({ label: f.label || FEE_TYPE_LABEL[f.type as FeeType] || "Fee", amount: f.amount, currency: f.currency }));
              const appDocs = docs.filter((d) => d.application_id === a.id).map((d) => ({ kind: d.kind, review_status: d.review_status }));
              const vc = visaByApp.get(a.id);
              const visaLabel = vc ? (VISA_STAGE_LABEL[vc.stage] ?? vc.stage) : (a.is_international ? "Not filed yet" : null);
              const flagged = a.flag === "action";
              const flaggedReason = flagged ? (a.next_action ?? "Needs attention — check with the office.") : null;
              return (
                <Fragment key={a.id}>
                  <tr className="bg-paper">
                    <td className="px-4 py-3">
                      <AgentStudentName app={a} paymentLabel={summary.label} docs={appDocs} />
                      <div className="text-xs text-ink-muted">
                        {trackTitles[a.track] ?? a.track}
                        {a.target_institution ? ` · ${a.target_institution}` : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {visaLabel && (
                          <span className="text-[11px] text-ink-muted">Visa: {visaLabel}</span>
                        )}
                        {flagged && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-red-bg px-1.5 py-0.5 text-[10px] font-medium text-brand-red">
                            <AlertTriangle className="h-3 w-3" aria-hidden /> Flagged
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-brand-red-bg px-2.5 py-1 text-xs font-medium text-brand-red">
                        {STAGE_LABEL[a.stage] ?? a.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${PAY_TONE[summary.tone]}`}>{summary.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {comm ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-ink tabular">{formatMoney(comm.amount, comm.currency)}</span>
                          <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${COMMISSION_TONE[comm.status]}`}>{COMMISSION_LABEL[comm.status]}</span>
                          {comm.status !== "paid" && (
                            <ClaimInvoiceUpload commissionId={comm.id} claimReady={Boolean(comm.claim_ready)} submitted={Boolean(comm.claim_invoice_doc_id)} />
                          )}
                        </div>
                      ) : <span className="text-xs text-ink-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <AgentProgress status={{
                          studentName: a.student_name,
                          percent: stagePercent(a.stage, a.is_international, a.track),
                          flag: a.flag ?? "progress",
                          stageLabel: STAGE_LABEL[a.stage] ?? a.stage,
                          paymentLabel: summary.label,
                          outstandingFees,
                          nextAction: flagged ? null : a.next_action,
                          nextActionDue: a.next_action_due,
                          missingDocs: missingLabels,
                          commissionLabel: comm ? `${formatMoney(comm.amount, comm.currency)} · ${COMMISSION_LABEL[comm.status]}` : null,
                          visaLabel,
                          flaggedReason,
                        }} />
                      </div>
                    </td>
                  </tr>
                  {hasTodo && (
                    <tr className="border-b border-border-warm/60 last:border-0">
                      <td colSpan={5} className="bg-cream-50/70 px-4 pb-2.5 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                          {a.next_action && (
                            <span className="text-ink-soft"><span className="font-medium text-ink">Next:</span> {a.next_action}{a.next_action_due ? ` · due ${a.next_action_due}` : ""}</span>
                          )}
                          {missingLabels.length > 0 && (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-brand-red">Awaiting from student:</span>
                              {missingLabels.map((l) => <span key={l} className="rounded bg-brand-red-bg px-1.5 py-0.5 text-brand-red">{l}</span>)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
