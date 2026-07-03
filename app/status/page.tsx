"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { STAGES, stagesFor, type Flag } from "@/lib/admin/applications-shared";
import { cn } from "@/lib/utils";

interface Status {
  name: string;
  reference: string;
  track: string;
  program?: string;
  is_international: boolean;
  stage: string;
  flag: Flag;
  timeline: { label: string; date: string }[];
  next_step?: string;
}

export default function StatusPage() {
  const [passport, setPassport] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passport, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("No application found. Check your passport number and code.");
      } else {
        setStatus(data.status);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const stages = status ? stagesFor(status.is_international) : STAGES;
  const currentIdx = status
    ? stages.findIndex((s) => s.id === status.stage)
    : -1;
  const percent = status
    ? Math.round(((currentIdx + 1) / stages.length) * 100)
    : 0;

  return (
    <main className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-2xl px-6 py-14">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Application status
        </p>
        <h1 className="font-serif text-3xl font-medium leading-tight text-ink">
          Track your application.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Enter the passport number on your application and the reference code we
          sent you. Agents can check any of their students the same way.
        </p>

        <form
          onSubmit={submit}
          className="mt-7 flex flex-col gap-3 rounded-card border border-border-warm bg-paper p-5 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-medium text-ink">
            Passport number
            <input
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
              placeholder="A1234567"
              className="mt-1.5 w-full rounded-md border border-border-warm bg-cream-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
          </label>
          <label className="flex-1 text-sm font-medium text-ink">
            Reference code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="PECSB2026"
              className="mt-1.5 w-full rounded-md border border-border-warm bg-cream-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-brand-red px-6 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft disabled:opacity-60"
          >
            {busy ? "Checking…" : "Check"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-md border border-brand-red/40 bg-brand-red-bg px-4 py-2.5 text-sm text-brand-red">
            {error}
          </p>
        )}

        {status && (
          <div className="mt-8 rounded-card border border-border-warm bg-paper p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-2xl font-medium text-ink">
                Hello, {status.name}.
              </h2>
              <span className="font-mono text-xs text-ink-muted">
                Ref {status.reference}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {status.program ?? status.track}
            </p>

            {/* Progress ring — centered, coloured by health flag */}
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <ProgressRing
                percent={percent}
                flag={status.flag}
                size={144}
                sublabel="Complete"
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
                  Current stage
                </p>
                <p className="font-serif text-2xl font-medium text-ink">
                  {stages[currentIdx]?.label ?? "—"}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Step {currentIdx + 1} of {stages.length}
                </p>
              </div>
            </div>

            {/* Stepper */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-2 gap-y-3">
              {stages.map((s, i) => {
                const done = i < currentIdx;
                const current = i === currentIdx;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium",
                        done && "bg-status-present text-cream",
                        current && "bg-brand-red text-cream",
                        !done && !current && "border border-border-warm text-ink-muted",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        current ? "font-medium text-ink" : "text-ink-muted",
                      )}
                    >
                      {s.label}
                    </span>
                    {i < stages.length - 1 && (
                      <span className="mx-1 hidden h-px w-4 bg-border-warm sm:block" />
                    )}
                  </div>
                );
              })}
            </div>

            {status.next_step && (
              <div className="mt-6 rounded-md bg-cream-50 px-4 py-3 text-sm text-ink-soft">
                {status.next_step}
              </div>
            )}

            {status.timeline.length > 0 && (
              <div className="mt-6">
                <SectionLabel>History</SectionLabel>
                <div className="flex flex-col gap-2.5">
                  {status.timeline.map((t, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-ink">{t.label}</span>
                      <span className="font-mono text-xs text-ink-muted">{t.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
