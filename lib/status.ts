import "server-only";
import { supabaseConfigured } from "@/lib/env";
import { STAGE_LABEL, type Flag, type StudyPlan } from "@/lib/admin/applications-shared";
import { getDocRequirements } from "@/lib/admin/doc-rules";
import type { DocRequirement } from "@/lib/config/documents";

export interface PublicStatus {
  name: string;
  reference: string;
  track: string;
  program?: string;
  qualification?: string | null;
  is_international: boolean;
  stage: string;
  flag: Flag;
  timeline: { label: string; date: string }[];
  next_step?: string;
  documents: { kind: string; review_status: string }[];
  requirements: DocRequirement[]; // resolved from the editable rules
  offer?: { available: boolean; acknowledgedAt: string | null };
  plan?: StudyPlan | null;
  isLead?: boolean; // matched a registration (not yet an application)
}

// Dev demo: passport A1234567 + code PECSB2026.
const MOCK: PublicStatus = {
  name: "An",
  reference: "PLC-2026-0031",
  track: "university",
  program: "Computer Science",
  qualification: "degree",
  is_international: true,
  stage: "offer",
  flag: "progress",
  timeline: [
    { label: "Application received", date: "2026-06-25" },
    { label: "Under review", date: "2026-06-27" },
    { label: "Offer / acceptance letter", date: "2026-07-01" },
  ],
  next_step: "We are preparing your acceptance letter. No action needed from you yet.",
  documents: [{ kind: "passport", review_status: "verified" }],
  requirements: [
    { kind: "passport", label: "Passport (bio-data page)" },
    { kind: "transcript", label: "Degree transcript(s)" },
  ],
};

/** Verify passport/email + code and return the application id (for uploads). */
export async function verifyStatusApplication(
  verify: string,
  code: string,
): Promise<string | null> {
  const v = verify.trim().toLowerCase();
  const c = code.trim();
  if (!v || !c) return null;
  if (!supabaseConfigured) return v === "a1234567" && c.toUpperCase() === "PECSB2026" ? "mock-app" : null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("id, passport_no, student_email")
    .eq("access_code", c)
    .maybeSingle();
  if (!app) return null;
  const ok =
    (app.passport_no && app.passport_no.toLowerCase() === v) ||
    (app.student_email && app.student_email.toLowerCase() === v);
  return ok ? (app.id as string) : null;
}

/**
 * Public application status lookup by access code + a second factor (the
 * passport number OR the email on file). Returns a redacted, read-only view —
 * no contact details, notes, or documents. Uses the service-role client (no
 * user session); dev returns a demo record.
 */
export async function lookupStatus(
  verify: string,
  code: string,
): Promise<PublicStatus | null> {
  const v = verify.trim().toLowerCase();
  const c = code.trim();
  if (!v || !c) return null;

  if (!supabaseConfigured) {
    return v === "a1234567" && c.toUpperCase() === "PECSB2026" ? MOCK : null;
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  // Fetch by the high-entropy code, then check the second factor in code to
  // avoid building a query from user input.
  const { data: app } = await admin
    .from("applications")
    .select(
      "id, track, program_name, qualification_level, stage, student_name, passport_no, student_email, is_international, student_id, offer_acknowledged_at, plan",
    )
    .eq("access_code", c)
    .maybeSingle();

  // No application yet — try a registration (lead) with the same code so a
  // just-registered student can already track using their emailed code.
  if (!app) {
    const { data: reg } = await admin
      .from("registrations")
      .select("id, tracks, full_name, email, status, created_at, nationality, passport_no")
      .eq("access_code", c)
      .maybeSingle();
    // Second factor: the email on file OR the passport/ID given at registration.
    const regMatches =
      !!reg &&
      ((reg.email && reg.email.toLowerCase() === v) ||
        (reg.passport_no && String(reg.passport_no).toLowerCase() === v));
    if (!reg || !regMatches) return null;
    const leadStage: Record<string, string> =
      { new: "application", contacted: "review", enrolled: "enrolled", dropped: "review" };
    const track = (reg.tracks?.[0] as string) ?? "english";
    const isIntl = (reg.nationality ?? "").toLowerCase() !== "my";
    const requirements = await getDocRequirements({
      track,
      qualification: null,
      isInternational: isIntl,
      nationality: reg.nationality as string | null,
    });
    return {
      name: (reg.full_name ?? "").split(" ")[0],
      reference: (reg.id as string).slice(0, 8).toUpperCase(),
      track,
      qualification: null,
      is_international: isIntl,
      stage: leadStage[reg.status as string] ?? "application",
      flag: reg.status === "enrolled" ? "ok" : "progress",
      timeline: [
        { label: "Registration received", date: String(reg.created_at).slice(0, 10) },
      ],
      documents: [],
      requirements,
      isLead: true,
    };
  }

  const matches =
    (app.passport_no && app.passport_no.toLowerCase() === v) ||
    (app.student_email && app.student_email.toLowerCase() === v);
  if (!matches) return null;

  const [{ data: events }, { data: docs }, { data: student }, { data: adhoc }] =
    await Promise.all([
      admin
        .from("application_events")
        .select("to_stage, body, created_at")
        .eq("application_id", app.id)
        .eq("type", "stage_change")
        .order("created_at", { ascending: true }),
      admin
        .from("application_documents")
        .select("kind, review_status")
        .eq("application_id", app.id),
      app.student_id
        ? admin.from("students").select("nationality").eq("id", app.student_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("app_doc_requests")
        .select("kind, label, note, optional")
        .eq("application_id", app.id)
        .order("created_at", { ascending: true }),
    ]);

  const ruleReqs = await getDocRequirements({
    track: app.track,
    qualification: app.qualification_level,
    isInternational: Boolean(app.is_international),
    nationality: (student as { nationality?: string } | null)?.nationality ?? null,
  });
  // One-off staff requests join the student's checklist.
  const requirements = [
    ...ruleReqs,
    ...((adhoc as { kind: string; label: string; note?: string | null; optional: boolean }[] | null) ?? []).map(
      (r) => ({ kind: r.kind, label: r.label, note: r.note ?? undefined, optional: r.optional }),
    ),
  ];

  const flag: Flag = ["enrolled", "active", "completed"].includes(app.stage)
    ? "ok"
    : "progress";
  return {
    name: (app.student_name ?? "").split(" ")[0],
    reference: app.id.slice(0, 8).toUpperCase(),
    track: app.track,
    program: app.program_name ?? undefined,
    qualification: app.qualification_level ?? null,
    is_international: Boolean(app.is_international),
    stage: app.stage,
    flag,
    timeline: (events ?? []).map((e) => ({
      label: e.to_stage ? STAGE_LABEL[e.to_stage] ?? e.to_stage : e.body ?? "Update",
      date: String(e.created_at).slice(0, 10),
    })),
    documents: (docs as { kind: string; review_status: string }[] | null) ?? [],
    requirements,
    offer: {
      available: ((docs as { kind: string }[] | null) ?? []).some(
        (x) => x.kind === "offer_letter",
      ),
      acknowledgedAt: (app.offer_acknowledged_at as string | null) ?? null,
    },
    plan: (app.plan as StudyPlan | null) ?? null,
  };
}
