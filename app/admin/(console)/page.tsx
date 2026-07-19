import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { listLeads } from "@/lib/admin/leads";
import { getStalenessDays } from "@/lib/admin/settings";
import { leadStaleness } from "@/lib/config/staleness";
import { TRACKS } from "@/lib/config/tracks";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FinanceDashboard } from "@/components/admin/FinanceDashboard";
import { AdmissionsDashboard } from "@/components/admin/AdmissionsDashboard";
import { VisaDashboard } from "@/components/admin/VisaDashboard";
import { AcademicDashboard } from "@/components/admin/AcademicDashboard";
import { ExecDashboard } from "@/components/admin/ExecDashboard";
import { getConsoleLang, CONSOLE_STR } from "@/lib/admin/console-i18n";
import type { LeadStatus } from "@/lib/admin/leads-shared";

const FUNNEL: LeadStatus[] = ["new", "contacted", "quoted", "enrolled"];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border-warm bg-paper px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-ink tabular">{value}</p>
    </div>
  );
}

export default async function Dashboard() {
  // Role-appropriate landing: each role starts on its own workspace rather than
  // the lead dashboard (which is empty for teams that don't handle leads).
  const profile = await getProfile();
  if (profile?.role === "agent") redirect("/agent");
  // Boss lands on the visual at-a-glance; the Executive tab has the detail.
  if (profile?.role === "boss") return <ExecDashboard />;
  // Academic lands on its own class overview (not straight onto the workspace).
  if (profile?.role === "academic") return <AcademicDashboard />;
  // Visa lands on its own EMGS overview (not straight onto the case table).
  if (profile?.role === "visa") return <VisaDashboard />;
  // Finance lands on its own overview dashboard (not the empty lead dashboard,
  // and not shoved straight onto the raw fee table).
  if (profile?.role === "finance") return <FinanceDashboard />;
  // Admissions own the application pipeline, not the marketing lead funnel —
  // give them an applications-focused overview.
  if (profile?.role === "admissions") return <AdmissionsDashboard />;
  const lang = await getConsoleLang();
  const L = CONSOLE_STR[lang];
  const funnelLabel: Record<string, string> = {
    new: L.dash_status_new,
    contacted: L.dash_status_contacted,
    enrolled: L.dash_status_enrolled,
  };
  const leads = await listLeads();
  const total = leads.length;
  const by = (s: string) => leads.filter((l) => l.status === s).length;
  const enrolled = by("enrolled");
  const conversion = total ? Math.round((enrolled / total) * 100) : 0;
  const maxFunnel = Math.max(1, ...FUNNEL.map(by));

  const trackCount = (id: string) =>
    leads.filter((l) => l.tracks.includes(id)).length;

  const sources = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const s = l.utm_source ?? l.agent_code ?? "direct";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxSource = Math.max(1, ...sources.map(([, n]) => n));

  // Active leads only for the "needs attention" / recent surfaces — converted
  // (enrolled) and dropped leads are done, not work sitting on the dashboard.
  const activeLeads = leads.filter(
    (l) => l.status !== "enrolled" && l.status !== "dropped",
  );

  // Stale leads (console-configured thresholds) — surfaced loudly up top.
  const stalenessDays = await getStalenessDays();
  const now = new Date();
  const staleLeads = activeLeads.filter(
    (l) => leadStaleness(l, now, stalenessDays).level !== "ok",
  );

  const today = new Date().toISOString().slice(0, 10);
  const unassigned = leads.filter((l) => !l.assigned_to && l.status === "new");
  const overdue = leads.filter(
    (l) => l.next_action_due && l.next_action_due < today && l.status !== "enrolled",
  );
  const recent = [...activeLeads]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      {staleLeads.length > 0 && (
        <Link
          href="/admin/leads?stage=attention"
          className="flex items-center justify-between gap-3 rounded-card border border-brand-red/40 bg-brand-red-bg px-5 py-4 transition-colors hover:border-brand-red"
        >
          <div>
            <p className="font-serif text-lg font-medium text-brand-red">
              {staleLeads.length}{" "}
              {staleLeads.length === 1 ? L.dash_lead : L.dash_leads}{" "}
              {L.dash_leads_need_attention}
            </p>
            <p className="text-sm text-ink-soft">{L.dash_going_cold}</p>
          </div>
          <span className="shrink-0 text-sm font-medium text-brand-red">
            {L.dash_review}
          </span>
        </Link>
      )}
      {total === 0 && (
        <div className="rounded-card border border-border-warm bg-paper p-6">
          <p className="font-serif text-xl text-ink">Welcome — let&apos;s get started.</p>
          <p className="mt-1 text-sm text-ink-soft">
            No leads yet. Add your first enquiry from the Leads tab, or share the
            public registration form with prospects.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/leads"
              className="rounded-md bg-inkbtn px-4 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft"
            >
              Go to Leads
            </Link>
            <a
              href="/register"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border-warm bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
            >
              Open the registration form
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={L.dash_total_leads} value={total} />
        <Stat label={L.dash_new} value={by("new")} />
        <Stat label={L.dash_enrolled} value={enrolled} />
        <Stat label={L.dash_conversion} value={`${conversion}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {L.dash_funnel}
          </p>
          <div className="flex flex-col gap-3">
            {FUNNEL.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-20 text-sm text-ink-soft">{funnelLabel[s] ?? s}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-cream-50">
                  <div
                    className="h-full rounded-md bg-brand-red/80"
                    style={{ width: `${(by(s) / maxFunnel) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-sm text-ink tabular">
                  {by(s)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Source breakdown */}
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {L.dash_sources}
          </p>
          <div className="flex flex-col gap-3">
            {sources.map(([name, n]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-20 truncate text-sm text-ink-soft">{name}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-cream-50">
                  <div
                    className="h-full rounded-md bg-brand-gold/70"
                    style={{ width: `${(n / maxSource) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-sm text-ink tabular">
                  {n}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* By track + needs attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {L.dash_by_track}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {TRACKS.map((t) => (
              <div key={t.id} className="rounded-md bg-cream-50 px-3 py-3 text-center">
                <p className="font-serif text-2xl text-ink tabular">
                  {trackCount(t.id)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{t.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {L.dash_needs_attention}
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/admin/leads?stage=new" className="flex justify-between hover:text-brand-red">
              <span className="text-ink-soft">{L.dash_unassigned}</span>
              <span className="font-medium text-ink">{unassigned.length}</span>
            </Link>
            <Link href="/admin/follow-ups" className="flex justify-between hover:text-brand-red">
              <span className="text-ink-soft">{L.dash_overdue_followups}</span>
              <span className="font-medium text-brand-red">{overdue.length}</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Recent */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          {L.dash_recent}
        </p>
        <div className="overflow-hidden rounded-card border border-border-warm">
          {recent.map((l) => (
            <Link
              key={l.id}
              href={`/admin/leads?lead=${l.id}`}
              className="flex items-center justify-between border-b border-border-warm/60 bg-paper px-4 py-3 transition-colors last:border-0 hover:bg-cream-50"
            >
              <div>
                <p className="text-sm font-medium text-ink">{l.full_name}</p>
                <p className="text-xs text-ink-muted">
                  {l.tracks.map((t) => TRACKS.find((x) => x.id === t)?.title ?? t).join(", ")}
                </p>
              </div>
              <StatusBadge status={l.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
