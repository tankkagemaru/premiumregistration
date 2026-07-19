import Link from "next/link";
import { getProfile, requireRole } from "@/lib/auth";
import { listLeads, listStaff } from "@/lib/admin/leads";
import { StageTabs, type StageTab } from "@/components/admin/StageTabs";
import type { Lead } from "@/lib/admin/leads-shared";

/** "Overdue 3 days" / "Due today" / "Due Mon 21 Jul" — product copy, not raw ISO. */
function dueLabel(iso?: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "—", overdue: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${iso}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { text: `Overdue ${-days} day${days === -1 ? "" : "s"}`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  const nice = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(due);
  return { text: `Due ${nice}`, overdue: false };
}

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
        No follow-ups in this view — all caught up.
      </p>
    );
  return (
    <div className="overflow-hidden rounded-card border border-border-warm">
      {leads.map((l) => {
        const due = dueLabel(l.next_action_due);
        return (
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
              <p className={`text-xs font-medium ${due.overdue ? "text-brand-red" : "text-ink"}`}>{due.text}</p>
              <p className="text-[11px] text-ink-muted">{staffName(l.assigned_to)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin", "marketing", "admissions", "counsellor", "staff"]);
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
