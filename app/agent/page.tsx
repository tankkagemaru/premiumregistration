import { getAgentPortal } from "@/lib/agent/portal";
import { STAGE_LABEL } from "@/lib/admin/applications-shared";
import { TRACKS } from "@/lib/config/tracks";
import { AgentLink } from "@/components/agent/AgentLink";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function AgentHome() {
  const { agent, apps } = await getAgentPortal();
  const referral = `${APP_URL}/register?agent=${agent.code}`;
  const enrolled = apps.filter((a) =>
    ["enrolled", "active", "completed"].includes(a.stage),
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          {agent.name} · {agent.code}
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Your students</h1>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Referred", value: apps.length },
          { label: "Enrolled", value: enrolled },
          { label: "Commission", value: "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-border-warm bg-paper px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              {s.label}
            </p>
            <p className="mt-1 font-serif text-2xl text-ink tabular">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-card border border-border-warm bg-paper p-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Your referral link
        </p>
        <p className="mb-3 text-sm text-ink-soft">
          Every student who registers through this link is automatically tagged to
          you and appears below.
        </p>
        <AgentLink url={referral} />
      </div>

      {/* Students */}
      <div className="overflow-hidden rounded-card border border-border-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Track</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-ink-muted">
                  No students yet — share your link to get started.
                </td>
              </tr>
            )}
            {apps.map((a) => (
              <tr key={a.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{a.student_name}</div>
                  <div className="text-xs text-ink-muted">
                    {a.target_institution ?? ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">
                  {TRACK_TITLE[a.track] ?? a.track}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md bg-brand-red-bg px-2.5 py-1 text-xs font-medium text-brand-red">
                    {STAGE_LABEL[a.stage] ?? a.stage}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
