import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listApplications, STAGE_LABEL } from "@/lib/admin/applications";
import { listFees, formatMoney } from "@/lib/admin/finance";
import { listRequests } from "@/lib/admin/requests";
import { SearchBox } from "@/components/admin/SearchBox";
import { AcademicControls } from "@/components/admin/AcademicControls";

/** Stages the Academic team cares about — offer holders and beyond. */
const ACADEMIC_STAGES = ["accepted", "visa", "enrolled", "active", "completed", "offer"];

export default async function AcademicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin", "academic", "admissions"]);
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.toLowerCase();

  const [apps, fees, openRequests] = await Promise.all([
    listApplications(),
    listFees(),
    listRequests({ toRole: "academic", openOnly: true }),
  ]);

  let students = apps.filter((a) => ACADEMIC_STAGES.includes(a.stage));
  if (q) {
    students = students.filter((a) =>
      `${a.student_name} ${a.program_name ?? ""}`.toLowerCase().includes(q),
    );
  }

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

      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Programme</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Fees</th>
              <th className="px-4 py-2.5 font-medium">Class dates &amp; enrolment</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No students match.
                </td>
              </tr>
            )}
            {students.map((a) => {
              const due = outstanding(a.id);
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
                  <td className="px-4 py-3 text-xs text-ink">
                    {STAGE_LABEL[a.stage] ?? a.stage}
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
                  <td className="px-4 py-3">
                    <AcademicControls
                      appId={a.id}
                      classStart={a.class_start ?? null}
                      classEnd={a.class_end ?? null}
                      stage={a.stage}
                      feeCleared={due.length === 0}
                    />
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
