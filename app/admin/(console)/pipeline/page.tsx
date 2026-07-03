import { listLeads } from "@/lib/admin/leads";
import { PipelineBoard } from "@/components/admin/PipelineBoard";

export default async function PipelinePage() {
  const leads = await listLeads();
  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Pipeline
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">
          Drag to advance
        </h1>
      </div>
      <PipelineBoard leads={leads} />
    </div>
  );
}
