# Workflow redesign — team-based pipeline (proposal)

Status: **proposal, awaiting confirmation of the stage taxonomy before migration.**
Decisions taken (2026-07-11): (1) redesign stages around teams for the long term
[option 2]; (2) **hard gates** now, with an admin setting to relax to soft
warnings later; (3) Marketing sees a **simplified** visa status, not full EMGS detail.

## The problem
Today every team sees the same generic application stages (`application → review →
offer → accepted → visa → enrolled`) and the same pile of controls. Nobody's screen
tells them "here is *your* next step." Teams can wander into each other's workflow.
The fix: an explicit **owning team** per stage, **hard handoff gates** between them,
and a per-role "Your next step" panel that shows only what that team must do now.

## Tracks & multiple universities (confirmed 2026-07-11)
- **One application per track.** A student doing English + University has two
  independent pipelines on their record, each labelled by track. Stage 3 is
  track-aware: "Offer letter" (PECSB auto-PDF) for English, "OL/COL" for university.
- **University = one application per `(university, program)` choice.** This covers
  both asks in one model: *many universities / different programs* → many rows with
  different `(target_institution, program_name)`; *one university / many programs*
  → many rows, same institution, different `program_name`. They run Registration →
  Admissions → Offer/OL·COL **in parallel**; the student accepts one → it continues
  to Visa/Enrolled, the rest are marked **not selected**.
- **Student-level, done once and shared:** registration fee and the visa/EMGS case.
  Paying the registration fee unlocks all of that student's university choices to
  advance out of stage 1; visa runs once, for the accepted choice.

## Proposed application pipeline (student lane)
Leads (the `registrations` table) stay owned by **Marketing**: contact → qualify →
record what's being sold (finance catalogue) → optional preliminary study plan.
When the student wants to register, the lead **converts to an application** at
stage 1. From there:

| # | stage id | label | owner | what happens | EXIT gate (hard) |
|---|----------|-------|-------|--------------|------------------|
| 1 | `registration` | Registration | Finance | Marketing requests invoice (Finance) + offer letter (Admissions generates it). Registration fee invoiced & paid. | **Registration fee = paid** |
| 2 | `admissions` | Admissions review | Admissions | Verify all documents (per doc-rules); finalise study plan (with Academic for English); for university, liaise on OL/COL. | Required docs verified **and** study plan finalised |
| 3 | `offer` | Offer / OL·COL | Admissions | OL/COL (university) or offer letter (English) sent to student/agent; collect remaining fees (tuition, resources, visa). | OL·COL sent **and** remaining fees cleared **and** Admissions flags "ready for visa" |
| 4 | `visa` | Visa / EMGS | Visa | *(international only)* Check documents, run EMGS to student pass. | Student pass issued |
| 5 | `enrolled` | Enrolled | Academic | Class dates set; student starts. | Course begins |
| 6 | `active` | Active | Academic | In progress. | Course ends |
| 7 | `completed` | Completed | — | Done. | — |

Local (Malaysian) students skip stage 4 (`visa`) — reusing the existing
`internationalOnly` lane flag. Corporate keeps its own separate lane unchanged.

## Implementation approach — two ways to ship the same UX
The team-owned experience (labels, owners, gates, per-role panel) is the same either
way. The only difference is the internal `applications.stage` string values.

**A. Layered (recommended, safe here).** Keep the existing stage IDs; add a central
`STAGE_TEAM` map (id → owner, track-aware label, exit gate). No data migration, fully
additive, nothing else breaks. Raw IDs (`review`, `accepted`…) stay internal; nobody
sees them. Rename them later in an interactive session where `tsc` + the app can verify.

**B. Full rename now.** Rename stage IDs to `registration/admissions/offer/visa/…`
and migrate every live row (mapping below). Cleaner internals, but a ~40-file
un-typecheckable sweep + an irreversible live migration — high risk without a local
toolchain to verify.

Migration map if we take B (old → new), applied once via the Supabase MCP:

| old | new |
|-----|-----|
| `application` | `registration` |
| `review` | `admissions` |
| `offer` | `offer` |
| `accepted` | `visa` (international) / `enrolled` (local) |
| `visa` | `visa` |
| `enrolled` | `enrolled` |
| `active` | `active` |
| `completed` | `completed` |

## Gates — hard now, switchable later
New admin setting `workflow.gate_mode` in `app_settings` = `hard` (default) | `soft`.
- **hard**: the "advance stage" control is disabled with a reason until the gate is met.
- **soft**: advancing is allowed but shows a warning banner naming the unmet gate.
Toggle lives on the Settings screen (admin only).

## Per-role "Your next step" panel
On each application, a single panel driven by `(stage, owner, role, gates)`:
- If you're the **owning team** for the current stage: shows the checklist for this
  stage and the one primary action ("Mark registration fee paid", "Generate offer
  letter", "Send OL/COL", "Flag ready for visa", "Start EMGS"…). Redundant controls
  hidden.
- If you're **not** the owner: read-only "Currently with {team} — waiting on {gate}."
- Cross-team asks still go through the existing Requests/handoff mechanism.

## Marketing's visa view (simplified)
Marketing loses the full Visa/EMGS screen. Instead, the student record shows a
compact visa **status line** (stage label + pass expiry flag) — enough to answer a
student, none of the EMGS internals.

## Build sequence (each increment separately deployable + verifiable)
1. ✅ **DONE — Stage rename + owner metadata + migration.** Decision was "full rename
   now". In practice only 3 ids changed: `application→registration`, `review→admissions`,
   `accepted` removed (splits to `visa`/`enrolled` by residency). `offer/visa/enrolled/
   active/completed` kept ids; corporate entry `application→enquiry`. Owner metadata added
   to every stage. Migration: `supabase/schema-21-stage-rename.sql` — **must run with the
   deploy** (back-compat labels + buckets bridge the window, but the kanban board hides
   old-id cards until migrated). Files touched: applications-shared, applications, lead-
   create-actions, application-actions, applications/page, exec, status, academic/page,
   AcademicControls.
   → **Deploy + run migration 21 + eyeball before increment 2.**
2. `workflow.gate_mode` setting + Settings toggle + gate engine (hard now / soft later).
3. "Your next step" panel in the application drawer; hide non-owner controls; track-aware
   stage-3 labels (Offer letter / OL·COL).
4. Multiple `(university, program)` choices per student in the Add/convert flow + student
   record; "accept one, others not selected".
5. Marketing simplified visa view + nav/role tightening.
6. Sweep the other screens for redundant buttons/dropdowns.

> Note: this environment has no node/npm and the Supabase/Vercel MCPs aren't
> authenticated, so each increment is written here but **deployed + migrated + eyeballed
> by you** (or an interactive `/mcp` session). The migration in particular must be run
> against the live DB — it is not reversible.
