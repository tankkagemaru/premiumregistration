import type { StudentRecord } from "@/lib/admin/students";
import { STAGE_LABEL } from "@/lib/admin/applications-shared";
import { formatMoney, FEE_TYPE_LABEL, paidTowards, type FeeType } from "@/lib/admin/finance-shared";
import { DOC_KIND_LABEL } from "@/lib/config/documents";
import { VISA_STAGE_LABEL } from "@/lib/admin/visa-shared";
import { TRACKS } from "@/lib/config/tracks";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));
const d = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : "—");

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex justify-between gap-6 py-1 text-sm">
      <span className="text-ink-muted">{k}</span>
      <span className="text-end font-medium text-ink">{v}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <p className="mb-2 border-b border-border-warm pb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        {title}
      </p>
      {children}
    </section>
  );
}

/** Full student record — shared by the console page and the printable report.
 *  `detailed` = include the full activity timeline / work log (the "detailed"
 *  report); summary omits it. */
export function StudentRecordView({
  record,
  detailed = true,
}: {
  record: StudentRecord;
  detailed?: boolean;
}) {
  const { student: s, applications, documents, events, fees, payments, commissions, visas } = record;

  return (
    <div className="flex flex-col gap-6">
      <Section title="Student">
        <div className="grid gap-x-10 sm:grid-cols-2">
          <div>
            <Row k="Full name" v={s.full_name} />
            <Row k="Email" v={s.email} />
            <Row k="Phone" v={s.phone} />
            <Row k="WhatsApp" v={s.whatsapp} />
            <Row k="Nationality" v={s.nationality?.toUpperCase()} />
          </div>
          <div>
            <Row k="Passport / ID" v={s.passport_no} />
            <Row k="Date of birth" v={d(s.date_of_birth)} />
            <Row k="Residency" v={s.is_international ? "International" : "Local"} />
            <Row k="Agent code" v={s.agent_code} />
            <Row k="Guardian" v={s.guardian?.full_name} />
            <Row k="On record since" v={d(s.created_at)} />
          </div>
        </div>
      </Section>

      <Section title={`Applications (${applications.length})`}>
        <div className="flex flex-col gap-3">
          {applications.map((a) => (
            <div key={a.id} className="rounded-md border border-border-warm bg-paper p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  {TRACK_TITLE[a.track] ?? a.track}
                  {a.program_name ? ` — ${a.program_name}` : ""}
                </p>
                <span className="font-mono text-[11px] text-ink-muted">
                  {a.access_code ?? a.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <Row k="Institution" v={a.target_institution} />
              <Row k="Stage" v={STAGE_LABEL[a.stage] ?? a.stage} />
              <Row k="Intake" v={a.intake} />
              <Row k="Class dates" v={a.class_start ? `${d(a.class_start)} → ${d(a.class_end)}` : undefined} />
              <Row k="Offer acknowledged" v={a.offer_acknowledged_at ? d(a.offer_acknowledged_at) : undefined} />
              <Row k="Opened" v={d(a.created_at)} />
            </div>
          ))}
          {applications.length === 0 && (
            <p className="text-sm text-ink-muted">No applications yet.</p>
          )}
        </div>
      </Section>

      {documents.length > 0 && (
        <Section title={`Documents (${documents.length})`}>
          {documents.map((doc) => (
            <div key={doc.id} className="flex justify-between py-1 text-sm">
              <span className="text-ink">{DOC_KIND_LABEL[doc.kind] ?? doc.kind}</span>
              <span className="text-xs uppercase text-ink-muted">{doc.review_status}</span>
            </div>
          ))}
        </Section>
      )}

      {visas.length > 0 && (
        <Section title="Visa">
          {visas.map((v) => (
            <div key={v.id}>
              <Row k="Stage" v={VISA_STAGE_LABEL[v.stage] ?? v.stage} />
              <Row k="EMGS ref" v={v.emgs_ref} />
              <Row k="Student pass expiry" v={d(v.student_pass_expiry)} />
            </div>
          ))}
        </Section>
      )}

      {fees.length > 0 && (
        <Section title="Fees & payments">
          {fees.map((f) => (
            <div key={f.id} className="flex justify-between py-1 text-sm">
              <span className="text-ink">
                {FEE_TYPE_LABEL[f.type as FeeType] ?? f.type}
                {f.label ? ` · ${f.label}` : ""}
              </span>
              <span className="font-mono text-xs text-ink tabular">
                {formatMoney(paidTowards(f, payments), f.currency)} / {formatMoney(f.amount, f.currency)} · {f.status}
              </span>
            </div>
          ))}
          {commissions.length > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              {commissions.length} commission record(s) attached — see Finance.
            </p>
          )}
        </Section>
      )}

      {detailed && events.length > 0 && (
        <Section title="Timeline &amp; work log">
          {events.map((e) => (
            <div key={e.id} className="flex justify-between gap-4 py-1 text-sm">
              <span className="min-w-0 text-ink">{e.body ?? e.type}</span>
              <span className="shrink-0 font-mono text-xs text-ink-muted">{d(e.created_at)}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
