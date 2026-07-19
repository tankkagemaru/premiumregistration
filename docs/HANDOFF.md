# Handoff — read this first

Context for continuing this project in a fresh session (e.g. a new machine).
Pairs with `docs/PLATFORM.md` (architecture), `docs/BACKLOG.md` (what's left),
`docs/DEPLOYMENT.md` (deploy steps), `supabase/README.md` (DB), and `CLAUDE.md`
(original build spec). **Read those + this to get up to speed.**

_Last refreshed 2026-07-05, the evening before the stakeholder demo._

> **Dated session handovers (newest first) — read the latest for what changed since:**
> - `docs/HANDOFF-2026-07-19-agreements-certificate-offer-audit.md` — agent
>   agreement system (request → due diligence → sign → PDF → certificate →
>   change requests), per-agent commission automation, revised offer letter,
>   full department audit + remediation (money/gate fixes, handoffs, workflow
>   verbs, system-wide overlay-portal + polish). Ends at commit `b5dcb2c`.
> - `docs/HANDOFF-2026-07-13-departments-and-agent.md` — department reviews + agent portal.
> - `docs/HANDOFF-2026-07-12-review-first-registration.md` — review-first registration flow.

## What this is
`regist·er` — PECSB's public registration site **and** the back-office platform
behind it: an international-student recruitment & admissions system. Marketing →
enquiry → application → offer → visa/EMGS → finance → enrolment → monitoring,
plus a recruitment-partner (agent) network and a public status portal.
PECSB = recruiter **and** English provider (PLC); it forwards applications to
partner universities (commission) and runs its own English courses.

## Status: LIVE & demo-ready
- Production: **https://premiumregistration.vercel.app** (Vercel, auto-deploys on push to `main`).
- Supabase DB provisioned; **27 tables**, RLS on all. Schema lives in
  `supabase/schema-platform.sql` + incremental `supabase/schema-08…18*.sql`;
  further changes were applied live via the Supabase MCP (`apply_migration`).
- **Email works** (Brevo transactional API — `BREVO_API_KEY` + `ADMIN_ALERT_EMAIL`).
  Admin new-lead alert + applicant auto-reply w/ tracking code, branded template.
  Note: Brevo's "Authorised IPs" security feature must stay **off** (or whitelist
  the Vercel egress IP) or it 401s. Resend is still supported as a fallback provider.
- Turnstile degrades gracefully if keys are unset (widget hidden). Verify the
  current key state in Vercel → Env before relying on spam protection.
- **9 demo accounts** exist for the demo (boss/marketing×2/admissions/visa/
  finance/academic/counsellor/agent) — funny names, one shared password. See the
  `demo-accounts-seeded` auto-memory. **Rotate/disable them after the demo.**

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind **v4** (tokens in
`app/globals.css` `@theme`, not a JS config). Supabase (Postgres + Auth + Storage
+ RLS). react-hook-form + zod. @react-pdf/renderer (offer letters). Brevo/Resend
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
3. **Client/server split.** `-shared.ts` files (`leads-shared`, `applications-
   shared`, `visa-shared`, `finance-shared`, `console-i18n-shared`, `exec-shared`,
   …) hold pure types/constants so **client** components import them without
   pulling the server-only Supabase client (`next/headers`). The non-`-shared`
   file adds the queries and re-exports the shared one. Respect this split.

## Design system & branding (don't undo these)
- Tokens ported from the PECSB attendance app (`qrattendance`). Cream `#f4ece3`,
  paper `#fdf9f1`, ink `#1b1612`, ink-soft `#4a4239`, **ink-muted `#6e655c`**
  (deliberately darkened from qrattendance's `#8a7e70` for WCAG AA — don't
  restore), border-warm `#e8dfd2`, brand-red `#a8242e`, brand-gold `#b78850`.
  Fonts: Playfair Display (serif, headings weight 500) + Inter (sans) + JetBrains
  Mono, via `next/font`. Full spec: `CLAUDE.md` + the tokens in `app/globals.css`.
- **Primary button is INK, not red** (qrattendance idiom). Brand-red = the
  public marketing CTA + accents. Gold/green/red for status. Dark mode ships
  (brand-derived warm near-black; toggle persists).
- **`regist·er` is the site's name/brand.** The site is the PECSB umbrella
  (English + universities + corporate) — **NOT** "Premium Language Centre"-specific.
