import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "./applications-shared";
import type { AgentAgreement, AgentDocument, AgentArrangement, AgreementEvent } from "./agreements-shared";

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

/**
 * Executive rollup of every agent arrangement (for the boss + admin): the
 * agreement, a commission summary and student count per agent. Runs on the
 * service role (the boss can read agreements under RLS but not commissions),
 * gated to admin/boss/finance.
 */
export async function listAgentArrangements(): Promise<AgentArrangement[]> {
  if (!authConfigured) {
    return [
      {
        agreement: MOCK[0],
        commission: { accrued: 1500, invoiced: 0, paid: 3200, total: 4700, currency: "MYR" },
        students: 6,
        docsVerified: 1,
        docsTotal: 2,
      },
    ];
  }
  const profile = await getProfile();
  if (!profile || !["admin", "boss", "finance"].includes(profile.role)) return [];
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: agreements }, { data: profs }, { data: commissions }, { data: apps }, { data: docs }] =
    await Promise.all([
      admin.from("agent_agreements").select("*").neq("status", "void").order("created_at", { ascending: false }),
      admin.from("profiles").select("id, full_name, agent_code").eq("role", "agent"),
      admin.from("commissions").select("agent_id, amount, status, currency").eq("direction", "payable"),
      admin.from("applications").select("agent_id"),
      admin.from("agent_documents").select("agent_id, review_status"),
    ]);

  const nameById = new Map(
    ((profs as { id: string; full_name: string; agent_code: string | null }[]) ?? []).map((p) => [p.id, p] as const),
  );
  const rows = (agreements as AgentAgreement[] | null) ?? [];

  type CommRow = { agent_id: string; amount: number | null; status: string; currency: string | null };
  const commByAgent = new Map<string, CommRow[]>();
  for (const c of (commissions as CommRow[] | null) ?? []) {
    if (!c.agent_id) continue;
    const arr = commByAgent.get(c.agent_id) ?? [];
    arr.push(c);
    commByAgent.set(c.agent_id, arr);
  }
  const studentsByAgent = new Map<string, number>();
  for (const a of (apps as { agent_id: string | null }[] | null) ?? []) {
    if (a.agent_id) studentsByAgent.set(a.agent_id, (studentsByAgent.get(a.agent_id) ?? 0) + 1);
  }
  const docsByAgent = new Map<string, { total: number; verified: number }>();
  for (const d of (docs as { agent_id: string; review_status: string }[] | null) ?? []) {
    const cur = docsByAgent.get(d.agent_id) ?? { total: 0, verified: 0 };
    cur.total += 1;
    if (d.review_status === "verified") cur.verified += 1;
    docsByAgent.set(d.agent_id, cur);
  }

  return rows.map((agr) => {
    const prof = nameById.get(agr.agent_id);
    agr.agent_name = prof?.full_name ?? null;
    agr.agent_code = prof?.agent_code ?? null;
    const cs = commByAgent.get(agr.agent_id) ?? [];
    const sum = (st: string) => cs.filter((c) => c.status === st).reduce((n, c) => n + Number(c.amount ?? 0), 0);
    const accrued = sum("accrued");
    const invoiced = sum("invoiced");
    const paid = sum("paid");
    const d = docsByAgent.get(agr.agent_id) ?? { total: 0, verified: 0 };
    return {
      agreement: agr,
      commission: { accrued, invoiced, paid, total: accrued + invoiced + paid, currency: cs[0]?.currency ?? "MYR" },
      students: studentsByAgent.get(agr.agent_id) ?? 0,
      docsVerified: d.verified,
      docsTotal: d.total,
    };
  });
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

/** Lifecycle events for one agreement, newest first (RLS-scoped: staff or own). */
export async function listAgreementEvents(agreementId: string): Promise<AgreementEvent[]> {
  if (!authConfigured) {
    return [
      { id: "ev-1", agreement_id: agreementId, agent_id: "s-kucing", type: "amendment_request", body: "Requesting tier-2 English commission at 22%.", created_at: "2026-07-10T00:00:00Z" },
    ];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("agreement_events")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("created_at", { ascending: false });
  return (data as AgreementEvent[] | null) ?? [];
}

/** All agreements' lifecycle events keyed by agreement id (staff view). */
export async function listAgreementEventsByAgreement(): Promise<Record<string, AgreementEvent[]>> {
  if (!authConfigured) return { "agr-1": await listAgreementEvents("agr-1") };
  const supabase = await createClient();
  const { data } = await supabase
    .from("agreement_events")
    .select("*")
    .order("created_at", { ascending: false });
  const map: Record<string, AgreementEvent[]> = {};
  for (const e of (data as AgreementEvent[] | null) ?? []) {
    (map[e.agreement_id] ??= []).push(e);
  }
  return map;
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
