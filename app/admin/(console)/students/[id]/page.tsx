import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStudentRecord } from "@/lib/admin/students";
import { StudentRecordView } from "@/components/admin/StudentRecordView";

export default async function StudentPage({
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Student record
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">
            {record.student.full_name}
          </h1>
        </div>
        <Link
          href={`/admin/students/${id}/report`}
          className="rounded-md bg-inkbtn px-4 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft"
        >
          Open printable report →
        </Link>
      </div>
      <StudentRecordView record={record} />
    </div>
  );
}
