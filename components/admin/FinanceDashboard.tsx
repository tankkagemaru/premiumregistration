import Link from "next/link";
import { listFees, listPayments, listCommissions, paidTowards, formatMoney } from "@/lib/admin/finance";
import { getFxRates, toMYR } from "@/lib/admin/fx";
import { listRequests } from "@/lib/admin/requests";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-border-warm bg-paper px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl text-ink tabular">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

/**
 * Finance's landing overview — what money is in, what's owed, and what needs
 * attention — instead of dropping finance straight onto the raw fee table. The
 * fee/commission consoles remain one click away (Finance / Price list tabs).
 */
export async function FinanceDashboard() {
  const [fees, payments, commissions, financeRequests, fx] = await Promise.all([
    listFees(),
    listPayments(),
    listCommissions(),
    listRequests({ toRole: "finance", openOnly: true }),
    getFxRates(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const outstandingFees = fees.filter((f) => f.status === "unpaid" || f.status === "partial");
  const outstanding = outstandingFees.reduce(
    (s, f) => s + toMYR(Math.max(0, f.amount - paidTowards(f, payments)), f.currency, fx),
    0,
  );
  const payable = commissions
    .filter((c) => c.direction === "payable" && c.status !== "paid")
    .reduce((s, c) => s + toMYR(c.amount ?? 0, c.currency, fx), 0);
  const receivable = commissions
    .filter((c) => c.direction === "receivable" && c.status !== "paid")
    .reduce((s, c) => s + toMYR(c.amount ?? 0, c.currency, fx), 0);

  const overdue = outstandingFees.filter((f) => f.due_date && f.due_date < today);
  const unpriced = fees.filter((f) => f.amount === 0 && f.status !== "waived");
  const payableCount = commissions.filter((c) => c.direction === "payable" && c.status !== "paid").length;
  const toClaim = commissions.filter((c) => c.claim_ready && c.status !== "paid").length;

  const feeById = new Map(fees.map((f) => [f.id, f] as const));
  const recentPayments = [...payments]
    .sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1))
    .slice(0, 6);

  const attention: { label: string; count: number; href: string; loud?: boolean }[] = [
    { label: "Overdue fees", count: overdue.length, href: "/admin/finance?stage=outstanding", loud: true },
    { label: "Fees awaiting a price", count: unpriced.length, href: "/admin/finance?stage=outstanding" },
    { label: "Commissions to pay", count: payableCount, href: "/admin/finance?stage=commissions" },
    { label: "Claims to process", count: toClaim, href: "/admin/finance?stage=commissions" },
    { label: "Requests for Finance", count: financeRequests.length, href: "/admin/requests" },
  ].filter((a) => a.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Finance</p>
          <h1 className="font-serif text-3xl font-medium text-ink">Overview</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/finance" className="rounded-md bg-inkbtn px-4 py-2 text-sm font-medium text-oncolor hover:bg-inkbtn-soft">
            Fees &amp; commission
          </Link>
          <Link href="/admin/pricing" className="rounded-md border border-border-warm bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-cream-50">
            Price list &amp; rules
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Collected" value={formatMoney(collected)} />
        <Stat label="Outstanding" value={formatMoney(outstanding)} sub={`${outstandingFees.length} open fees`} />
        <Stat label="Commission payable" value={formatMoney(payable)} />
        <Stat label="Commission receivable" value={formatMoney(receivable)} />
      </div>
      <p className="-mt-4 text-[11px] text-ink-muted">
        Totals in MYR {fx.live ? "· converted at live rates" : "· FX unavailable, showing raw amounts"}.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs attention */}
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Needs attention</p>
          {attention.length === 0 ? (
            <p className="text-sm text-ink-muted">All clear — nothing outstanding.</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {attention.map((a) => (
                <Link key={a.label} href={a.href} className="flex items-center justify-between hover:text-brand-red">
                  <span className="text-ink-soft">{a.label}</span>
                  <span className={`font-medium ${a.loud ? "text-brand-red" : "text-ink"}`}>{a.count}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent payments */}
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Recent payments</p>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-ink-muted">No payments recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {recentPayments.map((p) => {
                const fee = p.fee_id ? feeById.get(p.fee_id) : undefined;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-ink-soft">
                      {fee?.student_name ?? "—"}
                      {p.method ? <span className="text-ink-muted"> · {p.method}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs text-ink tabular">{formatMoney(p.amount, fee?.currency ?? "MYR")}</span>
                      <span className="text-[11px] text-ink-muted">{p.paid_at?.slice(0, 10)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
