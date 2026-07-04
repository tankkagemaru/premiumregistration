import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { BillableItem } from "./billables-shared";

export * from "./billables-shared";

export async function listBillableItems(includeInactive = false): Promise<BillableItem[]> {
  if (!authConfigured) return [];
  const supabase = await createClient();
  let q = supabase
    .from("billable_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return (data as BillableItem[] | null) ?? [];
}
