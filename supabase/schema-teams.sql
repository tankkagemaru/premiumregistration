-- =============================================================================
-- Cross-team workflow — run after schema-audit.sql.
-- Adds the Academic team's class-date fields and the action_requests table:
-- department-to-department handoffs / requests / blockers on an application.
-- (Roles are plain text on profiles — 'academic' and 'marketing' need no DDL.)
-- =============================================================================

alter table applications add column if not exists class_start date;
alter table applications add column if not exists class_end   date;

create table if not exists action_requests (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  subject        text,               -- display label when no application yet (e.g. a lead)
  from_role      text not null,      -- marketing | admissions | finance | visa | academic | admin
  from_user      uuid references profiles(id),
  to_role        text not null,
  type           text not null default 'request', -- handoff | request | blocker
  title          text not null,
  detail         text,
  due_date       date,
  status         text not null default 'open',    -- open | done
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  resolved_by    uuid references profiles(id)
);
create index if not exists action_requests_to_idx on action_requests (to_role, status);
create index if not exists action_requests_app_idx on action_requests (application_id);

alter table action_requests enable row level security;

create policy "requests staff read" on action_requests
  for select to authenticated
  using (has_role(array['admin','marketing','admissions','visa','finance','academic','counsellor','staff']));
create policy "requests staff insert" on action_requests
  for insert to authenticated
  with check (
    has_role(array['admin','marketing','admissions','visa','finance','academic','counsellor','staff'])
    and from_user = auth.uid()
  );
create policy "requests staff update" on action_requests
  for update to authenticated
  using (has_role(array['admin','marketing','admissions','visa','finance','academic','counsellor','staff']));
