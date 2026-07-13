"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { CONSOLE_STR, type ConsoleLang } from "@/lib/admin/console-i18n-shared";

export function AgentLink({ url, lang = "en" }: { url: string; lang?: ConsoleLang }) {
  const [copied, setCopied] = useState(false);
  const L = CONSOLE_STR[lang];

  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 overflow-x-auto rounded-md border border-border-warm bg-cream-50 px-3 py-2 font-mono text-xs text-ink">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-inkbtn px-3 py-2 text-xs font-medium text-oncolor transition-colors hover:bg-inkbtn-soft"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {copied ? L.ag_copied : L.ag_copy}
      </button>
    </div>
  );
}
