"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/applications-shared";
import { logAudit } from "@/lib/admin/audit";

const BUCKET = "registration-docs";

/** The commission belongs to the calling agent and finance has opened it for
 *  claiming — returns its application id, else null. */
async function claimableCommission(commissionId: string) {
  const profile = await getProfile();
  if (!profile || profile.role !== "agent") return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("commissions")
    .select("id, application_id, agent_id, claim_ready")
    .eq("id", commissionId)
    .maybeSingle();
  if (!c || c.agent_id !== profile.id || !c.claim_ready || !c.application_id) return null;
  return { admin, profile, applicationId: c.application_id as string };
}

/** Mint a signed upload URL for an agent's commission claim invoice. */
export async function createClaimUploadUrl(
  commissionId: string,
  filename: string,
): Promise<{ path: string; token: string } | { error: string }> {
  if (!authConfigured) return { error: "dev" };
  const ctx = await claimableCommission(commissionId);
  if (!ctx) return { error: "forbidden" };
  const safe = filename.replace(/[^\w.\-]/g, "_");
  const path = `applications/${ctx.applicationId}/claim_invoice/${randomUUID()}-${safe}`;
  const { data, error } = await ctx.admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "sign_failed" };
  return { path, token: data.token };
}

/** Register the uploaded claim invoice against the commission (→ 'invoiced'). */
export async function recordClaimInvoice(
  commissionId: string,
  storagePath: string,
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: false };
  const ctx = await claimableCommission(commissionId);
  if (!ctx) return { ok: false };
  const { data: doc } = await ctx.admin
    .from("application_documents")
    .insert({
      application_id: ctx.applicationId,
      kind: "claim_invoice",
      storage_path: storagePath,
      uploaded_by: ctx.profile.id,
      review_status: "pending",
    })
    .select("id")
    .single();
  await ctx.admin
    .from("commissions")
    .update({ claim_invoice_doc_id: doc?.id ?? null, status: "invoiced" })
    .eq("id", commissionId);
  await ctx.admin.from("application_events").insert({
    application_id: ctx.applicationId,
    actor_id: ctx.profile.id,
    type: "note",
    body: `Agent ${ctx.profile.full_name} uploaded a commission claim invoice`,
  });
  await logAudit({ action: "claim_invoice_uploaded", target_type: "commission", target_id: commissionId });
  revalidatePath("/agent");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * An agent submits a student directly from their portal. Inserted with the
 * service-role client (agents have no write access under RLS) after verifying
 * the caller really is an agent; the lead is stamped with THEIR agent code, so
 * it can't be attributed to anyone else.
 */
export async function createAgentReferral(input: {
  full_name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  nationality?: string;
  tracks: string[];
  university?: string;
  program?: string;
  note?: string;
}): Promise<{ ok: boolean; code?: string; id?: string; error?: string }> {
  if (!authConfigured) return { ok: true, code: "DEV-MODE" };
  const profile = await getProfile();
  if (!profile || profile.role !== "agent" || !profile.agent_code) {
    return { ok: false, error: "forbidden" };
  }
  if (!input.full_name.trim() || !input.email.trim() || !input.phone.trim()) {
    return { ok: false, error: "missing" };
  }
  const tracks = input.tracks.filter((t) =>
    ["english", "university", "corporate"].includes(t),
  );
  if (tracks.length === 0) return { ok: false, error: "tracks" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("registrations")
    .insert({
      tracks,
      full_name: input.full_name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp?.trim() || null,
      nationality: input.nationality?.trim() || null,
      agent_code: profile.agent_code,
      utm_source: "agent_portal",
      details: {
        agent_note: input.note?.trim() || undefined,
        referred_by_agent: profile.id,
        university: input.university?.trim() || undefined,
        program: input.program?.trim() || undefined,
      },
    })
    .select("id, access_code")
    .single();
  if (error || !row) return { ok: false, error: "insert" };

  await admin.from("lead_events").insert({
    registration_id: row.id,
    actor_id: profile.id,
    type: "note",
    body: `Referred by agent ${profile.full_name} (${profile.agent_code}) via the portal`,
  });
  await logAudit({
    action: "agent_referral",
    target_type: "lead",
    target_id: row.id,
    detail: `${input.full_name.trim()} · ${profile.agent_code}`,
  });
  revalidatePath("/agent");
  return {
    ok: true,
    code: (row.access_code as string) ?? undefined,
    id: row.id as string,
  };
}

/** The lead was referred by the calling agent — else null. */
async function ownedLead(registrationId: string) {
  const profile = await getProfile();
  if (!profile || profile.role !== "agent") return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: reg } = await admin
    .from("registrations")
    .select("id, agent_code, details")
    .eq("id", registrationId)
    .maybeSingle();
  const referredByMe =
    reg &&
    (reg.agent_code === profile.agent_code ||
      (reg.details as { referred_by_agent?: string } | null)?.referred_by_agent === profile.id);
  return referredByMe ? { admin, profile } : null;
}

