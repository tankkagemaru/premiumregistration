"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import {
  SCOPE_LABEL,
  BASIS_LABEL,
  RULE_SCOPES,
  RULE_BASES,
  RULE_TRACKS,
  RULE_CATEGORIES,
  CATEGORY_LABEL,
  BASE_FEE_TYPES,
  BASE_FEE_TYPE_LABEL,
  ruleValue,
  ruleTarget,
  type CommissionRule,
  type RuleScope,
} from "@/lib/admin/commission-rules-shared";
import {
  createCommissionRule,
  updateCommissionRule,
  toggleCommissionRule,
  deleteCommissionRule,
} from "@/app/admin/commission-rules-actions";

const F = "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

type RuleForm = {
  scope: RuleScope;
  label: string;
  subject_id: string;
  university: string;
  track: string;
  category: string;
  basis: string;
  rate: string;
  our_share_pct: string;
  min_students: string;
  base_amount: string;
  base_fee_type: string;
};

const BLANK_FORM: RuleForm = {
  scope: "agent_payout",
  label: "",
  subject_id: "",
  university: "",
  track: "",
  category: "",
  basis: "percent",
  rate: "",
  our_share_pct: "",
  min_students: "",
  base_amount: "",
  base_fee_type: "",
};

function formFromRule(r: CommissionRule): RuleForm {
  return {
    scope: r.scope,
    label: r.label ?? "",
    subject_id: r.subject_id ?? "",
    university: r.university ?? "",
    track: r.track ?? "",
    category: r.category ?? "",
    basis: r.basis,
    rate: r.rate != null ? String(r.rate) : "",
    our_share_pct: r.our_share_pct != null ? String(r.our_share_pct) : "",
    min_students: r.min_students != null ? String(r.min_students) : "",
    base_amount: r.base_amount != null ? String(r.base_amount) : "",
    base_fee_type: r.base_fee_type ?? "",
  };
}

