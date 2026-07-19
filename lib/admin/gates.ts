import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { planStatus, type StudyPlan } from "./applications-shared";
import type { GateSignals } from "./gates-shared";

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
    admin.from("fees").select("type, status, amount").eq("application_id", appId),
    admin
      .from("visa_cases")
      .select("stage")
      .eq("application_id", appId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const feeRows = (fees ?? []) as { type: string; status: string; amount: number | null }[];
  // A fee only counts as cleared when it was genuinely settled: waived (a
  // deliberate, reason-backed decision) or PAID WITH A REAL AMOUNT. Fees are
  // scaffolded at 0 as "amount TBD" — a zero fee marked paid must not clear a
  // gate, or students advance without any actual collection.
  const feeCleared = (f: { status: string; amount: number | null }) =>
    f.status === "waived" || (f.status === "paid" && Number(f.amount ?? 0) > 0);
  return {
    isInternational: Boolean(app?.is_international),
    registrationPaid: feeRows.some((f) => f.type === "registration" && feeCleared(f)),
    planFinalized: planStatus((app?.plan as StudyPlan | null) ?? null).state === "finalized",
    requiredDocsPresent: true,
    // Vacuous truth guard: no fees recorded at all must NOT read as "all cleared".
    allFeesCleared: feeRows.length > 0 && feeRows.every(feeCleared),
    readyForVisa: Boolean(app?.ready_for_visa),
    passIssued: (visa as { stage?: string } | null)?.stage === "done",
  };
}
