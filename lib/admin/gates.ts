import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { planStatus, type StudyPlan } from "./applications-shared";
import type { GateSignals } from "./gates-shared";

const CLEARED = new Set(["paid", "waived"]);

/**
 * Resolve the gate signals for an application from its fees, plan, ready-for-visa
 * flag and visa case. Read with the service role so the check is consistent for
 * whichever team is advancing the stage (not gated by that team's fee/visa RLS).
 * `requiredDocsPresent` is advisory-only (never a hard gate) so it isn't loaded
 * here — the drawer fills it in for the UI checklist.
 */
export async function loadGateSignals(appId: string): Promise<GateSignals> {
  const admin = createAdminClient();
  const [{ data: app }, { data: fees }, { data: visa }] = await Promise.all([
    admin
      .from("applications")
      .select("is_international, plan, ready_for_visa")
      .eq("id", appId)
      .maybeSingle(),
    admin.from("fees").select("type, status").eq("application_id", appId),
    admin
      .from("visa_cases")
      .select("stage")
      .eq("application_id", appId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const feeRows = (fees ?? []) as { type: string; status: string }[];
  return {
    isInternational: Boolean(app?.is_international),
    registrationPaid: feeRows.some(
      (f) => f.type === "registration" && CLEARED.has(f.status),
    ),
    planFinalized: planStatus((app?.plan as StudyPlan | null) ?? null).state === "finalized",
    requiredDocsPresent: true,
    allFeesCleared: feeRows.every((f) => CLEARED.has(f.status)),
    readyForVisa: Boolean(app?.ready_for_visa),
    passIssued: (visa as { stage?: string } | null)?.stage === "pass_active",
  };
}
