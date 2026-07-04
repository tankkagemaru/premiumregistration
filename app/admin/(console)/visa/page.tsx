import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listVisaCases,
  getVisaCase,
  VISA_STAGE_LABEL,
  expiryFlag,
} from "@/lib/admin/visa";
import { VisaStageSelect } from "@/components/admin/VisaStageSelect";
import { VisaCaseDrawer } from "@/components/admin/VisaCaseDrawer";
import { SearchBox } from "@/components/admin/SearchBox";
import { getApplication } from "@/lib/admin/applications";
import { getDocRequirements } from "@/lib/admin/doc-rules";
import { listAppDocRequests } from "@/lib/admin/doc-requests";

export default async function VisaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole(["admin", "visa"]);
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.toLowerCase();
  const visaParam = Array.isArray(sp.visa) ? sp.visa[0] : sp.visa;
  const selected = visaParam ? await getVisaCase(visaParam) : null;
  // The application behind the case — its documents, checklist (including the
  // visa-stage rules) and work-log events, so the visa team reviews in place.
  const appRecord = selected?.vc.application_id
    ? await getApplication(selected.vc.application_id)
    : null;
  const [visaReqs, visaDocRequests] = appRecord
    ? await Promise.all([
        getDocRequirements({
          track: appRecord.app.track,
          qualification: appRecord.app.qualification_level,
          isInternational: appRecord.app.is_international,
          nationality: appRecord.contact.nationality,
        }),
        listAppDocRequests(appRecord.app.id),
      ])
    : [[], []];
  const visaRequirements = [
    ...visaReqs,
    ...visaDocRequests.map((r) => ({
      kind: r.kind,
      label: r.label,
      note: r.note ?? undefined,
      optional: r.optional,
    })),
  ];
  const all = await listVisaCases();
  const cases = q
    ? all.filter((c) =>
        `${c.student_name} ${c.target ?? ""} ${c.emgs_ref ?? ""}`
          .toLowerCase()
          .includes(q),
      )
    : all;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Visa / EMGS
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">Visa cases</h1>
          <p className="mt-2 text-sm text-ink-soft">
            PECSB prepares every pack. Private universities file their own EMGS
            submission; PECSB files for public universities and PLC courses.
          </p>
        </div>
        <SearchBox placeholder="Search student or EMGS ref…" />
      </div>

      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Programme</th>
              <th className="px-4 py-2.5 font-medium">Filed by</th>
              <th className="px-4 py-2.5 font-medium">EMGS ref</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Pass expiry</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const flag = expiryFlag(c.student_pass_expiry, today);
              return (
                <tr key={c.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/visa?visa=${c.id}`}
                      className="font-medium text-ink hover:text-brand-red"
                    >
                      {c.student_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{c.target ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        c.submitted_by === "pecsb"
                          ? "bg-brand-red-bg text-brand-red"
                          : "bg-cream-50 text-ink-soft border border-border-warm"
                      }`}
                    >
                      {c.submitted_by === "pecsb" ? "PECSB" : "University"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {c.emgs_ref ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink">
                        {VISA_STAGE_LABEL[c.stage] ?? c.stage}
                      </span>
                      <VisaStageSelect id={c.id} stage={c.stage} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.student_pass_expiry ? (
                      <span
                        className={`font-mono text-xs ${
                          flag === "expired"
                            ? "font-medium text-brand-red"
                            : flag === "soon"
                              ? "font-medium text-brand-gold"
                              : "text-ink-muted"
                        }`}
                      >
                        {c.student_pass_expiry}
                        {flag === "soon" && " · renew soon"}
                        {flag === "expired" && " · expired"}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <VisaCaseDrawer
          vc={selected.vc}
          contact={selected.contact}
          officerName={profile.full_name}
          documents={appRecord?.documents ?? []}
          requirements={visaRequirements}
          docRequests={visaDocRequests}
          events={appRecord?.events ?? []}
        />
      )}
    </div>
  );
}