- **After editing `@theme` tokens in globals.css, RESTART the dev server** —
  Turbopack serves stale CSS on HMR for `@theme` changes.

## i18n (two systems — don't conflate)
- **Public site**: `lib/i18n/` — en / zh / ar (RTL) / ja. `en.ts` is source of
  truth. `useI18n().t()` dot-paths; persists to localStorage; sets `<html lang/dir>`.
  Add every new key to all four files. Proper nouns aren't translated.
- **Staff console**: `lib/admin/console-i18n*` — **en / ar** only, cookie-selected
  (`console-lang`), RTL-aware shell. Scope today = console chrome/nav + Dashboard
  + Executive (for the Arabic-reading boss). Extend the dict as more screens need it.

## Module / route map
Public: `/` (landing), `/register` (adaptive multi-step form; passport/ID now
required for student tracks), `/status` (passport-or-email + access code →
progress ring, offer download + acknowledgement).
Agent portal: `/agent` (referral link, own students, commission, refer-a-student).
Admin console (`/admin`, role-gated nav, **stage sub-tabs** on most modules):
Dashboard, Executive (boss — aggregates + quick status lookup → read-only student
popout), Calendar (shared, incl. visa milestones), Intakes (program calendar +
MY holidays), Leads, Applications (Students/Corporate lanes, list/board),
Requests (cross-team handoffs), Follow-ups, Academic (class dates + fee gate +
study-plan builder), Finance (fees/payments/commission rules + billable catalogue),
Visa (EMGS cases — **read-open to every team**, edit = visa/admin), Reports,
Agent codes, Users, Logs (audit), **Architecture** (admin-only workflow flowchart),
Settings. Header: live clock, EN/ع toggle, dark-mode, red pending-items indicator,
notification bell (realtime + chime); once-a-day urgent-items popup on sign-in.
API: `/api/register`, `/api/status`, `/api/offer` (A4 PDF), `/api/admin/doc/[id]`
+ `/api/admin/appdoc/[id]` (audited signed view/download), `/api/cron/digest`.

## Roles (RBAC)
`admin`, `boss` (exec aggregates only — no row access under RLS; exec reads go via
the service role), `marketing`, `admissions`, `visa`, `finance`, `academic`,
`counsellor`, `staff`, `agent` (own students, scoped by RLS), + public `student`
via `/status`. Nav filters by role; pages also `requireRole` server-side. Every
mutating action + PII access writes to `audit_logs` via `logAudit()`.

## What's built (the big pieces, beyond the original spec)
Stage sub-tabs across modules; the **study-plan handover chain** (Admissions
drafts → Visa/Academic verify with sign-offs → finalise, with return-to-draft,
each handover raising a Request); **commission rules engine** + **billable-items
catalogue** + invoice/receipt attach; **offer letters** (English auto-PDF +
university upload) with student acknowledgement; **boss role + Executive**
overview, quick status lookup and read-only student popout; **program intake
calendar** (PEP levels / exam prep / summer camp) with MY public holidays and
learning-day counting; **document rules engine** (by track/level/nationality/
stage) + ad-hoc requests; visa case management **visible to all**; agent codes
tied to agent logins + master hierarchy; notifications wired to Supabase realtime
(+ chime + pending indicator + sign-in popup); dark mode; EN/العربية console.

## Deploy gotchas (learned the hard way)
- Vercel **Framework Preset MUST be "Next.js"** — imported as "Other" once and
  404'd every route despite a green build.
- `NEXT_PUBLIC_*` env vars bake in at **build** time → **redeploy** after any env
  change or the app silently runs in mock mode in prod.
- `appUrl` falls back to `VERCEL_PROJECT_PRODUCTION_URL` when `NEXT_PUBLIC_APP_URL`
  is unset (so email/referral/OG links aren't `localhost`). Set the public var
  only to override with a custom domain.
- The MCP servers are in `.mcp.json` (committed); logins are per-machine → run
  `/mcp` and re-authenticate supabase + vercel on a new PC.

## To resume
`git clone` → `npm install` → open in Claude Code → `/mcp` (re-auth supabase +
vercel) → `npm run dev`. For local dev against the real DB, add `.env.local` from
`.env.example`; otherwise it runs in mock mode, which is fine for UI work.
See `docs/BACKLOG.md` for what's left (mostly post-demo hardening + polish now).
