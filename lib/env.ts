import "server-only";

/**
 * Server-side env access + capability flags. Never import this into a client
 * component — it reads the service-role key.
 */
export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
};

/** True once a Supabase project + service-role key are configured. */
export const supabaseConfigured = Boolean(
  serverEnv.supabaseUrl && serverEnv.serviceRoleKey,
);

/** True once a Turnstile secret is configured (verification enforced). */
export const turnstileConfigured = Boolean(serverEnv.turnstileSecret);
