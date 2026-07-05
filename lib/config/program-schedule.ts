/**
 * Program durations + CEFR mapping, from the PEP / Exam Prep brochures.
 * Pure + client-safe. Calendar durations INCLUDE weekends (brochure); effective
 * learning is Mon–Fri, minus public holidays.
 */

export type ProgramKind = "pep" | "exam_prep" | "summer_camp" | "other";

export const PROGRAM_LABEL: Record<ProgramKind, string> = {
  pep: "Premium English Programme",
  exam_prep: "Exam Prep",
  summer_camp: "Summer Camp",
  other: "Other",
};

/** CEFR-aligned PEP levels. L1–2 = 45 calendar days (30 learning days);
 *  L3–5 = 30 calendar days (20 learning days). */
export const PEP_LEVELS = [
  { level: 1, name: "Foundations", calendarDays: 45, learningDays: 30 },
  { level: 2, name: "Developing", calendarDays: 45, learningDays: 30 },
  { level: 3, name: "Independent", calendarDays: 30, learningDays: 20 },
  { level: 4, name: "Advanced", calendarDays: 30, learningDays: 20 },
  { level: 5, name: "Mastery", calendarDays: 30, learningDays: 20 },
] as const;

export function pepLevel(level?: number | null) {
  return PEP_LEVELS.find((l) => l.level === level);
}

/** Default calendar-day span for a program/level (exam prep + camp are typical
 *  defaults — editable per intake). */
export function defaultDurationDays(program: ProgramKind, level?: number | null): number {
  if (program === "pep") return pepLevel(level)?.calendarDays ?? 30;
  if (program === "summer_camp") return 30; // one-month immersive
  if (program === "exam_prep") return 16; // 64h @ 4h/day; shorter routes ~10
  return 30;
}

export function defaultLearningDays(program: ProgramKind, level?: number | null): number | undefined {
  if (program === "pep") return pepLevel(level)?.learningDays;
  if (program === "exam_prep") return 16;
  return undefined;
}

/* ---- pure date helpers (UTC, ISO yyyy-mm-dd in/out) ---- */

export function parseISO(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** Inclusive end date: a 45-day span starting on the 1st ends on day 45. */
export function computeEndDate(start: string, calendarDays: number): string {
  return addDays(start, Math.max(1, calendarDays) - 1);
}

/** Weekdays (Mon–Fri) between start and end inclusive, minus holidays. */
export function learningDaysBetween(
  start: string,
  end: string,
  holidays: Set<string>,
): number {
  let count = 0;
  let cur = parseISO(start);
  const last = parseISO(end);
  while (cur <= last) {
    const dow = cur.getUTCDay(); // 0 Sun … 6 Sat
    if (dow !== 0 && dow !== 6 && !holidays.has(toISO(cur))) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}
