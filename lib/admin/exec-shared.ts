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
}
