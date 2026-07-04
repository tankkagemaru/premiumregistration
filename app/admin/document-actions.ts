"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

const BUCKET = "registration-docs";
// finance included so receipts can be attached to payments.
const UPLOAD_ROLES = ["admin", "admissions", "visa", "finance", "counsellor", "staff"];

async function permitted() {
  const p = await getProfile();
  return p && UPLOAD_ROLES.includes(p.role) ? p : null;
}

/**
 * Mint a short-lived signed upload URL for a document on an application. The
 * client PUTs the file straight to Storage (bypassing the 4.5 MB function
 * limit), then calls recordApplicationDoc to register the row.
 */
export async function createAppDocUploadUrl(
  applicationId: string,
  kind: string,
  filename: string,
): Promise<{ path: string; token: string } | { error: string }> {
  if (!authConfigured) return { error: "dev" };
  if (!(await permitted())) return { error: "forbidden" };
  const safe = filename.replace(/[^\w.\-]/g, "_");
  const path = `applications/${applicationId}/${kind}/${randomUUID()}-${safe}`;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "sign_failed" };
  return { path, token: data.token };
}

export async function recordApplicationDoc(
  applicationId: string,
  kind: string,
  storagePath: string,
): Promise<{ ok: boolean; id?: string }> {
  const profile = await permitted();
  if (!authConfigured || !profile) return { ok: false };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: inserted } = await admin
    .from("application_documents")
    .insert({
      application_id: applicationId,
      kind,
      storage_path: storagePath,
      uploaded_by: profile.id,
      review_status: "pending",
    })
    .select("id")
    .single();
  await logAudit({
    action: "document_uploaded",
    target_type: "application",
    target_id: applicationId,
    detail: kind,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, id: (inserted?.id as string) ?? undefined };
}

export async function setAppDocReview(docId: string, status: string) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  await supabase
    .from("application_documents")
    .update({ review_status: status })
    .eq("id", docId);
  await logAudit({ action: "doc_review_changed", target_type: "document", target_id: docId, detail: status });
  revalidatePath("/admin", "layout");
}

export async function deleteApplicationDoc(docId: string) {
  if (!authConfigured || !(await permitted())) return;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("application_documents")
    .select("storage_path")
    .eq("id", docId)
    .maybeSingle();
  if (doc?.storage_path) await admin.storage.from(BUCKET).remove([doc.storage_path]);
  await admin.from("application_documents").delete().eq("id", docId);
  await logAudit({ action: "document_deleted", target_type: "document", target_id: docId });
  revalidatePath("/admin", "layout");
}
