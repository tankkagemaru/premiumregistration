import { requireRole, type Role } from "@/lib/auth";
import { listAgentCodes, AGENT_CODE_ROLES } from "@/lib/admin/agent-codes";
import { listUsers } from "@/lib/admin/users";
import { AgentCodesManager } from "@/components/admin/AgentCodesManager";

export default async function AgentCodesPage() {
  await requireRole(AGENT_CODE_ROLES as Role[]);
  const [codes, users] = await Promise.all([listAgentCodes(), listUsers()]);
  const agents = users
    .filter((u) => u.role === "agent")
    .map((u) => ({ id: u.id, full_name: u.full_name }));

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
    </div>
  );
}
