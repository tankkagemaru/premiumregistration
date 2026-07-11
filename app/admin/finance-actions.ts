"use server";

import { revalidatePath } from "next/cache";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/**
 * Finance mutations write with the **service-role** client (like document
 * uploads do), gated by an explicit role check here rather than by RLS. This
 * ties write-permission to the same source of truth that lets a user reach the
 * Finance page (getProfile → profiles.role), so a live RLS drift can't silently
 * swallow the write — the earlier user-scoped writes failed with no error when
 * the policy didn't match, leaving fees stuck on "unpaid".
 */
async function financeClient() {
  const profile = await getProfile();
  if (!profile || !["admin", "finance"].includes(profile.role)) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return { admin: createAdminClient(), profile };
}

export async function recordPayment(input: {
  applicationId: string;
  feeId: string;
  amount: number;
  method?: string;
  reference?: string;
  receiptDocId?: string; // QuickBooks receipt uploaded as an application doc
}) {
  if (!authConfigured || input.amount <= 0) return;
  const ctx = await financeClient();
  if (!ctx) return;
  const { admin: supabase, profile } = ctx;

  await supabase.from("payments").insert({
    application_id: input.applicationId,
    fee_id: input.feeId,
    amount: input.amount,
    method: input.method ?? null,
    reference: input.reference ?? null,
    recorded_by: profile?.id,
    receipt_doc_id: input.receiptDocId ?? null,
  });

  // Recompute the fee's status from total received.
  const { data: fee } = await supabase
    .from("fees")
    .select("amount")
    .eq("id", input.feeId)
    .single();
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("fee_id", input.feeId);
  const received = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const status =
    fee && received >= Number(fee.amount) ? "paid" : received > 0 ? "partial" : "unpaid";
  await supabase.from("fees").update({ status }).eq("id", input.feeId);

  await logAudit({ action: "payment_recorded", target_type: "fee", target_id: input.feeId, detail: `MYR ${input.amount}${input.reference ? " · " + input.reference : ""}` });
  revalidatePath("/admin", "layout");
}

export async function setFeeStatus(feeId: string, status: string) {
  if (!authConfigured) return;
  const ctx = await financeClient();
  if (!ctx) return;
  await ctx.admin.from("fees").update({ status }).eq("id", feeId);
  await logAudit({ action: "fee_status_changed", target_type: "fee", target_id: feeId, detail: status });
  revalidatePath("/admin", "layout");
}

/**
 * Set a fee's amount. Fees scaffolded by stage automation land at MYR 0; this is
 * how finance keys in the real figure (there was previously no way to, so fees
 * stayed stuck at 0 / unpaid). Re-derives the paid/unpaid status against what's
 * already been received so raising or lowering the amount stays consistent.
 */
export async function setFeeAmount(feeId: string, amount: number) {
  if (!authConfigured || !Number.isFinite(amount) || amount < 0) return;
  const ctx = await financeClient();
  if (!ctx) return;
  const { data: payments } = await ctx.admin
    .from("payments")
    .select("amount")
    .eq("fee_id", feeId);
  const received = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const status =
    amount > 0 && received >= amount ? "paid" : received > 0 ? "partial" : "unpaid";
  await ctx.admin.from("fees").update({ amount, status }).eq("id", feeId);
  await logAudit({ action: "fee_amount_set", target_type: "fee", target_id: feeId, detail: `MYR ${amount}` });
  revalidatePath("/admin", "layout");
}

/**
 * Waive a fee with a required reason (promo, scholarship, exemption…). Admissions
 * as well as finance can waive — so it's a service-role write behind an explicit
 * role gate (fee writes are finance-only under RLS). The reason is stored on the
 * fee and logged to the student timeline.
 */
export async function waiveFee(
  feeId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!authConfigured) return { ok: true };
  if (!reason.trim()) return { ok: false, error: "Enter a reason for the waiver." };
  const profile = await getProfile();
  if (!profile || !["admin", "admissions", "finance"].includes(profile.role))
    return { ok: false, error: "forbidden" };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: fee } = await admin
    .from("fees")
    .select("application_id, type")
    .eq("id", feeId)
    .maybeSingle();
  await admin.from("fees").update({ status: "waived", waive_reason: reason.trim() }).eq("id", feeId);
  if (fee?.application_id) {
    await admin.from("application_events").insert({
      application_id: fee.application_id,
      actor_id: profile.id,
      type: "note",
      body: `Fee waived (${fee.type ?? "fee"}) — ${reason.trim()}`,
    });
  }
  await logAudit({ action: "fee_waived", target_type: "fee", target_id: feeId, detail: reason.trim() });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Waive the registration requirement for an application (promo / scholarship) —
 * upserts a waived registration fee carrying the reason. Also the gate escape for
 * registration → admissions when the student isn't charged registration.
 */
export async function waiveRegistration(
  applicationId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!authConfigured) return { ok: true };
  if (!reason.trim()) return { ok: false, error: "Enter a reason for the waiver." };
  const profile = await getProfile();
  if (!profile || !["admin", "admissions", "finance"].includes(profile.role))
    return { ok: false, error: "forbidden" };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const [{ data: existing }, { data: app }] = await Promise.all([
    admin.from("fees").select("id").eq("application_id", applicationId).eq("type", "registration").limit(1).maybeSingle(),
    admin.from("applications").select("student_name").eq("id", applicationId).maybeSingle(),
  ]);
  if (existing?.id) {
    await admin.from("fees").update({ status: "waived", waive_reason: reason.trim() }).eq("id", existing.id);
  } else {
    await admin.from("fees").insert({
      application_id: applicationId,
      student_name: app?.student_name ?? "",
      type: "registration",
      amount: 0,
      currency: "MYR",
      status: "waived",
      waive_reason: reason.trim(),
    });
  }
  await admin.from("application_events").insert({
    application_id: applicationId,
    actor_id: profile.id,
    type: "note",
    body: `Registration fee waived — ${reason.trim()}`,
  });
  await logAudit({ action: "registration_waived", target_type: "application", target_id: applicationId, detail: reason.trim() });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Set a commission's payable/receivable amount, optionally recording the base
 * fee it was computed from (base × rate). Lets finance price a single deal up or
 * down for promotions without touching the underlying rule.
 */
export async function setCommissionAmount(
  id: string,
  amount: number,
  baseAmount?: number | null,
) {
  if (!authConfigured || !Number.isFinite(amount) || amount < 0) return;
  const ctx = await financeClient();
  if (!ctx) return;
  await ctx.admin
    .from("commissions")
    .update({ amount, base_amount: baseAmount ?? null })
    .eq("id", id);
  await logAudit({
    action: "commission_amount_set",
    target_type: "commission",
    target_id: id,
    detail: `MYR ${amount}${baseAmount != null ? ` (base ${baseAmount})` : ""}`,
  });
  revalidatePath("/admin", "layout");
}

export async function setCommissionStatus(id: string, status: string) {
  if (!authConfigured) return;
  const ctx = await financeClient();
  if (!ctx) return;
  await ctx.admin
    .from("commissions")
    .update({ status, ...(status === "paid" ? { paid_at: new Date().toISOString().slice(0, 10) } : {}) })
    .eq("id", id);
  await logAudit({ action: "commission_status_changed", target_type: "commission", target_id: id, detail: status });
  revalidatePath("/admin", "layout");
}
