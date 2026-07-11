"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen, Paperclip, Eye } from "lucide-react";
import type { ApplicationEvent } from "@/lib/admin/applications-shared";
import { logWork } from "@/app/admin/application-actions";
import {
  createAppDocUploadUrl,
  recordApplicationDoc,
} from "@/app/admin/document-actions";
import { DocViewer } from "@/components/admin/DocViewer";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";
const BUCKET = "registration-docs";

/** What kind of work was done — admissions + visa share the same list. */
const ACTIVITIES = [
  "Contacted university",
  "University replied",
  "Submitted to university",
  "EMGS visit",
  "EMGS query received",
  "Called student",
  "WhatsApp sent",
  "Email sent",
  "Other",
];

/**
 * Log work done on an application/visa case — who did what, when. Entries land
 * on the application timeline so admissions, visa and admin all see the trail.
 * An entry can carry a proof attachment (a WhatsApp screenshot, a receipt) —
 * uploaded as an application document and linked back to the timeline row.
 */
export function WorkLog({
  applicationId,
  events,
  readOnly = false,
}: {
  applicationId: string;
  events?: ApplicationEvent[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [viewing, setViewing] = useState<{ id: string; label: string } | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const workEvents = (events ?? []).filter((e) => e.type === "work").slice(0, 8);

  async function submit() {
    // Upload the proof attachment first (if any), then log the entry linked to it.
    let attachmentDocId: string | undefined;
    if (file) {
      const signed = await createAppDocUploadUrl(applicationId, "worklog", file.name);
      if (!("error" in signed)) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(signed.path, signed.token, file);
        if (!error) {
          const rec = await recordApplicationDoc(applicationId, "worklog", signed.path);
          attachmentDocId = rec.id;
        }
      }
    }
    await logWork(applicationId, {
      activity,
      date: date || undefined,
      note: note || undefined,
      attachmentDocId,
    });
    setNote("");
    setDate("");
    setFile(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {workEvents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {workEvents.map((e) => (
            <div key={e.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">{e.body}</span>
              <span className="flex shrink-0 items-center gap-2">
                {e.attachment_doc_id && (
                  <button
                    type="button"
                    onClick={() =>
                      setViewing({ id: e.attachment_doc_id!, label: "Work log attachment" })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"
                  >
                    <Eye className="h-3 w-3" aria-hidden />
                    View
                  </button>
                )}
                <span className="font-mono text-xs text-ink-muted">
                  {String(e.created_at).slice(0, 10)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {readOnly ? (
        workEvents.length === 0 && <p className="text-xs text-ink-muted">No work logged yet.</p>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
        >
          <NotebookPen className="h-3.5 w-3.5" aria-hidden />
          Log work
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-border-warm bg-paper p-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className={F}>
              {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={F}
              aria-label="When it happened"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Detail — e.g. spoke to admissions office, awaiting offer"
            className={F}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              title={file ? file.name : "Attach proof (WhatsApp screenshot, receipt, …)"}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                file
                  ? "border-status-present/50 bg-status-present-bg text-status-present"
                  : "border-border-warm bg-cream-50 text-ink-muted hover:text-ink"
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              {file ? "Attachment ✓" : "Attach proof"}
            </button>
            {file && (
              <span className="min-w-0 truncate text-xs text-ink-muted">{file.name}</span>
            )}
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => start(submit)}
              className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              {pending ? "Logging…" : "Log entry"}
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

      {viewing && (
        <DocViewer
          docId={viewing.id}
          label={viewing.label}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
