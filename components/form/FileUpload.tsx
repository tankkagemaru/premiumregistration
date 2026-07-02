"use client";

import { useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES } from "@/lib/registration";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  chooseLabel: string;
  removeLabel: string;
  hint: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}

/** Editorial file picker. Client-side validates type + size; the actual upload
 *  happens after submit via a Storage signed URL. */
export function FileUpload({
  label,
  chooseLabel,
  removeLabel,
  hint,
  multiple = false,
  files,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(list: FileList | null) {
    if (!list) return;
    const valid = Array.from(list).filter(
      (f) => ALLOWED_DOC_TYPES.includes(f.type) && f.size <= MAX_DOC_BYTES,
    );
    onChange(multiple ? [...files, ...valid] : valid.slice(0, 1));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {files.map((f, i) => (
          <span
            key={`${f.name}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-red-bg px-2.5 py-1 text-xs font-medium text-ink"
          >
            <FileText className="h-3.5 w-3.5 text-brand-red" aria-hidden />
            {f.name}
            <button
              type="button"
              aria-label={removeLabel}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="text-brand-red hover:text-brand-red-soft"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50",
          )}
        >
          <Upload className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
          {chooseLabel}
        </button>
      </div>
      <p className="text-xs text-ink-muted">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_DOC_TYPES.join(",")}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
