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
  application_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

/** Where a notification links in the console, based on what it references. */
export function notificationHref(n: Notification): string {
  if (n.application_id) return `/admin/applications?app=${n.application_id}`;
  if (n.lead_id) return `/admin/leads?lead=${n.lead_id}`;
  return "/admin";
}
