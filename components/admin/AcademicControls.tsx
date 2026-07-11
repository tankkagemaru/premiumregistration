"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  setClassDates,
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
}: {
  appId: string;
  classStart: string | null;
  classEnd: string | null;
  stage: string;
  feeCleared: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(classStart ?? "");
  const [e, setE] = useState(classEnd ?? "");
  const dirty = s !== (classStart ?? "") || e !== (classEnd ?? "");
  const canEnrol = feeCleared && ["offer", "visa"].includes(stage);

  return (
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
          disabled={pending}
          onClick={() => start(async () => { await advanceApplicationStage(appId, "enrolled"); router.refresh(); })}
          className="inline-flex items-center gap-1 rounded-md bg-brand-red px-2.5 py-1 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          <Check className="h-3 w-3" aria-hidden />
          Mark enrolled
        </button>
      )}
    </div>
  );
}
