import { listApplications, getApplication } from "@/lib/admin/applications";
import { ApplicationsBoard } from "@/components/admin/ApplicationsBoard";
import { ApplicationDrawer } from "@/components/admin/ApplicationDrawer";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const apps = await listApplications();
  const appParam = one(sp.app);
  const selected = appParam ? await getApplication(appParam) : null;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Admissions
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">
          Applications
        </h1>
      </div>
      <ApplicationsBoard apps={apps} />
      {selected && <ApplicationDrawer data={selected} />}
    </div>
  );
}
