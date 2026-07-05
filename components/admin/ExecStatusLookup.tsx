"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { lookupStatus } from "@/app/admin/exec-actions";
import type { StatusHit } from "@/lib/admin/exec-shared";

function Chip({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-status-present-bg text-status-present"
      : tone === "warn"
        ? "bg-status-late-bg text-brand-gold"
        : "bg-cream-50 text-ink-muted";
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function HitCard({ h }: { h: StatusHit }) {
  return (
    <div className="border-b border-border-warm/60 bg-paper px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{h.name}</p>
        <Chip tone={h.kind === "lead" ? "muted" : "ok"}>{h.stageLabel}</Chip>
      </div>
      <p className="mt-0.5 text-xs text-ink-soft">{h.detail}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {h.isInternational && (
          <Chip tone={h.visaStageLabel === "not filed" ? "warn" : "muted"}>
            Visa: {h.visaStageLabel}
          </Chip>
        )}
        {h.feesCleared !== null &&
          (h.feesCleared ? (
            <Chip tone="ok">Fees cleared</Chip>
          ) : (
            <Chip tone="warn">Fees outstanding</Chip>
          ))}
        {h.nextAction && <Chip tone="muted">Next: {h.nextAction}</Chip>}
        {h.ref && <span className="font-mono text-[11px] text-ink-muted">Ref {h.ref}</span>}
      </div>
    </div>
  );
}

export function ExecStatusLookup({
  labels,
}: {
  labels?: { title: string; placeholder: string; button: string; none: string };
}) {
  const l = labels ?? {
    title: "Quick status check",
    placeholder: "Look up a student by name or passport / ID…",
    button: "Check",
    none: "No one matches",
  };
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<StatusHit[] | null>(null);
  const [pending, start] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2) return;
    start(async () => setHits(await lookupStatus(query)));
  }

  return (
    <section>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        {l.title}
      </p>
      <form
        onSubmit={run}
        className="flex items-center gap-2 rounded-card border border-border-warm bg-paper px-3 py-2"
      >
        <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={l.placeholder}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
        />
        <button
          type="submit"
          disabled={pending || q.trim().length < 2}
          className="shrink-0 rounded-md bg-inkbtn px-3 py-1.5 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft disabled:opacity-50"
        >
          {pending ? "…" : l.button}
        </button>
      </form>

      {hits !== null && (
        <div className="mt-3">
          {hits.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
              {l.none} “{q.trim()}”.
            </p>
          ) : (
            <div className="overflow-hidden rounded-card border border-border-warm">
              {hits.map((h, i) => (
                <HitCard key={`${h.name}-${i}`} h={h} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
