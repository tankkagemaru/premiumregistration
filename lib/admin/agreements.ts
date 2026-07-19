import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { AgentAgreement, AgentDocument } from "./agreements-shared";

export * from "./agreements-shared";

const MOCK: AgentAgreement[] = [
  {
    id: "agr-1",
    agent_id: "s-kucing",
    agent_name: "Kucing Oren (demo)",
    agent_code: "KUCING",
    status: "with_agent",
    particulars: { payment_days: 14, non_solicit_months: 12, scope: ["english", "university"] },
    scheme: {
      tiers: [{ up_to: 10 }, { up_to: null }],
      english: [{ length: "3 months", pcts: [15, 20] }],
    },
    valid_from: "2026-07-01",
    valid_until: "2027-06-30",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
];

const MOCK_DOCS: AgentDocument[] = [
  { id: "ad-1", agent_id: "s-kucing", kind: "passport", storage_path: "x", review_status: "pending", created_at: "2026-07-01T00:00:00Z" },
];

/** All agreements, newest first, with the agent's name/code resolved (finance view). */
export async function listAgreements(): Promise<AgentAgreement[]> {
  if (!authConfigured) return MOCK;
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_agreements")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data as AgentAgreement[] | null) ?? [];
  const ids = [...new Set(rows.map((r) => r.agent_id))];
  if (ids.length) {
    // Service-role lookup: finance can read agreements but not other profiles
    // under RLS, and the list must still show who each agreement is with.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data: profs } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, agent_code")
      .in("id", ids);
    const byId = new Map(
      ((profs as { id: string; full_name: string; agent_code: string | null }[]) ?? []).map(
        (p) => [p.id, p] as const,
      ),
    );
    for (const r of rows) {
      const p = byId.get(r.agent_id);
      r.agent_name = p?.full_name ?? null;
      r.agent_code = p?.agent_code ?? null;
    }
  }
  return rows;
}

/** The signed-in agent's current agreement (latest non-void, drafts hidden by RLS). */
export async function getAgentOwnAgreement(agentId: string): Promise<AgentAgreement | null> {
  if (!authConfigured) return MOCK[0];
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_agreements")
    .select("*")
    .eq("agent_id", agentId)
    .neq("status", "void")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AgentAgreement | null) ?? null;
}

/** Due-diligence documents for one agent (their own view — RLS scoped). */
export async function listOwnAgentDocuments(agentId: string): Promise<AgentDocument[]> {
  if (!authConfigured) return MOCK_DOCS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_documents")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });
  return (data as AgentDocument[] | null) ?? [];
}

/** All agents' due-diligence documents keyed by agent id (finance view). */
export async function listAgentDocumentsByAgent(): Promise<Record<string, AgentDocument[]>> {
  if (!authConfigured) return { "s-kucing": MOCK_DOCS };
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_documents")
    .select("*")
    .order("created_at", { ascending: false });
  const map: Record<string, AgentDocument[]> = {};
  for (const d of (data as AgentDocument[] | null) ?? []) {
    (map[d.agent_id] ??= []).push(d);
  }
  return map;
}
