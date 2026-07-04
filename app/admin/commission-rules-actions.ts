"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

async function permitted() {
  const p = await getProfile();
  return !!p && FINANCE.includes(p.role);
}

export async function createCommissionRule(
  input: RuleInput,
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!(await permitted())) return { ok: false };
  const supabase = await createClient();
  await supabase.from("commission_rules").insert({
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
  });
  await logAudit({
    action: "commission_rule_created",
    target_type: "commission_rule",
    detail: `${input.scope} · ${input.label ?? ""}`,
  });
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function toggleCommissionRule(id: string, active: boolean) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  await supabase.from("commission_rules").update({ active }).eq("id", id);
  revalidatePath("/admin/finance");
}

export async function deleteCommissionRule(id: string) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  await supabase.from("commission_rules").delete().eq("id", id);
  await logAudit({
    action: "commission_rule_deleted",
    target_type: "commission_rule",
    target_id: id,
  });
  revalidatePath("/admin/finance");
}
