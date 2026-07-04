"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

async function isAdmin() {
  const p = await getProfile();
  return !!p && p.role === "admin";
}

export interface DocRuleInput {
  kind: string;
  label: string;
  note?: string;
  optional?: boolean;
  track?: string; // "" / undefined = any
  level?: string; // "" / undefined = any
  applies_to: string;
  nationality?: string; // "" / undefined = any
  stage: string;
}

export async function createDocRule(input: DocRuleInput): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!(await isAdmin()) || !input.label.trim() || !input.kind.trim()) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("document_rules").insert({
    kind: input.kind.trim(),
    label: input.label.trim(),
    note: input.note?.trim() || null,
    optional: !!input.optional,
    track: input.track || null,
    level: input.level || null,
    applies_to: input.applies_to,
    nationality: input.nationality?.trim().toLowerCase() || null,
    stage: input.stage,
    sort_order: 9999,
  });
  if (error) return { ok: false };
  await logAudit({ action: "doc_rule_created", target_type: "document_rule", detail: `${input.kind} · ${input.label.trim()}` });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function updateDocRule(
  id: string,
  patch: { optional?: boolean; active?: boolean; label?: string },
) {
  if (!authConfigured || !(await isAdmin())) return;
  const supabase = await createClient();
  const clean: Record<string, unknown> = {};
  if (patch.optional !== undefined) clean.optional = patch.optional;
  if (patch.active !== undefined) clean.active = patch.active;
  if (patch.label !== undefined) clean.label = patch.label.trim();
  if (Object.keys(clean).length === 0) return;
  await supabase.from("document_rules").update(clean).eq("id", id);
  await logAudit({ action: "doc_rule_updated", target_type: "document_rule", target_id: id });
  revalidatePath("/admin/settings");
}

export async function deleteDocRule(id: string) {
  if (!authConfigured || !(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("document_rules").delete().eq("id", id);
  await logAudit({ action: "doc_rule_deleted", target_type: "document_rule", target_id: id });
  revalidatePath("/admin/settings");
}
