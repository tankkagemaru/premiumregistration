"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";
import { slugify } from "@/lib/admin/catalog-shared";

/** Request a one-off document from a specific student (e.g. an EMGS extra). */
export async function createAppDocRequest(input: {
  applicationId: string;
  label: string;
  note?: string;
  optional?: boolean;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!input.label.trim()) return { ok: false };
  const supabase = await createClient();
  const profile = await getProfile();
  const { error } = await supabase.from("app_doc_requests").insert({
    application_id: input.applicationId,
    // Underscores, not hyphens: the status upload route sanitizes kind with \w,
    // which keeps underscores — so the uploaded doc's kind matches the request.
    kind: slugify(input.label).replace(/-/g, "_"),
    label: input.label.trim(),
    note: input.note?.trim() || null,
    optional: !!input.optional,
    created_by: profile?.id ?? null,
  });
  if (error) return { ok: false };
  // Timeline entry so the request is visible in the application's history.
  await supabase.from("application_events").insert({
    application_id: input.applicationId,
    actor_id: profile?.id,
    type: "doc_request",
    body: `Requested document: ${input.label.trim()}`,
  });
  await logAudit({
    action: "doc_requested",
    target_type: "application",
    target_id: input.applicationId,
    detail: input.label.trim(),
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteAppDocRequest(id: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase.from("app_doc_requests").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}
