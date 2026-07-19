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

/** Save a study plan on a LEAD (pre-conversion) — same shape as applications. */
export async function saveLeadPlan(
  id: string,
  plan: {
    intake?: string;
    target_completion?: string;
    summary?: string;
    steps: { title: string; start?: string; end?: string; note?: string }[];
  },
) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  const clean = {
    intake: plan.intake?.trim() || undefined,
    target_completion: plan.target_completion || undefined,
    summary: plan.summary?.trim() || undefined,
    steps: plan.steps
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        start: s.start || undefined,
        end: s.end || undefined,
        note: s.note?.trim() || undefined,
      })),
    updated_at: new Date().toISOString(),
  };
  await supabase.from("registrations").update({ plan: clean }).eq("id", id);
  await supabase.from("lead_events").insert({
    registration_id: id,
    actor_id: profile?.id,
    type: "note",
    body: `Study plan updated (${clean.steps.length} steps${clean.intake ? `, intake ${clean.intake}` : ""})`,
  });
  await logAudit({ action: "plan_saved", target_type: "lead", target_id: id, detail: clean.intake ?? "" });
  revalidatePath("/admin", "layout");
}

/**
 * Dismiss the stale-flag on a lead — requires a reason, which is recorded on
 * the lead's timeline. Snoozes the warning for `days` (default a week).
 */
export async function dismissStaleFlag(id: string, reason: string, days = 7) {
  if (!authConfigured || !reason.trim()) return;
  const supabase = await createClient();
  const profile = await getProfile();
  const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  await supabase
    .from("registrations")
    .update({ stale_snoozed_until: until })
    .eq("id", id);
  await supabase.from("lead_events").insert({
    registration_id: id,
    actor_id: profile?.id,
    type: "note",
    body: `Stale flag dismissed until ${until} — ${reason.trim()}`,
  });
  await logAudit({
    action: "stale_dismissed",
    target_type: "lead",
    target_id: id,
    detail: `until ${until}: ${reason.trim()}`,
  });
  revalidatePath("/admin", "layout");
}

export async function logLeadMessage(id: string, channel: string, label: string) {
  if (!authConfigured || channel === "copy") return;
  const supabase = await createClient();
  const profile = await getProfile();
  // "drafted" not "sent" — we only know the compose window was opened.
  await supabase.from("lead_events").insert({
    registration_id: id,
    actor_id: profile?.id,
    type: channel === "email" ? "email" : "note",
    body: `${channel === "email" ? "Email" : "WhatsApp message"} drafted — ${label}`,
  });
  // First outbound contact moves a fresh lead along automatically — "contacted"
  // was purely manual and routinely forgotten, skewing the pipeline counts.
  const { data: lead } = await supabase.from("registrations").select("status").eq("id", id).maybeSingle();
  if (lead?.status === "new") {
    await supabase.from("registrations").update({ status: "contacted" }).eq("id", id);
    await supabase.from("lead_events").insert({
      registration_id: id,
      actor_id: profile?.id,
      type: "status_change",
      body: "Status changed to contacted (first outbound message)",
    });
  }
  revalidatePath("/admin");
}

export async function markNotificationsRead() {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);
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
  // Tell the new owner a lead just landed on them (service role — notifications
  // have no user insert policy). Skip self-assignment.
  if (staffId && staffId !== profile?.id) {
    const { data: lead } = await supabase.from("registrations").select("full_name").eq("id", id).maybeSingle();
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().from("notifications").insert({
      user_id: staffId,
      type: "assignment",
      payload: { title: `Lead assigned to you: ${lead?.full_name ?? "a lead"}`, registration_id: id },
    });
  }
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
): Promise<{ ok: boolean; error?: string }> {
  if (!authConfigured) return { ok: true };
  // A follow-up without a due date never resurfaces (the Follow-ups view is
  // date-driven) — require one so scheduled work can't silently vanish.
  if (next_action.trim() && !next_action_due)
    return { ok: false, error: "Set a due date — undated follow-ups never resurface." };
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase
    .from("registrations")
    .update({
      next_action: next_action.trim() || null,
      next_action_due: next_action_due || null,
    })
    .eq("id", id);
  // On the record: follow-ups were the only drawer mutation missing from the
  // activity timeline.
  if (next_action.trim()) {
    await supabase.from("lead_events").insert({
      registration_id: id,
      actor_id: profile?.id,
      type: "note",
      body: `Follow-up scheduled: ${next_action.trim()} (due ${next_action_due})`,
    });
  }
  revalidatePath("/admin");
  return { ok: true };
}
