"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  monthDays,
  MONTH_NAMES,
  WEEKDAYS,
  EVENT_STYLE,
  type CalEvent,
} from "@/lib/admin/calendar-shared";

export function CalendarView({
  events,
  initialYear,
  initialMonth,
  today,
}: {
  events: CalEvent[];
  initialYear: number;
  initialMonth: number;
  today: string;
}) {
  const [ym, setYm] = useState({ y: initialYear, m: initialMonth });
  const [selected, setSelected] = useState<string | null>(today);

  const byDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of events) (map[e.date] ??= []).push(e);
    return map;
  }, [events]);

  const cells = monthDays(ym.y, ym.m);
  const selectedEvents = selected ? byDate[selected] ?? [] : [];

  function shift(delta: number) {
    setYm(({ y, m }) => {
      let nm = m + delta;
      let ny = y;
      if (nm < 0) {
        nm = 11;
        ny -= 1;
      } else if (nm > 11) {
        nm = 0;
        ny += 1;
      }
      return { y: ny, m: nm };
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        {/* Month header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium text-ink">
            {MONTH_NAMES[ym.m]} {ym.y}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="rounded-md border border-border-warm bg-paper p-1.5 text-ink-muted hover:bg-cream-50 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              onClick={() => setYm({ y: initialYear, m: initialMonth })}
              className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
            >
              Today
            </button>
            <button
              onClick={() => shift(1)}
              aria-label="Next month"
              className="rounded-md border border-border-warm bg-paper p-1.5 text-ink-muted hover:bg-cream-50 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-hidden rounded-card border border-border-warm">
          <div className="grid grid-cols-7 border-b border-border-warm bg-cream-50 text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date) return <div key={`b${i}`} className="min-h-16 border-b border-r border-border-warm/50 bg-cream-50/40" />;
              const dayEvents = byDate[date] ?? [];
              const isToday = date === today;
              const isSelected = date === selected;
              const dayNum = Number(date.slice(8));
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`min-h-16 border-b border-r border-border-warm/50 p-1 text-left align-top transition-colors hover:bg-cream-50 ${
                    isSelected ? "bg-brand-red/5" : "bg-paper"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isToday ? "bg-brand-red font-medium text-cream" : "text-ink-soft"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map((e, j) => (
                      <span
                        key={j}
                        className={`truncate rounded px-1 py-0.5 text-[10px] ${EVENT_STYLE[e.kind].chip}`}
                      >
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="px-1 text-[10px] text-ink-muted">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
          {Object.values(EVENT_STYLE)
            .filter((s, i, arr) => arr.findIndex((x) => x.label === s.label) === i)
            .map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            ))}
        </div>
      </div>

      {/* Selected day agenda */}
      <aside className="w-full lg:w-72">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
          {selected ?? "Select a day"}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="rounded-card border border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
            Nothing scheduled.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedEvents.map((e, i) => {
              const body = (
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_STYLE[e.kind].dot}`} />
                  <div>
                    <p className="text-sm text-ink">{e.title}</p>
                    <p className="text-[11px] text-ink-muted">{EVENT_STYLE[e.kind].label}</p>
                  </div>
                </div>
              );
              return e.href ? (
                <Link
                  key={i}
                  href={e.href}
                  className="rounded-card border border-border-warm bg-paper px-3 py-2.5 transition-colors hover:bg-cream-50"
                >
                  {body}
                </Link>
              ) : (
                <div key={i} className="rounded-card border border-border-warm bg-paper px-3 py-2.5">
                  {body}
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
