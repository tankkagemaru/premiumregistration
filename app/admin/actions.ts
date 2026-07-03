"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/leads-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

export async function signOut() {
  if (authConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

export async function updateLeadStatus(id: string, status: string) {
  if (!authConfigured) return; // dev no-op
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase.from("registrations").update({ status }).eq("id", id);
  await supabase.from("lead_events").insert({
    registration_id: id,
    actor_id: profile?.id,
    type: "status_change",
    body: `Status changed to ${status}`,
  });
  await logAudit({ action: "lead_status_changed", target_type: "lead", target_id: id, detail: status });
  revalidatePath("/admin");
}

export async function addLeadNote(id: string, body: string) {
  if (!authConfigured || !body.trim()) return;
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase.from("lead_events").insert({
    registration_id: id,
    actor_id: profile?.id,
    type: "note",
    body: body.trim(),
  });
  revalidatePath("/admin");
}

export async function assignLead(id: string, staffId: string | null) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase
    .from("registrations")
    .update({ assigned_to: staffId })
    .eq("id", id);
  await supabase.from("lead_events").insert({
    registration_id: id,
    actor_id: profile?.id,
    type: "assignment",
    body: staffId ? "Assigned" : "Unassigned",
  });
  await logAudit({ action: "lead_assigned", target_type: "lead", target_id: id, detail: staffId ?? "unassigned" });
  revalidatePath("/admin", "layout");
}

export async function updateDocReview(
  registrationId: string,
  docId: string,
  status: string,
) {
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase
    .from("registration_documents")
    .update({ review_status: status })
    .eq("id", docId);
  await logAudit({ action: "doc_review_changed", target_type: "document", target_id: docId, detail: status });
  revalidatePath("/admin", "layout");
  void registrationId;
}

export async function setFollowUp(
  id: string,
  next_action: string,
  next_action_due: string | null,
) {
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase
    .from("registrations")
    .update({
      next_action: next_action || null,
      next_action_due: next_action_due || null,
    })
    .eq("id", id);
  revalidatePath("/admin");
}
