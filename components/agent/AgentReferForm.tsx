"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check } from "lucide-react";
import { createAgentReferral } from "@/app/agent/actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";
const TRACKS = [
  { id: "english", label: "English" },
  { id: "university", label: "University" },
  { id: "corporate", label: "Corporate" },
];

/** Agents submit a student straight from the portal — closes the referral loop. */
export function AgentReferForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null); // tracking code
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    nationality: "",
    note: "",
  });
  const [tracks, setTracks] = useState<string[]>(["university"]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    setError(null);
    start(async () => {
      const res = await createAgentReferral({ ...form, tracks });
      if (!res.ok) {
        setError(
          res.error === "missing"
            ? "Name, email and phone are required."
            : res.error === "tracks"
              ? "Pick at least one programme."
              : "Could not submit — try again.",
        );
        return;
      }
      setDone(res.code ?? "");
      setForm({ full_name: "", email: "", phone: "", whatsapp: "", nationality: "", note: "" });
      router.refresh();
    });
  }

  if (done !== null) {
    return (
      <div className="rounded-card border border-status-present/40 bg-status-present-bg p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-status-present">
          <Check className="h-4 w-4" aria-hidden /> Student submitted — thank you.
        </p>
        {done && (
          <p className="mt-1 text-sm text-ink-soft">
            Their tracking code is{" "}
            <span className="font-mono font-medium text-ink">{done}</span> — share
            it so they can follow their status.
          </p>
        )}
        <button
          onClick={() => { setDone(null); setOpen(false); }}
          className="mt-2 text-xs font-medium text-brand-red hover:underline"
        >
          Done
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-brand-red-soft"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Refer a student
      </button>
    );
  }

  return (
    <div className="rounded-card border border-border-warm bg-paper p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        Refer a student
      </p>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Full name *" className={`col-span-2 ${F}`} />
        <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email *" type="email" className={F} />
        <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone *" className={F} />
        <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="WhatsApp (if different)" className={F} />
        <input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="Nationality" className={F} />
        <input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Note for the team (optional)" className={`col-span-2 ${F}`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TRACKS.map((t) => (
          <button
            key={t.id}
            onClick={() =>
              setTracks((cur) =>
                cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id],
              )
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              tracks.includes(t.id)
                ? "border-brand-red bg-brand-red/10 text-brand-red"
                : "border-border-warm bg-paper text-ink-soft hover:bg-cream-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit student"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
