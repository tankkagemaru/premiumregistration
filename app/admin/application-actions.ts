"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

export async function advanceApplicationStage(id: string, stage: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  const { data: prev } = await supabase
    .from("applications")
    .select("stage")
    .eq("id", id)
    .single();
  await supabase.from("applications").update({ stage }).eq("id", id);
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile?.id,
    type: "stage_change",
    from_stage: prev?.stage,
    to_stage: stage,
    body: `Moved to ${stage}`,
  });
  await logAudit({ action: "stage_change", target_type: "application", target_id: id, detail: `${prev?.stage ?? "?"} → ${stage}` });
  revalidatePath("/admin", "layout");
}

export async function addApplicationNote(id: string, body: string) {
  if (!authConfigured || !body.trim()) return;
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile?.id,
    type: "note",
    body: body.trim(),
  });
  revalidatePath("/admin", "layout");
}

/**
 * Convert an enquiry (registration) into a student + application. Creates the
 * student master from the lead's contact, then one application per selected
 * track. No-op in dev (mock).
 */
export async function createApplicationFromLead(leadId: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", leadId)
    .single();
  if (!reg) return;

  const isInternational = (reg.nationality ?? "").toLowerCase() !== "my";
  const { data: student } = await supabase
    .from("students")
    .insert({
      enquiry_id: reg.id,
      full_name: reg.full_name,
      email: reg.email,
      phone: reg.phone,
      whatsapp: reg.whatsapp,
      nationality: reg.nationality,
      is_international: isInternational,
      agent_code: reg.agent_code,
    })
    .select("id")
    .single();
  if (!student) return;

  const tracks: string[] = reg.tracks ?? [];
  for (const track of tracks) {
    await supabase.from("applications").insert({
      student_id: student.id,
      track,
      submitted_by: "staff",
      stage: "application",
    });
  }
  revalidatePath("/admin", "layout");
}
