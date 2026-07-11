"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

const ADD_ROLES = ["admin", "admissions", "marketing", "counsellor", "staff"];

/**
 * Add another university choice for an existing student — a second/third
 * university application, or the same university with a different program. Each
 * choice is its own university-track application so it runs the pipeline (docs,
 * offer/OL·COL) independently; the student later accepts one (selectChoice).
 */
export async function addUniversityChoice(
  studentId: string,
  input: { institution: string; program: string; qualification?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!authConfigured) return { ok: true };
  if (!input.institution?.trim() || !input.program?.trim())
    return { ok: false, error: "Enter the university and program." };
  const profile = await getProfile();
  if (!profile || !ADD_ROLES.includes(profile.role))
    return { ok: false, error: "You can't add choices." };

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("full_name,email,passport_no,is_international,agent_id,agent_code")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { ok: false, error: "Student not found." };

  const { error } = await supabase.from("applications").insert({
    student_id: studentId,
    track: "university",
    submitted_by: "staff",
    stage: "registration",
    student_name: student.full_name,
    student_email: student.email,
    passport_no: student.passport_no,
    is_international: student.is_international,
    target_institution: input.institution.trim(),
    program_name: input.program.trim(),
    qualification_level: input.qualification?.trim() || null,
    agent_id: student.agent_id,
    agent_code: student.agent_code,
    created_by: profile.id,
    assigned_to: profile.id,
  });
  if (error) return { ok: false, error: "Could not add the choice." };

  await logAudit({
    action: "university_choice_added",
    target_type: "student",
    target_id: studentId,
    detail: `${input.institution.trim()} — ${input.program.trim()}`,
  });
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Accept one university choice: the student picks this university, so every other
 * still-active university choice is marked withdrawn (not selected). Admissions
 * only. The chosen application carries on down the pipeline.
 */
export async function selectUniversityChoice(appId: string): Promise<void> {
  if (!authConfigured) return;
  const profile = await getProfile();
  if (!profile || !["admin", "admissions"].includes(profile.role)) return;

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("student_id, target_institution")
    .eq("id", appId)
    .maybeSingle();
  if (!app?.student_id) return;

  const { data: siblings } = await supabase
    .from("applications")
    .select("id")
    .eq("student_id", app.student_id)
    .eq("track", "university")
    .eq("status", "active")
    .neq("id", appId);

  for (const s of (siblings ?? []) as { id: string }[]) {
    await supabase.from("applications").update({ status: "withdrawn" }).eq("id", s.id);
    await supabase.from("application_events").insert({
      application_id: s.id,
      actor_id: profile.id,
      type: "note",
      body: `Not selected — student chose ${app.target_institution ?? "another university"}`,
    });
  }
  await supabase.from("application_events").insert({
    application_id: appId,
    actor_id: profile.id,
    type: "note",
    body: "Selected as the student's university choice",
  });
  await logAudit({
    action: "university_choice_selected",
    target_type: "application",
    target_id: appId,
  });
  revalidatePath(`/admin/students/${app.student_id}`);
  revalidatePath("/admin", "layout");
}
