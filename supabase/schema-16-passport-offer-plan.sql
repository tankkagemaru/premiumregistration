-- Migration 16_passport_offer_plan_docreq_agentlink. Applied live via the MCP.

-- Passport/ID captured at registration (optional; second factor for status checks).
alter table registrations add column if not exists passport_no text;

-- Offer acknowledgement + study plan on applications.
alter table applications
  add column if not exists offer_acknowledged_at timestamptz,
  add column if not exists plan jsonb;

-- One-off per-application document requests (e.g. an unusual EMGS ask).
create table if not exists app_doc_requests (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  kind           text not null default 'other',
  label          text not null,
  note           text,
  optional       boolean not null default false,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists app_doc_requests_app_idx on app_doc_requests (application_id);

alter table app_doc_requests enable row level security;
drop policy if exists "app_doc_requests staff" on app_doc_requests;
create policy "app_doc_requests staff" on app_doc_requests
  for all to authenticated
  using (public.has_role(array['admin','admissions','visa','academic','counsellor','staff','marketing']))
  with check (public.has_role(array['admin','admissions','visa','academic','counsellor','staff','marketing']));

-- Tie an issued agent code to an agent login (optional).
alter table agent_codes add column if not exists profile_id uuid references profiles(id);
