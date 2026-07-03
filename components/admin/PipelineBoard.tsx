"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUSES, type Lead } from "@/lib/admin/leads-shared";
import { statusLabel } from "@/components/admin/StatusBadge";
import { updateLeadStatus } from "@/app/admin/actions";
import { TRACKS } from "@/lib/config/tracks";
import { cn } from "@/lib/utils";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));

export function PipelineBoard({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);

  function onDrop(status: string, id: string) {
    setDragOver(null);
    start(async () => {
      await updateLeadStatus(id, status);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {LEAD_STATUSES.map((status) => {
        const cards = leads.filter((l) => l.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(status, e.dataTransfer.getData("text/plain"))}
            className={cn(
              "flex flex-col gap-3 rounded-card border p-3 transition-colors",
              dragOver === status
                ? "border-brand-red bg-brand-red-bg/40"
                : "border-border-warm bg-cream-50",
            )}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                {statusLabel(status)}
              </span>
              <span className="font-mono text-xs text-ink-muted">{cards.length}</span>
            </div>
            {cards.map((l) => (
              <div
                key={l.id}
                draggable={!pending}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                className="cursor-grab rounded-md border border-border-warm bg-paper px-3 py-2.5 active:cursor-grabbing"
              >
                <p className="text-sm font-medium text-ink">{l.full_name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {l.tracks.map((t) => TRACK_TITLE[t] ?? t).join(", ")}
                </p>
              </div>
            ))}
            {cards.length === 0 && (
              <p className="px-1 py-4 text-center text-xs text-ink-muted">Empty</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
