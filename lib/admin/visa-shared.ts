/** Visa/EMGS types + constants — pure module, safe for client and server. */

/**
 * The full initial visa journey (same for English-with-visa and University
 * international students). "Arrival planning" carries its own sub-checklist
 * (see ARRIVAL_TASKS). After "done" the application advances to Enrolled.
 */
export const VISA_STAGES = [
  { id: "emgs_submitted", label: "EMGS doc submitted" },
  { id: "emgs_review", label: "Review by EMGS" },
  { id: "immigration_review", label: "Review by Immigration" },
  { id: "eval_process", label: "eVAL under process" },
  { id: "eval_given", label: "eVAL given" },
  { id: "arrival_planning", label: "Arrival planning" },
  { id: "evisa_application", label: "eVISA application" },
  { id: "evisa_received", label: "eVISA received" },
  { id: "arrived", label: "Arrived" },
  { id: "health_checkup", label: "Health check-up done" },
  { id: "health_report", label: "Health report received" },
  { id: "uni_submission", label: "Submission to university" },
  { id: "passport_submission", label: "Passport submission" },
  { id: "sticker_received", label: "Sticker received" },
  { id: "done", label: "Done" },
] as const;

/** The renewal cycle for a student already on a pass — a shorter loop. */
export const RENEWAL_STAGES = [
  { id: "renewal_started", label: "Renewal started" },
  { id: "health_checkup", label: "Health check-up done" },
  { id: "health_report", label: "Health report received" },
  { id: "eval_process", label: "eVAL under process" },
  { id: "uni_submission", label: "Submission to university" },
  { id: "passport_submission", label: "Passport submission" },
  { id: "sticker_received", label: "Sticker received" },
  { id: "done", label: "Done" },
] as const;

/** Sub-tasks tracked (as booleans in `checklist`) during Arrival planning. */
export const ARRIVAL_TASKS = [
  { key: "health_appointment", label: "Health check-up appointment booked" },
  { key: "accommodation", label: "Accommodation arranged" },
  { key: "pickup", label: "Airport pickup arranged" },
] as const;

export const VISA_STAGE_LABEL: Record<string, string> = {
  ...Object.fromEntries(VISA_STAGES.map((s) => [s.id, s.label])),
  ...Object.fromEntries(RENEWAL_STAGES.map((s) => [s.id, s.label])),
  // Back-compat: rows from the old coarse model (pre-migration windows / mocks).
  docs_prep: "EMGS doc submitted",
  submitted: "Review by EMGS",
  medical: "Health check-up done",
  val: "eVAL given",
  sev: "eVISA received",
  pass_active: "Done",
};

export type VisaKind = "initial" | "renewal";

/** The ordered stage list for a case, by kind. Return type is widened to a
 *  common shape so callers can `.map()` without a union-of-tuples error. */
export function stagesForKind(kind?: string | null): readonly { id: string; label: string }[] {
  return kind === "renewal" ? RENEWAL_STAGES : VISA_STAGES;
}

/** Group the granular stages into phase buckets (used for tabs + which detail
 *  fields the case drawer surfaces). */
export const STAGE_BUCKET: Record<string, string> = {
  emgs_submitted: "emgs", emgs_review: "emgs", immigration_review: "emgs",
  eval_process: "eval", eval_given: "eval",
  arrival_planning: "arrival", evisa_application: "arrival", evisa_received: "arrival", arrived: "arrival",
  health_checkup: "health", health_report: "health",
  uni_submission: "final", passport_submission: "final", sticker_received: "final",
  done: "done",
  renewal_started: "emgs",
  // back-compat coarse ids
  docs_prep: "emgs", submitted: "emgs", medical: "health", val: "eval", sev: "arrival", pass_active: "done",
};
export function stageBucket(stage: string): string {
  return STAGE_BUCKET[stage] ?? "emgs";
}

export const BUCKET_LABEL: Record<string, string> = {
  emgs: "EMGS submission",
  eval: "eVAL",
  arrival: "Arrival & eVISA",
  health: "Health check-up",
  final: "Finalising",
  done: "Completed",
};

export function isFinalVisaStage(stage: string): boolean {
  return stage === "done";
}

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
  kind?: string | null; // initial | renewal
  checklist?: Record<string, boolean> | null; // arrival sub-tasks etc.
  eval_status?: string | null; // not_started | submitted | approved | rejected
  medical_status?: string | null; // pending | passed | failed
  medical_booked_date?: string | null;
  medical_location?: string | null;
  val_status?: string | null;
  single_entry_visa?: string | null;
  arrival_date?: string | null;
  student_pass_expiry?: string | null;
  created_at?: string | null;
}

/** Officer-editable statuses for the visa detail editor. */
export const EVAL_STATUSES = ["not_started", "submitted", "approved", "rejected"];
export const MEDICAL_STATUSES = ["pending", "booked", "passed", "failed"];

/** "not_started" → "Not started" — human copy for machine sub-status values. */
export function humanizeStatus(s?: string | null): string {
  if (!s) return "";
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * The "where are we" progress list for a case — every stage of its journey with
 * a done flag up to the current stage. Drives the drawer checklist and the
 * read-only exec popout.
 */
export function visaChecklist(v: VisaCase): { label: string; done: boolean; detail?: string }[] {
  const list = stagesForKind(v.kind);
  const cur = list.findIndex((s) => s.id === v.stage);
  return list.map((s, i) => {
    let detail: string | undefined;
    if (s.id === "emgs_submitted" || s.id === "emgs_review") detail = v.emgs_ref ?? undefined;
    if (s.id === "arrived") detail = v.arrival_date ?? undefined;
    if (s.id === "done") detail = v.student_pass_expiry ? `expires ${v.student_pass_expiry}` : undefined;
    return { label: s.label, done: cur >= 0 && i <= cur, detail };
  });
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
