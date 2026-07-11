/**
 * Pure types + the pipeline stage engine — shared by client and server (no
 * server-only imports). The lane is gated by RESIDENCY, not track: the visa
 * stage only applies to international students.
 */

export interface Stage {
  id: string;
  label: string;
  /** The team that owns the work while an application sits in this stage. */
  owner?: string;
  internationalOnly?: boolean;
}

/**
 * The team-owned student pipeline. Each stage names the team responsible for
 * the work in it; handoffs between teams are gated (see the gate engine). Stage 3
 * ("offer") is track-aware in the UI — "Offer letter" for English, "OL / COL"
 * for university (use `stageLabel(id, track)`).
 */
export const STAGES: Stage[] = [
  { id: "registration", label: "Registration", owner: "finance" },
  { id: "admissions", label: "Admissions review", owner: "admissions" },
  { id: "offer", label: "Offer / OL·COL", owner: "admissions" },
  { id: "visa", label: "Visa / EMGS", owner: "visa", internationalOnly: true },
  { id: "enrolled", label: "Enrolled", owner: "academic" },
  { id: "active", label: "Active", owner: "academic" },
  { id: "completed", label: "Completed" },
];

/**
 * Corporate deals don't follow the student lane — they run
 * enquiry → proposal → quote → HRDF approval → delivery → completed.
 * "enquiry" is the entry stage so lead conversion lands corporate on a valid
 * first stage (students enter at "registration").
 */
export const CORPORATE_STAGES: Stage[] = [
  { id: "enquiry", label: "Enquiry", owner: "marketing" },
  { id: "proposal", label: "Proposal", owner: "admissions" },
  { id: "quote", label: "Quotation", owner: "finance" },
  { id: "hrdf", label: "HRDF approval", owner: "admissions" },
  { id: "delivery", label: "Delivery", owner: "academic" },
  { id: "completed", label: "Completed" },
];

export const STAGE_LABEL: Record<string, string> = {
  ...Object.fromEntries(STAGES.map((s) => [s.id, s.label])),
  ...Object.fromEntries(CORPORATE_STAGES.map((s) => [s.id, s.label])),
  // Back-compat: pre-migration rows may still carry old stage ids in the window
  // between deploying this code and running the stage-rename migration.
  application: "Registration",
  review: "Admissions review",
  accepted: "Offer / OL·COL",
};

/** Track-aware label for a stage — stage 3 reads differently per track. */
export function stageLabel(stageId: string, track?: string): string {
  if (stageId === "offer") {
    if (track === "english") return "Offer letter";
    if (track === "university") return "OL / COL";
  }
  return STAGE_LABEL[stageId] ?? stageId;
}

/** The team that owns an application while it sits in `stageId`. */
export function stageOwner(stageId: string, track?: string): string | undefined {
  const list = track === "corporate" ? CORPORATE_STAGES : STAGES;
  return list.find((s) => s.id === stageId)?.owner;
}

/** Stages that apply — corporate gets its own lane; students drop the visa
 *  stage when local. Track is optional so existing student-path callers keep
 *  working unchanged. */
export function stagesFor(isInternational: boolean, track?: string): Stage[] {
  if (track === "corporate") return CORPORATE_STAGES;
  return STAGES.filter((s) => isInternational || !s.internationalOnly);
}

/** Percent complete over the stages that apply. */
export function stagePercent(
  stage: string,
  isInternational: boolean,
  track?: string,
): number {
  const list = stagesFor(isInternational, track);
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
  registration: ["passport", "transcript", "photo"],
  offer: ["financial"],
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

/**
 * Automation config — what advancing an application to a stage triggers.
 * STAGE_FEES: standard fees scaffolded (amount 0, unpaid) so finance is prompted
 * to set the real figure. STAGE_MILESTONE: the commission milestone accrued.
 * Tune these to PECSB's real process/fee schedule.
 */
export const STAGE_FEES: Record<
  string,
  { type: string; internationalOnly?: boolean }[]
> = {
  // Registration fee is scaffolded on entry to stage 1 so finance can price it
  // immediately — paying it is the gate out of "registration".
  registration: [{ type: "registration" }],
  visa: [
    { type: "visa_emgs", internationalOnly: true },
    { type: "medical", internationalOnly: true },
  ],
  enrolled: [{ type: "tuition" }],
};

export const STAGE_MILESTONE: Record<string, string> = {
  offer: "on_offer",
  enrolled: "on_enrolment",
};

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
  access_code?: string | null; // status-portal code
  stage: string;
  status: ApplicationStatus;
  flag?: Flag;
  next_action?: string | null;
  next_action_due?: string | null;
  class_start?: string | null;
  class_end?: string | null;
  offer_acknowledged_at?: string | null;
  plan?: StudyPlan | null;
}

