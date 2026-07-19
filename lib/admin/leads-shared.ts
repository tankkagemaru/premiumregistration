/**
 * Pure types + constants shared by client and server. No server-only imports
 * here, so client components can use it safely.
 */
/**
 * Is this nationality value international (non-Malaysian)? The public form
 * stores ISO "my", but agent-keyed and imported records arrive as "MYS",
 * "Malaysia", "Malaysian"… — a bare !== "my" check routed locals into the visa
 * lane. Blank counts as local (the safer default: no visa case is opened).
 */
export function isInternationalNationality(nationality?: string | null): boolean {
  const n = (nationality ?? "").trim().toLowerCase();
  if (!n) return false;
  return !["my", "mys", "malaysia", "malaysian", "warganegara malaysia"].includes(n);
}

export type LeadStatus = "new" | "contacted" | "quoted" | "enrolled" | "dropped";
export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "quoted", // a quote has been put in front of the lead (set automatically on quote save)
  "enrolled",
  "dropped",
];

export interface Lead {
  id: string;
  created_at: string;
  tracks: string[];
  status: LeadStatus;
  full_name: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  nationality?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  agent_code?: string | null;
  access_code?: string | null; // student tracking / reference code
  passport_no?: string | null;
  next_action?: string | null;
  next_action_due?: string | null;
  assigned_to?: string | null;
  tags?: string[] | null;
  /** Study plan drafted pre-conversion (same shape as applications.plan). */
  plan?: {
    intake?: string;
    summary?: string;
    steps: { title: string; start?: string; end?: string; note?: string }[];
  } | null;
  /** Stale-flag snooze (dismissed with a recorded reason until this date). */
  stale_snoozed_until?: string | null;
  details: Record<string, unknown>;
}

export interface Staff {
  id: string;
  full_name: string;
}

export interface LeadEvent {
  id: string;
  type: string;
  body?: string | null;
  created_at: string;
}

export interface LeadDocument {
  id: string;
  kind: string;
  storage_path: string;
  drive_url?: string | null;
  review_status: string;
  created_at: string;
}

export interface LeadFilters {
  status?: string;
  track?: string;
  q?: string;
}

/** Auth/data are backed by Supabase once URL + anon key are set. */
export const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
