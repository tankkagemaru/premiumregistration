"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, Loader2 } from "lucide-react";
import { createClaimUploadUrl, recordClaimInvoice } from "@/app/agent/actions";

const BUCKET = "registration-docs";

/**
 * Agent uploads their commission claim invoice — only shown once finance has
 * opened the commission for claiming. Uploads straight to Storage via a signed
 * URL, then records it (→ commission status 'invoiced').
 */
export function ClaimInvoiceUpload({
  commissionId,
  claimReady,
  submitted,
}: {
  commissionId: string;
  claimReady: boolean;
  submitted: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-present">
        <Check className="h-3 w-3" aria-hidden /> Claim invoice submitted
      </span>
    );
  }
  if (!claimReady) {
    return <span className="text-[11px] text-ink-muted">Claim opens once approved</span>;
  }

  function upload(file: File) {
    setError(null);
    start(async () => {
      const res = await createClaimUploadUrl(commissionId, file.name);
      if ("error" in res) { setError("Upload not available."); return; }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(res.path, res.token, file);
      if (upErr) { setError("Upload failed. Try again."); return; }
      await recordClaimInvoice(commissionId, res.path);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        className="inline-flex w-fit items-center gap-1 rounded-md border border-brand-red/40 bg-brand-red-bg px-2 py-1 text-[11px] font-medium text-brand-red hover:bg-brand-red-bg/70 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Upload className="h-3 w-3" aria-hidden />}
        Upload claim invoice
      </button>
      {error && <span className="text-[10px] text-brand-red">{error}</span>}
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
    </div>
  );
}
