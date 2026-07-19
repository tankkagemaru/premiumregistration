import { requireRole, getProfile, type Role } from "@/lib/auth";
import { listAgentCodes, AGENT_CODE_ROLES } from "@/lib/admin/agent-codes";
import { listUsers } from "@/lib/admin/users";
import { listResources } from "@/lib/admin/resources";
import { listAgreements } from "@/lib/admin/agreements";
import { AgentCodesManager } from "@/components/admin/AgentCodesManager";
import { ResourcesManager } from "@/components/admin/ResourcesManager";
import { AgreementsManager } from "@/components/admin/AgreementsManager";

export default async function AgentCodesPage() {
  await requireRole(AGENT_CODE_ROLES as Role[]);
  const [codes, users, resources, agreements, profile] = await Promise.all([
    listAgentCodes(),
    listUsers(),
    listResources(),
    listAgreements(),
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
          Agent codes
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Referral tracking</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Issue a code for each referral agent. When a student enters it on the
          registration form, the lead is attributed to that agent. Admin, finance
          and marketing can issue and manage codes.
        </p>
      </div>

      <AgentCodesManager codes={codes} agents={agents} />

      {canEditAgreements && (
        <div className="border-t border-border-warm pt-6">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Recruitment agreements
          </p>
          <AgreementsManager agreements={agreements} agents={agents} canEdit={canEditAgreements} />
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
