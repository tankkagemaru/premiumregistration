/** Exec status-lookup result type. Pure, client-safe. */

export interface StatusHit {
  kind: "application" | "lead";
  name: string;
  /** Programme / institution / track summary. */
  detail: string;
  /** Human-readable current stage or lead status. */
  stageLabel: string;
  isInternational: boolean;
  /** Visa stage label for international students; null when N/A or local. */
  visaStageLabel: string | null;
  /** Whether tuition/registration fees are settled; null when there are none. */
  feesCleared: boolean | null;
  nextAction: string | null;
  /** Tracking / access code the student was given, for cross-reference. */
  ref: string | null;
  /** Set for kind="application" — click-through to the read-only detail view. */
  applicationId: string | null;
}

/** Read-only student popout for the exec quick-status search. */
export interface ExecStudentDetail {
  name: string;
  email: string | null;
  program: string;
  trackLabel: string;
  stageLabel: string;
  /** Percent complete across the stages that apply to this student. */
  progressPct: number;
  isInternational: boolean;
  intake: string | null;
  classStart: string | null;
  classEnd: string | null;
  nextAction: string | null;
  nextActionDue: string | null;
  ref: string | null;
  offerAcknowledgedAt: string | null;
  /** Visa progress checklist (done/pending), null for local students. */
  visa: { stageLabel: string; checklist: { label: string; done: boolean; detail?: string }[] } | null;
  fees: { label: string; amount: number; status: string; dueDate: string | null }[];
  plan: {
    intake?: string;
    targetCompletion?: string;
    summary?: string;
    steps: { title: string; start?: string; end?: string }[];
    signoffs: { role: string; by?: string; at: string; note?: string }[];
  } | null;
  /** Recent timeline entries, newest first. */
  events: { type: string; body: string | null; at: string }[];
  /** Documents on file — viewable via /api/admin/appdoc/[id]. */
  documents: { id: string; kind: string; reviewStatus: string; at: string }[];
}
