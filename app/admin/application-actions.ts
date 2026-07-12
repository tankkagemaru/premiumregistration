"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  authConfigured,
  stagesFor,
  PLAN_ROUTES,
  PLAN_ROLE_LABEL,
  type StudyPlan,
  type PlanWorkflow,
} from "@/lib/admin/applications-shared";
import { stageGate } from "@/lib/admin/gates-shared";
import { loadGateSignals } from "@/lib/admin/gates";
import { getGateMode } from "@/lib/admin/settings";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";
import { runStageAutomation } from "@/lib/admin/automation";
import { createActionRequest } from "./request-actions";

export async function advanceApplicationStage(id: string, stage: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  const { data: prev } = await supabase
    .from("applications")
    .select("stage, is_international, track")
    .eq("id", id)
    .single();

  // Hard-gate enforcement (backstop for the UI): refuse a FORWARD handoff whose
  // exit gate isn't met. Admin bypasses; backward moves are always allowed.
  if (prev && profile?.role !== "admin") {
    const list = stagesFor(Boolean(prev.is_international), prev.track);
    const from = list.findIndex((s) => s.id === prev.stage);
    const to = list.findIndex((s) => s.id === stage);
    if (from >= 0 && to > from && (await getGateMode()) === "hard") {
      const gate = stageGate(prev.stage, await loadGateSignals(id));
      if (!gate.met) return; // gate not satisfied — refuse the handoff
    }
  }

  await supabase.from("applications").update({ stage }).eq("id", id);
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile?.id,
    type: "stage_change",
    from_stage: prev?.stage,
    to_stage: stage,
    body: `Moved to ${stage}`,
  });
  await logAudit({ action: "stage_change", target_type: "application", target_id: id, detail: `${prev?.stage ?? "?"} → ${stage}` });
  // Automation: scaffold fees, accrue commission at milestones, notify owner.
  if (prev?.stage !== stage) await runStageAutomation(id, stage, profile?.id);
  revalidatePath("/admin", "layout");
}

/**
 * Admissions flags a student ready to start the visa process — the exit gate for
 * the Offer stage (international). Records it on the timeline; the Visa team then
 * sees the handoff and can start EMGS.
 */
export async function flagReadyForVisa(id: string, ready = true) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile || !["admin", "admissions"].includes(profile.role)) return;
  await supabase.from("applications").update({ ready_for_visa: ready }).eq("id", id);
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile.id,
    type: "note",
    body: ready ? "Flagged ready for visa" : "Cleared the ready-for-visa flag",
  });
  await logAudit({
    action: ready ? "flagged_ready_for_visa" : "unflagged_ready_for_visa",
    target_type: "application",
    target_id: id,
  });
  revalidatePath("/admin", "layout");
}

export async function logApplicationMessage(
  id: string,
  channel: string,
  label: string,
) {
  if (!authConfigured || channel === "copy") return;
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile?.id,
    type: channel === "email" ? "email" : "note",
    body: `${channel === "email" ? "Email" : "WhatsApp"} sent — ${label}`,
  });
  revalidatePath("/admin", "layout");
}

export async function setClassDates(
  id: string,
  classStart: string | null,
  classEnd: string | null,
) {
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase
    .from("applications")
    .update({ class_start: classStart || null, class_end: classEnd || null })
    .eq("id", id);
  await logAudit({
    action: "class_dates_set",
    target_type: "application",
    target_id: id,
    detail: `${classStart ?? "—"} → ${classEnd ?? "—"}`,
  });
  revalidatePath("/admin", "layout");
}

/** Toggle one English-class onboarding checklist item (platform / class /
 *  materials / books). Merges into applications.class_checklist. */
export async function setClassChecklist(
  id: string,
  checklist: Record<string, boolean>,
) {
  if (!authConfigured) return;
  const supabase = await createClient();
  await supabase.from("applications").update({ class_checklist: checklist }).eq("id", id);
  await logAudit({ action: "class_checklist_set", target_type: "application", target_id: id });
  revalidatePath("/admin", "layout");
}

