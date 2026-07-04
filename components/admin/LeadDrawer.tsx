"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, MessageCircle, Mail } from "lucide-react";
import {
  LEAD_STATUSES,
  type Lead,
  type LeadEvent,
  type LeadDocument,
  type Staff,
} from "@/lib/admin/leads-shared";
import {
  updateLeadStatus,
  addLeadNote,
  setFollowUp,
  assignLead,
  updateDocReview,
  logLeadMessage,
} from "@/app/admin/actions";
import { createApplicationFromLead } from "@/app/admin/application-actions";
import { MessageComposer } from "@/components/admin/MessageComposer";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { toWhatsAppNumber } from "@/lib/phone";
import { COUNTRIES } from "@/lib/config/countries";
import { MALAYSIAN_INSTITUTIONS } from "@/lib/config/universities";
import { leadStaleness } from "@/lib/config/staleness";
import {
  ENGLISH_PROGRAMS,
  ENGLISH_PURPOSES,
  CEFR_LEVELS,
  ENGLISH_SCHEDULES,
  ENGLISH_EXAMS,
  HEADCOUNT_RANGES,
  TIMELINES,
} from "@/lib/config/programs";
import {
  QUALIFICATION_LEVELS,
  STUDY_MODES,
  EDUCATION_LEVELS,
  INTAKE_PREFERENCES,
} from "@/lib/config/universities";

type List = readonly { value: string; label: string }[];
const lbl = (list: List, v?: string) =>
  v ? list.find((o) => o.value === v)?.label ?? v : undefined;

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-muted">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}

