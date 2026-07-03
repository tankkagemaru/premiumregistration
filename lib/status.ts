import "server-only";
import { supabaseConfigured } from "@/lib/env";
import { STAGE_LABEL } from "@/lib/admin/applications-shared";

export interface PublicStatus {
  name: string;
  reference: string;
  track: string;
  program?: string;
  is_international: boolean;
  stage: string;
  timeline: { label: string; date: string }[];
  next_step?: string;
}

// Dev demo: passport A1234567 + code PECSB2026.
const MOCK: PublicStatus = {
  name: "An",
  reference: "PLC-2026-0031",
  track: "english",
  program: "General English (PLC)",
  is_international: true,
  stage: "offer",
  timeline: [
    { label: "Application received", date: "2026-06-25" },
    { label: "Under review", date: "2026-06-27" },
    { label: "Offer / acceptance letter", date: "2026-07-01" },
  ],
  next_step: "We are preparing your acceptance letter. No action needed from you yet.",
};

/**
 * Public application status lookup by passport + access code. Returns a redacted,
 * read-only view — no contact details, notes, or documents. Uses the
 * service-role client (no user session); dev returns a demo record.
 */
export async function lookupStatus(
  passport: string,
  code: string,
): Promise<PublicStatus | null> {
  const p = passport.trim();
  const c = code.trim();
  if (!p || !c) return null;

  if (!supabaseConfigured) {
    return p.toUpperCase() === "A1234567" && c.toUpperCase() === "PECSB2026"
      ? MOCK
      : null;
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select(
      "id, track, program_name, stage, access_code, students!inner(full_name, passport_no, is_international)",
    )
    .eq("access_code", c)
    .eq("students.passport_no", p)
    .single();
  if (!app) return null;

  const { data: events } = await admin
    .from("application_events")
    .select("to_stage, body, created_at")
    .eq("application_id", app.id)
    .eq("type", "stage_change")
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const student = (app as any).students;
  return {
    name: (student?.full_name ?? "").split(" ")[0],
    reference: app.id.slice(0, 8).toUpperCase(),
    track: app.track,
    program: app.program_name ?? undefined,
    is_international: Boolean(student?.is_international),
    stage: app.stage,
    timeline: (events ?? []).map((e) => ({
      label: e.to_stage ? STAGE_LABEL[e.to_stage] ?? e.to_stage : e.body ?? "Update",
      date: String(e.created_at).slice(0, 10),
    })),
  };
}
