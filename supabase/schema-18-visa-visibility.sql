-- Migration 18_visa_visibility. Idempotent.
-- Everyone on staff should be able to SEE a student's visa status — the Visa
-- module is now read-open to all roles, the shared calendar surfaces visa
-- milestones, and student/academic views show a visa-stage chip. Editing stays
-- restricted to admin + visa (unchanged "visa write" policy + server-side gate
-- in app/admin/visa-actions.ts).
drop policy if exists "visa read" on visa_cases;
create policy "visa read" on visa_cases for select to authenticated
  using (
    has_role(array['admin','visa','admissions','marketing','academic','finance','counsellor','staff'])
    or owns_application(application_id)
  );
