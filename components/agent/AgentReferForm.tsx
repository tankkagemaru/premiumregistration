"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, Upload, Loader2 } from "lucide-react";
import {
  createAgentReferral,
  createLeadDocUploadUrl,
  recordLeadDoc,
} from "@/app/agent/actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";
const BUCKET = "registration-docs";
const TRACKS = [
  { id: "english", label: "English" },
  { id: "university", label: "University" },
  { id: "corporate", label: "Corporate" },
];
const DOC_KINDS = [
  { kind: "passport", label: "Passport" },
  { kind: "transcript", label: "Transcript(s)" },
  { kind: "certificate", label: "Certificate(s)" },
  { kind: "photo", label: "Passport photo" },
  { kind: "financial", label: "Proof of funds" },
  { kind: "english_test", label: "English test" },
];

/** Agents submit a student straight from the portal — proper fields + document
 *  uploads, closing the referral loop. */
export function AgentReferForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState<{ id?: string; code?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", whatsapp: "", nationality: "",
    university: "", program: "", note: "",
  });
  const [tracks, setTracks] = useState<string[]>(["university"]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    setError(null);
    start(async () => {
      const res = await createAgentReferral({ ...form, tracks });
      if (!res.ok) {
        setError(
          res.error === "missing" ? "Name, email and phone are required."
            : res.error === "tracks" ? "Pick at least one programme."
              : "Could not submit — try again.",
        );
        return;
      }
      setLead({ id: res.id, code: res.code });
    });
  }

  async function upload(kind: string, file: File) {
    if (!lead?.id) return;
    setUploading(kind);
    try {
      const res = await createLeadDocUploadUrl(lead.id, kind, file.name);
      if ("error" in res) return;
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(res.path, res.token, file);
      if (upErr) return;
      await recordLeadDoc(lead.id, kind, res.path);
      setUploaded((s) => new Set(s).add(kind));
    } finally {
      setUploading(null);
    }
  }

  function reset() {
    setLead(null); setOpen(false); setUploaded(new Set()); setError(null);
    setForm({ full_name: "", email: "", phone: "", whatsapp: "", nationality: "", university: "", program: "", note: "" });
    setTracks(["university"]);
    router.refresh();
  }

  // Success + document upload step.
  if (lead) {
    return (
      <div className="w-full max-w-md rounded-card border border-status-present/40 bg-status-present-bg p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-status-present">
          <Check className="h-4 w-4" aria-hidden /> Student submitted — thank you.
        </p>
        {lead.code && (
          <p className="mt-1 text-sm text-ink-soft">
            Tracking code: <span className="font-mono font-medium text-ink">{lead.code}</span>
          </p>
        )}
        <p className="mb-2 mt-3 text-xs font-medium text-ink-soft">Upload their documents (optional):</p>
        <div className="grid grid-cols-2 gap-2">
          {DOC_KINDS.map((d) => {
            const done = uploaded.has(d.kind);
            return (
              <div key={d.kind}>
                <button
                  type="button"
                  disabled={uploading === d.kind}
                  onClick={() => inputs.current[d.kind]?.click()}
                  className={`flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium ${
                    done
                      ? "border-status-present/40 bg-paper text-status-present"
                      : "border-border-warm bg-paper text-ink hover:bg-cream-50"
                  }`}
                >
                  {uploading === d.kind ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {d.label}
                </button>
                <input
                  ref={(el) => { inputs.current[d.kind] = el; }}
                  type="file"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(d.kind, f); e.target.value = ""; }}
                />
              </div>
            );
          })}
        </div>
        <button onClick={reset} className="mt-3 text-xs font-medium text-brand-red hover:underline">
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
    <div className="w-full max-w-md rounded-card border border-border-warm bg-paper p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        Refer a student
      </p>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Full name *" className={`col-span-2 ${F}`} />
        <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email *" type="email" className={F} />
        <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone *" className={F} />
        <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="WhatsApp (if different)" className={F} />
        <input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="Nationality" className={F} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TRACKS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTracks((cur) => cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id])}
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
      {tracks.includes("university") && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input value={form.university} onChange={(e) => set("university", e.target.value)} placeholder="Target university" className={F} />
          <input value={form.program} onChange={(e) => set("program", e.target.value)} placeholder="Program / course" className={F} />
        </div>
      )}
      <input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Note for the team (optional)" className={`mt-3 w-full ${F}`} />
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
