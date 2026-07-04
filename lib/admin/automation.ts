import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_FEES, STAGE_MILESTONE } from "./applications-shared";

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
      .select("id, student_name, agent_id, agent_name, assigned_to, is_international")
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
        await admin.from("commissions").insert({
          application_id: appId,
          agent_id: app.agent_id,
          agent_name: app.agent_name,
          student_name: app.student_name,
          direction: "payable",
          milestone,
          status: "accrued",
          // amount left null — set by finance / the commission rules engine
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
