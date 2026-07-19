"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/applications-shared";
import { logAudit } from "@/lib/admin/audit";
import {
  AGENT_PARTICULAR_KEYS,
  missingAgentFields,
  type AgreementParticulars,
  type AgreementScheme,
  type AgentAgreement,
} from "@/lib/admin/agreements-shared";

const FINANCE = ["admin", "finance"];
const BUCKET = "registration-docs";

type Res = { ok: true; id?: string } | { ok: false; error: string };

/** Finance/admin caller + service-role client (RLS on the table is read-only). */
async function financeCtx() {
  const profile = await getProfile();
  if (!profile || !FINANCE.includes(profile.role)) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return { profile, admin: createAdminClient() };
}

/** The calling agent + the agreement, only if it belongs to them. */
async function agentCtx(agreementId: string) {
  const profile = await getProfile();
  if (!profile || profile.role !== "agent") return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();
  const agr = data as AgentAgreement | null;
  if (!agr || agr.agent_id !== profile.id) return null;
  return { profile, admin, agr };
}

async function notify(
  admin: NonNullable<Awaited<ReturnType<typeof financeCtx>>>["admin"],
  userId: string | null | undefined,
  title: string,
  type = "agreement",
) {
  if (!userId) return;
  await admin.from("notifications").insert({ user_id: userId, type, payload: { title } });
}

/** Finance creates a draft agreement for an agent, seeded with sane defaults. */
export async function createAgreement(agentId: string): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await financeCtx();
  if (!ctx) return { ok: false, error: "forbidden" };

  const { data: agent } = await ctx.admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent || agent.role !== "agent") return { ok: false, error: "not_an_agent" };

  const particulars: AgreementParticulars = {
    agreement_date: new Date().toISOString().slice(0, 10),
    payment_days: 14,
    non_solicit_months: 12,
    clawback_months: 3,
    term_months: 12,
    renewal: "written",
    sub_agents: false,
    minors: false,
    scope: ["english", "university"],
    pecsb_attn: "Finance Department",
    pecsb_email: "inquiry@premium.edu.my",
    // Prefill what we already know about the agent; they confirm/correct it.
    legal_name: agent.full_name ?? "",
    notice_attn: agent.full_name ?? "",
    notice_email: agent.email ?? "",
  };
  const scheme: AgreementScheme = {
    tier1_max: 10,
    university: [],
    english: [],
    english_prices: [],
    one_time: [{ item: "Registration", amount: null }, { item: "Resource fee", amount: null }],
    visa: [{ item: "6 months", amount: null }, { item: "12 months", amount: null }],
  };

  const { data, error } = await ctx.admin
    .from("agent_agreements")
    .insert({ agent_id: agentId, particulars, scheme, created_by: ctx.profile.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "insert_failed" };

  await logAudit({ action: "agreement_created", target_type: "agreement", target_id: data.id, detail: agent.full_name ?? agentId });
  revalidatePath("/admin", "layout");
  return { ok: true, id: data.id };
}

/** Finance edits terms / scheme / validity. Locked once signing has started. */
export async function updateAgreementTerms(
  id: string,
  patch: {
    particulars?: Partial<AgreementParticulars>;
    scheme?: AgreementScheme;
    valid_from?: string | null;
    valid_until?: string | null;
  },
): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await financeCtx();
  if (!ctx) return { ok: false, error: "forbidden" };

  const { data } = await ctx.admin.from("agent_agreements").select("*").eq("id", id).maybeSingle();
  const agr = data as AgentAgreement | null;
  if (!agr) return { ok: false, error: "not_found" };
  if (["signed_agent", "active", "void"].includes(agr.status))
    return { ok: false, error: "locked" }; // variation needs a fresh agreement (Clause 23b)

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.particulars) update.particulars = { ...agr.particulars, ...patch.particulars };
  if (patch.scheme) update.scheme = patch.scheme;
  if (patch.valid_from !== undefined) update.valid_from = patch.valid_from || null;
  if (patch.valid_until !== undefined) update.valid_until = patch.valid_until || null;

  const { error } = await ctx.admin.from("agent_agreements").update(update).eq("id", id);
  if (error) return { ok: false, error: "update_failed" };
  await logAudit({ action: "agreement_terms_updated", target_type: "agreement", target_id: id });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Finance sends the draft to the agent (visible in their portal from here on). */
