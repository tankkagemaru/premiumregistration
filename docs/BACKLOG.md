# Improvement backlog

Prioritized list of what to improve next. Grounded in the code as of the last
session. **The single biggest fact: the whole platform runs on mock data — no
live Supabase yet — so every "live" query path and RLS policy is written but
untested.** Closing that is P0 and unblocks proving everything else.

Legend: 🔴 P0 (blocks go-live) · 🟠 P1 (needed to run the office day-to-day) ·
🟡 P2 (competitive polish) · ⚪ housekeeping.

---

## 🔴 P0 — Deployment & "does it actually work live"

- [ ] **Provision Supabase**; run the 5 SQL files in order: `schema.sql`,
      `storage.sql`, `schema-platform.sql`, `schema-audit.sql`, `schema-teams.sql`.
- [ ] **Test every live query path.** The list functions use joins
      (`select("*, students!inner(...)")`) with `as unknown as T[]` casts — the
      nested join shape is *assumed*, never run. Files: `lib/admin/applications.ts`,
      `finance.ts`, `visa.ts`, `requests.ts`, `users.ts`, `audit.ts`, `leads.ts`.
      Each needs its real row-shape mapped and verified.
- [ ] **Test RLS per role** with real logins (admin/marketing/admissions/finance/
      visa/academic/agent/student) — confirm each sees only what it should, and
      agents/students are correctly scoped.
- [ ] **Deploy to Vercel**: env vars, confirm `outputFileTracingIncludes` bundles
      the offer-letter fonts + logo, cron for the daily digest.
- [ ] **Real integrations keys**: Turnstile (site+secret), Resend (verified
      sending domain for `premium.edu.my`), `NEXT_PUBLIC_APP_URL`.
- [ ] **Student status access codes**: generate a high-entropy `access_code` per
      application and email it to the applicant; today it's the demo `PECSB2026`.
- [ ] **Test the enquiry → application conversion** (`createApplicationFromLead`)
      end-to-end, incl. agent_id resolution from agent_code.

## 🔴 P0 — Security hardening

- [ ] Status-portal rate limiter is **in-memory (per serverless instance)** — move
      to a durable store (Upstash/Redis) so it holds across instances.
- [ ] Verify service-role key never reaches a client bundle (the `server-only`
      guards are in place; confirm after real build).
- [ ] Confirm `/api/offer` and `/api/admin/doc/[id]` enforce role in production
      (they check `getProfile()` — verify against real auth, not dev bypass).

## 🟠 P1 — The automation layer (biggest gap vs. commercial CRM)

Right now stage changes and requests are **passive** — a human must act on each.

- [ ] **Stage-change triggers**: moving an application should optionally notify the
      student/agent, create the stage's fees, accrue commission at its milestone
      (`commissions.milestone` is stored but nothing fires it), and post to the
      in-app bell.
- [ ] **Requests should notify** the receiving team (in-app bell + email); today
      the `/admin/requests` queue is passive.
- [ ] **Notification bell is mock** — no realtime, no mark-as-read, no per-user
      prefs. Wire Supabase realtime + the `notifications` table.
- [ ] **State machine doesn't enforce** transitions — you can skip stages, issue an
      offer before review, drag past the doc checklist (advisory only). Add guards.
- [ ] **Daily digest** is built but untested live; make it per-staff/personalised.

## 🟠 P1 — Correctness & data model

- [ ] **Dedup on convert**: same email registering twice creates two students. Add
      a match/merge on conversion.
- [ ] **Pagination + server-side search** on all list views — every query is
      currently unbounded (fine at 4 rows, breaks at 400).
- [ ] **Offer-letter archival**: letters are regenerated on each request, never
      stored — there's no record of *what was issued* (a legal gap). Save the PDF to
      Storage + an `offers` row on generation.
- [ ] **`offers` and `visa_renewals` tables are schema-only** — no UI to issue an
      offer record or log a renewal. Build those.
- [ ] **E.164 phone** normalisation on *input* (only fixed for `wa.me` display, not
      stored) — matters for WhatsApp automation later.
- [ ] **Commission auto-calc** from a rules table (rate by agent tier/programme),
      not hand-entered amounts.
- [ ] **Multi-currency** on fees (some tuition may not be MYR).
- [ ] Decide: explicit "international student?" toggle vs. deriving from nationality.

## 🟠 P1 — Communications

- [ ] Send **templated email** from the lead/application drawer, logged to the
      timeline (spec'd, not built).
- [ ] University / **conditional offer letters** (only the English offer letter
      exists) — plus other document templates (visa support letter, invoice).

## 🟡 P2 — Competitive polish

- [ ] Bulk actions (assign / status / export selected); saved filters.
- [ ] CSV **import** of leads/students (only export exists, and only for leads).
- [ ] Report builder + exports on every view (only leads has CSV).
- [ ] **e-signature** on offers; **payment gateway** (FPX / Billplz / iPay88) if
      finance moves beyond record-only.
- [ ] **Portal i18n**: the student status portal + agent portal are English-only
      while the funnel is en/zh/ar/ja — an Arabic student hits an English tracker.
- [ ] Table **column sorting**; **optimistic updates** (actions currently
      round-trip + full `router.refresh()`).
- [ ] **WhatsApp Business API** (inbound/outbound beyond `wa.me` links).
- [ ] **Google Drive mirror** — scaffold in `lib/drive.ts`, currently inert; needs
      the service-account wiring.

## 🟡 P2 — UI/UX

- [ ] **Empty states / onboarding** (e.g. "Connect Supabase to go live").
- [ ] **Loading states** (Suspense/skeletons) on data pages.
- [ ] Admin **selects/tables keyboard + screen-reader** audit (form dropdowns done;
      admin controls not yet).
- [ ] Mobile: admin tables scroll but are dense — a card layout at narrow widths.
- [ ] Visually proof the **offer-letter PDF** once (couldn't rasterise in-session)
      and confirm wording/signatory with the team.
- [ ] Dark mode + density options (minor).

## ⚪ Testing / quality / ops

- [ ] **No automated tests exist.** Add unit tests for pure helpers first
      (`stagePercent`, `expiryFlag`, `toWhatsAppNumber`, `paidTowards`,
      `captureAttribution`, `lookupStatus` matching), then API-route integration
      tests.
- [ ] **Error boundaries** + a friendly 500 page.
- [ ] **Monitoring** (Sentry) + structured logging.
- [ ] **CI**: lint + build + test on push.
- [ ] `.gitattributes` to normalise LF/CRLF (every commit warns on line endings).

## 📋 Business sign-off needed (not code — content)

- [ ] Offer-letter wording + signatory (President/Founder vs. Centre Director).
- [ ] Real partner-university list (verify the compiled ~106).
- [ ] Fee schedules, commission rates, exact stage names each team uses.
- [ ] Privacy notice content + URL (PDPA).
- [ ] **Native review** of the zh / ar / ja translations before launch.
- [ ] Program list, agent codes, notification defaults.
