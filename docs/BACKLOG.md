# Improvement backlog

Prioritized list of what to improve next. **Rebased 2026-07-04** against the
live system (previous version predated go-live and described a mock-only app).

**Current reality:** the platform is **live** — Supabase provisioned (migrations
`01`–`08` applied), deployed to Vercel (functions pinned to `sin1`, auto-deploy
on push to `main`), asymmetric JWT auth via `getClaims()`. List reads use
**denormalised flat `select *`** (no `!inner()` joins). What's *not* proven is
end-to-end behaviour with real data + real logins per role, and the integration
keys (Turnstile/Resend) are still unset.

Legend: 🔴 P0 (blocks real usage) · 🟠 P1 (needed to run the office day-to-day) ·
🟡 P2 (competitive polish) · ⚪ housekeeping.

---

## ▶ Do next (recommended order)

1. **Turnstile + Resend keys** — spam protection + all email. Most pressing now
   the public form collects minors' data. (env vars + redeploy.)
2. **Access-code delivery** — email a real per-application code on creation so the
   (now-translated) status page is actually usable; today it's the demo code.
3. **Live smoke-test** — one real submission per path (incl. an under-18), each
   role login, agent portal as a real agent. Confirms RLS + the new flows.
4. **Automation layer** (P1) — the highest-value functional gap; start with
   stage-change → notify + fee creation + commission accrual.

---

## ✅ Done since the last backlog (2026-07)

- Supabase provisioned + deployed to Vercel; `sin1` region (co-located with DB).
- Auth: asymmetric JWT signing key + `getClaims()` (local verification) + React
  `cache()` on `getProfile` — fixed slow login/tab-switching.
- **Denormalised reads** replaced the old `!inner()` joins (that whole P0 is moot).
- **Fixed a latent bug**: `createApplicationFromLead` inserted via the RLS-bound
  client with *no* INSERT policy, so it silently no-op'd live (migration 07).
- Staff can **create leads/students directly** from the console (Add enquiry / Add
  student), gated to lead-facing roles; migration 07 also modernised the
  registrations/lead_events policies to the full role set.
- **Handler tracking** (`created_by` + auto-assign to creator) for incentives.
- **Agent master-hierarchy** (`profiles.parent_agent_id`) + UserManager UI.
- **Minor compliance**: DOB on the public form + required guardian declaration
  (<18), stored and mapped to the student on convert.
- **Agent portal** now shows payment status, per-student commission + invoice
  status, application status, outstanding-doc checklist, and next action.
- **Status page translated** (en/zh/ja/ar). Public landing footer = full company
  details; prominent status link; login "back to home".

---

## 🔴 P0 — Prove it live / go-live blockers

- [ ] **Integration keys**: Turnstile (site+secret), Resend (verified sending
      domain for `premium.edu.my`), `NEXT_PUBLIC_APP_URL` (referral + status links).
- [ ] **Access codes**: generate a high-entropy per-application code and email it
      on creation; today the status portal expects the demo `PECSB2026`.
- [ ] **Live smoke-test per role** (admin/marketing/admissions/finance/visa/
      academic/counsellor/agent + public student): each sees only what it should.
- [ ] **Smoke-test the new write paths** end-to-end against real data: public
      submit (incl. an under-18 → guardian block), staff Add enquiry / Add student,
      enquiry→application convert (agent_id resolves from agent_code), agent portal
      as a real agent.
- [ ] **Durable rate limiter** for `/api/status` — currently in-memory per
      serverless instance; move to Upstash/Redis so it holds across instances.
- [ ] Confirm `server-only` guards keep the service-role key out of client bundles;
      confirm `/api/offer` + `/api/admin/doc/[id]` enforce role under real auth.

## 🟠 P1 — Automation layer (biggest gap vs. commercial CRM)

Stage changes and requests are still **passive** — a human must act on each.

- [ ] **Stage-change triggers**: advancing an application optionally notifies the
      student/agent, creates the stage's fees, and **accrues commission at its
      milestone** (`commissions.milestone` is stored but nothing fires it).
