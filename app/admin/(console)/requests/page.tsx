import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { listRequests, TEAM_LABEL, type ActionRequest } from "@/lib/admin/requests";
import { ResolveButton } from "@/components/admin/RequestControls";

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

export default async function RequestsPage() {
  const profile = await getProfile();
  const role = profile?.role ?? "staff";
  const all = await listRequests();

  const forMyTeam = all.filter(
    (r) => r.status === "open" && (role === "admin" || r.to_role === role),
  );
  const raisedByMyTeam = all.filter(
    (r) => role === "admin" ? r.status === "done" : r.from_role === role,
  );

  return (
    <div className="flex flex-col gap-8">
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

      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-red">
          {role === "admin" ? "Open — all teams" : "For your team"} · {forMyTeam.length}
        </p>
        {forMyTeam.length === 0 ? (
          <p className="rounded-card border border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
            Nothing waiting on you.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-border-warm">
            {forMyTeam.map((r) => (
              <RequestRow key={r.id} r={r} canResolve />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          {role === "admin" ? "Recently resolved" : "Raised by your team"} ·{" "}
          {raisedByMyTeam.length}
        </p>
        {raisedByMyTeam.length === 0 ? (
          <p className="rounded-card border border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
            Nothing here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-border-warm">
            {raisedByMyTeam.map((r) => (
              <RequestRow key={r.id} r={r} canResolve={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
