# Improvement backlog

What's left to improve. **Rebased 2026-07-05** against the live system the night
before the stakeholder demo. Most of the earlier functional backlog has shipped
(see "Shipped" below); what remains is post-demo hardening, scale, and polish.

Legend: 🔴 P0 (blocks real usage) · 🟠 P1 (needed to run the office day-to-day) ·
🟡 P2 (competitive polish) · ⚪ housekeeping.

---

## ▶ Do first — right after the demo

1. **Rotate / disable the demo accounts.** Nine role accounts share one guessable
   password on a public URL (see `demo-accounts-seeded` memory). Change passwords
   or disable, and re-seed real staff accounts via Users.
2. **Enable leaked-password protection** — Supabase → Auth → Passwords (advisor
   WARN; one toggle, checks HaveIBeenPwned).
3. **Decide the demo data's fate** — keep what stakeholders created, or wipe +
   reseed. Seed rows use recognisable id prefixes (`a/b/c/d/e/f0000000-…`).

---

## ✅ Shipped since the last backlog (2026-07)

Integrations & automation
- **Email live** (Brevo) — admin new-lead alert + branded applicant auto-reply
  with tracking code; localhost-link bug fixed (Vercel prod URL fallback).
- **Notifications wired** — Supabase realtime bell (no longer mock) + audible
  chime + a red **pending-items** header indicator + a once-a-day **urgent-items
  sign-in popup**, all role-scoped.
- **Automation layer** — `runStageAutomation` scaffolds fees, accrues commission
  at milestones, and notifies on stage change; **Requests** raise cross-team
  handoffs (incl. from the study-plan chain) that surface in the receiving team's
  Requests tab + banners.

Money
- **Commission rules engine** (agent payout / university share / handler incentive
  / consultant markup; percent/fixed/split; settable base fee) + accrual.
- **Billable-items catalogue** (price list, taxable/commissionable flags) →
  add-fee-from-catalogue + **invoice & receipt attach** per fee/payment.

Admissions / academic / visa
- **Study-plan builder** + the **cross-department handover chain** (Admissions
  drafts → Visa/Academic verify with recorded sign-offs → finalise; return-to-
  draft) — copy-as-message + printable.
- **Offer letters**: English auto-generated PDF (stored as a document) +
  university upload; student **acknowledgement** on the status portal.
- **Document rules engine** (by track / level / nationality / stage) + ad-hoc
  per-application requests; visa doc checklist reviewed in place (open/download,
  verify/reject/request), visa **work log**.
- **Program intake calendar** (PEP levels 45/30d, exam prep ~10–16d, summer camp
  1mo) against **MY public holidays** with learning-day counting; click-any-day
  detail panel.
- **Visa cases visible to every team** (read), edit gated to visa/admin; visa
  milestones on the shared calendar + visa-stage chips on student views.

Console & roles
- **Stage sub-tabs** across Leads / Applications (Students+Corporate lanes) /
  Finance / Visa / Academic / Requests / Follow-ups.
- **Boss role + Executive** overview (aggregates, agent/marketing/campaign/track
  performance) + **quick status lookup → read-only student popout** (progress %,
  visa checklist, fees, plan+sign-offs, activity, documents incl. offer letter).
- **Agent codes tied to agent logins** + master hierarchy; agent portal referrals.
- **Per-student record page** + printable report; **Architecture** flowchart tab.
- **Dark mode**; **EN/العربية console** toggle (RTL) for chrome + Dashboard + Exec;
  live clock; sidebar logo.
- Passport/ID required on the student register flow; reference-code visibility.

---

## 🔴 P0 — Prove it live

- [ ] **Verify Turnstile keys** in Vercel (site+secret) so the public form has spam
      protection; confirm the widget renders in prod.
- [ ] **Live smoke-test per role** with the real (rotated) logins: each sees only
      what it should; public submit (incl. an under-18 → guardian block), staff
      Add enquiry / Add student, enquiry→application convert, agent portal.
- [ ] **Durable rate limiter** for `/api/status` — currently in-memory per
      serverless instance; move to Upstash/Redis so it holds across instances.

## 🟠 P1 — Correctness & scale

- [ ] **Pagination + server-side search** on list views (unbounded `select *`
      today — fine at a handful of rows, breaks at hundreds).
- [ ] **Dedup on create/convert** — three entry points (public form, Add enquiry,
      Add student) make duplicate students/leads easy on the same email;
      match/warn/merge.
- [ ] **State machine guards** — don't allow skipping stages / offer before review
      / past the doc checklist.
- [ ] **E.164 phone** normalisation on input (only fixed for `wa.me` display).
- [ ] **Multi-currency** on fees; explicit international toggle vs. derive.
- [ ] **Daily digest** email built but untested live; make it per-staff.

## 🟠 P1 — Communications & documents

- [ ] Send **templated email** from the lead/application drawer, logged to the
      timeline (templates exist; wire the send + logging end-to-end live).
- [ ] More letter templates: **visa support letter**, invoice/receipt PDF,
      conditional-offer variants.
- [ ] **Offers table** is still lightly used — ensure every issued letter writes an
      `offers` row for a legal record of *what was issued*.

## 🟡 P2 — i18n depth

- [ ] **Console AR coverage** — today only chrome + Dashboard + Exec are Arabic;
      extend the `console-i18n` dict to the working screens (Leads, Applications,
      Finance, Visa, Academic) as needed.
- [ ] **Agent portal + status-page timeline** are still English-only (timeline
      entries are server-recorded English → needs server-side i18n).
- [ ] **Native review** of the zh / ar / ja translations before wider launch.

## 🟡 P2 — Competitive polish

- [ ] Bulk actions (assign/status/export selected); saved filters; column sorting.
- [ ] CSV **import** of leads/students (only export exists).
- [ ] **Optimistic updates** (actions round-trip + full `router.refresh()` today).
- [ ] **Loading states** (Suspense/skeletons) on data pages.
- [ ] **e-signature** on offers; **payment gateway** (FPX/Billplz/iPay88).
- [ ] **WhatsApp Business API** (beyond `wa.me`); **Google Drive mirror**
      (`lib/drive.ts` still inert — Phase 6).

## ⚪ Testing / quality / ops

- [ ] **No automated tests.** Start with pure helpers (`stagePercent`,
      `expiryFlag`, `learningDaysBetween`, `planStatus`, `leadStaleness`,
      `computeEndDate`), then API-route integration tests.
- [ ] **Error boundaries** + friendly 500 page; **monitoring** (Sentry); **CI**
      (lint + build + test on push — would have caught past build breaks).
- [ ] **DB hygiene** (advisors, non-urgent): wrap RLS `auth.*()`/`has_role()` in
      `(select …)` (`auth_rls_initplan`); covering index on `applications.created_by`;
      leaked-password protection (above). Anon EXECUTE on RLS helpers already revoked.
- [ ] `.gitattributes` to normalise LF/CRLF.

## 📋 Business sign-off needed (content, not code)

- [ ] **Guardian-consent wording + minor data-handling** (PDPA) — legal review.
- [ ] Privacy notice content + URL (PDPA).
- [ ] Offer-letter wording + signatory.
- [ ] Real partner-university list (verify the compiled ~103); fee schedules;
      commission rates + tiers; exact stage names each team uses.
- [ ] Confirm the **2026 MY public holidays** (religious/movable dates were seeded
      as best-estimates and are editable in the holiday manager).
