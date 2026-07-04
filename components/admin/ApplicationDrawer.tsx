"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Circle } from "lucide-react";
import {
  STAGES,
  STAGE_DOCS,
  STAGE_LABEL,
  DOC_LABEL,
  stagesFor,
  stagePercent,
  type Application,
  type ApplicationEvent,
  type ApplicationDoc,
  type AppContact,
} from "@/lib/admin/applications-shared";
import {
  advanceApplicationStage,
  addApplicationNote,
  logApplicationMessage,
} from "@/app/admin/application-actions";
import { createVisaCase } from "@/app/admin/visa-actions";
import { MessageComposer } from "@/components/admin/MessageComposer";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { TRACKS } from "@/lib/config/tracks";
import {
  formatMoney,
  FEE_TYPE_LABEL,
  type Fee,
} from "@/lib/admin/finance-shared";
import { VISA_STAGE_LABEL, type VisaCase } from "@/lib/admin/visa-shared";
import { TEAM_LABEL, type ActionRequest } from "@/lib/admin/requests-shared";
import { RaiseRequest } from "@/components/admin/RequestControls";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-muted">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}

export function ApplicationDrawer({
  data,
  fees = [],
  visa = null,
  requests = [],
  role = "staff",
  officerName,
}: {
  data: {
    app: Application;
    events: ApplicationEvent[];
    documents: ApplicationDoc[];
    contact?: AppContact;
  };
  fees?: Fee[];
  visa?: VisaCase | null;
  requests?: ActionRequest[];
  role?: string;
  officerName?: string;
}) {
  const { app, events, documents, contact } = data;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");

  const close = () => router.push("/admin/applications");
  const applicable = stagesFor(app.is_international);
  const stageIdx = STAGES.findIndex((s) => s.id === app.stage);

  // Required documents up to and including the current stage.
  const required = STAGES.slice(0, stageIdx + 1).flatMap(
    (s) => STAGE_DOCS[s.id] ?? [],
  );
  const have = new Set(documents.map((d) => d.kind));
  const missing = [...new Set(required)].filter((k) => !have.has(k));

  const messageVars: Record<string, string> = {
    full_name: app.student_name,
    program: app.program_name ?? "",
    institution: app.target_institution ?? "",
    stage: STAGE_LABEL[app.stage] ?? app.stage,
    ref: app.access_code ?? "",
    missing_docs: missing.map((k) => `• ${DOC_LABEL[k] ?? k}`).join("\n"),
    officer: officerName ?? "the Premium team",
    company: "Premium",
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-inkbtn/30" onClick={close} aria-hidden />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-cream shadow-lg">
        <div className="flex items-start justify-between border-b border-border-warm px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-ink">
              {app.student_name}
            </h2>
            <p className="text-xs text-ink-muted">
              {app.target_institution ?? TRACK_TITLE[app.track] ?? app.track}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1 text-ink-muted hover:bg-cream-50 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
          {/* Stage control */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                app.is_international
                  ? "bg-brand-gold/20 text-brand-gold"
                  : "bg-cream-50 text-ink-muted"
              }`}
            >
              {app.is_international ? "International" : "Local"}
            </span>
            <select
              value={app.stage}
              disabled={pending}
              onChange={(e) =>
                start(async () => {
                  await advanceApplicationStage(app.id, e.target.value);
                  router.refresh();
                })
              }
              className="rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs text-ink outline-none"
            >
              {applicable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Progress ring */}
          <div className="flex justify-center py-2">
            <ProgressRing
              percent={stagePercent(app.stage, app.is_international)}
              flag={app.flag ?? "progress"}
              size={120}
              sublabel={STAGE_LABEL[app.stage]}
            />
          </div>

          {/* Application */}
          <div>
            <SectionLabel>Application</SectionLabel>
            <Row k="Track" v={TRACK_TITLE[app.track] ?? app.track} />
            <Row k="Target" v={app.target_institution} />
            <Row k="Program" v={app.program_name} />
            <Row k="Submitted by" v={app.submitted_by} />
            <Row k="Agent" v={app.agent_name} />
            <Row k="Stage" v={STAGE_LABEL[app.stage]} />
          </div>

          {/* Document checklist */}
          <div>
            <SectionLabel>Documents</SectionLabel>
            {required.length === 0 ? (
              <p className="text-sm text-ink-muted">None required yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {[...new Set(required)].map((kind) => {
                  const ok = have.has(kind);
                  return (
                    <li key={kind} className="flex items-center gap-2 text-sm">
                      {ok ? (
                        <Check className="h-4 w-4 text-status-present" aria-hidden />
                      ) : (
                        <Circle className="h-4 w-4 text-ink-muted" aria-hidden />
                      )}
                      <span className={ok ? "text-ink" : "text-ink-muted"}>
                        {kind}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Offer letter (English) */}
          {app.track === "english" && (
            <a
              href={`/api/offer?app=${app.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-inkbtn px-4 py-2.5 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft"
            >
              Generate offer letter →
            </a>
          )}

          {/* Fees */}
          {fees.length > 0 && (
            <div>
              <SectionLabel>Fees</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {fees.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">
                      {FEE_TYPE_LABEL[f.type]}
                      {f.label ? ` · ${f.label}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink tabular">
                        {formatMoney(f.amount, f.currency)}
                      </span>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          f.status === "paid"
                            ? "bg-status-present-bg text-status-present"
                            : f.status === "partial"
                              ? "bg-status-late-bg text-brand-gold"
                              : "bg-brand-red-bg text-brand-red"
                        }`}
                      >
                        {f.status}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visa */}
          {visa ? (
            <div>
              <SectionLabel>Visa / EMGS</SectionLabel>
              <Row k="Stage" v={VISA_STAGE_LABEL[visa.stage] ?? visa.stage} />
              <Row k="Filed by" v={visa.submitted_by === "pecsb" ? "PECSB" : "University"} />
              <Row k="EMGS ref" v={visa.emgs_ref} />
              <Row k="Medical" v={visa.medical_status} />
              <Row k="Pass expiry" v={visa.student_pass_expiry} />
              <a href={`/admin/visa?visa=${visa.id}`} className="mt-2 inline-flex text-xs font-medium text-brand-red hover:underline">
                Open visa case →
              </a>
            </div>
          ) : (
            app.is_international && (
              <div>
                <SectionLabel>Visa / EMGS</SectionLabel>
                <p className="mb-2 text-sm text-ink-muted">
                  No visa case yet. Start one to track EMGS / student pass:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => { await createVisaCase(app.id, "pecsb"); router.refresh(); })}
                    className="rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft disabled:opacity-50"
                  >
                    PECSB files
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => { await createVisaCase(app.id, "university"); router.refresh(); })}
                    className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50 disabled:opacity-50"
                  >
                    University files
                  </button>
                </div>
              </div>
            )
          )}

          {/* Cross-team requests */}
          <div>
            <SectionLabel>Team requests</SectionLabel>
            {requests.filter((r) => r.status === "open").length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {requests
                  .filter((r) => r.status === "open")
                  .map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-md border px-3 py-2 ${
                        r.type === "blocker"
                          ? "border-brand-red/50 bg-brand-red-bg/40"
                          : "border-border-warm bg-paper"
                      }`}
                    >
                      <p className="text-sm font-medium text-ink">{r.title}</p>
                      <p className="text-[11px] text-ink-muted">
                        {TEAM_LABEL[r.from_role] ?? r.from_role} →{" "}
                        {TEAM_LABEL[r.to_role] ?? r.to_role}
                        {r.due_date ? ` · due ${r.due_date}` : ""}
                      </p>
                    </div>
                  ))}
              </div>
            )}
            <RaiseRequest
              applicationId={app.id}
              subject={app.student_name}
              fromRole={role}
            />
          </div>

          {/* Message the student */}
          <div>
            <SectionLabel>Message</SectionLabel>
            <p className="mb-3 text-xs text-ink-muted">
              Pick a template, edit if needed, then send via WhatsApp or email.
            </p>
            <MessageComposer
              recipient={{
                name: app.student_name,
                email: contact?.email ?? app.student_email,
                phone: contact?.whatsapp ?? contact?.phone,
              }}
              vars={messageVars}
              context="application"
              team={role}
              onSent={(channel, label) =>
                start(async () => {
                  await logApplicationMessage(app.id, channel, label);
                  router.refresh();
                })
              }
            />
          </div>

          {/* Activity */}
          <div>
            <SectionLabel>Activity</SectionLabel>
            <div className="flex flex-col gap-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note…"
                className="w-full rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red"
              />
              <button
                disabled={pending || !note.trim()}
                onClick={() =>
                  start(async () => {
                    await addApplicationNote(app.id, note);
                    setNote("");
                    router.refresh();
                  })
                }
                className="self-start rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
              >
                Add note
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {events.map((ev) => (
                <div key={ev.id} className="border-l-2 border-border-warm pl-3">
                  <p className="text-sm text-ink">{ev.body ?? ev.type}</p>
                  <p className="text-[11px] text-ink-muted">
                    {ev.type} · {new Date(ev.created_at).toISOString().slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
