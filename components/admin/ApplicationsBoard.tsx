"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAGES, CORPORATE_STAGES, type Application } from "@/lib/admin/applications-shared";
import { advanceApplicationStage } from "@/app/admin/application-actions";
import { TRACKS } from "@/lib/config/tracks";
import { cn } from "@/lib/utils";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));

export function ApplicationsBoard({ apps }: { apps: Application[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [over, setOver] = useState<string | null>(null);
  const [dropErr, setDropErr] = useState<string | null>(null);

  function drop(stage: string, id: string) {
    setOver(null);
    start(async () => {
      setDropErr(null);
      const r = await advanceApplicationStage(id, stage);
      if (r && !r.ok) {
        setDropErr(r.error ?? "That move is blocked by the stage gate.");
        return;
      }
      router.refresh();
    });
  }

  // Student columns, plus the corporate-only lanes when a corporate deal exists
  // (so proposal/quote/HRDF/delivery cards never disappear from the board).
  const hasCorporate = apps.some((a) => a.track === "corporate");
  const studentIds = new Set(STAGES.map((s) => s.id));
  const columns = hasCorporate
    ? [...STAGES, ...CORPORATE_STAGES.filter((s) => !studentIds.has(s.id))]
    : STAGES;

  return (
    <div className="overflow-x-auto pb-2">
      {dropErr && (
        <p className="mb-2 rounded-md border border-brand-red/40 bg-brand-red-bg px-3 py-1.5 text-xs font-medium text-brand-red">
          {dropErr}
        </p>
      )}
      <div className="flex min-w-max gap-3">
        {columns.map((stage) => {
          const cards = apps.filter((a) => a.stage === stage.id);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(stage.id, e.dataTransfer.getData("text/plain"))}
              className={cn(
                "flex w-56 shrink-0 flex-col gap-2 rounded-card border p-2.5 transition-colors",
                over === stage.id
                  ? "border-brand-red bg-brand-red-bg/40"
                  : "border-border-warm bg-cream-50",
              )}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                  {stage.label}
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  {cards.length}
                </span>
              </div>
              {cards.map((a) => (
                <button
                  key={a.id}
                  draggable={!pending}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                  onClick={() => router.push(`/admin/applications?app=${a.id}`)}
                  className="cursor-grab rounded-md border border-border-warm bg-paper px-3 py-2.5 text-left active:cursor-grabbing"
                >
                  <p className="text-sm font-medium text-ink">{a.student_name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {a.target_institution ?? TRACK_TITLE[a.track] ?? a.track}
                  </p>
                  <span
                    className={cn(
                      "mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
                      a.is_international
                        ? "bg-brand-gold/20 text-brand-gold"
                        : "bg-cream-50 text-ink-muted",
                    )}
                  >
                    {a.is_international ? "International" : "Local"}
                  </span>
                </button>
              ))}
              {cards.length === 0 && (
                <p className="px-1 py-3 text-center text-xs text-ink-muted">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
