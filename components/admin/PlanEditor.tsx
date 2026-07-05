"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy, Check, Printer, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  planStatus,
  PLAN_ROUTES,
  PLAN_ROLE_LABEL,
  type StudyPlan,
} from "@/lib/admin/applications-shared";
import {
  saveStudyPlan,
  sendPlanForReview,
  advancePlanReview,
  returnPlanToDraft,
} from "@/app/admin/application-actions";
import { saveLeadPlan } from "@/app/admin/actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

type StepDraft = { title: string; start: string; end: string; note: string };

/** Build the WhatsApp/email-ready text version of a plan. */
function planText(
  studentName: string,
  intake: string,
  targetCompletion: string,
  summary: string,
  steps: StepDraft[],
): string {
  const lines = [
    `Study plan for ${studentName}`,
    intake ? `Target intake: ${intake}` : "",
    targetCompletion ? `Expected completion: ${targetCompletion}` : "",
    summary ? `\n${summary}` : "",
    "",
    ...steps
      .filter((s) => s.title.trim())
      .map((s, i) => {
        const dates = [s.start, s.end].filter(Boolean).join(" → ");
        return `${i + 1}. ${s.title}${dates ? ` (${dates})` : ""}${s.note ? ` — ${s.note}` : ""}`;
      }),
    "",
    "— Premium Language Centre / PECSB",
  ];
  return lines.filter((l, i) => l !== "" || i > 0).join("\n");
}

