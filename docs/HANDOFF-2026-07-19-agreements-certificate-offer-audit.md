# Session handover — 2026-07-19 · "agent agreements + certificate + offer letter + full audit"

Pairs with the master `docs/HANDOFF.md` and the previous
`docs/HANDOFF-2026-07-13-departments-and-agent.md` (read those first for the
base system). This file covers **what changed 2026-07-19 and what's still open**.

Everything below is **live on production** — auto-deploy on push to `main`,
each push verified green via the Vercel MCP. Work ends at commit `b5dcb2c`.

Live: https://premiumregistration.vercel.app · Repo: `tankkagemaru/premiumregistration`
Supabase project id: `gvpgmoeffrcreyvzyrra`.

---

## Start here next time

1. **The whole agent-agreement system is new this session** — a full lifecycle
   from an agent requesting an agreement → due-diligence doc review → finance
   drafting terms + commission scheme → e-signature → PDF → certificate →
   change/termination requests. Section "Agent agreements" below is the map.
2. **All PDFs are generated blind by the assistant** (no way to render them in
   the dev environment — no node/npm on PATH locally). The agreement PDF, the
   authorised-agent certificate, and the revised offer letter should each be
   **eyeballed once** for layout/spacing/wording. They compile and type-check;
   the visual layout is unverified.
3. **A three-agent read-only audit ran** (marketing/leads, admissions/visa/
   academic, finance/boss/admin). Every Tier-1 and Tier-2 finding was fixed and
   most of Tier-3. Remaining known gaps are in "Open items" at the bottom —
   nothing urgent.
4. **Demo agent for testing the agreement flow:** `agent.kucing@premium.edu.my`
   ("Kucing Oren", code `KUCING`, role `agent`). It existed all along; earlier
   it was invisible in finance pickers because of a `profiles` RLS gap (fixed —
   see "Agent management" below).
