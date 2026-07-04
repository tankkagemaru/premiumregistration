"use client";

import { useState } from "react";
import { Check, Upload, Loader2, Download } from "lucide-react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { STAGES, stagesFor, type Flag } from "@/lib/admin/applications-shared";
import type { DocRequirement } from "@/lib/config/documents";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface Status {
  name: string;
  reference: string;
  track: string;
  program?: string;
  qualification?: string | null;
  is_international: boolean;
  stage: string;
  flag: Flag;
  timeline: { label: string; date: string }[];
  next_step?: string;
  documents: { kind: string; review_status: string }[];
  requirements: DocRequirement[];
  offer?: { available: boolean; acknowledgedAt: string | null };
  plan?: {
    intake?: string;
    summary?: string;
    steps: { title: string; start?: string; end?: string; note?: string }[];
  } | null;
  isLead?: boolean;
}

export default function StatusPage() {
  const { t } = useI18n();
  const [passport, setPassport] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);

  async function offerAction(action: "sign" | "ack") {
    setOfferBusy(true);
    try {
      const res = await fetch("/api/status/offer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passport, code, action }),
      });
      const data = await res.json();
      if (!data.ok) return;
      if (action === "sign" && data.url) window.open(data.url, "_blank");
      if (action === "ack") await load(false);
    } finally {
      setOfferBusy(false);
    }
  }

  async function load(clear: boolean) {
    if (clear) {
      setBusy(true);
      setError(null);
      setStatus(null);
    }
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passport, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (clear) setError(t("status.errNotFound"));
      } else {
        setStatus(data.status);
      }
    } catch {
      if (clear) setError(t("status.errGeneric"));
    } finally {
      if (clear) setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    load(true);
  }

  async function uploadDoc(kind: string, file: File) {
    setUploading(kind);
    try {
      const signRes = await fetch("/api/status/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passport, code, action: "sign", kind, filename: file.name }),
      });
      const sign = await signRes.json();
      if (!sign.ok) return;
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("registration-docs")
        .uploadToSignedUrl(sign.path, sign.token, file);
      if (upErr) return;
      await fetch("/api/status/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passport, code, action: "confirm", kind, path: sign.path }),
      });
      await load(false);
    } finally {
      setUploading(null);
    }
  }

  const stageLabel = (id?: string) =>
    id ? t(`statusStages.${id}`) : "—";

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
          {t("status.kicker")}
        </p>
        <h1 className="font-serif text-3xl font-medium leading-tight text-ink">
          {t("status.title")}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          {t("status.sub")}
        </p>

        <form
          onSubmit={submit}
          className="mt-7 flex flex-col gap-3 rounded-card border border-border-warm bg-paper p-5 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-medium text-ink">
            {t("status.passportLabel")}
            <input
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
              placeholder={t("status.passportPh")}
              className="mt-1.5 w-full rounded-md border border-border-warm bg-cream-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
          </label>
          <label className="flex-1 text-sm font-medium text-ink">
            {t("status.codeLabel")}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("status.codePh")}
              className="mt-1.5 w-full rounded-md border border-border-warm bg-cream-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-brand-red px-6 py-2.5 text-sm font-medium text-oncolor transition-colors hover:bg-brand-red-soft disabled:opacity-60"
          >
            {busy ? t("status.checking") : t("status.check")}
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
                {t("status.hello", { name: status.name })}
              </h2>
              <span className="font-mono text-xs text-ink-muted">
                {t("status.ref", { ref: status.reference })}
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
                sublabel={t("status.complete")}
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
                  {t("status.currentStage")}
                </p>
                <p className="font-serif text-2xl font-medium text-ink">
                  {stageLabel(stages[currentIdx]?.id)}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  {t("status.stepOf", {
                    n: currentIdx + 1,
                    total: stages.length,
                  })}
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
                        done && "bg-status-present text-oncolor",
                        current && "bg-brand-red text-oncolor",
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
                      {stageLabel(s.id)}
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

            {/* Offer letter — download + acknowledge */}
            {status.offer?.available && (
              <div className="mt-6 rounded-md border border-brand-red/30 bg-brand-red/5 p-4">
                <SectionLabel>{t("status.offerTitle")}</SectionLabel>
                <p className="mb-3 text-sm text-ink-soft">{t("status.offerSub")}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => offerAction("sign")}
                    disabled={offerBusy}
                    className="inline-flex items-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-60"
                  >
                    {offerBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden />
                    )}
                    {t("status.offerDownload")}
                  </button>
                  {status.offer.acknowledgedAt ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-status-present">
                      <Check className="h-4 w-4" aria-hidden />
                      {t("status.offerAcked", {
                        date: status.offer.acknowledgedAt.slice(0, 10),
                      })}
                    </span>
                  ) : (
                    <button
                      onClick={() => offerAction("ack")}
                      disabled={offerBusy}
                      className="rounded-md border border-border-warm bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-cream-50 disabled:opacity-60"
                    >
                      {t("status.offerAck")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Study plan */}
            {status.plan && status.plan.steps.length > 0 && (
              <div className="mt-6">
                <SectionLabel>{t("status.planTitle")}</SectionLabel>
                {status.plan.intake && (
                  <p className="mb-2 text-sm text-ink-soft">
                    {t("status.planIntake", { intake: status.plan.intake })}
                  </p>
                )}
                {status.plan.summary && (
                  <p className="mb-3 text-sm text-ink-soft">{status.plan.summary}</p>
                )}
                <ol className="flex flex-col gap-2">
                  {status.plan.steps.map((sp, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red text-[11px] font-medium text-oncolor">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-ink">{sp.title}</p>
                        <p className="text-xs text-ink-muted">
                          {[sp.start, sp.end].filter(Boolean).join(" → ")}
                          {sp.note ? ` · ${sp.note}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Documents — student self-upload (once an application exists) */}
            {!status.isLead && (
            <div className="mt-6">
              <SectionLabel>{t("status.docsTitle")}</SectionLabel>
              <p className="mb-3 text-sm text-ink-soft">{t("status.docsSub")}</p>
              <ul className="flex flex-col divide-y divide-border-warm/50">
                {status.requirements.map((r) => {
                  const d = status.documents.find((x) => x.kind === r.kind);
                  const reviewLabel =
                    d?.review_status === "verified"
                      ? t("status.docVerified")
                      : d?.review_status === "rejected"
                        ? t("status.docRejected")
                        : t("status.docPending");
                  return (
                    <li key={r.kind} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      {d ? (
                        <Check className="h-4 w-4 shrink-0 text-status-present" aria-hidden />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border border-ink-muted" />
                      )}
                      <span className={d ? "text-ink" : "text-ink-muted"}>
                        {r.label}
                        {r.optional && (
                          <span className="ml-1 text-[10px] uppercase text-ink-muted">optional</span>
                        )}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        {d && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium",
                              d.review_status === "verified" && "bg-status-present-bg text-status-present",
                              d.review_status === "rejected" && "bg-brand-red-bg text-brand-red",
                              d.review_status === "pending" && "bg-cream-50 text-ink-muted",
                            )}
                          >
                            {reviewLabel}
                          </span>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border-warm bg-paper px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-cream-50">
                          {uploading === r.kind ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Upload className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {d ? t("status.replace") : t("status.upload")}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadDoc(r.kind, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            )}

            {status.timeline.length > 0 && (
              <div className="mt-6">
                <SectionLabel>{t("status.history")}</SectionLabel>
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