export function CommissionRulesManager({
  rules,
  people,
}: {
  rules: CommissionRule[];
  people: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<RuleForm>(BLANK_FORM);
  const set = (k: keyof RuleForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const usesSubject = form.scope === "agent_payout" || form.scope === "handler_incentive";
  const usesUniversity = form.scope === "university_share";
  const usesTrack = form.scope === "consultant_markup" || form.scope === "university_share";

  function openAdd() {
    setForm(BLANK_FORM);
    setEditingId(null);
    setOpen(true);
  }
  function openEdit(r: CommissionRule) {
    setForm(formFromRule(r));
    setEditingId(r.id);
    setOpen(true);
  }
  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setForm(BLANK_FORM);
  }

  function submit() {
    const payload = {
      scope: form.scope,
      label: form.label || undefined,
      subject_id: form.subject_id || undefined,
      university: form.university || undefined,
      track: form.track || undefined,
      category: form.category || undefined,
      basis: form.basis,
      rate: form.rate ? Number(form.rate) : null,
      our_share_pct: form.our_share_pct ? Number(form.our_share_pct) : null,
      min_students: form.min_students ? Number(form.min_students) : null,
      base_amount: form.base_amount ? Number(form.base_amount) : null,
      base_fee_type:
        form.base_fee_type || (form.track === "english" ? "tuition" : undefined),
    };
    start(async () => {
      if (editingId) await updateCommissionRule(editingId, payload);
      else await createCommissionRule(payload);
      closeForm();
      router.refresh();
    });
  }

  const q = query.trim().toLowerCase();
  const shownRules = useMemo(
    () =>
      q
        ? rules.filter((r) =>
            `${r.label ?? ""} ${ruleTarget(r)} ${SCOPE_LABEL[r.scope] ?? r.scope} ${r.university ?? ""} ${r.track ?? ""}`
              .toLowerCase()
              .includes(q),
          )
        : rules,
    [rules, q],
  );
  const byScope = RULE_SCOPES.map((s) => ({ scope: s, list: shownRules.filter((r) => r.scope === s) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Commission rules
        </p>
        <div className="flex items-center gap-2">
          <div className="flex min-w-[180px] items-center gap-2 rounded-md border border-border-warm bg-paper px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rules…"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted/70"
            />
          </div>
          <button
            onClick={() => (open && !editingId ? closeForm() : openAdd())}
            className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add rule
          </button>
        </div>
      </div>

      {open && (
        <div className="rounded-card border border-border-warm bg-paper p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="col-span-2 text-xs font-medium text-ink-soft sm:col-span-1">
              Type
              <select value={form.scope} onChange={(e) => set("scope", e.target.value)} className={`mt-1 w-full ${F}`}>
                {RULE_SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft">
              Label
              <input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Kucing Oren — standard" className={`mt-1 w-full ${F}`} />
            </label>

            {usesSubject && (
              <label className="text-xs font-medium text-ink-soft">
                Person
                <select value={form.subject_id} onChange={(e) => set("subject_id", e.target.value)} className={`mt-1 w-full ${F}`}>
                  <option value="">Any / default</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </label>
            )}
            {usesUniversity && (
              <label className="text-xs font-medium text-ink-soft">
                University
                <input value={form.university} onChange={(e) => set("university", e.target.value)} placeholder="e.g. UPM" className={`mt-1 w-full ${F}`} />
              </label>
            )}
            {usesTrack && (
              <label className="text-xs font-medium text-ink-soft">
                Track
                <select value={form.track} onChange={(e) => set("track", e.target.value)} className={`mt-1 w-full ${F}`}>
                  <option value="">Any</option>
                  {RULE_TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            )}
            {usesUniversity && (
              <label className="text-xs font-medium text-ink-soft">
                Category
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={`mt-1 w-full ${F}`}>
                  <option value="">Any</option>
                  {RULE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
                </select>
              </label>
            )}

            <label className="text-xs font-medium text-ink-soft">
              Basis
              <select value={form.basis} onChange={(e) => set("basis", e.target.value)} className={`mt-1 w-full ${F}`}>
                {RULE_BASES.map((b) => <option key={b} value={b}>{BASIS_LABEL[b]}</option>)}
              </select>
            </label>
            {form.basis === "split" ? (
              <label className="text-xs font-medium text-ink-soft">
                Our share %
                <input type="number" value={form.our_share_pct} onChange={(e) => set("our_share_pct", e.target.value)} placeholder="30" className={`mt-1 w-full ${F}`} />
              </label>
            ) : (
              <label className="text-xs font-medium text-ink-soft">
                {form.basis === "fixed" ? "Amount (MYR)" : "Rate %"}
                <input type="number" value={form.rate} onChange={(e) => set("rate", e.target.value)} placeholder={form.basis === "fixed" ? "500" : "15"} className={`mt-1 w-full ${F}`} />
              </label>
            )}
            {form.basis === "percent" && (
              <>
                <label className="text-xs font-medium text-ink-soft">
                  Base fee (MYR)
                  <input type="number" value={form.base_amount} onChange={(e) => set("base_amount", e.target.value)} placeholder="e.g. 6000" className={`mt-1 w-full ${F}`} />
                </label>
                <label className="text-xs font-medium text-ink-soft">
                  Base is
                  <select value={form.base_fee_type} onChange={(e) => set("base_fee_type", e.target.value)} className={`mt-1 w-full ${F}`}>
                    <option value="">{form.track === "english" ? "Tuition only (default)" : "Any / full fee"}</option>
                    {BASE_FEE_TYPES.map((b) => <option key={b} value={b}>{BASE_FEE_TYPE_LABEL[b]}</option>)}
                  </select>
                </label>
              </>
            )}
            {usesSubject && (
              <label className="text-xs font-medium text-ink-soft">
                Tier: from N students
                <input type="number" value={form.min_students} onChange={(e) => set("min_students", e.target.value)} placeholder="optional" className={`mt-1 w-full ${F}`} />
              </label>
            )}
          </div>
          {form.track === "english" && form.basis === "percent" && (
            <p className="mt-2 text-xs text-ink-muted">
              English commission is paid on tuition only. The base fee is settable —
              adjust it for promotions or a lower/higher agent price.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              {pending ? "Saving…" : editingId ? "Save changes" : "Save rule"}
            </button>
            <button
              onClick={closeForm}
              className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules grouped by scope */}
      {byScope.map(({ scope, list }) =>
        list.length === 0 ? null : (
          <div key={scope}>
            <p className="mb-2 text-xs font-medium text-ink-soft">{SCOPE_LABEL[scope]}</p>
            <div className="overflow-hidden rounded-card border border-border-warm">
              {list.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {r.label || ruleTarget(r)}
                    </p>
                    <p className="truncate text-xs text-ink-muted">{ruleTarget(r)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs text-ink tabular">{ruleValue(r)}</span>
                    <button
                      onClick={() => start(async () => { await toggleCommissionRule(r.id, !r.active); router.refresh(); })}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${r.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}
                    >
                      {r.active ? "Active" : "Off"}
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      aria-label="Edit rule"
                      className="text-ink-muted hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      onClick={() => start(async () => { await deleteCommissionRule(r.id); router.refresh(); })}
                      aria-label="Delete rule"
                      className="text-ink-muted hover:text-brand-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      )}
      {shownRules.length === 0 && (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
          {rules.length === 0 ? "No commission rules yet." : "No rules match your search."}
        </p>
      )}
    </div>
  );
}
