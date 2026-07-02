"use client";

import { forwardRef, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-md border bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand-red focus:ring-1 focus:ring-brand-red disabled:opacity-50";

function borderFor(error?: string) {
  return error ? "border-brand-red" : "border-border-warm";
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  /** When set, shows a small muted "optional" marker (already localized). */
  optionalLabel?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

/** Label + control + inline error, in the editorial style. */
export function Field({
  label,
  htmlFor,
  error,
  optionalLabel,
  hint,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between text-sm font-medium text-ink"
      >
        <span>{label}</span>
        {optionalLabel && (
          <span className="text-[11px] font-normal text-ink-muted">
            {optionalLabel}
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs leading-relaxed text-ink-muted">{hint}</p>
      )}
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export const TextInput = forwardRef<HTMLInputElement, InputProps>(
  function TextInput({ error, className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(controlBase, borderFor(error), className)}
        aria-invalid={!!error}
        {...rest}
      />
    );
  },
);

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  placeholder?: string;
  options: readonly { value: string; label: string }[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ error, className, placeholder, options, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(controlBase, borderFor(error), className)}
        aria-invalid={!!error}
        defaultValue=""
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  },
);

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ error, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={3}
        className={cn(controlBase, borderFor(error), "resize-y", className)}
        aria-invalid={!!error}
        {...rest}
      />
    );
  },
);

interface SegmentedProps {
  options: readonly { value: string; label: string }[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Single-select pill row (schedule, intake, yes/no). */
export function Segmented({ options, value, onChange, error }: SegmentedProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        error && "rounded-md ring-1 ring-brand-red/40 p-1",
      )}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md border px-3.5 py-2 text-sm transition-colors",
              active
                ? "border-brand-red bg-brand-red text-cream"
                : "border-border-warm bg-paper text-ink hover:bg-cream-50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface MultiChipProps {
  options: readonly { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

interface SearchOption {
  value: string;
  label: string;
  category?: string;
}

interface SearchableMultiSelectProps {
  options: readonly SearchOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
  /** Human labels for category keys, for section headers in the list. */
  groupLabels?: Record<string, string>;
}

/**
 * Searchable, grouped multi-select for long option sets (e.g. every Malaysian
 * university). Selected items show as removable chips; the list filters as you
 * type and is grouped by category.
 */
export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  error,
  groupLabels,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");

  const byValue = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    // group by category (preserving option order within group)
    const groups = new Map<string, SearchOption[]>();
    for (const o of list) {
      const key = o.category ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(o);
    }
    return [...groups.entries()];
  }, [options, query]);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-red-bg px-2.5 py-1 text-xs font-medium text-ink"
            >
              {byValue.get(v)?.label ?? v}
              <button
                type="button"
                onClick={() => toggle(v)}
                aria-label={`Remove ${byValue.get(v)?.label ?? v}`}
                className="text-brand-red hover:text-brand-red-soft"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={cn("rounded-md border bg-paper", borderFor(error))}>
        <div className="flex items-center gap-2 border-b border-border-warm px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-sm text-ink-muted">No matches.</p>
          )}
          {filtered.map(([group, items]) => (
            <div key={group}>
              {group && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                  {groupLabels?.[group] ?? group}
                </p>
              )}
              {items.map((o) => {
                const active = value.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-cream-50",
                      active ? "text-ink" : "text-ink-soft",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        active
                          ? "border-brand-red bg-brand-red text-cream"
                          : "border-border-warm",
                      )}
                    >
                      {active && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                    {o.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SearchableSelectProps {
  options: readonly { value: string; label: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

/** Single-select searchable dropdown (nationality, home country). */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  error,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : selected?.label ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={cn(controlBase, borderFor(error))}
        aria-invalid={!!error}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border-warm bg-paper py-1 shadow-sm">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink-muted">No matches.</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.value);
                setQuery("");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-cream-50",
                o.value === value ? "text-ink" : "text-ink-soft",
              )}
            >
              {o.label}
              {o.value === value && (
                <Check className="h-3.5 w-3.5 text-brand-red" aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Multi-select chips (short option sets). */
export function MultiChips({ options, value, onChange }: MultiChipProps) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
              active
                ? "border-brand-red bg-brand-red-bg text-ink"
                : "border-border-warm bg-paper text-ink hover:bg-cream-50",
            )}
          >
            {active && <Check className="h-3.5 w-3.5 text-brand-red" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
