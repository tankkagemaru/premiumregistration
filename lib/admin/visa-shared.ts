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
  medical_status?: string | null; // pending | passed | failed
  student_pass_expiry?: string | null;
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
