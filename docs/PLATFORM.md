# PECSB `regist·er` — Recruitment & Admissions Platform

The project has grown from a lead-capture site into the operating system for
PECSB's international-student business: recruitment → admissions → offers →
visa → finance → enrolment → monitoring, plus a recruitment-partner (agent)
network and a public status portal.

**Confirmed scope decisions**
- **PECSB is recruiter + English provider** — it recruits international students
  and forwards applications to partner universities (earning/paying commission),
  and runs its own PLC English courses. An application can target an external
  university or a PLC course.
- **Finance is record-only in v1** — staff record fees as unpaid/partial/paid
  and attach receipts; no payment gateway yet.
- **Visa is flexible** — for **private** universities the university submits to
  EMGS; for **public** universities PECSB can submit. Either way PECSB prepares
  the documents, so `visa_cases.submitted_by` records who filed.

## The pipeline
Enquiry → Application (student or agent) → Admissions review → Conditional
offer → Final offer / acceptance letter → Accept + fees → Visa/EMGS (medical,
VAL, single-entry visa) → arrival + post-arrival medical → registration/start
class → active student (monitoring) → visa renewal (annual) → completion.

**The lane is gated by residency, not track.** Any **international** student —
English *or* university — gets an offer/acceptance letter and runs the full
visa/medical lane (`students.is_international`). Only **local (Malaysian)**
students and non-visa corporate trainees take the short lane. For visa
submission: private universities submit their own EMGS; PECSB submits for public
universities and for PLC's own English courses; PECSB prepares the documents
either way (`visa_cases.submitted_by`).

## Data model
`supabase/schema.sql` + `storage.sql` (lead-capture) and
**`supabase/schema-platform.sql`** (this platform): `students`,
`applications` (+ stage engine), `application_events`, `application_documents`,
`offers`, `fees`, `payments`, `commissions`, `visa_cases`, `visa_renewals`, and
expanded RBAC (admin | admissions | visa | finance | counsellor | agent |
student) with per-module RLS.

## Build order
1–3. Marketing site, submit pipeline, CRM — **done**.
- **A. Applications & stage engine** — lead → application, pipeline state machine, per-stage document checklists. *(current)*
- B. Offers & documents — conditional/final offer letters from templates.
- C. Agent portal + commission dashboard.
- D. Finance — fee schedules, payments, receipts.
- E. Visa/EMGS — cases, submitted-by, medical, VAL, student pass, renewals + expiry alerts.
- F. Student status portal — public passport + PIN lookup.
- G. Monitoring & reporting — attendance link, agent performance, revenue, expiry dashboards.
- H. Integrations — payment gateway, e-signature, WhatsApp Business.
