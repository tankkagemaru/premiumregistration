import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { CommissionRule } from "./commission-rules-shared";

export * from "./commission-rules-shared";

const MOCK: CommissionRule[] = [
  { id: "r1", active: true, scope: "agent_payout", subject_id: "s-celia", subject_name: "Celia", basis: "percent", rate: 15, currency: "MYR", label: "Celia — standard" },
  { id: "r2", active: true, scope: "agent_payout", subject_id: "s-felix", subject_name: "Felix", basis: "percent", rate: 20, min_students: 10, currency: "MYR", label: "Felix — volume tier" },
  { id: "r3", active: true, scope: "university_share", university: "Universiti Putra Malaysia (UPM)", category: "PG_masters", basis: "split", our_share_pct: 30, currency: "MYR", label: "UPM Master's split" },
  { id: "r4", active: true, scope: "handler_incentive", basis: "fixed", rate: 200, currency: "MYR", label: "Handler incentive — default" },
  { id: "r5", active: true, scope: "consultant_markup", track: "corporate", basis: "fixed", rate: 500, currency: "MYR", label: "Training markup" },
];

export async function listCommissionRules(): Promise<CommissionRule[]> {
  if (!authConfigured) return MOCK;
  const supabase = await createClient();
  const { data } = await supabase
    .from("commission_rules")
    .select("*")
    .order("scope", { ascending: true })
    .order("created_at", { ascending: false });
  const rules = (data as CommissionRule[] | null) ?? [];

  const ids = [...new Set(rules.map((r) => r.subject_id).filter(Boolean))] as string[];
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const nameById = Object.fromEntries(
      (profs as { id: string; full_name: string }[] | null ?? []).map((p) => [p.id, p.full_name]),
    );
    for (const r of rules) if (r.subject_id) r.subject_name = nameById[r.subject_id] ?? null;
  }
  return rules;
}
