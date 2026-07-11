import Link from "next/link";
import { listApplications } from "@/lib/admin/applications";
import {
  listFees,
  listPayments,
  listCommissions,
  formatMoney,
  FEE_TYPE_LABEL,
  paidTowards,
  type FeeType,
} from "@/lib/admin/finance";
import { listVisaCases, expiryFlag } from "@/lib/admin/visa";

export default async function ReportsPage() {
  const [apps, fees, payments, commissions, visaCases] = await Promise.all([
    listApplications(),
    listFees(),
    listPayments(),
    listCommissions(),
    listVisaCases(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  /* Agent performance */
  const agents = new Map<
    string,
    { name: string; referred: number; enrolled: number; commission: number }
  >();
  for (const a of apps) {
    if (!a.agent_id) continue;
    const row = agents.get(a.agent_id) ?? {
      name: a.agent_name ?? a.agent_id,
      referred: 0,
      enrolled: 0,
      commission: 0,
    };
    row.referred += 1;
    if (["enrolled", "active", "completed"].includes(a.stage)) row.enrolled += 1;
    agents.set(a.agent_id, row);
  }
  for (const c of commissions) {
    if (c.direction !== "payable" || !c.agent_id) continue;
    const row = agents.get(c.agent_id);
    if (row) row.commission += c.amount;
  }

  /* Revenue by fee type */
  const byType = new Map<FeeType, { billed: number; received: number }>();
  for (const f of fees) {
    const row = byType.get(f.type) ?? { billed: 0, received: 0 };
    row.billed += f.amount;
    row.received += paidTowards(f, payments);
    byType.set(f.type, row);
  }

  /* Visa expiry */
  const expiring = visaCases.filter((c) => {
    const flag = expiryFlag(c.student_pass_expiry, today);
    return flag === "soon" || flag === "expired";
  });

  /* Students for the printable-report picker (dedupe applications by student). */
  const students = [
    ...new Map(
      apps.filter((a) => a.student_id).map((a) => [a.student_id as string, a.student_name]),
    ).entries(),
  ]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Reports
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">
          Performance &amp; alerts
        </h1>
      </div>

      {/* Student application reports — printable */}
      <section>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Student application reports
        </p>
        <p className="mb-3 text-sm text-ink-soft">
          Open a printable report — <span className="font-medium text-ink">Summary</span> (key
          details only) or <span className="font-medium text-ink">Detailed</span> (with the full
          activity timeline &amp; work log). Use the browser print dialog to save as PDF.
        </p>
        <div className="overflow-hidden rounded-card border border-border-warm">
          {students.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">No students yet.</p>
          )}
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0">
              <span className="min-w-0 truncate text-sm font-medium text-ink">{s.name}</span>
              <span className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/students/${s.id}/report?mode=summary`}
                  target="_blank"
                  className="rounded-md border border-border-warm bg-paper px-3 py-1 text-xs font-medium text-ink hover:bg-cream-50"
                >
                  Summary
                </Link>
                <Link
                  href={`/admin/students/${s.id}/report?mode=detailed`}
                  target="_blank"
                  className="rounded-md bg-inkbtn px-3 py-1 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
                >
                  Detailed
                </Link>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Agent performance */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Agent performance
        </p>
        <div className="overflow-x-auto rounded-card border border-border-warm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Agent</th>
                <th className="px-4 py-2.5 text-right font-medium">Referred</th>
                <th className="px-4 py-2.5 text-right font-medium">Enrolled</th>
                <th className="px-4 py-2.5 text-right font-medium">Conversion</th>
                <th className="px-4 py-2.5 text-right font-medium">Commission payable</th>
              </tr>
            </thead>
            <tbody>
              {[...agents.values()].map((a) => (
                <tr key={a.name} className="border-b border-border-warm/60 bg-paper last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{a.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular">{a.referred}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular">{a.enrolled}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular">
                    {a.referred ? Math.round((a.enrolled / a.referred) * 100) : 0}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular">
                    {formatMoney(a.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Revenue by fee type */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Revenue by fee type
        </p>
        <div className="overflow-hidden rounded-card border border-border-warm">
          {[...byType.entries()].map(([type, row]) => {
            const pct = row.billed ? Math.round((row.received / row.billed) * 100) : 0;
            return (
              <div key={type} className="flex items-center gap-4 border-b border-border-warm/60 bg-paper px-4 py-3 last:border-0">
                <span className="w-40 shrink-0 text-sm text-ink">{FEE_TYPE_LABEL[type]}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-cream-50">
                  <div className="h-full rounded-md bg-status-present/70" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-44 shrink-0 text-right font-mono text-xs text-ink-soft tabular">
                  {formatMoney(row.received)} / {formatMoney(row.billed)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visa expiry alerts */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-red">
          Student passes needing renewal
        </p>
        {expiring.length === 0 ? (
          <p className="rounded-card border border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
            Nothing due within 90 days.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-border-warm">
            {expiring.map((c) => (
              <Link
                key={c.id}
                href={`/admin/applications?app=${c.application_id}`}
                className="flex items-center justify-between border-b border-border-warm/60 bg-paper px-4 py-3 transition-colors last:border-0 hover:bg-cream-50"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{c.student_name}</p>
                  <p className="text-xs text-ink-muted">{c.target}</p>
                </div>
                <span className="font-mono text-xs font-medium text-brand-gold">
                  expires {c.student_pass_expiry}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
