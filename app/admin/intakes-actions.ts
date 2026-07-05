"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/admin/applications-shared";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";
import {
  computeEndDate,
  defaultDurationDays,
  type ProgramKind,
} from "@/lib/config/program-schedule";

const SCHED_ROLES = ["admin", "academic"];

async function permitted() {
  const p = await getProfile();
  return !!p && SCHED_ROLES.includes(p.role);
}

/** Create an intake. End date auto-computed from the program/level duration
 *  unless an explicit end is given. */
export async function createIntake(input: {
  program: string;
  level?: number | null;
  route?: string;
  label?: string;
  start_date: string;
  end_date?: string;
  capacity?: number | null;
  status?: string;
  notes?: string;
}): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!(await permitted()) || !input.start_date) return { ok: false };
  const supabase = await createClient();
  const profile = await getProfile();
  const end =
    input.end_date ||
    computeEndDate(
      input.start_date,
      defaultDurationDays(input.program as ProgramKind, input.level ?? null),
    );
  const { error } = await supabase.from("program_intakes").insert({
    program: input.program,
    level: input.level ?? null,
    route: input.route?.trim() || null,
    label: input.label?.trim() || null,
    start_date: input.start_date,
    end_date: end,
    capacity: input.capacity ?? null,
    status: input.status || "planned",
    notes: input.notes?.trim() || null,
    created_by: profile?.id ?? null,
  });
  if (error) return { ok: false };
  await logAudit({
    action: "intake_created",
    target_type: "intake",
    detail: `${input.program}${input.level ? ` L${input.level}` : ""} · ${input.start_date}→${end}`,
  });
  revalidatePath("/admin/intakes");
  revalidatePath("/admin/calendar");
  return { ok: true };
}

export async function updateIntake(
  id: string,
  patch: {
    start_date?: string;
    end_date?: string;
    status?: string;
    capacity?: number | null;
    route?: string | null;
    label?: string | null;
    notes?: string | null;
  },
) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  const clean: Record<string, unknown> = {};
  for (const k of ["start_date", "end_date", "status", "capacity", "route", "label", "notes"] as const) {
    if (patch[k] !== undefined) clean[k] = patch[k] === "" ? null : patch[k];
  }
  if (Object.keys(clean).length === 0) return;
  await supabase.from("program_intakes").update(clean).eq("id", id);
  await logAudit({ action: "intake_updated", target_type: "intake", target_id: id });
  revalidatePath("/admin/intakes");
  revalidatePath("/admin/calendar");
}

export async function deleteIntake(id: string) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  await supabase.from("program_intakes").delete().eq("id", id);
  await logAudit({ action: "intake_deleted", target_type: "intake", target_id: id });
  revalidatePath("/admin/intakes");
  revalidatePath("/admin/calendar");
}

/* ---- public holidays ---- */

export async function addHoliday(date: string, name: string): Promise<{ ok: boolean }> {
  if (!authConfigured) return { ok: true };
  if (!(await permitted()) || !date || !name.trim()) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("public_holidays")
    .upsert({ holiday_date: date, name: name.trim() }, { onConflict: "holiday_date" });
  if (error) return { ok: false };
  await logAudit({ action: "holiday_added", target_type: "holiday", detail: `${date} ${name.trim()}` });
  revalidatePath("/admin/intakes");
  revalidatePath("/admin/calendar");
  return { ok: true };
}

export async function deleteHoliday(id: string) {
  if (!authConfigured || !(await permitted())) return;
  const supabase = await createClient();
  await supabase.from("public_holidays").delete().eq("id", id);
  await logAudit({ action: "holiday_deleted", target_type: "holiday", target_id: id });
  revalidatePath("/admin/intakes");
  revalidatePath("/admin/calendar");
}
