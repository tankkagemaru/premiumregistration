import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/leads-shared";

export type Role = "admin" | "staff" | "agent";

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
    return { id: "dev", full_name: "Dev Admin", email: "dev@local", role: "admin" };
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
