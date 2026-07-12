"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays } from "lucide-react";
import {
  type ProgramIntake,
  type PublicHoliday,
  INTAKE_STATUSES,
  INTAKE_STATUS_TONE,
} from "@/lib/admin/intakes-shared";
import {
  PROGRAM_LABEL,
  PEP_LEVELS,
  pepLevel,
  computeEndDate,
  defaultDurationDays,
  learningDaysBetween,
  parseISO,
  toISO,
  type ProgramKind,
} from "@/lib/config/program-schedule";
import type { EnglishOffering } from "@/lib/admin/english-offerings-shared";
import {
  createIntake,
  updateIntake,
  deleteIntake,
  addHoliday,
  deleteHoliday,
} from "@/app/admin/intakes-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

const PROG_BAR: Record<string, string> = {
  pep: "bg-brand-red",
  exam_prep: "bg-brand-gold",
  summer_camp: "bg-status-present",
  other: "bg-ink-muted",
};

function intakeName(i: ProgramIntake): string {
  if (i.program === "pep") {
    const lv = pepLevel(i.level);
    return `PEP L${i.level ?? "?"}${lv ? ` · ${lv.name}` : ""}`;
  }
  if (i.program === "exam_prep") return `Exam Prep${i.route ? ` · ${i.route}` : ""}`;
  if (i.program === "summer_camp") return "Summer Camp";
  return i.label || "Program";
}

/** Days (UTC) between two ISO dates, inclusive of start. */
function daysInclusive(a: string, b: string) {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000) + 1;
}

