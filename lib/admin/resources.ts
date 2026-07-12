import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import type { Resource } from "./resources-shared";

const MOCK: Resource[] = [
  { id: "r1", label: "Programme brochure (2026)", url: "#", category: "marketing", active: true, sort_order: 1 },
  { id: "r2", label: "Registration checklist", url: "#", category: "document", active: true, sort_order: 3 },
  { id: "r3", label: "Referral / commission agreement", url: "#", category: "agreement", active: true, sort_order: 5 },
];

export async function listResources(activeOnly = false): Promise<Resource[]> {
  if (!authConfigured) return activeOnly ? MOCK.filter((r) => r.active) : MOCK;
  const supabase = await createClient();
  let query = supabase.from("resources").select("*").order("sort_order").order("label");
  if (activeOnly) query = query.eq("active", true);
  const { data } = await query;
  return (data as Resource[] | null) ?? [];
}
