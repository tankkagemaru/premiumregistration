import { requireRole, getProfile, type Role } from "@/lib/auth";
import { listAgentCodes, AGENT_CODE_ROLES } from "@/lib/admin/agent-codes";
import { listUsersPrivileged } from "@/lib/admin/users";
import { listResources } from "@/lib/admin/resources";
import { listAgreements, listAgentDocumentsByAgent } from "@/lib/admin/agreements";
import { AgentCodesManager } from "@/components/admin/AgentCodesManager";
import { ResourcesManager } from "@/components/admin/ResourcesManager";
import { AgreementsManager } from "@/components/admin/AgreementsManager";

export default async function AgentCodesPage() {
  await requireRole(AGENT_CODE_ROLES as Role[]);
  const [codes, users, resources, agreements, agentDocs, profile] = await Promise.all([
    listAgentCodes(),
    // Privileged: finance/marketing can't read other profiles under RLS, but
    // this page needs the agent list for codes + agreements.
    listUsersPrivileged(),
    listResources(),
    listAgreements(),
    listAgentDocumentsByAgent(),
    getProfile(),
  ]);
  const agents = users
    .filter((u) => u.role === "agent")
    .map((u) => ({ id: u.id, full_name: u.full_name }));
  const canEditResources = !!profile && ["admin", "marketing"].includes(profile.role);
  const canEditAgreements = !!profile && ["admin", "finance"].includes(profile.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Agents
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Agent management</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Everything about referral agents in one place: their tracking codes,
          recruitment agreements, and the resources shown in their portal. A code
          entered on the registration form attributes the lead to that agent.
        </p>
      </div>

      <AgentCodesManager codes={codes} agents={agents} />

      {canEditAgreements && (
        <div className="border-t border-border-warm pt-6">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Recruitment agreements
          </p>
          <AgreementsManager
            agreements={agreements}
            agents={agents}
            agentDocs={agentDocs}
            canEdit={canEditAgreements}
          />
        </div>
      )}

      <div className="border-t border-border-warm pt-6">
        <p className="mb-3 max-w-2xl text-sm text-ink-soft">
          Resources shown to agents in their portal — marketing materials,
          important documents and the referral agreement.
        </p>
        <ResourcesManager resources={resources} canEdit={canEditResources} />
      </div>
    </div>
  );
}
