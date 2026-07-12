"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, Search } from "lucide-react";
import type { BillableItem } from "@/lib/admin/billables-shared";
import { BILLABLE_CATEGORIES, BILLABLE_CATEGORY_LABEL } from "@/lib/admin/billables-shared";
import { FEE_TYPE_LABEL, formatMoney, type FeeType } from "@/lib/admin/finance-shared";
import {
  createBillableItem,
  updateBillableItem,
  deleteBillableItem,
} from "@/app/admin/billables-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";
const FEE_TYPES = Object.keys(FEE_TYPE_LABEL) as FeeType[];

interface Draft {
  name: string;
  category: string;
  fee_type: string;
  default_amount: string;
  taxable: boolean;
  commissionable: boolean;
}

const EMPTY: Draft = { name: "", category: "misc", fee_type: "other", default_amount: "", taxable: false, commissionable: false };

function ItemForm({
  initial,
  saving,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: Draft;
  saving: boolean;
  saveLabel: string;
  onSave: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Draft>(initial);
  const set = (k: keyof Draft, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="rounded-card border border-border-warm bg-paper p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="col-span-2 text-xs font-medium text-ink-soft">
          Item name
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Resource fee" className={`mt-1 w-full ${F}`} />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Category
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={`mt-1 w-full ${F}`}>
            {BILLABLE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Fee type
          <select value={form.fee_type} onChange={(e) => set("fee_type", e.target.value)} className={`mt-1 w-full ${F}`}>
            {FEE_TYPES.map((t) => <option key={t} value={t}>{FEE_TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Default amount (MYR)
          <input type="number" value={form.default_amount} onChange={(e) => set("default_amount", e.target.value)} placeholder="blank = set per student" className={`mt-1 w-full ${F}`} />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
          <input type="checkbox" checked={form.taxable} onChange={(e) => set("taxable", e.target.checked)} className="h-4 w-4 rounded border-border-warm text-brand-red" />
          Taxable
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
          <input type="checkbox" checked={form.commissionable} onChange={(e) => set("commissionable", e.target.checked)} className="h-4 w-4 rounded border-border-warm text-brand-red" />
          Counts for commission
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {saving ? "Saving…" : saveLabel}
        </button>
        <button onClick={onCancel} className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** The price list fees are created from. Finance/admin manage it. */
export function BillableItemsManager({ items }: { items: BillableItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const run = (fn: () => Promise<unknown>) =>
    start(async () => { await fn(); router.refresh(); });

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      items.filter((i) => {
        if (cat !== "all" && (i.category ?? "misc") !== cat) return false;
        if (!q) return true;
        return `${i.name} ${FEE_TYPE_LABEL[i.fee_type as FeeType] ?? i.fee_type} ${BILLABLE_CATEGORY_LABEL[i.category] ?? ""}`
          .toLowerCase()
          .includes(q);
      }),
    [items, q, cat],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Billable items
        </p>
        <div className="flex items-center gap-2">
          <div className="flex min-w-[180px] items-center gap-2 rounded-md border border-border-warm bg-paper px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted/70"
            />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${F} text-xs`} aria-label="Filter by category">
            <option value="all">All categories</option>
            {BILLABLE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button
            onClick={() => { setAdding((o) => !o); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add item
          </button>
        </div>
      </div>

      {adding && (
        <ItemForm
          initial={EMPTY}
          saving={pending}
          saveLabel="Add item"
          onCancel={() => setAdding(false)}
          onSave={(d) =>
            run(async () => {
              await createBillableItem({
                name: d.name,
                category: d.category,
                fee_type: d.fee_type,
                default_amount: d.default_amount ? Number(d.default_amount) : null,
                taxable: d.taxable,
                commissionable: d.commissionable,
              });
              setAdding(false);
            })
          }
        />
      )}

      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
          No billable items yet — add the price list here.
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
          No items match your search.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border-warm">
          {shown.map((i) =>
            editingId === i.id ? (
              <div key={i.id} className="border-b border-border-warm/60 p-2 last:border-0">
                <ItemForm
                  initial={{
                    name: i.name,
                    category: i.category ?? "misc",
                    fee_type: i.fee_type,
                    default_amount: i.default_amount != null ? String(i.default_amount) : "",
                    taxable: i.taxable,
                    commissionable: i.commissionable,
                  }}
                  saving={pending}
                  saveLabel="Save changes"
                  onCancel={() => setEditingId(null)}
                  onSave={(d) =>
                    run(async () => {
                      await updateBillableItem(i.id, {
                        name: d.name,
                        category: d.category,
                        fee_type: d.fee_type,
                        default_amount: d.default_amount ? Number(d.default_amount) : null,
                        taxable: d.taxable,
                        commissionable: d.commissionable,
                      });
                      setEditingId(null);
                    })
                  }
                />
              </div>
            ) : (
              <div key={i.id} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {i.name}
                    <span className="ml-1.5 rounded bg-cream-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink-muted">
                      {BILLABLE_CATEGORY_LABEL[i.category] ?? i.category ?? "misc"}
                    </span>
                    {i.taxable && <span className="ml-1.5 text-[10px] uppercase text-ink-muted">tax</span>}
                    {i.commissionable && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] uppercase text-brand-gold">
                        <Check className="h-3 w-3" aria-hidden /> comm
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {FEE_TYPE_LABEL[i.fee_type as FeeType] ?? i.fee_type}
                    {" · "}
                    {i.default_amount != null ? formatMoney(i.default_amount, i.currency) : "amount set per student"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <button
                    onClick={() => { setEditingId(i.id); setAdding(false); }}
                    aria-label="Edit item"
                    className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-paper px-2 py-1 text-[11px] font-medium text-ink hover:bg-cream-50"
                  >
                    <Pencil className="h-3 w-3" aria-hidden /> Edit
                  </button>
                  <button
                    onClick={() => run(() => updateBillableItem(i.id, { active: !i.active }))}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${i.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}
                  >
                    {i.active ? "Active" : "Off"}
                  </button>
                  <button
                    onClick={() => run(() => deleteBillableItem(i.id))}
                    aria-label="Delete item"
                    className="text-ink-muted hover:text-brand-red"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
      <p className="text-xs text-ink-muted">
        Fees are added to a student from this list (application drawer → Fees →
        Add fee), so pricing stays consistent.
      </p>
    </div>
  );
}
