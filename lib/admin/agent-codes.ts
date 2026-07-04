import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { AgentCode } from "./agent-codes-shared";

export * from "./agent-codes-shared";

const MOCK: AgentCode[] = [
  { id: "ac1", created_at: "2026-07-01T00:00:00Z", code: "AG-CELIA1", agent_name: "Celia", contact: "celia@example.com", active: true, issued_by_name: "Administrator" },
  { id: "ac2", created_at: "2026-06-20T00:00:00Z", code: "AG-FELIX2", agent_name: "Felix", contact: "+60 12-345 6789", active: true, issued_by_name: "Administrator" },
];

export async function listAgentCodes(): Promise<AgentCode[]> {
  if (!authConfigured) return MOCK;
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_codes")
    .select("*")
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });
  const codes = (data as AgentCode[] | null) ?? [];

  const ids = [...new Set(codes.map((c) => c.issued_by).filter(Boolean))] as string[];
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const nameById = Object.fromEntries(
      (profs as { id: string; full_name: string }[] | null ?? []).map((p) => [p.id, p.full_name]),
    );
    for (const c of codes) if (c.issued_by) c.issued_by_name = nameById[c.issued_by] ?? null;
  }
  return codes;
}
