import { getProfile, requireRole } from "@/lib/auth";
import { listIntakes, listHolidays } from "@/lib/admin/intakes";
import { IntakeCalendar } from "@/components/admin/IntakeCalendar";

export default async function IntakesPage() {
  await requireRole([
    "admin",
    "academic",
    "marketing",
    "admissions",
    "counsellor",
    "staff",
  ]);
  const profile = await getProfile();
  const canEdit = !!profile && ["admin", "academic"].includes(profile.role);
  const [intakes, holidays] = await Promise.all([listIntakes(), listHolidays()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Intakes
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Program schedule</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          When each English level, exam-prep route and summer camp runs. Academic
          schedules intakes (durations auto-fill: PEP L1–2 = 45 days, L3–5 = 30
          days; exam prep ≈ 10–16 days; summer camp = 1 month). Marketing and
          admissions use this to advise students on the best start date. Malaysian
          public holidays are shown so class-day counts stay honest.
        </p>
      </div>

      <IntakeCalendar intakes={intakes} holidays={holidays} canEdit={canEdit} />
    </div>
  );
}
