import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { listApplications, getApplication, STAGE_LABEL } from "@/lib/admin/applications";
import { getDocRequirements } from "@/lib/admin/doc-rules";
import { listAppDocRequests } from "@/lib/admin/doc-requests";
import { listBillableItems } from "@/lib/admin/billables";
import { listFeesForApp } from "@/lib/admin/finance";
import { getVisaCaseForApp, listVisaCases, VISA_STAGE_LABEL } from "@/lib/admin/visa";
import { listRequests } from "@/lib/admin/requests";
import { ApplicationsBoard } from "@/components/admin/ApplicationsBoard";
import { ApplicationDrawer } from "@/components/admin/ApplicationDrawer";
import { StageTabs, type StageTab } from "@/components/admin/StageTabs";
import { SearchBox } from "@/components/admin/SearchBox";
import { TRACKS } from "@/lib/config/tracks";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));

// Stage buckets per lane. Old stage ids are listed alongside their new homes so
// rows still route correctly in the window before the stage-rename migration runs.
const STUDENT_BUCKETS: Record<string, string[]> = {
  registration: ["registration", "application"],
  admissions: ["admissions", "review"],
  offer: ["offer", "accepted"],
  visa: ["visa"],
  active: ["enrolled", "active"],
  completed: ["completed"],
};
const CORP_BUCKETS: Record<string, string[]> = {
  proposal: ["enquiry", "application", "proposal"],
  quote: ["quote"],
  hrdf: ["hrdf"],
  delivery: ["delivery"],
  completed: ["completed"],
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const apps = await listApplications({ q: one(sp.q) });
  const visaCases = await listVisaCases();
  const visaByApp = new Map(visaCases.map((v) => [v.application_id, v] as const));

  const lane = one(sp.lane) === "corporate" ? "corporate" : "students";
  const view = one(sp.view) === "board" ? "board" : "list";
  const buckets = lane === "corporate" ? CORP_BUCKETS : STUDENT_BUCKETS;
  const stage = one(sp.stage) ?? (lane === "corporate" ? "proposal" : "admissions");

  const laneApps = apps.filter((a) =>
    lane === "corporate" ? a.track === "corporate" : a.track !== "corporate",
  );
  const bucketOf = (s: string) =>
    Object.keys(buckets).find((k) => buckets[k].includes(s));
  const tabDefs =
    lane === "corporate"
      ? [
          { id: "proposal", label: "Proposal", attention: true },
          { id: "quote", label: "Quotation" },
          { id: "hrdf", label: "HRDF" },
          { id: "delivery", label: "Delivery" },
          { id: "completed", label: "Completed" },
        ]
      : [
          { id: "registration", label: "Registration" },
          { id: "admissions", label: "Admissions", attention: true },
          { id: "offer", label: "Offer / OL·COL" },
          { id: "visa", label: "Visa" },
          { id: "active", label: "Enrolled / Active" },
          { id: "completed", label: "Completed" },
        ];
  const tabs: StageTab[] = tabDefs.map((t) => ({
    ...t,
    count: laneApps.filter((a) => bucketOf(a.stage) === t.id).length,
  }));
  const rows = laneApps.filter((a) => bucketOf(a.stage) === stage);

  // Detail drawer.
  const appParam = one(sp.app);
  const selected = appParam ? await getApplication(appParam) : null;
  const [fees, visa, requests, profile, billables] = selected
    ? await Promise.all([
        listFeesForApp(appParam!),
        getVisaCaseForApp(appParam!),
        listRequests({ applicationId: appParam! }),
        getProfile(),
        listBillableItems(),
      ])
    : [[], null, [], null, []];
  const [ruleReqs, docReqs] = selected
    ? await Promise.all([
        getDocRequirements({
          track: selected.app.track,
          qualification: selected.app.qualification_level,
          isInternational: selected.app.is_international,
          nationality: selected.contact.nationality,
        }),
        listAppDocRequests(appParam!),
      ])
    : [[], []];
  const docRequirements = [
    ...ruleReqs,
    ...docReqs.map((r) => ({ kind: r.kind, label: r.label, note: r.note ?? undefined, optional: r.optional })),
    ...(selected?.app.track === "university" && !ruleReqs.some((r) => r.kind === "offer_letter")
      ? [{ kind: "offer_letter", label: "Offer letter (from university)", optional: true }]
      : []),
  ];

  const laneLink = (l: string) => `/admin/applications?lane=${l}`;
  const viewLink = (v: string) =>
    `/admin/applications?lane=${lane}&stage=${stage}&view=${v}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Admissions
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">Applications</h1>
        </div>
        <SearchBox placeholder="Search student name or email…" />
      </div>

      {/* Lane + view toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border-warm bg-paper p-1">
          {(["students", "corporate"] as const).map((l) => (
            <Link
              key={l}
              href={laneLink(l)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${lane === l ? "bg-inkbtn text-oncolor" : "text-ink-soft hover:bg-cream-50"}`}
            >
              {l}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-border-warm bg-paper p-1">
          {(["list", "board"] as const).map((v) => (
            <Link
              key={v}
              href={viewLink(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${view === v ? "bg-inkbtn text-oncolor" : "text-ink-soft hover:bg-cream-50"}`}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <>
          <StageTabs tabs={tabs} active={stage} />
          <div className="overflow-x-auto rounded-card border border-border-warm">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Programme</th>
                  <th className="px-4 py-2.5 font-medium">Stage</th>
                  {lane === "students" && <th className="px-4 py-2.5 font-medium">Visa</th>}
                  <th className="px-4 py-2.5 font-medium">Next action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                      Nothing in this stage.
                    </td>
                  </tr>
                )}
                {rows.map((a) => {
                  const vc = visaByApp.get(a.id);
                  return (
                    <tr key={a.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/applications?app=${a.id}`} className="font-medium text-ink hover:text-brand-red">
                          {a.student_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {a.program_name ?? a.target_institution ?? TRACK_TITLE[a.track] ?? a.track}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink">{STAGE_LABEL[a.stage] ?? a.stage}</td>
                      {lane === "students" && (
                        <td className="px-4 py-3 text-xs">
                          {a.is_international ? (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-cream-50 text-ink-muted">
                              {vc ? VISA_STAGE_LABEL[vc.stage] ?? vc.stage : "not filed"}
                            </span>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {a.next_action ?? "—"}
                        {a.next_action_due ? ` · ${a.next_action_due}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <ApplicationsBoard apps={laneApps} />
      )}

      {selected && (
        <ApplicationDrawer
          data={selected}
          fees={fees}
          visa={visa}
          requests={requests}
          docRequirements={docRequirements}
          docRequests={docReqs}
          billables={billables}
          role={profile?.role ?? "staff"}
          officerName={profile?.full_name}
        />
      )}
    </div>
  );
}
