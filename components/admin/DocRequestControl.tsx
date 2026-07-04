"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { AppDocRequest } from "@/lib/admin/applications-shared";
import {
  createAppDocRequest,
  deleteAppDocRequest,
} from "@/app/admin/doc-request-actions";

/**
 * Request a one-off document from this student (an EMGS oddity, a missing
 * attestation…). The request joins the staff checklist AND the student's
 * status-page checklist, so they can upload it themselves.
 */
export function DocRequestControl({
  applicationId,
  requests,
}: {
  applicationId: string;
  requests: AppDocRequest[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="mt-2">
      {requests.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {requests.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 rounded-full border border-brand-gold/40 bg-status-late-bg px-2 py-0.5 text-[11px] text-brand-gold"
            >
              {r.label}
              <button
                onClick={() => start(async () => { await deleteAppDocRequest(r.id); router.refresh(); })}
                aria-label={`Remove request ${r.label}`}
                className="hover:text-brand-red"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-brand-red hover:underline"
        >
          + Request an extra document
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-border-warm bg-paper p-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Document name — e.g. Attested birth certificate"
            className="rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for the student (optional)"
            className="rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red"
          />
          <div className="flex gap-2">
            <button
              disabled={pending || !label.trim()}
              onClick={() =>
                start(async () => {
                  await createAppDocRequest({ applicationId, label, note: note || undefined });
                  setLabel("");
                  setNote("");
                  setOpen(false);
                  router.refresh();
                })
              }
              className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              {pending ? "Requesting…" : "Request"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