export async function sendAgreementToAgent(id: string): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await financeCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { data } = await ctx.admin
    .from("agent_agreements")
    .select("id, status, agent_id")
    .eq("id", id)
    .maybeSingle();
  if (!data || !["draft", "with_agent"].includes(data.status)) return { ok: false, error: "bad_status" };
  await ctx.admin
    .from("agent_agreements")
    .update({ status: "with_agent", updated_at: new Date().toISOString() })
    .eq("id", id);
  await notify(ctx.admin, data.agent_id, "Your recruitment agreement is ready — complete your details and sign in the portal.");
  await logAudit({ action: "agreement_sent_to_agent", target_type: "agreement", target_id: id });
  revalidatePath("/admin", "layout");
  revalidatePath("/agent");
  return { ok: true };
}

/** Agent saves their own particulars (identity / signatory / notices / bank). */
export async function agentUpdateOwnFields(
  id: string,
  patch: Partial<AgreementParticulars>,
): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await agentCtx(id);
  if (!ctx) return { ok: false, error: "forbidden" };
  if (ctx.agr.status !== "with_agent") return { ok: false, error: "locked" };

  // Server-enforced allowlist: an agent can only write their own fields.
  const clean: Record<string, string> = {};
  for (const k of AGENT_PARTICULAR_KEYS) {
    const v = patch[k];
    if (typeof v === "string") clean[k] = v.trim();
  }
  await ctx.admin
    .from("agent_agreements")
    .update({
      particulars: { ...ctx.agr.particulars, ...clean },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/agent");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Agent signs digitally: typed full name + designation, server timestamp. */
export async function agentSignAgreement(
  id: string,
  sig: { name: string; designation: string },
): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await agentCtx(id);
  if (!ctx) return { ok: false, error: "forbidden" };
  if (ctx.agr.status !== "with_agent") return { ok: false, error: "locked" };
  if (!sig.name.trim()) return { ok: false, error: "no_name" };
  const missing = missingAgentFields(ctx.agr.particulars);
  if (missing.length) return { ok: false, error: "incomplete" };

  await ctx.admin
    .from("agent_agreements")
    .update({
      status: "signed_agent",
      agent_signed_name: sig.name.trim(),
      agent_signed_designation: sig.designation.trim() || null,
      agent_signed_at: new Date().toISOString(),
      agent_signature_kind: "typed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Tell finance (the drafter) it's back for countersignature.
  const { data } = await ctx.admin
    .from("agent_agreements").select("created_by").eq("id", id).maybeSingle();
  await notify(ctx.admin, data?.created_by, `${ctx.profile.full_name ?? "An agent"} signed their recruitment agreement — countersign to activate.`);
  await logAudit({ action: "agreement_agent_signed", target_type: "agreement", target_id: id, detail: sig.name.trim() });
  revalidatePath("/agent");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Signed upload URL for the wet-signed / stamped PDF (agent or finance). */
export async function createAgreementUploadUrl(
  id: string,
  filename: string,
): Promise<{ path: string; token: string } | { error: string }> {
  if (!authConfigured) return { error: "dev" };
  const fin = await financeCtx();
  const ctx = fin ?? (await agentCtx(id));
  if (!ctx) return { error: "forbidden" };
  const admin = ctx.admin;
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `agreements/${id}/${randomUUID()}-${safe}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "sign_failed" };
  return { path: data.path, token: data.token };
}

/** Record an uploaded signed copy. From the agent this counts as their signature. */
export async function recordAgreementSignedUpload(id: string, path: string): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const fin = await financeCtx();
  if (fin) {
    await fin.admin
      .from("agent_agreements")
      .update({ signed_doc_path: path, updated_at: new Date().toISOString() })
      .eq("id", id);
    await logAudit({ action: "agreement_doc_uploaded", target_type: "agreement", target_id: id, detail: "by finance" });
    revalidatePath("/admin", "layout");
    return { ok: true };
  }
  const ctx = await agentCtx(id);
  if (!ctx) return { ok: false, error: "forbidden" };
  if (ctx.agr.status !== "with_agent") return { ok: false, error: "locked" };
  await ctx.admin
    .from("agent_agreements")
    .update({
      signed_doc_path: path,
      status: "signed_agent",
      agent_signed_name: ctx.agr.particulars.signatory_name ?? ctx.profile.full_name ?? null,
      agent_signed_at: new Date().toISOString(),
      agent_signature_kind: "uploaded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  const { data } = await ctx.admin
    .from("agent_agreements").select("created_by").eq("id", id).maybeSingle();
  await notify(ctx.admin, data?.created_by, `${ctx.profile.full_name ?? "An agent"} uploaded a signed agreement — countersign to activate.`);
  await logAudit({ action: "agreement_agent_signed", target_type: "agreement", target_id: id, detail: "uploaded scan" });
  revalidatePath("/agent");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** PECSB countersigns (finance/admin) — agreement becomes active. */
export async function pecsbCountersign(
  id: string,
  sig: { name: string; designation: string },
): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await financeCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!sig.name.trim()) return { ok: false, error: "no_name" };
  const { data } = await ctx.admin
    .from("agent_agreements").select("status, agent_id").eq("id", id).maybeSingle();
  if (!data || data.status !== "signed_agent") return { ok: false, error: "bad_status" };
  await ctx.admin
    .from("agent_agreements")
    .update({
      status: "active",
      pecsb_signed_name: sig.name.trim(),
      pecsb_signed_designation: sig.designation.trim() || null,
      pecsb_signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  await notify(ctx.admin, data.agent_id, "Your recruitment agreement is now active — download your copy from the portal.");
  await logAudit({ action: "agreement_activated", target_type: "agreement", target_id: id, detail: sig.name.trim() });
  revalidatePath("/admin", "layout");
  revalidatePath("/agent");
  return { ok: true };
}

/** Finance voids an agreement (supersede / abandon). Reason is audited. */
export async function voidAgreement(id: string, reason: string): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await financeCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!reason.trim()) return { ok: false, error: "no_reason" };
  await ctx.admin
    .from("agent_agreements")
    .update({ status: "void", updated_at: new Date().toISOString() })
    .eq("id", id);
  await logAudit({ action: "agreement_voided", target_type: "agreement", target_id: id, detail: reason.trim() });
  revalidatePath("/admin", "layout");
  revalidatePath("/agent");
  return { ok: true };
}

/**
 * Sync an ACTIVE agreement's Schedule 1 into commission_rules for this agent,
 * so accruals compute automatically. Replaces rules previously created from an
 * agreement (label prefix "AGR ·") for the same agent; hand-made rules are
 * left untouched.
 */
export async function applySchemeToRules(id: string): Promise<Res> {
  if (!authConfigured) return { ok: true };
  const ctx = await financeCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { data } = await ctx.admin.from("agent_agreements").select("*").eq("id", id).maybeSingle();
  const agr = data as AgentAgreement | null;
  if (!agr || agr.status !== "active") return { ok: false, error: "not_active" };

  const scheme = agr.scheme ?? {};
  const tierAt = scheme.tier1_max ?? null;

  // Retire earlier agreement-generated rules for this agent.
  await ctx.admin
    .from("commission_rules")
    .update({ active: false })
    .eq("subject_id", agr.agent_id)
    .eq("scope", "agent_payout")
    .like("label", "AGR ·%");

  const rows: Record<string, unknown>[] = [];
  for (const r of scheme.english ?? []) {
    if (r.tier1_pct != null) {
      rows.push({
        scope: "agent_payout", subject_id: agr.agent_id, track: "english",
        basis: "percent", rate: r.tier1_pct, base_fee_type: "tuition",
        label: `AGR · English ${r.length}`.trim(),
      });
    }
    if (r.tier2_pct != null && tierAt) {
      rows.push({
        scope: "agent_payout", subject_id: agr.agent_id, track: "english",
        basis: "percent", rate: r.tier2_pct, base_fee_type: "tuition",
        min_students: tierAt + 1,
        label: `AGR · English ${r.length} · tier 2`.trim(),
      });
    }
  }
  for (const r of scheme.university ?? []) {
    if (!r.university) continue;
    if (r.tier1_amount != null) {
      rows.push({
        scope: "agent_payout", subject_id: agr.agent_id, track: "university",
        university: r.university, basis: "fixed", rate: r.tier1_amount,
        label: `AGR · ${r.university}${r.level ? ` ${r.level}` : ""}`,
      });
    }
    if (r.tier2_amount != null && tierAt) {
      rows.push({
        scope: "agent_payout", subject_id: agr.agent_id, track: "university",
        university: r.university, basis: "fixed", rate: r.tier2_amount,
        min_students: tierAt + 1,
        label: `AGR · ${r.university}${r.level ? ` ${r.level}` : ""} · tier 2`,
      });
    }
  }
  if (rows.length) {
    const { error } = await ctx.admin.from("commission_rules").insert(rows);
    if (error) return { ok: false, error: "insert_failed" };
  }
  await logAudit({
    action: "agreement_scheme_applied",
    target_type: "agreement",
    target_id: id,
    detail: `${rows.length} rule(s)`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
