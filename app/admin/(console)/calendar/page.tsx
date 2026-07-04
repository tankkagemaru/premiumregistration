import { listCalendarEvents } from "@/lib/admin/calendar";
import { CalendarView } from "@/components/admin/CalendarView";

export default async function CalendarPage() {
  const events = await listCalendarEvents();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Schedule
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Calendar</h1>
      </div>
      <CalendarView
        events={events}
        initialYear={now.getUTCFullYear()}
        initialMonth={now.getUTCMonth()}
        today={today}
      />
    </div>
  );
}
