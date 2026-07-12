"use server";

import { revalidatePath } from "next/cache";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/** Resources are managed by admin + marketing (they own the materials). Writes
 *  go through the service-role client behind the role gate. */
async function resourceAdmin() {
  const p = await getProfile();
  if (!p || !["admin", "marketing"].includes(p.role)) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

export async function createResource(input: {
  label: string;
  url: string;
  category: string;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!input.label.trim() || !input.url.trim()) return { ok: false };
  const admin = await resourceAdmin();
  if (!admin) return { ok: false };
  await admin.from("resources").insert({
    label: input.label.trim(),
    url: input.url.trim(),
    category: input.category || "marketing",
    sort_order: 999,
  });
  await logAudit({ action: "resource_created", target_type: "resource", detail: input.label.trim() });
  revalidatePath("/admin", "layout");
  revalidatePath("/agent");
  return { ok: true };
}

export async function updateResource(
  id: string,
  patch: { label?: string; url?: string; category?: string; active?: boolean },
) {
  if (!authConfigured) return;
  const admin = await resourceAdmin();
  if (!admin) return;
  const clean: Record<string, unknown> = {};
  if (patch.label !== undefined) clean.label = patch.label.trim();
  if (patch.url !== undefined) clean.url = patch.url.trim();
  if (patch.category !== undefined) clean.category = patch.category;
  if (patch.active !== undefined) clean.active = patch.active;
  if (Object.keys(clean).length === 0) return;
  await admin.from("resources").update(clean).eq("id", id);
  await logAudit({ action: "resource_updated", target_type: "resource", target_id: id });
  revalidatePath("/admin", "layout");
  revalidatePath("/agent");
}

export async function deleteResource(id: string) {
  if (!authConfigured) return;
  const admin = await resourceAdmin();
  if (!admin) return;
  await admin.from("resources").delete().eq("id", id);
  await logAudit({ action: "resource_deleted", target_type: "resource", target_id: id });
  revalidatePath("/admin", "layout");
  revalidatePath("/agent");
}
