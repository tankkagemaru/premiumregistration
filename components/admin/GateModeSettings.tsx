"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GateMode } from "@/lib/admin/gates-shared";
import { saveGateMode } from "@/app/admin/settings-actions";

const OPTIONS: { id: GateMode; label: string; desc: string }[] = [
  { id: "hard", label: "Hard gates", desc: "Block a handoff until its exit conditions are met." },
  { id: "soft", label: "Soft warnings", desc: "Allow the handoff but warn when conditions aren't met." },
];

/** Toggle how strictly stage handoffs are enforced (admin only). */
export function GateModeSettings({ mode }: { mode: GateMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState<GateMode>(mode);

  const choose = (m: GateMode) => {
    if (m === current) return;
    setCurrent(m);
    start(async () => {
      const res = await saveGateMode(m);
      if (res.ok) router.refresh();
      else setCurrent(mode);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={pending}
          onClick={() => choose(o.id)}
          className={`rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-60 ${
            current === o.id
              ? "border-brand-red bg-brand-red/10"
              : "border-border-warm bg-cream-50 hover:border-ink-muted"
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <span
              className={`h-2 w-2 rounded-full ${current === o.id ? "bg-brand-red" : "bg-ink-muted/40"}`}
            />
            {o.label}
          </p>
          <p className="mt-0.5 pl-4 text-xs text-ink-muted">{o.desc}</p>
        </button>
      ))}
    </div>
  );
}