export function PlanEditor({
  applicationId,
  studentName,
  plan,
  target = "application", // "lead" saves onto the enquiry instead
  role = "staff",
}: {
  applicationId: string;
  studentName: string;
  plan?: StudyPlan | null;
  target?: "application" | "lead";
  role?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [intake, setIntake] = useState(plan?.intake ?? "");
  const [targetCompletion, setTargetCompletion] = useState(plan?.target_completion ?? "");
  const [summary, setSummary] = useState(plan?.summary ?? "");
  const [steps, setSteps] = useState<StepDraft[]>(
    plan?.steps?.length
      ? plan.steps.map((s) => ({ title: s.title, start: s.start ?? "", end: s.end ?? "", note: s.note ?? "" }))
      : [{ title: "", start: "", end: "", note: "" }],
  );

  const setStep = (i: number, k: keyof StepDraft, v: string) =>
    setSteps((all) => all.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  function save() {
    start(async () => {
      const payload = { intake, target_completion: targetCompletion, summary, steps };
      if (target === "lead") await saveLeadPlan(applicationId, payload);
      else await saveStudyPlan(applicationId, payload);
      setOpen(false);
      router.refresh();
    });
  }

  function act(fn: () => Promise<void>) {
    start(async () => {
      await fn();
      setNote("");
      router.refresh();
    });
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(
        planText(studentName, intake, targetCompletion, summary, steps),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const hasPlan = Boolean(plan?.steps?.length);

  // Cross-department handover — only for real applications.
  const st = planStatus(plan);
  const showWorkflow = target === "application" && st.state !== "none";
  const isHolder = role === "admin" || role === st.holder;
  const canSend = ["admin", "admissions"].includes(role);
  const isLastStep = st.chain[st.chain.length - 1] === st.holder;
  const signoffs = plan?.workflow?.signoffs ?? [];
  const lastSignoff = signoffs[signoffs.length - 1];

  const STATE_BADGE: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft · Admissions", cls: "bg-cream-50 text-ink-muted" },
    review: {
      label: `In review · ${PLAN_ROLE_LABEL[st.holder ?? ""] ?? st.holder}`,
      cls: "bg-status-late-bg text-brand-gold",
    },
    finalized: { label: "Finalised", cls: "bg-status-present-bg text-status-present" },
  };

  return (
    <div>
      {showWorkflow && (
        <div className="mb-2 rounded-md border border-border-warm bg-cream-50/60 p-2.5">
          {/* Handover chain */}
          <div className="flex flex-wrap items-center gap-1.5">
            {st.chain.map((r, i) => {
              const done = st.signedRoles.includes(r);
              const current = r === st.holder && st.state === "review";
              return (
                <span key={r} className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight className="h-3 w-3 text-ink-muted" aria-hidden />}
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                      current
                        ? "bg-brand-red text-oncolor"
                        : done
                          ? "bg-status-present-bg text-status-present"
                          : "bg-paper text-ink-muted"
                    }`}
                  >
                    {done && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                    {PLAN_ROLE_LABEL[r] ?? r}
                  </span>
                </span>
              );
            })}
            <span
              className={`ml-auto inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${STATE_BADGE[st.state]?.cls ?? ""}`}
            >
              {STATE_BADGE[st.state]?.label}
            </span>
          </div>

          {/* Latest sign-off note */}
          {lastSignoff?.note && (
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {PLAN_ROLE_LABEL[lastSignoff.role] ?? lastSignoff.role}
              {lastSignoff.by ? ` (${lastSignoff.by})` : ""}: “{lastSignoff.note}”
            </p>
          )}

          {/* Actions */}
          {st.state === "draft" && canSend && (
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-medium text-ink-soft">
                Send for review — choose the handover path:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PLAN_ROUTES.map((p) => (
                  <button
                    key={p.key}
                    title={p.desc}
                    disabled={pending}
                    onClick={() => act(() => sendPlanForReview(applicationId, p.key))}
                    className="rounded-md border border-border-warm bg-paper px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-cream-50 disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {st.state === "review" && isHolder && (
            <div className="mt-2 flex flex-col gap-1.5">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Verification note (optional)"
                className="rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand-red"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  disabled={pending}
                  onClick={() => act(() => advancePlanReview(applicationId, note))}
                  className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
                >
                  {isLastStep ? "Verify & finalise" : "Verify & hand over"}
                </button>
                <button
                  disabled={pending}
                  onClick={() => act(() => returnPlanToDraft(applicationId, note))}
                  className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-brand-red disabled:opacity-50"
                >
                  Return to Admissions
                </button>
              </div>
            </div>
          )}

          {st.state === "review" && !isHolder && (
            <p className="mt-1.5 text-[11px] text-ink-muted">
              Waiting on {PLAN_ROLE_LABEL[st.holder ?? ""] ?? st.holder} to verify.
            </p>
          )}

          {st.state === "finalized" && (
            <p className="mt-1.5 text-[11px] text-status-present">
              Finalised{lastSignoff?.by ? ` by ${lastSignoff.by}` : ""} — shared with the student.
            </p>
          )}
        </div>
      )}

      {!open && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
          >
            {hasPlan ? `Edit plan (${plan!.steps.length} steps)` : "Draft a study plan"}
          </button>
          {hasPlan && (
            <>
              <button
                onClick={copyText}
                className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-status-present" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                Copy as message
              </button>
              {target === "application" && (
                <a
                  href={`/admin/applications/${applicationId}/plan`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden />
                  Printable / PDF
                </a>
              )}
            </>
          )}
        </div>
      )}

      {open && (
        <div className="flex flex-col gap-3 rounded-md border border-border-warm bg-paper p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-ink-soft">
              Target intake
              <input value={intake} onChange={(e) => setIntake(e.target.value)} placeholder="e.g. September 2026" className={`mt-1 w-full ${F}`} />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Expected completion
              <input type="date" value={targetCompletion} onChange={(e) => setTargetCompletion(e.target.value)} className={`mt-1 w-full ${F}`} aria-label="Expected completion date" />
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft">
              Summary
              <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="one-line overview" className={`mt-1 w-full ${F}`} />
            </label>
          </div>

          {steps.map((s, i) => (
            <div key={i} className="rounded-md border border-border-warm/60 p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">{i + 1}.</span>
                <input value={s.title} onChange={(e) => setStep(i, "title", e.target.value)} placeholder="Step — e.g. Intensive English (B1 → B2)" className={`flex-1 ${F}`} />
                <button
                  onClick={() => setSteps((all) => all.filter((_, j) => j !== i))}
                  aria-label="Remove step"
                  className="text-ink-muted hover:text-brand-red"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input type="date" value={s.start} onChange={(e) => setStep(i, "start", e.target.value)} className={F} aria-label="Start" />
                <input type="date" value={s.end} onChange={(e) => setStep(i, "end", e.target.value)} className={F} aria-label="End" />
                <input value={s.note} onChange={(e) => setStep(i, "note", e.target.value)} placeholder="note" className={F} />
              </div>
            </div>
          ))}

          <button
            onClick={() => setSteps((all) => [...all, { title: "", start: "", end: "", note: "" }])}
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-brand-red hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add step
          </button>

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save plan"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border-warm px-4 py-2 text-sm text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-ink-muted">
            Saved plans appear on the student&apos;s status page. Use &quot;Copy as
            message&quot; to send it by WhatsApp/email, or the printable view for a PDF.
          </p>
        </div>
      )}
    </div>
  );
}
