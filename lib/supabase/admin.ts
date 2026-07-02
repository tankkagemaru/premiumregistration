import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — SERVER ONLY.
 *
 * Used by the registration API route to insert rows and mint signed upload
 * URLs. The `server-only` import makes the build fail if this is ever imported
 * into a client bundle, so the service key can never reach the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
