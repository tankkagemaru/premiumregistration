/** Program intake + public holiday types. Pure, client-safe. */

export interface ProgramIntake {
  id: string;
  program: string; // pep | exam_prep | summer_camp | other
  level?: number | null;
  route?: string | null;
  label?: string | null;
  start_date: string;
  end_date: string;
  capacity?: number | null;
  status: string; // planned | open | running | done | cancelled
  notes?: string | null;
  created_at: string;
}

export interface PublicHoliday {
  id: string;
  holiday_date: string;
  name: string;
}

export const INTAKE_STATUSES = ["planned", "open", "running", "done", "cancelled"] as const;

export const INTAKE_STATUS_TONE: Record<string, string> = {
  planned: "bg-cream-50 text-ink-muted border border-border-warm",
  open: "bg-status-present-bg text-status-present",
  running: "bg-brand-red-bg text-brand-red",
  done: "bg-cream-50 text-ink-muted",
  cancelled: "bg-cream-50 text-ink-muted line-through",
};
