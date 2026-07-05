import { Fragment } from "react";
import { getAgentPortal } from "@/lib/agent/portal";
import {
  formatMoney,
  type Fee,
  type Commission,
  type CommissionStatus,
} from "@/lib/admin/finance-shared";
import {
  STAGE_LABEL,
  stagePercent,
  expectedDocs,
  DOC_LABEL,
} from "@/lib/admin/applications-shared";
import { TRACKS } from "@/lib/config/tracks";
import { AgentLink } from "@/components/agent/AgentLink";
import { AgentReferForm } from "@/components/agent/AgentReferForm";
import { ProgressRing } from "@/components/ui/ProgressRing";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/** Roll up an application's fees into one payment badge. */
function feeSummary(fees: Fee[]): { label: string; tone: "paid" | "due" | "none" } {
  if (fees.length === 0) return { label: "—", tone: "none" };
  const settled = fees.every((f) => f.status === "paid" || f.status === "waived");
  if (settled) return { label: "Paid", tone: "paid" };
  const started = fees.some((f) => f.status === "paid" || f.status === "partial");
  return { label: started ? "Partial" : "Outstanding", tone: "due" };
}

const COMMISSION_TONE: Record<CommissionStatus, string> = {
  accrued: "bg-cream-50 text-ink-muted",
  invoiced: "bg-brand-gold/15 text-brand-gold",
  paid: "bg-status-present/15 text-status-present",
};
const COMMISSION_LABEL: Record<CommissionStatus, string> = {
  accrued: "Accrued",
  invoiced: "Invoiced",
  paid: "Paid",
};
const PAY_TONE: Record<"paid" | "due" | "none", string> = {
  paid: "bg-status-present/15 text-status-present",
  due: "bg-brand-red-bg text-brand-red",
  none: "text-ink-muted",
};

export default async function AgentHome() {
  const { agent, apps, commissions, fees, docs } = await getAgentPortal();
  const referral = `${APP_URL}/register?agent=${agent.code}`;
  const enrolled = apps.filter((a) =>
    ["enrolled", "active", "completed"].includes(a.stage),
  ).length;
  const payable = commissions.filter((c) => c.direction === "payable");
  const commissionTotal = payable.reduce((s, c) => s + (c.amount ?? 0), 0);
  const commissionPaid = payable
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const feesByApp = (id: string) => fees.filter((f) => f.application_id === id);
  const commissionByApp = (id: string): Commission | undefined =>
    payable.find((c) => c.application_id === id);
  // Docs the student still owes: expected by the current stage but not yet
  // provided (or rejected and needing re-upload).
  const outstandingDocs = (appId: string, stage: string, intl: boolean) => {
    const appDocs = docs.filter((d) => d.application_id === appId);
    return expectedDocs(stage, intl).filter((kind) => {
      const doc = appDocs.find((d) => d.kind === kind);
      return !doc || doc.review_status === "rejected";
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {agent.name} · {agent.code}
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">Your students</h1>
        </div>
        <AgentReferForm />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Referred", value: apps.length },
          { label: "Enrolled", value: enrolled },
          {
            label: "Commission",
            value: commissionTotal ? formatMoney(commissionTotal) : "—",
          },
          {
            label: "Paid out",
            value: commissionPaid ? formatMoney(commissionPaid) : "—",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-border-warm bg-paper px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              {s.label}
            </p>
            <p className="mt-1 font-serif text-2xl text-ink tabular">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-card border border-border-warm bg-paper p-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Your referral link
        </p>
        <p className="mb-3 text-sm text-ink-soft">
          Every student who registers through this link is automatically tagged to
          you and appears below.
        </p>
        <AgentLink url={referral} />
      </div>

      {/* Students */}
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
            {apps.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No students yet — share your link to get started.
                </td>
              </tr>
            )}
            {apps.map((a) => {
              const pay = feeSummary(feesByApp(a.id));
              const comm = commissionByApp(a.id);
              const missing = outstandingDocs(a.id, a.stage, a.is_international);
              const hasTodo = Boolean(a.next_action) || missing.length > 0;
              return (
                <Fragment key={a.id}>
                  <tr className={hasTodo ? "bg-paper" : "border-b border-border-warm/60 bg-paper last:border-0"}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{a.student_name}</div>
                      <div className="text-xs text-ink-muted">
                        {TRACK_TITLE[a.track] ?? a.track}
                        {a.target_institution ? ` · ${a.target_institution}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-brand-red-bg px-2.5 py-1 text-xs font-medium text-brand-red">
                        {STAGE_LABEL[a.stage] ?? a.stage}
                      </span>
                      {a.status !== "active" && (
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">
                          {a.status}
                        </div>
                      )}
                      {a.offer_acknowledged_at && (
                        <div className="mt-1 text-[11px] text-status-present">
                          Offer acknowledged {String(a.offer_acknowledged_at).slice(0, 10)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${PAY_TONE[pay.tone]}`}>
                        {pay.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {comm ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-ink tabular">
                            {formatMoney(comm.amount, comm.currency)}
                          </span>
                          <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${COMMISSION_TONE[comm.status]}`}>
                            {COMMISSION_LABEL[comm.status]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ProgressRing
                          percent={stagePercent(a.stage, a.is_international, a.track)}
                          flag={a.flag ?? "progress"}
                          size={44}
                          thickness={5}
                        />
                      </div>
                    </td>
                  </tr>
                  {hasTodo && (
                    <tr className="border-b border-border-warm/60 last:border-0">
                      <td colSpan={5} className="bg-cream-50/70 px-4 pb-2.5 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                          {a.next_action && (
                            <span className="text-ink-soft">
                              <span className="font-medium text-ink">Next:</span>{" "}
                              {a.next_action}
                              {a.next_action_due ? ` · due ${a.next_action_due}` : ""}
                            </span>
                          )}
                          {missing.length > 0 && (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-brand-red">
                                Awaiting from student:
                              </span>
                              {missing.map((kind) => (
                                <span
                                  key={kind}
                                  className="rounded bg-brand-red-bg px-1.5 py-0.5 text-brand-red"
                                >
                                  {DOC_LABEL[kind] ?? kind}
                                </span>
                              ))}
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

      {/* Commission status legend */}
      <p className="text-xs text-ink-muted">
        Commission status: <span className="font-medium text-ink-soft">Accrued</span> earned, pending our invoice ·{" "}
        <span className="font-medium text-brand-gold">Invoiced</span> invoice submitted ·{" "}
        <span className="font-medium text-status-present">Paid</span> paid out to you.
      </p>
    </div>
  );
}
