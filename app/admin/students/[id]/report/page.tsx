import Image from "next/image";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStudentRecord } from "@/lib/admin/students";
import { StudentRecordView } from "@/components/admin/StudentRecordView";
import { PrintButton } from "@/components/ui/PrintButton";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * Bare printable student report — outside the console layout so the sidebar
 * doesn't print. Export = the print dialog's "Save as PDF".
 */
export default async function StudentReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole([
    "admin",
    "admissions",
    "marketing",
    "visa",
    "finance",
    "academic",
    "counsellor",
    "staff",
  ]);
  const { id } = await params;
  const record = await getStudentRecord(id);
  if (!record) notFound();

  return (
    <main className="mx-auto max-w-3xl px-8 py-10 print:px-0 print:py-0">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-border-warm pb-4">
        <div className="flex items-center gap-3">
          <Image src="/pecsb-logo.png" alt="PECSB" width={40} height={40} className="h-10 w-10" />
          <div>
            <Wordmark size="sm" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Student record report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-ink-muted print:inline hidden">
            {new Date().toISOString().slice(0, 10)}
          </span>
          <PrintButton />
        </div>
      </div>
      <StudentRecordView record={record} />
      <p className="mt-8 border-t border-border-warm pt-3 text-[10px] text-ink-muted">
        Internal record — Premium Entrepreneur Consultant Sdn Bhd / Premium Language
        Centre. Contains personal data; handle per PDPA.
      </p>
    </main>
  );
}
