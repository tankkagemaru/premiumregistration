"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Circle, RefreshCw, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  EVAL_STATUSES,
  MEDICAL_STATUSES,
  ARRIVAL_TASKS,
  VISA_STAGE_LABEL,
  BUCKET_LABEL,
  stagesForKind,
  stageBucket,
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
import type { BillableItem } from "@/lib/admin/billables-shared";
import { updateVisaCase, startRenewal } from "@/app/admin/visa-actions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MessageComposer } from "@/components/admin/MessageComposer";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocRequestControl } from "@/components/admin/DocRequestControl";
import { VisaPaymentFlag } from "@/components/admin/VisaPaymentFlag";
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
  visaBillables = [],
}: {
  vc: VisaCase;
  contact: AppContact;
  officerName?: string;
  documents?: ApplicationDoc[];
  requirements?: DocRequirement[];
  docRequests?: AppDocRequest[];
  events?: ApplicationEvent[];
  canEdit?: boolean;
  visaBillables?: BillableItem[];
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
  const [tasks, setTasks] = useState<Record<string, boolean>>(vc.checklist ?? {});
  const toggleTask = (key: string) => setTasks((t) => ({ ...t, [key]: !t[key] }));
  const [showJump, setShowJump] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const isRenewal = vc.kind === "renewal";
  const stages = stagesForKind(vc.kind);
  const stageIdx = stages.findIndex((s) => s.id === form.stage);
  const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null;
  const nextStage = stageIdx >= 0 && stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null;
  const curStageLabel = stages[stageIdx]?.label ?? form.stage;

  // Only surface the detail fields for the current phase — the whole point of
  // the granular stages. "Show all fields" reveals the rest for corrections.
  const bucket = stageBucket(form.stage);
  const FIELD_VIS: Record<string, string[]> = {
    emgs: ["emgs_ref", "eval_status"],
    eval: ["emgs_ref", "val_status"],
    arrival: ["arrival_tasks", "single_entry_visa", "arrival_date"],
    health: ["medical_status", "medical_booked_date", "medical_location"],
    final: ["student_pass_expiry"],
    done: ["student_pass_expiry"],
  };
  const show = (key: string) => showAll || (FIELD_VIS[bucket] ?? []).includes(key);
  const close = () => router.push("/admin/visa");
  const checklist = visaChecklist({ ...vc, ...form });

  function save() {
    start(async () => {
      await updateVisaCase(vc.id, {
        ...form,
        checklist: tasks,
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
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-medium text-ink">{vc.student_name}</h2>
              {isRenewal && (
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-gold/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-gold">
                  <RefreshCw className="h-3 w-3" aria-hidden /> Renewal
                </span>
              )}
            </div>
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
                <RoRow k="Stage" v={VISA_STAGE_LABEL[vc.stage] ?? vc.stage} />
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
            <div className="col-span-2 text-xs font-medium text-ink-soft">
              Stage
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!prevStage}
                  onClick={() => prevStage && set("stage", prevStage.id)}
                  title={prevStage ? `Back to “${prevStage.label}”` : "At the first stage"}
                  aria-label="Back one stage"
                  className="rounded-md border border-border-warm bg-paper p-1.5 text-ink-soft hover:bg-cream-50 hover:text-ink disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <span className="flex-1 rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-center text-sm font-medium text-ink">
                  {curStageLabel}
                </span>
                <button
                  type="button"
                  disabled={!nextStage}
                  onClick={() => nextStage && set("stage", nextStage.id)}
                  title={nextStage ? `Advance to “${nextStage.label}”` : "Final stage"}
                  aria-label="Advance one stage"
                  className="rounded-md border border-border-warm bg-paper p-1.5 text-ink-soft hover:bg-cream-50 hover:text-ink disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              {form.stage !== vc.stage && (
                <p className="mt-1 text-[11px] text-brand-gold">Unsaved — press “Save changes” to apply.</p>
              )}
              <button
                type="button"
                onClick={() => setShowJump((o) => !o)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-normal text-ink-muted hover:text-ink"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showJump ? "rotate-180" : ""}`} aria-hidden />
                Correct stage manually
              </button>
              {showJump && (
                <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={`mt-1 ${FIELD}`}>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="col-span-2 -mb-1 text-[11px] text-ink-muted">
              {showAll ? "Showing all fields." : <>Fields for <span className="font-medium text-ink-soft">{BUCKET_LABEL[bucket] ?? "this phase"}</span>.</>}
            </p>
            {show("emgs_ref") && (
              <label className="col-span-2 text-xs font-medium text-ink-soft">
                EMGS reference
                <input value={form.emgs_ref} onChange={(e) => set("emgs_ref", e.target.value)} className={`mt-1 ${FIELD}`} />
              </label>
            )}
            {show("eval_status") && (
              <label className="text-xs font-medium text-ink-soft">
                Evaluation
                <select value={form.eval_status} onChange={(e) => set("eval_status", e.target.value)} className={`mt-1 ${FIELD}`}>
                  {EVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )}
            {show("medical_status") && (
              <label className="text-xs font-medium text-ink-soft">
                Health check-up
                <select value={form.medical_status} onChange={(e) => set("medical_status", e.target.value)} className={`mt-1 ${FIELD}`}>
                  {MEDICAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )}
            {show("medical_booked_date") && (
              <label className="text-xs font-medium text-ink-soft">
                Check-up booked
                <input type="date" value={form.medical_booked_date} onChange={(e) => set("medical_booked_date", e.target.value)} className={`mt-1 ${FIELD}`} />
              </label>
            )}
            {show("medical_location") && (
              <label className="text-xs font-medium text-ink-soft">
                Clinic / centre
                <input value={form.medical_location} onChange={(e) => set("medical_location", e.target.value)} placeholder="Clinic / centre" className={`mt-1 ${FIELD}`} />
              </label>
            )}
            {show("val_status") && (
              <label className="text-xs font-medium text-ink-soft">
                eVAL status
                <input value={form.val_status} onChange={(e) => set("val_status", e.target.value)} placeholder="issued / pending" className={`mt-1 ${FIELD}`} />
              </label>
            )}
            {show("single_entry_visa") && (
              <label className="text-xs font-medium text-ink-soft">
                eVISA
                <input value={form.single_entry_visa} onChange={(e) => set("single_entry_visa", e.target.value)} placeholder="issued / pending" className={`mt-1 ${FIELD}`} />
              </label>
            )}
            {show("arrival_date") && (
              <label className="text-xs font-medium text-ink-soft">
                Arrival date
                <input type="date" value={form.arrival_date} onChange={(e) => set("arrival_date", e.target.value)} className={`mt-1 ${FIELD}`} />
              </label>
            )}
            {show("student_pass_expiry") && (
              <label className="text-xs font-medium text-ink-soft">
                Pass expiry
                <input type="date" value={form.student_pass_expiry} onChange={(e) => set("student_pass_expiry", e.target.value)} className={`mt-1 ${FIELD}`} />
              </label>
            )}
            <button
              type="button"
              onClick={() => setShowAll((o) => !o)}
              className="col-span-2 mt-1 inline-flex items-center gap-1 text-[11px] font-normal text-ink-muted hover:text-ink"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
              {showAll ? "Show only this phase" : "Show all fields"}
            </button>
          </div>

          {/* Arrival planning sub-tasks — the errands to settle before/around
              the student lands. Shown during the arrival phase (or Show all). */}
          {!isRenewal && show("arrival_tasks") && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-soft">Arrival planning</p>
              <div className="flex flex-col gap-1.5 rounded-md border border-border-warm bg-cream-50/60 p-2.5">
                {ARRIVAL_TASKS.map((task) => (
                  <label key={task.key} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={!!tasks[task.key]}
                      onChange={() => toggleTask(task.key)}
                      className="h-4 w-4 rounded border-border-warm text-brand-red"
                    />
                    {task.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            {!isRenewal && vc.stage === "done" && (
              <button
                onClick={() => start(async () => { await startRenewal(vc.id); router.refresh(); })}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-brand-gold/40 bg-brand-gold/10 px-4 py-2 text-sm font-medium text-brand-gold hover:bg-brand-gold/20 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden /> Start renewal
              </button>
            )}
          </div>
          </fieldset>
          )}

          {/* Payments — visa flags EMGS / Immigration fees for Finance to collect */}
          {canEdit && (
            <div>
              <SectionLabel>Payments</SectionLabel>
              <VisaPaymentFlag applicationId={vc.application_id} billables={visaBillables} />
            </div>
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
