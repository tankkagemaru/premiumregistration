import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { DocRequirement } from "@/lib/config/documents";
import { SEED_DOC_RULES, matchDocRules, type DocRule, type MatchOpts } from "./doc-rules-shared";

export * from "./doc-rules-shared";

export async function listDocRules(includeInactive = false): Promise<DocRule[]> {
  if (!authConfigured) return SEED_DOC_RULES;
  const supabase = await createClient();
  let q = supabase.from("document_rules").select("*").order("sort_order", { ascending: true });
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  const rows = (data as DocRule[] | null) ?? [];
  return rows.length ? rows : SEED_DOC_RULES;
}

/** Active document requirements for an applicant (rules resolved from the DB). */
export async function getDocRequirements(opts: MatchOpts): Promise<DocRequirement[]> {
  const rules = await listDocRules(false);
  return matchDocRules(rules, opts);
}
