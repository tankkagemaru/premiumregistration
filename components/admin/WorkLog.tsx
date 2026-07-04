"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import type { ApplicationEvent } from "@/lib/admin/applications-shared";
import { logWork } from "@/app/admin/application-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

/** What kind of work was done — admissions + visa share the same list. */
const ACTIVITIES = [
  "Contacted university",
  "University replied",
  "Submitted to university",
  "EMGS visit",
  "EMGS query received",
  "Called student",
  "WhatsApp sent",
  "Email sent",
  "Other",
];

/**
 * Log work done on an application/visa case — who did what, when. Entries land
 * on the application timeline so admissions, visa and admin all see the trail.
 */
export function WorkLog({
  applicationId,
  events,
}: {
  applicationId: string;
  events?: ApplicationEvent[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const workEvents = (events ?? []).filter((e) => e.type === "work").slice(0, 8);

  return (
    <div className="flex flex-col gap-2">
      {workEvents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {workEvents.map((e) => (
            <div key={e.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">{e.body}</span>
              <span className="shrink-0 font-mono text-xs text-ink-muted">
                {String(e.created_at).slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
        >
          <NotebookPen className="h-3.5 w-3.5" aria-hidden />
          Log work
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-border-warm bg-paper p-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className={F}>
              {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={F}
              aria-label="When it happened"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Detail — e.g. spoke to admissions office, awaiting offer"
            className={F}
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await logWork(applicationId, { activity, date: date || undefined, note: note || undefined });
                  setNote("");
                  setDate("");
                  setOpen(false);
                  router.refresh();
                })
              }
              className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              {pending ? "Logging…" : "Log entry"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
