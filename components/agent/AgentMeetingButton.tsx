"use client";

import { useState, useTransition } from "react";
import { CalendarClock, X } from "lucide-react";
import { requestAgentMeeting } from "@/app/agent/actions";

const F = "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";
const LABEL = "mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";

/** Agent requests a meeting to discuss a special programme / arrangement. */
export function AgentMeetingButton() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ topic: "", preferred: "", note: "" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.topic.trim()) { setErr("What's it about?"); return; }
    start(async () => {
      const r = await requestAgentMeeting({ topic: f.topic, preferred: f.preferred || undefined, note: f.note || undefined });
      if (!r.ok) { setErr("Couldn't send — try again."); return; }
      setOpen(false); setDone(true);
    });
  }

  if (done) {
    return (
      <p className="text-xs font-medium text-status-present">
        Requested — the office will be in touch. ✓{" "}
        <button onClick={() => { setDone(false); setF({ topic: "", preferred: "", note: "" }); }} className="font-normal text-ink-muted underline hover:text-ink">
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
        <CalendarClock className="h-4 w-4" aria-hidden /> Request a meeting
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="Request a meeting" className="relative z-10 w-full max-w-md rounded-card border border-border-warm bg-paper p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-serif text-xl text-ink">Request a meeting</p>
                <p className="mt-0.5 text-xs text-ink-muted">Discuss a special programme or arrangement with the office.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={LABEL}>What&apos;s it about?</label>
                <input value={f.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. a special corporate English programme" className={F} />
              </div>
              <div>
                <label className={LABEL}>Preferred time (optional)</label>
                <input value={f.preferred} onChange={(e) => set("preferred", e.target.value)} placeholder="e.g. next week, weekday afternoon" className={F} />
              </div>
              <div>
                <label className={LABEL}>Notes (optional)</label>
                <textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={3} placeholder="Anything to prepare…" className={F} />
              </div>
              {err && <p className="text-xs text-brand-red">{err}</p>}
              <div className="flex gap-2">
                <button onClick={submit} disabled={pending} className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50">
                  {pending ? "Sending…" : "Send request"}
                </button>
                <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
