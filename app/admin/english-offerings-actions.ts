"use server";

import { revalidatePath } from "next/cache";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/** Offerings are academic reference data — academic/admin manage them; writes go
 *  through the service-role client behind the role gate. */
async function academicAdmin() {
  const p = await getProfile();
  if (!p || !["admin", "academic"].includes(p.role)) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

export async function createEnglishOffering(input: {
  name: string;
  kind: string;
  default_days?: number | null;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!input.name.trim()) return { ok: false };
  const admin = await academicAdmin();
  if (!admin) return { ok: false };
  await admin.from("english_offerings").insert({
    name: input.name.trim(),
    kind: input.kind || "other",
    default_days: input.default_days ?? null,
    sort_order: 999,
  });
  await logAudit({ action: "offering_created", target_type: "english_offering", detail: input.name.trim() });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateEnglishOffering(
  id: string,
  patch: { name?: string; kind?: string; default_days?: number | null; active?: boolean },
) {
  if (!authConfigured) return;
  const admin = await academicAdmin();
  if (!admin) return;
  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.kind !== undefined) clean.kind = patch.kind;
  if (patch.default_days !== undefined) clean.default_days = patch.default_days;
  if (patch.active !== undefined) clean.active = patch.active;
  if (Object.keys(clean).length === 0) return;
  await admin.from("english_offerings").update(clean).eq("id", id);
  await logAudit({ action: "offering_updated", target_type: "english_offering", target_id: id });
  revalidatePath("/admin", "layout");
}

export async function deleteEnglishOffering(id: string) {
  if (!authConfigured) return;
  const admin = await academicAdmin();
  if (!admin) return;
  await admin.from("english_offerings").delete().eq("id", id);
  await logAudit({ action: "offering_deleted", target_type: "english_offering", target_id: id });
  revalidatePath("/admin", "layout");
}
