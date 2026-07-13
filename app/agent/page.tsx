import { getAgentPortal } from "@/lib/agent/portal";
import { listResources } from "@/lib/admin/resources";
import { RESOURCE_CATEGORIES } from "@/lib/admin/resources-shared";
import { formatMoney } from "@/lib/admin/finance-shared";
import { getConsoleLang, CONSOLE_STR } from "@/lib/admin/console-i18n";
import { TRACKS } from "@/lib/config/tracks";
import { ExternalLink } from "lucide-react";
import { AgentLink } from "@/components/agent/AgentLink";
import { AgentRegisterModal } from "@/components/agent/AgentRegisterModal";
import { AgentMeetingButton } from "@/components/agent/AgentMeetingButton";
import { AgentStudents } from "@/components/agent/AgentStudents";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export default async function AgentHome() {
  const { agent, apps, commissions, fees, docs, visaCases } = await getAgentPortal();
  const resources = await listResources(true);
  const lang = await getConsoleLang();
  const L = CONSOLE_STR[lang];
  const referral = `${APP_URL}/register?agent=${agent.code}`;
  const enrolled = apps.filter((a) =>
    ["enrolled", "active", "completed"].includes(a.stage),
  ).length;
  const payable = commissions.filter((c) => c.direction === "payable");
  const commissionTotal = payable.reduce((s, c) => s + (c.amount ?? 0), 0);
  const sumBy = (st: string) =>
    payable.filter((c) => c.status === st).reduce((s, c) => s + (c.amount ?? 0), 0);
  const commissionPaid = sumBy("paid");
  const commissionAccrued = sumBy("accrued");
  const commissionInvoiced = sumBy("invoiced");
  const commissionBar = [
    { id: "accrued", label: L.ag_accrued, value: commissionAccrued, cls: "bg-ink-muted/40" },
    { id: "invoiced", label: L.ag_invoiced, value: commissionInvoiced, cls: "bg-brand-gold" },
    { id: "paid", label: L.ag_paid, value: commissionPaid, cls: "bg-status-present" },
  ].filter((b) => b.value > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {agent.name} · {agent.code}
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">{L.ag_your_students}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AgentMeetingButton lang={lang} />
          <AgentRegisterModal agentCode={agent.code} lang={lang} />
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: L.ag_stat_referred, value: apps.length },
          { label: L.ag_stat_enrolled, value: enrolled },
          { label: L.ag_stat_commission, value: commissionTotal ? formatMoney(commissionTotal) : "—" },
          { label: L.ag_stat_paid_out, value: commissionPaid ? formatMoney(commissionPaid) : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-border-warm bg-paper px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">{s.label}</p>
            <p className="mt-1 font-serif text-2xl text-ink tabular">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Commission breakdown — where your earnings stand */}
      {commissionTotal > 0 && (
        <div className="rounded-card border border-border-warm bg-paper p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">{L.ag_commission}</p>
            <span className="font-serif text-lg text-ink tabular">{formatMoney(commissionTotal)}</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-cream-50">
            {commissionBar.map((b) => (
              <div key={b.id} className={b.cls} style={{ width: `${(b.value / commissionTotal) * 100}%` }} title={`${b.label}: ${formatMoney(b.value)}`} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span className="text-ink-soft"><span className="inline-block h-2 w-2 rounded-sm bg-ink-muted/40 align-middle" /> {L.ag_accrued} <span className="font-medium text-ink">{formatMoney(commissionAccrued)}</span></span>
            <span className="text-ink-soft"><span className="inline-block h-2 w-2 rounded-sm bg-brand-gold align-middle" /> {L.ag_invoiced} <span className="font-medium text-ink">{formatMoney(commissionInvoiced)}</span></span>
            <span className="text-ink-soft"><span className="inline-block h-2 w-2 rounded-sm bg-status-present align-middle" /> {L.ag_paid} <span className="font-medium text-ink">{formatMoney(commissionPaid)}</span></span>
          </div>
        </div>
      )}

      {/* Referral link */}
      <div className="rounded-card border border-border-warm bg-paper p-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">{L.ag_referral_link}</p>
        <p className="mb-3 text-sm text-ink-soft">
          {L.ag_referral_desc}
        </p>
        <AgentLink url={referral} lang={lang} />
      </div>

      {/* Students — searchable / filterable, click a name to upload docs or the
          ring for a status pop-up. */}
      <AgentStudents apps={apps} fees={fees} commissions={commissions} docs={docs} visaCases={visaCases} trackTitles={TRACK_TITLE} lang={lang} />

      <p className="text-xs text-ink-muted">
        {L.ag_commission_status} <span className="font-medium text-ink-soft">{L.ag_accrued}</span> {L.ag_accrued_desc} ·{" "}
        <span className="font-medium text-brand-gold">{L.ag_invoiced}</span> {L.ag_invoiced_desc} ·{" "}
        <span className="font-medium text-status-present">{L.ag_paid}</span> {L.ag_paid_desc}.
      </p>

      {/* Resources — marketing materials, documents, your agreement */}
      {resources.length > 0 && (
        <div className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">{L.ag_resources}</p>
          <div className="grid gap-5 sm:grid-cols-3">
            {RESOURCE_CATEGORIES.map((cat) => {
              const items = resources.filter((r) => r.category === cat.id);
              if (items.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">{cat.label}</p>
                  <ul className="flex flex-col gap-1">
                    {items.map((r) => (
                      <li key={r.id}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-red hover:underline">
                          {r.label} <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
