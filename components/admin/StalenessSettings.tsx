"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  STALENESS_RULES,
  type StalenessDays,
  type StalenessKey,
} from "@/lib/config/staleness";
import { saveStalenessDays } from "@/app/admin/settings-actions";

const ORDER: StalenessKey[] = [
  "newUncontacted",
  "followupOverdue",
  "noFollowup",
  "contactedStalled",
];

/** Editable stale-record thresholds (admin). Days = 0 means "immediately". */
export function StalenessSettings({ days }: { days: StalenessDays }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<StalenessDays>(days);
  const [saved, setSaved] = useState(false);
  const dirty = ORDER.some((k) => draft[k] !== days[k]);

  return (
    <div>
      <ul className="flex flex-col gap-2 text-sm text-ink">
        {ORDER.map((k) => {
          const rule = STALENESS_RULES[k];
          return (
            <li key={k} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    rule.level === "alert" ? "bg-brand-red" : "bg-brand-gold"
                  }`}
                />
                {rule.label}
              </span>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
                after
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={draft[k]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))
                  }
                  className="w-16 rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-right text-sm text-ink outline-none focus:border-brand-red tabular"
                />
                days
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() =>
            start(async () => {
              const res = await saveStalenessDays(draft);
              if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
                router.refresh();
              }
            })
          }
          disabled={pending || !dirty}
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save thresholds"}
        </button>
        <p className="text-xs text-ink-muted">
          A lead is flagged once it crosses any of these.
        </p>
      </div>
    </div>
  );
}
