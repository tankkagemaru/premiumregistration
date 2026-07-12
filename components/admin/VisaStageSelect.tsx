"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { stagesForKind } from "@/lib/admin/visa-shared";
import { updateVisaCase } from "@/app/admin/visa-actions";

/**
 * Row stage control — deliberate single-step arrows, NOT a 15-option dropdown
 * that a stray scroll/click could jump to a random stage. Back/Advance move one
 * stage at a time (and are recoverable); free jumps live in the case drawer.
 */
export function VisaStageSelect({
  id,
  stage,
  kind,
}: {
  id: string;
  stage: string;
  kind?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const list = stagesForKind(kind);
  const idx = list.findIndex((s) => s.id === stage);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  const move = (to: string) =>
    start(async () => {
      await updateVisaCase(id, { stage: to });
      router.refresh();
    });

  const btn =
    "rounded-md border border-border-warm bg-paper p-1 text-ink-soft hover:bg-cream-50 hover:text-ink disabled:opacity-30 disabled:hover:bg-paper";

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={pending || !prev}
        onClick={() => prev && move(prev.id)}
        title={prev ? `Back to “${prev.label}”` : "At the first stage"}
        aria-label="Back one stage"
        className={btn}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        disabled={pending || !next}
        onClick={() => next && move(next.id)}
        title={next ? `Advance to “${next.label}”` : "Final stage"}
        aria-label="Advance one stage"
        className={btn}
      >
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}
