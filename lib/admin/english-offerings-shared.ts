/** English programme offerings — what Academic makes available to offer. Pure. */

export interface EnglishOffering {
  id: string;
  name: string;
  kind: string; // pep | exam_prep | summer_camp | other
  default_days?: number | null;
  active: boolean;
  sort_order: number;
}

/** The built-in kinds carry bespoke intake logic (PEP levels, exam routes);
 *  "other" is a plain named offering (e.g. Special Cohort). */
export const OFFERING_KINDS = [
  { id: "pep", label: "PEP (levelled)" },
  { id: "exam_prep", label: "Exam prep (routed)" },
  { id: "summer_camp", label: "Summer camp" },
  { id: "other", label: "Other / named" },
] as const;

export const OFFERING_KIND_LABEL: Record<string, string> = Object.fromEntries(
  OFFERING_KINDS.map((k) => [k.id, k.label]),
);
