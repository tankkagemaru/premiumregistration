import { requireRole } from "@/lib/auth";
import { listUniversities } from "@/lib/admin/universities";
import { getFxRates } from "@/lib/admin/fx";
import { ProgrammesView } from "@/components/admin/ProgrammesView";

export default async function ProgrammesPage() {
  const profile = await requireRole([
    "admin", "boss", "admissions", "marketing", "counsellor", "visa", "academic", "finance", "staff",
  ]);
  const [universities, fx] = await Promise.all([listUniversities(), getFxRates()]);
  const canEdit = ["admin", "admissions"].includes(profile.role);
  // USD per 1 MYR (open.er-api convention); fall back to the tool's fixed 4.5.
  const usdPerMyr = fx.rates.USD ?? 1 / 4.5;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Admissions
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Malaysia university programme finder</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Search the catalogue by specialty, level, type, location, intake,
          duration or keyword to see every university offering a match
          side-by-side — with fee conversion and CSV export.
          {canEdit ? " Switch to Manage catalogue to edit universities and fees." : ""}
        </p>
      </div>
      <ProgrammesView universities={universities} usdPerMyr={usdPerMyr} canEdit={canEdit} />
    </div>
  );
}
