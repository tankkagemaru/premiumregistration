import { requireRole } from "@/lib/auth";
import { listUniversities } from "@/lib/admin/universities";
import { getFxRates } from "@/lib/admin/fx";
import { ProgrammeFinder } from "@/components/admin/ProgrammeFinder";
import { requestProgrammeInfo } from "@/app/agent/actions";
import { getConsoleLang, CONSOLE_STR } from "@/lib/admin/console-i18n";

export default async function AgentProgrammesPage() {
  await requireRole(["agent", "admin"]);
  const [universities, fx] = await Promise.all([listUniversities(), getFxRates()]);
  const usdPerMyr = fx.rates.USD ?? 1 / 4.5;
  const L = CONSOLE_STR[await getConsoleLang()];

  async function onRequestInfo(university: string, note: string) {
    "use server";
    return requestProgrammeInfo({ university, note });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          {L.ag_tools}
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">{L.ag_finder_title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          {L.ag_finder_desc_1}
          <span className="font-medium text-ink">{L.ag_finder_req_info}</span>
          {L.ag_finder_desc_2}
        </p>
      </div>
      <ProgrammeFinder universities={universities} usdPerMyr={usdPerMyr} onRequestInfo={onRequestInfo} />
    </div>
  );
}
