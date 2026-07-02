-- =============================================================================
-- Private Storage bucket for sensitive uploads (passports / transcripts).
-- Run after schema.sql. The bucket is PRIVATE — never public, never
-- "anyone with the link". Uploads happen via short-lived signed URLs minted
-- server-side; downloads for admin use short-lived signed URLs too.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('registration-docs', 'registration-docs', false)
on conflict (id) do update set public = false;

-- No anon storage policies. The service-role key (server) uploads and mints
-- signed URLs, bypassing these policies. Authenticated admin/staff may read
-- objects in the bucket (used for signed-download generation in the console).
create policy "staff read registration docs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'registration-docs'
    and public.current_role() in ('admin', 'staff')
  );
