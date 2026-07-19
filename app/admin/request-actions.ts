"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/leads-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

export async function createActionRequest(input: {
  applicationId?: string;
  subject?: string;
  toRole: string;
  type: string;
  title: string;
  detail?: string;
  dueDate?: string;
}) {
  if (!authConfigured || !input.title.trim()) return;
  const supabase = await createClient();
  const profile = await getProfile();
  // A due date is a commitment for the receiving team — never accept a
  // back-dated one (a typed value can bypass the picker's min). Clamp to today.
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = input.dueDate && input.dueDate >= today ? input.dueDate : null;
  await supabase.from("action_requests").insert({
    application_id: input.applicationId ?? null,
    subject: input.subject ?? null,
    from_role: profile?.role ?? "staff",
    from_user: profile?.id,
    to_role: input.toRole,
    type: input.type,
    title: input.title.trim(),
    detail: input.detail?.trim() || null,
    due_date: dueDate,
  });
  await logAudit({
    action: "request_raised",
    target_type: "application",
    target_id: input.applicationId ?? input.subject ?? "—",
    detail: `${profile?.role} → ${input.toRole}: ${input.title}`,
  });
  revalidatePath("/admin", "layout");
}

/** Dismiss a request that shouldn't have been raised (wrong team, duplicate,
 *  no longer relevant) — distinct from "done" so reporting stays honest. */
export async function dismissActionRequest(id: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase
    .from("action_requests")
    .update({
      status: "dismissed",
      resolved_at: new Date().toISOString(),
      resolved_by: profile?.id,
    })
    .eq("id", id);
  await logAudit({ action: "request_dismissed", target_type: "request", target_id: id });
  revalidatePath("/admin", "layout");
}

export async function resolveActionRequest(id: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase
    .from("action_requests")
    .update({
      status: "done",
      resolved_at: new Date().toISOString(),
      resolved_by: profile?.id,
    })
    .eq("id", id);
  await logAudit({
    action: "request_resolved",
    target_type: "request",
    target_id: id,
  });
  revalidatePath("/admin", "layout");
}
