"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

export async function recordPayment(input: {
  applicationId: string;
  feeId: string;
  amount: number;
  method?: string;
  reference?: string;
  receiptDocId?: string; // QuickBooks receipt uploaded as an application doc
}) {
  if (!authConfigured || input.amount <= 0) return;
  const supabase = await createClient();
  const profile = await getProfile();

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
  const supabase = await createClient();
  await supabase.from("fees").update({ status }).eq("id", feeId);
  await logAudit({ action: "fee_status_changed", target_type: "fee", target_id: feeId, detail: status });
  revalidatePath("/admin", "layout");
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
  const supabase = await createClient();
  await supabase
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
  const supabase = await createClient();
  await supabase
    .from("commissions")
    .update({ status, ...(status === "paid" ? { paid_at: new Date().toISOString().slice(0, 10) } : {}) })
    .eq("id", id);
  await logAudit({ action: "commission_status_changed", target_type: "commission", target_id: id, detail: status });
  revalidatePath("/admin", "layout");
}
