-- Migration 11_commission_rules. Idempotent-ish (create table if not exists +
-- drop/create policies). Applied live via the MCP.
-- One flexible table for every commission type; automation reads it to compute
-- accrued amounts later. Finance/admin manage it.
create table if not exists commission_rules (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  active       boolean not null default true,
  scope        text not null,   -- agent_payout | university_share | handler_incentive | consultant_markup
  label        text,
  subject_id   uuid references profiles(id),
  university   text,
  track        text,
  category     text,            -- UG | PG_masters | PG_phd | special | training
  basis        text not null default 'percent', -- percent | fixed | split
  rate         numeric(12,2),
  our_share_pct numeric(5,2),
  min_students integer,
  currency     text not null default 'MYR',
  notes        text
);
create index if not exists commission_rules_scope_idx on commission_rules (scope);

alter table commission_rules enable row level security;
drop policy if exists "comm_rules read" on commission_rules;
create policy "comm_rules read" on commission_rules
  for select to authenticated using (public.has_role(array['admin','finance']));
drop policy if exists "comm_rules write" on commission_rules;
create policy "comm_rules write" on commission_rules
  for all to authenticated
  using (public.has_role(array['admin','finance']))
  with check (public.has_role(array['admin','finance']));
