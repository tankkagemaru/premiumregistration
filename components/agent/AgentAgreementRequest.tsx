"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, X, FileText, Send } from "lucide-react";
import { AGENT_DOC_KINDS, type AgentDocument } from "@/lib/admin/agreements-shared";
import {
  requestAgreement,
  createAgentDocUploadUrl,
  recordAgentDoc,
} from "@/app/admin/agreement-actions";

const TONE: Record<string, string> = {
  pending: "bg-cream-50 text-ink-muted",
  verified: "bg-status-present/15 text-status-present",
  rejected: "bg-brand-red-bg text-brand-red",
};

/**
 * Due-diligence step of the agent-agreement flow: upload identity + business
 * documents, then request the agreement. Also shown while the request is under
 * review so the agent can replace a rejected document.
 */
export function AgentAgreementRequest({
  docs,
  requested,
}: {
  docs: AgentDocument[];
  /** true once an agreement request exists (status 'requested'). */
  requested: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const byKind = new Map(docs.map((d) => [d.kind, d] as const));
  const requiredMissing = AGENT_DOC_KINDS.filter(
    (k) => k.required && !byKind.has(k.kind),
  );

  async function upload(kind: string, file: File) {
    setUploading(kind);
    setErr(null);
    try {
      const res = await createAgentDocUploadUrl(kind, file.name);
      if ("error" in res) { setErr("Upload not available."); return; }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("registration-docs")
        .uploadToSignedUrl(res.path, res.token, file);
      if (error) { setErr("Upload failed. Try again."); return; }
      await recordAgentDoc(kind, res.path);
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  function request() {
    setErr(null);
    start(async () => {
      const r = await requestAgreement();
      if (!r.ok) {
        setErr(
          r.error === "already_exists"
            ? "An agreement is already in progress — PECSB will be in touch."
            : "Could not send the request — try again.",
        );
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-border-warm bg-paper p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        {requested ? "Documents under review" : "Become a recruitment partner"}
      </p>
      <p className="mb-4 text-sm text-ink-soft">
        {requested
          ? "Thank you — PECSB is reviewing your documents. Once verified, finance prepares your agreement and you'll sign it here. Replace any rejected document below."
          : "Before PECSB can issue your recruitment agreement, we need your identity and business documents for due diligence. Upload them, then request the agreement — finance verifies the documents and prepares your terms."}
      </p>

      <div className="flex flex-col gap-2">
        {AGENT_DOC_KINDS.map((k) => {
          const doc = byKind.get(k.kind);
          const status = doc?.review_status;
          return (
            <div
              key={k.kind}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-warm/70 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-ink">
                {doc ? (
                  status === "verified" ? (
                    <Check className="h-4 w-4 shrink-0 text-status-present" aria-hidden />
                  ) : status === "rejected" ? (
                    <X className="h-4 w-4 shrink-0 text-brand-red" aria-hidden />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                  )
                ) : (
                  <Upload className="h-4 w-4 shrink-0 text-ink-muted/60" aria-hidden />
                )}
                {k.label}
                {!k.required && <span className="text-[11px] text-ink-muted">(optional)</span>}
              </span>
              <span className="flex items-center gap-2">
                {doc && (
                  <>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${TONE[status ?? "pending"]}`}>
                      {status}
                    </span>
                    <a
                      href={`/api/agreement/agentdoc?id=${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand-red hover:underline"
                    >
                      View
                    </a>
                  </>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-cream-50">
                  {uploading === k.kind ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {doc ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(k.kind, f); e.target.value = ""; }}
                  />
                </label>
              </span>
            </div>
          );
        })}
      </div>

      {err && <p className="mt-3 text-xs text-brand-red">{err}</p>}

      {!requested && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            disabled={pending || requiredMissing.length > 0}
            onClick={request}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            {pending ? "Sending…" : "Request agreement"}
          </button>
          {requiredMissing.length > 0 && (
            <span className="text-xs text-ink-muted">
              Upload first: {requiredMissing.map((k) => k.label).join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
