/** Commission rule types + constants. Pure, client-safe. */

export type RuleScope =
  | "agent_payout" // we pay a recruitment agent
  | "university_share" // a university pays us (often a split)
  | "handler_incentive" // internal incentive to the lead handler / marketing
  | "consultant_markup"; // consultant markup (esp. training)

export type RuleBasis = "percent" | "fixed" | "split";

export interface CommissionRule {
  id: string;
  active: boolean;
  scope: RuleScope;
  label?: string | null;
  subject_id?: string | null; // agent / handler profile id
  subject_name?: string | null; // resolved for display
  university?: string | null;
  track?: string | null;
  category?: string | null;
  basis: RuleBasis;
  rate?: number | null; // percent value OR fixed MYR amount
  our_share_pct?: number | null; // for split
  min_students?: number | null; // tier threshold
  base_amount?: number | null; // default fee the rate applies to (settable)
  base_fee_type?: string | null; // what that base represents (tuition | full_fee | promo)
  currency: string;
  notes?: string | null;
}

export const SCOPE_LABEL: Record<RuleScope, string> = {
  agent_payout: "Agent payout (we pay)",
  university_share: "University share (we receive)",
  handler_incentive: "Handler / marketing incentive",
  consultant_markup: "Consultant markup",
};

export const BASIS_LABEL: Record<RuleBasis, string> = {
  percent: "% of value",
  fixed: "Fixed amount",
  split: "Split of university amount",
};

export const RULE_SCOPES: RuleScope[] = [
  "agent_payout",
  "university_share",
  "handler_incentive",
  "consultant_markup",
];
export const RULE_BASES: RuleBasis[] = ["percent", "fixed", "split"];
export const RULE_TRACKS = ["english", "university", "corporate"];
export const RULE_CATEGORIES = ["UG", "PG_masters", "PG_phd", "special", "training"];

// What the settable base fee represents. English commission is paid on tuition
// only (business rule), so english rules default to `tuition`.
export const BASE_FEE_TYPES = ["tuition", "full_fee", "promo"] as const;
export const BASE_FEE_TYPE_LABEL: Record<string, string> = {
  tuition: "Tuition only",
  full_fee: "Full fee",
  promo: "Promotional",
};

export const CATEGORY_LABEL: Record<string, string> = {
  UG: "Undergraduate",
  PG_masters: "Postgraduate — Master's",
  PG_phd: "Postgraduate — PhD",
  special: "Special project",
  training: "Training",
};

/** One-line human summary of a rule's computation. */
export function ruleValue(r: CommissionRule): string {
  if (r.basis === "fixed") return `${r.currency} ${r.rate ?? 0}`;
  if (r.basis === "split") return `${r.our_share_pct ?? 0}% of uni amount`;
  const ofWhat = r.base_fee_type ? ` of ${BASE_FEE_TYPE_LABEL[r.base_fee_type] ?? r.base_fee_type}` : "";
  const base = r.base_amount != null ? ` · base ${r.currency} ${r.base_amount.toLocaleString("en-MY")}` : "";
  return `${r.rate ?? 0}%${ofWhat}${base}`;
}

/** Who/what the rule targets, for the list. */
export function ruleTarget(r: CommissionRule): string {
  const parts = [
    r.subject_name,
    r.university,
    r.track,
    r.category ? CATEGORY_LABEL[r.category] ?? r.category : null,
    r.min_students ? `≥ ${r.min_students} students` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Default";
}
