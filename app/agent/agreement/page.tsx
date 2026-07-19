import { requireRole, getProfile } from "@/lib/auth";
import {
  getAgentOwnAgreement,
  listOwnAgentDocuments,
} from "@/lib/admin/agreements";
import { AgentAgreementCard } from "@/components/agent/AgentAgreementCard";
import { AgentAgreementRequest } from "@/components/agent/AgentAgreementRequest";

/**
 * The agent's Agreement tab. Three phases:
 *   1. No agreement — upload due-diligence documents + request one.
 *   2. Requested — documents under review; finance prepares the terms.
 *   3. With agent onwards — complete details, sign, download (AgentAgreementCard).
 * (The executed agreement is an English-language document — Clause 23h.)
 */
export default async function AgentAgreementPage() {
  await requireRole(["agent", "admin"]);
  const profile = await getProfile();
  const agentId = profile?.role === "agent" ? profile.id : "s-kucing";
  const [agreement, docs] = await Promise.all([
    getAgentOwnAgreement(agentId),
    listOwnAgentDocuments(agentId),
  ]);

  const inRequest = !agreement || agreement.status === "requested";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Partnership
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Recruitment agreement</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Your representative agreement with PECSB — due-diligence documents,
          terms, commission scheme and signatures, all in one place.
        </p>
      </div>

      {inRequest && (
        <AgentAgreementRequest docs={docs} requested={agreement?.status === "requested"} />
      )}

      {agreement && agreement.status !== "requested" && (
        <AgentAgreementCard agreement={agreement} />
      )}
    </div>
  );
}
