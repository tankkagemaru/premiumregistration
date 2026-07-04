-- =============================================================================
-- Migration 09_notifications_realtime. Idempotent. Applied live via the MCP.
-- Enables Supabase realtime for the notifications table so the in-app bell
-- receives new rows live. RLS ("notifications self read", user_id = auth.uid())
-- still scopes each subscriber to only their own notifications.
-- =============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
