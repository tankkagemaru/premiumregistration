/** Visa/EMGS types + constants — pure module, safe for client and server. */

export const VISA_STAGES = [
  { id: "docs_prep", label: "Document prep" },
  { id: "submitted", label: "Submitted to EMGS" },
  { id: "medical", label: "Medical" },
  { id: "val", label: "VAL issued" },
  { id: "sev", label: "Single-entry visa" },
  { id: "pass_active", label: "Student pass active" },
] as const;

export const VISA_STAGE_LABEL: Record<string, string> = Object.fromEntries(
  VISA_STAGES.map((s) => [s.id, s.label]),
);

/** Who files with EMGS: private universities submit their own; PECSB submits
 *  for public universities and PLC's own English courses. */
export type VisaSubmitter = "university" | "pecsb";

export interface VisaCase {
  id: string;
  application_id: string;
  student_name: string;
  target?: string | null;
  submitted_by: VisaSubmitter;
  emgs_ref?: string | null;
  stage: string;
  eval_status?: string | null; // not_started | submitted | approved | rejected
  medical_status?: string | null; // pending | passed | failed
  medical_booked_date?: string | null;
  medical_location?: string | null;
  val_status?: string | null;
  single_entry_visa?: string | null;
  arrival_date?: string | null;
  student_pass_expiry?: string | null;
}

/** Officer-editable statuses for the visa detail editor. */
export const EVAL_STATUSES = ["not_started", "submitted", "approved", "rejected"];
export const MEDICAL_STATUSES = ["pending", "booked", "passed", "failed"];

/**
 * A done/pending checklist derived from a visa case — the "where are we" view
 * the visa team wants (eval done, medical booked, VAL, arrival, pass active).
 */
export function visaChecklist(v: VisaCase): { label: string; done: boolean; detail?: string }[] {
  return [
    { label: "EMGS submitted", done: !!v.emgs_ref, detail: v.emgs_ref ?? undefined },
    { label: "Evaluation approved", done: v.eval_status === "approved", detail: v.eval_status ?? undefined },
    {
      label: "Medical booked",
      done: !!v.medical_booked_date,
      detail: [v.medical_booked_date, v.medical_location].filter(Boolean).join(" · ") || undefined,
    },
    { label: "Medical passed", done: v.medical_status === "passed", detail: v.medical_status ?? undefined },
    { label: "VAL issued", done: !!v.val_status && v.val_status !== "pending", detail: v.val_status ?? undefined },
    { label: "Single-entry visa", done: !!v.single_entry_visa, detail: v.single_entry_visa ?? undefined },
    { label: "Arrived in Malaysia", done: !!v.arrival_date, detail: v.arrival_date ?? undefined },
    { label: "Student pass active", done: v.stage === "pass_active", detail: v.student_pass_expiry ?? undefined },
  ];
}

/** Expiry health relative to today: red expired, amber within 90 days. */
export function expiryFlag(
  expiry: string | null | undefined,
  today: string,
): "ok" | "soon" | "expired" | null {
  if (!expiry) return null;
  if (expiry < today) return "expired";
  const days =
    (new Date(expiry).getTime() - new Date(today).getTime()) / 86400000;
  return days <= 90 ? "soon" : "ok";
}
