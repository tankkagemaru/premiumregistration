-- Migration 21 — team-based pipeline stage rename.
-- MUST be applied together with the deploy that renames the stage ids in code
-- (lib/admin/applications-shared.ts). Irreversible; run via the Supabase MCP
-- (apply_migration) or the SQL editor. Only `applications.stage` values change —
-- no schema changes, no other tables. Corporate + student lanes handled separately.
--
-- Student lane (track <> 'corporate'):
--   application -> registration
--   review      -> admissions
--   accepted    -> visa      (international)  |  enrolled (local)
--   offer / visa / enrolled / active / completed  keep their ids
-- Corporate lane (track = 'corporate'):
--   application -> enquiry     (proposal / quote / hrdf / delivery / completed keep)

begin;

-- Student lane
update applications set stage = 'registration'
  where stage = 'application' and track <> 'corporate';

update applications set stage = 'admissions'
  where stage = 'review' and track <> 'corporate';

-- 'accepted' had no direct successor — it splits by residency.
update applications set stage = 'visa'
  where stage = 'accepted' and track <> 'corporate' and is_international = true;
update applications set stage = 'enrolled'
  where stage = 'accepted' and track <> 'corporate' and is_international = false;

-- Corporate lane entry
update applications set stage = 'enquiry'
  where stage = 'application' and track = 'corporate';

commit;

-- Sanity check (run after): should return no rows.
-- select id, track, stage from applications
--   where stage in ('application', 'review', 'accepted');
