import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/leads-shared";

export type Role =
  | "admin" // superadmin — full access incl. users + audit logs
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
 */
export async function getProfile(): Promise<Profile | null> {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,agent_code")
    .eq("id", user.id)
    .single();

  return (
    (data as Profile | null) ?? {
      id: user.id,
      full_name: user.email ?? "Staff",
      email: user.email ?? "",
      role: "staff",
    }
  );
}

/** Server-side page gate: returns the profile or redirects away. */
export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");
  if (!roles.includes(profile.role)) redirect("/admin");
  return profile;
}
