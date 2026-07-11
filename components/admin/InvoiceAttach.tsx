"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Paperclip, Loader2 } from "lucide-react";
import {
  createAppDocUploadUrl,
  recordApplicationDoc,
} from "@/app/admin/document-actions";
import { setFeeInvoice } from "@/app/admin/billables-actions";
import { DocViewer } from "@/components/admin/DocViewer";

const BUCKET = "registration-docs";

/**
 * Attach / open the third-party (QuickBooks) invoice for a fee. Stored as an
 * `invoice` document on the application and linked to the fee, so admissions
 * and marketing can open it and send it on.
 */
export function InvoiceAttach({
  feeId,
  applicationId,
  invoiceDocId,
}: {
  feeId: string;
  applicationId: string;
  invoiceDocId?: string | null;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const signed = await createAppDocUploadUrl(applicationId, "invoice", file.name);
      if ("error" in signed) return;
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(signed.path, signed.token, file);
      if (error) return;
      const rec = await recordApplicationDoc(applicationId, "invoice", signed.path);
      if (rec.id) await setFeeInvoice(feeId, rec.id);
      start(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      {invoiceDocId ? (
        <button
          type="button"
          onClick={() => setViewing(true)}
          title="Open invoice"
          className="inline-flex items-center gap-1 rounded-md border border-status-present/50 bg-status-present-bg px-2 py-1 text-[11px] font-medium text-status-present hover:opacity-80"
        >
          <FileText className="h-3 w-3" aria-hidden /> Invoice
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          title="Attach QuickBooks invoice"
          className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-paper px-2 py-1 text-[11px] font-medium text-ink-muted hover:text-ink disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Paperclip className="h-3 w-3" aria-hidden />
          )}
          Invoice
        </button>
      )}
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {viewing && invoiceDocId && (
        <DocViewer docId={invoiceDocId} label="Invoice" onClose={() => setViewing(false)} />
      )}
    </span>
  );
}
