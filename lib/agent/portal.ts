import { getProfile } from "@/lib/auth";
import { listApplications } from "@/lib/admin/applications";
import type { Application } from "@/lib/admin/applications-shared";

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
}> {
  const profile = await getProfile();
  const agent: AgentContext =
    profile?.role === "agent"
      ? { id: profile.id, code: profile.agent_code ?? "", name: profile.full_name }
      : { id: "s-celia", code: "CELIA", name: "Celia (demo)" };

  const apps = await listApplications({ agentId: agent.id });
  return { agent, apps };
}
