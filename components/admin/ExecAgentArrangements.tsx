import { FileText, Award } from "lucide-react";
import {
  AGREEMENT_STATUS_LABEL,
  AGREEMENT_STATUS_TONE,
  schemeSummary,
  type AgentArrangement,
} from "@/lib/admin/agreements-shared";
import { formatMoney } from "@/lib/admin/finance-shared";

/** Read-only executive rollup of agent arrangements for the boss: who's signed
 *  up on what terms, their commission position, and a link to each agreement
 *  (and certificate) PDF. Server component — no writes. */
export function ExecAgentArrangements({ rows, label }: { rows: AgentArrangement[]; label: string }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">{label}</p>
      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-start text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 text-start font-medium">Agent</th>
              <th className="px-4 py-2.5 text-start font-medium">Status</th>
              <th className="px-4 py-2.5 text-start font-medium">Scheme</th>
              <th className="px-4 py-2.5 text-end font-medium">Students</th>
              <th className="px-4 py-2.5 text-end font-medium">Commission (accr / paid)</th>
              <th className="px-4 py-2.5 text-end font-medium">Documents</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ agreement: a, commission, students, docsVerified, docsTotal }) => (
              <tr key={a.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-ink">{a.agent_name ?? "—"}</span>
                  {a.agent_code && <span className="ms-1.5 font-mono text-[11px] text-ink-muted">{a.agent_code}</span>}
                  {a.valid_until && <div className="text-[11px] text-ink-muted">valid to {a.valid_until}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${AGREEMENT_STATUS_TONE[a.status]}`}>
                    {AGREEMENT_STATUS_LABEL[a.status]}
                  </span>
                  {a.certificate_issued_at && (
                    <span className="ms-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-gold">
                      <Award className="h-3 w-3" aria-hidden /> certified
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-soft">{schemeSummary(a.scheme)}</td>
                <td className="px-4 py-2.5 text-end font-mono tabular text-ink-soft">{students}</td>
                <td className="px-4 py-2.5 text-end font-mono tabular text-ink">
                  {formatMoney(commission.accrued, commission.currency)}
                  <span className="text-ink-muted"> / </span>
                  <span className="text-status-present">{formatMoney(commission.paid, commission.currency)}</span>
                </td>
                <td className="px-4 py-2.5 text-end text-xs text-ink-soft">
                  {docsTotal ? `${docsVerified}/${docsTotal} verified` : "—"}
                </td>
                <td className="px-4 py-2.5 text-end">
                  <span className="inline-flex items-center gap-2">
                    {a.status !== "requested" && (
                      <a href={`/api/agreement?id=${a.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline">
                        <FileText className="h-3.5 w-3.5" aria-hidden /> Agreement
                      </a>
                    )}
                    {a.certificate_issued_at && (
                      <a href={`/api/agreement/certificate?id=${a.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold hover:underline">
                        <Award className="h-3.5 w-3.5" aria-hidden /> Certificate
                      </a>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
