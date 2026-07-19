import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_FEES, STAGE_MILESTONE } from "./applications-shared";

type Admin = ReturnType<typeof createAdminClient>;

interface PayoutRule {
  id: string;
  subject_id: string | null;
  track: string | null;
  basis: string;
  rate: number | null;
  base_amount: number | null;
  min_students: number | null;
}

/**
 * Resolve the agent-payout amount for an accrual from commission_rules.
 * Match preference: the agent's own rules (subject_id) beat generic ones; a
 * matching track beats no track; the highest tier whose min_students threshold
 * the agent has reached this calendar year wins. Returns null fields when no
 * rule decides — finance then prices it by hand, exactly as before.
 */
async function resolvePayout(
  admin: Admin,
  agentId: string,
  track: string | null,
  applicationId: string,
): Promise<{ amount: number | null; basis: string | null; rate: number | null; base: number | null }> {
  const none = { amount: null, basis: null, rate: null, base: null };
  const { data } = await admin
    .from("commission_rules")
    .select("id, subject_id, track, basis, rate, base_amount, min_students")
    .eq("scope", "agent_payout")
    .eq("active", true)
    .or(`subject_id.eq.${agentId},subject_id.is.null`);
  const rules = ((data as PayoutRule[] | null) ?? []).filter(
    (r) => !r.track || r.track === track,
  );
  if (!rules.length) return none;

  // Tier threshold: the agent's enrolled volume this calendar year.
  let volume = 0;
  const needsVolume = rules.some((r) => r.min_students != null);
  if (needsVolume) {
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const { count } = await admin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .in("stage", ["enrolled", "active", "completed"])
      .gte("created_at", yearStart);
    volume = count ?? 0;
  }

  const eligible = rules.filter((r) => (r.min_students ?? 0) <= Math.max(volume, 1));
  if (!eligible.length) return none;
  eligible.sort((a, b) => {
    // agent-specific first, then matching track, then highest tier
    const subj = Number(!!b.subject_id) - Number(!!a.subject_id);
    if (subj) return subj;
    const trk = Number(!!b.track) - Number(!!a.track);
    if (trk) return trk;
    return (b.min_students ?? 0) - (a.min_students ?? 0);
  });
  const rule = eligible[0];

  if (rule.basis === "fixed" && rule.rate != null) {
    return { amount: rule.rate, basis: "fixed", rate: rule.rate, base: null };
  }
  if (rule.basis === "percent" && rule.rate != null) {
    // Base: the rule's own base amount, else the application's tuition fee.
    let base = rule.base_amount;
    if (base == null) {
      const { data: fee } = await admin
        .from("fees")
        .select("amount")
        .eq("application_id", applicationId)
        .eq("type", "tuition")
        .gt("amount", 0)
        .limit(1)
        .maybeSingle();
      base = fee?.amount != null ? Number(fee.amount) : null;
    }
    if (base != null) {
      return {
        amount: Math.round(base * rule.rate) / 100,
        basis: "percent",
        rate: rule.rate,
        base,
      };
    }
    // Rate known but no base yet — record the rate, finance fills the base.
    return { amount: null, basis: "percent", rate: rule.rate, base: null };
  }
  return none;
}

/**
 * Side effects fired when an application advances to `newStage`:
 *   1. Scaffold the stage's standard fees (amount 0, unpaid) so finance is
 *      prompted to set the real figure — skipping fee types already present.
 *   2. Accrue the stage's commission milestone (status 'accrued', amount TBD)
 *      when the application has a referring agent and none exists yet.
 *   3. Post an in-app notification to the assigned owner.
 *
 * Runs with the service-role client (acts as the system): fees/commissions are
 * finance-only under RLS and notifications have no user insert policy, so a
 * non-finance actor advancing a stage couldn't write these as themselves.
 * Best-effort — never throws, so it can't break the stage change that called it.
 */
export async function runStageAutomation(
  appId: string,
  newStage: string,
  actorId?: string | null,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: app } = await admin
      .from("applications")
      .select("id, student_name, agent_id, agent_name, assigned_to, is_international, track")
      .eq("id", appId)
      .single();
    if (!app) return;

    // 1. Fees for this stage (skip types already on the application).
    const feeSpecs = (STAGE_FEES[newStage] ?? []).filter(
      (f) => !f.internationalOnly || app.is_international,
    );
    if (feeSpecs.length) {
      const { data: existing } = await admin
        .from("fees")
        .select("type")
        .eq("application_id", appId);
      const have = new Set((existing ?? []).map((f: { type: string }) => f.type));
      const toCreate = feeSpecs.filter((f) => !have.has(f.type));
      if (toCreate.length) {
        await admin.from("fees").insert(
          toCreate.map((f) => ({
            application_id: appId,
            student_name: app.student_name,
            type: f.type,
            amount: 0, // TBD — finance sets the real amount
            status: "unpaid",
          })),
        );
      }
    }

    // 2. Commission accrual at the stage's milestone.
    const milestone = STAGE_MILESTONE[newStage];
    if (milestone && app.agent_id) {
      const { data: existingC } = await admin
        .from("commissions")
        .select("id")
        .eq("application_id", appId)
        .eq("milestone", milestone)
        .eq("direction", "payable")
        .limit(1)
        .maybeSingle();
      if (!existingC) {
        // Price the accrual from the commission rules (agent-specific rules
        // win over generic ones). If no rule decides, amount stays null and
        // finance sets it by hand — same as before.
        const payout = await resolvePayout(admin, app.agent_id, app.track ?? null, appId);
        await admin.from("commissions").insert({
          application_id: appId,
          agent_id: app.agent_id,
          agent_name: app.agent_name,
          student_name: app.student_name,
          direction: "payable",
          milestone,
          status: "accrued",
          amount: payout.amount,
          basis: payout.basis,
          rate: payout.rate,
          base_amount: payout.base,
        });
      }
    }

    // 3. Notify the assigned owner (skip if they made the change themselves).
    if (app.assigned_to && app.assigned_to !== actorId) {
      await admin.from("notifications").insert({
        user_id: app.assigned_to,
        type: "stage_change",
        payload: {
          title: `${app.student_name ?? "Application"} moved to ${newStage}`,
          application_id: appId,
        },
      });
    }
  } catch (err) {
    console.error("[automation] stage automation failed", err);
  }
}
