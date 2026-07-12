import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import type { EnglishOffering } from "./english-offerings-shared";

const MOCK: EnglishOffering[] = [
  { id: "o1", name: "Premium English Programme", kind: "pep", default_days: 45, active: true, sort_order: 1 },
  { id: "o2", name: "Exam Preparation", kind: "exam_prep", default_days: 16, active: true, sort_order: 2 },
  { id: "o3", name: "Summer Camp", kind: "summer_camp", default_days: 30, active: true, sort_order: 3 },
  { id: "o4", name: "Special Cohort", kind: "other", default_days: 30, active: true, sort_order: 4 },
];

export async function listEnglishOfferings(activeOnly = false): Promise<EnglishOffering[]> {
  if (!authConfigured) return activeOnly ? MOCK.filter((o) => o.active) : MOCK;
  const supabase = await createClient();
  let query = supabase.from("english_offerings").select("*").order("sort_order").order("name");
  if (activeOnly) query = query.eq("active", true);
  const { data } = await query;
  return (data as EnglishOffering[] | null) ?? [];
}
