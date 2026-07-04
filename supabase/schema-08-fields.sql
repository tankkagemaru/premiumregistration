-- =============================================================================
-- Migration 08_handler_agent_hierarchy_dob — additive columns. Idempotent.
-- Run AFTER schema.sql + schema-platform.sql. Applied live via the Supabase MCP.
--
--   * Handler tracking (incentives): created_by = the staff member who entered
--     the record, on registrations + applications.
--   * Agent master hierarchy: profiles.parent_agent_id — an agent "handled
--     under" another agent (referral / commission-override structure).
--   * Minor compliance: registrations.dob and students.guardian
--     (students.date_of_birth already exists).
-- =============================================================================

alter table registrations add column if not exists dob date;
alter table registrations add column if not exists created_by uuid references profiles(id);

alter table applications add column if not exists created_by uuid references profiles(id);

alter table profiles add column if not exists parent_agent_id uuid references profiles(id);

alter table students add column if not exists guardian jsonb;

create index if not exists profiles_parent_agent_idx on profiles (parent_agent_id);
create index if not exists registrations_created_by_idx on registrations (created_by);
