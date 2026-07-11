"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, ArrowRight, ChevronDown, Flag, BadgePercent } from "lucide-react";
import {
  stagesFor,
  stageLabel,
  stageOwner,
  type Application,
} from "@/lib/admin/applications-shared";
import { stageGate, type GateSignals, type GateMode } from "@/lib/admin/gates-shared";
import { TEAM_LABEL } from "@/lib/admin/requests-shared";
import {
  advanceApplicationStage,
  flagReadyForVisa,
} from "@/app/admin/application-actions";
import { waiveRegistration } from "@/app/admin/finance-actions";

const team = (r?: string) => (r ? TEAM_LABEL[r] ?? r : "—");

/**
 * The one place a team looks to know "what do I do next on this student". Shows
 * the current stage, who owns it, the exit-gate checklist, and the single
 * primary action — the guided replacement for the old free-form stage dropdown.
 * Non-owners see a read-only "waiting on …" line; admin keeps a manual override.
 */
export function NextStepPanel({
  app,
  role,
  gateMode,
  signals,
}: {
  app: Application;
  role: string;
  gateMode: GateMode;
  signals: GateSignals;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [override, setOverride] = useState(false);
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [waiveErr, setWaiveErr] = useState<string | null>(null);

  const list = stagesFor(Boolean(app.is_international), app.track);
  const idx = list.findIndex((s) => s.id === app.stage);
  const next = idx >= 0 ? list[idx + 1] : undefined;
  const owner = stageOwner(app.stage, app.track);
  const isOwner = role === "admin" || role === owner;
  const gate = stageGate(app.stage, signals);

  const blocked = gateMode === "hard" && !gate.met && role !== "admin";
  // Admissions/finance can waive registration (promo / scholarship) with a reason —
  // it clears the registration gate without a payment.
  const showWaive =
    app.stage === "registration" &&
    !signals.registrationPaid &&
    ["admin", "admissions", "finance"].includes(role);
  const showFlagReady =
    app.stage === "offer" &&
    app.is_international &&
    !app.ready_for_visa &&
    ["admin", "admissions"].includes(role);

  return (
    <div className="rounded-card border border-border-warm bg-paper p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Current step
          </p>
          <p className="font-serif text-lg text-ink">{stageLabel(app.stage, app.track)}</p>
        </div>
        <span className="shrink-0 rounded-md bg-cream-50 px-2 py-1 text-[11px] font-medium text-ink-soft">
          {team(owner)}
        </span>
      </div>

      {/* Exit-gate checklist */}
      {gate.items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {gate.items.map((it) => (
            <li key={it.label} className="flex items-center gap-2 text-sm">
              {it.met ? (
                <Check className="h-4 w-4 shrink-0 text-status-present" aria-hidden />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              )}
              <span className={it.met ? "text-ink" : "text-ink-soft"}>
                {it.label}
                {!it.hard && (
                  <span className="ml-1 text-[10px] uppercase text-ink-muted">optional</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Waive registration (promo / scholarship) — clears the gate with a reason */}
      {showWaive && (
        <div className="mt-3">
          {!waiveOpen ? (
            <button
              type="button"
              onClick={() => { setWaiveOpen(true); setWaiveErr(null); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-gold hover:underline"
            >
              <BadgePercent className="h-3.5 w-3.5" aria-hidden />
              Waive registration (promo)
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-md border border-brand-gold/30 bg-brand-gold/5 p-2.5">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (e.g. agent promo, scholarship) — required"
                className="rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red"
              />
              {waiveErr && <p className="text-xs text-brand-red">{waiveErr}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await waiveRegistration(app.id, reason);
                      if (!res.ok) { setWaiveErr(res.error ?? "Failed."); return; }
                      setWaiveOpen(false); setReason(""); router.refresh();
                    })
                  }
                  className="rounded-md bg-brand-gold px-3 py-1.5 text-xs font-medium text-oncolor hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Waiving…" : "Waive registration"}
                </button>
                <button
                  type="button"
                  onClick={() => { setWaiveOpen(false); setWaiveErr(null); }}
                  className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isOwner ? (
        <div className="mt-4 flex flex-col gap-2">
          {showFlagReady && (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => { await flagReadyForVisa(app.id); router.refresh(); })}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-brand-red/40 bg-brand-red-bg px-3 py-2 text-sm font-medium text-brand-red hover:bg-brand-red-bg/70 disabled:opacity-50"
            >
              <Flag className="h-4 w-4" aria-hidden />
              Flag ready for visa
            </button>
          )}
          {next ? (
            <>
              <button
                type="button"
                disabled={pending || blocked}
                onClick={() => start(async () => { await advanceApplicationStage(app.id, next.id); router.refresh(); })}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-inkbtn px-3 py-2 text-sm font-medium text-oncolor hover:bg-inkbtn-soft disabled:opacity-50"
              >
                Advance to {stageLabel(next.id, app.track)}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              {!gate.met && (
                <p className={`text-xs ${blocked ? "text-brand-red" : "text-brand-gold"}`}>
                  {blocked
                    ? `Blocked — first: ${gate.reason}`
                    : `⚠ ${gate.reason} not done — advancing anyway (soft mode)`}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-muted">Final stage — nothing to hand off.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">
          With <span className="font-medium text-ink">{team(owner)}</span>
          {gate.reason ? ` — waiting on: ${gate.reason}` : " — in progress"}.
        </p>
      )}

      {/* Admin manual override — jump to any stage regardless of gates */}
      {role === "admin" && (
        <div className="mt-3 border-t border-border-warm pt-2">
          <button
            type="button"
            onClick={() => setOverride((o) => !o)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-ink"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${override ? "rotate-180" : ""}`} aria-hidden />
            Override stage
          </button>
          {override && (
            <select
              value={app.stage}
              disabled={pending}
              onChange={(e) => start(async () => { await advanceApplicationStage(app.id, e.target.value); router.refresh(); })}
              className="mt-2 w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-xs text-ink outline-none"
            >
              {list.map((s) => (
                <option key={s.id} value={s.id}>{stageLabel(s.id, app.track)}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
