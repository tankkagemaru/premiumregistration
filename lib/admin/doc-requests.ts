import { createClient } from "@/lib/supabase/server";
import { authConfigured, type AppDocRequest } from "./applications-shared";

/** One-off document requests for a specific application (staff view, RLS). */
export async function listAppDocRequests(applicationId: string): Promise<AppDocRequest[]> {
  if (!authConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_doc_requests")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  return (data as AppDocRequest[] | null) ?? [];
}
