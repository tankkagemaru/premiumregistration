/**
 * Document requirements matrix — what a student needs to upload, which differs
 * by track, university level (UG vs PG), and residency (international students
 * need passport + financial proof for the visa). Pure + client-safe.
 *
 * This is the single source of truth for the checklist in the console and the
 * status portal. Tune here now; a Settings UI can manage it later.
 */
export interface DocRequirement {
  kind: string;
  label: string;
  note?: string;
  optional?: boolean;
  stage?: string; // application | visa — which phase this is needed for
}

/** Human label for a doc kind (falls back to the requirement labels above). */
export const DOC_KIND_LABEL: Record<string, string> = {
  photo: "Photo",
  passport: "Passport",
  transcript: "Transcript",
  certificate: "Certificate",
  cv: "CV / résumé",
  english_test: "English test",
  proposal: "Research proposal",
  reference: "Reference letter",
  financial: "Financial proof",
  company_letter: "Company letter",
  offer_letter: "Offer letter",
  medical: "Medical report",
  eval: "Qualification evaluation",
  val: "VAL",
  ticket: "Flight ticket",
  receipt: "Payment receipt",
  other: "Other",
};
