"use client";

import { useEffect } from "react";
import { X, Download, ExternalLink } from "lucide-react";

/**
 * In-app document viewer — a float window over the console rather than a new
 * browser tab. Embeds the audited `/api/admin/appdoc/[id]` route (which redirects
 * to a short-lived signed URL) in an iframe, so PDFs and images render inline.
 * Keeps download + open-in-new-tab as fallbacks for anything the browser can't
 * preview.
 */
export function DocViewer({
  docId,
  label,
  onClose,
}: {
  docId: string;
  label: string;
  onClose: () => void;
}) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = `/api/admin/appdoc/${docId}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-inkbtn/40 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-card border border-border-warm bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-warm px-4 py-2.5">
          <p className="min-w-0 truncate text-sm font-medium text-ink">{label}</p>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`${src}?dl=1`}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-cream-50 hover:text-ink"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download
            </a>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-cream-50 hover:text-ink"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              New tab
            </a>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-ink-muted hover:bg-cream-50 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <iframe
          src={src}
          title={label}
          className="h-full w-full flex-1 bg-cream-50"
        />
      </div>
    </div>
  );
}
