import Link from "next/link";
import { getProfile, requireRole } from "@/lib/auth";
import {
  listVisaCases,
  getVisaCase,
  VISA_STAGE_LABEL,
  expiryFlag,
} from "@/lib/admin/visa";
import { VisaStageSelect } from "@/components/admin/VisaStageSelect";
import { VisaCaseDrawer } from "@/components/admin/VisaCaseDrawer";
import { StageTabs, type StageTab } from "@/components/admin/StageTabs";
import { SearchBox } from "@/components/admin/SearchBox";
import { getApplication } from "@/lib/admin/applications";
import { getDocRequirements } from "@/lib/admin/doc-rules";
import { listAppDocRequests } from "@/lib/admin/doc-requests";

// Group the granular stages into phase buckets for the stage tabs.
const STAGE_BUCKET: Record<string, string> = {
  // initial journey
  emgs_submitted: "emgs", emgs_review: "emgs", immigration_review: "emgs",
  eval_process: "eval", eval_given: "eval",
  arrival_planning: "arrival", evisa_application: "arrival", evisa_received: "arrival", arrived: "arrival",
  health_checkup: "health", health_report: "health",
  uni_submission: "final", passport_submission: "final", sticker_received: "final",
  done: "done",
  // renewal cycle
  renewal_started: "emgs",
  // back-compat coarse ids
  docs_prep: "emgs", submitted: "emgs", medical: "health", val: "eval", sev: "arrival", pass_active: "done",
};
function bucketOf(stage: string): string {
  return STAGE_BUCKET[stage] ?? "emgs";
}

export default async function VisaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Viewable by everyone; editing is gated to visa + admin.
  await requireRole([
    "admin",
    "visa",
    "admissions",
    "marketing",
    "academic",
    "finance",
    "counsellor",
    "staff",
  ]);
  const profile = await getProfile();
  const canEdit = !!profile && ["admin", "visa"].includes(profile.role);
  // Marketing gets a status-only view — where each student is in the visa
  // process, nothing of the EMGS internals (refs, who filed, medical, the
  // case drawer). Clear separation: marketing hands off, it doesn't case-manage.
  const liteView = !!profile && profile.role === "marketing";

  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.toLowerCase();
  const visaParam = Array.isArray(sp.visa) ? sp.visa[0] : sp.visa;
  const stage = (Array.isArray(sp.stage) ? sp.stage[0] : sp.stage) ?? "attention";

  const selected = visaParam ? await getVisaCase(visaParam) : null;
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

  const allCases = await listVisaCases();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
  const isAttention = (c: (typeof allCases)[number]) =>
    (c.student_pass_expiry && c.student_pass_expiry <= soon && c.stage !== "done") ||
    (c.stage !== "done" &&
      c.created_at != null &&
      String(c.created_at).slice(0, 10) < new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));

  // Two pipelines: initial applications vs pass renewals.
  const kind = (Array.isArray(sp.kind) ? sp.kind[0] : sp.kind) === "renewals" ? "renewals" : "applications";
  const renewalCount = allCases.filter((c) => c.kind === "renewal").length;
  const all = allCases.filter((c) =>
    kind === "renewals" ? c.kind === "renewal" : c.kind !== "renewal",
  );

  const searched = q
    ? all.filter((c) =>
        `${c.student_name} ${c.target ?? ""} ${c.emgs_ref ?? ""}`.toLowerCase().includes(q),
      )
    : all;

  const inTab = (c: (typeof all)[number], id: string) =>
    id === "all"
      ? true
      : id === "attention"
        ? isAttention(c)
        : bucketOf(c.stage) === id;

  const count = (id: string) => searched.filter((c) => inTab(c, id)).length;
  const tabs: StageTab[] = [
    { id: "attention", label: "Attention", attention: true, count: count("attention") },
    { id: "emgs", label: "EMGS", count: count("emgs") },
    { id: "eval", label: "eVAL", count: count("eval") },
    ...(kind === "renewals" ? [] : [{ id: "arrival", label: "Arrival", count: count("arrival") }]),
    { id: "health", label: "Health", count: count("health") },
    { id: "final", label: "Finalising", count: count("final") },
    { id: "done", label: "Done", count: count("done") },
    { id: "all", label: "All", count: searched.length },
  ];
  const cases = searched.filter((c) => inTab(c, stage));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Visa / EMGS
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">Visa cases</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {liteView
              ? "Where each student is in the visa process — status only."
              : `Visible to every team so anyone can see where a student is. ${canEdit ? "You can update cases." : "Only the visa team edits cases."}`}
          </p>
        </div>
        <SearchBox placeholder="Search student or EMGS ref…" />
      </div>

      {/* Initial applications vs pass renewals — two pipelines. */}
      <div className="inline-flex w-fit overflow-hidden rounded-md border border-border-warm">
        {([
          { id: "applications", label: "New applications" },
          { id: "renewals", label: `Renewals${renewalCount ? ` (${renewalCount})` : ""}` },
        ] as const).map((k) => (
          <Link
            key={k.id}
            href={`/admin/visa?kind=${k.id}`}
            className={`px-4 py-1.5 text-sm font-medium ${kind === k.id ? "bg-inkbtn text-oncolor" : "bg-paper text-ink-soft hover:bg-cream-50"}`}
          >
            {k.label}
          </Link>
        ))}
      </div>

      <StageTabs tabs={tabs} active={stage} />

      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Programme</th>
              {!liteView && <th className="px-4 py-2.5 font-medium">Filed by</th>}
              {!liteView && <th className="px-4 py-2.5 font-medium">EMGS ref</th>}
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Pass expiry</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr>
                <td colSpan={liteView ? 4 : 6} className="px-4 py-10 text-center text-ink-muted">
                  Nothing in this stage.
                </td>
              </tr>
            )}
            {cases.map((c) => {
              const flag = expiryFlag(c.student_pass_expiry, today);
              return (
                <tr key={c.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                  <td className="px-4 py-3">
                    {liteView ? (
                      <span className="font-medium text-ink">{c.student_name}</span>
                    ) : (
                      <Link href={`/admin/visa?visa=${c.id}`} className="font-medium text-ink hover:text-brand-red">
                        {c.student_name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{c.target ?? "—"}</td>
                  {!liteView && (
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${c.submitted_by === "pecsb" ? "bg-brand-red-bg text-brand-red" : "bg-cream-50 text-ink-soft border border-border-warm"}`}>
                        {c.submitted_by === "pecsb" ? "PECSB" : "University"}
                      </span>
                    </td>
                  )}
                  {!liteView && (
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{c.emgs_ref ?? "—"}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink">{VISA_STAGE_LABEL[c.stage] ?? c.stage}</span>
                      {canEdit && <VisaStageSelect id={c.id} stage={c.stage} kind={c.kind} />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.student_pass_expiry ? (
                      <span className={`font-mono text-xs ${flag === "expired" ? "font-medium text-brand-red" : flag === "soon" ? "font-medium text-brand-gold" : "text-ink-muted"}`}>
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

      {selected && !liteView && (
        <VisaCaseDrawer
          vc={selected.vc}
          contact={selected.contact}
          officerName={profile?.full_name}
          documents={appRecord?.documents ?? []}
          requirements={visaRequirements}
          docRequests={visaDocRequests}
          events={appRecord?.events ?? []}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
