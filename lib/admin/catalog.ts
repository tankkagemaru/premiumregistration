import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import { MALAYSIAN_INSTITUTIONS } from "@/lib/config/universities";
import { ENGLISH_PROGRAMS } from "@/lib/config/programs";
import type { Institution, Program } from "./catalog-shared";

export * from "./catalog-shared";

// Config arrays as the seed baseline / fallback (dev with no Supabase, or before
// the tables are populated). The DB is the source of truth when available.
const CONFIG_INSTITUTIONS: Institution[] = MALAYSIAN_INSTITUTIONS.map((i, idx) => ({
  id: i.value,
  value: i.value,
  label: i.label,
  category: i.category,
  partner: false,
  active: true,
  sort_order: idx,
}));

const CONFIG_PROGRAMS: Program[] = ENGLISH_PROGRAMS.map((p, idx) => ({
  id: p.value,
  value: p.value,
  label: p.label,
  active: true,
  sort_order: idx,
}));

export async function listInstitutions(includeInactive = false): Promise<Institution[]> {
  if (!authConfigured) return CONFIG_INSTITUTIONS;
  const supabase = await createClient();
  let q = supabase.from("institutions").select("*").order("sort_order", { ascending: true });
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  const rows = (data as Institution[] | null) ?? [];
  return rows.length ? rows : CONFIG_INSTITUTIONS;
}

export async function listPrograms(includeInactive = false): Promise<Program[]> {
  if (!authConfigured) return CONFIG_PROGRAMS;
  const supabase = await createClient();
  let q = supabase.from("programs").select("*").order("sort_order", { ascending: true });
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  const rows = (data as Program[] | null) ?? [];
  return rows.length ? rows : CONFIG_PROGRAMS;
}
