import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { listLeads, listStaff } from "@/lib/admin/leads";
import { StageTabs, type StageTab } from "@/components/admin/StageTabs";
import type { Lead } from "@/lib/admin/leads-shared";

function List({
  leads,
  staffName,
}: {
  leads: Lead[];
  staffName: (id?: string | null) => string;
}) {
  if (leads.length === 0)
    return (
      <p className="rounded-card border border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
        Nothing here.
      </p>
    );
  return (
    <div className="overflow-hidden rounded-card border border-border-warm">
      {leads.map((l) => (
        <Link
          key={l.id}
          href={`/admin/leads?lead=${l.id}`}
          className="flex items-center justify-between gap-4 border-b border-border-warm/60 bg-paper px-4 py-3 transition-colors last:border-0 hover:bg-cream-50"
        >
          <div>
            <p className="text-sm font-medium text-ink">{l.full_name}</p>
            <p className="text-xs text-ink-muted">{l.next_action}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs text-ink">{l.next_action_due}</p>
            <p className="text-[11px] text-ink-muted">{staffName(l.assigned_to)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const scope = one(sp.scope) ?? "mine";
  const stage = one(sp.stage) ?? "overdue";
  const [profile, leads, staff] = await Promise.all([
    getProfile(),
    listLeads(),
    listStaff(),
  ]);
  const staffName = (id?: string | null) =>
    id ? staff.find((s) => s.id === id)?.full_name ?? "—" : "Unassigned";
  const today = new Date().toISOString().slice(0, 10);

  const withDue = leads.filter(
    (l) =>
      l.next_action_due &&
      l.status !== "enrolled" &&
      l.status !== "dropped" &&
      (scope === "all" || l.assigned_to === profile?.id),
  );
  const overdue = withDue.filter((l) => l.next_action_due! < today);
  const dueToday = withDue.filter((l) => l.next_action_due === today);
  const upcoming = withDue.filter((l) => l.next_action_due! > today);

  const tabs: StageTab[] = [
    { id: "overdue", label: "Overdue", attention: true, count: overdue.length },
    { id: "today", label: "Due today", count: dueToday.length },
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
  ];
  const shown = stage === "today" ? dueToday : stage === "upcoming" ? upcoming : overdue;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Follow-ups
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">
            {scope === "all" ? "All follow-ups" : "My follow-ups"}
          </h1>
        </div>
        <div className="flex gap-1 rounded-md border border-border-warm bg-paper p-1">
          {(["mine", "all"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/follow-ups?scope=${s}&stage=${stage}`}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                scope === s ? "bg-inkbtn text-oncolor" : "text-ink-soft hover:text-ink"
              }`}
            >
              {s === "mine" ? "Mine" : "Everyone"}
            </Link>
          ))}
        </div>
      </div>
      <StageTabs tabs={tabs} active={stage} />
      <List leads={shown} staffName={staffName} />
    </div>
  );
}
