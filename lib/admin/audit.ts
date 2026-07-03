import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./leads-shared";
import { getProfile } from "@/lib/auth";

export interface AuditEntry {
  id: string;
  actor_name: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  detail?: string | null;
  created_at: string;
}

const MOCK_LOGS: AuditEntry[] = [
  { id: "l1", actor_name: "Madam Waty", action: "stage_change", target_type: "application", target_id: "a-0002", detail: "Moved to Visa", created_at: "2026-07-02T10:12:00Z" },
  { id: "l2", actor_name: "Mei Ling", action: "payment_recorded", target_type: "fee", target_id: "f3", detail: "MYR 14,000 · bank transfer MBB-90417", created_at: "2026-06-30T14:02:00Z" },
  { id: "l3", actor_name: "Hafiz", action: "visa_updated", target_type: "visa_case", target_id: "v1", detail: "Stage → Medical", created_at: "2026-06-29T09:41:00Z" },
  { id: "l4", actor_name: "Madam Waty", action: "doc_downloaded", target_type: "document", target_id: "ad1", detail: "passport — Aisyah binti Rahman", created_at: "2026-06-28T16:20:00Z" },
  { id: "l5", actor_name: "Madam Waty", action: "user_created", target_type: "user", target_id: "s-hafiz", detail: "Hafiz · role visa", created_at: "2026-06-25T08:05:00Z" },
  { id: "l6", actor_name: "Aina", action: "offer_generated", target_type: "application", target_id: "a-0003", detail: "PLC offer letter — Nguyen Van An", created_at: "2026-07-01T11:30:00Z" },
];

/**
 * Append an audit row. No-op in dev (no Supabase). Never throws — auditing
 * must not break the action it records.
 */
export async function logAudit(entry: {
  action: string;
  target_type?: string;
  target_id?: string;
  detail?: string;
}): Promise<void> {
  if (!authConfigured) return;
  try {
    const profile = await getProfile();
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      actor_name: profile?.full_name ?? "system",
      ...entry,
    });
  } catch (err) {
    console.error("[audit] failed:", err);
  }
}

export async function listAuditLogs(q?: string): Promise<AuditEntry[]> {
  let rows: AuditEntry[];
  if (!authConfigured) {
    rows = MOCK_LOGS;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("audit_logs")
      .select("id,actor_name,action,target_type,target_id,detail,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    rows = (data as AuditEntry[] | null) ?? [];
  }
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((r) =>
    `${r.actor_name} ${r.action} ${r.target_type ?? ""} ${r.target_id ?? ""} ${r.detail ?? ""}`
      .toLowerCase()
      .includes(needle),
  );
}
