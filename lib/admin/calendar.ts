import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { CalEvent } from "./calendar-shared";

export * from "./calendar-shared";

const MOCK: CalEvent[] = [
  { date: "2026-07-05", title: "Follow-up — Aisyah binti Rahman", kind: "followup", href: "/admin/leads?lead=00000000-0000-0000-0000-000000000001" },
  { date: "2026-07-14", title: "Class start — Nguyen Van An", kind: "class_start", href: "/admin/applications?app=a-0003" },
  { date: "2026-07-15", title: "Pass expiry — Fatima Al-Zahra", kind: "visa_expiry", href: "/admin/applications?app=a-0004" },
  { date: "2026-10-02", title: "Class end — Nguyen Van An", kind: "class_end", href: "/admin/applications?app=a-0003" },
];

/**
 * Every dated event the signed-in user can see, aggregated across modules
 * (RLS scopes each source query by role). Powers the shared calendar.
 */
export async function listCalendarEvents(): Promise<CalEvent[]> {
  if (!authConfigured) return MOCK;
  const supabase = await createClient();
  const events: CalEvent[] = [];

  const [{ data: apps }, { data: visas }, { data: leads }] = await Promise.all([
    supabase
      .from("applications")
      .select("id,student_name,next_action,next_action_due,class_start,class_end"),
    supabase
      .from("visa_cases")
      .select("application_id,student_name,student_pass_expiry,arrival_date,medical_booked_date,medical_location"),
    supabase
      .from("registrations")
      .select("id,full_name,next_action,next_action_due"),
  ]);

  for (const a of apps ?? []) {
    const href = `/admin/applications?app=${a.id}`;
    if (a.next_action_due)
      events.push({
        date: a.next_action_due,
        title: `${a.next_action ?? "Follow-up"} — ${a.student_name}`,
        kind: "followup",
        href,
      });
    if (a.class_start)
      events.push({ date: a.class_start, title: `Class start — ${a.student_name}`, kind: "class_start", href });
    if (a.class_end)
      events.push({ date: a.class_end, title: `Class end — ${a.student_name}`, kind: "class_end", href });
  }
  for (const v of visas ?? []) {
    const href = v.application_id ? `/admin/applications?app=${v.application_id}` : undefined;
    if (v.student_pass_expiry)
      events.push({ date: v.student_pass_expiry, title: `Pass expiry — ${v.student_name}`, kind: "visa_expiry", href });
    if (v.arrival_date)
      events.push({ date: v.arrival_date, title: `Arrival — ${v.student_name}`, kind: "arrival", href });
    if (v.medical_booked_date)
      events.push({
        date: v.medical_booked_date,
        title: `Medical — ${v.student_name}${v.medical_location ? ` (${v.medical_location})` : ""}`,
        kind: "other",
        href,
      });
  }
  for (const l of leads ?? []) {
    if (l.next_action_due)
      events.push({
        date: l.next_action_due,
        title: `${l.next_action ?? "Follow-up"} — ${l.full_name}`,
        kind: "followup",
        href: `/admin/leads?lead=${l.id}`,
      });
  }

  return events;
}
