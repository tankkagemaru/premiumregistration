"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/** One line of what marketing is selling a lead — kept on the lead, scaffolded
 *  as fees on the application when the lead converts. */
export interface QuoteItem {
  name: string;
  fee_type: string; // maps to fees.type
  amount: number;
  currency: string;
}

const QUOTE_ROLES = ["admin", "marketing", "admissions", "counsellor", "staff"];

/** Save the preliminary quote (what we discussed / are selling) onto a lead. */
export async function saveLeadQuote(
  leadId: string,
  items: QuoteItem[],
): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const profile = await getProfile();
  if (!profile || !QUOTE_ROLES.includes(profile.role)) return { ok: false };

  const supabase = await createClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("details")
    .eq("id", leadId)
    .maybeSingle();

  const clean = items
    .filter((i) => i.name?.trim())
    .map((i) => ({
      name: i.name.trim(),
      fee_type: i.fee_type || "other",
      amount: Number(i.amount) || 0,
      currency: i.currency || "MYR",
    }));

  const details = { ...((reg?.details as Record<string, unknown>) ?? {}), quote: clean };
  await supabase.from("registrations").update({ details }).eq("id", leadId);
  await logAudit({ action: "lead_quote_saved", target_type: "lead", target_id: leadId, detail: `${clean.length} item(s)` });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
