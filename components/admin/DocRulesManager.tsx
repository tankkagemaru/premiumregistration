"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  DOC_APPLIES_TO,
  DOC_LEVELS,
  DOC_STAGES,
  DOC_APPLIES_LABEL,
  DOC_LEVEL_LABEL,
  type DocRule,
} from "@/lib/admin/doc-rules-shared";
import { DOC_KIND_LABEL } from "@/lib/config/documents";
import {
  createDocRule,
  updateDocRule,
  deleteDocRule,
} from "@/app/admin/doc-rules-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";
const TRACKS = ["english", "university", "corporate"];

interface RuleDraft {
  label: string;
  kind: string;
  applies_to: string;
  track: string;
  level: string;
  stage: string;
  nationality: string;
  optional: boolean;
  note: string;
}

const EMPTY: RuleDraft = {
  label: "",
  kind: "",
  applies_to: "all",
  track: "",
  level: "",
  stage: "application",
  nationality: "",
  optional: false,
  note: "",
};

function draftFrom(r: DocRule): RuleDraft {
  return {
    label: r.label,
    kind: r.kind,
    applies_to: r.applies_to,
    track: r.track ?? "",
    level: r.level ?? "",
    stage: r.stage,
    nationality: r.nationality ?? "",
    optional: r.optional,
    note: r.note ?? "",
  };
}

/** Shared form for adding a rule and editing an existing one. */
function RuleForm({
  initial,
  saving,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: RuleDraft;
  saving: boolean;
  saveLabel: string;
  onSave: (draft: RuleDraft) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RuleDraft>(initial);
  const set = (k: keyof RuleDraft, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-card border border-border-warm bg-paper p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="col-span-2 text-xs font-medium text-ink-soft sm:col-span-1">
          Document name
          <input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Bank statement" className={`mt-1 w-full ${F}`} />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Kind (key)
          <input list="doc-kinds" value={form.kind} onChange={(e) => set("kind", e.target.value)} placeholder="e.g. financial" className={`mt-1 w-full ${F}`} />
          <datalist id="doc-kinds">
            {Object.keys(DOC_KIND_LABEL).map((k) => <option key={k} value={k} />)}
          </datalist>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Applies to
          <select value={form.applies_to} onChange={(e) => set("applies_to", e.target.value)} className={`mt-1 w-full ${F}`}>
            {DOC_APPLIES_TO.map((a) => <option key={a} value={a}>{DOC_APPLIES_LABEL[a]}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Track
          <select value={form.track} onChange={(e) => set("track", e.target.value)} className={`mt-1 w-full ${F}`}>
            <option value="">Any</option>
            {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Level (university)
          <select value={form.level} onChange={(e) => set("level", e.target.value)} className={`mt-1 w-full ${F}`}>
            <option value="">Any</option>
            {DOC_LEVELS.map((l) => <option key={l} value={l}>{DOC_LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Stage
          <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={`mt-1 w-full ${F}`}>
            {DOC_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Nationality code
          <input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="any — or e.g. ng" className={`mt-1 w-full ${F}`} />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Note
          <input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="optional hint" className={`mt-1 w-full ${F}`} />
        </label>
        <label className="flex items-center gap-2 self-end text-xs font-medium text-ink-soft">
          <input type="checkbox" checked={form.optional} onChange={(e) => set("optional", e.target.checked)} className="h-4 w-4 rounded border-border-warm text-brand-red" />
          Optional
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.label.trim() || !form.kind.trim()}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {saving ? "Saving…" : saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Human summary of a rule's conditions. */
function conditions(r: DocRule): string {
  return [
    r.track ?? "any track",
    r.level ? DOC_LEVEL_LABEL[r.level] : null,
    DOC_APPLIES_LABEL[r.applies_to] ?? r.applies_to,
    r.nationality ? r.nationality.toUpperCase() : null,
    r.stage === "visa" ? "visa stage" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function DocRulesManager({ rules }: { rules: DocRule[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => { await fn(); router.refresh(); });

  const byStage = DOC_STAGES.map((s) => ({ stage: s, list: rules.filter((r) => r.stage === s) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Document requirements
        </p>
        <button
          onClick={() => { setAdding((o) => !o); setEditingId(null); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add requirement
        </button>
      </div>

      {adding && (
        <RuleForm
          initial={EMPTY}
          saving={pending}
          saveLabel="Save requirement"
          onCancel={() => setAdding(false)}
          onSave={(d) =>
            run(async () => {
              await createDocRule({
                label: d.label,
                kind: d.kind,
                applies_to: d.applies_to,
                track: d.track || undefined,
                level: d.level || undefined,
                stage: d.stage,
                nationality: d.nationality || undefined,
                optional: d.optional,
                note: d.note || undefined,
              });
              setAdding(false);
            })
          }
        />
      )}

      {byStage.map(({ stage, list }) =>
        list.length === 0 ? null : (
          <div key={stage}>
            <p className="mb-2 text-xs font-medium text-ink-soft">
              {stage === "visa" ? "Visa / EMGS stage" : "Application stage"}
            </p>
            <div className="overflow-hidden rounded-card border border-border-warm">
              {list.map((r) =>
                editingId === r.id ? (
                  <div key={r.id} className="border-b border-border-warm/60 p-2 last:border-0">
                    <RuleForm
                      initial={draftFrom(r)}
                      saving={pending}
                      saveLabel="Save changes"
                      onCancel={() => setEditingId(null)}
                      onSave={(d) =>
                        run(async () => {
                          await updateDocRule(r.id, {
                            label: d.label,
                            kind: d.kind,
                            applies_to: d.applies_to,
                            track: d.track || null,
                            level: d.level || null,
                            stage: d.stage,
                            nationality: d.nationality || null,
                            optional: d.optional,
                            note: d.note || null,
                          });
                          setEditingId(null);
                        })
                      }
                    />
                  </div>
                ) : (
                  <div key={r.id} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {r.label}
                        {r.optional && <span className="ml-1.5 text-[10px] uppercase text-ink-muted">optional</span>}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{conditions(r)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <button
                        onClick={() => { setEditingId(r.id); setAdding(false); }}
                        aria-label="Edit rule"
                        className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-paper px-2 py-1 text-[11px] font-medium text-ink hover:bg-cream-50"
                      >
                        <Pencil className="h-3 w-3" aria-hidden /> Edit
                      </button>
                      <button
                        onClick={() => run(() => updateDocRule(r.id, { active: !r.active }))}
                        title={r.active ? "Shown to students — click to hide" : "Hidden from students — click to show"}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${r.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}
                      >
                        {r.active ? "Shown" : "Hidden"}
                      </button>
                      <button onClick={() => run(() => deleteDocRule(r.id))} aria-label="Delete" className="text-ink-muted hover:text-brand-red">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