export function IntakeCalendar({
  intakes,
  holidays,
  canEdit,
  offerings = [],
}: {
  intakes: ProgramIntake[];
  holidays: PublicHoliday[];
  canEdit: boolean;
  offerings?: EnglishOffering[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => { await fn(); router.refresh(); });

  const holidayByDate = useMemo(
    () => new Map(holidays.map((h) => [h.holiday_date, h.name])),
    [holidays],
  );
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.holiday_date)), [holidays]);

  // Visible month (default: today).
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() });
  const monthLabel = new Date(Date.UTC(ym.y, ym.m, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const shift = (d: number) => {
    const dt = new Date(Date.UTC(ym.y, ym.m + d, 1));
    setYm({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() });
  };

  // Build the month grid, Monday-first, 6 rows.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(ym.y, ym.m, 1));
    const offset = (first.getUTCDay() + 6) % 7; // Mon=0
    const gridStart = new Date(first);
    gridStart.setUTCDate(first.getUTCDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setUTCDate(gridStart.getUTCDate() + i);
      return d;
    });
  }, [ym]);

  const intakesOn = (iso: string) =>
    intakes.filter((i) => i.start_date <= iso && iso <= i.end_date && i.status !== "cancelled");

  // Clicking a day selects it and opens a detail panel (works for every role —
  // viewers see what's on; editors get add/edit right there).
  const todayISO = toISO(now);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedHoliday = selected ? holidayByDate.get(selected) : undefined;
  const selectedIntakes = selected ? intakesOn(selected) : [];
  const prettyDate = (iso: string) =>
    parseISO(iso).toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // Add-intake form.
  const [open, setOpen] = useState(false);
  const first = offerings[0];
  const [form, setForm] = useState({
    offeringId: first?.id ?? "__custom",
    program: (first?.kind as ProgramKind) ?? ("pep" as ProgramKind),
    level: 1,
    route: "",
    label: first?.kind === "other" ? first.name : "",
    otherDays: first?.default_days ?? 30,
    start_date: "",
    end_date: "",
    capacity: "",
    notes: "",
  });
  const set = (k: keyof typeof form, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }) as typeof form);

  // Pick a programme from the academic-managed offerings list. Built-in kinds
  // (pep/exam_prep) keep their level/route logic; "other" carries a name + days.
  function pickOffering(id: string) {
    const o = offerings.find((x) => x.id === id);
    if (!o) { setForm((f) => ({ ...f, offeringId: "__custom", program: "other" as ProgramKind, label: "" })); return; }
    setForm((f) => ({
      ...f,
      offeringId: id,
      program: o.kind as ProgramKind,
      label: o.kind === "other" ? o.name : "",
      otherDays: o.default_days ?? 30,
    }));
  }

  const durationDays =
    form.program === "other" ? form.otherDays || 30 : defaultDurationDays(form.program, form.level);
  const autoEnd = form.start_date ? computeEndDate(form.start_date, durationDays) : "";
  const effEnd = form.end_date || autoEnd;
  const learning =
    form.start_date && effEnd ? learningDaysBetween(form.start_date, effEnd, holidaySet) : 0;

  function openAdd(iso?: string) {
    setForm((f) => ({ ...f, start_date: iso ?? f.start_date, end_date: "" }));
    setOpen(true);
  }

  function submit() {
    run(async () => {
      await createIntake({
        program: form.program,
        level: form.program === "pep" ? form.level : null,
        route: form.program === "exam_prep" ? form.route : undefined,
        label: form.program === "other" ? form.label : undefined,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        capacity: form.capacity ? Number(form.capacity) : null,
        notes: form.notes || undefined,
      });
      setOpen(false);
      setForm({ ...form, route: "", label: "", capacity: "", notes: "", end_date: "" });
    });
  }

  const upcoming = intakes
    .filter((i) => i.end_date >= toISO(now))
    .slice(0, 20);

  // Holiday manager.
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");

  return (
    <div className="flex flex-col gap-6">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded-md border border-border-warm bg-paper p-1.5 text-ink-muted hover:text-ink">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[9rem] text-center font-serif text-lg text-ink">{monthLabel}</span>
          <button onClick={() => shift(1)} aria-label="Next month" className="rounded-md border border-border-warm bg-paper p-1.5 text-ink-muted hover:text-ink">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button onClick={() => setYm({ y: now.getUTCFullYear(), m: now.getUTCMonth() })} className="ml-1 rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs text-ink-soft hover:bg-cream-50">
            Today
          </button>
        </div>
        {canEdit && (
          <button onClick={() => openAdd()} className="inline-flex items-center gap-1.5 rounded-md bg-brand-red px-3 py-1.5 text-sm font-medium text-oncolor hover:bg-brand-red-soft">
            <Plus className="h-4 w-4" aria-hidden /> Add intake
          </button>
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
        {(["pep", "exam_prep", "summer_camp"] as const).map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${PROG_BAR[p]}`} /> {PROGRAM_LABEL[p]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-red/15 ring-1 ring-brand-red/40" /> Public holiday
        </span>
      </div>

      {/* month grid */}
      <div className="overflow-hidden rounded-card border border-border-warm">
        <div className="grid grid-cols-7 border-b border-border-warm bg-cream-50 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-1.5 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, idx) => {
            const iso = toISO(d);
            const inMonth = d.getUTCMonth() === ym.m;
            const dow = d.getUTCDay();
            const weekend = dow === 0 || dow === 6;
            const holiday = holidayByDate.get(iso);
            const active = intakesOn(iso);
            const isToday = iso === todayISO;
            const isSelected = iso === selected;
            return (
              <button
                key={idx}
                onClick={() => setSelected(iso)}
                className={`group relative min-h-[84px] cursor-pointer border-b border-r border-border-warm/60 p-1.5 text-left align-top last:border-r-0 hover:bg-cream-50 ${
                  inMonth ? "bg-paper" : "bg-cream-50/40"
                } ${weekend ? "bg-cream-50/60" : ""} ${holiday ? "bg-brand-red/[0.06]" : ""} ${
                  isSelected ? "ring-2 ring-inset ring-brand-red" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                      isToday
                        ? "bg-brand-red font-semibold text-oncolor"
                        : inMonth
                          ? "text-ink"
                          : "text-ink-muted/60"
                    }`}
                  >
                    {d.getUTCDate()}
                  </span>
                  {canEdit && (
                    <Plus
                      className="h-3.5 w-3.5 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  )}
                </div>
                {holiday && (
                  <p className="mt-0.5 flex items-center gap-0.5 truncate text-[9px] font-medium text-brand-red" title={holiday}>
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red/70" />
                    {holiday}
                  </p>
                )}
                <div className="mt-1 flex flex-col gap-0.5">
                  {active.slice(0, 3).map((i) => {
                    const isStart = i.start_date === iso;
                    return (
                      <span
                        key={i.id}
                        className={`block truncate rounded-sm px-1 text-[9px] text-oncolor ${PROG_BAR[i.program] ?? "bg-ink-muted"} ${isStart ? "font-semibold" : "opacity-70"}`}
                        title={intakeName(i)}
                      >
                        {isStart ? intakeName(i) : "·"}
                      </span>
                    );
                  })}
                  {active.length > 3 && (
                    <span className="text-[9px] text-ink-muted">+{active.length - 3} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* selected-day detail — click any day to see (and edit) what's on it */}
      {selected && (
        <div className="rounded-card border border-border-warm bg-paper p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-serif text-lg text-ink">{prettyDate(selected)}</p>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Close
            </button>
          </div>
          {selectedHoliday && (
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-brand-red/[0.08] px-2.5 py-1 text-xs font-medium text-brand-red">
              <span className="h-2 w-2 rounded-full bg-brand-red/70" /> Public holiday — {selectedHoliday}
            </p>
          )}
          {selectedIntakes.length === 0 ? (
            <p className="text-sm text-ink-muted">No intakes running on this day.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {selectedIntakes.map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-warm/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-sm ${PROG_BAR[i.program] ?? "bg-ink-muted"}`} />
                    <div>
                      <p className="text-sm font-medium text-ink">{intakeName(i)}</p>
                      <p className="text-xs text-ink-muted">
                        {i.start_date} → {i.end_date}
                        {i.start_date === selected ? " · starts today" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <select
                        value={i.status}
                        onChange={(e) => run(() => updateIntake(i.id, { status: e.target.value }))}
                        className="rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none"
                      >
                        {INTAKE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${INTAKE_STATUS_TONE[i.status] ?? ""}`}>
                        {i.status}
                      </span>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => run(() => deleteIntake(i.id))}
                        aria-label="Delete intake"
                        className="text-ink-muted hover:text-brand-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => openAdd(selected)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-red px-3 py-1.5 text-sm font-medium text-oncolor hover:bg-brand-red-soft"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add intake on this day
            </button>
          )}
        </div>
      )}

      {/* add form */}
      {open && canEdit && (
        <div className="rounded-card border border-border-warm bg-paper p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            New intake
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-xs font-medium text-ink-soft">
              Programme
              <select value={form.offeringId} onChange={(e) => pickOffering(e.target.value)} className={`mt-1 w-full ${F}`}>
                {offerings.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                <option value="__custom">Other (one-off)…</option>
              </select>
            </label>
            {form.program === "pep" && (
              <label className="text-xs font-medium text-ink-soft">
                Level
                <select value={form.level} onChange={(e) => set("level", Number(e.target.value))} className={`mt-1 w-full ${F}`}>
                  {PEP_LEVELS.map((l) => (
                    <option key={l.level} value={l.level}>L{l.level} · {l.name} ({l.calendarDays}d)</option>
                  ))}
                </select>
              </label>
            )}
            {form.program === "exam_prep" && (
              <label className="text-xs font-medium text-ink-soft">
                Route
                <input value={form.route} onChange={(e) => set("route", e.target.value)} placeholder="IELTS / MUET / …" className={`mt-1 w-full ${F}`} />
              </label>
            )}
            {form.program === "other" && (
              <label className="text-xs font-medium text-ink-soft">
                Specify
                <input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Programme name" className={`mt-1 w-full ${F}`} />
              </label>
            )}
            <label className="text-xs font-medium text-ink-soft">
              Start date
              <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className={`mt-1 w-full ${F}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              End date {form.end_date ? "" : "(auto)"}
              <input type="date" value={effEnd} onChange={(e) => set("end_date", e.target.value)} className={`mt-1 w-full ${F}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Capacity
              <input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="seats (optional)" className={`mt-1 w-full ${F}`} />
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft">
              Notes
              <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="optional" className={`mt-1 w-full ${F}`} />
            </label>
          </div>
          {form.start_date && (
            <p className="mt-2 text-xs text-ink-muted">
              {daysInclusive(form.start_date, effEnd)} calendar days ·{" "}
              <span className="font-medium text-ink">{learning} learning days</span> (Mon–Fri, minus public holidays)
              {form.program === "pep" && pepLevel(form.level) && (
                <> · target {pepLevel(form.level)!.learningDays} learning days
                  {learning < pepLevel(form.level)!.learningDays && (
                    <span className="text-brand-red"> — short by {pepLevel(form.level)!.learningDays - learning}, extend the end date</span>
                  )}
                </>
              )}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={pending || !form.start_date} className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50">
              {pending ? "Saving…" : "Create intake"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* upcoming list */}
      <section>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Upcoming intakes
        </p>
        {upcoming.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
            No upcoming intakes scheduled{canEdit ? " — click a day above to add one." : "."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-border-warm">
            {upcoming.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm ${PROG_BAR[i.program] ?? "bg-ink-muted"}`} />
                  <div>
                    <p className="text-sm font-medium text-ink">{intakeName(i)}</p>
                    <p className="text-xs text-ink-muted">
                      {i.start_date} → {i.end_date} · {daysInclusive(i.start_date, i.end_date)} days
                      {i.capacity ? ` · ${i.capacity} seats` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <select
                      value={i.status}
                      onChange={(e) => run(() => updateIntake(i.id, { status: e.target.value }))}
                      className="rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none"
                    >
                      {INTAKE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${INTAKE_STATUS_TONE[i.status] ?? ""}`}>
                      {i.status}
                    </span>
                  )}
                  {canEdit && (
                    <button onClick={() => run(() => deleteIntake(i.id))} aria-label="Delete intake" className="text-ink-muted hover:text-brand-red">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* holidays */}
      {canEdit && (
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Public holidays (Malaysia)
          </p>
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} className={F} aria-label="Holiday date" />
            <input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Holiday name" className={F} />
            <button
              onClick={() => hDate && hName.trim() && run(async () => { await addHoliday(hDate, hName); setHDate(""); setHName(""); })}
              className="rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
            >
              Add / update
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {holidays.map((h) => (
              <span key={h.id} className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-cream-50 px-2.5 py-1 text-[11px] text-ink-soft">
                <span className="font-mono text-ink-muted">{h.holiday_date}</span>
                {h.name}
                <button onClick={() => run(() => deleteHoliday(h.id))} aria-label={`Remove ${h.name}`} className="text-ink-muted hover:text-brand-red">
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            Seeded with Malaysia federal holidays for 2026 — verify religious /
            movable dates and adjust as the government gazettes them.
          </p>
        </section>
      )}
    </div>
  );
}
