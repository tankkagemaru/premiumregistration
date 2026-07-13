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
import { CONSOLE_STR, type ConsoleLang } from "@/lib/admin/console-i18n-shared";
import { AgentStudentName } from "@/components/agent/AgentStudentName";
import { AgentProgress } from "@/components/agent/AgentProgress";
import { ClaimInvoiceUpload } from "@/components/agent/ClaimInvoiceUpload";

interface AgentDoc { application_id: string; kind: string; review_status: string }

const COMMISSION_TONE: Record<CommissionStatus, string> = {
  accrued: "bg-cream-50 text-ink-muted",
  invoiced: "bg-brand-gold/15 text-brand-gold",
  paid: "bg-status-present/15 text-status-present",
};
const PAY_TONE: Record<"paid" | "due" | "none", string> = {
  paid: "bg-status-present/15 text-status-present",
  due: "bg-brand-red-bg text-brand-red",
  none: "text-ink-muted",
};

type PayKey = "none" | "paid" | "partial" | "outstanding";

/** Payment roll-up for one student's fees — a language-neutral key + colour
 *  tone; the display label is resolved from the dictionary at render. */
function feeSummary(fees: Fee[]): { key: PayKey; tone: "paid" | "due" | "none" } {
  if (fees.length === 0) return { key: "none", tone: "none" };
  const settled = fees.every((f) => f.status === "paid" || f.status === "waived");
  if (settled) return { key: "paid", tone: "paid" };
  const started = fees.some((f) => f.status === "paid" || f.status === "partial");
  return { key: started ? "partial" : "outstanding", tone: "due" };
}

const SEL = "rounded-md border border-border-warm bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";

export function AgentStudents({
  apps,
  fees,
  commissions,
  docs,
  visaCases,
  trackTitles,
  lang = "en",
}: {
  apps: Application[];
  fees: Fee[];
  commissions: Commission[];
  docs: AgentDoc[];
  visaCases: VisaCase[];
  trackTitles: Record<string, string>;
  lang?: ConsoleLang;
}) {
  const L = CONSOLE_STR[lang];
  const payLabel = (k: PayKey) =>
    k === "none" ? "—" : k === "paid" ? L.ag_paid : k === "partial" ? L.ag_partial : L.ag_outstanding;
  const commLabel = (s: CommissionStatus) =>
    s === "accrued" ? L.ag_accrued : s === "invoiced" ? L.ag_invoiced : L.ag_paid;

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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.ag_search_placeholder} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70" />
        </div>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={SEL} aria-label={L.ag_col_stage}>
          <option value="all">{L.ag_all_stages}</option>
          {stageOptions.map((s) => <option key={s} value={s}>{STAGE_LABEL[s] ?? s}</option>)}
        </select>
        <select value={pay} onChange={(e) => setPay(e.target.value)} className={SEL} aria-label={L.ag_col_payment}>
          <option value="all">{L.ag_all_payments}</option>
          <option value="paid">{L.ag_paid}</option>
          <option value="due">{L.ag_outstanding}</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-start text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">{L.ag_col_student}</th>
              <th className="px-4 py-2.5 font-medium">{L.ag_col_stage}</th>
              <th className="px-4 py-2.5 font-medium">{L.ag_col_payment}</th>
              <th className="px-4 py-2.5 font-medium">{L.ag_col_commission}</th>
              <th className="px-4 py-2.5 text-center font-medium">{L.ag_col_progress}</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                {apps.length === 0 ? L.ag_no_students : L.ag_no_match}
              </td></tr>
            )}
            {shown.map((a) => {
              const appFees = feesByApp(a.id);
              const summary = feeSummary(appFees);
              const payText = payLabel(summary.key);
              const comm = commissionByApp(a.id);
              const missing = outstandingDocs(a.id, a.stage, a.is_international);
              const missingLabels = missing.map((k) => DOC_LABEL[k] ?? k);
              const hasTodo = Boolean(a.next_action) || missing.length > 0;
              const outstandingFees = appFees
                .filter((f) => f.status === "unpaid" || f.status === "partial")
                .map((f) => ({ label: f.label || FEE_TYPE_LABEL[f.type as FeeType] || L.ag_fee_fallback, amount: f.amount, currency: f.currency }));
              const appDocs = docs.filter((d) => d.application_id === a.id).map((d) => ({ kind: d.kind, review_status: d.review_status }));
              const vc = visaByApp.get(a.id);
              const visaLabel = vc ? (VISA_STAGE_LABEL[vc.stage] ?? vc.stage) : (a.is_international ? L.ag_not_filed_yet : null);
              const flagged = a.flag === "action";
              const flaggedReason = flagged ? (a.next_action ?? L.ag_flagged_default_reason) : null;
              return (
                <Fragment key={a.id}>
                  <tr className="bg-paper">
                    <td className="px-4 py-3">
                      <AgentStudentName app={a} paymentLabel={payText} docs={appDocs} lang={lang} />
                      <div className="text-xs text-ink-muted">
                        {trackTitles[a.track] ?? a.track}
                        {a.target_institution ? ` · ${a.target_institution}` : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {visaLabel && (
                          <span className="text-[11px] text-ink-muted">{L.ag_visa} {visaLabel}</span>
                        )}
                        {flagged && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-red-bg px-1.5 py-0.5 text-[10px] font-medium text-brand-red">
                            <AlertTriangle className="h-3 w-3" aria-hidden /> {L.ag_flagged}
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
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${PAY_TONE[summary.tone]}`}>{payText}</span>
                    </td>
                    <td className="px-4 py-3">
                      {comm ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-ink tabular">{formatMoney(comm.amount, comm.currency)}</span>
                          <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${COMMISSION_TONE[comm.status]}`}>{commLabel(comm.status)}</span>
                          {comm.status !== "paid" && (
                            <ClaimInvoiceUpload commissionId={comm.id} claimReady={Boolean(comm.claim_ready)} submitted={Boolean(comm.claim_invoice_doc_id)} lang={lang} />
                          )}
                        </div>
                      ) : <span className="text-xs text-ink-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <AgentProgress lang={lang} status={{
                          studentName: a.student_name,
                          percent: stagePercent(a.stage, a.is_international, a.track),
                          flag: a.flag ?? "progress",
                          stageLabel: STAGE_LABEL[a.stage] ?? a.stage,
                          paymentLabel: payText,
                          outstandingFees,
                          nextAction: flagged ? null : a.next_action,
                          nextActionDue: a.next_action_due,
                          missingDocs: missingLabels,
                          commissionLabel: comm ? `${formatMoney(comm.amount, comm.currency)} · ${commLabel(comm.status)}` : null,
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
                            <span className="text-ink-soft"><span className="font-medium text-ink">{L.ag_next}</span> {a.next_action}{a.next_action_due ? ` · ${L.ag_due} ${a.next_action_due}` : ""}</span>
                          )}
                          {missingLabels.length > 0 && (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-brand-red">{L.ag_awaiting_from_student}</span>
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
