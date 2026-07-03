import { listApplications, getApplication } from "@/lib/admin/applications";
import { listFeesForApp } from "@/lib/admin/finance";
import { getVisaCaseForApp } from "@/lib/admin/visa";
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
  const [fees, visa] = selected
    ? await Promise.all([listFeesForApp(appParam!), getVisaCaseForApp(appParam!)])
    : [[], null];

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
      {selected && <ApplicationDrawer data={selected} fees={fees} visa={visa} />}
    </div>
  );
}
