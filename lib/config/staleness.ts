/**
 * Stale-record flagging config. Thresholds (in days) after which a lead is
 * considered to need attention, plus a pure evaluator the UI uses to show a
 * warning. Edit the numbers here to tune what counts as "going cold". Closed
 * leads (enrolled / dropped) are never flagged.
 */

export interface StalenessRule {
  days: number;
  label: string;
  level: "warn" | "alert";
}

export const STALENESS_RULES = {
  // A brand-new lead nobody has contacted yet.
  newUncontacted: { days: 3, label: "No contact yet", level: "warn" } as StalenessRule,
  // A scheduled follow-up whose due date has passed.
  followupOverdue: { days: 0, label: "Follow-up overdue", level: "alert" } as StalenessRule,
  // An open lead with no next action / follow-up scheduled at all.
  noFollowup: { days: 5, label: "No follow-up scheduled", level: "warn" } as StalenessRule,
  // Contacted but sitting untouched for too long (measured from creation as a
  // proxy for last activity when no follow-up date is set).
  contactedStalled: { days: 14, label: "Stalled after contact", level: "alert" } as StalenessRule,
};

export type StaleLevel = "ok" | "warn" | "alert";

export interface StalenessResult {
  level: StaleLevel;
  reasons: string[];
}

/** Whole days from an ISO date/timestamp to `now` (negative if in the future). */
function daysSince(iso: string | null | undefined, now: Date): number {
  if (!iso) return NaN;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return NaN;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

/** Lead fields the evaluator needs (subset of Lead). */
export interface StalenessInput {
  status: string;
  created_at: string;
  next_action_due?: string | null;
}

export function leadStaleness(
  lead: StalenessInput,
  now: Date = new Date(),
): StalenessResult {
  // Closed leads are done — never nag about them.
  if (lead.status === "enrolled" || lead.status === "dropped") {
    return { level: "ok", reasons: [] };
  }

  const reasons: string[] = [];
  let level: StaleLevel = "ok";
  const bump = (l: "warn" | "alert") => {
    if (l === "alert" || level === "ok") level = l;
  };

  const age = daysSince(lead.created_at, now);
  const overdueBy = daysSince(lead.next_action_due, now);

  if (!Number.isNaN(overdueBy) && overdueBy > STALENESS_RULES.followupOverdue.days) {
    reasons.push(STALENESS_RULES.followupOverdue.label);
    bump(STALENESS_RULES.followupOverdue.level);
  }
  if (lead.status === "new" && age >= STALENESS_RULES.newUncontacted.days) {
    reasons.push(STALENESS_RULES.newUncontacted.label);
    bump(STALENESS_RULES.newUncontacted.level);
  }
  if (!lead.next_action_due && age >= STALENESS_RULES.noFollowup.days) {
    reasons.push(STALENESS_RULES.noFollowup.label);
    bump(STALENESS_RULES.noFollowup.level);
  }
  if (
    lead.status === "contacted" &&
    !lead.next_action_due &&
    age >= STALENESS_RULES.contactedStalled.days
  ) {
    reasons.push(STALENESS_RULES.contactedStalled.label);
    bump(STALENESS_RULES.contactedStalled.level);
  }

  return { level, reasons };
}
