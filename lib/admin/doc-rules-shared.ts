/**
 * Document-requirement rules. Each rule says "this document is required" under
 * conditions: track, study level (UG/PG/PhD), residency, a specific nationality,
 * and the stage it's needed at (application vs visa/EMGS). The matcher applies
 * them to an applicant. Pure + client-safe.
 */
import type { DocRequirement } from "@/lib/config/documents";

export interface DocRule {
  id: string;
  kind: string;
  label: string;
  note?: string | null;
  optional: boolean;
  active: boolean;
  track?: string | null; // english | university | corporate | null(any)
  level?: string | null; // ug | pg | phd | null(any) — university only
  applies_to: string; // all | international | local
  nationality?: string | null; // country code (e.g. "ng") or null(any)
  stage: string; // application | visa
  sort_order: number;
}

export const DOC_APPLIES_TO = ["all", "international", "local"] as const;
export const DOC_LEVELS = ["ug", "pg", "phd"] as const;
export const DOC_STAGES = ["application", "visa"] as const;

export const DOC_APPLIES_LABEL: Record<string, string> = {
  all: "Everyone",
  international: "International only",
  local: "Local only",
};
export const DOC_LEVEL_LABEL: Record<string, string> = {
  ug: "Undergraduate",
  pg: "Postgraduate",
  phd: "PhD only",
};

/** Which level buckets a qualification belongs to (university track only). */
function levelBuckets(track: string, qualification?: string | null): string[] {
  if (track !== "university") return [];
  switch (qualification) {
    case "phd":
      return ["pg", "phd"];
    case "master":
      return ["pg"];
    case "degree":
    case "diploma":
    case "foundation":
      return ["ug"];
    default:
      return ["ug"]; // university with unknown level → treat as UG
  }
}

export interface MatchOpts {
  track: string;
  qualification?: string | null;
  isInternational: boolean;
  nationality?: string | null;
  stage?: string; // if omitted, matches every stage
}

export function matchDocRules(rules: DocRule[], opts: MatchOpts): DocRequirement[] {
  const buckets = levelBuckets(opts.track, opts.qualification);
  const nat = opts.nationality?.toLowerCase() ?? null;
  return rules
    .filter((r) => r.active)
    .filter((r) => !r.track || r.track === opts.track)
    .filter((r) => !r.level || buckets.includes(r.level))
    .filter((r) =>
      r.applies_to === "all"
        ? true
        : r.applies_to === "international"
          ? opts.isInternational
          : !opts.isInternational,
    )
    .filter((r) => !r.nationality || (nat !== null && r.nationality.toLowerCase() === nat))
    .filter((r) => !opts.stage || r.stage === opts.stage)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      kind: r.kind,
      label: r.label,
      note: r.note ?? undefined,
      optional: r.optional,
      stage: r.stage,
    }));
}

/** Seed / fallback rules — mirror of the former hardcoded matrix + a visa example. */
export const SEED_DOC_RULES: DocRule[] = [
  { id: "s1", kind: "photo", label: "Passport-size photo", optional: false, active: true, applies_to: "all", stage: "application", sort_order: 0 },
  { id: "s2", kind: "passport", label: "Passport (bio-data page)", optional: false, active: true, applies_to: "international", stage: "application", sort_order: 1 },
  // University — undergraduate
  { id: "s3", kind: "transcript", label: "Academic transcript(s)", optional: false, active: true, track: "university", level: "ug", applies_to: "all", stage: "application", sort_order: 2 },
  { id: "s4", kind: "certificate", label: "Highest qualification certificate", optional: false, active: true, track: "university", level: "ug", applies_to: "all", stage: "application", sort_order: 3 },
  { id: "s5", kind: "english_test", label: "English test (IELTS / MUET / TOEFL)", note: "if already taken", optional: true, active: true, track: "university", level: "ug", applies_to: "all", stage: "application", sort_order: 4 },
  // University — postgraduate
  { id: "s6", kind: "transcript", label: "Degree transcript(s)", optional: false, active: true, track: "university", level: "pg", applies_to: "all", stage: "application", sort_order: 5 },
  { id: "s7", kind: "certificate", label: "Degree certificate(s)", optional: false, active: true, track: "university", level: "pg", applies_to: "all", stage: "application", sort_order: 6 },
  { id: "s8", kind: "cv", label: "CV / résumé", optional: false, active: true, track: "university", level: "pg", applies_to: "all", stage: "application", sort_order: 7 },
  { id: "s9", kind: "english_test", label: "English test (IELTS / TOEFL)", optional: false, active: true, track: "university", level: "pg", applies_to: "all", stage: "application", sort_order: 8 },
  { id: "s10", kind: "proposal", label: "Research proposal", optional: false, active: true, track: "university", level: "phd", applies_to: "all", stage: "application", sort_order: 9 },
  { id: "s11", kind: "reference", label: "Reference letter(s)", optional: true, active: true, track: "university", level: "pg", applies_to: "all", stage: "application", sort_order: 10 },
  { id: "s12", kind: "financial", label: "Proof of financial support", optional: false, active: true, track: "university", applies_to: "international", stage: "application", sort_order: 11 },
  // English + corporate
  { id: "s13", kind: "certificate", label: "Highest qualification (optional)", optional: true, active: true, track: "english", applies_to: "all", stage: "application", sort_order: 12 },
  { id: "s14", kind: "company_letter", label: "Company request / nomination letter", optional: true, active: true, track: "corporate", applies_to: "all", stage: "application", sort_order: 13 },
  // Visa / EMGS stage (international)
  { id: "s15", kind: "ticket", label: "Flight itinerary / ticket", optional: false, active: true, applies_to: "international", stage: "visa", sort_order: 14 },
];
