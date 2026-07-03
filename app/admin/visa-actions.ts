"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";

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
  revalidatePath("/admin", "layout");
}
