import type { LeadStatus } from "@/lib/admin/leads-shared";

const LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  enrolled: "Enrolled",
  dropped: "Dropped",
};

// Muted crimson/cream/gold/green tones — not garish traffic-light hues.
const STYLES: Record<string, string> = {
  new: "bg-brand-red-bg text-brand-red",
  contacted: "bg-status-late-bg text-brand-gold",
  enrolled: "bg-status-present-bg text-status-present",
  dropped: "bg-cream-50 text-ink-muted border border-border-warm",
};

export function statusLabel(status: string) {
  return LABELS[status] ?? status;
}

export function StatusBadge({ status }: { status: LeadStatus | string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
        STYLES[status] ?? STYLES.dropped
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}