5. **Local build tooling is unavailable** (node/npm not on PATH in the
   assistant's shells). Verification = push → Vercel build via MCP. Two builds
   this session went red on trivial type errors and were fixed forward
   (`PageOrientation` import; `ActionRequest.status` union) — production was
   never affected because Vercel only swaps the alias on a green build.

---

## What shipped, by area

### Agent agreements (the big new system)

Digitises `docs/PECSB_Recruitment_Agreement_MASTER_TEMPLATE.docx` end to end.

**Data model (all migrations applied):**
- `agent_agreements` — one per agent. `particulars` jsonb (Part 1, Items 1–18),
  `scheme` jsonb (Schedule 1, Parts A–F), status workflow
  `requested → draft → with_agent → signed_agent → active | void`, typed/uploaded
  signature fields, `signed_doc_path`, `certificate_issued_at`. RLS: finance/admin
  read all; boss read all; agent reads own once it leaves `draft`. **Writes go
  through service-role server actions** behind role gates (`app/admin/agreement-actions.ts`).
- `agent_documents` — due-diligence uploads (passport, business reg, licence,
  other) with `review_status`. RLS: finance/admin + own.
- `agreement_events` — permanent record of lifecycle requests/notices
  (amendment / addendum / termination / new-agreement). RLS: finance/admin/boss +
  own.

**Flow (agent-initiated, due diligence first):**
1. Agent portal → **Agreement** tab (`/agent/agreement`). With no agreement, the
   agent uploads passport + business registration and clicks **Request agreement**
   (`requestAgreement`). Status → `requested`; finance notified.
2. Finance verifies each document (Verify/Reject) on **Agent management → Recruitment
   agreements** (admin/finance only). "Send to agent" is gated on required docs
   verified.
3. Finance sets **terms** (Part 1 particulars) + **Schedule 1 commission scheme**
   (flexible 1–4 volume tiers — see below), then **Save & send to agent**.
   Status → `with_agent`.
4. Agent completes **only their own allowlisted fields** (identity, signatory,
   notices, bank — server-enforced allowlist `AGENT_PARTICULAR_KEYS`), then
   **signs electronically** (typed legal name + consent tick + server timestamp)
   OR downloads the PDF, signs on paper, uploads the scan. Status → `signed_agent`.
5. Finance **countersigns** → `active`. Then optionally **Apply scheme to
   commission rules** (`applySchemeToRules`) and **Issue certificate**.
   Variation after signing needs a fresh agreement (terms lock — Clause 23b).

**Flexible commission tiers:** `scheme.tiers: SchemeTier[]` (each `{up_to: N|null}`,
1–4 tiers); Part A/B rows carry `amounts[]`/`pcts[]` aligned to the tiers.
`normalizeScheme()` migrates the legacy two-tier shape on read, so anything saved
before this session keeps working. `applySchemeToRules` emits one
`commission_rules` row per tier (`min_students` from the tier threshold, labelled
`AGR · …`, replacing earlier agreement-generated rules; hand-made rules untouched).

**Per-agent commission automation:** the "for a certain agent" field already
existed on rules (the "Person" picker on `/admin/pricing`). The gap was that
stage-accrual automation *ignored the rules* — every accrual was created with a
null amount for finance to price by hand. Now `lib/admin/automation.ts` →
`resolvePayout()` prices the accrual: agent-specific rule beats generic, matching
track beats none, highest reached tier (this calendar year) wins; percent rules
compute off the rule base or the application's tuition fee. No matching rule →
amount stays null (old behaviour).

**PDFs (`react-pdf`, house crimson/serif scheme):**
- `/api/agreement?id=` → full agreement: **cover page** → Part 1 particulars
  (compact 8pt, one page) → all 24 operative clauses with Item values threaded in
  → signature blocks (**handwriting font `Great Vibes`** for e-signatures, in
  pen-blue, with an Electronic Commerce Act 2006 / Clause 23(f) note) → Schedule 1
  tables → Annexure A (+ B when minors permitted). Gated finance/admin + boss
  (read-only, non-draft) + owning agent.
- `/api/agreement/certificate?id=` → **authorised-agent certificate**: landscape,
  concentric crimson+gold borders, official seal, agent name/code/scope/validity.
  Only for `active`; finance can preview, agent + boss download once
  `certificate_issued_at` is set (`issueCertificate`).
- `/api/agreement/doc?id=` (uploaded signed copy) and `/api/agreement/agentdoc?id=`
  (due-diligence docs) serve inline, gated + audited.

**Lifecycle requests (agent portal → "Request a change"):** four paths, all on the
permanent record + finance Requests inbox + notifications + audit:
1. Change of terms → amendment request.
2. Special project → **addendum** (deliberately, not a standalone term sheet —
   Clause 9(e) + 24(a) give supplementary terms the same legal effect and inherit
   the master's confidentiality/clawback/anti-bribery protections).
3. Early termination → written notice under Clause 12(b) with a 30-day
   acknowledgement tick; the finance editor shows the computed effective date
   ("notice matured — void now") and a red chip on the list row.
4. New agreement → close current + start fresh.

### Boss / exec
- **Agent arrangements** table on `/admin/exec` (admin + boss): per-agent
  agreement status, one-line commission-scheme summary, student count, commission
  position (accrued/paid), doc-verification progress, links to the agreement PDF
  + certificate. Service-role loader `listAgentArrangements()` (boss can read
  agreements under RLS but not commissions).
- Boss added to the agreement PDF route (read-only).

### Agent management (was "Agent codes")
- Sidebar tab **renamed** Agent codes → **Agent management** (EN + AR); same URL
  `/admin/agent-codes`. Now covers codes + agreements + portal resources.
- **RLS picker fix:** finance/marketing couldn't see agents because `profiles`
  RLS is self-or-admin read; the pages loaded the list with the user client.
  New `listUsersPrivileged()` (service-role, gated admin/finance/marketing) feeds
  the Agent management + Pricing pages. The admin-only Users page keeps the
  RLS-scoped `listUsers()`.

### English offer letter (rewritten)
`lib/pdf/EnglishOfferLetter.tsx` + `app/api/offer/route.ts` — turned a warm
welcome note into a **formal Letter of Offer**: ref/date block, recipient with
passport + nationality, underlined subject line, formal offer paragraph naming the
operating entity + company no., **Programme Details** panel, **Schedule of Fees**
table (from the application's *real* fees — registration → application → tuition →
rest; zero/TBD and waived skipped; falls back to "see accompanying invoice"),
numbered **Conditions of Offer** (with an EMGS/Student-Pass clause for
international), validity + next steps, and an **Acceptance of Offer slip** the
student signs and returns. Class dates come from `class_start`/`class_end`;
`offer_expires_at` is now stamped when the letter is generated.

### Earlier this session (before the audit)
- **Fixed the boss student-detail modal** clipping bug — `<main>` keeps a
  persistent `transform` from the `.rise-on` entrance animation (fill-mode both),
  which makes it the containing block for `position:fixed` descendants. The
  modal was clamped to the content column. **This was the seed of Tier-3 below.**
- **"Edit contact details"** on the lead + application drawers (admin/marketing/
  admissions) — corrects a mis-submitted name/passport/email/phone/nationality
  after the fact; the application-side edit cascades to the `students` master +
  denormalised snapshots on applications/fees/visa_cases. Every change diffed to
  the timeline + audit. `is_international` deliberately NOT auto-flipped.
- **Full EN/AR translation** of the boss detail modal + the entire agent portal
  (new language toggle + RTL on the agent side, reusing the `console-lang`
  cookie). Note: shared status-label MAPS (stage/visa/doc/fee-type names) are
  still English-only across the whole console — translating those is a separate
  cross-cutting job.

---

## The audit + remediation (4 commits: `ac708d1` → `23af0a6`)

Three read-only Explore agents audited each department cluster. Findings were
fixed in four tiers. Highlights:

**Tier 1 — money & gates (`ac708d1`):**
- Boss "Money position" + Reports now **FX-convert** every fee/commission to MYR
  and net partial payments (they summed mixed currencies raw — a USD fee inflated
  MYR totals). Uses `toMYR()` from `lib/admin/fx.ts` like the finance dashboard.
- **Zero-priced fees no longer clear gates** anywhere (`gates.ts`,
  `ApplicationDrawer` signals, `autoAdvanceRegistration`): a fee scaffolds at
  amount 0 ("TBD"); a 0 "paid" fee must not advance a student. `allFeesCleared`
  is no longer vacuously true with zero fee rows.
- `setFeeStatus` refuses "waived" (must go through the reason-backed `waiveFee`)
  and refuses "paid" on an unpriced fee.
- `advanceApplicationStage` now returns `{ok,error}` and **blocks an international
  student jumping past Visa without an issued pass**; kanban / next-step / academic
  controls surface the reason instead of silently no-oping.
- Lead drawer: "enrolled" removed from the manual status select (it made the
  drawer think a conversion happened and hid the convert button forever).

**Tier 2a — handoffs + lead workflow (`3a5c095`):**
- Lead conversion actually hands off to Admissions (request + notifications);
  `assignLead` notifies the new owner; **visa "done" hands off to Academic**
  (note + request + owner ping) — students no longer stall silently at Visa.
- New **"quoted" lead status**, auto-set on quote save; badge/tab/pipeline/funnel/
  staleness all updated. First outbound message auto-advances `new → contacted`;
  quick WhatsApp/Email buttons now log (as "drafted", since we only know the
  compose window opened). Follow-ups require a due date + land on the timeline.
  Duplicate detection also matches phone/WhatsApp. Requests gained **Dismiss**.

**Tier 2b — workflow verbs (`b9ea568`):**
- `setApplicationStatus`: **withdraw / defer / complete / reactivate** from the
  drawer (reason required for withdraw+defer; `deferred` added to the enum).
- **Offer expiry** stamped + shown as a chip. Termination-notice effective date
  surfaced. Commission "paid" gated on a priced amount + the claim invoice on
  file; finance dashboard gains an "accruals awaiting a price" row. Safe deletes
  (confirmations everywhere; `deleteBillableItem` refuses when fees reference it).
  Over-received badge. `isInternationalNationality()` helper replaces the brittle
  `!== "my"` check ("Malaysia"/"MYS" no longer route locals into the visa lane).

**Tier 3 — polish (`23af0a6`):**
- **Shared `<Overlay>` component** (`components/ui/Overlay.tsx`) portals to
  `document.body` — applied to LeadDrawer (+ convert dialog), ApplicationDrawer,
  VisaCaseDrawer, AddRecordDialog, DocViewer, and both request dialogs. The
  boss-modal clipping bug is now fixed **system-wide**. Any NEW full-screen
  overlay should use `<Overlay>` — do not hand-roll `fixed inset-0` in a page
  that lives inside `<main>`.
- Branded `app/error.tsx`; agent loading skeleton. Raw enums humanised across
  visa sub-statuses (`humanizeStatus`), submitted_by, fee/commission statuses,
  plan sign-off roles, doc review status, track ids. Follow-up dates as
  "Overdue 3 days / Due 21 Jul". Empty states rewritten. Emoji removed. Brand
  name unified to "Premium Language Centre".

---

## Gotchas / conventions reinforced this session

- **The `<main>` transform trap.** `.rise-on` (globals.css) + fill-mode both keeps
  a `transform` on `<main>` forever, so ANY `position:fixed` overlay rendered
  inside a page is clamped to the content column, not the viewport. Always wrap
  such overlays in `<Overlay>` (portals to body).
- **`profiles` RLS is self-or-admin read.** Any console surface that needs to list
  *other* users (agents, staff) from a non-admin role must use a service-role
  loader gated by role in code (`listUsersPrivileged`, `listAgentArrangements`),
  not the user client — else the list comes back empty with no error.
- **Finance/agreement writes are service-role behind a role gate**, not RLS — the
  established pattern (a user-scoped write silently no-ops under a mismatched RLS
  policy). Every new mutation follows this.
- **PDFs:** fonts load from `lib/pdf/fonts/` via `path.join(process.cwd(), …)`;
  `Great Vibes` (OFL) was added there for signatures. `@react-pdf/renderer` has
  **no `PageOrientation` export** — pass `orientation="landscape"` as a string.
- **Server-action files (`"use server"`)** may export types/interfaces (erased),
  but only async functions as runtime values — matches existing pattern.

---

## Open items (not urgent, deliberately deferred)

1. **Student receipt / statement PDF** — finance has no generated receipt; the
   only receipt is an optional QuickBooks upload, and there's no per-student
   fee-vs-payment reconciliation view. **Most valuable next feature.**
2. **Shared status-label maps are English-only** (stage/visa/doc/fee-type names)
   across the whole console — so the Arabic UI shows translated chrome with
   English values. Translating these is a separate cross-cutting pass.
3. **Mobile card layouts** for the two densest tables (academic
   `min-w-[920px]` with inline editors; finance inline payment editor) — they
   scroll horizontally today.
4. **NotificationBell marks everything read at once** on open, not per-item.
5. Fee/milestone config (`STAGE_FEES`, `STAGE_MILESTONE` in
   `applications-shared.ts`) is still stubbed ("Tune to PECSB's real process") —
   auto-scaffolded fee amounts are placeholder zeros by design.
6. The agent portal's embedded **ProgrammeFinder / IntakeCalendar** remain
   English (deep shared admin tools, out of the translation scope).

---

## Key files touched (quick map)

- Agreements: `lib/admin/agreements-shared.ts` (types + `normalizeScheme` +
  `schemeSummary` + tier helpers), `lib/admin/agreements.ts` (loaders),
  `app/admin/agreement-actions.ts` (all mutations),
  `components/admin/AgreementsManager.tsx` (finance UI),
  `components/agent/AgentAgreementCard.tsx` / `AgentAgreementRequest.tsx` /
  `AgreementChangeRequest.tsx` (agent UI), `app/agent/agreement/page.tsx`.
- PDFs: `lib/pdf/AgentAgreementPdf.tsx`, `lib/pdf/AgentCertificate.tsx`,
  `lib/pdf/EnglishOfferLetter.tsx`; routes under `app/api/agreement/*` and
  `app/api/offer/route.ts`.
- Commission automation: `lib/admin/automation.ts` (`resolvePayout`).
- Boss: `components/admin/ExecAgentArrangements.tsx`, `app/admin/(console)/exec/page.tsx`.
- Audit money/gates: `lib/admin/exec.ts`, `app/admin/(console)/reports/page.tsx`,
  `lib/admin/gates.ts`, `app/admin/finance-actions.ts`,
  `app/admin/application-actions.ts`.
- Overlay: `components/ui/Overlay.tsx` (+ every drawer/dialog now uses it).
