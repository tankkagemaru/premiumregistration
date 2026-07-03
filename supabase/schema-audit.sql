-- =============================================================================
-- Audit log — who did what, when. Run after schema-platform.sql.
-- Every server action + PII access (document downloads, offer generation)
-- writes a row. Only admin can read; users insert only as themselves.
-- =============================================================================

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  actor_name  text,
  action      text not null,      -- stage_change | payment_recorded | doc_downloaded | user_created | ...
  target_type text,               -- lead | application | fee | commission | visa_case | document | user
  target_id   text,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id);

alter table audit_logs enable row level security;

create policy "audit admin read" on audit_logs
  for select to authenticated using (public.current_role() = 'admin');
create policy "audit insert self" on audit_logs
  for insert to authenticated with check (actor_id = auth.uid());
