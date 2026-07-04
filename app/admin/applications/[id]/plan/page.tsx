import Image from "next/image";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getApplication } from "@/lib/admin/applications";
import { PrintButton } from "@/components/ui/PrintButton";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * Bare printable study plan — hand it to the student as a PDF (browser print →
 * Save as PDF) or attach it to an email. Outside the console layout on purpose.
 */
export default async function PlanPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole([
    "admin",
    "admissions",
    "academic",
    "counsellor",
    "marketing",
    "staff",
  ]);
  const { id } = await params;
  const record = await getApplication(id);
  if (!record || !record.app.plan?.steps?.length) notFound();
  const { app } = record;
  const plan = app.plan!;

  return (
    <main className="mx-auto max-w-2xl px-8 py-10 print:px-0 print:py-0">
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-border-warm pb-4">
        <div className="flex items-center gap-3">
          <Image src="/pecsb-logo.png" alt="PECSB" width={40} height={40} className="h-10 w-10" />
          <div>
            <Wordmark size="sm" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Study plan
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <h1 className="font-serif text-3xl font-medium text-ink">
        {app.student_name}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {app.program_name ?? app.target_institution ?? ""}
        {plan.intake ? ` · Target intake: ${plan.intake}` : ""}
      </p>
      {plan.summary && (
        <p className="mt-4 text-base leading-relaxed text-ink-soft">{plan.summary}</p>
      )}

      <ol className="mt-8 flex flex-col gap-5">
        {plan.steps.map((s, i) => (
          <li key={i} className="flex gap-4 break-inside-avoid">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-red font-serif text-sm text-oncolor">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-ink">{s.title}</p>
              <p className="text-sm text-ink-muted">
                {[s.start, s.end].filter(Boolean).join(" → ")}
                {s.note ? ` · ${s.note}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-10 border-t border-border-warm pt-3 text-[10px] text-ink-muted">
        Dates are indicative and may shift with intake windows and visa timelines.
        Premium Entrepreneur Consultant Sdn Bhd / Premium Language Centre.
      </p>
    </main>
  );
}
