"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Circle } from "lucide-react";
import {
  STAGES,
  STAGE_DOCS,
  STAGE_LABEL,
  stagesFor,
  type Application,
  type ApplicationEvent,
  type ApplicationDoc,
} from "@/lib/admin/applications-shared";
import {
  advanceApplicationStage,
  addApplicationNote,
} from "@/app/admin/application-actions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TRACKS } from "@/lib/config/tracks";

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
}: {
  data: { app: Application; events: ApplicationEvent[]; documents: ApplicationDoc[] };
}) {
  const { app, events, documents } = data;
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

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/30" onClick={close} aria-hidden />
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

          {/* Module summaries (built out in Phases B–E) */}
          <div className="grid grid-cols-3 gap-2">
            {["Offer", "Fees", "Visa"].map((m) => (
              <div
                key={m}
                className="rounded-md border border-dashed border-border-warm bg-paper px-3 py-2.5 text-center"
              >
                <p className="text-xs font-medium text-ink">{m}</p>
                <p className="text-[10px] text-ink-muted">soon</p>
              </div>
            ))}
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
                className="self-start rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-cream hover:bg-brand-red-soft disabled:opacity-50"
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
