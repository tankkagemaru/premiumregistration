import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./leads-shared";

export interface Notification {
  id: string;
  type: string;
  title: string;
  lead_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

const MOCK: Notification[] = [
  {
    id: "n1",
    type: "new_lead",
    title: "New lead — Aisyah binti Rahman",
    lead_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-07-01T09:12:00Z",
  },
  {
    id: "n2",
    type: "followup_due",
    title: "Follow-up overdue — David Tan",
    lead_id: "00000000-0000-0000-0000-000000000002",
    created_at: "2026-07-01T08:00:00Z",
  },
];

export async function listNotifications(
  userId: string,
): Promise<Notification[]> {
  if (!authConfigured) return MOCK;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id,type,payload,read_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (
    (data as { id: string; type: string; payload: { title?: string; lead_id?: string }; read_at?: string; created_at: string }[] | null) ?? []
  ).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.payload?.title ?? n.type,
    lead_id: n.payload?.lead_id,
    read_at: n.read_at,
    created_at: n.created_at,
  }));
}
