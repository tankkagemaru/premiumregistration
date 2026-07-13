"use client";

import { useState, useTransition } from "react";
import { CalendarClock, X } from "lucide-react";
import { requestAgentMeeting } from "@/app/agent/actions";
import { CONSOLE_STR, type ConsoleLang } from "@/lib/admin/console-i18n-shared";

const F = "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";
const LABEL = "mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";

/** Agent requests a meeting to discuss a special programme / arrangement. */
export function AgentMeetingButton({ lang = "en" }: { lang?: ConsoleLang }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ topic: "", preferred: "", note: "" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const L = CONSOLE_STR[lang];

  function submit() {
    if (!f.topic.trim()) { setErr(L.ag_meeting_err_topic); return; }
    start(async () => {
      const r = await requestAgentMeeting({ topic: f.topic, preferred: f.preferred || undefined, note: f.note || undefined });
      if (!r.ok) { setErr(L.ag_meeting_err_send); return; }
      setOpen(false); setDone(true);
    });
  }

  if (done) {
    return (
      <p className="text-xs font-medium text-status-present">
        {L.ag_meeting_requested}{" "}
        <button onClick={() => { setDone(false); setF({ topic: "", preferred: "", note: "" }); }} className="font-normal text-ink-muted underline hover:text-ink">
          {L.ag_request_another}
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
        <CalendarClock className="h-4 w-4" aria-hidden /> {L.ag_request_meeting}
      </button>

      {open && (
        <div dir={lang === "ar" ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label={L.ag_request_meeting} className="relative z-10 w-full max-w-md rounded-card border border-border-warm bg-paper p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-serif text-xl text-ink">{L.ag_request_meeting}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{L.ag_meeting_desc}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={L.close} className="text-ink-muted hover:text-ink"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={LABEL}>{L.ag_meeting_about}</label>
                <input value={f.topic} onChange={(e) => set("topic", e.target.value)} placeholder={L.ag_meeting_about_ph} className={F} />
              </div>
              <div>
                <label className={LABEL}>{L.ag_meeting_time}</label>
                <input value={f.preferred} onChange={(e) => set("preferred", e.target.value)} placeholder={L.ag_meeting_time_ph} className={F} />
              </div>
              <div>
                <label className={LABEL}>{L.ag_meeting_notes}</label>
                <textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={3} placeholder={L.ag_meeting_notes_ph} className={F} />
              </div>
              {err && <p className="text-xs text-brand-red">{err}</p>}
              <div className="flex gap-2">
                <button onClick={submit} disabled={pending} className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50">
                  {pending ? L.ag_meeting_sending : L.ag_meeting_send}
                </button>
                <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink">{L.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
