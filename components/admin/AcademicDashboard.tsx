import Link from "next/link";
import { listApplications } from "@/lib/admin/applications";
import { listRequests } from "@/lib/admin/requests";
import { listIntakes } from "@/lib/admin/intakes";
import { planStatus, type Application } from "@/lib/admin/applications-shared";
import { INTAKE_STATUS_TONE } from "@/lib/admin/intakes-shared";

const ACADEMIC_STAGES = ["admissions", "offer", "visa", "enrolled", "active", "completed"];

function Stat({ label, value, href, loud }: { label: string; value: number; href: string; loud?: boolean }) {
  return (
    <Link href={href} className="rounded-card border border-border-warm bg-paper px-5 py-4 transition-colors hover:border-brand-red/50">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">{label}</p>
      <p className={`mt-1 font-serif text-3xl tabular ${loud && value > 0 ? "text-brand-red" : "text-ink"}`}>{value}</p>
    </Link>
  );
}

/**
 * Academic's landing overview — the English class caseload: who still needs a
 * plan, plans waiting on academic sign-off, classes to schedule, and the next
 * intakes. English track only (university-only students skip classes).
 */
export async function AcademicDashboard() {
  const [apps, requests, intakes] = await Promise.all([
    listApplications(),
    listRequests({ toRole: "academic", openOnly: true }),
    listIntakes(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const students = apps.filter((a) => a.track === "english" && ACADEMIC_STAGES.includes(a.stage) && a.status === "active");
  const inClass = students.filter((a) => ["enrolled", "active"].includes(a.stage));
  const toPlan = students.filter((a) => !["enrolled", "active", "completed"].includes(a.stage) && planStatus(a.plan).state !== "finalized" && !a.class_start);
  // Plans sitting on academic to verify/finalise.
  const awaitingMe = students.filter((a) => planStatus(a.plan).holder === "academic");
  const toSchedule = students.filter((a) => !["enrolled", "active", "completed"].includes(a.stage) && !a.class_start);

  const upcoming = [...intakes]
    .filter((i) => i.end_date >= today && i.status !== "cancelled")
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
    .slice(0, 6);

  const needs: { label: string; count: number; href: string; loud?: boolean }[] = [
    { label: "Plans waiting on Academic", count: awaitingMe.length, href: "/admin/academic?stage=toplan", loud: true },
    { label: "Students still to plan", count: toPlan.length, href: "/admin/academic?stage=toplan" },
    { label: "Classes to schedule", count: toSchedule.length, href: "/admin/academic?stage=toplan" },
    { label: "Requests for Academic", count: requests.length, href: "/admin/requests" },
  ].filter((n) => n.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Academic</p>
          <h1 className="font-serif text-3xl font-medium text-ink">Overview</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/academic" className="rounded-md bg-inkbtn px-4 py-2 text-sm font-medium text-oncolor hover:bg-inkbtn-soft">Enrolment &amp; classes</Link>
          <Link href="/admin/intakes" className="rounded-md border border-border-warm bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-cream-50">Intakes</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="To plan" value={toPlan.length} href="/admin/academic?stage=toplan" loud />
        <Stat label="In class" value={inClass.length} href="/admin/academic?stage=active" />
        <Stat label="English students" value={students.length} href="/admin/academic" />
        <Stat label="Upcoming intakes" value={upcoming.length} href="/admin/intakes" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border-warm bg-paper p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Needs attention</p>
          {needs.length === 0 ? (
            <p className="text-sm text-ink-muted">All clear — nothing waiting.</p>
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
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Upcoming intakes</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-muted">No intakes scheduled.</p>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              {upcoming.map((i) => (
                <Link key={i.id} href="/admin/intakes" className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-cream-50">
                  <span className="min-w-0 truncate text-ink">
                    {i.label || i.program.replace(/_/g, " ")}
                    {i.level ? ` L${i.level}` : ""}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-ink-muted">{i.start_date}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${INTAKE_STATUS_TONE[i.status] ?? ""}`}>{i.status}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {toPlan.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Students to plan</p>
          <div className="overflow-hidden rounded-card border border-border-warm">
            {toPlan.slice(0, 8).map((a: Application) => (
              <Link key={a.id} href={`/admin/applications?app=${a.id}`} className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0 hover:bg-cream-50">
                <span className="min-w-0 truncate text-sm font-medium text-ink">{a.student_name}</span>
                <span className="shrink-0 text-xs text-ink-muted">{a.program_name ?? "English program"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
