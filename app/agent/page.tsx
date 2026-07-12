import { getAgentPortal } from "@/lib/agent/portal";
import { formatMoney } from "@/lib/admin/finance-shared";
import { TRACKS } from "@/lib/config/tracks";
import { AgentLink } from "@/components/agent/AgentLink";
import { AgentRegisterModal } from "@/components/agent/AgentRegisterModal";
import { AgentStudents } from "@/components/agent/AgentStudents";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export default async function AgentHome() {
  const { agent, apps, commissions, fees, docs } = await getAgentPortal();
  const referral = `${APP_URL}/register?agent=${agent.code}`;
  const enrolled = apps.filter((a) =>
    ["enrolled", "active", "completed"].includes(a.stage),
  ).length;
  const payable = commissions.filter((c) => c.direction === "payable");
  const commissionTotal = payable.reduce((s, c) => s + (c.amount ?? 0), 0);
  const commissionPaid = payable
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {agent.name} · {agent.code}
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">Your students</h1>
        </div>
        <AgentRegisterModal agentCode={agent.code} />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Referred", value: apps.length },
          { label: "Enrolled", value: enrolled },
          { label: "Commission", value: commissionTotal ? formatMoney(commissionTotal) : "—" },
          { label: "Paid out", value: commissionPaid ? formatMoney(commissionPaid) : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-border-warm bg-paper px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">{s.label}</p>
            <p className="mt-1 font-serif text-2xl text-ink tabular">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-card border border-border-warm bg-paper p-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Your referral link</p>
        <p className="mb-3 text-sm text-ink-soft">
          Every student who registers through this link is automatically tagged to you and appears below.
        </p>
        <AgentLink url={referral} />
      </div>

      {/* Students — searchable / filterable, click a name to upload docs or the
          ring for a status pop-up. */}
      <AgentStudents apps={apps} fees={fees} commissions={commissions} docs={docs} trackTitles={TRACK_TITLE} />

      <p className="text-xs text-ink-muted">
        Commission status: <span className="font-medium text-ink-soft">Accrued</span> earned, pending our invoice ·{" "}
        <span className="font-medium text-brand-gold">Invoiced</span> invoice submitted ·{" "}
        <span className="font-medium text-status-present">Paid</span> paid out to you.
      </p>
    </div>
  );
}
