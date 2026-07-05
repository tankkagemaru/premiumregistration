import { requireRole } from "@/lib/auth";
import {
  ArrowRight,
  CornerDownRight,
  Mail,
  FileText,
  HelpCircle,
  CheckCircle2,
  Flag,
} from "lucide-react";

/* ---------- flowchart primitives (static, brand-tokened) ---------- */

const VARIANT: Record<string, string> = {
  start: "bg-brand-red text-oncolor border-brand-red",
  step: "bg-paper text-ink border-border-warm",
  io: "bg-cream-50 text-ink border-border-warm",
  optional: "border-dashed bg-paper text-ink-soft border-border-warm",
  decision: "bg-status-late-bg text-ink border-brand-gold/70",
  done: "bg-status-present-bg text-status-present border-status-present/40",
};

function Actor({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-block rounded bg-cream-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {children}
    </span>
  );
}

function Node({
  variant = "step",
  title,
  sub,
  actor,
  icon: Icon,
}: {
  variant?: keyof typeof VARIANT;
  title: string;
  sub?: string;
  actor?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={`inline-flex max-w-[280px] flex-col rounded-lg border px-3 py-2 ${VARIANT[variant]}`}>
      <span className="flex items-start gap-1.5 text-sm font-medium leading-tight">
        {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        <span>
          {title}
          {actor && <Actor>{actor}</Actor>}
        </span>
      </span>
      {sub && <span className="mt-0.5 text-[11px] leading-snug opacity-80">{sub}</span>}
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-ink-muted">
      {label && (
        <span className="rounded bg-cream-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </span>
      )}
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function Branch({
  answer,
  tone = "info",
  children,
}: {
  answer: string;
  tone?: "yes" | "no" | "info";
  children: React.ReactNode;
}) {
  const t =
    tone === "yes"
      ? "text-status-present"
      : tone === "no"
        ? "text-brand-red"
        : "text-ink-soft";
  return (
    <div className="mt-2 flex gap-2 pl-3">
      <CornerDownRight className={`mt-1 h-4 w-4 shrink-0 ${t}`} />
      <div className="min-w-0">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${t}`}>{answer}</span>
        <div className="mt-1.5 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

function Down() {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1" aria-hidden>
      <span className="h-5 w-px bg-brand-red/40" />
      <span className="text-xs leading-none text-brand-red/70">▼</span>
    </div>
  );
}

function Phase({
  n,
  title,
  actors,
  children,
}: {
  n: string;
  title: string;
  actors?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border-warm bg-paper/40 p-5">
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-brand-red/30 bg-brand-red-bg font-mono text-xs tracking-[0.18em] text-brand-red">
          {n}
        </span>
        <h2 className="font-serif text-xl font-medium text-ink">{title}</h2>
        {actors && (
          <span className="ms-auto text-[11px] uppercase tracking-[0.14em] text-ink-muted">{actors}</span>
        )}
      </div>
      <div className="mb-4 border-b border-border-warm/60 pt-2" />
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Legend() {
  const items: { variant: keyof typeof VARIANT; label: string }[] = [
    { variant: "start", label: "Start / entry" },
    { variant: "step", label: "Step (staff action)" },
    { variant: "decision", label: "Decision (yes / no)" },
    { variant: "optional", label: "Optional" },
    { variant: "io", label: "Email / document" },
    { variant: "done", label: "Terminal state" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span
          key={i.label}
          className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${VARIANT[i.variant]}`}
        >
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

export default async function ArchitecturePage() {
  await requireRole(["admin"]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Architecture
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">The workflow, end to end</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          How a prospect moves through the whole system — capture, qualification,
          application, visa, academic and finance — with the decisions and optional
          steps that branch the path. This mirrors what is actually built today.
        </p>
      </div>

      <Legend />

      <div className="flex flex-col gap-3">
        {/* 01 — Capture */}
        <Phase n="01" title="Capture" actors="Public · Agent · Marketing">
          <Row>
            <Node variant="start" title="Prospect" sub="from a marketing campaign / referral" icon={Flag} />
            <Arrow />
            <Node variant="decision" title="How do they register?" icon={HelpCircle} />
          </Row>
          <Branch answer="Public form" tone="info">
            <Row>
              <Node variant="step" title="Register form (/register)" sub="pick any of: English · University · Corporate" />
              <Arrow label="optional" />
              <Node variant="optional" title="Agent code · Passport/ID" sub="guardian block if under 18" />
              <Arrow />
              <Node variant="step" title="Turnstile spam check" />
            </Row>
          </Branch>
          <Branch answer="Agent portal" tone="info">
            <Node variant="step" title="Agent refers a student" actor="Agent" sub="stamped with the agent's own code" />
          </Branch>
          <Down />
          <Row>
            <Node variant="io" title="Lead created" sub="registrations row + tracking code minted" icon={FileText} />
            <Arrow label="if email on" />
            <Node variant="optional" title="Emails sent" sub="admin alert + applicant auto-reply w/ tracking code" icon={Mail} />
          </Row>
        </Phase>

        <Down />

        {/* 02 — Qualify */}
        <Phase n="02" title="Qualify" actors="Marketing · Admissions — Leads tab">
          <Row>
            <Node variant="step" title="Lead lands in stage tabs" sub="★ Needs attention · New · Contacted · Converted · Dropped" />
            <Arrow />
            <Node variant="decision" title="Contacted in time?" icon={HelpCircle} />
          </Row>
          <Branch answer="No — goes cold" tone="no">
            <Node variant="optional" title="Stale-record flag" sub="config thresholds · dismiss requires a recorded reason" />
          </Branch>
          <Branch answer="Yes" tone="yes">
            <Node variant="step" title="Status → Contacted" sub="log calls / WhatsApp / email; assign an owner" />
          </Branch>
          <Down />
          <Row>
            <Node variant="optional" title="Draft study plan (pre-conversion)" actor="Counsellor" sub="carries onto the application later" />
            <Arrow />
            <Node variant="decision" title="Qualified to proceed?" icon={HelpCircle} />
          </Row>
          <Branch answer="No" tone="no">
            <Node variant="done" title="Status → Dropped" icon={CheckCircle2} />
          </Branch>
          <Branch answer="Yes" tone="yes">
            <Node variant="step" title="Convert lead" actor="Admissions" sub="creates Student master + one Application per track" />
          </Branch>
        </Phase>

        <Down />

        {/* 03 — Application pipeline */}
        <Phase n="03" title="Application pipeline" actors="Admissions · Academic — Applications tab">
          <Row>
            <Node variant="decision" title="Which track?" icon={HelpCircle} />
          </Row>

          <Branch answer="English / University — student lane" tone="info">
            <Row>
              <Node variant="step" title="Application" />
              <Arrow />
              <Node variant="step" title="Review" />
              <Arrow />
              <Node variant="step" title="Offer" />
              <Arrow />
              <Node variant="step" title="Accepted" />
            </Row>
            <Row>
              <Node variant="io" title="Documents" sub="rules engine by track / level / nationality / stage + one-off requests; student self-uploads on the status portal" icon={FileText} />
            </Row>
            <Row>
              <Node variant="io" title="Offer letter" sub="English: generated PDF auto-attached · University: uploaded" icon={FileText} />
              <Arrow />
              <Node variant="decision" title="Student acknowledged?" icon={HelpCircle} />
            </Row>
            <Row>
              <Node variant="step" title="Study plan drafted" actor="Admissions" sub="intake · expected completion · step dates" />
              <Arrow />
              <Node variant="decision" title="Which review path?" icon={HelpCircle} />
            </Row>
            <Branch answer="Visa → Academic (international)" tone="info">
              <Row>
                <Node variant="step" title="Visa verifies" actor="Visa" sub="sign-off recorded" />
                <Arrow />
                <Node variant="done" title="Academic finalises" icon={CheckCircle2} />
              </Row>
            </Branch>
            <Branch answer="Academic → Visa" tone="info">
              <Row>
                <Node variant="step" title="Academic verifies" actor="Academic" />
                <Arrow />
                <Node variant="done" title="Visa finalises" icon={CheckCircle2} />
              </Row>
            </Branch>
            <Branch answer="Academic only (local)" tone="info">
              <Node variant="done" title="Academic finalises" icon={CheckCircle2} />
            </Branch>
            <Row>
              <Node variant="optional" title="Any holder can return to Admissions" sub="with a recorded reason — chain restarts; every handover raises a Request to the next team" />
            </Row>
            <Down />
            <Row>
              <Node variant="decision" title="International student?" icon={HelpCircle} />
              <Arrow label="yes → Phase 04" />
              <Node variant="optional" title="Visa / EMGS lane" />
              <Arrow label="then" />
              <Node variant="step" title="Enrolled → Active" />
              <Arrow />
              <Node variant="done" title="Completed" icon={CheckCircle2} />
            </Row>
          </Branch>

          <Branch answer="Corporate — deal lane" tone="info">
            <Row>
              <Node variant="step" title="Enquiry" />
              <Arrow />
              <Node variant="step" title="Proposal" />
              <Arrow />
              <Node variant="step" title="Quotation" />
              <Arrow />
              <Node variant="decision" title="HRDF claimable?" icon={HelpCircle} />
              <Arrow label="yes" />
              <Node variant="step" title="HRDF approval" />
              <Arrow />
              <Node variant="step" title="Delivery" />
              <Arrow />
              <Node variant="done" title="Completed" icon={CheckCircle2} />
            </Row>
          </Branch>
        </Phase>

        <Down />

        {/* 04 — Visa */}
        <Phase n="04" title="Visa / EMGS" actors="Visa edits · every team can view">
          <Row>
            <Node variant="step" title="Document prep" />
            <Arrow />
            <Node variant="step" title="Submitted to EMGS" />
            <Arrow />
            <Node variant="step" title="Medical" />
            <Arrow />
            <Node variant="step" title="VAL issued" />
            <Arrow />
            <Node variant="step" title="Single-entry visa" />
            <Arrow />
            <Node variant="done" title="Student pass active" icon={CheckCircle2} />
          </Row>
          <Row>
            <Node variant="io" title="Doc checklist reviewed in-place" sub="incl. visa-stage docs (e.g. flight ticket); verify / reject / request extra" icon={FileText} />
            <Arrow />
            <Node variant="optional" title="Work log" sub="EMGS visits, university replies, queries — with the date it happened" />
          </Row>
          <Row>
            <Node variant="optional" title="Stage tabs" sub="★ Attention (pass expiring ≤ 45d / stuck > 30d) · Doc prep · EMGS · Medical · VAL/Visa · Active" />
            <Arrow />
            <Node variant="io" title="Visa milestones on the shared calendar" sub="medical · arrival · pass expiry — visible to everyone" icon={FileText} />
          </Row>
        </Phase>

        <Down />

        {/* 05 — Academic */}
        <Phase n="05" title="Academic" actors="Academic team — Academic + Intakes tabs">
          <Row>
            <Node variant="io" title="Intake calendar" sub="PEP levels (45/30d), exam prep (~10–16d), summer camp (1mo) scheduled against MY public holidays — marketing advises start dates" />
            <Arrow />
            <Node variant="decision" title="Fees cleared for class entry?" icon={HelpCircle} />
          </Row>
          <Branch answer="No" tone="no">
            <Node variant="optional" title="Blocked by the finance gate" sub="registration / tuition outstanding" />
          </Branch>
          <Branch answer="Yes" tone="yes">
            <Row>
              <Node variant="step" title="Set class start / end + build plan timeline" sub="intake, expected completion, steps" />
              <Arrow />
              <Node variant="decision" title="Class starts before visa is ready?" icon={HelpCircle} />
              <Arrow label="yes → warn" />
              <Node variant="optional" title="Re-check the dates" />
            </Row>
            <Down />
            <Node variant="done" title="Mark enrolled" icon={CheckCircle2} sub="attendance lives in the PECSB attendance app" />
          </Branch>
        </Phase>

        <Down />

        {/* 06 — Finance */}
        <Phase n="06" title="Finance" actors="Finance — runs alongside · Finance tab">
          <Row>
            <Node variant="step" title="Billable-items catalogue" sub="price list; taxable / commissionable flags" />
            <Arrow />
            <Node variant="step" title="Add fee to student" sub="from the catalogue; amount overridable" />
            <Arrow />
            <Node variant="step" title="Record payment" sub="+ optional QuickBooks receipt upload" />
          </Row>
          <Row>
            <Node variant="optional" title="Attach invoice (QuickBooks)" sub="admissions / marketing can open + send it" icon={FileText} />
            <Arrow />
            <Node variant="step" title="Commission rules → accrue at milestones" sub="agent payout / university share; payable & receivable" />
          </Row>
        </Phase>
      </div>

      {/* Cross-cutting */}
      <section className="rounded-card border border-border-warm bg-paper/40 p-5">
        <div className="mb-3 flex items-baseline gap-3">
          <span className="font-mono text-xs tracking-[0.22em] text-brand-red">∞</span>
          <h2 className="font-serif text-xl font-medium text-ink">Always on</h2>
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            cross-cutting, every phase
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "Stage tabs — every module opens on its ★ act-now list",
            "Requests — cross-team handoffs (raise / resolve)",
            "Notifications — bell + realtime + chime",
            "Urgent sign-in popup — role-scoped daily heads-up",
            "Calendar — follow-ups, class + pass dates",
            "Reports / CSV export",
            "Executive dashboard (boss — aggregates + quick status lookup)",
            "EN / العربية console toggle (RTL aware)",
            "Audit log — every action",
            "Student record + printable PDF report",
            "Status portal — the student's own view (by tracking code)",
          ].map((c) => (
            <span
              key={c}
              className="rounded-md border border-border-warm bg-cream-50 px-3 py-1.5 text-xs text-ink-soft"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <p className="text-xs text-ink-muted">
        Roles gate every screen (admin · boss · marketing · admissions · visa ·
        finance · academic · counsellor · staff · agent). All writes go through
        server actions with RLS; the public form writes via the service role after
        a Turnstile check.
      </p>
    </div>
  );
}
