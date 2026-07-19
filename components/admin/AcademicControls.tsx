"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ListChecks, ChevronDown } from "lucide-react";
import { ENGLISH_CLASS_TASKS } from "@/lib/admin/applications-shared";
import {
  setClassDates,
  setClassChecklist,
  advanceApplicationStage,
} from "@/app/admin/application-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none focus:border-brand-red";

/** Editable class dates + a fee-gated "Mark enrolled" button. */
export function AcademicControls({
  appId,
  classStart,
  classEnd,
  stage,
  feeCleared,
  isInternational = false,
  passIssued = false,
  checklist,
}: {
  appId: string;
  classStart: string | null;
  classEnd: string | null;
  stage: string;
  feeCleared: boolean;
  isInternational?: boolean;
  passIssued?: boolean;
  checklist?: Record<string, boolean> | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(classStart ?? "");
  const [e, setE] = useState(classEnd ?? "");
  const [prepOpen, setPrepOpen] = useState(false);
  const [enrolErr, setEnrolErr] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Record<string, boolean>>(checklist ?? {});
  const dirty = s !== (classStart ?? "") || e !== (classEnd ?? "");
  // An international student can only be enrolled once the student pass is
  // issued — enrolling from Offer would skip the entire visa lane.
  const visaBlocked = isInternational && !passIssued;
  const canEnrol = feeCleared && ["offer", "visa"].includes(stage);
  const doneCount = ENGLISH_CLASS_TASKS.filter((t) => tasks[t.key]).length;

  const toggle = (key: string) => {
    const next = { ...tasks, [key]: !tasks[key] };
    setTasks(next);
    start(async () => { await setClassChecklist(appId, next); router.refresh(); });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={s} onChange={(ev) => setS(ev.target.value)} className={F} aria-label="Class start" />
        <span className="text-ink-muted">→</span>
        <input type="date" value={e} onChange={(ev) => setE(ev.target.value)} className={F} aria-label="Class end" />
        {dirty && (
          <button
            disabled={pending}
            onClick={() => start(async () => { await setClassDates(appId, s || null, e || null); router.refresh(); })}
            className="rounded-md bg-inkbtn px-2.5 py-1 text-xs font-medium text-oncolor hover:bg-inkbtn-soft disabled:opacity-50"
          >
            Save
          </button>
        )}
        {canEnrol && (
          <button
            disabled={pending || visaBlocked}
            title={visaBlocked ? "Waiting on the student pass — the visa case must reach Done first" : undefined}
            onClick={() =>
              start(async () => {
                setEnrolErr(null);
                const r = await advanceApplicationStage(appId, "enrolled");
                if (r && !r.ok) { setEnrolErr(r.error ?? "Blocked by the stage gate."); return; }
                router.refresh();
              })
            }
            className="inline-flex items-center gap-1 rounded-md bg-brand-red px-2.5 py-1 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
          >
            <Check className="h-3 w-3" aria-hidden />
            Mark enrolled
          </button>
        )}
        {visaBlocked && canEnrol && (
          <span className="text-[10px] text-ink-muted">waiting on student pass</span>
        )}
      </div>
      {enrolErr && <p className="text-[11px] text-brand-red">{enrolErr}</p>}

      {/* Class prep checklist */}
      <div>
        <button
          onClick={() => setPrepOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-ink"
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden />
          Class prep {doneCount}/{ENGLISH_CLASS_TASKS.length}
          <ChevronDown className={`h-3 w-3 transition-transform ${prepOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {prepOpen && (
          <div className="mt-1 flex flex-col gap-1 rounded-md border border-border-warm bg-cream-50/60 p-2">
            {ENGLISH_CLASS_TASKS.map((t) => (
              <label key={t.key} className="flex cursor-pointer items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={!!tasks[t.key]}
                  onChange={() => toggle(t.key)}
                  className="h-3.5 w-3.5 rounded border-border-warm text-brand-red"
                />
                {t.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
