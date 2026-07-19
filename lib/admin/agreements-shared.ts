/** Agent recruitment-agreement types + constants. Pure, client-safe.
 *
 * Mirrors docs/PECSB_Recruitment_Agreement_MASTER_TEMPLATE.docx:
 * `particulars` = Part 1 (Schedule of Particulars, Items 1–18);
 * `scheme` = Schedule 1 (Commission Scheme, Parts A–F).
 * Finance owns the terms; the agent owns their own identity/bank fields.
 */

export type AgreementStatus = "draft" | "with_agent" | "signed_agent" | "active" | "void";

export interface AgreementParticulars {
  // ---- finance-set terms ----
  agreement_date?: string; // Item 1 (ISO date)
  territory?: string; // Item 8
  scope?: string[]; // Item 9 — english | university | special | corporate
  term_months?: number; // Item 10
  renewal?: "automatic" | "written";
  sub_agents?: boolean; // Item 11
  minors?: boolean; // Item 12
  minors_min_age?: number;
  payment_days?: number; // Item 14 (default 14 working days)
  clawback_months?: number; // Item 15
  non_solicit_months?: number; // Item 16 (default 12)
  pecsb_attn?: string; // Item 7
  pecsb_email?: string;
  pecsb_tel?: string;
  // ---- agent-set (their own record) ----
  legal_name?: string; // Item 2
  reg_no?: string; // Item 3
  address?: string; // Item 4
  signatory_name?: string; // Item 5
  signatory_id?: string; // NRIC / passport
  signatory_designation?: string;
  notice_attn?: string; // Item 6
  notice_email?: string;
  notice_tel?: string;
  bank_name?: string; // Item 17
  bank_account_name?: string;
  bank_account_no?: string;
}

/** The subset of particulars the AGENT may write (server-enforced). */
export const AGENT_PARTICULAR_KEYS = [
  "legal_name", "reg_no", "address",
  "signatory_name", "signatory_id", "signatory_designation",
  "notice_attn", "notice_email", "notice_tel",
  "bank_name", "bank_account_name", "bank_account_no",
] as const satisfies readonly (keyof AgreementParticulars)[];

/** Agent fields that must be present before the agent can sign. */
export const AGENT_REQUIRED_KEYS = [
  "legal_name", "address", "signatory_name", "signatory_id",
  "notice_email", "bank_name", "bank_account_name", "bank_account_no",
] as const satisfies readonly (keyof AgreementParticulars)[];

// Row shapes are type aliases (not interfaces) so they satisfy the
// Record<string, …> constraint of the generic rows editor.
export type SchemeUniversityRow = {
  university: string;
  level: string; // e.g. Foundation / Degree / Master's
  tier1_amount: number | null; // RM per student, up to tier threshold
  tier2_amount: number | null; // RM per student, above threshold
};
export type SchemeEnglishRow = {
  length: string; // programme length, e.g. "3 months"
  tier1_pct: number | null;
  tier2_pct: number | null;
};
export type SchemePriceRow = {
  programme: string;
  f2f: number | null;
  online: number | null;
};
export type SchemeFeeRow = {
  item: string;
  amount: number | null;
};

export interface AgreementScheme {
  tier1_max?: number; // Tier 1 = up to N students / calendar year
  university?: SchemeUniversityRow[]; // Part A
  english?: SchemeEnglishRow[]; // Part B
  english_prices?: SchemePriceRow[]; // Part C (reference)
  special_min_pct?: number; // Part D
  special_max_pct?: number;
  one_time?: SchemeFeeRow[]; // Part E (not commissionable)
  visa?: SchemeFeeRow[]; // Part F (not commissionable)
}

export interface AgentAgreement {
  id: string;
  agent_id: string;
  agent_name?: string | null; // resolved for display
  agent_code?: string | null;
  status: AgreementStatus;
  particulars: AgreementParticulars;
  scheme: AgreementScheme;
  valid_from?: string | null;
  valid_until?: string | null;
  agent_signed_name?: string | null;
  agent_signed_designation?: string | null;
  agent_signed_at?: string | null;
  agent_signature_kind?: string | null; // typed | uploaded
  pecsb_signed_name?: string | null;
  pecsb_signed_designation?: string | null;
  pecsb_signed_at?: string | null;
  signed_doc_path?: string | null;
  created_at: string;
  updated_at: string;
}

export const AGREEMENT_STATUS_LABEL: Record<AgreementStatus, string> = {
  draft: "Draft — finance preparing",
  with_agent: "With agent — details & signature",
  signed_agent: "Agent signed — awaiting PECSB",
  active: "Active",
  void: "Void",
};

export const AGREEMENT_STATUS_TONE: Record<AgreementStatus, string> = {
  draft: "bg-cream-50 text-ink-muted",
  with_agent: "bg-status-late-bg text-brand-gold",
  signed_agent: "bg-brand-red-bg text-brand-red",
  active: "bg-status-present/15 text-status-present",
  void: "bg-cream-50 text-ink-muted line-through",
};

export const SCOPE_OPTIONS = [
  { id: "english", label: "English programmes" },
  { id: "university", label: "University placement" },
  { id: "special", label: "Special programmes" },
  { id: "corporate", label: "Corporate / group programmes" },
];

/** Missing required agent fields (empty = ready to sign). */
export function missingAgentFields(p: AgreementParticulars): string[] {
  return AGENT_REQUIRED_KEYS.filter((k) => !String(p[k] ?? "").trim());
}

export const AGENT_FIELD_LABEL: Record<string, string> = {
  legal_name: "Legal / company name",
  reg_no: "Business registration no.",
  address: "Registered address",
  signatory_name: "Authorised signatory — name",
  signatory_id: "Signatory NRIC / passport",
  signatory_designation: "Signatory designation",
  notice_attn: "Notices — attention",
  notice_email: "Notices — email",
  notice_tel: "Notices — phone",
  bank_name: "Bank",
  bank_account_name: "Account name",
  bank_account_no: "Account number",
};
