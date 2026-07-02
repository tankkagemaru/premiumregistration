import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

// Standard top-of-page heading: small uppercase eyebrow, serif title,
// optional subtitle, right-aligned actions. Ported from `qrattendance`.
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div>
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-3xl font-semibold leading-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
