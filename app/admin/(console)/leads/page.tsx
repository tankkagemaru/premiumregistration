import { listLeads, getLead, listStaff } from "@/lib/admin/leads";
import { getProfile } from "@/lib/auth";
import { getStalenessDays } from "@/lib/admin/settings";
import { LeadsView } from "@/components/admin/LeadsView";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const filters = {
    status: one(sp.status),
    track: one(sp.track),
    q: one(sp.q),
  };
  const leadParam = one(sp.lead);
  const leads = await listLeads(filters);
  const selected = leadParam ? await getLead(leadParam) : null;
  const staff = await listStaff();
  const profile = await getProfile();
  const stalenessDays = await getStalenessDays();

  return (
    <LeadsView
      leads={leads}
      selected={selected}
      filters={filters}
      staff={staff}
      officerName={profile?.full_name}
      stalenessDays={stalenessDays}
    />
  );
}
