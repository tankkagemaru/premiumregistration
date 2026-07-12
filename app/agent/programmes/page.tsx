import { requireRole } from "@/lib/auth";
import { listUniversities } from "@/lib/admin/universities";
import { getFxRates } from "@/lib/admin/fx";
import { ProgrammeFinder } from "@/components/admin/ProgrammeFinder";
import { requestProgrammeInfo } from "@/app/agent/actions";

export default async function AgentProgrammesPage() {
  await requireRole(["agent", "admin"]);
  const [universities, fx] = await Promise.all([listUniversities(), getFxRates()]);
  const usdPerMyr = fx.rates.USD ?? 1 / 4.5;

  async function onRequestInfo(university: string, note: string) {
    "use server";
    return requestProgrammeInfo({ university, note });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Tools
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Malaysia university programme finder</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Search Malaysian universities, programmes, fees and intakes to advise
          your students. Need something specific? Use{" "}
          <span className="font-medium text-ink">Request more information</span> on
          any university and the office will follow up.
        </p>
      </div>
      <ProgrammeFinder universities={universities} usdPerMyr={usdPerMyr} onRequestInfo={onRequestInfo} />
    </div>
  );
}
