import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import {
  DEFAULT_STALENESS_DAYS,
  type StalenessDays,
} from "@/lib/config/staleness";
import { DEFAULT_GATE_MODE, type GateMode } from "./gates-shared";

/** Console-configured stale-record day thresholds (defaults when unset). */
export async function getStalenessDays(): Promise<StalenessDays> {
  if (!authConfigured) return DEFAULT_STALENESS_DAYS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "staleness")
    .maybeSingle();
  const saved = (data?.value ?? {}) as Partial<StalenessDays>;
  return { ...DEFAULT_STALENESS_DAYS, ...saved };
}

/**
 * Whether stage handoffs are enforced ("hard" — the default) or advisory
 * ("soft"). Admin-configurable from Settings; hard by default so the pipeline
 * discipline holds unless someone deliberately relaxes it.
 */
export async function getGateMode(): Promise<GateMode> {
  if (!authConfigured) return DEFAULT_GATE_MODE;
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "workflow")
    .maybeSingle();
  const mode = (data?.value as { gate_mode?: GateMode } | null)?.gate_mode;
  return mode === "soft" || mode === "hard" ? mode : DEFAULT_GATE_MODE;
}
