"use client";

import { useState, useTransition } from "react";
import { X, CheckCircle2, Circle, FileText } from "lucide-react";
import { getExecStudentDetail } from "@/app/admin/exec-actions";
import type { ExecStudentDetail } from "@/lib/admin/exec-shared";
import { formatMoney } from "@/lib/admin/finance-shared";

export function Chip({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
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

/**
 * Which read-only sections each viewer sees in the shared popout. Keeps the
 * drawer relevant to the team looking at it — finance collecting fees doesn't
 * need the visa EMGS checklist or the counselling activity log. Roles absent
 * from the map (admin/boss/admissions — the overview roles) see everything.
 */
const POPOUT_SECTIONS: Record<string, Set<string>> = {
  finance: new Set(["fees", "documents"]),
  visa: new Set(["visa", "documents", "fees"]),
  academic: new Set(["plan", "documents", "activity"]),
  counsellor: new Set(["plan", "documents", "activity"]),
  marketing: new Set(["fees", "plan", "documents", "activity"]),
};

/** Read-only student popout — status, progress, plan, log and documents. Shared
 *  by the exec lookup and any list that shows a student name. `viewer` (the
 *  looking role) tailors which sections show; omit for the full overview. */
export function DetailModal({
  d,
  viewer,
  onClose,
}: {
  d: ExecStudentDetail;
  viewer?: string;
  onClose: () => void;
}) {
  const allowed = viewer ? POPOUT_SECTIONS[viewer] : null;
  const show = (k: string) => !allowed || allowed.has(k);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-inkbtn/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={d.name}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border-warm bg-paper shadow-xl"
      >
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
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-50">
              <div className="h-full rounded-full bg-brand-red/80" style={{ width: `${d.progressPct}%` }} />
            </div>
            <span className="font-mono text-xs text-ink tabular">{d.progressPct}%</span>
            <Chip tone="ok">{d.stageLabel}</Chip>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-ink-muted">
            {d.ref && <span className="font-mono">Ref {d.ref}</span>}
            {d.classStart && <span>Class {d.classStart} → {d.classEnd ?? "…"}</span>}
            {d.nextAction && <span>Next: {d.nextAction}{d.nextActionDue ? ` (${d.nextActionDue})` : ""}</span>}
            {d.offerAcknowledgedAt && <span>Offer acknowledged {String(d.offerAcknowledgedAt).slice(0, 10)}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          {d.visa && show("visa") && (
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

          {d.fees.length > 0 && show("fees") && (
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

          {d.plan && (d.plan.steps.length > 0 || d.plan.summary) && show("plan") && (
            <Section title="Study plan">
              {d.plan.summary && <p className="mb-1.5 text-sm text-ink-soft">{d.plan.summary}</p>}
              <ol className="flex flex-col gap-1 text-sm">
                {d.plan.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-xs text-ink-muted">{i + 1}.</span>
                    <span className="text-ink">
                      {s.title}
                      {(s.start || s.end) && (
                        <span className="text-xs text-ink-muted"> ({[s.start, s.end].filter(Boolean).join(" → ")})</span>
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
                    <span key={i} title={sg.note} className="inline-flex items-center gap-1 rounded bg-status-present-bg px-2 py-0.5 text-[11px] font-medium text-status-present">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      {sg.role}{sg.by ? ` · ${sg.by}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {d.documents.length > 0 && show("documents") && (
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

          {d.events.length > 0 && show("activity") && (
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

/**
 * A student name that opens the read-only detail popout on click. Drop-in for
 * lists where the name would otherwise navigate away (finance, visa, …).
 */
export function StudentNameButton({
  applicationId,
  name,
  className,
  viewer,
}: {
  applicationId: string;
  name: string;
  className?: string;
  /** The looking role — tailors which sections the popout shows. */
  viewer?: string;
}) {
  const [detail, setDetail] = useState<ExecStudentDetail | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { const d = await getExecStudentDetail(applicationId); if (d) setDetail(d); })}
        className={className ?? "text-start font-medium text-ink hover:text-brand-red disabled:opacity-60"}
      >
        {name}
      </button>
      {detail && <DetailModal d={detail} viewer={viewer} onClose={() => setDetail(null)} />}
    </>
  );
}
