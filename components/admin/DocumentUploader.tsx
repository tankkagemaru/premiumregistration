"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, Circle, Download, Trash2, Loader2 } from "lucide-react";
import type { DocRequirement } from "@/lib/config/documents";
import { DOC_KIND_LABEL } from "@/lib/config/documents";
import type { ApplicationDoc } from "@/lib/admin/applications-shared";
import {
  createAppDocUploadUrl,
  recordApplicationDoc,
  setAppDocReview,
  deleteApplicationDoc,
} from "@/app/admin/document-actions";

const BUCKET = "registration-docs";
const REVIEW = ["pending", "verified", "rejected"];
const REVIEW_TONE: Record<string, string> = {
  pending: "bg-cream-50 text-ink-muted",
  verified: "bg-status-present/15 text-status-present",
  rejected: "bg-brand-red-bg text-brand-red",
};

export function DocumentUploader({
  applicationId,
  requirements,
  docs,
}: {
  applicationId: string;
  requirements: DocRequirement[];
  docs: ApplicationDoc[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const byKind = (kind: string) => docs.filter((d) => d.kind === kind);
  const reqKinds = new Set(requirements.map((r) => r.kind));
  const extras = docs.filter((d) => !reqKinds.has(d.kind));

  async function upload(kind: string, file: File) {
    setError(null);
    setUploading(kind);
    try {
      const res = await createAppDocUploadUrl(applicationId, kind, file.name);
      if ("error" in res) {
        setError(res.error === "forbidden" ? "You can't upload here." : "Upload failed.");
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(res.path, res.token, file);
      if (upErr) {
        setError("Upload failed. Try again.");
        return;
      }
      await recordApplicationDoc(applicationId, kind, res.path);
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  function DocRow({
    kind,
    label,
    optional,
    note,
  }: {
    kind: string;
    label: string;
    optional?: boolean;
    note?: string;
  }) {
    const items = byKind(kind);
    const has = items.length > 0;
    return (
      <li className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
        {has ? (
          <Check className="h-4 w-4 shrink-0 text-status-present" aria-hidden />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        )}
        <span className={has ? "text-ink" : "text-ink-muted"}>
          {label}
          {optional && <span className="ml-1 text-[10px] uppercase text-ink-muted">optional</span>}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {items.map((d) => (
            <span key={d.id} className="flex items-center gap-1">
              <a
                href={`/api/admin/appdoc/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1 text-ink-muted hover:bg-cream-50 hover:text-ink"
                aria-label="Download"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
              </a>
              <select
                value={d.review_status}
                disabled={pending}
                onChange={(e) => start(async () => { await setAppDocReview(d.id, e.target.value); router.refresh(); })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${REVIEW_TONE[d.review_status] ?? ""}`}
              >
                {REVIEW.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                onClick={() => start(async () => { await deleteApplicationDoc(d.id); router.refresh(); })}
                aria-label="Delete"
                className="rounded p-1 text-ink-muted hover:text-brand-red"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => inputs.current[kind]?.click()}
            disabled={uploading === kind}
            className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-paper px-2 py-1 text-xs font-medium text-ink hover:bg-cream-50 disabled:opacity-50"
          >
            {uploading === kind ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-3.5 w-3.5" aria-hidden />
            )}
            {has ? "Add" : "Upload"}
          </button>
          <input
            ref={(el) => { inputs.current[kind] = el; }}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(kind, f);
              e.target.value = "";
            }}
          />
        </div>
        {note && <p className="w-full pl-6 text-[11px] text-ink-muted">{note}</p>}
      </li>
    );
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-border-warm/50">
        {requirements.map((r) => (
          <DocRow key={r.kind} kind={r.kind} label={r.label} optional={r.optional} note={r.note} />
        ))}
        {extras.map((d) => (
          <DocRow key={d.kind} kind={d.kind} label={DOC_KIND_LABEL[d.kind] ?? d.kind} />
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
    </div>
  );
}
