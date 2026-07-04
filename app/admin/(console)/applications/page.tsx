import { getProfile } from "@/lib/auth";
import { listApplications, getApplication } from "@/lib/admin/applications";
import { getDocRequirements } from "@/lib/admin/doc-rules";
import { listFeesForApp } from "@/lib/admin/finance";
import { getVisaCaseForApp } from "@/lib/admin/visa";
import { listRequests } from "@/lib/admin/requests";
import { ApplicationsBoard } from "@/components/admin/ApplicationsBoard";
import { ApplicationDrawer } from "@/components/admin/ApplicationDrawer";
import { SearchBox } from "@/components/admin/SearchBox";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const apps = await listApplications({ q: one(sp.q) });
  const appParam = one(sp.app);
  const selected = appParam ? await getApplication(appParam) : null;
  const [fees, visa, requests, profile] = selected
    ? await Promise.all([
        listFeesForApp(appParam!),
        getVisaCaseForApp(appParam!),
        listRequests({ applicationId: appParam! }),
        getProfile(),
      ])
    : [[], null, [], null];
  // Document requirements resolved from the editable rules (track / level /
  // residency / nationality). Computed server-side; passed into the drawer.
  const docRequirements = selected
    ? await getDocRequirements({
        track: selected.app.track,
        qualification: selected.app.qualification_level,
        isInternational: selected.app.is_international,
        nationality: selected.contact.nationality,
      })
    : [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Admissions
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">
            Applications
          </h1>
        </div>
        <SearchBox placeholder="Search student name or email…" />
      </div>
      <ApplicationsBoard apps={apps} />
      {selected && (
        <ApplicationDrawer
          data={selected}
          fees={fees}
          visa={visa}
          requests={requests}
          docRequirements={docRequirements}
          role={profile?.role ?? "staff"}
          officerName={profile?.full_name}
        />
      )}
    </div>
  );
}
