"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Check, Loader2, FileText } from "lucide-react";
import {
  STAGE_LABEL,
  stagePercent,
  type Application,
} from "@/lib/admin/applications-shared";
import { DOC_KIND_LABEL } from "@/lib/config/documents";
import { createStudentDocUploadUrl, recordStudentDoc } from "@/app/agent/actions";

const BUCKET = "registration-docs";
const UPLOAD_KINDS = [
  { kind: "passport", label: "Passport" },
  { kind: "transcript", label: "Transcript(s)" },
  { kind: "certificate", label: "Certificate(s)" },
  { kind: "photo", label: "Passport photo" },
  { kind: "financial", label: "Proof of funds" },
  { kind: "english_test", label: "English test" },
];

export interface AgentStudentDoc {
  kind: string;
  review_status: string;
}

/** Clickable student name in the agent portal → detail popout with document
 *  upload for that student. */
export function AgentStudentName({
  app,
  paymentLabel,
  docs,
}: {
  app: Application;
  paymentLabel: string;
  docs: AgentStudentDoc[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const have = new Set(docs.map((d) => d.kind));

  async function upload(kind: string, file: File) {
    setUploading(kind);
    try {
      const res = await createStudentDocUploadUrl(app.id, kind, file.name);
      if ("error" in res) return;
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(res.path, res.token, file);
      if (error) return;
      await recordStudentDoc(app.id, kind, res.path);
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-start font-medium text-ink hover:text-brand-red">
        {app.student_name}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inkbtn/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-card border border-border-warm bg-paper shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-border-warm px-5 py-4">
              <div>
                <p className="font-serif text-xl font-medium text-ink">{app.student_name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {app.target_institution ?? app.program_name ?? app.track}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-50">
                  <div className="h-full rounded-full bg-brand-red/80" style={{ width: `${stagePercent(app.stage, app.is_international, app.track)}%` }} />
                </div>
                <span className="inline-flex rounded bg-brand-red-bg px-2 py-0.5 text-[11px] font-medium text-brand-red">
                  {STAGE_LABEL[app.stage] ?? app.stage}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                <span>Payment: <span className="font-medium text-ink">{paymentLabel}</span></span>
                {app.next_action && <span>Next: {app.next_action}{app.next_action_due ? ` (${app.next_action_due})` : ""}</span>}
              </div>

              {/* Documents */}
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">Documents</p>
                <div className="grid grid-cols-2 gap-2">
                  {UPLOAD_KINDS.map((d) => {
                    const done = have.has(d.kind);
                    return (
                      <div key={d.kind}>
                        <button
                          type="button"
                          disabled={uploading === d.kind || pending}
                          onClick={() => inputs.current[d.kind]?.click()}
                          className={`flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium ${
                            done ? "border-status-present/40 bg-paper text-status-present" : "border-border-warm bg-paper text-ink hover:bg-cream-50"
                          }`}
                        >
                          {uploading === d.kind ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            : done ? <Check className="h-3.5 w-3.5" aria-hidden />
                            : <Upload className="h-3.5 w-3.5" aria-hidden />}
                          {d.label}
                        </button>
                        <input
                          ref={(el) => { inputs.current[d.kind] = el; }}
                          type="file"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(d.kind, f); e.target.value = ""; }}
                        />
                      </div>
                    );
                  })}
                </div>
                {docs.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1">
                    {docs.map((d, i) => (
                      <li key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-ink-soft">
                          <FileText className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                          {DOC_KIND_LABEL[d.kind] ?? d.kind}
                        </span>
                        <span className="text-[10px] uppercase text-ink-muted">{d.review_status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="border-t border-border-warm bg-cream-50/60 px-5 py-2.5 text-center text-[11px] text-ink-muted">
              Upload documents here — the PECSB team reviews them.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
