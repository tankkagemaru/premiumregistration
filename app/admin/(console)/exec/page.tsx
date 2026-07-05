import { requireRole } from "@/lib/auth";
import { getExecOverview, type PerfRow } from "@/lib/admin/exec";
import { STAGE_LABEL } from "@/lib/admin/applications-shared";
import { formatMoney } from "@/lib/admin/finance-shared";
import { TRACKS } from "@/lib/config/tracks";
import { ExecStatusLookup } from "@/components/admin/ExecStatusLookup";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));

/** Ranked leads → enrolled → conversion table for a performance dimension. */
function PerfTable({
  title,
  rows,
  label = (n) => n,
}: {
  title: string;
  rows: PerfRow[];
  label?: (name: string) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        {title}
      </p>
      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 text-right font-medium">Leads</th>
              <th className="px-4 py-2.5 text-right font-medium">Enrolled</th>
              <th className="px-4 py-2.5 text-right font-medium">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border-warm/60 bg-paper last:border-0">
                <td className="px-4 py-2.5 text-ink">{label(r.name)}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular text-ink-soft">{r.leads}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular text-ink">{r.enrolled}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular text-brand-red">
                  {r.conversionPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-card border border-border-warm bg-paper px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-ink tabular">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

const TONE = {
  ok: "bg-status-present/15 text-status-present",
  warn: "bg-status-late-bg text-brand-gold",
  alert: "bg-brand-red-bg text-brand-red",
};

export default async function ExecPage() {
  await requireRole(["admin", "boss"]);
  const o = await getExecOverview();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Executive
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">How are we doing?</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Aggregate view — enquiries, pipeline, where things are running late, and
          the money position. No personal records on this screen.
        </p>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Enquiries (all time)" value={o.leads.total} />
        <Stat label="New this week" value={o.leads.new7d} />
        <Stat label="Enrolled" value={o.funnel.enrolled} />
        <Stat label="Conversion" value={`${o.funnel.conversionPct}%`} sub="enquiry → enrolled" />
      </div>

      {/* Quick status check — name / passport lookup for on-the-spot answers */}
      <ExecStatusLookup />

      {/* Where things are late */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Running late
        </p>
        <div className="overflow-hidden rounded-card border border-border-warm">
          {o.lateness.map((l) => (
            <div
              key={l.dept}
              className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-ink">{l.dept}</p>
                <p className="text-xs text-ink-muted">{l.metric}</p>
              </div>
              <span className={`rounded-md px-2.5 py-1 font-mono text-sm tabular ${TONE[l.level]}`}>
                {l.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline by stage */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Applications by stage
        </p>
        {o.appsByStage.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
            No applications yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {o.appsByStage.map((s) => (
              <Stat key={s.stage} label={STAGE_LABEL[s.stage] ?? s.stage} value={s.count} />
            ))}
          </div>
        )}
      </section>

      {/* Money position */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Money position
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Fees outstanding" value={formatMoney(o.money.outstandingFees)} />
          <Stat label="Commission we owe" value={formatMoney(o.money.commissionPayable)} />
          <Stat label="Commission owed to us" value={formatMoney(o.money.collectable)} />
        </div>
      </section>

      {/* Performance — who's bringing leads in and converting them */}
      <PerfTable title="Agent / referral performance" rows={o.agents} />
      <PerfTable title="Marketing source performance" rows={o.marketing} />
      <PerfTable title="Campaign performance" rows={o.campaigns} />
      <PerfTable
        title="By track"
        rows={o.byTrack}
        label={(n) => TRACK_TITLE[n] ?? n}
      />

      {o.agents.length === 0 && o.marketing.length === 0 && (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
          No source data yet — performance tables populate as enquiries come in
          with agent codes, UTM tags, or track selections.
        </p>
      )}
    </div>
  );
}