const LEAD_DOC_KINDS = ["passport", "transcript", "certificate", "photo", "financial", "english_test", "other"];

/** The application belongs to the calling agent — else null. */
async function ownedApplication(applicationId: string) {
  const profile = await getProfile();
  if (!profile || profile.role !== "agent") return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("applications")
    .select("id, agent_id")
    .eq("id", applicationId)
    .maybeSingle();
  return a && a.agent_id === profile.id ? { admin, profile } : null;
}

/** Signed upload URL for a document on the agent's (converted) student. */
export async function createStudentDocUploadUrl(
  applicationId: string,
  kind: string,
  filename: string,
): Promise<{ path: string; token: string } | { error: string }> {
  if (!authConfigured) return { error: "dev" };
  if (!LEAD_DOC_KINDS.includes(kind)) return { error: "kind" };
  const ctx = await ownedApplication(applicationId);
  if (!ctx) return { error: "forbidden" };
  const safe = filename.replace(/[^\w.\-]/g, "_");
  const path = `applications/${applicationId}/${kind}/${randomUUID()}-${safe}`;
  const { data, error } = await ctx.admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "sign_failed" };
  return { path, token: data.token };
}

/** Register an uploaded document on the agent's student. */
export async function recordStudentDoc(
  applicationId: string,
  kind: string,
  storagePath: string,
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: false };
  const ctx = await ownedApplication(applicationId);
  if (!ctx) return { ok: false };
  await ctx.admin.from("application_documents").insert({
    application_id: applicationId,
    kind,
    storage_path: storagePath,
    uploaded_by: ctx.profile.id,
    review_status: "pending",
  });
  await ctx.admin.from("application_events").insert({
    application_id: applicationId,
    actor_id: ctx.profile.id,
    type: "note",
    body: `Agent ${ctx.profile.full_name} uploaded ${kind.replace(/_/g, " ")}`,
  });
  await logAudit({ action: "agent_student_doc_uploaded", target_type: "application", target_id: applicationId, detail: kind });
  revalidatePath("/agent");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Mint a signed upload URL for a document on an agent's referred lead. */
export async function createLeadDocUploadUrl(
  registrationId: string,
  kind: string,
  filename: string,
): Promise<{ path: string; token: string } | { error: string }> {
  if (!authConfigured) return { error: "dev" };
  if (!LEAD_DOC_KINDS.includes(kind)) return { error: "kind" };
  const ctx = await ownedLead(registrationId);
  if (!ctx) return { error: "forbidden" };
  const safe = filename.replace(/[^\w.\-]/g, "_");
  const path = `registrations/${registrationId}/${kind}/${randomUUID()}-${safe}`;
  const { data, error } = await ctx.admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "sign_failed" };
  return { path, token: data.token };
}

/** Register an uploaded lead document. */
export async function recordLeadDoc(
  registrationId: string,
  kind: string,
  storagePath: string,
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: false };
  const ctx = await ownedLead(registrationId);
  if (!ctx) return { ok: false };
  await ctx.admin.from("registration_documents").insert({
    registration_id: registrationId,
    kind,
    storage_path: storagePath,
    review_status: "pending",
  });
  await logAudit({ action: "agent_lead_doc_uploaded", target_type: "lead", target_id: registrationId, detail: kind });
  revalidatePath("/agent");
  return { ok: true };
}
