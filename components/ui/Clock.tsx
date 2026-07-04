"use client";

import { useEffect, useState } from "react";

// Live date + time for the console top bar. Renders nothing until mounted so
// server and client markup match (no hydration mismatch), then ticks each
// half-minute to keep the minute fresh.
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const date = now.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span
      className="hidden text-xs text-ink-soft tabular md:inline"
      suppressHydrationWarning
    >
      {date} · {time}
    </span>
  );
}
