import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import {
  DEFAULT_STALENESS_DAYS,
  type StalenessDays,
} from "@/lib/config/staleness";

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
