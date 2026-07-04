"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/applications-shared";
import { logAudit } from "@/lib/admin/audit";

/**
 * An agent submits a student directly from their portal. Inserted with the
 * service-role client (agents have no write access under RLS) after verifying
 * the caller really is an agent; the lead is stamped with THEIR agent code, so
 * it can't be attributed to anyone else.
 */
export async function createAgentReferral(input: {
  full_name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  nationality?: string;
  tracks: string[];
  note?: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!authConfigured) return { ok: true, code: "DEV-MODE" };
  const profile = await getProfile();
  if (!profile || profile.role !== "agent" || !profile.agent_code) {
    return { ok: false, error: "forbidden" };
  }
  if (!input.full_name.trim() || !input.email.trim() || !input.phone.trim()) {
    return { ok: false, error: "missing" };
  }
  const tracks = input.tracks.filter((t) =>
    ["english", "university", "corporate"].includes(t),
  );
  if (tracks.length === 0) return { ok: false, error: "tracks" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("registrations")
    .insert({
      tracks,
      full_name: input.full_name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp?.trim() || null,
      nationality: input.nationality?.trim() || null,
      agent_code: profile.agent_code,
      utm_source: "agent_portal",
      details: {
        agent_note: input.note?.trim() || undefined,
        referred_by_agent: profile.id,
      },
    })
    .select("id, access_code")
    .single();
  if (error || !row) return { ok: false, error: "insert" };

  await admin.from("lead_events").insert({
    registration_id: row.id,
    actor_id: profile.id,
    type: "note",
    body: `Referred by agent ${profile.full_name} (${profile.agent_code}) via the portal`,
  });
  await logAudit({
    action: "agent_referral",
    target_type: "lead",
    target_id: row.id,
    detail: `${input.full_name.trim()} · ${profile.agent_code}`,
  });
  revalidatePath("/agent");
  return { ok: true, code: (row.access_code as string) ?? undefined };
}
