"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_LABEL,
  type Resource,
} from "@/lib/admin/resources-shared";
import { createResource, updateResource, deleteResource } from "@/app/admin/resources-actions";

const F = "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

/** Marketing materials, documents and agreements shown to agents (and staff).
 *  Admin/marketing manage the links here. */
export function ResourcesManager({ resources, canEdit }: { resources: Resource[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ label: "", url: "", category: "marketing" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Resources</p>
        {canEdit && (
          <button onClick={() => setAdding((o) => !o)} className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add resource
          </button>
        )}
      </div>

      {canEdit && adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-card border border-border-warm bg-paper p-3">
          <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Label
            <input value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Programme brochure" className={`mt-1 w-48 ${F}`} />
          </label>
          <label className="flex-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Link (URL)
            <input value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" className={`mt-1 w-full ${F}`} />
          </label>
          <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Category
            <select value={f.category} onChange={(e) => set("category", e.target.value)} className={`mt-1 ${F}`}>
              {RESOURCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <button
            disabled={pending || !f.label.trim() || !f.url.trim()}
            onClick={() => run(async () => { await createResource(f); setF({ label: "", url: "", category: "marketing" }); setAdding(false); })}
            className="rounded-md bg-brand-red px-3 py-2 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add"}
          </button>
          <button onClick={() => setAdding(false)} className="rounded-md border border-border-warm px-3 py-2 text-xs text-ink-muted hover:text-ink">Cancel</button>
        </div>
      )}

      {resources.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">No resources yet.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border-warm">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0">
              <div className="min-w-0">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 truncate text-sm font-medium text-ink hover:text-brand-red">
                  {r.label} <ExternalLink className="h-3 w-3 shrink-0 text-ink-muted" aria-hidden />
                </a>
                <p className="truncate text-[11px] text-ink-muted">{RESOURCE_CATEGORY_LABEL[r.category] ?? r.category}</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-2.5">
                  <button onClick={() => run(() => updateResource(r.id, { active: !r.active }))} className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${r.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}>
                    {r.active ? "Live" : "Off"}
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete "${r.label}" from the agent portal resources?`)) run(() => deleteResource(r.id)); }} aria-label="Delete" className="text-ink-muted hover:text-brand-red">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
