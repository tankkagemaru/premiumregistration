"use client";

import { useState, useTransition } from "react";
import { Search, ChevronRight } from "lucide-react";
import { lookupStatus, getExecStudentDetail } from "@/app/admin/exec-actions";
import type { StatusHit, ExecStudentDetail } from "@/lib/admin/exec-shared";
import { DetailModal, Chip } from "@/components/admin/StudentDetailModal";

function HitCard({ h, onOpen }: { h: StatusHit; onOpen?: () => void }) {
  const clickable = Boolean(h.applicationId && onOpen);
  const Inner = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{h.name}</p>
        <span className="flex items-center gap-2">
          <Chip tone={h.kind === "lead" ? "muted" : "ok"}>{h.stageLabel}</Chip>
          {clickable && <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />}
        </span>
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
    </>
  );
  if (!clickable)
    return <div className="border-b border-border-warm/60 bg-paper px-4 py-3 last:border-0">{Inner}</div>;
  return (
    <button
      onClick={onOpen}
      className="block w-full border-b border-border-warm/60 bg-paper px-4 py-3 text-start transition-colors last:border-0 hover:bg-cream-50"
    >
      {Inner}
    </button>
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
  const [detail, setDetail] = useState<ExecStudentDetail | null>(null);
  const [pending, start] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2) return;
    start(async () => setHits(await lookupStatus(query)));
  }

  function open(h: StatusHit) {
    if (!h.applicationId) return;
    const id = h.applicationId;
    start(async () => {
      const d = await getExecStudentDetail(id);
      if (d) setDetail(d);
    });
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
                <HitCard key={`${h.name}-${i}`} h={h} onOpen={() => open(h)} />
              ))}
            </div>
          )}
        </div>
      )}

      {detail && <DetailModal d={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}
