"use server";

import { revalidatePath } from "next/cache";
import { authConfigured } from "@/lib/admin/leads-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/** Only the superadmin (role=admin) may manage accounts. */
async function requireAdmin() {
  const profile = await getProfile();
  return profile?.role === "admin" ? profile : null;
}

export async function createStaffUser(input: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  agent_code?: string;
  parent_agent_id?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  if (!authConfigured) return { ok: false, error: "dev" }; // no-op without Supabase

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error || !created.user) {
    console.error("[users] create failed:", error);
    return { ok: false, error: "create_failed" };
  }

  const isAgent = input.role === "agent";
  await admin.from("profiles").upsert({
    id: created.user.id,
    full_name: input.full_name,
    email: input.email,
    role: input.role,
    agent_code: isAgent ? input.agent_code ?? null : null,
    parent_agent_id: isAgent ? input.parent_agent_id || null : null,
  });

  await logAudit({
    action: "user_created",
    target_type: "user",
    target_id: created.user.id,
    detail: `${input.full_name} · role ${input.role}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateUserRole(
  id: string,
  role: string,
  agent_code?: string,
): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  if (!authConfigured) return { ok: false };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const isAgent = role === "agent";
  await admin
    .from("profiles")
    .update({
      role,
      agent_code: isAgent ? agent_code ?? null : null,
      // Non-agents can't have a master agent.
      ...(isAgent ? {} : { parent_agent_id: null }),
    })
    .eq("id", id);

  await logAudit({
    action: "user_role_changed",
    target_type: "user",
    target_id: id,
    detail: `role → ${role}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Set (or clear) the master agent an agent is handled under. */
export async function setAgentParent(
  id: string,
  parentAgentId: string | null,
): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  if (!authConfigured) return { ok: false };
  if (parentAgentId === id) return { ok: false }; // an agent can't be their own master

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ parent_agent_id: parentAgentId || null })
    .eq("id", id);

  await logAudit({
    action: "agent_parent_changed",
    target_type: "user",
    target_id: id,
    detail: parentAgentId ? `master → ${parentAgentId}` : "master cleared",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
