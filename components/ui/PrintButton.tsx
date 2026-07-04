"use client";

import { Printer } from "lucide-react";

/** Browser print — the print dialog's "Save as PDF" is the export path. */
export function PrintButton({ label = "Print / save PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-inkbtn px-4 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
