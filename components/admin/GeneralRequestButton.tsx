"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { TEAMS, REQUEST_TYPES } from "@/lib/admin/requests-shared";
import { createActionRequest } from "@/app/admin/request-actions";

const F = "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";
const LABEL = "mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";

/**
 * Log a general (non-student) request to another team — a supplies order, an IT
 * ask, a policy question. Same `action_requests` inbox as student handoffs, just
 * without an application attached. Available to every staff role.
 */
export function GeneralRequestButton({ defaultToRole }: { defaultToRole?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    toRole: defaultToRole ?? "admin",
    type: "request",
    title: "",
    detail: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.title.trim()) { setErr("Add a short title."); return; }
    start(async () => {
      await createActionRequest({
        toRole: f.toRole,
        type: f.type,
        title: f.title,
        detail: f.detail || undefined,
      });
      setOpen(false);
      setF({ toRole: defaultToRole ?? "admin", type: "request", title: "", detail: "" });
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setErr(null); }}
        className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-2 text-sm font-medium text-oncolor hover:bg-inkbtn-soft"
      >
        <Plus className="h-4 w-4" aria-hidden /> New request
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="New request" className="relative z-10 w-full max-w-md rounded-card border border-border-warm bg-paper p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-serif text-xl text-ink">Log a request</p>
                <p className="mt-0.5 text-xs text-ink-muted">General ask to another team — not tied to a student.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>To team</label>
                  <select value={f.toRole} onChange={(e) => set("toRole", e.target.value)} className={F}>
                    {TEAMS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    <option value="admin">Admin / Management</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Type</label>
                  <select value={f.type} onChange={(e) => set("type", e.target.value)} className={F}>
                    {REQUEST_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Title</label>
                <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Order more brochures" className={F} />
              </div>
              <div>
                <label className={LABEL}>Details</label>
                <textarea value={f.detail} onChange={(e) => set("detail", e.target.value)} rows={3} placeholder="Anything the team needs to know…" className={F} />
              </div>
              {err && <p className="text-xs text-brand-red">{err}</p>}
              <div className="flex gap-2">
                <button onClick={submit} disabled={pending} className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50">
                  {pending ? "Sending…" : "Send request"}
                </button>
                <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
