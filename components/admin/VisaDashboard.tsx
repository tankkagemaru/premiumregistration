import Link from "next/link";
import { listVisaCases } from "@/lib/admin/visa";
import { listRequests } from "@/lib/admin/requests";
import { expiryFlag, VISA_STAGE_LABEL } from "@/lib/admin/visa-shared";

function Stat({ label, value, href, loud }: { label: string; value: number; href: string; loud?: boolean }) {
  return (
    <Link href={href} className="rounded-card border border-border-warm bg-paper px-5 py-4 transition-colors hover:border-brand-red/50">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">{label}</p>
      <p className={`mt-1 font-serif text-3xl tabular ${loud && value > 0 ? "text-brand-red" : "text-ink"}`}>{value}</p>
    </Link>
  );
}

/**
 * Visa's landing overview — the EMGS caseload at a glance instead of dropping
 * straight onto the case table: what's in flight, what needs attention, renewals
 * running, and the passes coming up for expiry.
 */
export async function VisaDashboard() {
  const [cases, requests] = await Promise.all([
    listVisaCases(),
    listRequests({ toRole: "visa", openOnly: true }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);

  const initial = cases.filter((c) => c.kind !== "renewal");
  const renewals = cases.filter((c) => c.kind === "renewal");
  const inFlight = cases.filter((c) => c.stage !== "done");

  const stalled = inFlight.filter(
    (c) =>
      c.created_at != null &&
      String(c.created_at).slice(0, 10) < new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
  );

  // Passes with an expiry, flagged soon/expired, soonest first.
  const expiring = cases
    .filter((c) => expiryFlag(c.student_pass_expiry, today) === "soon" || expiryFlag(c.student_pass_expiry, today) === "expired")
    .sort((a, b) => (a.student_pass_expiry! < b.student_pass_expiry! ? -1 : 1));

  const attention = cases.filter(
    (c) =>
      (c.student_pass_expiry && c.student_pass_expiry <= soon && c.stage !== "done") ||
      (c.stage !== "done" &&
        c.created_at != null &&
        String(c.created_at).slice(0, 10) < new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)),
  );

  const needs: { label: string; count: number; href: string; loud?: boolean }[] = [
    { label: "Passes expiring / expired", count: expiring.length, href: "/admin/visa?stage=attention", loud: true },
    { label: "Stalled cases (30+ days)", count: stalled.length, href: "/admin/visa?stage=attention" },
    { label: "Renewals in progress", count: renewals.filter((c) => c.stage !== "done").length, href: "/admin/visa?kind=renewals" },
    { label: "Requests for Visa", count: requests.length, href: "/admin/requests" },
  ].filter((n) => n.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Visa / EMGS</p>
          <h1 className="font-serif text-3xl font-medium text-ink">Overview</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/visa" className="rounded-md bg-inkbtn px-4 py-2 text-sm font-medium text-oncolor hover:bg-inkbtn-soft">Visa cases</Link>
          <Link href="/admin/visa?kind=renewals" className="rounded-md border border-border-warm bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-cream-50">Renewals</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cases in progress" value={inFlight.length} href="/admin/visa" />
        <Stat label="Needs attention" value={attention.length} href="/admin/visa?stage=attention" loud />
        <Stat label="Renewals" value={renewals.length} href="/admin/visa?kind=renewals" />
        <Stat label="Total cases" value={cases.length} href="/admin/visa?stage=all" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Needs attention</p>
          {needs.length === 0 ? (
            <p className="text-sm text-ink-muted">All clear — nothing flagged.</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {needs.map((n) => (
                <Link key={n.label} href={n.href} className="flex items-center justify-between hover:text-brand-red">
                  <span className="text-ink-soft">{n.label}</span>
                  <span className={`font-medium ${n.loud ? "text-brand-red" : "text-ink"}`}>{n.count}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Passes expiring soon</p>
          {expiring.length === 0 ? (
            <p className="text-sm text-ink-muted">No passes near expiry.</p>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              {expiring.slice(0, 6).map((c) => {
                const flag = expiryFlag(c.student_pass_expiry, today);
                return (
                  <Link key={c.id} href={`/admin/visa?visa=${c.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-cream-50">
                    <span className="min-w-0 truncate text-ink">{c.student_name}</span>
                    <span className={`shrink-0 font-mono text-xs ${flag === "expired" ? "font-medium text-brand-red" : "text-brand-gold"}`}>
                      {c.student_pass_expiry}{flag === "expired" ? " · expired" : " · renew"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {inFlight.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">In flight</p>
          <div className="overflow-hidden rounded-card border border-border-warm">
            {inFlight.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/admin/visa?visa=${c.id}`} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0 hover:bg-cream-50">
                <span className="min-w-0 truncate text-sm font-medium text-ink">
                  {c.student_name}
                  {c.kind === "renewal" && <span className="ml-2 text-[10px] uppercase text-brand-gold">renewal</span>}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{VISA_STAGE_LABEL[c.stage] ?? c.stage}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
