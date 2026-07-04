"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/leads-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

// Roles allowed to hand-key records — the same set the Leads tab is shown to.
// Server-side check is defence-in-depth; RLS enforces the same at the DB.
const CREATE_ROLES = ["admin", "marketing", "admissions", "counsellor", "staff"];

export interface NewRecordInput {
  full_name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  nationality?: string; // ISO alpha-2 code (e.g. "my") to match the public form
  tracks: string[];
  note?: string; // lead mode only
}

type Result = { ok: true; id?: string } | { ok: false; error: string };

function validate(input: NewRecordInput): string | null {
  if (!input.full_name?.trim()) return "Enter the full name.";
  if (!input.email?.trim()) return "Enter an email address.";
  if (!input.tracks?.length) return "Select at least one track.";
  return null;
}

/**
 * Create an enquiry (a registrations/lead row) directly from the console — for
 * walk-ins, phone enquiries, or referrals staff key in by hand. Tagged
 * utm_source='staff' so attribution reporting can tell it apart from the public
 * form. It then flows through the normal lead → application pipeline.
 */
export async function createLeadManually(input: NewRecordInput): Promise<Result> {
  if (!authConfigured) return { ok: true }; // dev no-op (mock data)
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const profile = await getProfile();
  if (!profile || !CREATE_ROLES.includes(profile.role))
    return { ok: false, error: "You don't have permission to add records." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .insert({
      tracks: input.tracks,
      status: "new",
      full_name: input.full_name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      nationality: input.nationality || null,
      utm_source: "staff",
      details: {},
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not save the enquiry." };

  await supabase.from("lead_events").insert({
    registration_id: data.id,
    actor_id: profile.id,
    type: "note",
    body: input.note?.trim()
      ? `Enquiry added by ${profile.full_name}. ${input.note.trim()}`
      : `Enquiry added by ${profile.full_name}`,
  });
  await logAudit({
    action: "lead_created",
    target_type: "lead",
    target_id: data.id,
    detail: `${input.full_name} · ${input.tracks.join(", ")}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, id: data.id };
}

/**
 * Create a student master + one application per track directly, skipping the
 * lead stage — for confirmed walk-in enrolments. Mirrors the field mapping in
 * createApplicationFromLead. Program details are left blank to fill in later
 * from the application drawer.
 */
export async function createStudentDirect(input: NewRecordInput): Promise<Result> {
  if (!authConfigured) return { ok: true };
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const profile = await getProfile();
  if (!profile || !CREATE_ROLES.includes(profile.role))
    return { ok: false, error: "You don't have permission to add records." };

  const supabase = await createClient();
  const isInternational = (input.nationality ?? "").toLowerCase() !== "my";

  const { data: student, error: se } = await supabase
    .from("students")
    .insert({
      full_name: input.full_name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      nationality: input.nationality || null,
      is_international: isInternational,
    })
    .select("id, passport_no")
    .single();
  if (se || !student) return { ok: false, error: "Could not create the student." };

  for (const track of input.tracks) {
    // Denormalised display fields keep list reads to a plain `select *`.
    const { error: ae } = await supabase.from("applications").insert({
      student_id: student.id,
      track,
      submitted_by: "staff",
      stage: "application",
      student_name: input.full_name.trim(),
      student_email: input.email.trim(),
      passport_no: student.passport_no,
      is_international: isInternational,
    });
    if (ae) return { ok: false, error: "Student created, but an application failed to save." };
  }

  await logAudit({
    action: "student_created",
    target_type: "student",
    target_id: student.id,
    detail: `${input.full_name} · ${input.tracks.join(", ")}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, id: student.id };
}
