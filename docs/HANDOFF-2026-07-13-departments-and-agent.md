# Session handover — 2026-07-13 · "department reviews + agent portal"

A big role-by-role review + build session. Pairs with the master
`docs/HANDOFF.md` (read that first). This file covers **what changed on
2026-07-12→13 and what's still open**.

Everything below is **live on production** (auto-deploy on push to `main`,
verified green via the Vercel API each push). Latest work ends at commit
around `2b33d46`.

---

## Start here next time
1. **Boss login is a password mismatch, not a broken account.** `boss@premium.edu.my`
   (role `boss`, "Datuk Batman bin Superman") is confirmed + not banned — it just
   has a different password than the shared demo one. Reset it in Supabase Auth →
   Users if you need to log in as boss. (You can review the exec view as **admin**
   too — admin sees `/admin/exec`.)
2. **Agent resources are seeded with placeholder links** (they point to the app
   root). Replace them with real URLs on **Agent codes → Resources** (admin/marketing).
3. Optional polish still open: see "Open items" at the bottom.

---

## What shipped, by area

### Finance
- Role **dashboard** at `/admin` (collected/outstanding/commission, needs-attention,
  recent payments). **Price list & rules** moved to its own sidebar page
  (`/admin/pricing`). Commission rules are **editable** now (were read-only) +
  search on rules/billables. Root cause of "couldn't edit": commission-rule /
  billable writes used the user-scoped client and silently no-op'd under RLS —
  now service-role behind a finance gate.
- Inline **invoice preview** fixed (appdoc route proxies bytes with an inline
  content-type; uploads were octet-stream so the browser downloaded them).
- Read-only student popout is **viewer-aware** (finance sees fees+docs only).
- **Billable categories** (tuition / visa / markup / misc) on top of fee_type.

### Visa (biggest rework)
- **Dashboard** landing (cases in flight, attention, renewals, passes expiring).
- **Granular EMGS journey** (15 stages): EMGS doc submitted → review by EMGS →
  review by immigration → eVAL under process → eVAL given → arrival planning →
  eVISA application → eVISA received → arrived → health check-up done → health
  report received → submission to university → passport submission → sticker
  received → done. Same for English-with-visa and University.
- Stage control is a **stepper** (‹ Back / Advance ›), NOT a 15-option dropdown
  (a stray click could jump a case). Free jump behind a "Correct stage manually"
  toggle.
- Drawer fields are **progress-specific** (only the current phase's fields, with a
  "Show all fields" toggle). Arrival planning has a sub-checklist (health
  appointment / accommodation / airport pickup) in `visa_cases.checklist`.
- **Renewals** is its own sidebar nav (`/admin/visa?kind=renewals`); `visa_cases.kind`
  = initial | renewal | dependant. **Dependant** passes: "Add dependant" on a
  completed principal case → a dependant EMGS case (badged) on the same application.
- Visa can **flag EMGS / Immigration payments** → creates the unpaid fee + a
  Finance request. Picks from the **visa-category price list** (prefilled) or flags
  a custom one. New `immigration` fee type.
- Programmes finder removed from the visa nav.

### Academic
- **Dashboard** landing (to-plan, in-class, plans awaiting sign-off, intakes).
- Workspace is **English-track only** — university-only students skip academic.
- **Managed offerings** list (`english_offerings`) Academic edits on Intakes; the
  intake calendar's programme picker is driven by it (+ "Other (one-off)" naming).
- **Class-prep checklist** per English student (platform / class / materials /
  books) in `applications.class_checklist`.
- **"Request a programme"** form on Intakes (marketing/admissions → Academic).

### Counsellor
- **Merged into academic**: `getProfile` aliases `counsellor → academic`, so the
  two roles share one experience. Safe because RLS already grants counsellor
  everything academic has (same `has_role` arrays). (`lib/auth.ts`.)

### Boss / Exec
- **Dashboard** is now a **visual** at-a-glance (conversion ring, funnel bars,
  money, enquiries-by-track pie, running-late chips). **Executive** tab keeps the
  detailed tables. A **"New request"** button lets exec ask a team for clarification
  (added boss to `action_requests` RLS).

### UI polish (app-wide)
- **Sidebar nav icons** (every console item) + agent nav icons. Nav links
  stagger-rise in; page content rises in per navigation; clickable cards lift on
  hover; all disabled under `prefers-reduced-motion`. (`globals.css` +
  `ConsoleShell.tsx`.)

### Agent portal
- Clickable **progress ring → status pop-up** (stage, payment + outstanding fees
  with amounts, next action, awaiting docs, commission, **visa status**, and
  **team flags**).
- **Search + stage + payment filters** (`AgentStudents.tsx`).
- **Commission breakdown** bar (accrued / invoiced / paid).
- **Request a meeting** button → Marketing + Admissions.
- **Calendar** tab (read-only events & intakes).
- **Visa status per student** — fetched via service-role scoped to the agent's own
  app ids (agents have no RLS access to `visa_cases`); "Flagged" chip when the team
  marks an app `flag=action`.
- **Resources** section (marketing materials / documents / agreement) from the new
  `resources` table; admin/marketing manage it on Agent codes.

---

## Migrations applied live this session
- `visa_cases`: `checklist jsonb`, `kind text`; existing stages remapped to the
  granular model.
- `billable_items.category` (backfilled from fee_type).
- `english_offerings` table (seeded PEP / Exam Prep / Summer Camp / Special Cohort).
- `applications.class_checklist jsonb`.
- `action_requests` read/insert RLS: added `boss`.
- `resources` table (seeded placeholder links).

## Recurring gotchas (still true)
- **RLS silent-fail**: user-scoped writes no-op when the policy doesn't match. New
  finance/academic/marketing manageable-list writes go through **service-role**
  behind an explicit role gate. Keep doing that.
- `-shared.ts` client/server split. Denormalised display fields. Build = the check
  (no local npm) — every push verified green via the Vercel MCP.
- **Union-of-`as const`-tuples** breaks `.map` — pin a common return type (bit us
  once on `stagesForKind`).

## Open / optional items
- **Replace the seeded Resources links** with real URLs (Agent codes → Resources).
- The agent **"Flagged" chip** only shows when a student's app is `flag=action`
  (none in the current seed) — expected.
- Demo test-data created while verifying was cleaned up (visa renewal/dependant,
  EMGS test fee/request).
- Rotate/disable the demo accounts after the demo (shared password on a public URL)
  — still outstanding from the master handoff.
