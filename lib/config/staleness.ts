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

export type StalenessKey = keyof typeof STALENESS_RULES;

/** Day thresholds only — the editable part, stored in app_settings. */
export type StalenessDays = Record<StalenessKey, number>;

export const DEFAULT_STALENESS_DAYS: StalenessDays = {
  newUncontacted: STALENESS_RULES.newUncontacted.days,
  followupOverdue: STALENESS_RULES.followupOverdue.days,
  noFollowup: STALENESS_RULES.noFollowup.days,
  contactedStalled: STALENESS_RULES.contactedStalled.days,
};

/** Apply saved day thresholds over the built-in rules (labels/levels fixed). */
export function rulesWithDays(days?: Partial<StalenessDays> | null) {
  const d = { ...DEFAULT_STALENESS_DAYS, ...(days ?? {}) };
  return {
    newUncontacted: { ...STALENESS_RULES.newUncontacted, days: d.newUncontacted },
    followupOverdue: { ...STALENESS_RULES.followupOverdue, days: d.followupOverdue },
    noFollowup: { ...STALENESS_RULES.noFollowup, days: d.noFollowup },
    contactedStalled: { ...STALENESS_RULES.contactedStalled, days: d.contactedStalled },
  };
}

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
  stale_snoozed_until?: string | null; // dismissed-with-reason until this date
}

export function leadStaleness(
  lead: StalenessInput,
  now: Date = new Date(),
  days?: Partial<StalenessDays> | null, // console-configured thresholds
): StalenessResult {
  // Closed leads are done — never nag about them.
  if (lead.status === "enrolled" || lead.status === "dropped") {
    return { level: "ok", reasons: [] };
  }
  // Dismissed with a recorded reason — stay quiet until the snooze expires.
  if (
    lead.stale_snoozed_until &&
    new Date(lead.stale_snoozed_until).getTime() >= now.getTime() - 86_400_000
  ) {
    return { level: "ok", reasons: [] };
  }
  const rules = rulesWithDays(days);

  const reasons: string[] = [];
  let level: StaleLevel = "ok";
  const bump = (l: "warn" | "alert") => {
    if (l === "alert" || level === "ok") level = l;
  };

  const age = daysSince(lead.created_at, now);
  const overdueBy = daysSince(lead.next_action_due, now);

  if (!Number.isNaN(overdueBy) && overdueBy > rules.followupOverdue.days) {
    reasons.push(rules.followupOverdue.label);
    bump(rules.followupOverdue.level);
  }
  if (lead.status === "new" && age >= rules.newUncontacted.days) {
    reasons.push(rules.newUncontacted.label);
    bump(rules.newUncontacted.level);
  }
  if (!lead.next_action_due && age >= rules.noFollowup.days) {
    reasons.push(rules.noFollowup.label);
    bump(rules.noFollowup.level);
  }
  if (
    lead.status === "contacted" &&
    !lead.next_action_due &&
    age >= rules.contactedStalled.days
  ) {
    reasons.push(rules.contactedStalled.label);
    bump(rules.contactedStalled.level);
  }

  return { level, reasons };
}
