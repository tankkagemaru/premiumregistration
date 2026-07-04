"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X, Pencil, Search } from "lucide-react";
import type { Institution, Program } from "@/lib/admin/catalog-shared";
import { INSTITUTION_CATEGORIES } from "@/lib/admin/catalog-shared";
import { INSTITUTION_GROUP_LABELS } from "@/lib/config/universities";
import {
  createInstitution,
  updateInstitution,
  deleteInstitution,
  createProgram,
  updateProgram,
  deleteProgram,
} from "@/app/admin/catalog-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";
const catLabel = (c: string) =>
  (INSTITUTION_GROUP_LABELS as Record<string, string>)[c] ?? c;

/** Small inline label editor shared by both lists. */
function RenameCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="group inline-flex items-center gap-1.5 text-left text-sm text-ink hover:text-brand-red"
      >
        {value}
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" aria-hidden />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={`w-56 max-w-full ${F}`}
      />
      <button
        onClick={() => { if (draft.trim()) onSave(draft.trim()); setEditing(false); }}
        aria-label="Save"
        className="text-status-present hover:opacity-80"
      >
        <Check className="h-4 w-4" aria-hidden />
      </button>
      <button onClick={() => setEditing(false)} aria-label="Cancel" className="text-ink-muted hover:text-ink">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </span>
  );
}

export function CatalogManager({
  institutions,
  programs,
}: {
  institutions: Institution[];
  programs: Program[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  // program add
  const [progLabel, setProgLabel] = useState("");
  // institution add
  const [instLabel, setInstLabel] = useState("");
  const [instCat, setInstCat] = useState<string>("private");
  const [instPartner, setInstPartner] = useState(false);
  // institution search
  const [q, setQ] = useState("");

  const shown = q
    ? institutions.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
    : institutions;

  return (
    <div className="flex flex-col gap-10">
      {/* Programs */}
      <section className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          English programs
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={progLabel}
            onChange={(e) => setProgLabel(e.target.value)}
            placeholder="New program name"
            className={`w-56 ${F}`}
          />
          <button
            onClick={() => progLabel.trim() && run(async () => { await createProgram({ label: progLabel }); setProgLabel(""); })}
            className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
        </div>
        <div className="overflow-hidden rounded-card border border-border-warm">
          {programs.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0">
              <RenameCell value={p.label} onSave={(v) => run(() => updateProgram(p.id, { label: v }))} />
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => run(() => updateProgram(p.id, { active: !p.active }))}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${p.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}
                >
                  {p.active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => run(() => deleteProgram(p.id))} aria-label="Delete" className="text-ink-muted hover:text-brand-red">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Institutions */}
      <section className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Partner universities &amp; institutions
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={instLabel}
            onChange={(e) => setInstLabel(e.target.value)}
            placeholder="New institution name"
            className={`w-64 ${F}`}
          />
          <select value={instCat} onChange={(e) => setInstCat(e.target.value)} className={F}>
            {INSTITUTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>{catLabel(c)}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <input type="checkbox" checked={instPartner} onChange={(e) => setInstPartner(e.target.checked)} className="h-4 w-4 rounded border-border-warm text-brand-red" />
            Partner
          </label>
          <button
            onClick={() => instLabel.trim() && run(async () => { await createInstitution({ label: instLabel, category: instCat, partner: instPartner }); setInstLabel(""); setInstPartner(false); })}
            className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border-warm bg-paper px-3 py-2">
          <Search className="h-4 w-4 text-ink-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${institutions.length} institutions…`}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
          />
        </div>

        <div className="max-h-[28rem] overflow-y-auto rounded-card border border-border-warm">
          {shown.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0">
              <div className="min-w-0">
                <RenameCell value={i.label} onSave={(v) => run(() => updateInstitution(i.id, { label: v }))} />
                <p className="text-[11px] text-ink-muted">{catLabel(i.category)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  onClick={() => run(() => updateInstitution(i.id, { partner: !i.partner }))}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${i.partner ? "bg-brand-red/15 text-brand-red" : "bg-cream-50 text-ink-muted"}`}
                >
                  {i.partner ? "Partner" : "—"}
                </button>
                <button
                  onClick={() => run(() => updateInstitution(i.id, { active: !i.active }))}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${i.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}
                >
                  {i.active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => run(() => deleteInstitution(i.id))} aria-label="Delete" className="text-ink-muted hover:text-brand-red">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">No matches.</p>
          )}
        </div>
      </section>
    </div>
  );
}
