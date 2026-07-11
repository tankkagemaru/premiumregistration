/** Calendar types + date helpers. Pure, client-safe. */

export type CalEventKind =
  | "followup"
  | "class_start"
  | "class_end"
  | "visa_expiry"
  | "intake"
  | "holiday"
  | "arrival"
  | "other";

export interface CalEvent {
  date: string; // yyyy-mm-dd
  title: string;
  kind: CalEventKind;
  href?: string;
}

export const EVENT_STYLE: Record<
  CalEventKind,
  { label: string; dot: string; chip: string }
> = {
  followup: { label: "Follow-up", dot: "bg-brand-red", chip: "bg-brand-red-bg text-brand-red" },
  class_start: { label: "Class start", dot: "bg-status-present", chip: "bg-status-present-bg text-status-present" },
  class_end: { label: "Class end", dot: "bg-ink-muted", chip: "bg-cream-50 text-ink-muted" },
  visa_expiry: { label: "Pass expiry", dot: "bg-brand-gold", chip: "bg-status-late-bg text-brand-gold" },
  intake: { label: "Intake", dot: "bg-brand-red", chip: "bg-brand-red-bg text-brand-red" },
  holiday: { label: "Holiday", dot: "bg-brand-gold", chip: "bg-status-late-bg text-brand-gold" },
  arrival: { label: "Arrival", dot: "bg-status-present", chip: "bg-status-present-bg text-status-present" },
  other: { label: "Event", dot: "bg-ink-muted", chip: "bg-cream-50 text-ink-muted" },
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Day cells for a month grid (leading blanks for alignment), as yyyy-mm-dd. */
export function monthDays(year: number, month: number): (string | null)[] {
  const startDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