/**
 * Save the study plan on an application. Admissions + academic use this to
 * plan pathways (e.g. English intensive → September university intake); the
 * student sees the saved plan on the status portal.
 */
export async function saveStudyPlan(
  id: string,
  plan: {
    intake?: string;
    target_completion?: string;
    summary?: string;
    steps: { title: string; start?: string; end?: string; note?: string }[];
  },
) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  // Preserve any in-flight handover workflow when the content is edited.
  const { data: existing } = await supabase
    .from("applications")
    .select("plan")
    .eq("id", id)
    .single();
  const workflow = (existing?.plan as StudyPlan | null)?.workflow ?? undefined;
  const clean = {
    intake: plan.intake?.trim() || undefined,
    target_completion: plan.target_completion || undefined,
    summary: plan.summary?.trim() || undefined,
    steps: plan.steps
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        start: s.start || undefined,
        end: s.end || undefined,
        note: s.note?.trim() || undefined,
      })),
    updated_at: new Date().toISOString(),
    workflow,
  };
  await supabase.from("applications").update({ plan: clean }).eq("id", id);
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile?.id,
    type: "note",
    body: `Study plan updated (${clean.steps.length} steps${clean.intake ? `, intake ${clean.intake}` : ""})`,
  });
  await logAudit({ action: "plan_saved", target_type: "application", target_id: id, detail: clean.intake ?? "" });
  revalidatePath("/admin", "layout");
}

/** Load a plan + student name for the handover actions below. */
async function loadPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<{ plan: StudyPlan | null; studentName: string }> {
  const { data } = await supabase
    .from("applications")
    .select("plan, student_name")
    .eq("id", id)
    .single();
  return {
    plan: (data?.plan as StudyPlan | null) ?? null,
    studentName: data?.student_name ?? "student",
  };
}

const chainLabel = (route: string[]) =>
  ["admissions", ...route].map((r) => PLAN_ROLE_LABEL[r] ?? r).join(" → ");

/**
 * Admissions (or admin) sends a drafted plan into review along one of the
 * preset routes. Records admissions' sign-off and pings the first department.
 */
export async function sendPlanForReview(id: string, routeKey: string) {
  if (!authConfigured) return;
  const preset = PLAN_ROUTES.find((r) => r.key === routeKey);
  if (!preset) return;
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile || !["admin", "admissions"].includes(profile.role)) return;
  const { plan, studentName } = await loadPlan(supabase, id);
  if (!plan?.steps?.length || plan.workflow) return; // need a draft, not already in review
  const now = new Date().toISOString();
  const workflow: PlanWorkflow = {
    route: preset.route,
    step: 0,
    signoffs: [
      { role: "admissions", by: profile.full_name ?? undefined, at: now, note: "Drafted & sent for review" },
    ],
    started_by: profile.full_name ?? undefined,
    started_at: now,
  };
  await supabase.from("applications").update({ plan: { ...plan, workflow } }).eq("id", id);
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile.id,
    type: "note",
    body: `Study plan sent for review — ${chainLabel(preset.route)}`,
  });
  await createActionRequest({
    applicationId: id,
    subject: studentName,
    toRole: preset.route[0],
    type: "handoff",
    title: `Verify study plan — ${studentName}`,
    detail: preset.desc,
  });
  await logAudit({ action: "plan_sent_for_review", target_type: "application", target_id: id, detail: routeKey });
  revalidatePath("/admin", "layout");
}

/**
 * The current holding department verifies the plan and hands it to the next
 * one in the route — or finalises it if it's the last. Only that department
 * (or admin) may act.
 */
