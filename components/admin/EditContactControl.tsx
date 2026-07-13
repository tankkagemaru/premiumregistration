"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  updateLeadContact,
  updateStudentContact,
  type ContactPatch,
} from "@/app/admin/contact-actions";
import { COUNTRIES } from "@/lib/config/countries";

type Values = {
  full_name: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  nationality?: string | null;
  passport_no?: string | null;
};

/**
 * "Edit contact details" — corrects a mis-submitted name / passport / contact
 * on a lead or a converted student. Renders nothing unless the viewer may edit.
 * On the application side the save cascades to fees/visa snapshots server-side.
 */
export function EditContactControl({
  target,
  id,
  initial,
  canEdit,
}: {
  target: "lead" | "application";
  id: string;
  initial: Values;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Values>({
    full_name: initial.full_name ?? "",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    whatsapp: initial.whatsapp ?? "",
    nationality: initial.nationality ?? "",
    passport_no: initial.passport_no ?? "",
  });

  if (!canEdit) return null;

  const set = (k: keyof Values, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function save() {
    setError(null);
    const patch: ContactPatch = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      whatsapp: form.whatsapp,
      nationality: form.nationality,
      passport_no: form.passport_no,
    };
    start(async () => {
      const res =
        target === "lead"
          ? await updateLeadContact(id, patch)
          : await updateStudentContact(id, patch);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-brand-red hover:underline"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit contact details
      </button>
    );
  }

  const field = "w-full rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red";
  const lab = "text-[11px] font-medium uppercase tracking-wide text-ink-muted";

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-border-warm bg-paper px-3 py-3">
      <p className="text-xs text-ink-muted">
        Correcting a mis-submitted record. The change is logged on the timeline.
      </p>
      <label className="flex flex-col gap-1">
        <span className={lab}>Full name</span>
        <input className={field} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={lab}>Email</span>
        <input className={field} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className={lab}>Phone</span>
          <input className={field} value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={lab}>WhatsApp</span>
          <input className={field} value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={lab}>Passport / ID</span>
        <input className={field} value={form.passport_no ?? ""} onChange={(e) => set("passport_no", e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={lab}>Nationality</span>
        <select className={field} value={form.nationality ?? ""} onChange={(e) => set("nationality", e.target.value)}>
          <option value="">—</option>
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-xs text-brand-red">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setOpen(false);
          }}
          className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
