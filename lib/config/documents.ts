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
}

export function requiredDocuments(opts: {
  track: string;
  qualification?: string | null; // foundation|diploma|degree|master|phd
  isInternational: boolean;
}): DocRequirement[] {
  const reqs: DocRequirement[] = [{ kind: "photo", label: "Passport-size photo" }];
  if (opts.isInternational)
    reqs.push({ kind: "passport", label: "Passport (bio-data page)" });

  if (opts.track === "university") {
    const q = opts.qualification;
    const isPg = q === "master" || q === "phd";
    if (isPg) {
      reqs.push({ kind: "transcript", label: "Degree transcript(s)" });
      reqs.push({ kind: "certificate", label: "Degree certificate(s)" });
      reqs.push({ kind: "cv", label: "CV / résumé" });
      reqs.push({ kind: "english_test", label: "English test (IELTS / TOEFL)" });
      if (q === "phd")
        reqs.push({ kind: "proposal", label: "Research proposal" });
      reqs.push({ kind: "reference", label: "Reference letter(s)", optional: true });
    } else {
      // Undergraduate / foundation / diploma entry
      reqs.push({ kind: "transcript", label: "Academic transcript(s)" });
      reqs.push({ kind: "certificate", label: "Highest qualification certificate" });
      reqs.push({
        kind: "english_test",
        label: "English test (IELTS / MUET / TOEFL)",
        note: "if already taken",
        optional: true,
      });
    }
    if (opts.isInternational)
      reqs.push({ kind: "financial", label: "Proof of financial support" });
  } else if (opts.track === "english") {
    // English courses: minimal; passport handled above for internationals.
    reqs.push({
      kind: "certificate",
      label: "Highest qualification (optional)",
      optional: true,
    });
  } else if (opts.track === "corporate") {
    reqs.push({
      kind: "company_letter",
      label: "Company request / nomination letter",
      optional: true,
    });
  }
  return reqs;
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
  other: "Other",
};
