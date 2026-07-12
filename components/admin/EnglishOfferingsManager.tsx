"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import {
  OFFERING_KINDS,
  OFFERING_KIND_LABEL,
  type EnglishOffering,
} from "@/lib/admin/english-offerings-shared";
import {
  createEnglishOffering,
  updateEnglishOffering,
  deleteEnglishOffering,
} from "@/app/admin/english-offerings-actions";

const F = "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

/**
 * The English programmes Academic makes available to offer (PEP, Exam Prep,
 * Summer Camp, Special Cohort, …). Drives the intake calendar's programme
 * options and what marketing/admissions can advise. Academic/admin edit.
 */
export function EnglishOfferingsManager({ offerings, canEdit }: { offerings: EnglishOffering[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", kind: "other", default_days: "" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className="rounded-card border border-border-warm bg-paper">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Programme offerings <span className="text-ink-soft">· {offerings.filter((o) => o.active).length} active</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div className="border-t border-border-warm px-4 py-3">
          <p className="mb-2 text-xs text-ink-muted">
            What English programmes are available to schedule &amp; advise. Turn one off to hide it from the intake calendar.
          </p>
          <div className="flex flex-col divide-y divide-border-warm/50">
            {offerings.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="text-ink">{o.name}</span>
                  <span className="ml-2 text-[11px] text-ink-muted">
                    {OFFERING_KIND_LABEL[o.kind] ?? o.kind}
                    {o.default_days ? ` · ${o.default_days} days` : ""}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button
                      onClick={() => run(() => updateEnglishOffering(o.id, { active: !o.active }))}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${o.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}
                    >
                      {o.active ? "On offer" : "Off"}
                    </button>
                    <button onClick={() => run(() => deleteEnglishOffering(o.id))} aria-label="Delete" className="text-ink-muted hover:text-brand-red">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {canEdit && (adding ? (
            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-border-warm bg-cream-50/60 p-2.5">
              <label className="flex-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Name
                <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Special Cohort" className={`mt-1 w-full ${F}`} />
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Type
                <select value={f.kind} onChange={(e) => set("kind", e.target.value)} className={`mt-1 ${F}`}>
                  {OFFERING_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Default days
                <input type="number" value={f.default_days} onChange={(e) => set("default_days", e.target.value)} placeholder="30" className={`mt-1 w-24 ${F}`} />
              </label>
              <button
                disabled={pending || !f.name.trim()}
                onClick={() => run(async () => {
                  await createEnglishOffering({ name: f.name, kind: f.kind, default_days: f.default_days ? Number(f.default_days) : null });
                  setF({ name: "", kind: "other", default_days: "" }); setAdding(false);
                })}
                className="rounded-md bg-brand-red px-3 py-2 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add"}
              </button>
              <button onClick={() => setAdding(false)} className="rounded-md border border-border-warm px-3 py-2 text-xs text-ink-muted hover:text-ink">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-red hover:underline">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add offering
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