export async function advancePlanReview(id: string, note?: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return;
  const { plan, studentName } = await loadPlan(supabase, id);
  const wf = plan?.workflow;
  if (!plan || !wf || wf.step >= wf.route.length) return;
  const holder = wf.route[wf.step];
  if (profile.role !== "admin" && profile.role !== holder) return;
  const now = new Date().toISOString();
  const step = wf.step + 1;
  const finalized = step >= wf.route.length;
  const next: PlanWorkflow = {
    ...wf,
    step,
    signoffs: [
      ...wf.signoffs,
      { role: holder, by: profile.full_name ?? undefined, at: now, note: note?.trim() || undefined },
    ],
  };
  await supabase.from("applications").update({ plan: { ...plan, workflow: next } }).eq("id", id);
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile.id,
    type: "note",
    body: finalized
      ? `Study plan finalised by ${PLAN_ROLE_LABEL[holder] ?? holder}`
      : `Study plan verified by ${PLAN_ROLE_LABEL[holder] ?? holder} → handed to ${PLAN_ROLE_LABEL[wf.route[step]] ?? wf.route[step]}`,
  });
  if (!finalized) {
    await createActionRequest({
      applicationId: id,
      subject: studentName,
      toRole: wf.route[step],
      type: "handoff",
      title: `Verify study plan — ${studentName}`,
      detail: note?.trim() || undefined,
    });
  }
  await logAudit({
    action: finalized ? "plan_finalized" : "plan_advanced",
    target_type: "application",
    target_id: id,
    detail: holder,
  });
  revalidatePath("/admin", "layout");
}

/**
 * Send a plan back to Admissions for rework (clears the review chain). Only the
 * current holder (or admin) can bounce it; records why and pings admissions.
 */
export async function returnPlanToDraft(id: string, note?: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return;
  const { plan, studentName } = await loadPlan(supabase, id);
  const wf = plan?.workflow;
  if (!plan || !wf) return;
  const holder = wf.step < wf.route.length ? wf.route[wf.step] : null;
  if (profile.role !== "admin" && profile.role !== holder) return;
  const rest = { ...plan };
  delete rest.workflow;
  await supabase.from("applications").update({ plan: rest }).eq("id", id);
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile.id,
    type: "note",
    body: `Study plan returned to Admissions${note?.trim() ? ` — ${note.trim()}` : ""}`,
  });
  await createActionRequest({
    applicationId: id,
    subject: studentName,
    toRole: "admissions",
    type: "handoff",
    title: `Study plan needs rework — ${studentName}`,
    detail: note?.trim() || undefined,
  });
  await logAudit({ action: "plan_returned", target_type: "application", target_id: id });
  revalidatePath("/admin", "layout");
}

/**
 * Log a piece of work done on an application — "contacted university",
 * "university replied", "went to EMGS", etc. Lands on the application timeline
 * with the activity and the date it happened (which may differ from today).
 */
export async function logWork(
  id: string,
  input: { activity: string; date?: string; note?: string; attachmentDocId?: string },
) {
  if (!authConfigured || !input.activity) return;
  const supabase = await createClient();
  const profile = await getProfile();
  const when = input.date || new Date().toISOString().slice(0, 10);
  const body = `[${input.activity}] ${when}${input.note?.trim() ? ` — ${input.note.trim()}` : ""}${input.attachmentDocId ? " 📎" : ""}`;
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile?.id,
    type: "work",
    body,
    meta: input.attachmentDocId ? { doc_id: input.attachmentDocId } : null,
  });
  await logAudit({ action: "work_logged", target_type: "application", target_id: id, detail: body });
  revalidatePath("/admin", "layout");
}

export async function addApplicationNote(id: string, body: string) {
  if (!authConfigured || !body.trim()) return;
  const supabase = await createClient();
  const profile = await getProfile();
  await supabase.from("application_events").insert({
    application_id: id,
    actor_id: profile?.id,
    type: "note",
    body: body.trim(),
  });
  revalidatePath("/admin", "layout");
}

/**
 * Convert an enquiry (registration) into a student + application. Creates the
 * student master from the lead's contact, then one application per selected
 * track. No-op in dev (mock).
 */
