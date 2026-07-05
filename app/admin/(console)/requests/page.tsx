import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { listRequests, TEAM_LABEL, type ActionRequest } from "@/lib/admin/requests";
import { ResolveButton } from "@/components/admin/RequestControls";
import { StageTabs, type StageTab } from "@/components/admin/StageTabs";

const TYPE_TONE: Record<string, string> = {
  blocker: "bg-brand-red-bg text-brand-red",
  handoff: "bg-status-present-bg text-status-present",
  request: "bg-status-late-bg text-brand-gold",
};

function RequestRow({ r, canResolve }: { r: ActionRequest; canResolve: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-3 last:border-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TYPE_TONE[r.type]}`}
          >
            {r.type}
          </span>
          <p className="text-sm font-medium text-ink">{r.title}</p>
        </div>
        <p className="mt-0.5 text-xs text-ink-muted">
          {TEAM_LABEL[r.from_role] ?? r.from_role} → {TEAM_LABEL[r.to_role] ?? r.to_role}
          {r.subject ? (
            <>
              {" · "}
              {r.application_id ? (
                <Link
                  href={`/admin/applications?app=${r.application_id}`}
                  className="text-brand-red hover:underline"
                >
                  {r.subject}
                </Link>
              ) : (
                r.subject
              )}
            </>
          ) : null}
          {r.due_date ? ` · due ${r.due_date}` : ""}
        </p>
        {r.detail && <p className="mt-1 text-xs text-ink-soft">{r.detail}</p>}
      </div>
      {r.status === "open" ? (
        canResolve ? (
          <ResolveButton id={r.id} />
        ) : (
          <span className="text-[11px] font-medium uppercase tracking-wide text-brand-gold">
            Open
          </span>
        )
      ) : (
        <span className="text-[11px] font-medium uppercase tracking-wide text-status-present">
          Done
        </span>
      )}
    </div>
  );
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const profile = await getProfile();
  const role = profile?.role ?? "staff";
  const isAdmin = role === "admin";
  const all = await listRequests();

  // Stage buckets.
  const forMyTeam = (r: ActionRequest) =>
    r.status === "open" && (isAdmin || r.to_role === role);
  const raisedByMe = (r: ActionRequest) => isAdmin || r.from_role === role;
  const isOpen = (r: ActionRequest) => r.status === "open";
  const isDone = (r: ActionRequest) => r.status === "done";

  const stage = one(sp.stage) ?? "team";
  const tabs: StageTab[] = [
    { id: "team", label: "For my team", attention: true, count: all.filter(forMyTeam).length },
    { id: "mine", label: isAdmin ? "Raised by anyone" : "Raised by me", count: all.filter(raisedByMe).length },
    { id: "open", label: "All open", count: all.filter(isOpen).length },
    { id: "done", label: "Done", count: all.filter(isDone).length },
  ];

  const pick =
    stage === "mine"
      ? raisedByMe
      : stage === "open"
        ? isOpen
        : stage === "done"
          ? isDone
          : forMyTeam;
  const rows = all.filter(pick);
  // Only the receiving team (or admin) can resolve an open request.
  const canResolveRow = (r: ActionRequest) =>
    r.status === "open" && (isAdmin || r.to_role === role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Teamwork
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Requests</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Handoffs and blockers between Marketing, Admissions, Finance, Visa and
          Academic — raised from any application, resolved by the receiving team.
        </p>
      </div>

      <StageTabs tabs={tabs} active={stage} />

      {rows.length === 0 ? (
        <p className="rounded-card border border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
          Nothing here.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border-warm">
          {rows.map((r) => (
            <RequestRow key={r.id} r={r} canResolve={canResolveRow(r)} />
          ))}
        </div>
      )}
    </div>
  );
}