- [ ] **Requests notify** the receiving team (in-app bell + email).
- [ ] **Notification bell is mock** — wire Supabase realtime + the `notifications`
      table (mark-as-read, per-user prefs).
- [ ] **State machine doesn't enforce** transitions (skip stages / offer before
      review / past the doc checklist). Add guards.
- [ ] **Daily digest** built but untested live; make it per-staff/personalised.

## 🟠 P1 — Correctness & data model

- [ ] **Dedup on create/convert** — now **higher priority**: three entry points
      (public form, Add enquiry, Add student) make duplicate students/leads easy on
      the same email. Add a match/warn/merge.
- [ ] **Pagination + server-side search** on all list views (unbounded `select *`
      today — fine at a handful of rows, breaks at hundreds). Pair with the RLS
      `initplan` cleanup below.
- [ ] **Offer-letter archival**: letters are regenerated per request, never stored
      — no record of *what was issued* (legal gap). Save PDF to Storage + `offers`
      row on generation.
- [ ] **`offers` / `visa_renewals`** are schema-only — no UI to issue/log them.
- [ ] **Commission auto-calc** from a rules table (rate by agent tier/programme),
      incl. **master-agent override** now that the hierarchy exists.
- [ ] **E.164 phone** normalisation on input (only fixed for `wa.me` display).
- [ ] **Multi-currency** on fees; decide explicit international toggle vs. derive.

## 🟠 P1 — Communications

- [ ] Send **templated email** from the lead/application drawer, logged to the
      timeline.
- [ ] University / **conditional offer letters** (only the English one exists) +
      other templates (visa support letter, invoice).

## 🟡 P2 — Competitive polish

- [ ] **Portal i18n**: status page done; **agent portal still English-only**, and
      status-page **timeline entries** are server-recorded English (needs server-
      side i18n).
- [ ] Bulk actions (assign/status/export selected); saved filters; column sorting.
- [ ] CSV **import** of leads/students (only export exists).
- [ ] Report builder + exports on every view.
- [ ] **Optimistic updates** (actions round-trip + full `router.refresh()` today).
- [ ] **e-signature** on offers; **payment gateway** (FPX/Billplz/iPay88).
- [ ] **WhatsApp Business API** (beyond `wa.me`); **Google Drive mirror**
      (`lib/drive.ts` inert).

## 🟡 P2 — UI/UX

- [ ] **Loading states** (Suspense/skeletons) on data pages — also improves
      perceived nav speed.
- [ ] Empty states / onboarding; mobile card layout for dense admin tables.
- [ ] Admin selects/tables keyboard + screen-reader audit.
- [ ] Visually proof the offer-letter PDF; dark mode (minor).

## ⚪ Testing / quality / ops

- [ ] **No automated tests.** Start with pure helpers (`stagePercent`,
      `expiryFlag`, `ageFromDob`, `expectedDocs`, `paidTowards`,
      `captureAttribution`), then API-route integration tests.
- [ ] **Error boundaries** + friendly 500 page; **monitoring** (Sentry); **CI**
      (lint + build + test on push — would have caught the two build breaks).
- [ ] **DB hygiene** (from advisors, non-urgent at current scale): wrap RLS
      `auth.*()`/`has_role()` calls in `(select …)` (`auth_rls_initplan`); add a
      covering index on `applications.created_by`; optionally `revoke execute` on
      the RLS helper functions from anon/authenticated; enable leaked-password
      protection. Drop unused indexes only once data volume is real.
- [ ] `.gitattributes` to normalise LF/CRLF.

## 📋 Business sign-off needed (content, not code)

- [ ] **Guardian-consent wording + minor data-handling** (PDPA) — legal review of
      the new under-18 flow.
- [ ] Privacy notice content + URL (PDPA).
- [ ] Offer-letter wording + signatory (President/Founder vs. Centre Director).
- [ ] Real partner-university list (verify the compiled ~106); fee schedules;
      commission rates + tiers; exact stage names each team uses.
- [ ] **Native review** of the zh / ar / ja translations before launch.
- [ ] Program list, agent codes, notification defaults.
