"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { FEE_TYPE_LABEL, type FeeType } from "@/lib/admin/finance-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

// The Visa module is viewable by everyone, but only the visa team + admin edit.
async function canEditVisa() {
  const p = await getProfile();
  return !!p && ["admin", "visa"].includes(p.role);
}

/**
 * Visa flags a payment owed to EMGS / Immigration (or medical) on an
 * application: creates the unpaid fee so it shows in Finance's outstanding list,
 * and raises a request for Finance to invoice + collect. Service-role — fees are
 * finance-write under RLS; the role gate here is the real control.
 */
export async function flagVisaPayment(input: {
  applicationId: string;
  type: string; // visa_emgs | immigration | medical
  label?: string; // price-list item name, else the fee-type label
  amount?: number;
  note?: string;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const profile = await getProfile();
  if (!profile || !["admin", "visa"].includes(profile.role)) return { ok: false };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("student_name")
    .eq("id", input.applicationId)
    .maybeSingle();
  const label = input.label?.trim() || FEE_TYPE_LABEL[input.type as FeeType] || "Visa payment";
  const amount = Number.isFinite(input.amount) && (input.amount ?? 0) > 0 ? input.amount! : 0;

  await admin.from("fees").insert({
    application_id: input.applicationId,
    student_name: app?.student_name ?? "",
    type: input.type,
    label,
    amount,
    currency: "MYR",
    status: "unpaid",
  });

  const { createActionRequest } = await import("./request-actions");
  await createActionRequest({
    applicationId: input.applicationId,
    subject: app?.student_name,
    toRole: "finance",
    type: "request",
    title: `Collect ${label}`,
    detail: input.note?.trim() || `Visa flagged a ${label} to invoice and collect${amount ? ` (approx MYR ${amount})` : ""}.`,
  });

  await admin.from("application_events").insert({
    application_id: input.applicationId,
    actor_id: profile.id,
    type: "note",
    body: `Visa flagged payment — ${label}${amount ? ` (MYR ${amount})` : ""}, sent to Finance.`,
  });
  await logAudit({ action: "visa_payment_flagged", target_type: "application", target_id: input.applicationId, detail: label });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateVisaCase(
  id: string,
  patch: {
    stage?: string;
    kind?: string;
    checklist?: Record<string, boolean>;
    emgs_ref?: string | null;
    eval_status?: string | null;
    medical_status?: string | null;
    medical_booked_date?: string | null;
    medical_location?: string | null;
    val_status?: string | null;
    single_entry_visa?: string | null;
    arrival_date?: string | null;
    student_pass_expiry?: string | null;
  },
) {
  if (!authConfigured || !(await canEditVisa())) return;
  const supabase = await createClient();
  await supabase
    .from("visa_cases")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  await logAudit({ action: "visa_updated", target_type: "visa_case", target_id: id, detail: JSON.stringify(patch) });
  revalidatePath("/admin", "layout");
}

export async function createVisaCase(
  applicationId: string,
  submittedBy: "university" | "pecsb",
) {
  if (!authConfigured || !(await canEditVisa())) return;
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("student_name, target_institution, program_name")
    .eq("id", applicationId)
    .single();
  await supabase.from("visa_cases").insert({
    application_id: applicationId,
    submitted_by: submittedBy,
    stage: "emgs_submitted",
    kind: "initial",
    student_name: app?.student_name ?? null,
    target: app?.target_institution ?? app?.program_name ?? null,
  });
  await logAudit({ action: "visa_case_created", target_type: "application", target_id: applicationId, detail: `filed by ${submittedBy}` });
  revalidatePath("/admin", "layout");
}

/**
 * Open a renewal cycle for a student already on a pass. Creates a fresh
 * `kind='renewal'` case on the same application (a new row, so the original
 * initial case stays as the history), carrying over the filer + target.
 */
export async function startRenewal(fromCaseId: string) {
  if (!authConfigured || !(await canEditVisa())) return;
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from("visa_cases")
    .select("application_id, student_name, target, submitted_by, emgs_ref, student_pass_expiry")
    .eq("id", fromCaseId)
    .single();
  if (!prev) return;
  await supabase.from("visa_cases").insert({
    application_id: prev.application_id,
    submitted_by: prev.submitted_by,
    stage: "renewal_started",
    kind: "renewal",
    student_name: prev.student_name,
    target: prev.target,
    emgs_ref: prev.emgs_ref,
    student_pass_expiry: prev.student_pass_expiry,
  });
  await logAudit({ action: "visa_renewal_started", target_type: "application", target_id: prev.application_id });
  revalidatePath("/admin", "layout");
}