/** Study plan drafted by admissions/academic and shared with the student —
 *  e.g. "English intensive → September university intake". */
export interface StudyPlan {
  intake?: string; // target intake, free text (e.g. "September 2026")
  target_completion?: string; // date the student intends to finish (ISO date)
  summary?: string;
  steps: { title: string; start?: string; end?: string; note?: string }[];
  updated_at?: string;
  workflow?: PlanWorkflow | null; // cross-department review/handover state
}

/** One department's verification as the plan moves down the handover chain. */
export interface PlanSignoff {
  role: string; // department that signed off (admissions | visa | academic)
  by?: string; // person's name
  at: string; // ISO timestamp
  note?: string;
}

/** Handover/verification state for a study plan. The plan is always drafted by
 *  admissions; `route` is the ordered list of departments that review it after,
 *  each verifying before handing on. Finalised when the last one signs off. */
export interface PlanWorkflow {
  route: string[]; // reviewing roles after admissions, e.g. ["visa","academic"]
  step: number; // index of the current holder in route; === route.length ⇒ finalised
  signoffs: PlanSignoff[];
  started_by?: string;
  started_at?: string;
}

export const PLAN_ROLE_LABEL: Record<string, string> = {
  admissions: "Admissions",
  visa: "Visa",
  academic: "Academic",
};

export interface PlanRoutePreset {
  key: string;
  label: string;
  route: string[];
  desc: string;
}

/** The handover paths admissions can choose when sending a plan for review. */
export const PLAN_ROUTES: PlanRoutePreset[] = [
  {
    key: "via_visa",
    label: "Visa → Academic",
    route: ["visa", "academic"],
    desc: "Admissions drafts → Visa checks → Academic finalises (international / visa needed)",
  },
  {
    key: "academic_first",
    label: "Academic → Visa",
    route: ["academic", "visa"],
    desc: "Admissions drafts → Academic checks → Visa finalises",
  },
  {
    key: "no_visa",
    label: "Academic only",
    route: ["academic"],
    desc: "Admissions drafts → Academic finalises (local student, no visa)",
  },
];

export interface PlanState {
  state: "none" | "draft" | "review" | "finalized";
  holder: string | null; // role currently responsible (draft ⇒ admissions)
  chain: string[]; // full display chain incl. admissions
  signedRoles: string[]; // roles that have signed off, in order
}

/** Derive the human-facing status of a plan's handover from its workflow. */
export function planStatus(plan?: StudyPlan | null): PlanState {
  const wf = plan?.workflow ?? null;
  const hasContent = Boolean(plan?.steps?.length);
  if (!wf) {
    return {
      state: hasContent ? "draft" : "none",
      holder: "admissions",
      chain: ["admissions"],
      signedRoles: [],
    };
  }
  const chain = ["admissions", ...wf.route];
  const signedRoles = wf.signoffs.map((s) => s.role);
  if (wf.step >= wf.route.length) {
    return { state: "finalized", holder: null, chain, signedRoles };
  }
  return { state: "review", holder: wf.route[wf.step], chain, signedRoles };
}

export interface ApplicationEvent {
  id: string;
  type: string;
  body?: string | null;
  created_at: string;
  // Set on work-log entries that carry a proof attachment (WhatsApp screenshot,
  // receipt, …) — the id of the application_document uploaded with the entry.
  attachment_doc_id?: string | null;
}

/** Student contact fields for messaging (not denormalised onto applications). */
export interface AppContact {
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  nationality?: string | null;
}

/** One-off per-application document request (e.g. an unusual EMGS ask). */
export interface AppDocRequest {
  id: string;
  application_id: string;
  kind: string;
  label: string;
  note?: string | null;
  optional: boolean;
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
