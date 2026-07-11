"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { stageLabel } from "@/lib/admin/applications-shared";
import {
  addUniversityChoice,
  selectUniversityChoice,
} from "@/app/admin/choice-actions";

const F =
  "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

export interface Choice {
  id: string;
  target_institution?: string | null;
  program_name?: string | null;
  stage: string;
  status: string;
}

/**
 * A student's university choices — one card per (university, program) application.
 * Admissions can add more (multiple universities and/or programs) and, once the
 * student decides, accept one (which marks the others not-selected).
 */
export function UniversityChoices({
  studentId,
  choices,
  role,
}: {
  studentId: string;
  choices: Choice[];
  role: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [institution, setInstitution] = useState("");
  const [program, setProgram] = useState("");
  const [qualification, setQualification] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canAdd = ["admin", "admissions", "marketing", "counsellor", "staff"].includes(role);
  const canSelect = ["admin", "admissions"].includes(role);
  const activeCount = choices.filter((c) => c.status === "active").length;

  function add() {
    setError(null);
    start(async () => {
      const res = await addUniversityChoice(studentId, { institution, program, qualification });
      if (!res.ok) { setError(res.error ?? "Failed."); return; }
      setInstitution(""); setProgram(""); setQualification(""); setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-border-warm bg-paper p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          University choices
        </p>
        {canAdd && !open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add choice
          </button>
        )}
      </div>

      {choices.length === 0 ? (
        <p className="text-sm text-ink-muted">No university choices yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {choices.map((c) => {
            const withdrawn = c.status === "withdrawn";
            const chosen = c.status === "active" && choices.length > 1 && activeCount === 1;
            return (
              <li
                key={c.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${
                  withdrawn ? "border-border-warm bg-cream-50 opacity-60" : "border-border-warm bg-paper"
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${withdrawn ? "text-ink-muted line-through" : "text-ink"}`}>
                    {c.target_institution ?? "University TBD"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {c.program_name ?? "Program TBD"} · {stageLabel(c.stage, "university")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {withdrawn ? (
                    <span className="text-[11px] font-medium text-ink-muted">Not selected</span>
                  ) : chosen ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-status-present-bg px-2 py-0.5 text-[11px] font-medium text-status-present">
                      <Check className="h-3 w-3" aria-hidden /> Chosen
                    </span>
                  ) : (
                    canSelect && activeCount > 1 && (
                      <button
                        disabled={pending}
                        onClick={() => start(async () => { await selectUniversityChoice(c.id); router.refresh(); })}
                        className="rounded-md border border-border-warm bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-50 disabled:opacity-50"
                      >
                        Accept this
                      </button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-border-warm bg-cream-50 p-3">
          <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="University" className={F} />
          <div className="grid grid-cols-2 gap-2">
            <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Program" className={F} />
            <input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="Level (optional)" className={F} />
          </div>
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={add}
              className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add choice"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
