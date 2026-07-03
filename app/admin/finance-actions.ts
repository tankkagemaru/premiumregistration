"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";

export async function recordPayment(input: {
  applicationId: string;
  feeId: string;
  amount: number;
  method?: string;
  reference?: string;
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

  revalidatePath("/admin", "layout");
}

export async function setFeeStatus(feeId: string, status: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase.from("fees").update({ status }).eq("id", feeId);
  revalidatePath("/admin", "layout");
}

export async function setCommissionStatus(id: string, status: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase
    .from("commissions")
    .update({ status, ...(status === "paid" ? { paid_at: new Date().toISOString().slice(0, 10) } : {}) })
    .eq("id", id);
  revalidatePath("/admin", "layout");
}
