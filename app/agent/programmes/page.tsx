import { requireRole } from "@/lib/auth";
import { listUniversities } from "@/lib/admin/universities";
import { UniversityManager } from "@/components/admin/UniversityManager";

export default async function AgentProgrammesPage() {
  await requireRole(["agent", "admin"]);
  const universities = await listUniversities();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Tools
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">University programmes</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Browse Malaysian universities, programmes, fees and intakes to advise
          your students.
        </p>
      </div>
      <UniversityManager universities={universities} canEdit={false} />
    </div>
  );
}
