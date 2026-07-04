-- =============================================================================
-- Staff-created records (migration 07_staff_create_records).
-- Run AFTER schema.sql + schema-platform.sql. Idempotent (drop-then-create).
--
-- Purpose:
--   (a) Let lead-facing staff CREATE records from the console — add an enquiry
--       (registrations) or a student + application directly. Also makes the
--       existing createApplicationFromLead convert path work: it inserts via the
--       RLS-bound auth client, which was silently denied with no INSERT policy.
--   (b) Modernise the registrations/lead_events read+update policies. The base
--       schema predated the marketing/admissions/counsellor roles and only
--       allowed admin/staff, so those roles couldn't see or edit leads even
--       though the console shows them the Leads tab. Align to has_role().
--
-- Lead-facing role set = the roles the Leads tab is shown to:
--   admin, marketing, admissions, counsellor, staff.
-- NB: current_role is a reserved SQL word — always schema-qualify as
--     public.current_role() or it parses as the built-in and errors.
-- =============================================================================

-- registrations -------------------------------------------------------------
drop policy if exists "registrations staff read" on registrations;
create policy "registrations staff read" on registrations
  for select to authenticated
  using (
    public.has_role(array['admin','marketing','admissions','counsellor','staff'])
    or (public.current_role() = 'agent' and agent_code = public.current_agent_code())
  );

drop policy if exists "registrations staff update" on registrations;
create policy "registrations staff update" on registrations
  for update to authenticated
  using (public.has_role(array['admin','marketing','admissions','counsellor','staff']))
  with check (public.has_role(array['admin','marketing','admissions','counsellor','staff']));

drop policy if exists "registrations staff insert" on registrations;
create policy "registrations staff insert" on registrations
  for insert to authenticated
  with check (public.has_role(array['admin','marketing','admissions','counsellor','staff']));

-- lead_events ---------------------------------------------------------------
drop policy if exists "events read" on lead_events;
create policy "events read" on lead_events
  for select to authenticated
  using (
    public.has_role(array['admin','marketing','admissions','counsellor','staff'])
    or exists (
      select 1 from registrations r
      where r.id = lead_events.registration_id
        and public.current_role() = 'agent'
        and r.agent_code = public.current_agent_code()
    )
  );

drop policy if exists "events staff insert" on lead_events;
create policy "events staff insert" on lead_events
  for insert to authenticated
  with check (
    public.has_role(array['admin','marketing','admissions','counsellor','staff'])
    and actor_id = auth.uid()
  );

-- students / applications (read/update already use has_role) -----------------
drop policy if exists "students staff insert" on students;
create policy "students staff insert" on students
  for insert to authenticated
  with check (public.has_role(array['admin','marketing','admissions','counsellor','staff']));

drop policy if exists "applications staff insert" on applications;
create policy "applications staff insert" on applications
  for insert to authenticated
  with check (public.has_role(array['admin','marketing','admissions','counsellor','staff']));
