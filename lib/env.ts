import "server-only";

/**
 * Server-side env access + capability flags. Never import this into a client
 * component — it reads the service-role key.
 */
export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  adminAlertEmail: process.env.ADMIN_ALERT_EMAIL,
  // From address for transactional email — must be on a Resend-verified domain.
  emailFrom: process.env.EMAIL_FROM ?? "PECSB <noreply@premium.edu.my>",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/** True once a Supabase project + service-role key are configured. */
export const supabaseConfigured = Boolean(
  serverEnv.supabaseUrl && serverEnv.serviceRoleKey,
);

/** True once a Turnstile secret is configured (verification enforced). */
export const turnstileConfigured = Boolean(serverEnv.turnstileSecret);

/** True once Resend + an admin alert address are configured. */
export const emailConfigured = Boolean(
  serverEnv.resendApiKey && serverEnv.adminAlertEmail,
);
