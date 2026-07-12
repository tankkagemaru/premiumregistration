import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { AppContact } from "./applications-shared";
import type { VisaCase } from "./visa-shared";

export * from "./visa-shared";

const MOCK_CASES: VisaCase[] = [
  {
    id: "v1",
    application_id: "a-0002",
    student_name: "Budi Santoso",
    target: "Universiti Putra Malaysia (UPM)",
    submitted_by: "pecsb", // public university → PECSB files
    emgs_ref: "EMGS-2026-88123",
    stage: "eval_process",
    kind: "initial",
    medical_status: "pending",
  },
  {
    id: "v2",
    application_id: "a-0003",
    student_name: "Nguyen Van An",
    target: "General English (PLC)",
    submitted_by: "pecsb", // PLC's own course → PECSB files
    stage: "emgs_submitted",
    kind: "initial",
  },
  {
    id: "v3",
    application_id: "a-0004",
    student_name: "Fatima Al-Zahra",
    target: "IELTS Preparation (PLC)",
    submitted_by: "pecsb",
    emgs_ref: "EMGS-2025-41077",
    stage: "done",
    kind: "initial",
    medical_status: "passed",
    student_pass_expiry: "2026-08-15",
  },
];

export async function listVisaCases(): Promise<VisaCase[]> {
  if (!authConfigured) return MOCK_CASES;
  const supabase = await createClient();
  const { data } = await supabase
    .from("visa_cases")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as VisaCase[] | null) ?? [];
}

export async function getVisaCaseForApp(
  applicationId: string,
): Promise<VisaCase | null> {
  const cases = await listVisaCases();
  return cases.find((c) => c.application_id === applicationId) ?? null;
}

/** A single visa case + the student's contact (for the message generator). */
export async function getVisaCase(
  id: string,
): Promise<{ vc: VisaCase; contact: AppContact } | null> {
  if (!authConfigured) {
    const vc = MOCK_CASES.find((c) => c.id === id);
    return vc
      ? { vc, contact: { phone: "+60123456789", email: "student@example.com" } }
      : null;
  }
  const supabase = await createClient();
  const { data: vc } = await supabase.from("visa_cases").select("*").eq("id", id).single();
  if (!vc) return null;
  const { data: app } = await supabase
    .from("applications")
    .select("student_id, student_email")
    .eq("id", (vc as VisaCase).application_id)
    .maybeSingle();
  const contact: AppContact = { email: (app as { student_email?: string } | null)?.student_email };
  const studentId = (app as { student_id?: string } | null)?.student_id;
  if (studentId) {
    const { data: st } = await supabase
      .from("students")
      .select("phone, whatsapp")
      .eq("id", studentId)
      .maybeSingle();
    contact.phone = (st as { phone?: string } | null)?.phone;
    contact.whatsapp = (st as { whatsapp?: string } | null)?.whatsapp;
  }
  return { vc: vc as VisaCase, contact };
}
