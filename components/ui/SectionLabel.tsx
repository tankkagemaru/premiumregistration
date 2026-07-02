import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

// Uppercase tracking-wide label with a horizontal rule after it.
// Ported from `qrattendance`. Used above each major form section.
export function SectionLabel({ children, className }: Props) {
  return (
    <div className={cn("mb-3 flex items-baseline gap-3", className)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        {children}
      </span>
      <span className="flex-1 border-t border-brand-red/60" />
    </div>
  );
}
