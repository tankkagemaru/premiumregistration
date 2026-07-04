/**
 * Client-safe notification types. Kept separate from notifications.ts (which
 * imports the server-only Supabase client) so client components like
 * NotificationBell can import the type without pulling next/headers into the
 * client bundle. See the -shared split described in docs/HANDOFF.md.
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  lead_id?: string | null;
  read_at?: string | null;
  created_at: string;
}
