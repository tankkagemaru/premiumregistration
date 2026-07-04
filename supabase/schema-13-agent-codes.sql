-- Migration 13_agent_codes. Idempotent. Applied live via the MCP.
-- Registry of agent/referral codes that admin, finance and marketing can issue.
-- A code ties leads (registrations.agent_code) to a referral agent for tracking;
-- the agent need not have a login, so this is decoupled from auth users.
create table if not exists agent_codes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  code        text not null unique,
  agent_name  text not null,
  contact     text,
  notes       text,
  active      boolean not null default true,
  issued_by   uuid references profiles(id)
);
create index if not exists agent_codes_active_idx on agent_codes (active);

alter table agent_codes enable row level security;

drop policy if exists "agent_codes read" on agent_codes;
create policy "agent_codes read" on agent_codes
  for select to authenticated
  using (public.has_role(array['admin','finance','marketing']));

drop policy if exists "agent_codes write" on agent_codes;
create policy "agent_codes write" on agent_codes
  for all to authenticated
  using (public.has_role(array['admin','finance','marketing']))
  with check (public.has_role(array['admin','finance','marketing']));
