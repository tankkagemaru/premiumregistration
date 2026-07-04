-- Migration 17_app_settings. Applied live via the MCP.
-- Generic key/value settings editable from the console (first use: stale-record
-- thresholds). Staff read; admin writes.
create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists "settings read" on app_settings;
create policy "settings read" on app_settings for select to authenticated using (true);

drop policy if exists "settings admin write" on app_settings;
create policy "settings admin write" on app_settings for all to authenticated
  using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
