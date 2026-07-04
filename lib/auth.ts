import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/leads-shared";

export type Role =
  | "admin" // superadmin — full access incl. users + audit logs
  | "boss" // executive — aggregate dashboards only, no record details
  | "marketing" // campaigns + leads, hands qualified leads to admissions
  | "admissions" // first in line — registration, review, offers
  | "visa"
  | "finance"
  | "academic" // enrolment, class dates, attendance
  | "counsellor"
  | "staff"
  | "agent";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  agent_code?: string | null;
}

/**
 * The signed-in staff profile. In dev (no Supabase) returns a bypass admin so
 * the console is usable locally; in prod reads the `profiles` row for the user.
 *
 * Wrapped in React cache() so the layout + page (which both need the profile on
 * a single render) share one lookup, and uses getClaims() (local JWT decode)
 * rather than getUser() (an Auth-server round-trip) to identify the user.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!authConfigured) {
    // Dev bypass — id matches the mock data's admin so "mine" filters work.
    return {
      id: "s-waty",
      full_name: "Madam Waty (dev)",
      email: "dev@local",
      role: "admin",
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const userId = claims.sub as string;
  const userEmail = (claims.email as string | undefined) ?? "";

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,agent_code")
    .eq("id", userId)
    .single();

  return (
    (data as Profile | null) ?? {
      id: userId,
      full_name: userEmail || "Staff",
      email: userEmail,
      role: "staff",
    }
  );
});

/** Server-side page gate: returns the profile or redirects away. */
export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");
  if (!roles.includes(profile.role)) redirect("/admin");
  return profile;
}
