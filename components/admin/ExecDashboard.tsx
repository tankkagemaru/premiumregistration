import Link from "next/link";
import { getExecOverview } from "@/lib/admin/exec";
import { formatMoney } from "@/lib/admin/finance-shared";
import { TRACKS } from "@/lib/config/tracks";
import { GeneralRequestButton } from "@/components/admin/GeneralRequestButton";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));
// Distinct hues in the house palette — adjacent slices must be tellable apart.
const PIE_CLS = ["text-brand-red", "text-brand-gold", "text-status-present", "text-inkbtn", "text-ink-muted"];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Conversion / progress ring. */
function Ring({ pct, caption }: { pct: number; caption: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * circ;
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" stroke="currentColor" className="text-ink-muted opacity-15" />
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" strokeLinecap="round" stroke="currentColor" className="text-brand-red" strokeDasharray={`${dash} ${circ}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-4xl text-ink tabular">{pct}%</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{caption}</p>
    </div>
  );
}

/** Simple pie with legend. Handles the single-slice (100%) case. */
function Pie({ segments }: { segments: { label: string; value: number }[] }) {
  const data = segments.filter((s) => s.value > 0);
  const total = data.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p className="text-sm text-ink-muted">No data yet.</p>;

  let angle = -90;
  const cx = 64, cy = 64, r = 60;
  const arcs = data.map((s, i) => {
    const frac = s.value / total;
    const cls = PIE_CLS[i % PIE_CLS.length];
    if (frac >= 0.999) return { full: true, cls };
    const start = angle;
    const end = angle + frac * 360;
    angle = end;
    const p1 = polar(cx, cy, r, start);
    const p2 = polar(cx, cy, r, end);
    const large = frac > 0.5 ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y} Z`, cls };
  });

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 128 128" className="h-32 w-32 shrink-0">
        {arcs.map((a, i) =>
          a.full ? (
            <circle key={i} cx={cx} cy={cy} r={r} fill="currentColor" className={a.cls} />
          ) : (
            <path key={i} d={a.d} fill="currentColor" className={a.cls} />
          ),
        )}
      </svg>
      <div className="flex flex-col gap-1.5 text-sm">
        {data.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-sm bg-current ${PIE_CLS[i % PIE_CLS.length]}`} aria-hidden />
            <span className="text-ink-soft">{s.label}</span>
            <span className="ml-auto font-mono text-xs text-ink tabular">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BigStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-card border border-border-warm bg-paper px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl text-ink tabular">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

const LATE_TONE = {
  ok: "text-status-present",
  warn: "text-brand-gold",
  alert: "text-brand-red",
};

/**
 * Executive at-a-glance — the headline numbers in visual form (conversion ring,
 * source pie, funnel, money). The Executive tab carries the detailed tables.
 */
export async function ExecDashboard() {
  const o = await getExecOverview();
  const maxFunnel = Math.max(1, o.funnel.newCount, o.funnel.contacted, o.funnel.enrolled);
  const funnel = [
    { label: "New", value: o.funnel.newCount },
    { label: "Contacted", value: o.funnel.contacted },
    { label: "Enrolled", value: o.funnel.enrolled },
  ];
  const trackPie = o.byTrack.map((t) => ({ label: TRACK_TITLE[t.name] ?? t.name, value: t.leads }));
  const alerts = o.lateness.filter((l) => l.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Executive</p>
          <h1 className="font-serif text-3xl font-medium text-ink">At a glance</h1>
          <p className="mt-2 text-sm text-ink-soft">The headline numbers. Open the detailed view for the full breakdown.</p>
        </div>
        <div className="flex items-center gap-2">
          <GeneralRequestButton />
          <Link href="/admin/exec" className="rounded-md bg-inkbtn px-4 py-2 text-sm font-medium text-oncolor hover:bg-inkbtn-soft">
            Detailed view →
          </Link>
        </div>
      </div>

      {/* Ring + funnel + headline */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Conversion</p>
          <Ring pct={o.funnel.conversionPct} caption="enquiry → enrolled" />
        </section>

        <section className="rounded-card border border-border-warm bg-paper p-5 lg:col-span-2">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Funnel</p>
          <div className="flex flex-col gap-3">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-20 text-sm text-ink-soft">{f.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-cream-50">
                  <div className="h-full rounded-md bg-brand-red/80" style={{ width: `${(f.value / maxFunnel) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-sm text-ink tabular">{f.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BigStat label="Enquiries (all time)" value={o.leads.total} />
            <BigStat label="New this week" value={o.leads.new7d} />
          </div>
        </section>
      </div>

      {/* Money + source pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Money position</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BigStat label="Fees outstanding" value={formatMoney(o.money.outstandingFees)} />
            <BigStat label="Commission we owe" value={formatMoney(o.money.commissionPayable)} />
            <BigStat label="Owed to us" value={formatMoney(o.money.collectable)} />
          </div>
        </section>

        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Enquiries by track</p>
          <Pie segments={trackPie} />
        </section>
      </div>

      {/* Running late */}
      {alerts.length > 0 && (
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Running late</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((l) => (
              <div key={l.dept} className="flex items-center justify-between gap-3 rounded-md bg-cream-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{l.dept}</p>
                  <p className="truncate text-[11px] text-ink-muted">{l.metric}</p>
                </div>
                <span className={`font-mono text-lg tabular ${LATE_TONE[l.level]}`}>{l.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
