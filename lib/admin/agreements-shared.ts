/** Agent recruitment-agreement types + constants. Pure, client-safe.
 *
 * Mirrors docs/PECSB_Recruitment_Agreement_MASTER_TEMPLATE.docx:
 * `particulars` = Part 1 (Schedule of Particulars, Items 1–18);
 * `scheme` = Schedule 1 (Commission Scheme, Parts A–F).
 * Finance owns the terms; the agent owns their own identity/bank fields.
 */

export type AgreementStatus =
  | "requested" // agent asked for an agreement + due-diligence docs under review
  | "draft" // finance preparing (finance-initiated; hidden from the agent)
  | "with_agent"
  | "signed_agent"
  | "active"
  | "void";

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

/** One volume tier: `up_to` students per calendar year; null = "and above"
 *  (the open-ended top tier). An agent may have 1–4 tiers. */
export type SchemeTier = { up_to: number | null };

// Row shapes are type aliases (not interfaces) so they satisfy the
// Record<string, …> constraint of the generic rows editor.
export type SchemeUniversityRow = {
  university: string;
  level: string; // e.g. Foundation / Degree / Master's
  amounts: (number | null)[]; // RM per student, aligned to scheme.tiers
};
export type SchemeEnglishRow = {
  length: string; // programme length, e.g. "3 months"
  pcts: (number | null)[]; // % of tuition, aligned to scheme.tiers
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
  tiers?: SchemeTier[]; // 1–4 volume tiers; last is usually open-ended
  university?: SchemeUniversityRow[]; // Part A
  english?: SchemeEnglishRow[]; // Part B
  english_prices?: SchemePriceRow[]; // Part C (reference)
  special_min_pct?: number; // Part D
  special_max_pct?: number;
  one_time?: SchemeFeeRow[]; // Part E (not commissionable)
  visa?: SchemeFeeRow[]; // Part F (not commissionable)
  /** @deprecated legacy two-tier shape — read via normalizeScheme */
  tier1_max?: number;
}

export const MAX_TIERS = 4;

/**
 * Normalize a stored scheme to the tiered shape. Handles the legacy two-tier
 * form (tier1_max + tier1_/tier2_ columns on rows) written by the first
 * version, and guarantees `tiers` has at least one entry and every row's
 * value array matches the tier count.
 */
export function normalizeScheme(raw: AgreementScheme | null | undefined): AgreementScheme {
  const s: AgreementScheme = { ...(raw ?? {}) };
  type LegacyUni = SchemeUniversityRow & { tier1_amount?: number | null; tier2_amount?: number | null };
  type LegacyEng = SchemeEnglishRow & { tier1_pct?: number | null; tier2_pct?: number | null };

  if (!s.tiers || s.tiers.length === 0) {
    s.tiers = s.tier1_max ? [{ up_to: s.tier1_max }, { up_to: null }] : [{ up_to: null }];
  }
  const n = s.tiers.length;
  const pad = (arr: (number | null)[] | undefined, legacy: (number | null | undefined)[]) => {
    const base = arr && arr.length ? [...arr] : legacy.map((x) => x ?? null);
    while (base.length < n) base.push(null);
    return base.slice(0, n);
  };
  s.university = ((s.university ?? []) as LegacyUni[]).map((r) => ({
    university: r.university ?? "",
    level: r.level ?? "",
    amounts: pad(r.amounts, [r.tier1_amount, r.tier2_amount]),
  }));
  s.english = ((s.english ?? []) as LegacyEng[]).map((r) => ({
    length: r.length ?? "",
    pcts: pad(r.pcts, [r.tier1_pct, r.tier2_pct]),
  }));
  return s;
}

/** Human label for tier i, e.g. "Up to 10" / "11–20" / "21+" / "All students". */
export function tierLabel(tiers: SchemeTier[], i: number): string {
  const prev = i > 0 ? tiers[i - 1]?.up_to : null;
  const cur = tiers[i]?.up_to ?? null;
  if (tiers.length === 1) return "All students";
  if (i === 0) return cur != null ? `Up to ${cur}` : "All students";
  const from = (prev ?? 0) + 1;
  return cur != null ? `${from}–${cur}` : `${from}+`;
}

/** The min_students threshold tier i corresponds to (null for the base tier). */
export function tierMinStudents(tiers: SchemeTier[], i: number): number | null {
  if (i === 0) return null;
  const prev = tiers[i - 1]?.up_to;
  return prev != null ? prev + 1 : null;
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
  requested: "Requested — due diligence",
  draft: "Draft — finance preparing",
  with_agent: "With agent — details & signature",
  signed_agent: "Agent signed — awaiting PECSB",
  active: "Active",
  void: "Void",
};

export const AGREEMENT_STATUS_TONE: Record<AgreementStatus, string> = {
  requested: "bg-brand-gold/15 text-brand-gold",
  draft: "bg-cream-50 text-ink-muted",
  with_agent: "bg-status-late-bg text-brand-gold",
  signed_agent: "bg-brand-red-bg text-brand-red",
  active: "bg-status-present/15 text-status-present",
  void: "bg-cream-50 text-ink-muted line-through",
};

/** Due-diligence documents an agent uploads when requesting an agreement. */
export interface AgentDocument {
  id: string;
  agent_id: string;
  kind: string;
  storage_path: string;
  review_status: string; // pending | verified | rejected
  created_at: string;
}

export const AGENT_DOC_KINDS = [
  { kind: "passport", label: "Passport / NRIC", required: true },
  { kind: "business_reg", label: "Business registration (SSM / equivalent)", required: true },
  { kind: "licence", label: "Recruitment licence (if any)", required: false },
  { kind: "other", label: "Other supporting document", required: false },
];

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
