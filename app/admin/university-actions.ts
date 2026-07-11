"use server";

import { revalidatePath } from "next/cache";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/** Admissions maintains the university catalogue; admin too. */
async function catalogueClient() {
  const profile = await getProfile();
  if (!profile || !["admin", "admissions"].includes(profile.role)) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return { admin: createAdminClient(), profile };
}

const touch = () => revalidatePath("/admin", "layout");

export interface UniversityInput {
  name: string;
  short_name?: string;
  type?: string;
  currency?: string;
  website?: string;
  location?: string;
  intakes?: string;
}

export async function createUniversity(
  input: UniversityInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!authConfigured) return { ok: true };
  if (!input.name?.trim()) return { ok: false, error: "Enter the university name." };
  const ctx = await catalogueClient();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { error } = await ctx.admin.from("universities").insert({
    name: input.name.trim(),
    short_name: input.short_name?.trim() || null,
    type: input.type?.trim() || null,
    currency: input.currency?.trim() || "MYR",
    website: input.website?.trim() || null,
    location: input.location?.trim() || null,
    intakes: input.intakes?.trim() || null,
    programmes: {},
  });
  if (error) return { ok: false, error: "Could not add the university." };
  await logAudit({ action: "university_added", target_type: "university", detail: input.name.trim() });
  touch();
  return { ok: true };
}

export async function updateUniversity(
  id: string,
  input: Partial<UniversityInput> & { active?: boolean },
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const ctx = await catalogueClient();
  if (!ctx) return { ok: false };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["name", "short_name", "type", "currency", "website", "location", "intakes"] as const) {
    if (input[k] !== undefined) patch[k] = (input[k] as string)?.trim() || null;
  }
  if (input.active !== undefined) patch.active = input.active;
  await ctx.admin.from("universities").update(patch).eq("id", id);
  await logAudit({ action: "university_updated", target_type: "university", target_id: id });
  touch();
  return { ok: true };
}

export async function deleteUniversity(id: string): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const ctx = await catalogueClient();
  if (!ctx) return { ok: false };
  await ctx.admin.from("universities").delete().eq("id", id);
  await logAudit({ action: "university_deleted", target_type: "university", target_id: id });
  touch();
  return { ok: true };
}

/** Add or rename/reprice a programme within a university's programmes map. */
export async function upsertProgramme(
  universityId: string,
  name: string,
  fee: string,
  oldName?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!authConfigured) return { ok: true };
  if (!name.trim()) return { ok: false, error: "Enter the programme name." };
  const ctx = await catalogueClient();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { data: u } = await ctx.admin
    .from("universities")
    .select("programmes")
    .eq("id", universityId)
    .maybeSingle();
  const map = { ...((u?.programmes as Record<string, string> | null) ?? {}) };
  if (oldName && oldName !== name.trim()) delete map[oldName];
  map[name.trim()] = fee.trim();
  await ctx.admin
    .from("universities")
    .update({ programmes: map, updated_at: new Date().toISOString() })
    .eq("id", universityId);
  await logAudit({ action: "programme_saved", target_type: "university", target_id: universityId, detail: name.trim() });
  touch();
  return { ok: true };
}

export async function removeProgramme(
  universityId: string,
  name: string,
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const ctx = await catalogueClient();
  if (!ctx) return { ok: false };
  const { data: u } = await ctx.admin
    .from("universities")
    .select("programmes")
    .eq("id", universityId)
    .maybeSingle();
  const map = { ...((u?.programmes as Record<string, string> | null) ?? {}) };
  delete map[name];
  await ctx.admin
    .from("universities")
    .update({ programmes: map, updated_at: new Date().toISOString() })
    .eq("id", universityId);
  await logAudit({ action: "programme_removed", target_type: "university", target_id: universityId, detail: name });
  touch();
  return { ok: true };
}
