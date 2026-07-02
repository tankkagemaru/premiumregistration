# PECSB Registration Site — Build Spec

Build spec for Claude Code. This is a public-facing lead-capture / registration site for
Premium Entrepreneur Consultant Sdn Bhd (PECSB) / Premium Language Centre (PLC), to be
pointed at from marketing campaigns.

## Goal

A single editorial-style web app where a prospect can register for any combination of:
English program, university placement (study in Malaysia), and/or corporate training.
Comprehensive in aggregate, minimal per person. Every submission becomes one row in Supabase
and pings the admin.

## Stack

- Next.js 15 (App Router) + TypeScript, deployed to Vercel
- Tailwind CSS for styling
- Supabase — Postgres, Storage (private), RLS
- react-hook-form + zod for forms and validation
- Resend for transactional email
- Cloudflare Turnstile for spam protection
- Google Drive API (service account → Shared Drive) for document mirroring

---

## Design system — editorial

Match the existing PECSB `pecsb-attendance` app exactly so the two products feel like one
family. **Pull the real hex values and font imports from that repo's Tailwind config** — the
values below are approximations from screenshots, use them only as a fallback.

- Page background: warm cream, approx `#F4EDE1`
- Cards / panels: off-white, approx `#FAF6EF`
- Accent: dark crimson / maroon, approx `#8B2635`
- Primary text: near-black, approx `#2A2523`
- Muted labels: warm brown-grey, approx `#8A8178`
- Hairline borders: thin, low-contrast; generous whitespace
- Display / headings: a serif face (Playfair Display / Cormorant feel)
- Body / UI: a clean sans (Inter or similar), loaded via `next/font`
- Labels: small-caps, letter-spaced (e.g. `PREMIUM LANGUAGE CENTRE`)
- Nav / section markers: numbered `01`, `02` with letter-spacing; active item underlined in crimson
- Sentence case everywhere except the intentional small-caps labels
- Mobile-first — most traffic will be mobile ads

---

## Core UX — adaptable multi-select form

The form is **one composable flow**, not separate paths. Structure:

1. **What do you need?** — multi-select toggle chips: English program / Universities /
   Corporate training. Any combination, including all three. At least one required.
2. **About you** (shown once, shared across all tracks): full name, email, phone, WhatsApp,
   nationality. Never ask contact details more than once.
3. **Conditional sections** — render only the sections whose chip is selected (see field
   breakdown below).
4. **Review & submit** — summary of what they entered, then submit.

Progress bar reflects only the sections actually selected, so a person who picks English alone
sees ~8 fields and a short bar; someone who picks all three sees more, but they chose more.
Each conditional section is 1–2 screens, ~5 fields per screen.

### Field breakdown

**Shared (always):** full_name, email, phone, whatsapp, nationality.

**English program** (`details.english`):
- program: General English | Business English | IELTS Prep | Corporate/other
- current_level: self-rated CEFR (A1–C2) OR a "Not sure? Take our free placement test" link
  that opens the existing `premiumPlacementTest` app (link out — do not embed in v1)
- preferred_start_date
- preferred_schedule (weekday/weekend/evening/intensive)

**Universities** (`details.university`):
- home_country
- current_education_level
- intended_field
- preferred_universities (multi-select from the PECSB partner list — seed as a config array)
- intake_preference
- scholarship_interest (y/n)
- document uploads: passport, transcript(s) — see Uploads below

**Corporate training** (`details.corporate`):
- company_name
- contact_role
- headcount
- training_need (free text / category)
- hrdf_claimable (y/n)
- preferred_timeline

### Marketing attribution (capture silently on every submit)
utm_source, utm_medium, utm_campaign (from query string), document.referrer, and an optional
`agent_code` field (ties a lead to a specific agent, e.g. via a `?agent=` param or a small
input). Store on the registration row.

---

## Data model

One row per person. `tracks` is an array; `details` is keyed by track so it stays flexible.

```sql
create table registrations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  tracks       text[] not null,            -- {english} | {university} | {english,corporate} ...
  status       text not null default 'new',-- new | contacted | enrolled | dropped
  -- shared contact
  full_name    text not null,
  email        text not null,
  phone        text,
  whatsapp     text,
  nationality  text,
  -- marketing attribution
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  agent_code   text,
  -- track-specific payloads: { english:{...}, university:{...}, corporate:{...} }
  details      jsonb not null default '{}'::jsonb
);

create table registration_documents (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  kind            text not null,           -- passport | transcript | other
  storage_path    text not null,           -- path in Supabase Storage
  drive_url       text,                    -- populated after mirror to Shared Drive
  created_at      timestamptz not null default now()
);
```

