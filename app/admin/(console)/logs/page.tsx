import { requireRole } from "@/lib/auth";
import { listAuditLogs } from "@/lib/admin/audit";
import { SearchBox } from "@/components/admin/SearchBox";

const ACTION_TONE: Record<string, string> = {
  doc_downloaded: "bg-brand-red-bg text-brand-red",
  user_created: "bg-status-present-bg text-status-present",
  user_role_changed: "bg-status-present-bg text-status-present",
  payment_recorded: "bg-status-late-bg text-brand-gold",
};

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const logs = await listAuditLogs(q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Administration
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">Audit log</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Every action — stage moves, payments, document access, account
            changes — with who did it and when.
          </p>
        </div>
        <SearchBox placeholder="Search actor, action, detail…" />
      </div>

      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Who</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                  No log entries match.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                  {l.created_at.slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{l.actor_name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                      ACTION_TONE[l.action] ?? "bg-cream-50 text-ink-soft border border-border-warm"
                    }`}
                  >
                    {l.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">
                  {l.detail ?? "—"}
                  {l.target_id ? (
                    <span className="ml-2 font-mono text-[10px] text-ink-muted">
                      {l.target_type}:{l.target_id}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
