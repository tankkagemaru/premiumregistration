-- =============================================================================
-- PECSB Registration — database schema (Phase 1 foundations)
-- Run in the Supabase SQL editor, or via `supabase db push` with the CLI.
-- Idempotent-ish: safe to re-run in a fresh project.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles (staff / users). id = auth.uid()
-- -----------------------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        text,
  role         text not null default 'staff',   -- admin | staff | agent
  agent_code   text,                             -- for role = agent
  notify_prefs jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Helper: current user's role / agent_code, used by RLS policies below.
create or replace function public.current_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.current_agent_code() returns text
  language sql stable security definer set search_path = public as $$
  select agent_code from profiles where id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- registrations — one row per person
-- -----------------------------------------------------------------------------
create table if not exists registrations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  tracks       text[] not null,             -- {english} | {university,corporate} ...
  status       text not null default 'new', -- new | contacted | enrolled | dropped
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
  -- admin / CRM fields
  assigned_to     uuid references profiles(id),
  next_action     text,
  next_action_due date,
  tags            text[],
  -- track-specific payloads: { english:{...}, university:{...}, corporate:{...} }
  details      jsonb not null default '{}'::jsonb
);

create index if not exists registrations_created_at_idx on registrations (created_at desc);
create index if not exists registrations_status_idx on registrations (status);
create index if not exists registrations_assigned_to_idx on registrations (assigned_to);
create index if not exists registrations_agent_code_idx on registrations (agent_code);

-- -----------------------------------------------------------------------------
-- registration_documents — passports / transcripts (private storage + Drive)
-- -----------------------------------------------------------------------------
create table if not exists registration_documents (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  kind            text not null,           -- passport | transcript | other
  storage_path    text not null,           -- path in Supabase Storage
  drive_url       text,                    -- populated after mirror to Shared Drive
  review_status   text not null default 'pending', -- pending | verified | rejected
  created_at      timestamptz not null default now()
);

create index if not exists reg_docs_registration_id_idx on registration_documents (registration_id);

-- -----------------------------------------------------------------------------
-- lead_events — activity timeline (one row per event)
-- -----------------------------------------------------------------------------
create table if not exists lead_events (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  actor_id        uuid references profiles(id),
  type            text not null,   -- note | status_change | email | call | doc_request | assignment
  body            text,
  meta            jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists lead_events_registration_id_idx on lead_events (registration_id, created_at desc);

-- -----------------------------------------------------------------------------
-- notifications — in-app bell
-- -----------------------------------------------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  payload    jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on notifications (user_id, read_at);

-- =============================================================================
-- Row Level Security
-- The public form writes ONLY via the service-role key, which bypasses RLS.
-- So there are intentionally NO anon insert policies. Everything below governs
-- authenticated staff/admin/agent access in the admin console.
-- =============================================================================
alter table profiles               enable row level security;
alter table registrations          enable row level security;
alter table registration_documents enable row level security;
alter table lead_events            enable row level security;
alter table notifications          enable row level security;

-- profiles: a user reads/updates their own row; admin sees all.
create policy "profiles self read" on profiles
  for select to authenticated
  using (id = auth.uid() or public.current_role() = 'admin');
create policy "profiles self update" on profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin all" on profiles
  for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- registrations: admin/staff full read + update; agent reads only their leads.
create policy "registrations staff read" on registrations
  for select to authenticated
  using (
    public.current_role() in ('admin', 'staff')
    or (public.current_role() = 'agent' and agent_code = public.current_agent_code())
  );
create policy "registrations staff update" on registrations
  for update to authenticated
  using (public.current_role() in ('admin', 'staff'))
  with check (public.current_role() in ('admin', 'staff'));
create policy "registrations admin delete" on registrations
  for delete to authenticated
  using (public.current_role() = 'admin');

-- documents: readable by anyone who can read the parent lead; staff update review status.
create policy "documents read" on registration_documents
  for select to authenticated
  using (
    exists (
      select 1 from registrations r
      where r.id = registration_documents.registration_id
        and (
          public.current_role() in ('admin', 'staff')
          or (public.current_role() = 'agent' and r.agent_code = public.current_agent_code())
        )
    )
  );
create policy "documents staff update" on registration_documents
  for update to authenticated
  using (public.current_role() in ('admin', 'staff'))
  with check (public.current_role() in ('admin', 'staff'));

-- lead_events: staff/admin read + insert; agent reads events on their leads.
create policy "events read" on lead_events
  for select to authenticated
  using (
    public.current_role() in ('admin', 'staff')
    or exists (
      select 1 from registrations r
      where r.id = lead_events.registration_id
        and public.current_role() = 'agent'
        and r.agent_code = public.current_agent_code()
    )
  );
create policy "events staff insert" on lead_events
  for insert to authenticated
  with check (public.current_role() in ('admin', 'staff') and actor_id = auth.uid());

-- notifications: a user reads and marks read ONLY their own.
create policy "notifications self read" on notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications self update" on notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
