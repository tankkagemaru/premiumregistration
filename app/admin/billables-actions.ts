"use server";

import { revalidatePath } from "next/cache";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

const FINANCE = ["admin", "finance"];

/**
 * Billable/price-list writes use the **service-role** client behind an explicit
 * finance gate — user-scoped writes silently no-op under RLS drift (the same
 * failure that stuck fees on "unpaid"). Returns null when the caller isn't
 * finance/admin.
 */
async function financeAdmin() {
  const p = await getProfile();
  if (!p || !FINANCE.includes(p.role)) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

/* ---- catalogue management (finance/admin) ---- */

export async function createBillableItem(input: {
  name: string;
  fee_type: string;
  category?: string;
  default_amount?: number | null;
  taxable?: boolean;
  commissionable?: boolean;
  notes?: string;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!input.name.trim()) return { ok: false };
  const supabase = await financeAdmin();
  if (!supabase) return { ok: false };
  const { error } = await supabase.from("billable_items").insert({
    name: input.name.trim(),
    fee_type: input.fee_type || "other",
    category: input.category || "misc",
    default_amount: input.default_amount ?? null,
    taxable: !!input.taxable,
    commissionable: !!input.commissionable,
    notes: input.notes?.trim() || null,
    sort_order: 9999,
  });
  if (error) return { ok: false };
  await logAudit({ action: "billable_created", target_type: "billable_item", detail: input.name.trim() });
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function updateBillableItem(
  id: string,
  patch: {
    name?: string;
    fee_type?: string;
    category?: string;
    default_amount?: number | null;
    taxable?: boolean;
    commissionable?: boolean;
    active?: boolean;
  },
) {
  if (!authConfigured) return;
  const supabase = await financeAdmin();
  if (!supabase) return;
  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.fee_type !== undefined) clean.fee_type = patch.fee_type;
  if (patch.category !== undefined) clean.category = patch.category;
  if (patch.default_amount !== undefined) clean.default_amount = patch.default_amount;
  if (patch.taxable !== undefined) clean.taxable = patch.taxable;
  if (patch.commissionable !== undefined) clean.commissionable = patch.commissionable;
  if (patch.active !== undefined) clean.active = patch.active;
  if (Object.keys(clean).length === 0) return;
  await supabase.from("billable_items").update(clean).eq("id", id);
  await logAudit({ action: "billable_updated", target_type: "billable_item", target_id: id });
  revalidatePath("/admin/finance");
}

export async function deleteBillableItem(
  id: string,
): Promise<{ ok: boolean; error?: string } | void> {
  if (!authConfigured) return;
  const supabase = await financeAdmin();
  if (!supabase) return;
  // Fees keep their provenance via billable_item_id — deleting a referenced
  // item would orphan them. Turn it off instead.
  const { count } = await supabase
    .from("fees")
    .select("id", { count: "exact", head: true })
    .eq("billable_item_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `${count} fee(s) were created from this item — set it to Off instead of deleting.`,
    };
  }
  await supabase.from("billable_items").delete().eq("id", id);
  await logAudit({ action: "billable_deleted", target_type: "billable_item", target_id: id });
  revalidatePath("/admin/finance");
  return { ok: true };
}

/* ---- creating a fee from the catalogue ---- */

/** Add a fee to an application from a billable item (amount overridable). */
export async function createFeeFromItem(input: {
  applicationId: string;
  itemId: string;
  amount?: number | null; // override; falls back to the item's default
  dueDate?: string | null;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const supabase = await financeAdmin();
  if (!supabase) return { ok: false };

  const [{ data: item }, { data: app }] = await Promise.all([
    supabase.from("billable_items").select("*").eq("id", input.itemId).maybeSingle(),
    supabase
      .from("applications")
      .select("student_name")
      .eq("id", input.applicationId)
      .maybeSingle(),
  ]);
  if (!item || !app) return { ok: false };

  const amount = input.amount ?? item.default_amount ?? 0;
  const { error } = await supabase.from("fees").insert({
    application_id: input.applicationId,
    student_name: app.student_name,
    type: item.fee_type,
    label: item.name,
    amount,
    currency: item.currency ?? "MYR",
    due_date: input.dueDate || null,
    status: "unpaid",
    billable_item_id: item.id,
  });
  if (error) return { ok: false };
  await logAudit({
    action: "fee_created",
    target_type: "application",
    target_id: input.applicationId,
    detail: `${item.name} · MYR ${amount}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* ---- invoice attach (uploaded via document actions, linked here) ---- */

export async function setFeeInvoice(feeId: string, invoiceDocId: string) {
  if (!authConfigured) return;
  const supabase = await financeAdmin();
  if (!supabase) return;
  await supabase.from("fees").update({ invoice_doc_id: invoiceDocId }).eq("id", feeId);
  await logAudit({ action: "invoice_attached", target_type: "fee", target_id: feeId });
  revalidatePath("/admin", "layout");
}
