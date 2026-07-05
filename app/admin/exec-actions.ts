"use server";

import { getProfile } from "@/lib/auth";
import { authConfigured, STAGE_LABEL } from "@/lib/admin/applications-shared";
import { VISA_STAGE_LABEL } from "@/lib/admin/visa-shared";
import type { StatusHit } from "@/lib/admin/exec-shared";

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "New enquiry",
  contacted: "Contacted",
  enrolled: "Converted",
  dropped: "Dropped",
};

/**
 * Boss/admin quick status check — type a name or passport, get that person's
 * current status. Runs on the service-role client (the boss has no row access
 * under RLS) but is gated to admin + boss, and returns a compact status only.
 * A targeted lookup, not a browsable list.
 */
export async function lookupStatus(query: string): Promise<StatusHit[]> {
  if (!authConfigured) return [];
  const profile = await getProfile();
  if (!profile || !["admin", "boss"].includes(profile.role)) return [];

  // Sanitise for PostgREST or-filters (commas/parens/wildcards break parsing).
  const safe = query.replace(/[,()%*]/g, " ").trim();
  if (safe.length < 2) return [];
  const like = `%${safe}%`;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: apps } = await admin
    .from("applications")
    .select(
      "id, student_name, passport_no, is_international, stage, track, program_name, target_institution, next_action, access_code",
    )
    .or(`student_name.ilike.${like},passport_no.ilike.${like}`)
    .limit(10);

  const appRows = apps ?? [];
  // Sentinel keeps the .in() filter valid (and empty-result) when nothing matched.
  const appIds = appRows.length
    ? appRows.map((a) => a.id)
    : ["00000000-0000-0000-0000-000000000000"];

  // Visa stage + fee clearance for the matched applications, in two batch reads.
  const [{ data: visas }, { data: fees }] = await Promise.all([
    admin.from("visa_cases").select("application_id, stage").in("application_id", appIds),
    admin.from("fees").select("application_id, type, status").in("application_id", appIds),
  ]);
  const visaByApp = new Map((visas ?? []).map((v) => [v.application_id, v.stage] as const));
  const feesByApp = new Map<string, { type: string; status: string }[]>();
  for (const f of fees ?? []) {
    const arr = feesByApp.get(f.application_id) ?? [];
    arr.push({ type: f.type, status: f.status });
    feesByApp.set(f.application_id, arr);
  }

  const hits: StatusHit[] = appRows.map((a) => {
    const rel = feesByApp.get(a.id) ?? [];
    const billable = rel.filter((f) => f.type === "tuition" || f.type === "registration");
    const outstanding = billable.filter((f) => f.status === "unpaid" || f.status === "partial");
    const visaStage = a.is_international ? visaByApp.get(a.id) ?? null : null;
    return {
      kind: "application",
      name: a.student_name ?? "—",
      detail: a.program_name ?? a.target_institution ?? a.track ?? "—",
      stageLabel: STAGE_LABEL[a.stage] ?? a.stage,
      isInternational: !!a.is_international,
      visaStageLabel: a.is_international
        ? visaStage
          ? VISA_STAGE_LABEL[visaStage] ?? visaStage
          : "not filed"
        : null,
      feesCleared: billable.length ? outstanding.length === 0 : null,
      nextAction: a.next_action ?? null,
      ref: a.access_code ?? null,
    };
  });

  // Leads that never became an application (dedupe by name against app hits).
  const seen = new Set(hits.map((h) => h.name.trim().toLowerCase()));
  const { data: leads } = await admin
    .from("registrations")
    .select("full_name, passport_no, status, tracks")
    .or(`full_name.ilike.${like},passport_no.ilike.${like}`)
    .limit(10);
  for (const l of leads ?? []) {
    if (seen.has((l.full_name ?? "").trim().toLowerCase())) continue;
    hits.push({
      kind: "lead",
      name: l.full_name ?? "—",
      detail: (l.tracks as string[] | null)?.join(", ") || "enquiry",
      stageLabel: LEAD_STATUS_LABEL[l.status] ?? l.status,
      isInternational: false,
      visaStageLabel: null,
      feesCleared: null,
      nextAction: null,
      ref: null,
    });
  }

  return hits.slice(0, 12);
}
