import { requireRole } from "@/lib/auth";
import { listIntakes, listHolidays } from "@/lib/admin/intakes";
import { listEnglishOfferings } from "@/lib/admin/english-offerings";
import { IntakeCalendar } from "@/components/admin/IntakeCalendar";

export default async function AgentCalendarPage() {
  await requireRole(["agent", "admin"]);
  const [intakes, holidays, offerings] = await Promise.all([
    listIntakes(),
    listHolidays(),
    listEnglishOfferings(true),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">Schedule</p>
        <h1 className="font-serif text-3xl font-medium text-ink">Events &amp; intakes</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          When each English programme, exam-prep route and camp runs — use it to
          advise your students on the best start date. Malaysian public holidays
          are shown too.
        </p>
      </div>
      <IntakeCalendar intakes={intakes} holidays={holidays} canEdit={false} offerings={offerings} />
    </div>
  );
}
