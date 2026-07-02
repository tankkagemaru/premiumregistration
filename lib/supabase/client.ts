import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — anon key only. Used for the admin auth session in
 * the management console. The public registration form NEVER writes with this;
 * all writes go through the server API route with the service-role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
