"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { TRACKS } from "@/lib/config/tracks";
import { COUNTRIES } from "@/lib/config/countries";
import {
  createLeadManually,
  createStudentDirect,
  type NewRecordInput,
} from "@/app/admin/lead-create-actions";

export type AddMode = "lead" | "student";

const COPY: Record<AddMode, { title: string; sub: string; cta: string }> = {
  lead: {
    title: "Add enquiry",
    sub: "Key in a walk-in or phone enquiry. It enters the leads pipeline like any public-form submission.",
    cta: "Create enquiry",
  },
  student: {
    title: "Add student",
    sub: "Create a student and application directly, skipping the lead stage — for confirmed enrolments.",
    cta: "Create student",
  },
};

const field =
  "w-full rounded-md border border-border-warm bg-cream-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red";

export function AddRecordDialog({
  mode,
  onClose,
}: {
  mode: AddMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<{ id: string; name: string; kind: string } | null>(null);
  const [form, setForm] = useState<NewRecordInput>({
    full_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    nationality: "",
    tracks: [],
    note: "",
  });

  const copy = COPY[mode];
  const set = (k: keyof NewRecordInput, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const toggleTrack = (id: string) =>
    setForm((f) => ({
      ...f,
      tracks: f.tracks.includes(id)
        ? f.tracks.filter((t) => t !== id)
        : [...f.tracks, id],
    }));

  function run(force: boolean) {
    setError(null);
    start(async () => {
      const action = mode === "lead" ? createLeadManually : createStudentDirect;
      const res = await action(form, force);
      if (!res.ok) {
        if (res.error === "duplicate" && res.duplicate) {
          setDup(res.duplicate);
          return;
        }
        setError(res.error);
        return;
      }
      onClose();
      if (mode === "student") router.push("/admin/applications");
      else router.refresh();
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setDup(null);
    run(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-inkbtn/30 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-card border border-border-warm bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-warm px-6 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
              {mode === "lead" ? "New enquiry" : "New student"}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-ink">
              {copy.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-cream-50 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-ink-soft">{copy.sub}</p>

          {/* Tracks */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">
              Interested in
            </label>
            <div className="flex flex-wrap gap-2">
              {TRACKS.map((t) => {
                const on = form.tracks.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTrack(t.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                      on
                        ? "border-brand-red bg-brand-red/10 text-brand-red"
                        : "border-border-warm bg-cream-50 text-ink-soft hover:border-ink-muted"
                    }`}
                  >
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                Full name
              </label>
              <input
                className={field}
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="As on passport"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                Email
              </label>
              <input
                type="email"
                className={field}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@email.com"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                Phone
              </label>
              <input
                className={field}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+60 12 345 6789"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                WhatsApp
              </label>
              <input
                className={field}
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="If different"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                Nationality
              </label>
              <select
                className={field}
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {mode === "lead" && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                  Note <span className="text-ink-muted">(optional)</span>
                </label>
                <textarea
                  className={`${field} min-h-[64px] resize-y`}
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder="Anything worth recording — how they reached us, what they asked…"
                />
              </div>
            )}
          </div>

          {dup && (
            <div className="rounded-md border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-ink-soft">
              A {dup.kind} with this email already exists:{" "}
              <span className="font-medium text-ink">{dup.name}</span>.
              <button
                type="button"
                onClick={() => run(true)}
                disabled={pending}
                className="ml-2 inline-flex rounded-md bg-inkbtn px-3 py-1 text-xs font-medium text-oncolor transition-colors hover:bg-inkbtn-soft disabled:opacity-60"
              >
                {pending ? "Saving…" : "Create anyway"}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-brand-red">{error}</p>}

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-warm bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-inkbtn px-5 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft disabled:opacity-60"
            >
              {pending ? "Saving…" : copy.cta}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
