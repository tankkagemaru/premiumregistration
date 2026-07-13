"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/leads-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/**
 * Correct a person's identity fields after submission (a mis-typed name, a wrong
 * passport number, etc.). Gated to the three front-of-funnel roles that own data
 * entry; every change is diffed onto the record's timeline + audit log because
 * name/passport are sensitive PII.
 *
 * Two entry points, because the same person lives in two shapes:
 *   - a LEAD is a single `registrations` row (edited in place);
 *   - once converted, the canonical identity is the `students` row, and name /
 *     email / passport are DENORMALISED onto applications, fees and visa_cases —
 *     so an application-side edit must cascade to those snapshots or the old
 *     value keeps surfacing in Finance / Visa lists.
 *
 * Note: nationality is corrected as text but `is_international` is intentionally
 * left untouched — flipping it mid-pipeline would silently re-route the visa
 * flow, which is not what "fix a typo" should do.
 */

// Same set the user picked: admin + the two data-entry teams. (Marketing has no
// application-page access, so in practice it only reaches the lead path.)
const EDIT_ROLES = ["admin", "marketing", "admissions"];

export interface ContactPatch {
  full_name: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  nationality?: string | null;
  passport_no?: string | null;
}

type Res = { ok: true } | { ok: false; error: string };

function clean(patch: ContactPatch) {
  return {
    full_name: patch.full_name.trim(),
    email: patch.email.trim(),
    phone: patch.phone?.trim() || null,
    whatsapp: patch.whatsapp?.trim() || null,
    nationality: patch.nationality?.trim() || null,
    passport_no: patch.passport_no?.trim() || null,
  };
}

function validate(c: { full_name: string; email: string }): string | null {
  if (!c.full_name) return "Enter the full name.";
  if (!c.email) return "Enter an email address.";
  return null;
}

const FIELD_LABEL: Record<string, string> = {
  full_name: "name",
  email: "email",
  phone: "phone",
  whatsapp: "WhatsApp",
  nationality: "nationality",
  passport_no: "passport / ID",
};

/** Human-readable list of only the fields that actually changed. */
function diffSummary(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (const key of Object.keys(FIELD_LABEL)) {
    if (!(key in after)) continue;
    const b = String(before[key] ?? "");
    const a = String(after[key] ?? "");
    if (b !== a) parts.push(`${FIELD_LABEL[key]}: "${b || "—"}" → "${a || "—"}"`);
  }
  return parts.join("; ");
}

/** Correct the contact/identity fields on a LEAD (registrations row). */
export async function updateLeadContact(id: string, patch: ContactPatch): Promise<Res> {
  if (!authConfigured) return { ok: true }; // dev no-op (mock data)
  const profile = await getProfile();
  if (!profile || !EDIT_ROLES.includes(profile.role))
    return { ok: false, error: "You don't have permission to edit contact details." };

  const c = clean(patch);
  const err = validate(c);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("registrations")
    .select("full_name,email,phone,whatsapp,nationality,passport_no")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("registrations").update(c).eq("id", id);
  if (error) return { ok: false, error: "Could not save the changes." };

  const summary = before ? diffSummary(before, c) : "";
  if (summary) {
    await supabase.from("lead_events").insert({
      registration_id: id,
      actor_id: profile.id,
      type: "note",
      body: `Contact details corrected — ${summary}`,
    });
    await logAudit({ action: "lead_contact_edited", target_type: "lead", target_id: id, detail: summary });
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Correct the contact/identity fields on a converted student, keyed by one of
 * their applications. Updates the canonical `students` row and cascades the
 * denormalised name/email/passport snapshots to every application of that
 * student, plus their fees and visa_cases. Runs on the service-role client
 * (the cascade spans finance/visa-owned tables), gated by role above.
 */
export async function updateStudentContact(
  applicationId: string,
  patch: ContactPatch,
): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const profile = await getProfile();
  if (!profile || !EDIT_ROLES.includes(profile.role))
    return { ok: false, error: "You don't have permission to edit contact details." };

  const c = clean(patch);
  const err = validate(c);
  if (err) return { ok: false, error: err };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: app } = await admin
    .from("applications")
    .select("id, student_id, student_name, student_email, passport_no")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return { ok: false, error: "Application not found." };

  const studentId = (app.student_id as string | null) ?? null;

  // Canonical source of truth for the before/after diff.
  let before: Record<string, unknown>;
  if (studentId) {
    const { data: s } = await admin
      .from("students")
      .select("full_name,email,phone,whatsapp,nationality,passport_no")
      .eq("id", studentId)
      .maybeSingle();
    before = s ?? {};
    await admin.from("students").update(c).eq("id", studentId);
  } else {
    // Orphan application (no student master) — diff against its own snapshot.
    before = {
      full_name: app.student_name,
      email: app.student_email,
      passport_no: app.passport_no,
    };
  }

  // Every application belonging to this person (so a shared name/passport fix
  // lands on all of them), else just this one.
  const appIds = studentId
    ? ((await admin.from("applications").select("id").eq("student_id", studentId)).data ?? []).map(
        (a) => a.id as string,
      )
    : [applicationId];

  if (appIds.length) {
    await admin
      .from("applications")
      .update({ student_name: c.full_name, student_email: c.email, passport_no: c.passport_no })
      .in("id", appIds);
    // fees + visa_cases carry a denormalised student_name snapshot.
    await admin.from("fees").update({ student_name: c.full_name }).in("application_id", appIds);
    await admin.from("visa_cases").update({ student_name: c.full_name }).in("application_id", appIds);
  }

  const summary = diffSummary(before, c);
  if (summary) {
    await admin.from("application_events").insert({
      application_id: applicationId,
      actor_id: profile.id,
      type: "note",
      body: `Contact details corrected — ${summary}`,
    });
    await logAudit({
      action: "student_contact_edited",
      target_type: studentId ? "student" : "application",
      target_id: studentId ?? applicationId,
      detail: summary,
    });
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
