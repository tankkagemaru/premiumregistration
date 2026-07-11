"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Circle } from "lucide-react";
import {
  VISA_STAGES,
  EVAL_STATUSES,
  MEDICAL_STATUSES,
  visaChecklist,
  type VisaCase,
} from "@/lib/admin/visa-shared";
import type {
  AppContact,
  ApplicationDoc,
  ApplicationEvent,
  AppDocRequest,
} from "@/lib/admin/applications-shared";
import type { DocRequirement } from "@/lib/config/documents";
import { updateVisaCase } from "@/app/admin/visa-actions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MessageComposer } from "@/components/admin/MessageComposer";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocRequestControl } from "@/components/admin/DocRequestControl";
import { WorkLog } from "@/components/admin/WorkLog";

const FIELD =
  "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

/** Read-only key/value row for the non-visa viewer's detail list. */
function RoRow({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-muted">{k}</span>
      <span className="text-end font-medium text-ink">{v}</span>
    </div>
  );
}

export function VisaCaseDrawer({
  vc,
  contact,
  officerName,
  documents = [],
  requirements = [],
  docRequests = [],
  events = [],
  canEdit = true,
}: {
  vc: VisaCase;
  contact: AppContact;
  officerName?: string;
  documents?: ApplicationDoc[];
  requirements?: DocRequirement[];
  docRequests?: AppDocRequest[];
  events?: ApplicationEvent[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    stage: vc.stage,
    emgs_ref: vc.emgs_ref ?? "",
    eval_status: vc.eval_status ?? "not_started",
    medical_status: vc.medical_status ?? "pending",
    medical_booked_date: vc.medical_booked_date ?? "",
    medical_location: vc.medical_location ?? "",
    val_status: vc.val_status ?? "",
    single_entry_visa: vc.single_entry_visa ?? "",
    arrival_date: vc.arrival_date ?? "",
    student_pass_expiry: vc.student_pass_expiry ?? "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const close = () => router.push("/admin/visa");
  const checklist = visaChecklist({ ...vc, ...form });

  function save() {
    start(async () => {
      await updateVisaCase(vc.id, {
        ...form,
        emgs_ref: form.emgs_ref || null,
        medical_booked_date: form.medical_booked_date || null,
        medical_location: form.medical_location || null,
        val_status: form.val_status || null,
        single_entry_visa: form.single_entry_visa || null,
        arrival_date: form.arrival_date || null,
        student_pass_expiry: form.student_pass_expiry || null,
      });
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-inkbtn/30" onClick={close} aria-hidden />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-cream shadow-lg">
        <div className="flex items-start justify-between border-b border-border-warm px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-ink">{vc.student_name}</h2>
            <p className="text-xs text-ink-muted">{vc.target ?? "Visa / EMGS"}</p>
          </div>
          <button onClick={close} aria-label="Close" className="rounded-md p-1 text-ink-muted hover:bg-cream-50 hover:text-ink">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
          {/* Checklist */}
          <div>
            <SectionLabel>Progress</SectionLabel>
            <ul className="flex flex-col gap-1.5">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  {c.done ? (
                    <Check className="h-4 w-4 shrink-0 text-status-present" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                  )}
                  <span className={c.done ? "text-ink" : "text-ink-muted"}>{c.label}</span>
                  {c.detail && <span className="ml-auto text-xs text-ink-muted">{c.detail}</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Non-visa viewers get a clean read-only detail list, not disabled inputs. */}
          {!canEdit ? (
            <div>
              <SectionLabel>Details</SectionLabel>
              <div className="flex flex-col divide-y divide-border-warm/50">
                <RoRow k="Stage" v={VISA_STAGES.find((s) => s.id === vc.stage)?.label ?? vc.stage} />
                <RoRow k="EMGS reference" v={vc.emgs_ref} />
                <RoRow k="Evaluation" v={vc.eval_status} />
                <RoRow k="Medical" v={vc.medical_status} />
                <RoRow k="Medical booked" v={vc.medical_booked_date} />
                <RoRow k="Medical location" v={vc.medical_location} />
                <RoRow k="VAL status" v={vc.val_status} />
                <RoRow k="Single-entry visa" v={vc.single_entry_visa} />
                <RoRow k="Arrival date" v={vc.arrival_date} />
                <RoRow k="Pass expiry" v={vc.student_pass_expiry} />
              </div>
            </div>
          ) : (
          <fieldset className="contents">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs font-medium text-ink-soft">
              Stage
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={`mt-1 ${FIELD}`}>
                {VISA_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft">
              EMGS reference
              <input value={form.emgs_ref} onChange={(e) => set("emgs_ref", e.target.value)} className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Evaluation
              <select value={form.eval_status} onChange={(e) => set("eval_status", e.target.value)} className={`mt-1 ${FIELD}`}>
                {EVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Medical
              <select value={form.medical_status} onChange={(e) => set("medical_status", e.target.value)} className={`mt-1 ${FIELD}`}>
                {MEDICAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Medical booked
              <input type="date" value={form.medical_booked_date} onChange={(e) => set("medical_booked_date", e.target.value)} className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Medical location
              <input value={form.medical_location} onChange={(e) => set("medical_location", e.target.value)} placeholder="Clinic / centre" className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              VAL status
              <input value={form.val_status} onChange={(e) => set("val_status", e.target.value)} placeholder="issued / pending" className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Single-entry visa
              <input value={form.single_entry_visa} onChange={(e) => set("single_entry_visa", e.target.value)} className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Arrival date
              <input type="date" value={form.arrival_date} onChange={(e) => set("arrival_date", e.target.value)} className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Pass expiry
              <input type="date" value={form.student_pass_expiry} onChange={(e) => set("student_pass_expiry", e.target.value)} className={`mt-1 ${FIELD}`} />
            </label>
          </div>
          <button
            onClick={save}
            disabled={pending}
            className="self-start rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          </fieldset>
          )}

          {/* Documents — visa/admin review + upload; viewers see the pack read-only */}
          <div>
            <SectionLabel>Documents</SectionLabel>
            <DocumentUploader
              applicationId={vc.application_id}
              requirements={requirements}
              docs={documents}
              readOnly={!canEdit}
            />
            {canEdit && <DocRequestControl applicationId={vc.application_id} requests={docRequests} />}
          </div>

          {/* Work log — EMGS visits, university replies, queries */}
          <div>
            <SectionLabel>Work log</SectionLabel>
            <WorkLog applicationId={vc.application_id} events={events} readOnly={!canEdit} />
          </div>

          {/* Message the student — visa team only */}
          {canEdit && (
          <div>
            <SectionLabel>Message</SectionLabel>
            <MessageComposer
              recipient={{ name: vc.student_name, email: contact.email, phone: contact.whatsapp ?? contact.phone }}
              vars={{
                full_name: vc.student_name,
                medical: [form.medical_booked_date, form.medical_location].filter(Boolean).join(" · "),
                officer: officerName ?? "the Premium visa team",
                company: "Premium",
              }}
              context="visa"
            />
          </div>
          )}
        </div>
      </aside>
    </div>
  );
}
