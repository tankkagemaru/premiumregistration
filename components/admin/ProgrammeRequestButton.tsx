"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X } from "lucide-react";
import type { EnglishOffering } from "@/lib/admin/english-offerings-shared";
import { createActionRequest } from "@/app/admin/request-actions";
import { Overlay } from "@/components/ui/Overlay";

const F = "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";
const LABEL = "mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";

/**
 * Marketing/admissions ask Academic to plan a programme or camp — a structured
 * request (which programme, preferred dates, headcount, notes) that lands in
 * Academic's Requests inbox so they can schedule an intake.
 */
export function ProgrammeRequestButton({ offerings }: { offerings: EnglishOffering[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    programme: offerings[0]?.name ?? "",
    start: "",
    headcount: "",
    notes: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.programme.trim()) { setErr("Pick a programme."); return; }
    start(async () => {
      const detail = [
        f.start ? `Preferred start: ${f.start}.` : "",
        f.headcount ? `Headcount: ${f.headcount}.` : "",
        f.notes.trim(),
      ].filter(Boolean).join(" ");
      await createActionRequest({
        toRole: "academic",
        type: "request",
        title: `Programme request — ${f.programme.trim()}`,
        detail: detail || undefined,
      });
      setOpen(false);
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <p className="text-xs font-medium text-status-present">
        Sent to Academic. ✓{" "}
        <button onClick={() => { setDone(false); setF({ programme: offerings[0]?.name ?? "", start: "", headcount: "", notes: "" }); }} className="font-normal text-ink-muted underline hover:text-ink">
          Request another
        </button>
      </p>
    );
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setErr(null); }}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink hover:bg-cream-50"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden /> Request a programme
      </button>

      {open && (
        <Overlay className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="Request a programme" className="relative z-10 w-full max-w-md rounded-card border border-border-warm bg-paper p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-serif text-xl text-ink">Request a programme</p>
                <p className="mt-0.5 text-xs text-ink-muted">Ask Academic to plan/schedule a class or camp.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={LABEL}>Programme</label>
                <select value={f.programme} onChange={(e) => set("programme", e.target.value)} className={F}>
                  {offerings.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                  <option value="Other">Other (describe below)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Preferred start</label>
                  <input type="date" value={f.start} onChange={(e) => set("start", e.target.value)} className={F} />
                </div>
                <div>
                  <label className={LABEL}>Headcount</label>
                  <input type="number" value={f.headcount} onChange={(e) => set("headcount", e.target.value)} placeholder="approx" className={F} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Notes</label>
                <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Who it's for, level, any specifics…" className={F} />
              </div>
              {err && <p className="text-xs text-brand-red">{err}</p>}
              <div className="flex gap-2">
                <button onClick={submit} disabled={pending} className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50">
                  {pending ? "Sending…" : "Send to Academic"}
                </button>
                <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink">Cancel</button>
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
