"use client";

import { useState, useTransition } from "react";
import { Search, X, CheckCircle2, Circle, FileText, ChevronRight } from "lucide-react";
import { lookupStatus, getExecStudentDetail } from "@/app/admin/exec-actions";
import type { StatusHit, ExecStudentDetail } from "@/lib/admin/exec-shared";
import { formatMoney } from "@/lib/admin/finance-shared";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
        {title}
      </p>
      {children}
    </section>
  );
}

const FEE_TONE: Record<string, string> = {
  paid: "bg-status-present-bg text-status-present",
  waived: "bg-status-present-bg text-status-present",
  partial: "bg-status-late-bg text-brand-gold",
  unpaid: "bg-brand-red-bg text-brand-red",
};

/** Read-only student popout — status, progress, plan, log and documents. */
function DetailModal({ d, onClose }: { d: ExecStudentDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-inkbtn/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={d.name}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border-warm bg-paper shadow-xl"
      >
        {/* header */}
        <div className="border-b border-border-warm px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-xl font-medium text-ink">{d.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {d.program} · {d.trackLabel}
                {d.intake ? ` · ${d.intake}` : ""}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-ink">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {/* progress */}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-50">
              <div
                className="h-full rounded-full bg-brand-red/80"
                style={{ width: `${d.progressPct}%` }}
              />
            </div>
            <span className="font-mono text-xs text-ink tabular">{d.progressPct}%</span>
            <Chip tone="ok">{d.stageLabel}</Chip>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-ink-muted">
            {d.ref && <span className="font-mono">Ref {d.ref}</span>}
            {d.classStart && (
              <span>
                Class {d.classStart} → {d.classEnd ?? "…"}
              </span>
            )}
            {d.nextAction && (
              <span>
                Next: {d.nextAction}
                {d.nextActionDue ? ` (${d.nextActionDue})` : ""}
              </span>
            )}
            {d.offerAcknowledgedAt && (
              <span>Offer acknowledged {String(d.offerAcknowledgedAt).slice(0, 10)}</span>
            )}
          </div>
        </div>

        {/* body */}
        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          {d.visa && (
            <Section title={`Visa — ${d.visa.stageLabel}`}>
              <div className="flex flex-col gap-1.5">
                {d.visa.checklist.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-sm">
                    {c.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-status-present" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-ink-muted/50" aria-hidden />
                    )}
                    <span className={c.done ? "text-ink" : "text-ink-muted"}>{c.label}</span>
                    {c.detail && <span className="text-xs text-ink-muted">· {c.detail}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {d.fees.length > 0 && (
            <Section title="Fees">
              <div className="flex flex-col gap-1.5">
                {d.fees.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-soft">
                      {f.label}
                      {f.dueDate ? <span className="text-xs text-ink-muted"> · due {f.dueDate}</span> : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-ink tabular">{formatMoney(f.amount)}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${FEE_TONE[f.status] ?? "bg-cream-50 text-ink-muted"}`}>
                        {f.status}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {d.plan && (d.plan.steps.length > 0 || d.plan.summary) && (
            <Section title="Study plan">
              {d.plan.summary && <p className="mb-1.5 text-sm text-ink-soft">{d.plan.summary}</p>}
              <ol className="flex flex-col gap-1 text-sm">
                {d.plan.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-xs text-ink-muted">{i + 1}.</span>
                    <span className="text-ink">
                      {s.title}
                      {(s.start || s.end) && (
                        <span className="text-xs text-ink-muted">
                          {" "}
                          ({[s.start, s.end].filter(Boolean).join(" → ")})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              {d.plan.targetCompletion && (
                <p className="mt-1.5 text-xs text-ink-muted">Finish by {d.plan.targetCompletion}</p>
              )}
              {d.plan.signoffs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.plan.signoffs.map((sg, i) => (
                    <span
                      key={i}
                      title={sg.note}
                      className="inline-flex items-center gap-1 rounded bg-status-present-bg px-2 py-0.5 text-[11px] font-medium text-status-present"
                    >
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      {sg.role}
                      {sg.by ? ` · ${sg.by}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {d.documents.length > 0 && (
            <Section title="Documents">
              <div className="flex flex-col gap-1.5">
                {d.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={`/api/admin/appdoc/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border border-border-warm/60 px-3 py-2 text-sm transition-colors hover:bg-cream-50"
                  >
                    <span className="flex items-center gap-2 text-ink">
                      <FileText className="h-4 w-4 text-ink-muted" aria-hidden />
                      {doc.kind.replace(/_/g, " ")}
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-ink-muted">
                      {doc.at}
                      <Chip tone={doc.reviewStatus === "verified" ? "ok" : doc.reviewStatus === "rejected" ? "warn" : "muted"}>
                        {doc.reviewStatus}
                      </Chip>
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {d.events.length > 0 && (
            <Section title="Recent activity">
              <div className="flex flex-col gap-1.5">
                {d.events.map((e, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 font-mono text-xs text-ink-muted tabular">{e.at}</span>
                    <span className="text-ink-soft">{e.body ?? e.type}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="border-t border-border-warm bg-cream-50/60 px-5 py-2.5 text-center text-[11px] text-ink-muted">
          View only — changes are made by the owning team in its own tab.
        </div>
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
