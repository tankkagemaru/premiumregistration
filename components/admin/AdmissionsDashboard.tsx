import Link from "next/link";
import { listApplications } from "@/lib/admin/applications";
import { listLeads } from "@/lib/admin/leads";
import { listRequests } from "@/lib/admin/requests";
import { planStatus, stageLabel, type Application } from "@/lib/admin/applications-shared";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-card border border-border-warm bg-paper px-5 py-4 transition-colors hover:border-brand-red/50">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl text-ink tabular">{value}</p>
    </Link>
  );
}

/**
 * Admissions' landing overview — the application pipeline they own, not the
 * marketing lead funnel. Surfaces the review-first queue (new applications
 * awaiting the pay / no-pay decision), what's in review, offers to prepare and
 * hand-offs waiting on the team.
 */
export async function AdmissionsDashboard() {
  const [apps, leads, requests] = await Promise.all([
    listApplications(),
    listLeads(),
    listRequests({ toRole: "admissions", openOnly: true }),
  ]);

  const active = apps.filter((a) => a.status === "active");
  const atStage = (s: string) => active.filter((a) => a.stage === s);

  const registration = atStage("registration");
  const inReview = atStage("admissions");
  const offer = atStage("offer");

  // Needs attention.
  const plansToFinalise = inReview.filter((a) => planStatus(a.plan).state !== "finalized");
  const readyToFlag = offer.filter((a) => a.is_international && !a.ready_for_visa);
  const newLeads = leads.filter((l) => l.status === "new").length;

  const attention: { label: string; count: number; href: string; loud?: boolean }[] = [
    { label: "New applications to review", count: registration.length, href: "/admin/applications?stage=registration", loud: true },
    { label: "Study plans to finalise", count: plansToFinalise.length, href: "/admin/applications?stage=admissions" },
    { label: "Offers to prepare", count: offer.length, href: "/admin/applications?stage=offer" },
    { label: "Ready-for-visa to flag", count: readyToFlag.length, href: "/admin/applications?stage=offer" },
    { label: "Requests for Admissions", count: requests.length, href: "/admin/requests" },
    { label: "New leads to convert", count: newLeads, href: "/admin/leads?stage=new" },
  ].filter((a) => a.count > 0);

  const recent = [...active]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Admissions</p>
        <h1 className="font-serif text-3xl font-medium text-ink">Overview</h1>
        <p className="mt-2 text-sm text-ink-soft">Your application pipeline — review, plan, offer and hand off.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="To review (registration)" value={registration.length} href="/admin/applications?stage=registration" />
        <Stat label="In admissions review" value={inReview.length} href="/admin/applications?stage=admissions" />
        <Stat label="At offer" value={offer.length} href="/admin/applications?stage=offer" />
        <Stat label="Active pipeline" value={active.length} href="/admin/applications" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Needs attention</p>
          {attention.length === 0 ? (
            <p className="text-sm text-ink-muted">All clear — nothing waiting.</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {attention.map((a) => (
                <Link key={a.label} href={a.href} className="flex items-center justify-between hover:text-brand-red">
                  <span className="text-ink-soft">{a.label}</span>
                  <span className={`font-medium ${a.loud ? "text-brand-red" : "text-ink"}`}>{a.count}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Recent applications</p>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-muted">No applications yet.</p>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              {recent.map((a: Application) => (
                <Link key={a.id} href={`/admin/applications?app=${a.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-cream-50">
                  <span className="min-w-0 truncate text-ink">{a.student_name}</span>
                  <span className="shrink-0 text-[11px] text-ink-muted">{stageLabel(a.stage, a.track)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
