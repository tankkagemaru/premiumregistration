# Handoff — read this first

Context for continuing this project in a fresh session (e.g. a new machine).
Pairs with `docs/PLATFORM.md` (architecture), `docs/BACKLOG.md` (what's next),
`docs/DEPLOYMENT.md` (deploy steps), `supabase/README.md` (DB), and `CLAUDE.md`
(original build spec). **Read those + this to get up to speed.**

## What this is
`regist·er` — PECSB's public registration site **and** the back-office platform
behind it: an international-student recruitment & admissions system. Marketing →
enquiry → application → offer → visa/EMGS → finance → enrolment → monitoring,
plus a recruitment-partner (agent) network and a public status portal.
PECSB = recruiter **and** English provider (PLC); it forwards applications to
partner universities (commission) and runs its own English courses.

## Status: LIVE
- Production: **https://premiumregistration.vercel.app** (Vercel, auto-deploys on push to `main`).
- Supabase DB is set up (schema applied via the Supabase MCP as migrations
  `01_core`..`06_tighten_docs_update_policy`); 17 tables, RLS on all.
- A superadmin account exists (created in Supabase Auth, `profiles.role='admin'`).
- Turnstile + Resend keys are **not** set yet → spam widget hidden, email no-ops
  (both degrade gracefully). Adding them is in the backlog.

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind **v4** (tokens in
`app/globals.css` `@theme`, not a JS config). Supabase (Postgres + Auth + Storage
+ RLS). react-hook-form + zod. @react-pdf/renderer (offer letters). Resend
(email). Cloudflare Turnstile. Deployed on Vercel. Package manager: npm.

## The 3 things you MUST understand about the code

1. **Dev-fallback pattern.** Every data module checks `authConfigured`
   (`= !!(NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY)`). When
   Supabase env is **absent** (local dev without `.env.local`), the app returns
   **mock data** and **bypasses auth** (getProfile returns a dev admin). When
   present (production), it hits the real DB + real RLS. So locally it "just
   works" with fake data; that's intentional. Server actions no-op in dev.
2. **Denormalised display fields.** `applications`/`fees`/`commissions`/
   `visa_cases` carry `student_name`, `agent_name`, etc. copied on creation, so
   list reads are a plain `select *` matching the flat TS types. Do NOT
   reintroduce `...!inner()` joins — the earlier versions did and would've
   returned undefined names live. Keep denorm fields in sync on writes.
3. **Client/server split.** Files like `lib/admin/leads-shared.ts`,
   `applications-shared.ts`, `users-shared.ts`, `requests-shared.ts`,
   `finance-shared.ts`, `visa-shared.ts` hold pure types/constants so **client**
   components can import them without pulling the server-only Supabase client
   (`next/headers`). The non-`-shared` file adds the queries. Respect this split.

## Design system & branding (don't undo these)
- Tokens ported from the PECSB attendance app `github.com/tankkagemaru/qrattendance`
  (`src/index.css`). Cream `#f4ece3`, paper `#fdf9f1`, ink `#1b1612`, ink-soft
  `#4a4239`, **ink-muted `#6e655c`** (deliberately darkened from qrattendance's
  `#8a7e70` for WCAG AA — don't restore), border-warm `#e8dfd2`, brand-red
  `#a8242e`, brand-gold `#b78850`. Fonts: Playfair Display (serif, headings
  weight 500) + Inter (sans) + JetBrains Mono, via `next/font`.
- **Primary button is INK, not red** (qrattendance idiom). Brand-red = the
  public marketing CTA (`brand` variant) + accents. Gold/green/red for status.
- **`regist·er` is the site's name/brand**, shown in the header. The site is the
  PECSB umbrella (English + universities + corporate) — it is **NOT** "Premium
  Language Centre"-specific (PLC only services English). Don't reintroduce PLC as
  the site title.
- **After editing `@theme` tokens in globals.css, RESTART the dev server** —
  Turbopack serves stale CSS on HMR for `@theme` changes (bit us twice).

## i18n
`lib/i18n/` — en / zh (中文) / ar (العربية, RTL) / ja (日本語). `en.ts` is the
source of truth; `Dictionary = typeof en` (en is NOT `as const`). `useI18n().t()`
with dot-paths; persists to localStorage; sets `<html lang/dir>` (Arabic → rtl).
**When adding UI copy, add the key to all four locale files.** Proper nouns
(universities, countries, exam names) are not translated. Status + agent portals
are still English-only (backlog).

## Module / route map
Public: `/` (landing), `/register` (adaptive multi-step form), `/status`
(passport-or-email + access code → progress ring). Header/footer link to Check
status / Agent portal / Staff login.
Agent portal: `/agent` (referral link `register?agent=CODE`, own students,
commission).
Admin console (`/admin`, role-gated nav): Dashboard, Leads, Applications
(stage-engine kanban + drawer), Requests (cross-team handoffs/blockers),
Follow-ups (mine/all), Academic (class dates + fee-cleared gate), Finance
(fees/payments/commission), Visa (EMGS cases + expiry), Reports, Users
(superadmin), Logs (audit), Settings.
API: `/api/register` (Turnstile + service-role insert + signed uploads + email),
`/api/status`, `/api/offer` (A4 PDF), `/api/admin/doc/[id]` (signed download),
`/api/cron/digest`.

## Roles (RBAC)
`admin` (superadmin — users + logs + all), `marketing`, `admissions`, `visa`,
`finance`, `academic`, `counsellor`, `staff`, `agent` (own students, scoped by
RLS), + public `student` via `/status`. Nav filters by role; Finance/Visa/Users/
Logs also enforce `requireRole` server-side. Every mutating action + PII access
(doc downloads, offer generation) writes to `audit_logs` via `logAudit()`.

## Deploy gotchas (learned the hard way)
- Vercel **Framework Preset MUST be "Next.js"** — it imported as "Other"
  (`framework: null`) and 404'd every route despite a green build.
- `NEXT_PUBLIC_*` env vars bake in at **build** time → **redeploy** after any env
  change or the app silently runs in mock mode in prod.
- Supabase↔Vercel integration syncs `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` +
  `SUPABASE_SERVICE_ROLE_KEY` to Production.
- The MCP servers are in `.mcp.json` (committed); logins are per-machine → run
  `/mcp` and re-authenticate supabase + vercel on a new PC. Operational IDs
  (Supabase project ref, Vercel project/team) are in `.mcp.json` / discoverable
  via the Vercel MCP; the admin email is the one you created in Supabase Auth.

## What's next
See `docs/BACKLOG.md`. The near-term P0/P1: add Turnstile + Resend keys, run the
live smoke-test (real submit → real row, each role, status portal), deliver
access codes to students on application creation, durable rate-limit store, and
the **automation layer** (stage changes / requests firing notifications + fees +
commission accrual — the biggest gap vs. commercial CRMs). University/conditional
offer letters, portal i18n, bulk actions, payment gateway are later.

## To resume
`git clone` → `npm install` → open in Claude Code → `/mcp` (re-auth supabase +
vercel) → `npm run dev`. For local dev against the real DB, add `.env.local` from
`.env.example` (values in Vercel → Settings → Env Vars); otherwise it runs in
mock mode, which is fine for UI work.