Note: if you later need per-track status on the *same* lead (English enrolled while university
still pending), split status into a `registration_tracks` child table. Not needed for v1.

---

## Security model — server-mediated writes

Do **not** let the browser write to the DB with the anon key. All writes go through a Next.js
API route:

1. Client submits form + Turnstile token.
2. API route verifies the Turnstile token server-side.
3. API route inserts the registration using the **service_role** key (server-only).
4. For each file, the API route returns a **signed upload URL** scoped to that registration's
   path in a **private** Storage bucket (`registration-docs`).
5. Client PUTs files directly to Storage via those signed URLs (bypasses Vercel's ~4.5MB
   function body limit).

### RLS
```sql
alter table registrations enable row level security;
alter table registration_documents enable row level security;

-- No anon access at all. service_role bypasses RLS (server inserts).
-- Admin (authenticated) can read everything:
create policy "admin read registrations" on registrations
  for select to authenticated using (true);
create policy "admin read documents" on registration_documents
  for select to authenticated using (true);
```

Storage bucket `registration-docs` must be **private**. Downloads for the admin use short-lived
signed URLs. Passports/transcripts are sensitive PII — never a public bucket, never
"anyone with the link".

---

## Google Drive mirroring (Shared Drive)

PECSB is on Google Workspace for Education, so use a **Shared Drive** (service accounts have no
personal Drive quota; a Shared Drive folder solves this).

Setup (one-time, in Google Cloud + Admin):
- Create a service account, enable the Drive API.
- Create a Shared Drive folder for registrations; add the service account as a Content Manager.
- Download the service account JSON; put the values in env vars (below).

Flow: after files land in Supabase Storage, a background job (Supabase Storage webhook → edge
function, or a Vercel cron) downloads each new file, uploads it into the Shared Drive folder via
the Drive API, and writes the resulting Drive link back to `registration_documents.drive_url`.
Keep this modular — the core registration flow must work even if the mirror is added later
(Phase 4).

Keep the Drive folder itself private to the org — do not enable external link sharing.

---

## Notifications

Three channels, tuned to avoid alert fatigue:

- **In-app** — a bell with unread count, backed by a `notifications` table, realtime via
  Supabase subscriptions. Events: lead assigned to you, document uploaded on your lead,
  follow-up due, lead reassigned, status changed by someone else.
- **Email (Resend)**:
  - Instant admin alert on every new lead — name, tracks, contact, source, link to the record.
  - Applicant auto-reply — branded, PLC house style.
  - Daily digest per staff member — new leads, follow-ups due today, documents pending review.
    (The digest is what keeps instant alerts from becoming noise.)
- **WhatsApp**:
  - Outbound, free, now: click-to-chat `wa.me` links from lead detail with a prefilled message.
    No API needed.
  - Inbound push (optional, later): new-lead notification to a staff WhatsApp via the WhatsApp
    Business Cloud API. Needs a Business API number — treat as a Phase 5 add-on.
- **Per-user preferences** (`profiles.notify_prefs`): instant vs digest, which events, which
  channels.

---

## Admin management console

A lead-management console (lightweight CRM), not a table viewer. Editorial styling throughout —
same tokens as the attendance app, same stat-card and Reports layouts.

**1. Dashboard** — the landing screen. Stat cards (new leads today / this week, by track,
conversion rate). Funnel: new → contacted → enrolled. Source breakdown (campaign + agent).
A "needs attention" panel: unassigned leads, overdue follow-ups, documents awaiting review.
Recent activity feed.

**2. Leads** — the core, two interchangeable views:
- Table view (like Reports): sortable, dense, scannable.
- Pipeline (kanban): columns = status stages, drag a card to advance it.
Filters: track, status, source/agent, nationality, date range, assigned staff, document status.
Full-text search (name / email / phone). Saved filters. Bulk actions: assign, change status,
tag, export selected.

**3. Lead detail** (side drawer, so you never lose the list):
- Full profile: shared contact + each selected track's details + attribution + agent code.
- Documents: preview, signed download, Drive link, per-doc review status (pending / verified /
  rejected).
