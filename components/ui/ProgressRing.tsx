import type { Flag } from "@/lib/admin/applications-shared";

const FLAG_COLOR: Record<Flag, string> = {
  ok: "var(--color-status-present)",
  progress: "var(--color-brand-gold)",
  action: "var(--color-brand-red)",
};

/**
 * Circular progress ring, coloured by health flag (green ok / amber in
 * progress / red action needed). Shared by the status portal, agent portal,
 * and the staff application drawer.
 */
export function ProgressRing({
  percent,
  flag = "progress",
  size = 128,
  thickness = 8,
  sublabel,
}: {
  percent: number;
  flag?: Flag;
  size?: number;
  thickness?: number;
  sublabel?: string;
}) {
  const r = size / 2 - thickness - 2;
  const circ = 2 * Math.PI * r;
  const color = FLAG_COLOR[flag];

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${percent}% complete`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border-warm)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - percent / 100)}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-serif font-medium leading-none text-ink tabular"
          style={{ fontSize: Math.max(11, Math.round(size * 0.22)) }}
        >
          {percent}%
        </span>
        {sublabel && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
