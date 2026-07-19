import { requireRole } from "@/lib/auth";
import {
  listFees,
  listPayments,
  listCommissions,
  paidTowards,
  formatMoney,
  FEE_TYPE_LABEL,
  FEE_STATUS_LABEL,
  COMMISSION_MILESTONE_LABEL,
  type FeeStatus,
} from "@/lib/admin/finance";
import { getFxRates, toMYR, CURRENCIES } from "@/lib/admin/fx";
import { SearchBox } from "@/components/admin/SearchBox";
import { StageTabs, type StageTab } from "@/components/admin/StageTabs";
import {
  FeeStatusSelect,
  FeeAmountControl,
  CommissionStatusSelect,
  CommissionAmountControl,
  CommissionClaimControl,
} from "@/components/admin/FinanceControls";
import { InvoiceAttach } from "@/components/admin/InvoiceAttach";
import { PaymentControl } from "@/components/admin/PaymentControl";
import { StudentNameButton } from "@/components/admin/StudentDetailModal";

const FEE_BADGE: Record<FeeStatus, string> = {
  unpaid: "bg-brand-red-bg text-brand-red",
  partial: "bg-status-late-bg text-brand-gold",
  paid: "bg-status-present-bg text-status-present",
  waived: "bg-cream-50 text-ink-muted border border-border-warm",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border-warm bg-paper px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-ink tabular">{value}</p>
    </div>
  );
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin", "finance"]);
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.toLowerCase();

  const [allFees, payments, allCommissions, fx] = await Promise.all([
    listFees(),
    listPayments(),
    listCommissions(),
    getFxRates(),
  ]);
  // Broad fee search — student, fee type, custom label, status, amount, currency —
  // so a specific fee is easy to find among many.
  const fees = q
    ? allFees.filter((f) =>
        `${f.student_name} ${FEE_TYPE_LABEL[f.type]} ${f.label ?? ""} ${f.status} ${f.amount} ${f.currency}`
          .toLowerCase()
          .includes(q),
      )
    : allFees;
  const commissions = q
    ? allCommissions.filter((c) =>
        `${c.student_name} ${c.agent_name ?? ""}`.toLowerCase().includes(q),
      )
    : allCommissions;

  // Totals are reported in MYR — each fee/commission is converted from its own
  // currency at the live rate (some universities bill in USD, etc.).
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = fees
    .filter((f) => f.status === "unpaid" || f.status === "partial")
    .reduce((s, f) => s + toMYR(Math.max(0, f.amount - paidTowards(f, payments)), f.currency, fx), 0);
  const payable = commissions
    .filter((c) => c.direction === "payable" && c.status !== "paid")
    .reduce((s, c) => s + toMYR(c.amount ?? 0, c.currency, fx), 0);
  const receivable = commissions
    .filter((c) => c.direction === "receivable" && c.status !== "paid")
    .reduce((s, c) => s + toMYR(c.amount ?? 0, c.currency, fx), 0);

  // Stage tabs.
  const stage = (Array.isArray(sp.stage) ? sp.stage[0] : sp.stage) ?? "outstanding";
  const outstandingFees = fees.filter((f) => f.status === "unpaid" || f.status === "partial");
  const paidFees = fees.filter((f) => f.status === "paid" || f.status === "waived");
  const feeRows = stage === "paid" ? paidFees : outstandingFees;
  const tabs: StageTab[] = [
    { id: "outstanding", label: "Outstanding", attention: true, count: outstandingFees.length },
    { id: "paid", label: "Paid", count: paidFees.length },
    { id: "commissions", label: "Commissions", count: commissions.length },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Finance
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">
            Fees &amp; commission
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Log each payment received against its fee — collections themselves
            happen through the bank as usual.
          </p>
        </div>
        <SearchBox placeholder="Search fee — student, type, status, amount…" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Collected" value={formatMoney(collected)} />
        <Stat label="Outstanding" value={formatMoney(outstanding)} />
        <Stat label="Commission payable" value={formatMoney(payable)} />
        <Stat label="Commission receivable" value={formatMoney(receivable)} />
      </div>
      <p className="-mt-4 text-[11px] text-ink-muted">
        Totals in MYR{" "}
        {fx.live ? "· converted at live rates" : "· FX unavailable, showing raw amounts"}.
      </p>

      <StageTabs tabs={tabs} active={stage} />

      {/* Fees — Outstanding / Paid */}
      {(stage === "outstanding" || stage === "paid") && (
      <section>
        <div className="overflow-x-auto rounded-card border border-border-warm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Student</th>
                <th className="px-4 py-2.5 font-medium">Fee</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 text-right font-medium">Received</th>
                <th className="px-4 py-2.5 font-medium">Due</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {feeRows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-muted">No fees in this view.</td></tr>
              )}
              {feeRows.map((f) => (
                <tr key={f.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                  <td className="px-4 py-3">
                    <StudentNameButton applicationId={f.application_id} name={f.student_name} viewer="finance" />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {FEE_TYPE_LABEL[f.type]}
                    {f.label && f.label !== FEE_TYPE_LABEL[f.type] ? ` · ${f.label}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FeeAmountControl
                      id={f.id}
                      amount={f.amount}
                      currency={f.currency}
                      currencies={CURRENCIES}
                      myrEquivalent={toMYR(f.amount, f.currency, fx)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-ink-soft tabular">
                    {formatMoney(paidTowards(f, payments), f.currency)}
                    {paidTowards(f, payments) > f.amount && f.amount > 0 && (
                      <span className="ms-1.5 inline-flex rounded bg-brand-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-gold">
                        over-received
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {f.due_date ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${FEE_BADGE[f.status]}`}>
                        {FEE_STATUS_LABEL[f.status] ?? f.status}
                      </span>
                      <FeeStatusSelect id={f.id} status={f.status} />
                    </div>
                    {f.status === "waived" && f.waive_reason && (
                      <p className="mt-1 text-[11px] text-ink-muted">Waived — {f.waive_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PaymentControl applicationId={f.application_id} feeId={f.id} amount={f.amount} />
                      <InvoiceAttach
                        feeId={f.id}
                        applicationId={f.application_id}
                        invoiceDocId={f.invoice_doc_id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Commissions */}
      {stage === "commissions" && (
      <section>
        <div className="overflow-x-auto rounded-card border border-border-warm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Partner</th>
                <th className="px-4 py-2.5 font-medium">Student</th>
                <th className="px-4 py-2.5 font-medium">Direction</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Milestone</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{c.agent_name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    <StudentNameButton applicationId={c.application_id} name={c.student_name} viewer="finance" />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        c.direction === "payable"
                          ? "bg-brand-red-bg text-brand-red"
                          : "bg-status-present-bg text-status-present"
                      }`}
                    >
                      {c.direction === "payable" ? "We pay" : "We receive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CommissionAmountControl
                      id={c.id}
                      amount={c.amount}
                      base={c.base_amount}
                      currency={c.currency}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {COMMISSION_MILESTONE_LABEL[c.milestone] ?? c.milestone.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <CommissionStatusSelect id={c.id} status={c.status} />
                      {c.direction === "payable" && (
                        <CommissionClaimControl
                          id={c.id}
                          claimReady={Boolean(c.claim_ready)}
                          claimInvoiceDocId={c.claim_invoice_doc_id}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

    </div>
  );
}