export function LeadDrawer({
  data,
  staff,
  onClose,
  officerName,
}: {
  data: { lead: Lead; events: LeadEvent[]; documents: LeadDocument[] };
  staff: Staff[];
  onClose: () => void;
  officerName?: string;
}) {
  const { lead, events, documents } = data;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [action, setAction] = useState(lead.next_action ?? "");
  const [due, setDue] = useState(lead.next_action_due ?? "");

  const en = (lead.details?.english ?? {}) as Record<string, string>;
  const uni = (lead.details?.university ?? {}) as Record<string, string | string[]>;
  const co = (lead.details?.corporate ?? {}) as Record<string, string>;

  const waNumber = toWhatsAppNumber(lead.whatsapp || lead.phone);
  const waText = encodeURIComponent(
    `Hi ${lead.full_name.split(" ")[0]}, thank you for registering with Premium Language Centre.`,
  );

  const refresh = () => router.refresh();

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-inkbtn/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-cream shadow-lg">
        <div className="flex items-start justify-between border-b border-border-warm px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-ink">
              {lead.full_name}
            </h2>
            <p className="text-xs text-ink-muted">
              {new Date(lead.created_at).toISOString().slice(0, 10)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-muted hover:bg-cream-50 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
          {/* Stale-record warning (thresholds in config/staleness) */}
          {(() => {
            const s = leadStaleness(lead);
            if (s.level === "ok") return null;
            return (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  s.level === "alert"
                    ? "border-brand-red/40 bg-brand-red-bg text-brand-red"
                    : "border-brand-gold/40 bg-status-late-bg text-brand-gold"
                }`}
              >
                Needs attention — {s.reasons.join(" · ")}
              </div>
            );
          })()}

          {/* Status + quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            <select
              value={lead.status}
              disabled={pending}
              onChange={(e) =>
                start(async () => {
                  await updateLeadStatus(lead.id, e.target.value);
                  refresh();
                })
              }
              className="rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs text-ink outline-none"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
              >
                <MessageCircle className="h-3.5 w-3.5 text-status-present" aria-hidden />
                WhatsApp
              </a>
            )}
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-cream-50"
            >
              <Mail className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
              Email
            </a>
          </div>

          {/* Convert to application */}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await createApplicationFromLead(lead.id);
                router.push("/admin/applications");
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-inkbtn px-4 py-2.5 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft disabled:opacity-50"
          >
            Create application →
          </button>

          {/* Contact */}
          <div>
            <SectionLabel>Contact</SectionLabel>
            <Row k="Email" v={lead.email} />
            <Row k="Phone" v={lead.phone} />
            <Row
              k="Tracking code"
              v={
                lead.access_code ? (
                  <span className="font-mono">{lead.access_code}</span>
                ) : undefined
              }
            />
            <Row k="Passport / ID" v={lead.passport_no} />
            <Row k="WhatsApp" v={lead.whatsapp} />
            <Row k="Nationality" v={lbl(COUNTRIES, lead.nationality ?? undefined)} />
            <Row k="Interested in" v={lead.tracks.join(", ")} />
          </div>

          {/* Message the lead */}
          <div>
            <SectionLabel>Message</SectionLabel>
            <MessageComposer
              recipient={{
                name: lead.full_name,
                email: lead.email,
                phone: lead.whatsapp || lead.phone,
              }}
              vars={{
                full_name: lead.full_name,
                officer: officerName ?? "the Premium team",
                company: "Premium",
              }}
              context="lead"
              onSent={(channel, label) =>
                start(async () => {
                  await logLeadMessage(lead.id, channel, label);
                  refresh();
                })
              }
            />
          </div>

          {/* Track details */}
          {lead.tracks.includes("english") && (
            <div>
              <SectionLabel>English</SectionLabel>
              <Row k="Program" v={lbl(ENGLISH_PROGRAMS, en.program)} />
              <Row k="Purpose" v={lbl(ENGLISH_PURPOSES, en.learning_purpose)} />
              <Row
                k="Exams"
                v={(en.exam_interest as unknown as string[] | undefined)
                  ?.map((x) => lbl(ENGLISH_EXAMS, x))
                  .join(", ")}
              />
              <Row k="Level" v={lbl(CEFR_LEVELS, en.current_level)} />
              <Row k="Schedule" v={lbl(ENGLISH_SCHEDULES, en.preferred_schedule)} />
            </div>
          )}
          {lead.tracks.includes("university") && (
            <div>
              <SectionLabel>University</SectionLabel>
              <Row k="Home country" v={lbl(COUNTRIES, uni.home_country as string)} />
              <Row k="Current level" v={lbl(EDUCATION_LEVELS, uni.current_education_level as string)} />
              <Row k="Wants" v={lbl(QUALIFICATION_LEVELS, uni.intended_qualification as string)} />
              <Row k="Study mode" v={lbl(STUDY_MODES, uni.study_mode as string)} />
              <Row k="Field" v={uni.intended_field as string} />
              <Row
                k="Institutions"
                v={
                  uni.recommend_institution === "yes"
                    ? "Wants our recommendation"
                    : (uni.preferred_universities as string[] | undefined)
                        ?.map((u) => lbl(MALAYSIAN_INSTITUTIONS, u))
                        .join(", ")
                }
              />
              <Row k="Intake" v={lbl(INTAKE_PREFERENCES, uni.intake_preference as string)} />
            </div>
          )}
          {lead.tracks.includes("corporate") && (
            <div>
              <SectionLabel>Corporate</SectionLabel>
              <Row k="Company" v={co.company_name} />
              <Row k="Role" v={co.contact_role} />
              <Row k="Team size" v={lbl(HEADCOUNT_RANGES, co.headcount)} />
              <Row k="Need" v={co.training_need} />
              <Row k="Timeline" v={lbl(TIMELINES, co.preferred_timeline)} />
              <Row k="HRDF" v={co.hrdf_claimable} />
            </div>
          )}

          {/* Attribution */}
          <div>
            <SectionLabel>Source</SectionLabel>
            <Row k="UTM source" v={lead.utm_source} />
            <Row k="UTM medium" v={lead.utm_medium} />
            <Row k="Campaign" v={lead.utm_campaign} />
            <Row k="Referrer" v={lead.referrer} />
            <Row k="Agent" v={lead.agent_code} />
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <SectionLabel>Documents</SectionLabel>
              <div className="flex flex-col gap-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <a
                      href={`/api/admin/doc/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-red underline underline-offset-2"
                    >
                      {d.kind}
                    </a>
                    <select
                      value={d.review_status}
                      disabled={pending}
                      onChange={(e) =>
                        start(async () => {
                          await updateDocReview(lead.id, d.id, e.target.value);
                          refresh();
                        })
                      }
                      className="rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none"
                    >
                      <option value="pending">pending</option>
                      <option value="verified">verified</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner */}
          <div>
            <SectionLabel>Owner</SectionLabel>
            <select
              value={lead.assigned_to ?? ""}
              disabled={pending}
              onChange={(e) =>
                start(async () => {
                  await assignLead(lead.id, e.target.value || null);
                  refresh();
                })
              }
              className="w-full rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up */}
          <div>
            <SectionLabel>Follow-up</SectionLabel>
            <div className="flex flex-col gap-2">
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Next action"
                className="w-full rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="flex-1 rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red"
                />
                <button
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await setFollowUp(lead.id, action, due || null);
                      refresh();
                    })
                  }
                  className="rounded-md border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink hover:bg-cream-50 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Notes + timeline */}
          <div>
            <SectionLabel>Activity</SectionLabel>
            <div className="flex flex-col gap-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add an internal note…"
                className="w-full rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red"
              />
              <button
                disabled={pending || !note.trim()}
                onClick={() =>
                  start(async () => {
                    await addLeadNote(lead.id, note);
                    setNote("");
                    refresh();
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
