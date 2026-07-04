"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";
import { slugify } from "@/lib/admin/catalog-shared";

async function isAdmin() {
  const p = await getProfile();
  return !!p && p.role === "admin";
}

// Insert a row, retrying the slug on unique collision (label -> value).
async function insertWithSlug(
  table: "institutions" | "programs",
  base: string,
  extra: Record<string, unknown>,
): Promise<string | null> {
  const supabase = await createClient();
  for (let i = 0; i < 6; i++) {
    const value = i === 0 ? base : `${base}-${i + 1}`;
    const { error } = await supabase.from(table).insert({ value, sort_order: 9999, ...extra });
    if (!error) return value;
    if (error.code !== "23505") return null;
  }
  return null;
}

/* ---- institutions ---- */

export async function createInstitution(input: {
  label: string;
  category: string;
  partner?: boolean;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!(await isAdmin()) || !input.label.trim()) return { ok: false };
  const value = await insertWithSlug("institutions", slugify(input.label), {
    label: input.label.trim(),
    category: input.category,
    partner: !!input.partner,
  });
  if (!value) return { ok: false };
  await logAudit({ action: "institution_created", target_type: "institution", detail: input.label.trim() });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function updateInstitution(
  id: string,
  patch: { label?: string; category?: string; partner?: boolean; active?: boolean },
) {
  if (!authConfigured || !(await isAdmin())) return;
  const supabase = await createClient();
  const clean: Record<string, unknown> = {};
  if (patch.label !== undefined) clean.label = patch.label.trim();
  if (patch.category !== undefined) clean.category = patch.category;
  if (patch.partner !== undefined) clean.partner = patch.partner;
  if (patch.active !== undefined) clean.active = patch.active;
  if (Object.keys(clean).length === 0) return;
  await supabase.from("institutions").update(clean).eq("id", id);
  await logAudit({ action: "institution_updated", target_type: "institution", target_id: id });
  revalidatePath("/admin/settings");
}

export async function deleteInstitution(id: string) {
  if (!authConfigured || !(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("institutions").delete().eq("id", id);
  await logAudit({ action: "institution_deleted", target_type: "institution", target_id: id });
  revalidatePath("/admin/settings");
}

/* ---- programs ---- */

export async function createProgram(input: { label: string }): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!(await isAdmin()) || !input.label.trim()) return { ok: false };
  const value = await insertWithSlug("programs", slugify(input.label), {
    label: input.label.trim(),
  });
  if (!value) return { ok: false };
  await logAudit({ action: "program_created", target_type: "program", detail: input.label.trim() });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function updateProgram(
  id: string,
  patch: { label?: string; active?: boolean },
) {
  if (!authConfigured || !(await isAdmin())) return;
  const supabase = await createClient();
  const clean: Record<string, unknown> = {};
  if (patch.label !== undefined) clean.label = patch.label.trim();
  if (patch.active !== undefined) clean.active = patch.active;
  if (Object.keys(clean).length === 0) return;
  await supabase.from("programs").update(clean).eq("id", id);
  await logAudit({ action: "program_updated", target_type: "program", target_id: id });
  revalidatePath("/admin/settings");
}

export async function deleteProgram(id: string) {
  if (!authConfigured || !(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("programs").delete().eq("id", id);
  await logAudit({ action: "program_deleted", target_type: "program", target_id: id });
  revalidatePath("/admin/settings");
}
