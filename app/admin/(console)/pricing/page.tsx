import { requireRole } from "@/lib/auth";
import { listCommissionRules } from "@/lib/admin/commission-rules";
import { listBillableItems } from "@/lib/admin/billables";
import { listUsersPrivileged } from "@/lib/admin/users";
import { CommissionRulesManager } from "@/components/admin/CommissionRulesManager";
import { BillableItemsManager } from "@/components/admin/BillableItemsManager";

/**
 * Price list & commission rules — the finance catalogue. Lifted out of the
 * Finance fee console into its own sidebar destination so it's one click away
 * (it's reference data finance edits often, not a stage of the fee workflow).
 */
export default async function PricingPage() {
  await requireRole(["admin", "finance"]);
  const [rules, billables, people] = await Promise.all([
    listCommissionRules(),
    listBillableItems(true),
    // Privileged: finance can't read other profiles under RLS, but the
    // "Person" picker needs agents + handlers.
    listUsersPrivileged(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Finance
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Price list &amp; rules</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          The billable price list fees are created from, and the commission rules
          that drive how payouts and shares are calculated.
        </p>
      </div>

      <section>
        <BillableItemsManager items={billables} />
      </section>

      <section>
        <CommissionRulesManager
          rules={rules}
          people={people.map((p) => ({ id: p.id, full_name: p.full_name }))}
        />
        <p className="mt-2 text-xs text-ink-muted">
          Rules are the source of truth for how commission is calculated. Stage
          automation reads these to fill in accrued amounts.
        </p>
      </section>
    </div>
  );
}
