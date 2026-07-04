"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";
import type { StalenessDays } from "@/lib/config/staleness";

/** Save the stale-record day thresholds (admin only). */
export async function saveStalenessDays(days: StalenessDays): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  const profile = await getProfile();
  if (profile?.role !== "admin") return { ok: false };

  // Clamp to sane whole-day values.
  const clean = Object.fromEntries(
    Object.entries(days).map(([k, v]) => [
      k,
      Math.max(0, Math.min(365, Math.round(Number(v) || 0))),
    ]),
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "staleness", value: clean, updated_at: new Date().toISOString() });
  if (error) return { ok: false };
  await logAudit({
    action: "settings_updated",
    target_type: "settings",
    detail: `staleness: ${JSON.stringify(clean)}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
