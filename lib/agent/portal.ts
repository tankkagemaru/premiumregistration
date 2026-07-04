import { getProfile } from "@/lib/auth";
import {
  listApplications,
  listDocumentsForApps,
  type ApplicationDocRow,
} from "@/lib/admin/applications";
import { listCommissions, listFees } from "@/lib/admin/finance";
import type { Application } from "@/lib/admin/applications-shared";
import type { Commission, Fee } from "@/lib/admin/finance-shared";

export interface AgentContext {
  id: string;
  code: string;
  name: string;
}

/**
 * The signed-in agent's portal data — scoped to their own students only.
 * In dev (bypass admin), returns a demo agent so the portal is browsable.
 */
export async function getAgentPortal(): Promise<{
  agent: AgentContext;
  apps: Application[];
  commissions: Commission[];
  fees: Fee[];
  docs: ApplicationDocRow[];
}> {
  const profile = await getProfile();
  const agent: AgentContext =
    profile?.role === "agent"
      ? { id: profile.id, code: profile.agent_code ?? "", name: profile.full_name }
      : { id: "s-celia", code: "CELIA", name: "Celia (demo)" };

  const apps = await listApplications({ agentId: agent.id });
  const appIds = apps.map((a) => a.id);
  const [commissions, allFees, docs] = await Promise.all([
    listCommissions(agent.id),
    // RLS scopes fees to applications the agent owns; we filter again by app id
    // so the dev mock (which returns everything) matches live behaviour.
    listFees(),
    listDocumentsForApps(appIds),
  ]);
  const idSet = new Set(appIds);
  const fees = allFees.filter((f) => idSet.has(f.application_id));
  return { agent, apps, commissions, fees, docs };
}
