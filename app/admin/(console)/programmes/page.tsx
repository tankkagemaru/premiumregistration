import { requireRole } from "@/lib/auth";
import { listUniversities } from "@/lib/admin/universities";
import { UniversityManager } from "@/components/admin/UniversityManager";

export default async function ProgrammesPage() {
  const profile = await requireRole([
    "admin", "boss", "admissions", "marketing", "counsellor", "visa", "academic", "finance", "staff",
  ]);
  const universities = await listUniversities();
  const canEdit = ["admin", "admissions"].includes(profile.role);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Admissions
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">University programmes</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          The Malaysia university &amp; programme catalogue — fees, intakes and
          currency per university.{" "}
          {canEdit
            ? "Admissions maintains it here; the team browses it to advise students."
            : "Browse to advise students on universities, programmes and fees."}
        </p>
      </div>
      <UniversityManager universities={universities} canEdit={canEdit} />
    </div>
  );
}
