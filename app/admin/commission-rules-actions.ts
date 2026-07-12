"use server";

import { revalidatePath } from "next/cache";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

const FINANCE = ["admin", "finance"];

export interface RuleInput {
  scope: string;
  label?: string;
  subject_id?: string;
  university?: string;
  track?: string;
  category?: string;
  basis: string;
  rate?: number | null;
  our_share_pct?: number | null;
  min_students?: number | null;
  base_amount?: number | null;
  base_fee_type?: string | null;
}

/**
 * Commission-rule writes go through the **service-role** client behind an
 * explicit finance gate — the same reason finance fee writes do (see
 * finance-actions): the earlier user-scoped writes silently no-op'd when the
 * RLS policy didn't match, which is why rules "couldn't be edited". The role
 * gate here is the real access control.
 */
async function financeAdmin() {
  const p = await getProfile();
  if (!p || !FINANCE.includes(p.role)) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

function ruleRow(input: RuleInput) {
  return {
    scope: input.scope,
    label: input.label || null,
    subject_id: input.subject_id || null,
    university: input.university || null,
    track: input.track || null,
    category: input.category || null,
    basis: input.basis,
    rate: input.rate ?? null,
    our_share_pct: input.our_share_pct ?? null,
    min_students: input.min_students ?? null,
    base_amount: input.base_amount ?? null,
    base_fee_type: input.base_fee_type || null,
  };
}

export async function createCommissionRule(
  input: RuleInput,
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const admin = await financeAdmin();
  if (!admin) return { ok: false };
  await admin.from("commission_rules").insert(ruleRow(input));
  await logAudit({
    action: "commission_rule_created",
    target_type: "commission_rule",
    detail: `${input.scope} · ${input.label ?? ""}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateCommissionRule(
  id: string,
  input: RuleInput,
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const admin = await financeAdmin();
  if (!admin) return { ok: false };
  await admin.from("commission_rules").update(ruleRow(input)).eq("id", id);
  await logAudit({
    action: "commission_rule_updated",
    target_type: "commission_rule",
    target_id: id,
    detail: `${input.scope} · ${input.label ?? ""}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function toggleCommissionRule(id: string, active: boolean) {
  if (!authConfigured) return;
  const admin = await financeAdmin();
  if (!admin) return;
  await admin.from("commission_rules").update({ active }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function deleteCommissionRule(id: string) {
  if (!authConfigured) return;
  const admin = await financeAdmin();
  if (!admin) return;
  await admin.from("commission_rules").delete().eq("id", id);
  await logAudit({
    action: "commission_rule_deleted",
    target_type: "commission_rule",
    target_id: id,
  });
  revalidatePath("/admin", "layout");
}
