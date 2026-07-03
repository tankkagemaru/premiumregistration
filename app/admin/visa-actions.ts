"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { logAudit } from "@/lib/admin/audit";

export async function updateVisaCase(
  id: string,
  patch: {
    stage?: string;
    medical_status?: string;
    emgs_ref?: string;
    student_pass_expiry?: string | null;
  },
) {
  if (!authConfigured) return;
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
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase.from("visa_cases").insert({
    application_id: applicationId,
    submitted_by: submittedBy,
    stage: "docs_prep",
  });
  await logAudit({ action: "visa_case_created", target_type: "application", target_id: applicationId, detail: `filed by ${submittedBy}` });
  revalidatePath("/admin", "layout");
}
