"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";
import { AGENT_CODE_ROLES, generateAgentCode } from "@/lib/admin/agent-codes-shared";

async function permitted() {
  const p = await getProfile();
  return !!p && AGENT_CODE_ROLES.includes(p.role);
}

export async function createAgentCode(input: {
  agent_name: string;
  contact?: string;
  notes?: string;
  code?: string; // optional custom code; otherwise auto-generated
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!authConfigured) return { ok: true, code: generateAgentCode(randomUUID()) };
  if (!(await permitted())) return { ok: false, error: "forbidden" };
  if (!input.agent_name.trim()) return { ok: false, error: "name" };

  const supabase = await createClient();
  const profile = await getProfile();

  // Custom code (uppercased) or generate; retry a couple of times on collision.
  const custom = input.code?.trim().toUpperCase();
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = custom || generateAgentCode(randomUUID());
    const { error } = await supabase.from("agent_codes").insert({
      code,
      agent_name: input.agent_name.trim(),
      contact: input.contact?.trim() || null,
      notes: input.notes?.trim() || null,
      issued_by: profile?.id ?? null,
    });
    if (!error) {
      await logAudit({
        action: "agent_code_issued",
        target_type: "agent_code",
        detail: `${code} · ${input.agent_name.trim()}`,
      });
      revalidatePath("/admin/agent-codes");
      return { ok: true, code };
    }
    // 23505 = unique_violation. A custom duplicate is a user error; a generated
    // collision just retries with a fresh code.
    if (error.code === "23505" && custom) return { ok: false, error: "duplicate" };
    if (error.code !== "23505") return { ok: false, error: "insert" };
  }
  return { ok: false, error: "insert" };
}

export async function toggleAgentCode(id: string, active: boolean) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  await supabase.from("agent_codes").update({ active }).eq("id", id);
  await logAudit({ action: "agent_code_toggled", target_type: "agent_code", target_id: id, detail: active ? "active" : "off" });
  revalidatePath("/admin/agent-codes");
}

export async function deleteAgentCode(id: string) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  await supabase.from("agent_codes").delete().eq("id", id);
  await logAudit({ action: "agent_code_deleted", target_type: "agent_code", target_id: id });
  revalidatePath("/admin/agent-codes");
}
