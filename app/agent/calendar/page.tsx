import { requireRole } from "@/lib/auth";
import { listIntakes, listHolidays } from "@/lib/admin/intakes";
import { listEnglishOfferings } from "@/lib/admin/english-offerings";
import { IntakeCalendar } from "@/components/admin/IntakeCalendar";
import { getConsoleLang, CONSOLE_STR } from "@/lib/admin/console-i18n";

export default async function AgentCalendarPage() {
  await requireRole(["agent", "admin"]);
  const [intakes, holidays, offerings] = await Promise.all([
    listIntakes(),
    listHolidays(),
    listEnglishOfferings(true),
  ]);
  const L = CONSOLE_STR[await getConsoleLang()];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">{L.ag_schedule}</p>
        <h1 className="font-serif text-3xl font-medium text-ink">{L.ag_events_intakes}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          {L.ag_calendar_desc}
        </p>
      </div>
      <IntakeCalendar intakes={intakes} holidays={holidays} canEdit={false} offerings={offerings} />
    </div>
  );
}