- Timeline: every status change, note, email, logged call, doc request — who and when.
- Internal notes (staff-only, never shown to the applicant).
- Assignment (owner) + next action + follow-up due date.
- Quick actions: send templated email, mark contacted, log a call, request missing docs, open
  WhatsApp (`wa.me`).

**4. Follow-ups** — a task layer so leads don't go cold. Each lead carries next-action + due
date + owner. "My follow-ups" view: due today, overdue, upcoming. This is what makes it a
management system rather than a database.

**5. Settings** — partner university list, program list, email templates, agent codes,
notification defaults, track toggles (turn corporate on/off).

**6. Reporting / export** — CSV of any filtered view; simple reports: leads by source,
conversion by track, agent performance.

**UX principles**: side-drawer detail (keep list context), optimistic updates, fast filters,
clear empty/loading states, muted crimson/cream status colours (not garish traffic-light hues),
keyboard-friendly, responsive down to phone for on-the-go triage.

---

## Roles & permissions (RBAC)

Roles live on a `profiles` table linked to Supabase Auth; enforced by RLS.

- **Admin** (you, Madam Waty): everything — leads, users, settings, exports.
- **Staff / counsellor**: manage leads (all, or assigned-only — configurable), log activity,
  send emails; no user management or settings.
- **Agent** (optional): a restricted portal showing only leads whose `agent_code` matches
  theirs — lets referral partners (e.g. Celia, Felix) track their own leads and status, tied to
  the commission structure. The `agent_code` hook is already on the row; build the portal when
  you want it.

### Admin data model (additions)

```sql
-- staff / users (id = auth.uid())
create table profiles (
  id           uuid primary key references auth.users(id),
  full_name    text,
  email        text,
  role         text not null default 'staff',   -- admin | staff | agent
  agent_code   text,                             -- for role = agent
  notify_prefs jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- activity timeline (one row per event)
create table lead_events (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  actor_id        uuid references profiles(id),
  type            text not null,   -- note | status_change | email | call | doc_request | assignment
  body            text,
  meta            jsonb,
  created_at      timestamptz not null default now()
);

-- in-app notifications
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id),
  type       text not null,
  payload    jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- additions to registrations
alter table registrations
  add column assigned_to     uuid references profiles(id),
  add column next_action     text,
  add column next_action_due date,
  add column tags            text[];

-- additions to registration_documents
alter table registration_documents
  add column review_status text not null default 'pending'; -- pending | verified | rejected
```

RLS: admin full access; staff read/update registrations (all, or assigned-only per config);
agent reads only rows where `agent_code = (select agent_code from profiles where id = auth.uid())`.

---

## Build phases

1. **Foundations** — Next.js + Tailwind + design tokens copied from `pecsb-attendance`; Supabase
   project + tables + RLS; deploy skeleton to Vercel.
2. **Landing + composable form** — editorial landing, multi-select intent, shared contact block,
   conditional sections, review, client-side validation.
3. **Submit pipeline** — Turnstile verify + service-role insert API route; Storage bucket +
   signed-URL uploads; confirmation page.
4. **Core admin + notifications** — Supabase Auth + `profiles`/RBAC; leads table + lead-detail
   drawer; status, assignment, internal notes, activity timeline; instant email alert +
   applicant auto-reply; in-app notifications; `wa.me` links; CSV export.
5. **Advanced admin** — dashboard analytics, kanban pipeline view, follow-up/tasks view,
   document review workflow, daily digest email, settings screens.
6. **Integrations + polish** — Shared Drive mirror job; UTM capture, thank-you pages, OG/SEO,
   analytics. Optional: agent portal, WhatsApp Business API push.

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # admin auth client only
SUPABASE_SERVICE_ROLE_KEY=            # server only — never exposed to client
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
RESEND_API_KEY=
ADMIN_ALERT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GDRIVE_SHARED_DRIVE_FOLDER_ID=

# optional — WhatsApp Business Cloud API push (Phase 6)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

---

## Assumptions baked in (flip if wrong)

- Corporate track **is included** in v1 as a selectable chip (easy to hide by removing it from
  the chip config).
- Placement test **links out** to the existing `premiumPlacementTest` app rather than embedding.
- University track = **inbound** international students studying at Malaysian partner universities.
- No public accounts; anonymous submit, admin login only.
- Staff see **all** leads by default; assigned-only visibility is a config flag, not the default.
- Agent portal is **off** in v1 (the `agent_code` hook exists; build the portal when needed).
- WhatsApp is **click-to-chat links** in v1; Business API push is an optional later add-on.