export async function createApplicationFromLead(leadId: string) {
  if (!authConfigured) return;
  const supabase = await createClient();
  const profile = await getProfile();
  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", leadId)
    .single();
  if (!reg) return;

  const isInternational = (reg.nationality ?? "").toLowerCase() !== "my";

  // Resolve the referring agent (if any) from the agent_code on the enquiry.
  let agentId: string | null = null;
  let agentName: string | null = null;
  if (reg.agent_code) {
    const { data: ag } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("agent_code", reg.agent_code)
      .eq("role", "agent")
      .maybeSingle();
    if (ag) {
      agentId = ag.id;
      agentName = ag.full_name;
    }
  }

  // Dedup: if a student already exists for this email (e.g. an earlier
  // conversion), reuse it rather than creating a duplicate person.
  const { data: existingStudent } = await supabase
    .from("students")
    .select("id, passport_no")
    .ilike("email", reg.email)
    .limit(1)
    .maybeSingle();

  let student = existingStudent as { id: string; passport_no: string | null } | null;
  if (!student) {
    const { data: created } = await supabase
      .from("students")
      .insert({
        enquiry_id: reg.id,
        full_name: reg.full_name,
        email: reg.email,
        phone: reg.phone,
        whatsapp: reg.whatsapp,
        nationality: reg.nationality,
        date_of_birth: reg.dob ?? null,
        passport_no: reg.passport_no ?? null,
        guardian: reg.details?.guardian ?? null,
        is_international: isInternational,
        agent_code: reg.agent_code,
        agent_id: agentId,
      })
      .select("id, passport_no")
      .single();
    student = created ?? null;
  }
  if (!student) return;

  // Don't duplicate: skip tracks the student already has an application for
  // (re-pressing "Create application" must be a no-op, not a second app).
  const { data: existingApps } = await supabase
    .from("applications")
    .select("id, track")
    .eq("student_id", student.id);
  const existingTracks = new Set((existingApps ?? []).map((a) => a.track as string));

  const tracks: string[] = reg.tracks ?? [];
  let firstNewAppId: string | null = null;
  for (const track of tracks) {
    if (existingTracks.has(track)) continue;
    // Denormalised display fields keep list reads to a plain `select *`.
    // access_code is auto-generated by the DB default.
    const { data: createdApp } = await supabase.from("applications").insert({
      student_id: student.id,
      track,
      submitted_by: reg.agent_code ? "agent" : "staff",
      stage: track === "corporate" ? "enquiry" : "registration",
      student_name: reg.full_name,
      student_email: reg.email,
      passport_no: student.passport_no,
      is_international: isInternational,
      // University target / program the agent typed on referral. Only a string —
      // public-form leads store details.university as an object (the track's
      // answers), which must NOT go into these text columns.
      ...(track === "university" && typeof reg.details?.university === "string"
        ? { target_institution: reg.details.university }
        : {}),
      ...(track === "university" && typeof reg.details?.program === "string"
        ? { program_name: reg.details.program }
        : {}),
      agent_id: agentId,
      agent_name: agentName,
      // Keep the student's tracking code stable across lead → application.
      ...(reg.access_code ? { access_code: reg.access_code } : {}),
      // A study plan drafted on the lead carries over.
      ...(reg.plan ? { plan: reg.plan } : {}),
      // The staff member converting the lead becomes the handler (incentive).
      created_by: profile?.id ?? null,
      assigned_to: profile?.id ?? null,
    }).select("id").single();
    if (createdApp && !firstNewAppId) firstNewAppId = createdApp.id as string;
  }

  // Scaffold the quoted fees only onto a NEWLY created application (so re-running
  // conversion doesn't duplicate fees). Fees are finance-write under RLS → service role.
  const quote = (reg.details?.quote ?? []) as {
    name: string; fee_type: string; amount: number; currency: string;
  }[];
  if (firstNewAppId && quote.length) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await admin.from("fees").insert(
      quote.map((q) => ({
        application_id: firstNewAppId,
        student_name: reg.full_name,
        type: q.fee_type || "other",
        label: q.name,
        amount: Number(q.amount) || 0,
        currency: q.currency || "MYR",
        status: "unpaid",
      })),
    );
  }

  // Mark the lead converted so it moves to the Converted tab.
  await supabase.from("registrations").update({ status: "enrolled" }).eq("id", reg.id);

  await logAudit({
    action: "application_created",
    target_type: "lead",
    target_id: reg.id,
    detail: `${reg.full_name} · ${tracks.join(", ")}`,
  });
  revalidatePath("/admin", "layout");
}
