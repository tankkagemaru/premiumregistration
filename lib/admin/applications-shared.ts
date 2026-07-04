/**
 * Pure types + the pipeline stage engine — shared by client and server (no
 * server-only imports). The lane is gated by RESIDENCY, not track: the visa
 * stage only applies to international students.
 */

export interface Stage {
  id: string;
  label: string;
  internationalOnly?: boolean;
}

export const STAGES: Stage[] = [
  { id: "application", label: "Application" },
  { id: "review", label: "Review" },
  { id: "offer", label: "Offer" },
  { id: "accepted", label: "Accepted" },
  { id: "visa", label: "Visa", internationalOnly: true },
  { id: "enrolled", label: "Enrolled" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.label]),
);

/** Stages that apply to a given student, dropping visa for local students. */
export function stagesFor(isInternational: boolean): Stage[] {
  return STAGES.filter((s) => isInternational || !s.internationalOnly);
}

/** Percent complete over the stages that apply to this student. */
export function stagePercent(stage: string, isInternational: boolean): number {
  const list = stagesFor(isInternational);
  const idx = list.findIndex((s) => s.id === stage);
  return idx < 0 ? 0 : Math.round(((idx + 1) / list.length) * 100);
}

/**
 * Health flag driving the ring colour:
 *  action  → red    (something is needed from the applicant/agent)
 *  progress→ amber  (being worked on, nothing outstanding)
 *  ok      → green  (nothing flagged / enrolled / complete)
 */
export type Flag = "ok" | "progress" | "action";

/** Documents expected by the time a stage is reached (for the checklist). */
export const STAGE_DOCS: Record<string, string[]> = {
  application: ["passport", "transcript", "photo"],
  accepted: ["financial"],
  visa: ["medical", "eval"],
};

/** Human labels for document kinds. */
export const DOC_LABEL: Record<string, string> = {
  passport: "Passport",
  transcript: "Transcript",
  photo: "Photo",
  financial: "Financial proof",
  medical: "Medical report",
  eval: "Qualification evaluation",
  val: "Visa approval letter",
  offer_letter: "Offer letter",
  other: "Other",
};

/**
 * All document kinds expected by the time an application reaches `stage`
 * (cumulative over every stage up to and including the current one), respecting
 * the residency lane (visa docs only for international students).
 */
export function expectedDocs(stage: string, isInternational: boolean): string[] {
  const list = stagesFor(isInternational);
  const idx = list.findIndex((s) => s.id === stage);
  const upto = idx < 0 ? list : list.slice(0, idx + 1);
  const kinds = new Set<string>();
  for (const s of upto) (STAGE_DOCS[s.id] ?? []).forEach((k) => kinds.add(k));
  return [...kinds];
}

export type ApplicationStatus = "active" | "withdrawn" | "completed";

export interface Application {
  id: string;
  created_at: string;
  student_id: string;
  student_name: string;
  student_email: string;
  is_international: boolean;
  track: string;
  target_institution?: string | null;
  program_name?: string | null;
  qualification_level?: string | null;
  intake?: string | null;
  submitted_by: string; // student | agent | staff
  agent_id?: string | null;
  agent_name?: string | null;
  assigned_to?: string | null;
  stage: string;
  status: ApplicationStatus;
  flag?: Flag;
  next_action?: string | null;
  next_action_due?: string | null;
  class_start?: string | null;
  class_end?: string | null;
}

export interface ApplicationEvent {
  id: string;
  type: string;
  body?: string | null;
  created_at: string;
}

export interface ApplicationDoc {
  id: string;
  kind: string;
  review_status: string;
}

export const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
