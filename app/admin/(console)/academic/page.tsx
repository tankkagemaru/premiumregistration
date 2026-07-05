import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listApplications, STAGE_LABEL } from "@/lib/admin/applications";
import { listFees, formatMoney } from "@/lib/admin/finance";
import { listRequests } from "@/lib/admin/requests";
import { listVisaCases, VISA_STAGE_LABEL } from "@/lib/admin/visa";
import { TRACKS } from "@/lib/config/tracks";
import { SearchBox } from "@/components/admin/SearchBox";
import { StageTabs } from "@/components/admin/StageTabs";
import { AcademicControls } from "@/components/admin/AcademicControls";
import { PlanEditor } from "@/components/admin/PlanEditor";

/** Stages the Academic team cares about — offer holders and beyond. */
const ACADEMIC_STAGES = ["accepted", "visa", "enrolled", "active", "completed", "offer"];

export default async function AcademicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole(["admin", "academic", "admissions"]);
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.toLowerCase();

  const [apps, fees, openRequests, visaCases] = await Promise.all([
    listApplications(),
    listFees(),
    listRequests({ toRole: "academic", openOnly: true }),
    listVisaCases(),
  ]);
  const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));
  const visaByApp = new Map(visaCases.map((v) => [v.application_id, v] as const));
  // Visa is considered "ready for class" once the VAL is issued (or later).
  const VISA_READY = new Set(["val", "sev", "pass_active"]);

  let students = apps.filter((a) => ACADEMIC_STAGES.includes(a.stage));
  if (q) {
    students = students.filter((a) =>
      `${a.student_name} ${a.program_name ?? ""}`.toLowerCase().includes(q),
    );
  }

  // Stage tabs.
  const stage = (Array.isArray(sp.stage) ? sp.stage[0] : sp.stage) ?? "toplan";
  const inClass = (a: (typeof students)[number]) => ["enrolled", "active"].includes(a.stage);
  const bucketOf = (a: (typeof students)[number]) => {
    if (a.stage === "completed") return "completed";
    if (inClass(a)) return "active";
    if (a.class_start) return "scheduled";
    return "toplan"; // pre-enrolment, no dates yet — needs planning
  };
  const tabs = [
    { id: "toplan", label: "To plan", attention: true, count: students.filter((a) => bucketOf(a) === "toplan").length },
    { id: "scheduled", label: "Scheduled", count: students.filter((a) => bucketOf(a) === "scheduled").length },
    { id: "active", label: "Enrolled / Active", count: students.filter((a) => bucketOf(a) === "active").length },
    { id: "completed", label: "Completed", count: students.filter((a) => bucketOf(a) === "completed").length },
  ];
  students = students.filter((a) => bucketOf(a) === stage);

  /** Finance gate: any unpaid/partial registration or tuition blocks class entry. */
  function outstanding(appId: string) {
    return fees.filter(
      (f) =>
        f.application_id === appId &&
        (f.type === "tuition" || f.type === "registration") &&
        (f.status === "unpaid" || f.status === "partial"),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Academic
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">
            Enrolment &amp; classes
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Who is enrolling, when classes run, and whether fees are cleared for
            class entry. Attendance lives in the PECSB attendance app.
          </p>
        </div>
        <SearchBox placeholder="Search student or programme…" />
      </div>

      {openRequests.length > 0 && (
        <div className="rounded-card border border-brand-gold/50 bg-status-late-bg/40 px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {openRequests.length} open request{openRequests.length > 1 ? "s" : ""} for
            Academic —{" "}
            <Link href="/admin/requests" className="text-brand-red underline underline-offset-2">
              view requests
            </Link>
          </p>
        </div>
      )}

      <StageTabs tabs={tabs} active={stage} />

      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Programme</th>
              <th className="px-4 py-2.5 font-medium">Pathway / intake</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Fees</th>
              <th className="px-4 py-2.5 font-medium">Study plan / timeline</th>
              <th className="px-4 py-2.5 font-medium">Class dates &amp; enrolment</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-muted">
                  No students match.
                </td>
              </tr>
            )}
            {students.map((a) => {
              const due = outstanding(a.id);
              const vc = visaByApp.get(a.id);
              // Class dates set while an international student's visa isn't
              // ready (no VAL yet, or no case at all) — academic must re-plan.
              const visaClash =
                a.is_international &&
                Boolean(a.class_start) &&
                (!vc || !VISA_READY.has(vc.stage));
              return (
                <tr key={a.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/applications?app=${a.id}`}
                      className="font-medium text-ink hover:text-brand-red"
                    >
                      {a.student_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {a.program_name ?? a.target_institution ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-ink">{TRACK_TITLE[a.track] ?? a.track}</span>
                    {a.plan?.intake && (
                      <span className="block text-ink-soft">Intake: {a.plan.intake}</span>
                    )}
                    {a.plan?.target_completion && (
                      <span className="block text-ink-soft">
                        Finish by: {a.plan.target_completion}
                      </span>
                    )}
                    {!a.plan?.steps?.length && (
                      <span className="block text-ink-muted">No plan yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink">
                    {STAGE_LABEL[a.stage] ?? a.stage}
                    {a.is_international && (
                      <span className={`mt-1 block w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${vc ? (VISA_READY.has(vc.stage) ? "bg-status-present-bg text-status-present" : "bg-status-late-bg text-brand-gold") : "bg-brand-red-bg text-brand-red"}`}>
                        Visa: {vc ? VISA_STAGE_LABEL[vc.stage] ?? vc.stage : "not filed"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {due.length === 0 ? (
                      <span className="inline-flex rounded-md bg-status-present-bg px-2 py-0.5 text-xs font-medium text-status-present">
                        Cleared
                      </span>
                    ) : (
                      <span
                        className="inline-flex rounded-md bg-brand-red-bg px-2 py-0.5 text-xs font-medium text-brand-red"
                        title={due
                          .map((f) => `${f.label ?? f.type}: ${formatMoney(f.amount)}`)
                          .join(", ")}
                      >
                        Outstanding · {formatMoney(due.reduce((s, f) => s + (f.amount ?? 0), 0))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <PlanEditor
                      applicationId={a.id}
                      studentName={a.student_name}
                      plan={a.plan}
                      role={profile.role}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <AcademicControls
                      appId={a.id}
                      classStart={a.class_start ?? null}
                      classEnd={a.class_end ?? null}
                      stage={a.stage}
                      feeCleared={due.length === 0}
                    />
                    {visaClash && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-brand-gold">
                        ⚠ Class starts {a.class_start} but visa is{" "}
                        {vc ? `at "${VISA_STAGE_LABEL[vc.stage] ?? vc.stage}"` : "not filed yet"}
                        {" — re-check the dates"}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
